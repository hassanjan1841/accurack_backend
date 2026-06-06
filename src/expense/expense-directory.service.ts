import {
    Injectable,
    ForbiddenException,
    NotFoundException,
    BadRequestException
} from '@nestjs/common';
import { TenantContextService } from 'src/tenant/tenant-context.service';
import { CreateExpenseDirectoryDto } from './dto/create-expense-directory.dto';
import { UpdateExpenseDirectoryDto } from './dto/update-expense-directory.dto';
import { ExpenseStatus } from '@prisma/client';

// Define the DirectoryPath interface at the module level
export interface DirectoryPath {
    id: string;
    name: string;
    level: number;
}

@Injectable()
export class ExpenseDirectoryService {
    constructor(private readonly tenantContext: TenantContextService) { }

    /**
     * Get directory path (breadcrumb)
     */
    async getDirectoryPath(directoryId: string, user: any): Promise<DirectoryPath[]> {
        const prisma = this.tenantContext.getPrismaClient();
        const prismaClient = await prisma;

        const directory = await prismaClient.expenseDirectory.findFirst({
            where: {
                id: directoryId,
                clientId: user.clientId,
                status: 'ACTIVE',
            },
        });

        if (!directory) {
            throw new NotFoundException('Directory not found');
        }

        const path: DirectoryPath[] = [];
        let current: { id: string; name: string; level: number; parentId: string | null } | null = directory;

        // Build path from current to root
        while (current) {
            path.unshift({
                id: current.id,
                name: current.name,
                level: current.level,
            });

            if (current.parentId) {
                const parent = await prismaClient.expenseDirectory.findFirst({
                    where: { id: current.parentId, clientId: user.clientId },
                });
                current = parent; // parent could be null, which is fine for the loop
            } else {
                current = null;
            }
        }

        return path;
    }

    async getDirectoryChildren(id: string, user: any) {
        const prisma = this.tenantContext.getPrismaClient();
        const prismaClient = await prisma;

        const directory = await prismaClient.expenseDirectory.findFirst({
            where: { id, clientId: user.clientId },
            include: {
                children: true,
                sheets: true,
            },
        });
        if (!directory) {
            throw new Error('Directory not found');
        }

        const level = directory.level;
        let children: typeof directory.children = [];
        let sheets: typeof directory.sheets = [];

        if (level === 1) {
            // Only folders allowed
            children = directory.children.filter(child => child.status === ExpenseStatus.ACTIVE);
        } else if (level === 2) {
            // Either folders or sheets, not both
            const hasChildren = directory.children.length > 0;
            const hasSheets = directory.sheets.length > 0;
            if (hasChildren && hasSheets) {
                throw new Error('Level 2 directory cannot have both folders and sheets');
            }
            if (hasChildren) {
                children = directory.children.filter(child => child.status === ExpenseStatus.ACTIVE);
            } else if (hasSheets) {
                sheets = directory.sheets.filter(sheet => sheet.status === ExpenseStatus.ACTIVE);
            }
        } else if (level === 3) {
            // Only sheets allowed
            sheets = directory.sheets.filter(sheet => sheet.status === ExpenseStatus.ACTIVE);
        }

        return {
            directory: {
                id: directory.id,
                name: directory.name,
                description: directory.description,
                level: directory.level,
                status: directory.status,
            },
            children,
            sheets,
            level,
        };
    }

    /**
     * Create a new expense directory
     */
    async create(dto: CreateExpenseDirectoryDto, user: any) {
        const prisma = await this.tenantContext.getPrismaClient();
        const { name,description,parentId ,storeId} = dto;

        try {
            // Calculate level based on parent
            const level = await this.calculateLevel(parentId, prisma);

            if (level > 3) {
                throw new ForbiddenException('Maximum 3 directory levels allowed');
            }

            // Validate hierarchy rules if parentId is provided
            if (parentId) {
                await this.validateHierarchyRules(parentId, prisma, user.clientId);
            }

            const directory = await prisma.expenseDirectory.create({
                data: {
                    name,
                    description,
                    parentId,
                    storeId,
                    level,
                    clientId: user.clientId,
                    createdBy: user.id,
                    status: ExpenseStatus.ACTIVE,
                },
                include: {
                    parent: true,
                    _count: {
                        select: {
                            children: { where: { status: 'ACTIVE' } },
                            sheets: { where: { status: 'ACTIVE' } },
                        },
                    },
                },
            });

            return directory;
        } catch (error) {
            if (error.code === 'P2002') {
                throw new BadRequestException('Directory name already exists in this location');
            }
            throw error;
        }
    }

