// Mock the database
// This call is hoisted so the db is mocked before the prisma import
vi.mock("../../../src/db.js");

import type { DeepMockProxy } from "vitest-mock-extended";
import { expect, test, describe, vi, beforeEach } from "vitest";
import { prisma } from "../../../src/db.js";
import * as nutritionService from "../../../src/services/nutrition.service.js";
import { Prisma } from "../../../src/generated/prisma/client.js";
import { DuplicateEntryError, NotFoundError } from "../../../src/errors.js";

// Mock prisma proxy, otherwise a type error exists when trying to call the mockResolved...
const prismaMock = prisma as unknown as DeepMockProxy<typeof prisma>;

describe("Nutrition Service getAllNutritionLogs", () => {
  beforeEach(() => vi.clearAllMocks());

  test("should throw server error", async () => {
    const userId = 16;
    const page = 1;
    const limit = 10;

    prismaMock.$transaction.mockRejectedValueOnce(
      new Error("Prisma database at url: someUrl is currently unavailable."),
    );
    await expect(
      nutritionService.getAllNutritionLogs(userId, page, limit),
    ).rejects.toThrow(
      new Error("Prisma database at url: someUrl is currently unavailable."),
    );
  });

  test("should throw unknown error", async () => {
    const userId = 16;
    const page = 1;
    const limit = 10;

    prismaMock.$transaction.mockRejectedValueOnce("some invalid non-error");
    await expect(
      nutritionService.getAllNutritionLogs(userId, page, limit),
    ).rejects.toThrow("some invalid non-error");
  });

  test("should return all nutrition logs for user when there are no logs", async () => {
    const userId = 16;
    const page = 1;
    const limit = 10;

    prismaMock.$transaction.mockResolvedValueOnce([[], 0]);

    const result = await nutritionService.getAllNutritionLogs(
      userId,
      page,
      limit,
    );

    expect(result.nutritionLogs.length).toBe(0);
    expect(result.nutritionLogs).toStrictEqual([]);
    expect(result.total).toBe(0);
    expect(result.page).toBe(page);
    expect(result.limit).toBe(limit);
  });

  test("should return all nutrition logs for user when there are multiple logs", async () => {
    const userId = 16;
    const page = 1;
    const limit = 10;

    const firstLogId = 15;
    const secondLogId = 18;
    const firstDate = new Date("2026-04-13T14:48:00.000Z");
    const secondDate = new Date("2026-04-14T14:48:00.000Z");

    prismaMock.$transaction.mockResolvedValueOnce([
      [
        { id: firstLogId, userId, firstDate },
        { id: secondLogId, userId, secondDate },
      ],
      2,
    ]);

    const result = await nutritionService.getAllNutritionLogs(
      userId,
      page,
      limit,
    );

    expect(result.nutritionLogs.length).toBe(2);
    expect(result.nutritionLogs).toStrictEqual([
      { id: firstLogId, userId, firstDate },
      { id: secondLogId, userId, secondDate },
    ]);
    expect(result.total).toBe(2);
    expect(result.page).toBe(page);
    expect(result.limit).toBe(limit);
  });

  test("should return logs - Skip 5 Nutrition Logs", async () => {
    const userId = 16;
    const page = 2;
    const limit = 5;

    const firstLogId = 15;
    const secondLogId = 18;
    const firstDate = new Date("2026-04-13T14:48:00.000Z");
    const secondDate = new Date("2026-04-14T14:48:00.000Z");

    prismaMock.$transaction.mockResolvedValueOnce([
      [
        { id: firstLogId, userId, firstDate },
        { id: secondLogId, userId, secondDate },
      ],
      2,
    ]);

    const result = await nutritionService.getAllNutritionLogs(
      userId,
      page,
      limit,
    );

    // Validate the log data
    expect(result.nutritionLogs.length).toBe(2);
    expect(result.nutritionLogs).toStrictEqual([
      { id: firstLogId, userId, firstDate },
      { id: secondLogId, userId, secondDate },
    ]);
    expect(result.total).toBe(2);
    expect(result.page).toBe(page);
    expect(result.limit).toBe(limit);
    // Check what the skip value resolved to with the page and limit math
    expect(prismaMock.nutritionLog.findMany).toHaveBeenCalledWith({
      where: { userId },
      skip: 5,
      take: limit,
      orderBy: { date: "desc" },
    });
  });
});

