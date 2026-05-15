import { prisma } from "../db.js";
import { Prisma } from "../generated/prisma/client.js";
import { NotFoundError } from "../errors.js";
import type {
  CreateWeightInput,
  UpdateWeightInput,
} from "../types/weight.dto.js";

// Return all of a user's weights whose `date` falls within [from, to].
async function getWeightsByRange(userId: string, from: Date, to: Date) {
  const weights = await prisma.weight.findMany({
    where: { userId, date: { gte: from, lte: to } },
    orderBy: { date: "asc" },
  });

  return { weights, total: weights.length };
}

// Take a userId and return all the user's logged weights
async function getAllWeights(userId: string, page: number, limit: number) {
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

async function getWeightById(userId: string, weightId: string) {
  const weight = await prisma.weight.findFirst({
    where: { id: weightId, userId },
  });

  if (!weight) {
    throw new NotFoundError(`Weight entry with id: ${weightId} not found.`);
  }
  return weight;
}

async function createWeight(data: CreateWeightInput) {
  const newWeight = await prisma.weight.create({
    data,
  });
  return newWeight;
}

async function updateWeight(
  userId: string,
  weightId: string,
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

async function deleteWeight(userId: string, weightId: string) {
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

export {
  getAllWeights,
  getWeightsByRange,
  getWeightById,
  createWeight,
  updateWeight,
  deleteWeight,
};
