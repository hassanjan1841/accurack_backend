import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service'; // Adjust path to your Prisma service
import { CreateExpenseSheetDto, UpdateExpenseSheetDto, ExpenseColumnType } from './dto/expense-sheet.dto';
import { Prisma, ExpenseStatus, ExpenseEntryStatus } from '@prisma/client';
import { TenantContextService } from 'src/tenant/tenant-context.service';

@Injectable()
export class ExpenseSheetService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly tenantContext: TenantContextService
    ) { }

    async createWithData(dto: CreateExpenseSheetDto, user: any) {
        // Validate user access to the client
        await this.validateUserAccess(user, dto.directoryId);

        // Validate directory level rules for sheet creation
        const prisma = await this.tenantContext.getPrismaClient();
        const targetDirectory = await prisma.expenseDirectory.findUnique({
            where: { id: dto.directoryId },
            include: { children: true, sheets: true },
        });
        if (!targetDirectory) {
            throw new NotFoundException('Directory not found');
        }



        if (targetDirectory.level === 1 && targetDirectory.children.length > 0) {
            throw new Error('Cannot create sheet in a level 2 directory that already contains folders. Level 2 can only have folders.');
        }
        if (targetDirectory.level > 3) {
            throw new Error('Cannot create sheets beyond level 3.');
        }

        // Use a transaction to create sheet, columns, entries, and values atomically
        const sheet = await prisma.$transaction(async (tx) => {
            // Step 1: Create the expense sheet with columns
            const createdSheet = await tx.expenseSheet.create({
                data: {
                    name: dto.name,
                    description: dto.description,
                    directoryId: dto.directoryId,
                    clientId: user.clientId,
                    storeId: (await this.getUserStoreId(user)) || null,
                    createdBy: user.id,
                    status: ExpenseStatus.ACTIVE,
                    isArchived: false,
                    columns: {
                        create: dto.columns.map((column, index) => ({
                            name: column.name,
                            columnType: column.columnType,
                            isRequired: column.isRequired ?? false,
                            hasAutoSum: column.hasAutoSum ?? false,
                            orderIndex: index,
                            metadata: column.metadata,
                        })),
                    },
                },
                include: {
                    columns: true,
                },
            });

            // Step 2: Create entries with values, connecting to the created columns
            if (dto.entries && dto.entries.length > 0) {
                await tx.expenseEntry.createMany({
                    data: dto.entries.map((entry) => ({
                        sheetId: createdSheet.id,
                        createdBy: user.id,
                        status: (entry.status as ExpenseEntryStatus) || ExpenseEntryStatus.DRAFT,
                    })),
                });

                // Fetch the created entries to get their IDs
                const createdEntries = await tx.expenseEntry.findMany({
                    where: { sheetId: createdSheet.id },
                    select: { id: true },
                });

                // Step 3: Create entry values, connecting to the correct columns
                const entryValues = dto.entries.flatMap((entry, entryIndex) =>
                    Object.entries(entry.values).map(([columnName, value]) => {
                        // Case-insensitive column lookup
                        const column = createdSheet.columns.find((col) => col.name.toLowerCase() === columnName.toLowerCase());
                        if (!column) {
                            const availableColumns = createdSheet.columns.map(col => col.name).join(', ');
                            throw new Error(`Column '${columnName}' not found in provided columns. Available columns: [${availableColumns}]`);
                        }
                        return {
                            entryId: createdEntries[entryIndex].id,
                            columnId: column.id,
                            value,
                        };
                    }),
                );

                if (entryValues.length > 0) {
                    await tx.expenseEntryValue.createMany({
                        data: entryValues,
                    });
                }
            }

            // Step 4: Fetch the complete sheet with all relations
            return tx.expenseSheet.findUnique({
                where: { id: createdSheet.id },
                include: {
                    directory: true,
                    columns: true,
                    entries: {
                        include: {
                            values: true
                        },
                    },
                },
            });
        });

        if (!sheet) {
            throw new Error('Failed to create expense sheet');
        }

        return sheet;
    }

    async findAll(user: any, directoryId?: string) {
        // Get user's clientId
        const clientId = await this.getUserClientId(user);

        // Use tenant context prisma client
        const prisma = await this.tenantContext.getPrismaClient();

        const where: Prisma.ExpenseSheetWhereInput = {
            clientId,
            status: { not: ExpenseStatus.DELETED },
        };

        if (directoryId) {
            where.directoryId = directoryId;
        }

        return prisma.expenseSheet.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOneWithData(
        id: string, 
        user: any, 
        status: string = 'SUBMITTED',
        page: number = 1,
        limit: number = 20
    ) {
        // Get user's clientId
        const clientId = await this.getUserClientId(user);

        // Use tenant context prisma client
        const prisma = await this.tenantContext.getPrismaClient();

        // Validate pagination parameters
        const validatedPage = Math.max(1, page);
        const validatedLimit = Math.min(Math.max(1, limit), 100); // Max 100 records per page
        const skip = (validatedPage - 1) * validatedLimit;

        // Determine entry status to filter
        let entryStatus: ExpenseEntryStatus = ExpenseEntryStatus.SUBMITTED;
        if (status && Object.values(ExpenseEntryStatus).includes(status as ExpenseEntryStatus)) {
            entryStatus = status as ExpenseEntryStatus;
        }

        // First, get the total count of entries for pagination metadata
        const totalEntries = await prisma.expenseEntry.count({
            where: {
                sheet: {
                    id,
                    clientId,
                    status: { not: ExpenseStatus.DELETED },
                },
                status: entryStatus,
            },
        });

        const sheet = await prisma.expenseSheet.findFirst({
            where: {
                id,
                clientId,
                status: { not: ExpenseStatus.DELETED },
            },
            select: {
                id: true,
                name: true,
                description: true,
                status: true,
                isArchived: true,
                createdAt: true,
                updatedAt: true,
                directory: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                    },
                },
                columns: {
                    select: {
                        id: true,
                        name: true,
                        columnType: true,
                        isRequired: true,
                        hasAutoSum: true,
                        orderIndex: true,
                    },
                },
                entries: {
                    where: {
                        status: entryStatus,
                    },
                    skip: skip,
                    take: validatedLimit,
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        status: true,
                        createdAt: true,
                        updatedAt: true,
                        createdByUser: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                            },
                        },
                        approvedByUser: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                            },
                        },
                        values: {
                            select: {
                                id: true,
                                columnId: true,
                                value: true,
                            },
                        },
                    },
                },
            },
        });

        if (!sheet) {
            throw new NotFoundException('Expense sheet not found');
        }

        // Transform each entry's values to an object keyed by column name, ordered by columns
        const columns = sheet.columns.sort((a, b) => a.orderIndex - b.orderIndex);
        const columnIdToName = columns.reduce((acc, col) => {
            acc[col.id] = col.name;
            return acc;
        }, {} as Record<string, string>);

        const processedEntries = sheet.entries.map(entry => {
            // Map values by columnId
            const valueMap: Record<string, any> = {};
            entry.values.forEach(val => {
                const colName = columnIdToName[val.columnId];
                if (colName) {
                    valueMap[colName] = val.value;
                }
            });
            // Build ordered object
            const orderedValues: Record<string, any> = {};
            columns.forEach(col => {
                orderedValues[col.name] = valueMap[col.name] ?? null;
            });
            return {
                ...entry,
                values: orderedValues,
            };
        });

        // Calculate pagination metadata
        const totalPages = Math.ceil(totalEntries / validatedLimit);
        const hasNextPage = validatedPage < totalPages;
        const hasPreviousPage = validatedPage > 1;

        return {
            ...sheet,
            entries: processedEntries,
            pagination: {
                currentPage: validatedPage,
                limit: validatedLimit,
                totalEntries,
                totalPages,
                hasNextPage,
                hasPreviousPage,
            },
        };
    }

    async updateWithData(id: string, dto: UpdateExpenseSheetDto, user: any) {
        // Validate user access to the client
        const clientId = await this.getUserClientId(user);

        // Check if the sheet exists and is accessible
        const prisma = await this.tenantContext.getPrismaClient();
        const sheet = await prisma.expenseSheet.findFirst({
            where: {
                id,
                clientId,
                status: { not: ExpenseStatus.DELETED },
            },
        });

        if (!sheet) {
            throw new NotFoundException('Expense sheet not found');
        }

        // Use a transaction to update sheet, columns, entries, and values atomically
        const updatedSheet = await prisma.$transaction(async (tx) => {
            // Step 1: Prepare update data for the sheet
            const updateData: Prisma.ExpenseSheetUpdateInput = {
                name: dto.name,
                description: dto.description,
                isArchived: dto.isArchived,
                archivedAt: dto.isArchived ? new Date() : null,
            };

            // Step 2: Handle column updates (delete existing and recreate if provided)
            if (dto.columns) {
                await tx.expenseColumn.deleteMany({
                    where: { sheetId: id },
                });
                updateData.columns = {
                    create: dto.columns.map((column, index) => ({
                        name: column.name,
                        columnType: column.columnType,
                        isRequired: column.isRequired ?? false,
                        hasAutoSum: column.hasAutoSum ?? false,
                        orderIndex: index,
                        metadata: column.metadata,
                    })),
                };
            }

            // Step 3: Update the sheet with basic fields and columns
            const tempSheet = await tx.expenseSheet.update({
                where: { id },
                data: updateData,
                include: { columns: true },
            });

            // Step 4: Handle entry updates (delete existing and recreate if provided)
            if (dto.entries) {
                await tx.expenseEntry.deleteMany({
                    where: { sheetId: id },
                });

                // Create new entries
                await tx.expenseEntry.createMany({
                    data: dto.entries.map((entry) => ({
                        sheetId: id,
                        createdBy: user.id,
                        status: (entry.status as ExpenseEntryStatus) || ExpenseEntryStatus.DRAFT,
                    })),
                });

                // Fetch created entries to get their IDs
                const createdEntries = await tx.expenseEntry.findMany({
                    where: { sheetId: id },
                    select: { id: true },
                });

                // Step 5: Create entry values, connecting to the correct columns
                const entryValues = dto.entries.flatMap((entry, entryIndex) =>
                    Object.entries(entry.values).map(([columnName, value]) => {
                        const column = tempSheet.columns.find((col) => col.name === columnName);
                        if (!column) {
                            throw new Error(`Column ${columnName} not found`);
                        }
                        return {
                            entryId: createdEntries[entryIndex].id,
                            columnId: column.id, // Now safe, as tempSheet.columns always has id
                            value,
                        };
                    }),
                );

                if (entryValues.length > 0) {
                    await tx.expenseEntryValue.createMany({
                        data: entryValues,
                    });
                }
            }

            // Step 6: Fetch the complete sheet with all relations
            return tx.expenseSheet.findUnique({
                where: { id },
                include: {
                    directory: {
                        select: {
                            id: true,
                            name: true,
                            description: true,
                            status: true
                        }
                    },
                    columns: true,
                    entries: {
                        include: {
                            values:true
                        },
                    },
                },
            });
        });

        if (!updatedSheet) {
            throw new Error('Failed to update expense sheet');
        }

        return updatedSheet;
    }

    async addDraftEntries(sheetId: string, rows: Array<Record<string, any>>, user: any) {
        // Support both single and multiple sheet calls
        if (Array.isArray(sheetId)) {
            // Called with array of { sheetId, rows, user }
            const results: Array<{ sheetId: string, added: number }> = [];
            for (const item of sheetId) {
                const { sheetId: sId, rows: sRows, user: sUser } = item;
                const clientId = await this.getUserClientId(sUser);
                const prisma = await this.tenantContext.getPrismaClient();
                const sheet = await prisma.expenseSheet.findFirst({
                    where: { id: sId, clientId, status: { not: 'DELETED' } },
                    include: { columns: true },
                });
                if (!sheet) throw new NotFoundException(`Expense sheet not found: ${sId}`);

                // Prepare entry and value data
                const entriesData = sRows.map(row => ({
                    sheetId: sheet.id,
                    createdBy: sUser.id as string,
                    status: ExpenseEntryStatus.DRAFT,
                }));

                await prisma.expenseEntry.createMany({ data: entriesData });

                // Fetch created entries to get their IDs
                const entries = await prisma.expenseEntry.findMany({
                    where: { sheetId: sheet.id },
                    orderBy: { createdAt: 'desc' },
                    take: sRows.length,
                });

                // Prepare entry values (no required field enforcement)
                const entryValues: { entryId: string; columnId: string; value: string }[] = [];
                for (let i = 0; i < sRows.length; i++) {
                    const row = sRows[i];
                    const entry = entries[i];
                    for (const [columnName, value] of Object.entries(row)) {
                        const column = sheet.columns.find(col => col.name.toLowerCase() === columnName.toLowerCase());
                        if (column) {
                            entryValues.push({
                                entryId: entry.id,
                                columnId: column.id,
                                value: String(value),
                            });
                        }
                    }
                }

                if (entryValues.length > 0) {
                    await prisma.expenseEntryValue.createMany({ data: entryValues });
                }
                results.push({ sheetId: sId, added: sRows.length });
            }
            return results;
        } else {
            // Original single-sheet logic
            const clientId = await this.getUserClientId(user);
            const prisma = await this.tenantContext.getPrismaClient();

            const sheet = await prisma.expenseSheet.findFirst({
                where: { id: sheetId, clientId, status: { not: 'DELETED' } },
                include: { columns: true },
            });
            if (!sheet) throw new NotFoundException('Expense sheet not found');

            // Prepare entry and value data
            const entriesData = rows.map(row => ({
                sheetId: sheet.id,
                createdBy: user.id as string,
                status: ExpenseEntryStatus.DRAFT,
            }));

            await prisma.expenseEntry.createMany({ data: entriesData });

            // Fetch created entries to get their IDs
            const entries = await prisma.expenseEntry.findMany({
                where: { sheetId: sheet.id },
                orderBy: { createdAt: 'desc' },
                take: rows.length,
            });

            // Prepare entry values (no required field enforcement)
            const entryValues: { entryId: string; columnId: string; value: string }[] = [];
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const entry = entries[i];
                for (const [columnName, value] of Object.entries(row)) {
                    const column = sheet.columns.find(col => col.name.toLowerCase() === columnName.toLowerCase());
                    if (column) {
                        entryValues.push({
                            entryId: entry.id,
                            columnId: column.id,
                            value: String(value),
                        });
                    }
                }
            }

            if (entryValues.length > 0) {
                await prisma.expenseEntryValue.createMany({ data: entryValues });
            }

            return { added: rows.length };
        }
    }

    /**
     * Add new rows to an existing expense sheet
     */
    async addRows(sheetId: string, rows: Array<Record<string, any>>, user: any) {
        // Get user's clientId
        const clientId = await this.getUserClientId(user);

        // Use tenant context prisma client
        const prisma = await this.tenantContext.getPrismaClient();

        // Check if the sheet exists and is accessible
        const sheet = await prisma.expenseSheet.findFirst({
                where: {
                    id: sheetId,
                    clientId,
                    status: { not: 'DELETED' },
                },
                include: {
                    columns: true,
                },
            });

            if (!sheet) {
                throw new NotFoundException('Expense sheet not found');
            }

            // Check that all rows have status SUBMITTED
            for (let row of rows) {
                if (!row.status || row.status !== 'SUBMITTED') {
                    throw new BadRequestException('All rows must have status SUBMITTED');
                }
            }

            // Prepare entry and value data
            const entriesData = rows.map(row => ({
                sheetId: sheet.id,
                createdBy: user.id as string,
                status: row.status,
            }));

            // Create entries
            await prisma.expenseEntry.createMany({
                data: entriesData,
            });

            // Fetch created entries to get their IDs
            const entries = await prisma.expenseEntry.findMany({
                where: { sheetId: sheet.id },
                orderBy: { createdAt: 'desc' },
                take: rows.length,
            });

            // Prepare entry values
            const entryValues: { entryId: string; columnId: string; value: any }[] = [];
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const entry = entries[i];
                for (const [columnName, value] of Object.entries(row)) {
                    const column = sheet.columns.find(col => col.name.toLowerCase() === columnName.toLowerCase());
                    if (column) {
                        entryValues.push({
                            entryId: entry.id,
                            columnId: column.id,
                            value: String(value),
                        });
                    }
                }
            }

            // Create entry values
            if (entryValues.length > 0) {
                await prisma.expenseEntryValue.createMany({
                    data: entryValues,
                });
            }

            return { added: rows.length };
    }

    async delete(id: string, user: any) {
        // Validate user access to the client
        const clientId = await this.getUserClientId(user);

        // Use tenant context prisma client
        const prisma = await this.tenantContext.getPrismaClient();

        // Check if the sheet exists and is accessible
        const sheet = await prisma.expenseSheet.findFirst({
            where: {
                id,
                clientId,
                status: { not: ExpenseStatus.DELETED },
            },
        });

        if (!sheet) {
            throw new NotFoundException('Expense sheet not found');
        }

        // Soft delete by setting status to DELETED and updating deletedAt
        return prisma.expenseSheet.update({
            where: { id },
            data: {
                status: ExpenseStatus.DELETED,
                deletedAt: new Date(),
            },
            include: {
                directory: true,
                client: true,
                store: true,
                createdByUser: true,
            },
        });
    }

    async hardDelete(id: string, user: any) {
        // Validate user access to the client
        const clientId = await this.getUserClientId(user);

        // Use tenant context prisma client
        const prisma = await this.tenantContext.getPrismaClient();

        // Check if the sheet exists and is accessible
        const sheet = await prisma.expenseSheet.findFirst({
            where: {
                id,
                clientId,
            },
        });

        if (!sheet) {
            throw new NotFoundException('Expense sheet not found');
        }

        // Hard delete in a transaction to ensure data integrity
        return prisma.$transaction(async (tx) => {
            // Step 1: Delete all entry values first
            await tx.expenseEntryValue.deleteMany({
                where: {
                    entry: {
                        sheetId: id,
                    },
                },
            });

            // Step 2: Delete all entries
            await tx.expenseEntry.deleteMany({
                where: {
                    sheetId: id,
                },
            });

            // Step 3: Delete all columns
            await tx.expenseColumn.deleteMany({
                where: {
                    sheetId: id,
                },
            });

            // Step 4: Finally delete the sheet itself
            const deletedSheet = await tx.expenseSheet.delete({
                where: { id },
                include: {
                    directory: {
                        select: {
                            id: true,
                            name: true,
                            description: true,
                        },
                    },
                    createdByUser: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                },
            });

            return deletedSheet;
        });
    }

    async getAutoSumTotals(id: string, user: any, status?: string) {
        // Get user's clientId
        const clientId = await this.getUserClientId(user);

        // Use tenant context prisma client
        const prisma = await this.tenantContext.getPrismaClient();

        // Determine entry status to filter
        let entryStatus: ExpenseEntryStatus | undefined;
        if (status && Object.values(ExpenseEntryStatus).includes(status as ExpenseEntryStatus)) {
            entryStatus = status as ExpenseEntryStatus;
        }

        // Check if the sheet exists and is accessible
        const sheet = await prisma.expenseSheet.findFirst({
            where: {
                id,
                clientId,
                status: { not: ExpenseStatus.DELETED },
                isArchived: false, // Only allow calculations on non-archived sheets
            },
            include: {
                columns: {
                    where: {
                        hasAutoSum: true,
                    },
                },
                entries: {
                    where: entryStatus ? { status: entryStatus } : {},
                    include: {
                        values: {
                            where: {
                                column: {
                                    hasAutoSum: true,
                                },
                            },
                            include: {
                                column: true,
                            },
                        },
                    },
                },
            },
        });

        if (!sheet) {
            throw new NotFoundException('Expense sheet not found');
        }

        // Calculate sums for each auto-sum column
        const columnTotals: Record<string, { 
            columnId: string; 
            columnName: string; 
            columnType: string; 
            total: number; 
            entryCount: number;
            validEntries: number;
        }> = {};

        // Initialize totals for all auto-sum columns
        sheet.columns.forEach(column => {
            columnTotals[column.id] = {
                columnId: column.id,
                columnName: column.name,
                columnType: column.columnType,
                total: 0,
                entryCount: 0,
                validEntries: 0,
            };
        });

        // Calculate totals from entry values
        sheet.entries.forEach(entry => {
            entry.values.forEach(value => {
                if (columnTotals[value.columnId]) {
                    columnTotals[value.columnId].entryCount++;
                    
                    // Try to parse the value as a number
                    const numericValue = parseFloat(value.value);
                    if (!isNaN(numericValue)) {
                        columnTotals[value.columnId].total += numericValue;
                        columnTotals[value.columnId].validEntries++;
                    }
                }
            });
        });

        // Calculate grand total (sum of all auto-sum columns)
        const grandTotal = Object.values(columnTotals).reduce((sum, col) => sum + col.total, 0);

        return {
            sheetId: sheet.id,
            sheetName: sheet.name,
            description: sheet.description,
            filterStatus: entryStatus || 'ALL',
            totalEntries: sheet.entries.length,
            autoSumColumns: Object.values(columnTotals),
            grandTotal,
            calculatedAt: new Date(),
        };
    }

    async getStoreAutoSumTotals(user: any, storeId?: string, status?: string, directoryId?: string) {
        // Get user's clientId and storeId
        const clientId = await this.getUserClientId(user);
        const userStoreId = storeId || (await this.getUserStoreId(user));

        if (!userStoreId) {
            throw new BadRequestException('Store ID is required or user must be associated with a store');
        }

        // Use tenant context prisma client
        const prisma = await this.tenantContext.getPrismaClient();

        // Determine entry status to filter
        let entryStatus: ExpenseEntryStatus | undefined;
        if (status && Object.values(ExpenseEntryStatus).includes(status as ExpenseEntryStatus)) {
            entryStatus = status as ExpenseEntryStatus;
        }

        // Build where clause for sheets
        const sheetWhere: any = {
            clientId,
            storeId: userStoreId,
            status: { not: ExpenseStatus.DELETED },
            isArchived: false,
        };

        if (directoryId) {
            sheetWhere.directoryId = directoryId;
        }

        // Get all sheets in the store with auto-sum columns and their entries
        const sheets = await prisma.expenseSheet.findMany({
            where: sheetWhere,
            include: {
                directory: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                    },
                },
                columns: {
                    where: {
                        hasAutoSum: true,
                    },
                },
                entries: {
                    where: entryStatus ? { status: entryStatus } : {},
                    include: {
                        values: {
                            where: {
                                column: {
                                    hasAutoSum: true,
                                },
                            },
                            include: {
                                column: true,
                            },
                        },
                    },
                },
            },
        });

        // Aggregate totals by column name across all sheets
        const columnTotals: Record<string, {
            columnName: string;
            columnType: string;
            total: number;
            entryCount: number;
            validEntries: number;
            sheetCount: number;
            sheets: string[];
        }> = {};

        // Store individual sheet totals for detailed breakdown
        const sheetTotals: Array<{
            sheetId: string;
            sheetName: string;
            directoryName: string;
            columnTotals: Record<string, { columnName: string; total: number; entryCount: number; }>;
            sheetTotal: number;
        }> = [];

        // Process each sheet
        sheets.forEach(sheet => {
            const sheetColumnTotals: Record<string, { columnName: string; total: number; entryCount: number; }> = {};
            let sheetTotal = 0;

            // Initialize sheet column totals
            sheet.columns.forEach(column => {
                sheetColumnTotals[column.name] = {
                    columnName: column.name,
                    total: 0,
                    entryCount: 0,
                };

                // Initialize store-wide totals
                if (!columnTotals[column.name]) {
                    columnTotals[column.name] = {
                        columnName: column.name,
                        columnType: column.columnType,
                        total: 0,
                        entryCount: 0,
                        validEntries: 0,
                        sheetCount: 0,
                        sheets: [],
                    };
                }
                
                if (!columnTotals[column.name].sheets.includes(sheet.name)) {
                    columnTotals[column.name].sheets.push(sheet.name);
                    columnTotals[column.name].sheetCount++;
                }
            });

            // Calculate totals for this sheet
            sheet.entries.forEach(entry => {
                entry.values.forEach(value => {
                    const columnName = value.column.name;
                    
                    if (sheetColumnTotals[columnName]) {
                        sheetColumnTotals[columnName].entryCount++;
                        columnTotals[columnName].entryCount++;
                        
                        // Try to parse the value as a number
                        const numericValue = parseFloat(value.value);
                        if (!isNaN(numericValue)) {
                            sheetColumnTotals[columnName].total += numericValue;
                            columnTotals[columnName].total += numericValue;
                            columnTotals[columnName].validEntries++;
                            sheetTotal += numericValue;
                        }
                    }
                });
            });

            sheetTotals.push({
                sheetId: sheet.id,
                sheetName: sheet.name,
                directoryName: sheet.directory?.name || 'Unknown',
                columnTotals: sheetColumnTotals,
                sheetTotal,
            });
        });

        // Calculate grand total across all sheets and columns
        const grandTotal = Object.values(columnTotals).reduce((sum, col) => sum + col.total, 0);

        return {
            storeId: userStoreId,
            filterStatus: entryStatus || 'ALL',
            directoryFilter: directoryId || 'ALL',
            archivedFilter: 'NON_ARCHIVED_ONLY',
            totalSheets: sheets.length,
            totalAutoSumColumns: Object.keys(columnTotals).length,
            storeWideColumnTotals: Object.values(columnTotals),
            sheetBreakdown: sheetTotals,
            grandTotal,
            calculatedAt: new Date(),
        };
    }

    // Helper method to validate user access to the directory's client
    private async validateUserAccess(user: any, directoryId: string) {
        const prisma = await this.tenantContext.getPrismaClient();
        const prismaClient = await prisma;

        const directory = await prismaClient.expenseDirectory.findUnique({
            where: { id: directoryId },
            select: { clientId: true },
        });

        if (!directory) {
            throw new NotFoundException('Directory not found');
        }

        const userRecord = await prisma.users.findUnique({
            where: { id: user.id },
            select: { clientId: true },
        });

        if (!userRecord || userRecord.clientId !== directory.clientId) {
            throw new ForbiddenException('User does not have access to this client');
        }
    }

    // Helper method to get user's clientId
    private async getUserClientId(user: any): Promise<string> {
        const prisma = await this.tenantContext.getPrismaClient();
        const userRecord = await prisma.users.findUnique({
            where: { id: user.id },
            select: { clientId: true },
        });

        if (!userRecord) {
            throw new NotFoundException('User not found');
        }

        return userRecord.clientId;
    }

    // Helper method to get user's storeId (optional, based on user context)
    private async getUserStoreId(user: any): Promise<string | null> {
        const prisma = await this.tenantContext.getPrismaClient();
        const userStore = await prisma.userStoreMap.findFirst({
            where: { userId: user.id },
            select: { storeId: true },
        });

        return userStore?.storeId || null;
    }
}