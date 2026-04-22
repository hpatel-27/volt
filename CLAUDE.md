# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend (`backend-volt/`)

```bash
npm run dev              # Start with hot-reload (tsx watch), requires .env
npm test                 # Run all tests with vitest (watch mode)
npm run test:coverage    # Run tests with coverage report
npx vitest run <file>    # Run a single test file
npx prisma migrate dev   # Apply schema changes and regenerate client
npx prisma generate      # Regenerate Prisma client without migrating
npm run seed:exercises   # Seed the exercise library from scripts/exercises.ts
```

### Frontend (`frontend-volt/`)

```bash
npm run dev     # Start Vite dev server
npm run build   # Type-check + production build
npm run lint    # ESLint
```

## Environment Variables (`backend-volt/.env`)

| Variable            | Purpose                                                       |
|---------------------|---------------------------------------------------------------|
| `NODE_ENV`          | `development`, `test`, or `production` — required at startup  |
| `DEV_DATABASE_URL`  | Postgres URL used in development                              |
| `TEST_DATABASE_URL` | Postgres URL used in test runs                                |
| `DATABASE_URL`      | Postgres URL used in production                               |
| `CLERK_SECRET_KEY`  | Clerk backend secret for JWT validation                       |
| `SERVER_PORT`       | Express listen port (default: 8080)                           |
| `ALLOWED_ORIGINS`   | Comma-separated CORS origins (production only)                |

`db.ts` selects the database URL based on `NODE_ENV` and throws if the matching variable is missing.

## Architecture

### Request Lifecycle

```
Request → requestIdMiddleware (UUID) → clerkMiddleware (parses JWT)
       → rate limiter → route handler
       → [userMiddleware] (Clerk userId → DB user, sets req.user)
       → [requireAdmin] (checks req.user.isAdmin)
       → controller → service (Prisma) → response
       → errorMiddleware (catches thrown errors, maps to HTTP status)
```

### Layering: Controllers vs Services

- **Controllers** (`src/controllers/`) — validate request inputs, extract params, call service functions, return HTTP responses. They do not contain Prisma queries.
- **Services** (`src/services/`) — all database access via Prisma. Throw typed errors (`NotFoundError`, `DuplicateEntryError` from `src/errors.ts`) rather than returning error objects.
- **Routes** (`src/routes/`) — wire middleware to controllers. `routes/index.ts` mounts all sub-routers under `/api/v1`.

### Auth Flow

Clerk is used for authentication. Every request passes through `clerkMiddleware()` which populates Clerk session context. Protected routes then apply `userMiddleware`, which calls `getUser(userId)` to look up (or upsert) the user in the DB and attach it to `req.user`. `requireAdmin` middleware gates admin-only operations.

### Nested Routes

Meal routes are nested under nutrition logs: `/:logId/meals`. This uses `mergeParams: true` on the meal router so `:logId` is accessible in meal controllers via `req.params.logId`.

### Error Handling

Custom error classes in `src/errors.ts` carry a `statusCode`. The centralized `errorMiddleware` (must be the last `app.use`) checks `instanceof` against known error types and responds with the appropriate status. All unhandled errors fall through to a 500 with the request UUID for traceability.

### Database

PostgreSQL via Prisma ORM with the `@prisma/adapter-pg` driver. The Prisma client is generated into `src/generated/prisma/` (not the default location). Always import from `"../generated/prisma/client.js"`.

### Testing

Two test suites mirror each other:
- `test/unit/` — mocks the DB (`src/__mocks__/db.ts` uses `vitest-mock-extended`) and mocks services to test controllers in isolation.
- `test/integration/` — exercises the real service layer against an actual test database.

The `__mocks__/db.ts` file is auto-picked up by Vitest's module mocking via `vi.mock("../../../src/db.js")` at the top of unit test files (hoisted before imports).

### Prisma Client Output Location

The client is generated to `src/generated/prisma/` (configured in `schema.prisma`). Do not import from the default `@prisma/client` package — use the generated path.
