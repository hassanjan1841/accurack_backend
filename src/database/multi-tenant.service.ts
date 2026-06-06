import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Status, Tier } from '@prisma/client';

@Injectable()
export class MultiTenantService {
  private readonly logger = new Logger(MultiTenantService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Validate that client record exists in the unified database
   */
  async validateClientExists(
    tenantId: string,
    clientId: string,
  ): Promise<boolean> {
    try {
      const client = await this.prisma.clients.findUnique({
        where: { id: clientId },
      });
      return !!client;
    } catch (error) {
      this.logger.error(`Failed to validate client exists: ${error.message}`);
      return false;
    }
  }

  /**
   * Ensure client record exists in the unified database (create if missing)
   */
  async ensureClientRecordExists(
    tenantId: string,
    clientData: any,
  ): Promise<void> {
    try {
      const exists = await this.validateClientExists(tenantId, clientData.id);

      if (!exists) {
        this.logger.log(
          `Client record missing for ${tenantId}, inserting...`,
        );

        await this.prisma.clients.create({
          data: {
            id: clientData.id,
            name: clientData.name,
            email: clientData.email,
            phone: clientData.phone || null,
            address: clientData.address || null,
            status: clientData.status || 'active',
            tier: clientData.tier || 'free',
          },
        });

        this.logger.log(
          `Client record inserted successfully for ${tenantId}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to ensure client record exists: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Validate that user record exists in the unified database
   */
  async validateUserExists(tenantId: string, userId: string): Promise<boolean> {
    try {
      const user = await this.prisma.users.findUnique({
        where: { id: userId },
      });
      return !!user;
    } catch (error) {
      this.logger.error(`Failed to validate user exists: ${error.message}`);
      return false;
    }
  }

  /**
   * Ensure user record exists in the unified database (create if missing)
   */
  async ensureUserRecordExists(tenantId: string, userData: any): Promise<void> {
    try {
      const exists = await this.validateUserExists(tenantId, userData.id);

      if (!exists) {
        this.logger.log(
          `User record missing for ${userData.id}, inserting...`,
        );

        await this.prisma.users.create({
          data: {
            id: userData.id,
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email,
            passwordHash: userData.passwordHash || null,
            role: userData.role || null,
            clientId: userData.clientId || tenantId,
            status: userData.status || 'active',
            otp: userData.otp || null,
            otpExpiresAt: userData.otpExpiresAt || null,
            isOtpUsed: userData.isOtpUsed || false,
            excludedPermissions: userData.excludedPermissions || undefined,
          },
        });

        this.logger.log(
          `User record inserted successfully for ${userData.id}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to ensure user record exists: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Update user status in the unified database
   */
  async updateUserStatus(
    clientId: string,
    userId: string,
    status: string,
  ): Promise<void> {
    await this.prisma.users.update({
      where: { id: userId },
      data: { status: status as Status, updatedAt: new Date() },
    });
  }
}
