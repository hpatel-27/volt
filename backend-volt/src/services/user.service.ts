import { prisma } from "../db.js";

// Get the user by their Clerk user ID, or create a new user if they don't exist
async function getUser(clerkId: string) {
  const user = await prisma.user.upsert({
    where: { clerkId },
    update: {},
    create: { clerkId },
  });
  return user;
}

export { getUser };
