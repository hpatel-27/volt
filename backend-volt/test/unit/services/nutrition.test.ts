// Unit tests: nutrition service with a mocked database.
// This call is hoisted so the db is mocked before the prisma import.
vi.mock("../../../src/db.js");

import type { DeepMockProxy } from "vitest-mock-extended";
import { expect, test, describe, vi, beforeEach } from "vitest";
import { prisma } from "../../../src/db.js";
import * as nutritionService from "../../../src/services/nutrition.service.js";
import { Prisma } from "../../../src/generated/prisma/client.js";
import { DuplicateEntryError, NotFoundError } from "../../../src/errors.js";

// Cast to the deep mock proxy so the mockResolved*/mockRejected* helpers type-check.
const prismaMock = prisma as unknown as DeepMockProxy<typeof prisma>;

// Build a P-coded Prisma error so we can drive the service's catch branches.
function prismaError(code: string) {
  return new Prisma.PrismaClientKnownRequestError(`Prisma error ${code}`, {
    code,
    clientVersion: "7.4.2",
  });
}

describe("Nutrition Service getAllNutritionLogs", () => {
  // getAllNutritionLogs wraps its queries in a CALLBACK-style transaction
  // (prisma.$transaction(async (tx) => ...)). The default mock implementation
  // simply runs the callback against the same prisma mock so each inner query
  // (findMany / count / meal.groupBy) can be stubbed individually.
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation((cb: any) => cb(prismaMock));
  });

  test("propagates a server error thrown inside the transaction", async () => {
    const dbError = new Error("Prisma database is currently unavailable.");
    prismaMock.$transaction.mockRejectedValueOnce(dbError);

    await expect(
      nutritionService.getAllNutritionLogs("user-1", 1, 10),
    ).rejects.toThrow(dbError);
  });

  test("propagates a non-Error thrown value", async () => {
    prismaMock.$transaction.mockRejectedValueOnce("some invalid non-error");

    await expect(
      nutritionService.getAllNutritionLogs("user-1", 1, 10),
    ).rejects.toBe("some invalid non-error");
  });

  test("returns an empty page when the user has no logs", async () => {
    prismaMock.nutritionLog.findMany.mockResolvedValueOnce([]);
    prismaMock.nutritionLog.count.mockResolvedValueOnce(0);
    // groupBy has heavily-overloaded typings, so cast to reach the mock helpers
    (prismaMock.meal.groupBy as any).mockResolvedValueOnce([]);

    const result = await nutritionService.getAllNutritionLogs("user-1", 1, 10);

    expect(result).toStrictEqual({
      nutritionLogs: [],
      total: 0,
      page: 1,
      limit: 10,
    });
  });

  test("maps logs to summaries with aggregated meal totals", async () => {
    const userId = "user-16";
    const logA = { id: "log-a", userId, date: new Date("2026-04-14T00:00:00.000Z") };
    const logB = { id: "log-b", userId, date: new Date("2026-04-13T00:00:00.000Z") };

    prismaMock.nutritionLog.findMany.mockResolvedValueOnce([logA, logB] as any);
    prismaMock.nutritionLog.count.mockResolvedValueOnce(2);
    // logA has two meals totalling these macros; logB has none.
    (prismaMock.meal.groupBy as any).mockResolvedValueOnce([
      {
        nutritionLogId: "log-a",
        _sum: { calories: 700, protein: 50, carbs: 60, fat: 20 },
        _count: 2,
      },
    ]);

    const result = await nutritionService.getAllNutritionLogs(userId, 1, 10);

    expect(result.total).toBe(2);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
    expect(result.nutritionLogs).toStrictEqual([
      {
        id: "log-a",
        date: "2026-04-14",
        totals: { calories: 700, protein: 50, carbs: 60, fat: 20 },
        mealCount: 2,
      },
      {
        // logB has no meal group, so totals fall back to zero and mealCount to 0
        id: "log-b",
        date: "2026-04-13",
        totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
        mealCount: 0,
      },
    ]);
  });

  test("passes the correct skip/take to findMany for the requested page", async () => {
    prismaMock.nutritionLog.findMany.mockResolvedValueOnce([]);
    prismaMock.nutritionLog.count.mockResolvedValueOnce(0);
    (prismaMock.meal.groupBy as any).mockResolvedValueOnce([]);

    await nutritionService.getAllNutritionLogs("user-16", 2, 5);

    // page 2, limit 5 => skip (2-1)*5 = 5
    expect(prismaMock.nutritionLog.findMany).toHaveBeenCalledWith({
      where: { userId: "user-16" },
      skip: 5,
      take: 5,
      orderBy: { date: "desc" },
    });
  });
});

