// Closed vocabularies for exercise attributes. These mirror the values in the
// seed dataset (see scripts/exercises.ts). They are small, stable sets, so we
// validate admin input strictly against them. Open-ended attributes
// (equipment, category) are length-bounded instead, not enumerated here.
//
// `as const` keeps each array a readonly tuple of string literals so callers
// can derive precise types if needed.
export const EXERCISE_FORCE = ["pull", "push", "static"] as const;
export const EXERCISE_LEVEL = ["beginner", "intermediate", "expert"] as const;
export const EXERCISE_MECHANIC = ["isolation", "compound"] as const;
