import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

@Injectable()
export class PermissionsInitializationService implements OnModuleInit {
  private readonly logger = new Logger(PermissionsInitializationService.name);

  async onModuleInit() {
    // In shared-database multi-tenancy, role templates are created per-client
    // at signup time (via assignDefaultPermissions), not globally at startup.
    this.logger.log('Role template initialization skipped — per-client creation handled at signup.');
  }
}
