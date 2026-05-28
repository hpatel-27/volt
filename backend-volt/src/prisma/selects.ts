import type { Prisma } from "../generated/prisma/client.js";

// Narrowed projection used wherever the API exposes an Exercise inside a
// larger payload (e.g. nested under a workout day). Defined once so callers
// at both runtime (Prisma queries) and type-level (GetPayload) stay in sync.
//
// `as const` preserves the literal `true` values; `satisfies` checks the
// shape against Prisma's ExerciseSelect without widening it.
export const EXERCISE_REF_SELECT = {
  id: true,
  slug: true,
  name: true,
} as const satisfies Prisma.ExerciseSelect;

export type ExerciseRefSelect = typeof EXERCISE_REF_SELECT;
