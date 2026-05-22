export interface CreateWeightInput {
  userId: string;
  amount: number;
  date: string; // ISO 8601 format
}

export interface UpdateWeightInput {
  amount?: number;
  date?: string; // ISO 8601 format
}

export interface Weight {
  id: string;
  amount: number;
  date: string; // ISO 8601 date only (YYYY-MM-DD), no timestamp
}
