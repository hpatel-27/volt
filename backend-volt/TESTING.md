# TESTING.md — Backend test guide

This is the working guide for expanding backend test coverage **one module at a
time**. It captures the conventions, the run recipe, and the exact patterns used
when the `nutrition` and `meal` modules were brought up to standard, so any new
chat can continue identically without re-deriving them.

> Scope note: Volt is a learning project, but **test-writing is explicitly
> delegated** — generate all the tests yourself (no "Learn by Doing" hand-offs for
> this work).

---

## 1. Workflow (one module = one PR)

For each module, in order:

1. Read the source under test (see §6 checklist).
2. Write/rewrite the four test files (§3) to match the **current** code contracts.
3. Run them green against the test DB (§2). Run `tsc --noEmit` and confirm `0`.
4. Hand back, in the chat:
   - a **PR title**
   - a **PR description** (Summary / Changes / Testing sections)
   - a **squash commit message + body** 
5. **Stop and wait** for the user to review/open the PR before starting the next
   module. Each module ships as its own PR and is squash-merged.

Do one module per chat to keep context small.

---

## 2. Running the tests (local Postgres via Docker)

Unit tests need no DB. Integration tests (`test/integration/**`) hit a real
Postgres.

**Key facts about this environment:**
- `.env` `TEST_DATABASE_URL` and `DEV_DATABASE_URL` both use host `postgres:5432`
  — a docker-compose service name that only resolves *inside* the Docker network.
  `compose.yml` maps Postgres to host `localhost:5432`.
- Vitest sets `NODE_ENV=test` by default, and `dotenv` won't override an
  already-set var, so `db.ts` selects `TEST_DATABASE_URL` (database `volt_test`).
- `prisma.config.ts` points the **migration CLI** at `DEV_DATABASE_URL` (db
  `volt`), so `volt_test` can lag behind committed migrations and throw
  `column (not available) does not exist`.

**Run a suite from a host shell** (PowerShell), overriding the host to `localhost`:

```powershell
cd 'C:\Users\hpate\projects\volt\backend-volt'
$test = ((Get-Content .env | Where-Object { $_ -match '^TEST_DATABASE_URL=' }) -replace '^TEST_DATABASE_URL=','') -replace '@postgres:','@localhost:'
$env:TEST_DATABASE_URL = $test; $env:NODE_ENV = 'test'
npx vitest run test/**/<module>.test.ts
```

**If integration tests fail with a missing-column / drift error**, the test DB
needs the committed migrations applied (test DB only; `volt`/dev is untouched):

```powershell
$test = ((Get-Content .env | Where-Object { $_ -match '^TEST_DATABASE_URL=' }) -replace '^TEST_DATABASE_URL=','') -replace '@postgres:','@localhost:'
$env:DEV_DATABASE_URL = $test   # prisma.config reads DEV_DATABASE_URL for non-prod
npx prisma migrate deploy
```

Type-check everything: `npx tsc --noEmit` (must exit `0`).

> Verify the Postgres container is up first: `docker ps` → `volt-postgres ... (healthy) 0.0.0.0:5432->5432`.

---

## 3. The four test files per module

Mirror the existing `meal`/`nutrition` layout exactly:

| File | Mocks | Tests |
|---|---|---|
| `test/unit/services/<m>.test.ts` | Prisma (`vi.mock("../../../src/db.js")`) | service logic + mapper output + error branches |
| `test/unit/controllers/<m>.test.ts` | the service(s) + db | validation, status codes, delegation, error propagation |
| `test/integration/services/<m>.test.ts` | none (real DB) | real queries, composite keys, cascade, cross-user isolation |
| `test/integration/controllers/<m>.test.ts` | `@clerk/express` only (real app+DB) | full HTTP round-trips via supertest |

The unit suites mock Prisma so they pin **branching logic + mapper shape**. The
integration suites prove **real Prisma queries + DB constraints** behave.

---

## 4. Boilerplate patterns (copy these)