    /**
     * Get complete directory hierarchy for the client
     */
    async getFirstLevelFolder(storeId: string, user: any) {
        const prisma = this.tenantContext.getPrismaClient();
        const PrismaClient = await prisma;

        const directories = await PrismaClient.expenseDirectory.findMany({
            where: {
                storeId,
                clientId: user.clientId,
                status: 'ACTIVE',
                level: 1
            },
            orderBy: [{ level: 'asc' }, { createdAt: 'asc' }],
        });

        console.log("Directories:", directories);

        // Transform flat array to hierarchical structure
        return directories;
    }

    /**
     * Update directory details
     */
    async update(id: string, dto: UpdateExpenseDirectoryDto, user: any) {
        const prisma = this.tenantContext.getPrismaClient();
        const PrismaClient = await prisma;

        const directory = await PrismaClient.expenseDirectory.findFirst({
            where: {
                id,
                clientId: user.clientId,
                status: 'ACTIVE',
            },
        });

        if (!directory) {
            throw new NotFoundException('Directory not found');
        }

        try {
            const updatedDirectory = await PrismaClient.expenseDirectory.update({
                where: { id },
                data: {
                    name: dto.name ?? directory.name,
                    description: dto.description ?? directory.description,
                },
                include: {
                    parent: true,
                    _count: {
                        select: {
                            children: { where: { status: 'ACTIVE' } },
                            sheets: { where: { status: 'ACTIVE' } },
                        },
                    },
                },
            });

            return updatedDirectory;
        } catch (error) {
            if (error.code === 'P2002') {
                throw new BadRequestException('Directory name already exists in this location');
            }
            throw error;
        }
    }

    /**
     * Delete directory (move to trash)
     */
    async delete(id: string, user: any) {
        const prisma = this.tenantContext.getPrismaClient();
        const PrismaClient = await prisma;

        const directory = await PrismaClient.expenseDirectory.findFirst({
            where: {
                id,
                clientId: user.clientId,
                status: 'ACTIVE',
            },
            include: {
                children: { where: { status: 'ACTIVE' } },
                sheets: { where: { status: 'ACTIVE' } },
            },
        });

        if (!directory) {
            throw new NotFoundException('Directory not found');
        }

        // Check if directory has children or sheets
        if (directory.children.length > 0) {
            throw new ForbiddenException('Cannot delete directory that contains subdirectories');
        }

        if (directory.sheets.length > 0) {
            throw new ForbiddenException('Cannot delete directory that contains expense sheets');
        }

        const deletedDirectory = await PrismaClient.expenseDirectory.update({
            where: { id },
            data: {
                status: 'DELETED',
                deletedAt: new Date(),
            },
        });

        return {
            message: 'Directory moved to trash successfully',
            deletedDirectory
        };
    }

    /**
     * Get directories for a specific parent (used by frontend for lazy loading)
     */
    async getByParent(parentId: string, user: any) {
        const prisma = this.tenantContext.getPrismaClient();
        const PrismaClient = await prisma;

        return PrismaClient.expenseDirectory.findMany({
            where: {
                parentId,
                clientId: user.clientId,
                status: 'ACTIVE',
            },
            include: {
                sheets: {
                    where: { status: 'ACTIVE' },
                    select: {
                        id: true,
                        name: true,
                        isArchived: true,
                        createdAt: true,
                    },
                },
                _count: {
                    select: {
                        children: { where: { status: 'ACTIVE' } },
                    },
                },
            },
            orderBy: { createdAt: 'asc' },
        });
    }

    /**
     * Restore directory from trash
     */
    async restore(id: string, user: any) {
        const prisma = this.tenantContext.getPrismaClient();
        const prismaClient = await prisma;

        const directory = await prismaClient.expenseDirectory.findFirst({
            where: {
                id,
                clientId: user.clientId,
                status: 'DELETED',
            },
        });

        if (!directory) {
            throw new NotFoundException('Deleted directory not found');
        }

        // Validate that parent still exists if it has one
        if (directory.parentId) {
            const parent = await prismaClient.expenseDirectory.findFirst({
                where: {
                    id: directory.parentId,
                    status: 'ACTIVE',
                },
            });

            if (!parent) {
                throw new BadRequestException('Cannot restore directory: parent directory no longer exists');
            }
        }

        const restoredDirectory = await prismaClient.expenseDirectory.update({
            where: { id },
            data: {
                status: 'ACTIVE',
                deletedAt: null,
            },
        });

        return restoredDirectory;
    }

