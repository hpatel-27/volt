export type Weight = {
  id: string;
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

export type UpdateWeightVariables = { id: string; input: UpdateWeightInput };
export type DeleteWeightVariables = { id: string };

export type WeightFilter = "7D" | "30D" | "90D" | "All";
