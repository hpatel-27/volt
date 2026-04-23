import { prisma } from "../db.js";
import { Prisma } from "../generated/prisma/client.js";
import { NotFoundError } from "../errors.js";
import type {
  CreateWeightInput,
  UpdateWeightInput,
} from "../types/weight.dto.js";

// Take a userId and return all the user's logged weights
async function getAllWeights(userId: number, page: number, limit: number) {
  // Find the weights for the user
  const [weights, total] = await prisma.$transaction([
    prisma.weight.findMany({
      where: { userId },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { date: "desc" },
    }),
    prisma.weight.count({ where: { userId } }),
  ]);
  // This could be an empty list of weights
  return { weights, total, page, limit };
}

async function createWeight(data: CreateWeightInput) {
  const newWeight = await prisma.weight.create({
    data,
  });
  return newWeight;
}

async function updateWeight(
  userId: number,
  weightId: number,
  data: UpdateWeightInput,
) {
  try {
    // Update the weight entry
    const updatedWeight = await prisma.weight.update({
      where: { id: weightId, userId: userId },
      data,
    });

    return updatedWeight;
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new NotFoundError("Weight entry not found.", { cause: error });
    }
    throw error;
  }
}

async function deleteWeight(userId: number, weightId: number) {
  try {
    // Delete the weight entry
    await prisma.weight.delete({
      where: { id: weightId, userId: userId },
    });
    return;
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new NotFoundError("Weight entry not found.", { cause: error });
    }
    throw error;
  }
}

export { getAllWeights, createWeight, updateWeight, deleteWeight };
