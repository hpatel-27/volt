export interface CreateSetLogInput {
  exerciseLogId: number;
  setNumber: number;
  reps: number;
  weight: number;
}

export interface UpdateSetLogInput {
  setNumber?: number;
  reps?: number;
  weight?: number;
}
