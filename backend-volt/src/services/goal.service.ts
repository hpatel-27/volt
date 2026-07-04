import { prisma } from "../db.js";
import { DuplicateEntryError, NotFoundError } from "../errors.js";
import { Prisma } from "../generated/prisma/client.js";
import { toGoalDto } from "../mappers/goal.mapper.js";
import type { CreateGoalInput, UpdateGoalInput } from "../types/goal.dto.js";

async function getGoal(userId: string) {
  const rawGoals = await prisma.goal.findUnique({ where: { userId } });
  if (!rawGoals) {
    throw new NotFoundError(`Goals not available for user: ${rawGoals}`);
  }
  return toGoalDto(rawGoals);
}

async function createGoal(data: CreateGoalInput) {
  try {
    const createdGoals = await prisma.goal.create({ data });
    return toGoalDto(createdGoals);
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new DuplicateEntryError(
        "Goals already exist for this user. Update the existing goals for your desired changes.",
      );
    }
    throw error;
  }
}

async function updateGoal(userId: string, data: UpdateGoalInput) {
  try {
    const updatingGoal = await prisma.goal.update({
      where: { userId },
      data,
    });
    return toGoalDto(updatingGoal);
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new NotFoundError("Goals not set for this user.", { cause: error });
    }
    throw error;
  }
}

export { getGoal, createGoal, updateGoal };
