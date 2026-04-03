import { prisma } from "../db.js";
import { Prisma } from "../generated/prisma/client.js";
import { NotFoundError } from "../errors.js";

// Take a userId and return all the user's logged weights
async function getAllWeights(userId: number, page: number, limit: number) {
  try {
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
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error("Error fetching weights from database.");
    } else {
      throw new Error("Unknown error fetching weights from database");
    }
  }
}

async function createWeight(weightData: Prisma.WeightUncheckedCreateInput) {
  try {
    const newWeight = await prisma.weight.create({
      data: weightData,
    });
    return newWeight;
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error("Error creating weight entry in database.");
    } else {
      throw new Error("Unknown error creating weight entry in database");
    }
  }
}

async function updateWeight(
  userId: number,
  weightId: number,
  data: Prisma.WeightUpdateInput,
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
      throw new NotFoundError("Weight entry not found.");
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
      throw new NotFoundError("Weight entry not found.");
    } else {
      throw new Error("Unknown error occurred while deleting weight entry.");
    }
  }
}

export { getAllWeights, createWeight, updateWeight, deleteWeight };
