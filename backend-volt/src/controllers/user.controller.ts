import type { Request, Response } from "express";
import { toUserDto } from "../mappers/user.mapper.js";
import * as userService from "../services/user.service.js";
import type { UpdateUserInput } from "../types/user.dto.js";
import {
  validateBoundedString,
  validatePositiveNumber,
} from "../helpers/validators.js";
import { LIMITS } from "../helpers/limits.js";

async function getCurrentUser(req: Request, res: Response) {
  const user = req.user!;
  res.json(toUserDto(user));
}

async function updateUser(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;

  const { firstName, lastName, height } = req.body ?? {};

  const data: UpdateUserInput = {};

  if (firstName !== undefined) {
    const trimmedFirstName = validateBoundedString(
      "firstName",
      firstName,
      LIMITS.PERSON_NAME_MAX,
    );
    data.firstName = trimmedFirstName;
  }

  if (lastName !== undefined) {
    const trimmedLastName = validateBoundedString(
      "lastName",
      lastName,
      LIMITS.PERSON_NAME_MAX,
    );
    data.lastName = trimmedLastName;
  }

  if (height !== undefined) {
    validatePositiveNumber("height", height, LIMITS.HEIGHT_MAX);
    data.height = height;
  }

  if (Object.keys(data).length === 0) {
    return res
      .status(400)
      .json({ error: "No valid fields were provided to update." });
  }

  const updatedUser = await userService.updateUser(userId, data);
  res.json(updatedUser);
}

async function deleteAccount(req: Request, res: Response) {
  const { clerkId } = req.user!;
  await userService.deleteAccount(clerkId);
  // 204: account removed from Clerk and our DB; no content to return.
  res.status(204).send();
}

export { getCurrentUser, updateUser, deleteAccount };
