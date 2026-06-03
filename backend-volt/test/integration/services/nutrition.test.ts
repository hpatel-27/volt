// Integration tests: nutrition service against a real database.
// No mocks — prisma queries run against the test DB (TEST_DATABASE_URL).

import { expect, describe, it, beforeAll, afterAll, beforeEach } from "vitest";
import { prisma } from "../../../src/db.js";
import * as nutritionService from "../../../src/services/nutrition.service.js";
import { NotFoundError, DuplicateEntryError } from "../../../src/errors.js";

// Unique clerkId so this test user doesn't collide with real users or other suites
const TEST_CLERK_ID = "integration_test_nutrition_service_user";
let testUserId: string;

// A second user used to prove cross-user isolation (one user can't touch another's logs)
const OTHER_CLERK_ID = "integration_test_nutrition_service_other";
let otherUserId: string;

beforeAll(async () => {
  const user = await prisma.user.upsert({
    where: { clerkId: TEST_CLERK_ID },
    update: {},
    create: { clerkId: TEST_CLERK_ID },
  });
  testUserId = user.id;

  const other = await prisma.user.upsert({
    where: { clerkId: OTHER_CLERK_ID },
    update: {},
    create: { clerkId: OTHER_CLERK_ID },
  });
  otherUserId = other.id;
});

afterAll(async () => {
  // Meals cascade-delete with their nutrition log, so removing logs then users is enough
  await prisma.nutritionLog.deleteMany({ where: { userId: testUserId } });
  await prisma.nutritionLog.deleteMany({ where: { userId: otherUserId } });
  await prisma.user.delete({ where: { id: testUserId } });
  await prisma.user.delete({ where: { id: otherUserId } });
});

describe("getAllNutritionLogs", () => {
  afterAll(async () => {
    await prisma.nutritionLog.deleteMany({ where: { userId: testUserId } });
  });

  it("returns an empty page when the user has no logs", async () => {
    const result = await nutritionService.getAllNutritionLogs(testUserId, 1, 10);
    expect(result.nutritionLogs).toStrictEqual([]);
    expect(result.total).toBe(0);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
  });

  it("returns summaries with aggregated totals in descending date order", async () => {
    const earlier = await prisma.nutritionLog.create({
      data: { userId: testUserId, date: new Date("2026-01-01T00:00:00.000Z") },
    });
    const later = await prisma.nutritionLog.create({
      data: { userId: testUserId, date: new Date("2026-01-02T00:00:00.000Z") },
    });
    // Give the later log two meals so we can verify totals + mealCount aggregation
    await prisma.meal.createMany({
      data: [
        { nutritionLogId: later.id, name: "A", calories: 200, protein: 10, carbs: 20, fat: 5 },
        { nutritionLogId: later.id, name: "B", calories: 300, protein: 25, carbs: 30, fat: 10 },
      ],
    });

    const result = await nutritionService.getAllNutritionLogs(testUserId, 1, 10);

    expect(result.total).toBe(2);
    // Most-recent first
    expect(result.nutritionLogs[0]?.id).toBe(later.id);
    expect(result.nutritionLogs[0]?.date).toBe("2026-01-02");
    expect(result.nutritionLogs[0]?.mealCount).toBe(2);
    expect(result.nutritionLogs[0]?.totals).toStrictEqual({
      calories: 500,
      protein: 35,
      carbs: 50,
      fat: 15,
    });

    // The earlier log has no meals — zeroed totals and mealCount 0
    expect(result.nutritionLogs[1]?.id).toBe(earlier.id);
    expect(result.nutritionLogs[1]?.mealCount).toBe(0);
    expect(result.nutritionLogs[1]?.totals).toStrictEqual({
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    });
  });

  it("paginates — page 2 with limit 1 skips the first result", async () => {
    const result = await nutritionService.getAllNutritionLogs(testUserId, 2, 1);
    expect(result.nutritionLogs.length).toBe(1);
    expect(result.page).toBe(2);
    expect(result.limit).toBe(1);
    // With two logs, page 2 (limit 1) is the older log
    expect(result.nutritionLogs[0]?.date).toBe("2026-01-01");
  });

  it("does not include another user's logs", async () => {
    await prisma.nutritionLog.create({
      data: { userId: otherUserId, date: new Date("2026-01-05T00:00:00.000Z") },
    });

    const result = await nutritionService.getAllNutritionLogs(testUserId, 1, 10);
    expect(result.total).toBe(2); // still only this user's two logs
  });
});

describe("getNutritionLogsByRange", () => {
  beforeEach(async () => {
    await prisma.nutritionLog.deleteMany({ where: { userId: testUserId } });
  });

  it("returns only logs whose date falls within [from, to], ascending", async () => {
    await prisma.nutritionLog.createMany({
      data: [
        { userId: testUserId, date: new Date("2026-03-01T00:00:00.000Z") },
        { userId: testUserId, date: new Date("2026-03-10T00:00:00.000Z") },
        { userId: testUserId, date: new Date("2026-03-20T00:00:00.000Z") },
      ],
    });

    const result = await nutritionService.getNutritionLogsByRange(
      testUserId,
      new Date("2026-03-05T00:00:00.000Z"),
      new Date("2026-03-15T00:00:00.000Z"),
    );

    expect(result.total).toBe(1);
    expect(result.logs.map((l) => l.date)).toStrictEqual(["2026-03-10"]);
  });

  it("returns an empty result when nothing is in range", async () => {
    const result = await nutritionService.getNutritionLogsByRange(
      testUserId,
      new Date("2099-01-01T00:00:00.000Z"),
      new Date("2099-12-31T00:00:00.000Z"),
    );
    expect(result).toStrictEqual({ logs: [], total: 0 });
  });
});