### 4a. Unit service test
```ts
vi.mock("../../../src/db.js"); // hoisted — mocks db before the prisma import

import type { DeepMockProxy } from "vitest-mock-extended";
import { expect, it, describe, vi, beforeEach } from "vitest";
import { prisma } from "../../../src/db.js";
import * as svc from "../../../src/services/<m>.service.js";
import { Prisma } from "../../../src/generated/prisma/client.js";
import { NotFoundError } from "../../../src/errors.js";

const prismaMock = prisma as unknown as DeepMockProxy<typeof prisma>;

function prismaError(code: string) {
  return new Prisma.PrismaClientKnownRequestError(`Prisma error ${code}`, {
    code, clientVersion: "7.4.2",
  });
}

beforeEach(() => vi.clearAllMocks());
```
- Mock rows are **raw DB rows** (include FK columns + real `Date` objects);
  assert the **mapped DTO** shape (FK/userId stripped, `date` as `"YYYY-MM-DD"`).
- `$transaction` has **two shapes** — match the service:
  - **callback** (`$transaction(async (tx) => …)`, e.g. nutrition `getAll`):
    `prismaMock.$transaction.mockImplementation((cb:any) => cb(prismaMock));`
    then stub the inner `findMany`/`count`/`groupBy`.
  - **array** (`$transaction([findMany, count])`, e.g. weight `getAll`):
    `prismaMock.$transaction.mockResolvedValueOnce([rows, count] as any);`
- Heavily-overloaded ops (e.g. `meal.groupBy`) need a cast to reach the helper:
  `(prismaMock.x.groupBy as any).mockResolvedValueOnce([...])`.
- Error branches to cover per write op: typed Prisma code → custom error
  (`P2025`→`NotFoundError`, `P2002`→`DuplicateEntryError`), a generic `Error`
  (propagates), and a **non-Error value** (`.rejects.toBe(42)` / `"unknown"`).

### 4b. Unit controller test
```ts
vi.mock("../../../src/services/<m>.service.js");
// also mock any OTHER service the controller calls to resolve params
vi.mock("../../../src/db.js");

import type { Request, Response } from "express";
// ...
function mockResponse(locals = {}) {
  return {
    locals,
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  } as unknown as Response;
}
```
- `req.user!.id` is read in every protected controller — set `user: { id: "..." }`.
- Validated params live in `res.locals` (set by middleware): `res.locals.date`,
  `res.locals.<uuidParam>`, `res.locals.fromDate/toDate`, and `req.pagination`.
- Assert on `mRes.json` / `mRes.status` for success and **inline 400s**; use
  `await expect(controller(...)).rejects.toThrow(...)` for **thrown** errors.
- Verify delegation args: `expect(svc.fn).toHaveBeenCalledWith(...)`.

### 4c. Integration service test
```ts
import { prisma } from "../../../src/db.js";
import * as svc from "../../../src/services/<m>.service.js";

const TEST_CLERK_ID = "integration_test_<m>_service_user";
const OTHER_CLERK_ID = "integration_test_<m>_service_other"; // for isolation tests
let testUserId: string; let otherUserId: string;

beforeAll(async () => { /* upsert both users by clerkId */ });
afterAll(async () => { /* deleteMany child rows for both users, then delete users */ });
```
- Use a **unique `clerkId` per file** so parallel suites don't collide.
- Clean up in `afterAll` (and per-`describe` where state would leak); rely on
  cascade deletes where they exist (e.g. meals cascade with their log).
- Use `crypto.randomUUID()` for "missing id" cases.
- Always include a **cross-user isolation** test (other user → `NotFoundError`).

