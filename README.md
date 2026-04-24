# Volt

> A full-stack fitness tracking app for workout planning, macro tracking, weight analytics, and exercise progression insights.

![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express_5-000000?style=for-the-badge&logo=express&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Clerk](https://img.shields.io/badge/Clerk-6C47FF?style=for-the-badge&logo=clerk&logoColor=white)

---

## Features

- **Weight Tracking** — Log and review bodyweight entries over time with pagination
- **Exercise Library** — Browse a pre-seeded database of exercises with muscle groups, equipment, and instructions
- **Workout Planning** — Build structured workout plans (e.g. PPL splits) with days and exercises
- **Workout Logging** — Record completed sessions with per-set reps and weight
- **Macro Tracking** — Daily nutrition logs with per-meal macro breakdowns
- **Auth** — Clerk-powered authentication with automatic user upsert on first request

---

## Project Structure

```
volt/
├── frontend-volt/        # React 19 + Vite + Tailwind frontend
└── backend-volt/         # Express 5 + Prisma + PostgreSQL API
    ├── src/
    │   ├── controllers/  # Request handlers
    │   ├── services/     # Business logic + Prisma queries
    │   ├── routes/       # Express routers
    │   ├── middleware/   # Auth (Clerk), user upsert, pagination, param parsing
    │   ├── errors/       # Custom error classes
    │   └── server.ts     # App entry point
    ├── prisma/
    │   └── schema.prisma # Data models
    └── scripts/          # DB seeding (exercises)
```

---

## API Reference

All routes are prefixed with `/api/v1`. Auth-protected routes require a valid Clerk JWT in the `Authorization` header.

### Weights `🔒 Auth required`

| Method   | Endpoint             | Description                        |
|----------|----------------------|------------------------------------|
| `GET`    | `/weights`           | Get all weight entries (paginated) |
| `POST`   | `/weights`           | Create a new weight entry          |
| `PATCH`  | `/weights/:weightId` | Update a weight entry by ID        |
| `DELETE` | `/weights/:weightId` | Delete a weight entry by ID        |

**Query params for `GET /weights`:** `page`, `limit`

**Body for `POST /weights`:**
```json
{ "amount": 185.5, "date": "2025-01-15" }
```

**Body for `PATCH /weights/:weightId`:**
```json
{ "amount": 183.0, "date": "2025-01-16" }
```

---

### Exercises `🔓 Public GETs` / `🔒 Admin-only mutations`

| Method   | Endpoint                  | Description                        |
|----------|---------------------------|------------------------------------|
| `GET`    | `/exercises`              | List all exercises (paginated)     |
| `GET`    | `/exercises/:exerciseId`  | Get a single exercise by ID        |
| `POST`   | `/exercises`              | Create an exercise (admin only)    |
| `PATCH`  | `/exercises/:exerciseId`  | Update an exercise (admin only)    |
| `DELETE` | `/exercises/:exerciseId`  | Delete an exercise (admin only)    |

**Query params for `GET /exercises`:** `page`, `limit`

**Example:** `GET /api/v1/exercises/Barbell_Deadlift`

---

### Nutrition Logs `🔒 Auth required`

| Method   | Endpoint             | Description                                       |
|----------|----------------------|---------------------------------------------------|
| `GET`    | `/nutrition`         | List nutrition logs as summaries (paginated)      |
| `GET`    | `/nutrition/:logId`  | Get a single log with full meal details           |
| `POST`   | `/nutrition`         | Create a new nutrition log                        |
| `PATCH`  | `/nutrition/:logId`  | Update a nutrition log (e.g. change date)         |
| `DELETE` | `/nutrition/:logId`  | Delete a nutrition log                            |

**Body for `POST /nutrition`:**
```json
{ "date": "2025-01-15" }
```

---

### Meals `🔒 Auth required` — Nested under nutrition logs

Meal routes are nested under `/:logId/meals`. One nutrition log per user per day is enforced.

| Method   | Endpoint                               | Description                        |
|----------|----------------------------------------|------------------------------------|
| `GET`    | `/nutrition/:logId/meals`              | List all meals for a nutrition log |
| `GET`    | `/nutrition/:logId/meals/:mealId`      | Get a single meal                  |
| `POST`   | `/nutrition/:logId/meals`              | Create a meal in a nutrition log   |
| `PATCH`  | `/nutrition/:logId/meals/:mealId`      | Update a meal                      |
| `DELETE` | `/nutrition/:logId/meals/:mealId`      | Delete a meal                      |

**Body for `POST` / `PATCH` meals:**
```json
{ "name": "Lunch", "calories": 650, "protein": 45, "carbs": 70, "fat": 18 }
```

---

### Examples — Dev/testing only

| Method | Endpoint             | Description                            |
|--------|----------------------|----------------------------------------|
| `GET`  | `/examples/protected`| Returns Clerk user object (auth test)  |

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL databases (dev + test)
- A [Clerk](https://clerk.com) application

### Backend

```bash
cd backend-volt
cp .env.example .env       # fill in all required variables (see below)
npm install
npx prisma migrate dev
npm run seed:exercises     # seed exercise library
npm run dev                # starts on port 8080
```

### Frontend

```bash
cd frontend-volt
cp .env.example .env       # fill in VITE_CLERK_PUBLISHABLE_KEY
npm install
npm run dev                # starts Vite dev server
```

---

## Environment Variables

### `backend-volt/.env`

| Variable           | Required              | Description                                                    |
|--------------------|-----------------------|----------------------------------------------------------------|
| `NODE_ENV`         | Yes                   | `development`, `test`, or `production`                         |
| `DEV_DATABASE_URL` | Yes (development)     | PostgreSQL connection string for local dev                     |
| `TEST_DATABASE_URL`| Yes (test)            | PostgreSQL connection string for test runs                     |
| `DATABASE_URL`     | Yes (production)      | PostgreSQL connection string for production                    |
| `CLERK_SECRET_KEY` | Yes                   | Clerk backend secret for JWT validation                        |
| `SERVER_PORT`      | No                    | Express listen port (default: `8080`)                          |
| `API_BASE`         | No                    | Base path for all routes (default: `/api/v1`)                  |
| `ALLOWED_ORIGINS`  | No (production only)  | Comma-separated CORS origins — defaults to localhost in dev    |

`db.ts` selects the database URL based on `NODE_ENV` and throws at startup if the matching variable is missing.

### `frontend-volt/.env`

| Variable                    | Required | Description                             |
|-----------------------------|----------|-----------------------------------------|
| `VITE_CLERK_PUBLISHABLE_KEY`| Yes      | Clerk publishable key for the frontend  |

---

## Data Models

| Model               | Description                                                      |
|---------------------|------------------------------------------------------------------|
| `User`              | Clerk-linked user profile with `isAdmin` flag and optional height|
| `Weight`            | Per-user weight entries (lbs + date)                             |
| `Exercise`          | Pre-seeded exercise library (string ID, muscles, instructions)   |
| `WorkoutPlan`       | Named workout template linked to a user                          |
| `WorkoutDay`        | An ordered day within a plan (e.g. Push Day)                     |
| `WorkoutDayExercise`| Exercises scheduled for a workout day (ordered)                  |
| `WorkoutLog`        | A completed workout session (optionally tied to a WorkoutDay)    |
| `ExerciseLog`       | Exercises performed within a session, with optional notes        |
| `SetLog`            | Individual sets with reps and weight (lbs)                       |
| `NutritionLog`      | Daily nutrition record — unique per user per day                 |
| `Meal`              | Individual meal with calorie and macro breakdown (protein/carbs/fat) |
