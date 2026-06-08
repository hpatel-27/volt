export type SetLog = {
  id: string;
  setNumber: number;
  reps: number;
  weight: number;
};

export type CreateSetLogInput = {
  reps: number;
  weight: number;
};

export type CreateSetLogVariables = {
  workoutLogId: string;
  exerciseLogId: string;
  input: CreateSetLogInput;
};

export type UpdateSetLogInput = {
  reps?: number;
  weight?: number;
};

export type UpdateSetLogVariables = {
  workoutLogId: string;
  exerciseLogId: string;
  setLogId: string;
  input: UpdateSetLogInput;
};

export type DeleteSetLogVariables = {
  workoutLogId: string;
  exerciseLogId: string;
  setLogId: string;
};
