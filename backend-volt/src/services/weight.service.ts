import { prisma } from "../db.js";
import { Prisma } from "../generated/prisma/client.js";
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

async function createWeight(userId: number, weight: number, date: string) {
  const newWeight = await prisma.weight.create({
    data: {
      userId,
      amount: weight,
      date: new Date(date),
    },
  });
  return newWeight;
}

async function updateWeight(
  userId: number,
  weightId: number,
  data: { amount?: number; date?: string },
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
      throw new Error("Weight entry not found.");
    } else {
      throw new Error("Unknown error occurred while updating weight entry.");
    }
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
      throw new Error("Weight entry not found.");
    } else {
      throw new Error("Unknown error occurred while deleting weight entry.");
    }
  }
}

export { getAllWeights, createWeight, updateWeight, deleteWeight };
