export interface CreateSetLogInput {
  exerciseLogId: string;
  reps: number;
  weight: number;
}

export interface UpdateSetLogInput {
  reps?: number;
  weight?: number;
}

export interface SetLog {
  id: string;
  setNumber: number;
  reps: number;
  weight: number;
}
