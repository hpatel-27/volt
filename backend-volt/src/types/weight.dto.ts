export interface CreateWeightInput {
  userId: number;
  amount: number;
  date: string; // ISO 8601 format
}

export interface UpdateWeightInput {
  amount?: number;
  date?: string; // ISO 8601 format
}
