import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { User } from './entities/user.entity';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { PrismaClientService } from 'src/prisma-client/prisma-client.service';
import { TenantContextService } from 'src/tenant/tenant-context.service';
import { v4 as uuidv4 } from 'uuid';
import { PermissionsService } from 'src/common';

@Injectable()
export class UsersService {
  // In-memory storage for now (replace with database later)
  private users: User[] = [];

  constructor(
    private readonly prisma: PrismaClientService,
    private readonly tenantContext: TenantContextService,
    private readonly permissionsService: PermissionsService,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    const user = this.users.find((user) => user.email === email);
    return user || null;
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    const user = this.users.find((user) => user.googleId === googleId);
    return user || null;
  }

  async findById(id: string): Promise<User | null> {
    const user = this.users.find((user) => user.id === id);
    return user || null;
  }

  async createUser(createUserDto: Partial<User>): Promise<User> {
    const user: User = {
      id: uuidv4(),
      email: createUserDto.email!,
      name: createUserDto.name!,
      picture: createUserDto.picture,
      googleId: createUserDto.googleId,
      provider: createUserDto.provider || 'manual',
      createdAt: new Date(),
    };

    this.users.push(user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const userIndex = this.users.findIndex((user) => user.id === id);
    if (userIndex === -1) {
      return null;
    }

    this.users[userIndex] = {
      ...this.users[userIndex],
      ...updates,
    };

    return this.users[userIndex];
  }

  /**
   * Get current user's profile (excluding sensitive information)
   */
  async getMe(userId: string) {
    const prisma = await this.tenantContext.getPrismaClient();
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        // We no longer need to select excludedPermissions here directly
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Fetch the complete, merged list of exclusions.
    // const effectiveExclusions =
    // await this.permissionsService.getEffectiveExclusionsForUser(userId);
    //
    const permissions =
      await this.permissionsService.getUserPermissions(userId);

    // Return the user data with the unified exclusions list.
    return {
      ...user,
      permissions: permissions.permissions,
    };
  }

  /**
   * Update current user's profile information
   */
  async updateMe(userId: string, dto: UpdateUserProfileDto) {
    const prisma = await this.tenantContext.getPrismaClient();

    // Check if user exists
    const existingUser = await prisma.users.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    // Prepare update data - only include fields that are provided
    const updateData: Partial<{
      firstName: string;
      lastName: string;
      phone: string;
    }> = {};
    if (dto.firstName !== undefined) updateData.firstName = dto.firstName;
    if (dto.lastName !== undefined) updateData.lastName = dto.lastName;
    if (dto.phone !== undefined) updateData.phone = dto.phone;

    // If no fields to update, throw error
    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException(
        'At least one field must be provided for update',
      );
    }

    // Update user
    const updatedUser = await prisma.users.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        employeeCode: true,
        position: true,
        department: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  async getAllUsers(): Promise<User[]> {
    return this.users;
  }
  // Method to find or create user from Google profile
  async findOrCreateGoogleUser(googleProfile: {
    id: string;
    emails: { value: string }[];
    displayName: string;
    photos?: { value: string }[];
  }): Promise<User> {
    let user = await this.findByGoogleId(googleProfile.id);

    if (!user) {
      // Check if user exists with same email from manual registration
      user = await this.findByEmail(googleProfile.emails[0].value);

      if (user) {
        // Link Google account to existing manual account
        user = await this.updateUser(user.id, {
          googleId: googleProfile.id,
          picture: googleProfile.photos?.[0]?.value,
        });
      } else {
        // Create new user
        user = await this.createUser({
          email: googleProfile.emails[0].value,
          name: googleProfile.displayName,
          picture: googleProfile.photos?.[0]?.value,
          googleId: googleProfile.id,
          provider: 'google',
        });
      }
    }

    return user!;
  }

  async addExclusions(
    userId: string,
    features: { resource: string; action: string }[],
  ): Promise<any> {
    const prisma = await this.tenantContext.getPrismaClient();
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { excludedPermissions: true },
    });
    if (!user) throw new NotFoundException('User not found');
    // Merge new exclusions, avoiding duplicates, with type guard
    const current = Array.isArray(user.excludedPermissions)
      ? user.excludedPermissions.filter(
          (item: any): item is { resource: string; action: string } =>
            item &&
            typeof item === 'object' &&
            'resource' in item &&
            'action' in item,
        )
      : [];
    const merged = [...current];
    for (const feature of features) {
      if (
        !merged.some(
          (f) =>
            f &&
            typeof f === 'object' &&
            'resource' in f &&
            'action' in f &&
            f.resource === feature.resource &&
            f.action === feature.action,
        )
      ) {
        merged.push(feature);
      }
    }
    await prisma.users.update({
      where: { id: userId },
      data: { excludedPermissions: merged },
    });
    return { success: true, message: 'Exclusions added', data: merged };
  }

  /**
   * Remove excluded features from a user
   */
  async removeExclusions(
    userId: string,
    features: { resource: string; action: string }[],
  ): Promise<any> {
    const prisma = await this.tenantContext.getPrismaClient();
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { excludedPermissions: true },
    });
    if (!user) throw new NotFoundException('User not found');
    const current = Array.isArray(user.excludedPermissions)
      ? user.excludedPermissions.filter(
          (item: any): item is { resource: string; action: string } =>
            item &&
            typeof item === 'object' &&
            'resource' in item &&
            'action' in item,
        )
      : [];
    const filtered = current.filter(
      (f) =>
        !features.some(
          (rm) => rm.resource === f.resource && rm.action === f.action,
        ),
    );
    await prisma.users.update({
      where: { id: userId },
      data: { excludedPermissions: filtered },
    });
    return { success: true, message: 'Exclusions removed', data: filtered };
  }

  /**
   * Get all excluded features for a user
   */
  async getExclusions(userId: string): Promise<any> {
    const prisma = await this.tenantContext.getPrismaClient();
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { excludedPermissions: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return { success: true, data: user.excludedPermissions ?? [] };
  }
}
