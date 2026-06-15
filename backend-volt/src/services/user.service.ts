import { prisma } from "../db.js";
import { NotFoundError } from "../errors.js";
import { Prisma } from "../generated/prisma/client.js";
import { toUserDto } from "../mappers/user.mapper.js";
import type { UpdateUserInput } from "../types/user.dto.js";

// Get the user by their Clerk user ID, or create a new user if they don't exist
async function getUser(
  clerkId: string,
  emailAddress: string | null,
  firstName: string | null,
  lastName: string | null,
) {
  const user = await prisma.user.upsert({
    where: { clerkId },
    update: {},
    create: { clerkId, email: emailAddress, firstName, lastName },
  });
  // Don't wrap with DTO since we use this for the userMiddleware upsert
  // This doesn't get sent to the frontend
  return user;
}

// update the user's updatable fields (firstName, lastName, height)
async function updateUser(userId: string, data: UpdateUserInput) {
  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data,
    });
    return toUserDto(updatedUser);
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

// Delete the user's account. In the hybrid model this triggers Clerk-side
// deletion only; the resulting `user.deleted` webhook owns DB cleanup.
async function deleteAccount(clerkId: string) {
  // TODO later
}

export { getUser, updateUser, deleteAccount };
