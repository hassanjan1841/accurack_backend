import { Injectable, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantContextService {
  private clientId?: string;

  constructor(
    @Inject(REQUEST) private readonly request: any,
    private readonly prisma: PrismaService,
  ) {}

  private extractTenantContext(): void {
    const user = this.request.user;
    if (user) {
      this.clientId = user.clientId;
    }
  }

  async getPrismaClient(): Promise<PrismaClient> {
    return this.prisma;
  }

  async getMasterPrismaClient(): Promise<PrismaClient> {
    return this.prisma;
  }

  getTenantInfo() {
    this.extractTenantContext();
    return {
      clientId: this.clientId,
    };
  }
}
