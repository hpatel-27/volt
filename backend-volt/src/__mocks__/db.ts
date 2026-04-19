import { PrismaClient } from "../generated/prisma/client.js";
import { mockDeep } from "vitest-mock-extended";

export const prisma = mockDeep<PrismaClient>();