describe("Nutrition Service getNutritionLogById", () => {
  beforeEach(() => vi.clearAllMocks());

  test("should throw NotFoundError - Log not found", async () => {
    const userId = 12;
    const logId = 15;

    // findUnique resolves to null by default, triggering the NotFoundError branch
    await expect(
      nutritionService.getNutritionLogById(userId, logId),
    ).rejects.toThrow(new NotFoundError("Nutrition log not found."));
  });

  test("should throw server error", async () => {
    const userId = 12;
    const logId = 15;

    prismaMock.nutritionLog.findUnique.mockRejectedValueOnce(
      new Error("Prisma database at url: someUrl is currently unavailable."),
    );

    await expect(
      nutritionService.getNutritionLogById(userId, logId),
    ).rejects.toThrow(
      new Error("Prisma database at url: someUrl is currently unavailable."),
    );
  });

  test("should throw unknown error", async () => {
    const userId = 12;
    const logId = 15;

    prismaMock.nutritionLog.findUnique.mockRejectedValueOnce(12);

    await expect(
      nutritionService.getNutritionLogById(userId, logId),
    ).rejects.toThrow(12);
  });

  test("should return nutrition log", async () => {
    const userId = 12;
    const logId = 15;
    const date = new Date("2026-04-13T14:48:00.000Z");
    const log = { id: logId, userId, date };

    prismaMock.nutritionLog.findUnique.mockResolvedValueOnce(log);

    const result = await nutritionService.getNutritionLogById(userId, logId);
    expect(result).toStrictEqual(log);
  });
});

describe("Nutrition Service createNutritionLog", () => {
  beforeEach(() => vi.clearAllMocks());

  test("should throw DuplicateEntryError - Duplicate date (P2002)", async () => {
    const logData = {
      userId: 12,
      date: new Date("2026-04-13T14:48:00.000Z"),
    };

    const error = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed.",
      { code: "P2002", clientVersion: "7.4.2" },
    );

    prismaMock.nutritionLog.create.mockRejectedValueOnce(error);

    await expect(nutritionService.createNutritionLog(logData)).rejects.toThrow(
      new DuplicateEntryError("A nutrition log at this date already exists."),
    );
  });

  test("should throw error", async () => {
    const logData = {
      userId: 12,
      date: new Date("2026-04-13T14:48:00.000Z"),
    };

    prismaMock.nutritionLog.create.mockRejectedValueOnce(
      new Error("Prisma database at url: someUrl is currently unavailable."),
    );

    await expect(nutritionService.createNutritionLog(logData)).rejects.toThrow(
      new Error("Prisma database at url: someUrl is currently unavailable."),
    );
  });

  test("should throw unknown error", async () => {
    const logData = {
      userId: 12,
      date: new Date("2026-04-13T14:48:00.000Z"),
    };

    prismaMock.nutritionLog.create.mockRejectedValueOnce("undefined");
    await expect(nutritionService.createNutritionLog(logData)).rejects.toThrow(
      "undefined",
    );
  });

  test("should create nutrition log", async () => {
    const userId = 12;
    const logId = 15;
    const date = new Date("2026-04-13T14:48:00.000Z");
    const logData = { userId, date };
    const createdLog = { id: logId, userId, date };

    prismaMock.nutritionLog.create.mockResolvedValueOnce(createdLog);

    const result = await nutritionService.createNutritionLog(logData);
    expect(result).toStrictEqual(createdLog);
  });
});

