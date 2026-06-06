# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)

## Commands

```bash
# Development
npm run start:dev          # Watch mode (hot reload)
npm run start:debug        # Debug + watch mode

# Build & Production
npm run build              # Compile TypeScript via NestJS
npm run start:prod         # Run compiled output

# Testing
npm run test               # Run all unit tests
npm run test:watch         # Watch mode
npm run test:cov           # With coverage
npm run test:e2e           # End-to-end tests
# Run a single test file:
npx jest src/path/to/file.spec.ts

# Linting & formatting
npm run lint               # ESLint with --fix
npm run format             # Prettier

# Database
npm run prisma:generate    # Regenerate Prisma client after schema changes
npm run prisma:migrate     # Run migrations in dev (creates migration files)
npm run migrate            # Deploy migrations (production)
npm run prisma:seed        # Seed category data
npm run prisma:studio      # Open Prisma Studio UI
```

## Architecture Overview

This is a **NestJS + Prisma + PostgreSQL** backend for a multi-tenant inventory/POS SaaS called Accurack. All routes are prefixed `/api/v1/`.

### Multi-tenancy model

The app uses a **shared-database, shared-schema** strategy. Every record carries a `clientId` (UUID) that identifies the tenant (`Clients` table). There is no per-tenant database provisioning at runtime — `TenantService` creates a `databaseName` record but the actual data lives in the single `DATABASE_URL` Postgres instance.

`TenantContextService` (`src/tenant/tenant-context.service.ts`) is a request-scoped service that reads `request.user.clientId` and exposes `getPrismaClient()` — most business services call this instead of injecting `PrismaService` directly, so every query is automatically scoped to the current client.

The `@UseMasterDB()` decorator (`src/common/decorators/use-master-db.decorator.ts`) sets `request._useMasterDB = true` via `TenantContextInterceptor`, telling services to skip tenant scoping for admin-level operations.

### Authentication

- JWT stored in HTTP-only cookies (`accessToken` / `refreshToken`). `JwtStrategy` extracts from cookies first, falls back to `Authorization` Bearer header.
- Google OAuth2 (`passport-google-oauth20`) for social login.
- JWT payload carries `{ id, email, role, clientId, excludedPermissions }`.
- Guards in order: `JwtAuthGuard` → `PermissionsGuard`. Routes marked `@Public()` skip both.

### Permission system

`PermissionsGuard` (`src/guards/permissions.guard.ts`) checks fine-grained RBAC:
- Resources (`PermissionResource`) and actions (`PermissionAction`) are declared in `src/permissions/enums/permission.enum.ts`.
- `super_admin` role bypasses all checks except entries in the user's `excludedPermissions` JSON array.
- `storeId` is resolved from request params/query/body/header `x-store-id`. If omitted, the guard checks across all stores the user belongs to.
- Default role templates live in `DEFAULT_ROLE_TEMPLATES` in the permission enum.

### Response shape

All responses are wrapped by `ResponseInterceptor` into:
```json
{ "success": true, "message": "...", "data": ..., "status": 200, "timestamp": "..." }
```
Use `ResponseService` (`src/common/services/response.service.ts`) inside services to build these objects explicitly. Add `@SkipResponseTransform()` on a handler to bypass the interceptor.

### Module map

| Module | Responsibility |
|---|---|
| `auth` | Login, signup, Google OAuth, invite/accept, password reset, OTP |
| `tenant` | Client registration, tenant context per request |
| `database` | `MultiTenantService` — validates/creates client & user records |
| `users` | User CRUD, store assignment, excluded-permission management |
| `permissions` | Permission grant/revoke, role templates, RBAC checks |
| `store` | Store CRUD, settings, user-store mapping |
| `product` | Product CRUD, category, bulk Excel/CSV import |
| `supplier` | Supplier CRUD, purchase orders |
| `sales` | Sales, drafts, returns, adjustments, history, pricing logic |
| `invoice` | Invoice generation |
| `customer` | Customer profiles, balance tracking |
| `driver` | Delivery driver management |
| `employee` | Employee records |
| `expense` | Expense directories, sheets, entries |
| `dashboard` | Revenue summaries and analytics |
| `tax` | Tax types, codes, regions, rates, assignments |
| `mail` | Nodemailer/Gmail API email sending |
| `metrics` | Prometheus metrics via `prom-client` at `/metrics` |
| `health` | `GET /health` endpoint |
| `prisma` | Global `PrismaModule` — exports `PrismaService` everywhere |
| `common` | Shared interceptors, filters, decorators, `ResponseService` |

### Key patterns

- **Request-scoped `TenantContextService`**: every module that needs tenant isolation injects it and calls `this.tenantContext.getPrismaClient()` to get the Prisma client.
- **`@Require Permissions()`** decorator sets `PERMISSIONS_KEY` metadata consumed by `PermissionsGuard`.
- Swagger is available at `/api/v1/swagger` (basic-auth protected via `SWAGGER_USER` / `SWAGGER_PASSWORD` env vars). The JSON schema is written to `swagger.json` on each boot.
- Logging: `nestjs-pino` in development (pretty), `pino-loki` in production (ships logs to a Loki endpoint set by `LOKI_HOST`).
- Rate limiting: `@nestjs/throttler` — 30 requests per 10 seconds per IP.

### Environment variables

Copy `.env.example` to `.env`. Critical vars that block startup if missing (validated in `src/utils/env-validation.ts`): `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`. Optional: Google OAuth, Gmail API, `LOKI_HOST`, `SWAGGER_USER`/`SWAGGER_PASSWORD`.