describe("Nutrition Service getNutritionLogsByRange", () => {
  beforeEach(() => vi.clearAllMocks());

  test("returns mapped logs and their count for the window", async () => {
    const from = new Date("2026-04-01T00:00:00.000Z");
    const to = new Date("2026-04-30T00:00:00.000Z");
    prismaMock.nutritionLog.findMany.mockResolvedValueOnce([
      { id: "log-1", userId: "user-1", date: new Date("2026-04-10T00:00:00.000Z") },
      { id: "log-2", userId: "user-1", date: new Date("2026-04-20T00:00:00.000Z") },
    ] as any);

    const result = await nutritionService.getNutritionLogsByRange(
      "user-1",
      from,
      to,
    );

    expect(result.total).toBe(2);
    expect(result.logs).toStrictEqual([
      { id: "log-1", date: "2026-04-10" },
      { id: "log-2", date: "2026-04-20" },
    ]);
    expect(prismaMock.nutritionLog.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1", date: { gte: from, lte: to } },
      orderBy: { date: "asc" },
    });
  });

  test("returns an empty result when nothing falls in range", async () => {
    prismaMock.nutritionLog.findMany.mockResolvedValueOnce([]);

    const result = await nutritionService.getNutritionLogsByRange(
      "user-1",
      new Date("2026-01-01"),
      new Date("2026-01-02"),
    );

    expect(result).toStrictEqual({ logs: [], total: 0 });
  });
});

describe("Nutrition Service getNutritionLogById", () => {
  beforeEach(() => vi.clearAllMocks());

  test("throws NotFoundError when the log does not exist", async () => {
    // findUnique resolves to null by default, triggering the NotFoundError branch
    await expect(
      nutritionService.getNutritionLogById("user-1", "log-1"),
    ).rejects.toThrow(new NotFoundError("Nutrition log not found."));
  });

  test("propagates an unexpected error", async () => {
    const dbError = new Error("Prisma database is currently unavailable.");
    prismaMock.nutritionLog.findUnique.mockRejectedValueOnce(dbError);

    await expect(
      nutritionService.getNutritionLogById("user-1", "log-1"),
    ).rejects.toThrow(dbError);
  });

  test("returns the log with its meals mapped (no userId leaked)", async () => {
    prismaMock.nutritionLog.findUnique.mockResolvedValueOnce({
      id: "log-1",
      userId: "user-1",
      date: new Date("2026-04-13T00:00:00.000Z"),
      meals: [
        {
          id: "meal-1",
          nutritionLogId: "log-1",
          name: "Oats",
          calories: 300,
          protein: 10,
          carbs: 54,
          fat: 5,
        },
      ],
    } as any);

    const result = await nutritionService.getNutritionLogById("user-1", "log-1");

    expect(result).toStrictEqual({
      id: "log-1",
      date: "2026-04-13",
      meals: [
        {
          id: "meal-1",
          name: "Oats",
          calories: 300,
          protein: 10,
          carbs: 54,
          fat: 5,
        },
      ],
    });
  });
});

describe("Nutrition Service getTodayNutritionLog", () => {
  beforeEach(() => vi.clearAllMocks());

  test("returns null when no log exists for the given day", async () => {
    // findUnique resolves to null by default
    const result = await nutritionService.getTodayNutritionLog(
      "user-1",
      "2026-04-13",
    );
    expect(result).toBeNull();
  });

  test("returns a summary with totals derived from the log's meals", async () => {
    prismaMock.nutritionLog.findUnique.mockResolvedValueOnce({
      id: "log-1",
      userId: "user-1",
      date: new Date("2026-04-13T00:00:00.000Z"),
      meals: [
        { id: "m1", nutritionLogId: "log-1", name: "A", calories: 200, protein: 10, carbs: 20, fat: 5 },
        { id: "m2", nutritionLogId: "log-1", name: "B", calories: 300, protein: 25, carbs: 30, fat: 10 },
      ],
    } as any);

    const result = await nutritionService.getTodayNutritionLog(
      "user-1",
      "2026-04-13",
    );

    expect(result).toStrictEqual({
      id: "log-1",
      date: "2026-04-13",
      totals: { calories: 500, protein: 35, carbs: 50, fat: 15 },
      mealCount: 2,
    });
    // Looks up by the (userId, date) composite key
    expect(prismaMock.nutritionLog.findUnique).toHaveBeenCalledWith({
      where: { userId_date: { userId: "user-1", date: new Date("2026-04-13") } },
      include: { meals: true },
    });
  });
});

