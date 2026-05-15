export interface CreateSetLogInput {
  exerciseLogId: string;
  setNumber: number;
  reps: number;
  weight: number;
}

export interface UpdateSetLogInput {
  setNumber?: number;
  reps?: number;
  weight?: number;
}
