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
    │   ├── middleware/   # Auth (Clerk), user upsert
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

| Method   | Endpoint           | Description                              |
|----------|--------------------|------------------------------------------|
| `GET`    | `/weights`         | Get all weight entries (paginated)       |
| `POST`   | `/weights`         | Create a new weight entry                |
| `PATCH`  | `/weights/:id`     | Update a weight entry by ID              |
| `DELETE` | `/weights/:id`     | Delete a weight entry by ID              |

**Query params for `GET /weights`:** `page`, `limit`

**Body for `POST /weights`:**
```json
{ "amount": 185.5, "date": "2025-01-15" }
```

**Body for `PATCH /weights/:id`:**
```json
{ "amount": 183.0 }
```

---

### Exercises `🔓 Public`

| Method | Endpoint            | Description                              |
|--------|---------------------|------------------------------------------|
| `GET`  | `/exercises`        | Get all exercises (paginated)            |
| `GET`  | `/exercises/:id`    | Get a single exercise by ID              |

**Query params for `GET /exercises`:** `page`, `limit`

**Example:** `GET /api/v1/exercises/Barbell_Deadlift`

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Neon](https://neon.tech) PostgreSQL database
- A [Clerk](https://clerk.com) application

### Backend

```bash
cd backend-volt
cp .env.example .env       # fill in DATABASE_URL, CLERK_SECRET_KEY
npm install
npx prisma migrate dev
node scripts/exercises.js  # seed exercise library
npm run dev                # starts on port 8080
```

### Frontend

```bash
cd frontend-volt
npm install
npm run dev                # starts Vite dev server
```

---

## Environment Variables

**`backend-volt/.env`**

| Variable           | Description                                      |
|--------------------|--------------------------------------------------|
| `SERVER_PORT`      | Port for the Express server (default: `8080`)    |
| `DATABASE_URL`     | Neon PostgreSQL connection string                |
| `CLERK_SECRET_KEY` | Clerk secret key for JWT validation              |
| `ALLOWED_ORIGINS`  | Comma-separated allowed CORS origins (prod only) |

---

## Data Models

| Model              | Description                                         |
|--------------------|-----------------------------------------------------|
| `User`             | Clerk-linked user profile with `isAdmin` flag       |
| `Weight`           | Per-user weight entries (lbs + date)                |
| `Exercise`         | Pre-seeded exercise library (string ID)             |
| `WorkoutPlan`      | Named workout template linked to a user             |
| `WorkoutDay`       | A day within a plan (e.g. Push Day)                 |
| `WorkoutDayExercise` | Exercises scheduled for a workout day             |
| `WorkoutLog`       | A completed workout session                         |
| `ExerciseLog`      | Exercises performed within a session                |
| `SetLog`           | Individual sets with reps and weight                |
| `NutritionLog`     | Daily nutrition record                              |
| `Meal`             | Individual meal with macro breakdown                |
