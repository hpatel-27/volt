// Mock the database
// This call is hoisted so the db is mocked before the prisma import
vi.mock("../../../src/db.js");

import type { DeepMockProxy } from "vitest-mock-extended";
import type { Request, Response } from "express";
import { expect, it, describe, vi, beforeEach } from "vitest";
import { prisma } from "../../../src/db.js";
import * as nutritionController from "../../../src/controllers/nutrition.controller.js";
import { Prisma } from "../../../src/generated/prisma/client.js";

// Mock prisma proxy, otherwise a type error exists when trying to call the mockResolved...
const prismaMock = prisma as unknown as DeepMockProxy<typeof prisma>;

describe("Nutrition Controller getAllNutritionLogs", () => {
  beforeEach(() => vi.clearAllMocks());

  // Bad Request paths
  it("should return 400 - no userId", async () => {
    const mReq = {
      user: {
        id: undefined,
      },
      query: { page: "1", limit: "10" },
    } as unknown as Request;

    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await nutritionController.getAllNutritionLogs(mReq, mRes);

    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Missing required parameters",
    });
  });

  it("should return 400 - page is not a string", async () => {
    const mReq = {
      user: {
        id: 1,
      },
      query: { page: 1, limit: "10" },
    } as unknown as Request;

    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await nutritionController.getAllNutritionLogs(mReq, mRes);

    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Missing required parameters",
    });
  });

  it("should return 400 - limit is not a string", async () => {
    const mReq = {
      user: {
        id: 1,
      },
      query: { page: "1", limit: 10 },
    } as unknown as Request;

    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await nutritionController.getAllNutritionLogs(mReq, mRes);

    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Missing required parameters",
    });
  });

  it("should return 400 - parsed page is not a number", async () => {
    const mReq = {
      user: {
        id: 1,
      },
      query: { page: "abd", limit: "10" },
    } as unknown as Request;

    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await nutritionController.getAllNutritionLogs(mReq, mRes);

    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Page and limit must be positive integers",
    });
  });

  it("should return 400 - parsed limit is not a number", async () => {
    const mReq = {
      user: {
        id: 1,
      },
      query: { page: "1", limit: "abg" },
    } as unknown as Request;

    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;
    await nutritionController.getAllNutritionLogs(mReq, mRes);

    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Page and limit must be positive integers",
    });
  });

  it("should return 400 - parsed page is negative", async () => {
    const mReq = {
      user: {
        id: 1,
      },
      query: { page: "-999", limit: "10" },
    } as unknown as Request;

    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;
    await nutritionController.getAllNutritionLogs(mReq, mRes);

    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Page and limit must be positive integers",
    });
  });

  it("should return 400 - parsed page is not positive", async () => {
    const mReq = {
      user: {
        id: 1,
      },
      query: { page: "0", limit: "10" },
    } as unknown as Request;

    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;
    await nutritionController.getAllNutritionLogs(mReq, mRes);

    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Page and limit must be positive integers",
    });
  });

  it("should return 400 - parsed limit is negative", async () => {
    const mReq = {
      user: {
        id: 1,
      },
      query: { page: "1", limit: "-999" },
    } as unknown as Request;

    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;
    await nutritionController.getAllNutritionLogs(mReq, mRes);

    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Page and limit must be positive integers",
    });
  });

  it("should return 400 - parsed limit is not positive", async () => {
    const mReq = {
      user: {
        id: 1,
      },
      query: { page: "1", limit: "0" },
    } as unknown as Request;

    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;
    await nutritionController.getAllNutritionLogs(mReq, mRes);

    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Page and limit must be positive integers",
    });
  });

  it("should return 200 and return 0 nutrition logs", async () => {
    const mReq = {
      user: {
        id: 1,
      },
      query: { page: "1", limit: "10" },
    } as unknown as Request;

    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    prismaMock.$transaction.mockResolvedValueOnce([[], 0]);

    await nutritionController.getAllNutritionLogs(mReq, mRes);
    expect(mRes.json).toHaveBeenCalledWith({
      nutritionLogs: [],
      total: 0,
      page: 1,
      limit: 10,
    });
  });

  // Caught Error paths
  it("should return 500 server error", async () => {
    const mReq = {
      user: {
        id: 16,
      },
      query: { page: "1", limit: "5" },
    } as unknown as Request;

    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    prismaMock.$transaction.mockRejectedValueOnce(
      new Error("Prisma database at url: someUrl is currently unavailable."),
    );

    await nutritionController.getAllNutritionLogs(mReq, mRes);

    expect(mRes.status).toHaveBeenCalledWith(500);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Error fetching nutrition logs from database.",
    });
  });

  it("should return 500 unknown error", async () => {
    const mReq = {
      user: {
        id: 16,
      },
      query: { page: "1", limit: "5" },
    } as unknown as Request;

    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    prismaMock.$transaction.mockRejectedValueOnce("someunknownvalue");

    await nutritionController.getAllNutritionLogs(mReq, mRes);

    expect(mRes.status).toHaveBeenCalledWith(500);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Unknown error fetching nutrition logs from database.",
    });
  });

  // Valid path
  it("should return 200 and return multiple nutrition logs", async () => {
    const mReq = {
      user: {
        id: 1,
      },
      query: { page: "1", limit: "10" },
    } as unknown as Request;

    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    const firstLogId = 15;
    const secondLogId = 18;
    const firstDate = new Date("2026-04-11T14:48:00.000Z");
    const secondDate = new Date("2026-04-13T14:48:00.000Z");

    prismaMock.$transaction.mockResolvedValueOnce([
      [
        { id: firstLogId, userId: mReq.user?.id, firstDate },
        { id: secondLogId, userId: mReq.user?.id, secondDate },
      ],
      2,
    ]);

    await nutritionController.getAllNutritionLogs(mReq, mRes);
    expect(mRes.json).toHaveBeenCalledWith({
      nutritionLogs: [
        { id: firstLogId, userId: mReq.user?.id, firstDate },
        { id: secondLogId, userId: mReq.user?.id, secondDate },
      ],
      total: 2,
      page: 1,
      limit: 10,
    });
  });
});

describe("Nutrition Controller getNutritionLogById", () => {
  beforeEach(() => vi.clearAllMocks());

  it("", async () => {});
});

describe("Nutrition Controller createNutritionLog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("", async () => {});
});

describe("Nutrition Controller updateNutritionLog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("", async () => {});
});

describe("Nutrition Controller deleteNutritionLog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("", async () => {});
});
