# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Learning Project

This is a learning project. When the user asks for help implementing something:
- Guide them toward the solution with pseudocode, relevant documentation links, or targeted hints rather than writing the implementation for them.
- Ask clarifying questions that prompt the user to think through the design decision themselves.
- If they are stuck, increase detail incrementally — first a conceptual hint, then pseudocode, then a partial example — rather than jumping straight to a full solution.
- When you do write code (scaffolding, boilerplate, non-learning work), follow the **Learn by Doing** format defined in the output style.

## Frontend Design

The frontend visual direction, color tokens, typography scale, navigation structure, UX flows, and a decisions log live in `frontend-volt/DESIGN.md`. Read it before making any design or layout choices in `frontend-volt/`. A static visual reference (all 8 key screens in mobile frames) lives at `frontend-volt/mockups.html` — open in a browser. Keep `DESIGN.md` updated when non-trivial design decisions are made.

## Coding Standards

Enforce these standards in all code written for this project:

- **Single Responsibility** — each function, middleware, or module does one thing. Controllers validate and delegate; services query and throw; middleware handles cross-cutting concerns.
- **DRY** — before adding logic, check whether it already exists in a service, middleware, or utility. Extract repeated validation or query patterns rather than copy-pasting.
- **Modular / reusable** — shared logic lives in the appropriate layer (e.g. param parsing belongs in middleware, not duplicated across controllers). New middleware, helpers, or service functions should be written to be composable.
- **Explicit over implicit** — prefer clear, named error types over generic throws; prefer named exports over default exports where it aids discoverability.

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

## API Routes

All routes are mounted under `/api/v1` via `src/routes/index.ts`.

### Weights — `🔒 userMiddleware` on all routes

| Method   | Path            | Description                        |
|----------|-----------------|------------------------------------|
| GET      | `/weights`      | Get all weight entries (paginated) |
| POST     | `/weights`      | Create a new weight entry          |
| PATCH    | `/weights/:id`  | Update a weight entry by ID        |
| DELETE   | `/weights/:id`  | Delete a weight entry by ID        |

### Exercises — Public GET, `🔒 userMiddleware + requireAdmin` for mutations

| Method   | Path               | Description                        |
|----------|--------------------|------------------------------------|
| GET      | `/exercises`       | List exercises (paginated)         |
| GET      | `/exercises/:id`   | Get a single exercise by ID        |
| POST     | `/exercises`       | Create an exercise (admin only)    |
| PATCH    | `/exercises/:id`   | Update an exercise (admin only)    |
| DELETE   | `/exercises/:id`   | Delete an exercise (admin only)    |

### Nutrition Logs — `🔒 userMiddleware` on all routes

| Method   | Path               | Description                                        |
|----------|--------------------|-----------------------------------------------------|
| GET      | `/nutrition-logs`       | List nutrition logs as summaries (paginated)        |
| GET      | `/nutrition-logs/:id`   | Get a single log with full meal details             |
| POST     | `/nutrition-logs`       | Create a new nutrition log                          |
| PATCH    | `/nutrition-logs/:id`   | Update a nutrition log (e.g. change recorded date)  |
| DELETE   | `/nutrition-logs/:id`   | Delete a nutrition log                              |

### Meals — Nested under nutrition logs, `🔒 userMiddleware` inherited from parent

Meals are mounted at `/:logId/meals` with `mergeParams: true`, so `:logId` is available in meal controllers via `req.params.logId`.

| Method   | Path                             | Description                          |
|----------|----------------------------------|--------------------------------------|
| GET      | `/nutrition/:logId/meals`        | List all meals for a nutrition log   |
| GET      | `/nutrition/:logId/meals/:mealId`| Get a single meal                    |
| POST     | `/nutrition/:logId/meals`        | Create a meal in a nutrition log     |
| PATCH    | `/nutrition/:logId/meals/:mealId`| Update a meal                        |
| DELETE   | `/nutrition/:logId/meals/:mealId`| Delete a meal                        |

### Examples — Dev/testing only

| Method | Path                  | Description                          |
|--------|-----------------------|--------------------------------------|
| GET    | `/examples/protected` | Returns Clerk user object (auth test)|

## Agent Routing

- Use the **swe** agent for all code changes on Volt.
- Use the **qa** agent after a feature lands to audit coverage.
- Run swe and qa **sequentially**, not in parallel — qa needs to read what swe just wrote.
- Only run qa in parallel if it's analyzing a completely separate module from what swe is actively touching.