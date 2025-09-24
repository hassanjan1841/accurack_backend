-- AlterTable
ALTER TABLE "Users" ADD COLUMN     "excludedPermissions" JSONB DEFAULT '[]';
