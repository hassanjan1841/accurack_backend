import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { TenantContextService } from 'src/tenant/tenant-context.service';
import { PermissionsService } from 'src/common';

@Injectable()
export class UsersService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly permissionsService: PermissionsService,
  ) {}

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
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const permissions = await this.permissionsService.getUserPermissions(userId);

    return {
      ...user,
      permissions: permissions.permissions,
    };
  }

  async updateMe(userId: string, dto: UpdateUserProfileDto) {
    const prisma = await this.tenantContext.getPrismaClient();

    const existingUser = await prisma.users.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    const updateData: Partial<{
      firstName: string;
      lastName: string;
      phone: string;
    }> = {};
    if (dto.firstName !== undefined) updateData.firstName = dto.firstName;
    if (dto.lastName !== undefined) updateData.lastName = dto.lastName;
    if (dto.phone !== undefined) updateData.phone = dto.phone;

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException(
        'At least one field must be provided for update',
      );
    }

    return prisma.users.update({
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
