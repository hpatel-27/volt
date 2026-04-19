# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Collaboration Philosophy

**The user is here to learn, not to receive code.** This project is a hands-on learning experience covering Node.js, Express, and React — the goal is to build skills useful for getting hired, not to produce a finished product quickly.

### How to assist:
- **Teach concepts**, don't write implementation code
- **Use pseudocode** to illustrate logic without doing the work
- **Point to documentation** (MDN, Express docs, Prisma docs, etc.) rather than writing solutions
- **Ask guiding questions** to help the user reason through problems themselves
- **Explain the "why"** behind patterns — REST conventions, middleware, React state, etc.
- **Let the user struggle** — confusion and failure are part of the learning process

### What to avoid:
- Writing complete implementations or production-ready code for the user
- Solving bugs directly — instead, explain what to look for and how to debug
- Jumping ahead of where the user is in their understanding

### What this project should touch on (resume value):
- REST API design with Express (routing, middleware, controllers, services)
- Auth (JWT, sessions, OAuth)
- Database modeling and ORM usage (Prisma + PostgreSQL)
- React patterns (state, effects, component design, hooks)
- Full-stack data flow (frontend → API → DB → response → UI)
- Git workflow and project structure
- Creating modular, reusable pieces of code

## Project Overview

**Volt** is a full-stack fitness tracking app (workout planning, macro tracking, weight analytics, exercise progression). It is a monorepo with a React frontend (`frontend-volt/`) and an Express backend (`backend-volt/`).

## Development Commands

### Frontend (`frontend-volt/`)
```bash
npm run dev       # Start Vite dev server
npm run build     # Production build
npm run lint      # Run ESLint
npm run preview   # Preview production build
```

### Backend (`backend-volt/`)
```bash
npm run dev       # Start Express with nodemon (auto-reload)
npm start         # Same as dev
```

### Prisma
```bash
# Run from backend-volt/
npx prisma migrate dev    # Apply migrations
npx prisma generate       # Regenerate client (outputs to ../generated/prisma)
npx prisma studio         # Open Prisma GUI
```

### Exercise Seeding
```bash
# Run from backend-volt/
node scripts/exercises.js  # Seed exercise database from free-exercise-db
```

## Architecture

### Stack
- **Frontend:** React 19, Vite 7, ESM modules
- **Backend:** Express 5, ESM modules, Nodemon
- **Database:** PostgreSQL via Neon (cloud)
- **ORM:** Prisma 7 with `@prisma/adapter-pg` (PostgreSQL adapter pattern)
- **Auth:** Clerk (`@clerk/express`) — handles authentication, issues JWTs
- **CORS:** `cors` package, configured per environment
- **Rate limiting:** `express-rate-limit` — 100 requests per 15 minutes globally

### Key Backend Files
- `src/server.ts` — Express app entry point; registers middleware (CORS, rate limiting, Clerk) and mounts routes
- `src/db.ts` — Prisma client initialization (uses pg adapter, reads `DATABASE_URL` from `.env`)
- `prisma/schema.prisma` — All data models
- `prisma.config.ts` — Prisma config; generated client outputs to `../generated/prisma/` (not `node_modules`)
- `src/routes/index.ts` — Route index, mounts all sub-routers under `/api/v1`
- `src/middleware/user.middleware.ts` — Upserts user on first request using Clerk's `userId`, attaches user to `req.user`

### Implemented Routes
- `GET/POST/PATCH/DELETE /api/v1/weights` — Weight CRUD with pagination, user-scoped

### Database Schema
The schema covers a complete fitness tracking domain:

- **User** — Clerk auth (`clerkId`), profile fields (`firstName`, `lastName`), `isAdmin` flag
- **Weight** — User's weight entries (`amount` in lbs, `date` as DateTime)
- **Exercise** — Pre-seeded exercise library (string ID like `"Alternate_Incline_Dumbbell_Curl"`), includes muscles, equipment, category, instructions, images
- **WorkoutPlan** → **WorkoutDay** → **WorkoutDayExercise** — Workout templates (e.g., PPL splits)
- **WorkoutLog** → **ExerciseLog** → **SetLog** — Recorded workout sessions with per-set reps/weight
- **NutritionLog** → **Meal** — Daily nutrition tracking with macros per meal

### Important Patterns
- Backend is ESM (`"type": "module"`); frontend is ESM (`"type": "module"`)
- Prisma generated client lives in `backend-volt/generated/prisma/` — import from there, not `@prisma/client`
- Both `prisma/schema.prisma` and `prisma.config.ts` are used (dual config setup)
- `migrations/` and `generated/` are gitignored
- Auth flow: Clerk middleware validates JWT → `userMiddleware` upserts user into DB → `req.user` available in controllers
- Error handling in services uses `Prisma.PrismaClientKnownRequestError` with code `P2025` for not-found cases

### Environment Variables (backend-volt/.env)
```
SERVER_PORT=8080
DATABASE_URL=<neon_url>
CLERK_SECRET_KEY=<clerk_secret>
ALLOWED_ORIGINS=<comma_separated_origins>   # production only
```

## Testing

### Commands (run from `backend-volt/`)
```bash
npm test                 # Run all tests in watch mode
npm run test:coverage    # Single run with coverage report
```

### Framework & Libraries
- **Vitest** — test runner and assertion library
- **vitest-mock-extended** — provides `DeepMockProxy<T>` for typed prisma mocks

### Test Structure
```
backend-volt/test/
  unit/
    controllers/   # Controller unit tests (mock the service layer)
    services/      # Service unit tests (mock prisma)
  integration/
    controllers/   # Full-stack HTTP tests (real DB)
    services/      # Service tests against the real DB
```

### Unit Test Patterns

**Service tests** — mock prisma directly:
```ts
vi.mock("../../../src/db.js");
import { prisma } from "../../../src/db.js";
const prismaMock = prisma as unknown as DeepMockProxy<typeof prisma>;

prismaMock.nutritionLog.findMany.mockResolvedValueOnce([...]);
```

**Controller tests** — mock the service layer, not prisma:
```ts
vi.mock("../../../src/services/nutrition.service.js");
import * as nutritionService from "../../../src/services/nutrition.service.js";

vi.mocked(nutritionService.getAllNutritionLogs).mockResolvedValueOnce({ ... });
```

Mocking at the service layer is preferred for controller tests because it isolates exactly what the controller is responsible for (parameter validation, service dispatch, HTTP response mapping) without coupling the test to the service's internal DB calls.

### Key Testing Conventions
- `vi.mock(...)` calls must appear before imports — Vitest hoists them automatically
- `vi` is a global in Vitest — no import needed for `vi.mock()`, but `vi.fn()` / `vi.mocked()` / etc. require `import { vi } from "vitest"`
- Always call `vi.clearAllMocks()` in `beforeEach` to prevent state leaking between tests
- Controller `mRes` mocks chain `.status().json()` — both must use `.mockReturnThis()`; add `.send()` for 204 responses
- For `NotFoundError` and `DuplicateEntryError`, import from `src/errors.ts` — these are the custom error classes the service layer throws
- When testing a controller success path, assert both the response payload AND (where the controller transforms data) the arguments passed to the service mock using `toHaveBeenCalledWith`
