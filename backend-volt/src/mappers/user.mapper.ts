import type { UserModel } from "../generated/prisma/models/User.js";
import type { User } from "../types/user.dto.js";

// Convert a raw Prisma User into the User DTO returned by the API.
// Deliberately omits sensitive/internal fields (clerkId, isAdmin, timestamps).
function toUserDto(user: UserModel): User {
  return {
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    height: user.height,
    activePlanId: user.activePlanId,
    createdAt: user.createdAt.toISOString().slice(0, 10),
    updatedAt: user.updatedAt
      ? user.updatedAt.toISOString().slice(0, 10)
      : null,
  } as User;
}

export { toUserDto };
