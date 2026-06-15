import { prisma } from "../db.js";
import { clerkClient } from "@clerk/express";
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

// Delete the user's account from both Clerk and our DB. Clerk is deleted
// first: it's the identity source of truth, and removing it stops
// userMiddleware from re-upserting the user on a later request. Both steps
// are idempotent, so a retried request safely completes a partial deletion.
async function deleteAccount(clerkId: string) {
  try {
    await clerkClient.users.deleteUser(clerkId);
  } catch (error) {
    // Anything other than "already gone" (404) is a real failure.
    if (
      !(
        typeof error === "object" &&
        error !== null &&
        "status" in error &&
        (error as { status: number }).status === 404
      )
    ) {
      throw error;
    }
  }

  await deleteUserByClerkId(clerkId);
}

// Purge a user from the DB by Clerk ID.
// onDelete: Cascade removes the user's weights, plans, logs, and nutrition.
async function deleteUserByClerkId(clerkId: string) {
  try {
    await prisma.user.delete({ where: { clerkId } });
  } catch (error: unknown) {
    // Row already gone (e.g. a retried request) — treat as success, idempotent.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return;
    }
    throw error;
  }
}

export { getUser, updateUser, deleteAccount };
