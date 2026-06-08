import type { Request, Response } from "express";
import { toUserDto } from "../mappers/user.mapper.js";
import * as userService from "../services/user.service.js";
import type { UpdateUserInput } from "../types/user.dto.js";

async function getCurrentUser(req: Request, res: Response) {
  const user = req.user!;
  res.json(toUserDto(user));
}

async function updateUser(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;

  const firstName = req.body?.firstName;
  const lastName = req.body?.lastName;
  const height = req.body?.height;

  const data: UpdateUserInput = {};

  if (firstName !== undefined) {
    if (typeof firstName !== "string" || !firstName.trim()) {
      return res
        .status(400)
        .json({ error: "First name must be a non-empty string." });
    }
    data.firstName = firstName;
  }

  if (lastName !== undefined) {
    if (typeof lastName !== "string" || !lastName.trim()) {
      return res
        .status(400)
        .json({ error: "Last name must be a non-empty string." });
    }
    data.lastName = lastName;
  }

  if (height !== undefined) {
    if (typeof height !== "number" || height < 1) {
      return res
        .status(400)
        .json({ error: "Height must be a positive number." });
    }
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

export { getCurrentUser, updateUser };
