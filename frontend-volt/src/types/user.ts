export type User = {
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  height: number | null;
  activePlanId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type UpdateUserInput = {
  firstName?: string;
  lastName?: string;
  height?: number;
};