describe("Nutrition Service getNutritionLogByDate", () => {
  beforeEach(() => vi.clearAllMocks());

  test("throws NotFoundError when no log exists for the date", async () => {
    await expect(
      nutritionService.getNutritionLogByDate("user-1", "2026-04-13"),
    ).rejects.toThrow(new NotFoundError("Nutrition log not found."));
  });

  test("propagates an unexpected error", async () => {
    const dbError = new Error("Prisma database is currently unavailable.");
    prismaMock.nutritionLog.findUnique.mockRejectedValueOnce(dbError);

    await expect(
      nutritionService.getNutritionLogByDate("user-1", "2026-04-13"),
    ).rejects.toThrow(dbError);
  });

  test("returns the mapped log and queries by composite key", async () => {
    const date = "2026-04-13";
    prismaMock.nutritionLog.findUnique.mockResolvedValueOnce({
      id: "log-1",
      userId: "user-1",
      date: new Date("2026-04-13T00:00:00.000Z"),
      meals: [],
    } as any);

    const result = await nutritionService.getNutritionLogByDate("user-1", date);

    expect(result).toStrictEqual({ id: "log-1", date: "2026-04-13", meals: [] });
    expect(prismaMock.nutritionLog.findUnique).toHaveBeenCalledWith({
      where: { userId_date: { userId: "user-1", date: new Date(date) } },
      include: { meals: true },
    });
  });
});

describe("Nutrition Service createNutritionLog", () => {
  beforeEach(() => vi.clearAllMocks());

  test("throws DuplicateEntryError on a unique-constraint violation (P2002)", async () => {
    prismaMock.nutritionLog.create.mockRejectedValueOnce(prismaError("P2002"));

    await expect(
      nutritionService.createNutritionLog({
        userId: "user-1",
        date: "2026-04-13",
      }),
    ).rejects.toThrow(
      new DuplicateEntryError("A nutrition log at this date already exists."),
    );
  });

  test("propagates an unexpected error", async () => {
    const dbError = new Error("Prisma database is currently unavailable.");
    prismaMock.nutritionLog.create.mockRejectedValueOnce(dbError);

    await expect(
      nutritionService.createNutritionLog({ userId: "user-1", date: "2026-04-13" }),
    ).rejects.toThrow(dbError);
  });

  test("returns the created log mapped to a DTO", async () => {
    prismaMock.nutritionLog.create.mockResolvedValueOnce({
      id: "log-1",
      userId: "user-1",
      date: new Date("2026-04-13T00:00:00.000Z"),
    } as any);

    const result = await nutritionService.createNutritionLog({
      userId: "user-1",
      date: "2026-04-13",
    });

    expect(result).toStrictEqual({ id: "log-1", date: "2026-04-13" });
  });
});

describe("Nutrition Service findOrCreateNutritionLogByDate", () => {
  beforeEach(() => vi.clearAllMocks());

  test("upserts by composite key and returns the mapped log", async () => {
    prismaMock.nutritionLog.upsert.mockResolvedValueOnce({
      id: "log-1",
      userId: "user-1",
      date: new Date("2026-04-13T00:00:00.000Z"),
    } as any);

    const result = await nutritionService.findOrCreateNutritionLogByDate(
      "user-1",
      "2026-04-13",
    );

    expect(result).toStrictEqual({ id: "log-1", date: "2026-04-13" });
    expect(prismaMock.nutritionLog.upsert).toHaveBeenCalledWith({
      where: { userId_date: { userId: "user-1", date: new Date("2026-04-13") } },
      create: { userId: "user-1", date: new Date("2026-04-13") },
      update: {},
    });
  });
});

