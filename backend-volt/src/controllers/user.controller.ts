import type { Request, Response } from "express";
import { toUserDto } from "../mappers/user.mapper.js";

async function getCurrentUser(req: Request, res: Response) {
  const user = req.user!;
  res.json(toUserDto(user));
}

export { getCurrentUser };
