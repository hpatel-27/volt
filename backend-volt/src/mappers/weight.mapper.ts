import type { WeightModel } from "../generated/prisma/models/Weight.js";
import type { Weight } from "../types/weight.dto.js";

// Convert raw Prisma Weight into the `Weight` DTO returned by the API.
// Strips `userId` and formats `date` as a date-only ISO string.
// If a timestamp is ever needed, change it here only.
function toWeightDto(weight: WeightModel): Weight {
  const id = weight.id;
  const amount = weight.amount;
  const date = weight.date.toISOString().slice(0, 10);
  return { id, amount, date };
}

export { toWeightDto };
