export type Exercise = {
  id: string;
  slug: string;
  name: string;
  force?: string;
  level?: string;
  mechanic?: string;
  equipment?: string;
  category?: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  images: string[];
  createdAt: string;
};

export type ExercisePage = {
  exercises: Exercise[];
  total: number;
  page: number;
  limit: number;
};

export type ExerciseListParams = {
  page: number;
  limit: number;
  q?: string;
};

// Narrowed projection of Exercise since these are the only reference fields needed
// Mirrors the backend's EXERCISE_REF_SELECT shape.
export type ExerciseRef = Pick<Exercise, "id" | "slug" | "name">;
