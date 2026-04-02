import { prisma } from "../db.js";

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

export { getAllWeights };
