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
- **Backend:** Express 5, CommonJS modules, Nodemon
- **Database:** PostgreSQL (local, `volt` db, user `volt_admin`)
- **ORM:** Prisma 7 with `@prisma/adapter-pg` (PostgreSQL adapter pattern)

### Key Backend Files
- `server.js` — Express app entry point
- `db.js` — Prisma client initialization (uses pg adapter, reads `DATABASE_URL` from `.env`)
- `prisma/schema.prisma` — All data models
- `prisma.config.ts` — Prisma config; generated client outputs to `../generated/prisma/` (not `node_modules`)
- `controllers/`, `routes/`, `services/` — Empty directories ready for API implementation

### Database Schema
The schema covers a complete fitness tracking domain:

- **User** — email/password + Google OAuth (`googleId`), profile fields, `isAdmin` flag
- **Exercise** — Pre-seeded exercise library (string ID like `"Alternate_Incline_Dumbbell_Curl"`), includes muscles, equipment, category, instructions, images
- **WorkoutPlan** → **WorkoutDay** → **WorkoutDayExercise** — Workout templates (e.g., PPL splits)
- **WorkoutLog** → **ExerciseLog** → **SetLog** — Recorded workout sessions with per-set reps/weight
- **NutritionLog** → **Meal** — Daily nutrition tracking with macros per meal

### Important Patterns
- Backend is CommonJS (`"type": "commonjs"`); frontend is ESM (`"type": "module"`)
- Prisma generated client lives in `backend-volt/generated/prisma/` — import from there, not `@prisma/client`
- Both `prisma/schema.prisma` and `prisma.config.ts` are used (dual config setup)
- `migrations/` and `generated/` are gitignored

### Environment Variables (backend-volt/.env)
```
SERVER_PORT=8080
DATABASE_URL=postgresql://volt_admin:<password>@localhost:5432/volt?schema=public
JWT_SECRET=<secret>
```