describe("Nutrition Service updateNutritionLog", () => {
  // Note: unlike the meal service, updateNutritionLog does NOT do a separate
  // findUnique check first — it goes straight to prisma.nutritionLog.update.
  // The P2025 error from Prisma is what signals "log not found".
  beforeEach(() => vi.clearAllMocks());

  test("should throw NotFoundError - Log not found (P2025)", async () => {
    const logId = 15;
    const userId = 12;
    const logData = { date: new Date("2026-04-14T14:48:00.000Z") };

    const error = new Prisma.PrismaClientKnownRequestError(
      "Record to update not found.",
      { code: "P2025", clientVersion: "7.4.2" },
    );

    prismaMock.nutritionLog.update.mockRejectedValueOnce(error);

    await expect(
      nutritionService.updateNutritionLog(logId, userId, logData),
    ).rejects.toThrow(new NotFoundError("Nutrition log not found."));
  });

  test("should throw DuplicateEntryError - Duplicate date (P2002)", async () => {
    const logId = 15;
    const userId = 12;
    const logData = { date: new Date("2026-04-14T14:48:00.000Z") };

    const error = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed.",
      { code: "P2002", clientVersion: "7.4.2" },
    );

    prismaMock.nutritionLog.update.mockRejectedValueOnce(error);

    await expect(
      nutritionService.updateNutritionLog(logId, userId, logData),
    ).rejects.toThrow(
      new DuplicateEntryError("Nutrition log with this date already exists."),
    );
  });

  test("should throw error", async () => {
    const logId = 15;
    const userId = 12;
    const logData = { date: new Date("2026-04-14T14:48:00.000Z") };

    prismaMock.nutritionLog.update.mockRejectedValueOnce(
      new Error("Prisma database at url: someUrl is currently unavailable."),
    );

    await expect(
      nutritionService.updateNutritionLog(logId, userId, logData),
    ).rejects.toThrow(
      new Error("Prisma database at url: someUrl is currently unavailable."),
    );
  });

  test("should throw unknown error", async () => {
    const logId = 15;
    const userId = 12;
    const logData = { date: new Date("2026-04-14T14:48:00.000Z") };

    prismaMock.nutritionLog.update.mockRejectedValueOnce(false);

    await expect(
      nutritionService.updateNutritionLog(logId, userId, logData),
    ).rejects.toThrow(false);
  });

  test("should update nutrition log", async () => {
    const logId = 15;
    const userId = 12;
    const newDate = new Date("2026-04-14T14:48:00.000Z");
    const logData = { date: newDate };
    const updatedLog = { id: logId, userId, date: newDate };

    prismaMock.nutritionLog.update.mockResolvedValueOnce(updatedLog);

    const result = await nutritionService.updateNutritionLog(
      logId,
      userId,
      logData,
    );
    expect(result).toStrictEqual(updatedLog);
  });
});

describe("Nutrition Service deleteNutritionLog", () => {
  // Like updateNutritionLog, deleteNutritionLog goes straight to prisma.nutritionLog.delete —
  // P2025 is the only "not found" signal, there is no prior findUnique check.
  beforeEach(() => vi.clearAllMocks());

  test("should throw NotFoundError (P2025)", async () => {
    const logId = 15;
    const userId = 12;

    const error = new Prisma.PrismaClientKnownRequestError(
      "Record to delete not found.",
      { code: "P2025", clientVersion: "7.4.2" },
    );

    prismaMock.nutritionLog.delete.mockRejectedValueOnce(error);

    await expect(
      nutritionService.deleteNutritionLog(logId, userId),
    ).rejects.toThrow(new NotFoundError("Nutrition log not found."));
  });

  test("should throw error", async () => {
    const logId = 15;
    const userId = 12;

    prismaMock.nutritionLog.delete.mockRejectedValueOnce(
      new Error("Prisma database at url: someUrl is currently unavailable."),
    );

    await expect(
      nutritionService.deleteNutritionLog(logId, userId),
    ).rejects.toThrow(
      new Error("Prisma database at url: someUrl is currently unavailable."),
    );
  });

  test("should throw unknown error", async () => {
    const logId = 15;
    const userId = 12;

    prismaMock.nutritionLog.delete.mockRejectedValueOnce("undefined");

    await expect(
      nutritionService.deleteNutritionLog(logId, userId),
    ).rejects.toThrow("undefined");
  });

  test("should delete nutrition log", async () => {
    const logId = 15;
    const userId = 12;

    prismaMock.nutritionLog.delete.mockResolvedValueOnce({
      id: logId,
      userId,
      date: new Date("2026-04-13T14:48:00.000Z"),
    });

    const result = await nutritionService.deleteNutritionLog(logId, userId);
    expect(result).toBeUndefined();
  });
});
