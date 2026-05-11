export type Weight = {
  id: number;
  userId: number;
  date: string;
  amount: number;
};

export type WeightsPage = {
  weights: Weight[];
  total: number;
  page: number;
  limit: number;
};

export type WeightsRange = {
  weights: Weight[];
  total: number;
};

export type CreateWeightInput = {
  amount: number;
  date?: string;
};

export type UpdateWeightInput = {
  amount?: number;
  date?: string;
};

export type UpdateWeightVariables = { id: number; input: UpdateWeightInput };
export type DeleteWeightVariables = { id: number };