### 4d. Integration controller test
```ts
vi.mock("@clerk/express", () => ({
  clerkMiddleware: () => (req: any, _res: Response, next: NextFunction) => {
    req.auth = "integration_test_<m>_controller_user";
    next();
  },
  getAuth: (req: any) => ({ isAuthenticated: true, userId: req.auth }),
}));

import request from "supertest";
import { createApp } from "../../../src/app.js";
const app = createApp({ skipRateLimit: true });
```
- Routes are mounted under `/api/v1` (see `src/routes/index.ts`).
- **Exact-body match vs field check** (critical):
  - Inline `res.status(400).json({ error })` (param-format, name, pagination,
    "no valid fields") → body is exactly `{ error }`; use `.expect({ error: "…" })`.
  - **Thrown** errors go through `errorMiddleware`, which returns
    `{ error, requestId }`; you can't exact-match — use
    `.expect((res) => expect(res.body.error).toBe("…"))`.

---

## 5. Conventions & gotchas learned

- **DTO mappers strip fields.** Output DTOs omit foreign keys / `userId`
  (`toMealDto` drops `nutritionLogId`; nutrition DTOs drop `userId`). Assert the
  exact mapped shape **and** add a defensive `expect(x).not.toHaveProperty("userId")`
  / `"nutritionLogId"` — it guards against a refactor re-leaking them.
- **Dates serialize to `"YYYY-MM-DD"` strings** in DTOs (mapper does
  `date.toISOString().slice(0,10)`). Inputs are ISO strings; Prisma rows are `Date`.
- **Validation split:** simple presence/type checks may be inline (return 400);
  numeric checks use `src/helpers/validators.ts` which **throw**
  `BadRequestError`/`BadRequestError` with messages like
  `"<Field> is required and must be a non-negative number"`. Match the exact
  helper message, not a hand-written one.
- **Param middleware** (`src/middleware/param.middleware.ts`): `parseUuidParam`
  → 400 `{ error: "Invalid <param>" }`; `parseDateParam` → 400
  `{ error: "<param> must be a date in YYYY-MM-DD format" }`.
- **Error mapping in services:** `P2025` → `NotFoundError`, `P2002` →
  `DuplicateEntryError`. Anything else re-throws unchanged.
- **Prefer `it.each`** for repetitive validation/branch cases (one row per
  field/value/message) — it's how the macro-validation explosion was tamed.
- **Behavior can differ from the old tests** — read the source, don't trust the
  prior assertions. (e.g. meal `POST` now *auto-creates* the parent log via
  `findOrCreateNutritionLogByDate` → 201, where it used to 404.)

---

## 6. Per-module source checklist

For module `<m>`, read before writing tests:
- `src/services/<m>.service.ts` — function signatures, error branches, `$transaction` shape
- `src/controllers/<m>.controller.ts` — validation, status codes, which services it calls to resolve params
- `src/routes/<m>.routes.ts` — paths, middleware order, nesting/`mergeParams`
- `src/types/<m>.dto.ts` + `src/mappers/<m>.mapper.ts` — exact DTO shape (what's stripped)
- relevant `src/middleware/*` for any param/validation messages the routes use
- the existing `nutrition`/`meal` test files as the reference implementation

---

## 7. Remaining modules (do in this order, one PR each)

1. **weights** — `getAllWeights` uses the **array**-style `$transaction` (not the
   callback form); `getWeightsByRange`, `getWeightById`, create/update/delete with
   P2025→NotFound. Routes all `userMiddleware`.
2. **workout plans** — note `activePlanId` on User and `PlanType` enum.
3. **workout days**
4. **workout day exercises**
5. **workout logs**
6. **exercise logs**
7. **set logs**

For 2–7, check the routes for nesting/ownership chains (parent resource → child)
and mirror the meal pattern (resolve parent id, enforce ownership through the
`where` clause, cross-user isolation tests).

---

## 8. Definition of done (per module)

- [ ] 4 test files written/updated to current contracts
- [ ] All four green against `volt_test`
- [ ] `npx tsc --noEmit` exits `0`
- [ ] PR title + description provided
- [ ] Squash commit message + body provided (with `Co-Authored-By` trailer)
- [ ] Paused for review before the next module