describe("getNutritionLogById", () => {
  let logId: string;

  beforeAll(async () => {
    const log = await prisma.nutritionLog.create({
      data: { userId: testUserId, date: new Date("2026-02-01T00:00:00.000Z") },
    });
    await prisma.meal.create({
      data: {
        nutritionLogId: log.id,
        name: "Test Meal",
        calories: 500,
        protein: 20,
        carbs: 30,
        fat: 10,
      },
    });
    logId = log.id;
  });

  afterAll(async () => {
    await prisma.nutritionLog.deleteMany({ where: { userId: testUserId } });
  });

  it("returns the log with its meals when it belongs to the user", async () => {
    const result = await nutritionService.getNutritionLogById(testUserId, logId);
    expect(result.id).toBe(logId);
    expect(result.date).toBe("2026-02-01");
    // userId is intentionally stripped by the mapper
    expect(result).not.toHaveProperty("userId");
    expect(result.meals?.length).toBe(1);
    expect(result.meals?.[0]).toStrictEqual({
      id: result.meals![0]!.id,
      name: "Test Meal",
      calories: 500,
      protein: 20,
      carbs: 30,
      fat: 10,
    });
  });

  it("throws NotFoundError when the log belongs to a different user", async () => {
    await expect(
      nutritionService.getNutritionLogById(otherUserId, logId),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError for an unknown id", async () => {
    await expect(
      nutritionService.getNutritionLogById(testUserId, crypto.randomUUID()),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("getTodayNutritionLog", () => {
  afterAll(async () => {
    await prisma.nutritionLog.deleteMany({ where: { userId: testUserId } });
  });

  it("returns null when the user has not logged anything that day", async () => {
    const result = await nutritionService.getTodayNutritionLog(
      testUserId,
      "2099-12-31",
    );
    expect(result).toBeNull();
  });

  it("returns a summary with totals when a log exists", async () => {
    const log = await prisma.nutritionLog.create({
      data: { userId: testUserId, date: new Date("2026-05-05T00:00:00.000Z") },
    });
    await prisma.meal.createMany({
      data: [
        { nutritionLogId: log.id, name: "A", calories: 100, protein: 5, carbs: 10, fat: 2 },
        { nutritionLogId: log.id, name: "B", calories: 150, protein: 12, carbs: 8, fat: 6 },
      ],
    });

    const result = await nutritionService.getTodayNutritionLog(
      testUserId,
      "2026-05-05",
    );

    expect(result).toStrictEqual({
      id: log.id,
      date: "2026-05-05",
      totals: { calories: 250, protein: 17, carbs: 18, fat: 8 },
      mealCount: 2,
    });
  });
});

describe("getNutritionLogByDate", () => {
  beforeAll(async () => {
    const log = await prisma.nutritionLog.create({
      data: { userId: testUserId, date: new Date("2026-02-02T00:00:00.000Z") },
    });
    await prisma.meal.create({
      data: {
        nutritionLogId: log.id,
        name: "Lunch",
        calories: 600,
        protein: 40,
        carbs: 50,
        fat: 20,
      },
    });
  });

  afterAll(async () => {
    await prisma.nutritionLog.deleteMany({ where: { userId: testUserId } });
  });

  it("returns the log with meals for the given date", async () => {
    const result = await nutritionService.getNutritionLogByDate(
      testUserId,
      "2026-02-02",
    );
    expect(result.date).toBe("2026-02-02");
    expect(result.meals?.length).toBe(1);
    expect(result.meals?.[0]?.name).toBe("Lunch");
  });

  it("throws NotFoundError for a different user", async () => {
    await expect(
      nutritionService.getNutritionLogByDate(otherUserId, "2026-02-02"),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError for a date with no log", async () => {
    await expect(
      nutritionService.getNutritionLogByDate(testUserId, "2099-12-31"),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("createNutritionLog", () => {
  afterAll(async () => {
    await prisma.nutritionLog.deleteMany({ where: { userId: testUserId } });
  });

  it("creates and returns a new log as a DTO (no userId)", async () => {
    const result = await nutritionService.createNutritionLog({
      userId: testUserId,
      date: "2026-03-01T00:00:00.000Z",
    });

    expect(result.id).toBeDefined();
    expect(result.date).toBe("2026-03-01");
    expect(result).not.toHaveProperty("userId");
  });

  it("throws DuplicateEntryError when a log already exists for that date", async () => {
    await expect(
      nutritionService.createNutritionLog({
        userId: testUserId,
        date: "2026-03-01T00:00:00.000Z",
      }),
    ).rejects.toThrow(DuplicateEntryError);
  });
});

describe("findOrCreateNutritionLogByDate", () => {
  afterAll(async () => {
    await prisma.nutritionLog.deleteMany({ where: { userId: testUserId } });
  });

  it("creates the log when none exists for that date", async () => {
    const result = await nutritionService.findOrCreateNutritionLogByDate(
      testUserId,
      "2026-06-01",
    );
    expect(result.date).toBe("2026-06-01");

    const count = await prisma.nutritionLog.count({
      where: { userId: testUserId, date: new Date("2026-06-01") },
    });
    expect(count).toBe(1);
  });

  it("is idempotent — returns the existing log without creating a duplicate", async () => {
    const first = await nutritionService.findOrCreateNutritionLogByDate(
      testUserId,
      "2026-06-02",
    );
    const second = await nutritionService.findOrCreateNutritionLogByDate(
      testUserId,
      "2026-06-02",
    );

    expect(second.id).toBe(first.id);
    const count = await prisma.nutritionLog.count({
      where: { userId: testUserId, date: new Date("2026-06-02") },
    });
    expect(count).toBe(1);
  });
});

describe("updateNutritionLog", () => {
  beforeEach(async () => {
    await prisma.nutritionLog.deleteMany({ where: { userId: testUserId } });
  });

  it("throws NotFoundError when the log does not exist", async () => {
    await expect(
      nutritionService.updateNutritionLog(crypto.randomUUID(), testUserId, {
        date: "2026-04-15T00:00:00.000Z",
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError when the log belongs to a different user", async () => {
    const log = await prisma.nutritionLog.create({
      data: { userId: testUserId, date: new Date("2026-04-01T00:00:00.000Z") },
    });
    await expect(
      nutritionService.updateNutritionLog(log.id, otherUserId, {
        date: "2026-04-15T00:00:00.000Z",
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws DuplicateEntryError when moving a log onto an existing date", async () => {
    const logA = await prisma.nutritionLog.create({
      data: { userId: testUserId, date: new Date("2026-04-01T00:00:00.000Z") },
    });
    await prisma.nutritionLog.create({
      data: { userId: testUserId, date: new Date("2026-04-02T00:00:00.000Z") },
    });

    await expect(
      nutritionService.updateNutritionLog(logA.id, testUserId, {
        date: "2026-04-02T00:00:00.000Z",
      }),
    ).rejects.toThrow(DuplicateEntryError);
  });

  it("updates the log date and returns the mapped log", async () => {
    const log = await prisma.nutritionLog.create({
      data: { userId: testUserId, date: new Date("2026-04-01T00:00:00.000Z") },
    });

    const result = await nutritionService.updateNutritionLog(log.id, testUserId, {
      date: "2026-04-20T00:00:00.000Z",
    });

    expect(result.id).toBe(log.id);
    expect(result.date).toBe("2026-04-20");
    expect(result.meals).toStrictEqual([]);
  });
});

describe("deleteNutritionLog (by id)", () => {
  beforeEach(async () => {
    await prisma.nutritionLog.deleteMany({ where: { userId: testUserId } });
  });

  it("deletes an existing log and returns undefined", async () => {
    const log = await prisma.nutritionLog.create({
      data: { userId: testUserId, date: new Date("2026-07-01T00:00:00.000Z") },
    });

    const result = await nutritionService.deleteNutritionLog(log.id, testUserId);
    expect(result).toBeUndefined();

    const gone = await prisma.nutritionLog.findUnique({ where: { id: log.id } });
    expect(gone).toBeNull();
  });

  it("throws NotFoundError when the log belongs to a different user", async () => {
    const log = await prisma.nutritionLog.create({
      data: { userId: testUserId, date: new Date("2026-07-02T00:00:00.000Z") },
    });

    await expect(
      nutritionService.deleteNutritionLog(log.id, otherUserId),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("deleteNutritionLogByDate", () => {
  beforeEach(async () => {
    await prisma.nutritionLog.deleteMany({ where: { userId: testUserId } });
  });

  it("deletes an existing log by date and returns undefined", async () => {
    await prisma.nutritionLog.create({
      data: { userId: testUserId, date: new Date("2026-05-01T00:00:00.000Z") },
    });

    const result = await nutritionService.deleteNutritionLogByDate(
      testUserId,
      "2026-05-01",
    );
    expect(result).toBeUndefined();

    const gone = await prisma.nutritionLog.findUnique({
      where: {
        userId_date: { userId: testUserId, date: new Date("2026-05-01") },
      },
    });
    expect(gone).toBeNull();
  });

  it("throws NotFoundError when no log exists for that date", async () => {
    await expect(
      nutritionService.deleteNutritionLogByDate(testUserId, "2099-12-31"),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError when the log belongs to a different user", async () => {
    await prisma.nutritionLog.create({
      data: { userId: testUserId, date: new Date("2026-05-02T00:00:00.000Z") },
    });

    await expect(
      nutritionService.deleteNutritionLogByDate(otherUserId, "2026-05-02"),
    ).rejects.toThrow(NotFoundError);
  });
});