describe("Nutrition Service updateNutritionLog", () => {
  // updateNutritionLog goes straight to prisma.nutritionLog.update — the P2025
  // error from Prisma is what signals "log not found"; P2002 signals a duplicate.
  beforeEach(() => vi.clearAllMocks());

  test("throws NotFoundError when the log to update is missing (P2025)", async () => {
    prismaMock.nutritionLog.update.mockRejectedValueOnce(prismaError("P2025"));

    await expect(
      nutritionService.updateNutritionLog("log-1", "user-1", {
        date: "2026-04-14",
      }),
    ).rejects.toThrow(new NotFoundError("Nutrition log not found."));
  });

  test("throws DuplicateEntryError when the new date collides (P2002)", async () => {
    prismaMock.nutritionLog.update.mockRejectedValueOnce(prismaError("P2002"));

    await expect(
      nutritionService.updateNutritionLog("log-1", "user-1", {
        date: "2026-04-14",
      }),
    ).rejects.toThrow(
      new DuplicateEntryError("Nutrition log with this date already exists."),
    );
  });

  test("propagates an unexpected error", async () => {
    const dbError = new Error("Prisma database is currently unavailable.");
    prismaMock.nutritionLog.update.mockRejectedValueOnce(dbError);

    await expect(
      nutritionService.updateNutritionLog("log-1", "user-1", { date: "2026-04-14" }),
    ).rejects.toThrow(dbError);
  });

  test("returns the updated log mapped with its meals", async () => {
    prismaMock.nutritionLog.update.mockResolvedValueOnce({
      id: "log-1",
      userId: "user-1",
      date: new Date("2026-04-14T00:00:00.000Z"),
      meals: [],
    } as any);

    const result = await nutritionService.updateNutritionLog("log-1", "user-1", {
      date: "2026-04-14",
    });

    expect(result).toStrictEqual({ id: "log-1", date: "2026-04-14", meals: [] });
  });
});

describe("Nutrition Service deleteNutritionLog", () => {
  // deleteNutritionLog goes straight to prisma.nutritionLog.delete — P2025 is the
  // only "not found" signal, there is no prior findUnique check.
  beforeEach(() => vi.clearAllMocks());

  test("throws NotFoundError when the log does not exist (P2025)", async () => {
    prismaMock.nutritionLog.delete.mockRejectedValueOnce(prismaError("P2025"));

    await expect(
      nutritionService.deleteNutritionLog("log-1", "user-1"),
    ).rejects.toThrow(new NotFoundError("Nutrition log not found."));
  });

  test("propagates an unexpected error", async () => {
    const dbError = new Error("Prisma database is currently unavailable.");
    prismaMock.nutritionLog.delete.mockRejectedValueOnce(dbError);

    await expect(
      nutritionService.deleteNutritionLog("log-1", "user-1"),
    ).rejects.toThrow(dbError);
  });

  test("resolves to undefined on success", async () => {
    prismaMock.nutritionLog.delete.mockResolvedValueOnce({
      id: "log-1",
      userId: "user-1",
      date: new Date("2026-04-13T00:00:00.000Z"),
    } as any);

    const result = await nutritionService.deleteNutritionLog("log-1", "user-1");
    expect(result).toBeUndefined();
  });
});

describe("Nutrition Service deleteNutritionLogByDate", () => {
  beforeEach(() => vi.clearAllMocks());

  test("throws NotFoundError when the log does not exist (P2025)", async () => {
    prismaMock.nutritionLog.delete.mockRejectedValueOnce(prismaError("P2025"));

    await expect(
      nutritionService.deleteNutritionLogByDate("user-1", "2026-04-15"),
    ).rejects.toThrow(new NotFoundError("Nutrition log not found."));
  });

  test("deletes by composite key and resolves to undefined", async () => {
    prismaMock.nutritionLog.delete.mockResolvedValueOnce({
      id: "log-1",
      userId: "user-1",
      date: new Date("2026-04-15T00:00:00.000Z"),
    } as any);

    const result = await nutritionService.deleteNutritionLogByDate(
      "user-1",
      "2026-04-15",
    );

    expect(result).toBeUndefined();
    expect(prismaMock.nutritionLog.delete).toHaveBeenCalledWith({
      where: { userId_date: { userId: "user-1", date: new Date("2026-04-15") } },
    });
  });
});