    // ===============================================
    // PRIVATE HELPER METHODS
    // ===============================================

    /**
     * Calculate directory level based on parent
     */
    private async calculateLevel(parentId?: string, prisma?: any): Promise<number> {
        if (!parentId) return 1;

        const parent = await prisma.expenseDirectory.findUnique({
            where: { id: parentId },
            select: { level: true },
        });

        return parent ? parent.level + 1 : 1;
    }

    /**
     * Validate hierarchy rules before creating directory
     */
    private async validateHierarchyRules(parentId: string, prisma: any, clientId: string) {
        if (!parentId) return; // Root level is always valid

        const parent = await prisma.expenseDirectory.findFirst({
            where: {
                id: parentId,
                clientId,
                status: 'ACTIVE',
            },
            include: {
                children: { where: { status: 'ACTIVE' } },
                sheets: { where: { status: 'ACTIVE' } },
            },
        });

        if (!parent) {
            throw new NotFoundException('Parent directory not found');
        }

        // Level-specific validation rules based on what the parent can contain
        if (parent.level === 1) {
            // Level 2 can have either folders OR sheets, not both
            if (parent.sheets.length > 0) {
                throw new ForbiddenException(
                    'Cannot create subdirectory in a level 2 directory that contains expense sheets. Level 2 can have either folders or sheets, not both.'
                );
            }
        }
        else if (parent.level === 2) {
            // Level 3 and beyond can only have sheets, no subdirectories
            throw new ForbiddenException(
                'Cannot create subdirectory in level 3 or higher. Level 3 can only contain sheets.'
            );
            // If no sheets, creating Level 3 subdirectories is allowed
        }
        else if (parent.level >= 3) {

        }
    }
    
    /**
     * Get complete directory hierarchy with sheets and columns for a store
     */
    async getCompleteHierarchy(storeId: string, user: any) {
        const prisma = this.tenantContext.getPrismaClient();
        const prismaClient = await prisma;

        // Get all active directories for the store
        const directories = await prismaClient.expenseDirectory.findMany({
            where: {
                storeId,
                clientId: user.clientId,
                status: 'ACTIVE',
            },
            select: {
                id: true,
                name: true,
                description: true,
                parentId: true,
                level: true,
                status: true,
                createdBy: true,
                deletedAt: true,
                sheets: {
                    where: { status: 'ACTIVE', isArchived: false },
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        directoryId: true,
                        createdBy: true,
                        updatedAt: true,
                        status: true,
                        isArchived: true,
                        deletedAt: true,
                        archivedAt: true,
                        columns: {
                            orderBy: { orderIndex: 'asc' },
                            select: {
                                id: true,
                                sheetId: true,
                                name: true,
                                columnType: true,
                                isRequired: true,
                                hasAutoSum: true,
                                orderIndex: true,
                                metadata: true,
                            },
                        },
                    },
                },
                _count: {
                    select: {
                        children: { where: { status: 'ACTIVE' } },
                        sheets: { where: { status: 'ACTIVE' } },
                    },
                },
            },
            orderBy: [{ level: 'asc' }, { createdAt: 'asc' }],
        });

        // Build hierarchical structure
        return this.buildHierarchy(directories);
    }

    /**j
     * Build hierarchical structure from flat array
     */
    private buildHierarchy(directories: any[]): any[] {
        const directoryMap = new Map<string, any>();
        const rootDirectories: any[] = [];

        // First pass: create map of all directories
        directories.forEach(dir => {
            directoryMap.set(dir.id, { ...dir, children: [] });
        });

        // Second pass: build hierarchy
        directories.forEach(dir => {
            if (dir.parentId) {
                const parent = directoryMap.get(dir.parentId);
                if (parent) {
                    parent.children.push(directoryMap.get(dir.id));
                }
            } else {
                rootDirectories.push(directoryMap.get(dir.id));
            }
        });

        return rootDirectories;
    }

}