import type { SetLogModel } from "../generated/prisma/models.js";
import type { SetLog } from "../types/setLog.dto.js";

function toSetLogDto(set: SetLogModel): SetLog {
  return {
    id: set.id,
    setNumber: set.setNumber,
    reps: set.reps,
    weight: set.weight,
  };
}

export { toSetLogDto };
