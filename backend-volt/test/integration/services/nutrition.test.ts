// Integration tests: nutrition service against a real database
// No mocks — prisma queries run against the test DB

import { expect, describe, it, beforeAll, afterAll, beforeEach } from "vitest";
import { prisma } from "../../../src/db.js";
import * as nutritionService from "../../../src/services/nutrition.service.js";
import { NotFoundError, DuplicateEntryError } from "../../../src/errors.js";

// Unique clerkId so this test user doesn't collide with real users
const TEST_CLERK_ID = "integration_test_nutrition_service_user";
let testUserId: number;

beforeAll(async () => {
  // Upsert a test user — same pattern as userMiddleware
  const user = await prisma.user.upsert({
    where: { clerkId: TEST_CLERK_ID },
    update: {},
    create: { clerkId: TEST_CLERK_ID },
  });
  testUserId = user.id;
});

afterAll(async () => {
  // Meals cascade-delete when the nutrition log is deleted,
  // so we only need to remove logs then the user
  await prisma.nutritionLog.deleteMany({ where: { userId: testUserId } });
  await prisma.user.delete({ where: { id: testUserId } });
});

// getAllNutritionLogs

describe("getAllNutritionLogs", () => {
  afterAll(async () => {
    await prisma.nutritionLog.deleteMany({ where: { userId: testUserId } });
  });

  it("returns an empty list when the user has no logs", async () => {
    const result = await nutritionService.getAllNutritionLogs(
      testUserId,
      1,
      10,
    );
    expect(result.nutritionLogs).toStrictEqual([]);
    expect(result.total).toBe(0);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
  });

  it("returns logs for the user in descending date order", async () => {
    const dateA = new Date("2026-01-01T00:00:00.000Z");
    const dateB = new Date("2026-01-02T00:00:00.000Z");

    await prisma.nutritionLog.create({
      data: { userId: testUserId, date: dateA },
    });
    await prisma.nutritionLog.create({
      data: { userId: testUserId, date: dateB },
    });

    const result = await nutritionService.getAllNutritionLogs(
      testUserId,
      1,
      10,
    );

    expect(result.total).toBe(2);
    // Most-recent first
    const first = result.nutritionLogs[0];
    const second = result.nutritionLogs[1];
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(new Date(first!.date).toISOString()).toBe(dateB.toISOString());
    expect(new Date(second!.date).toISOString()).toBe(dateA.toISOString());
  });

  it("paginates correctly — page 2 with limit 1 skips the first result", async () => {
    const result = await nutritionService.getAllNutritionLogs(testUserId, 2, 1);
    expect(result.nutritionLogs.length).toBe(1);
    expect(result.page).toBe(2);
    expect(result.limit).toBe(1);
  });
});

// getNutritionLogById

describe("getNutritionLogById", () => {
  let logId: number;

  beforeAll(async () => {
    const log = await prisma.nutritionLog.create({
      data: { userId: testUserId, date: new Date("2026-02-01T00:00:00.000Z") },
    });
    const mealData = {
      nutritionLogId: log.id,
      name: "Test Meal",
      calories: 500,
      protein: 20,
      carbs: 30,
      fat: 10,
    };
    const meal = await prisma.meal.create({ data: mealData });
    logId = log.id;
  });

  afterAll(async () => {
    await prisma.nutritionLog.deleteMany({ where: { userId: testUserId } });
  });

  it("returns the log when it exists for the user", async () => {
    const result = await nutritionService.getNutritionLogById(
      testUserId,
      logId,
    );
    expect(result.id).toBe(logId);
    expect(result.userId).toBe(testUserId);
    expect(new Date(result.date).toISOString()).toBe(
      new Date("2026-02-01T00:00:00.000Z").toISOString(),
    );
    // Meals should be included when we fetch a log by ID
    expect(result.meals?.length).toBe(1);
    const meal = result.meals[0];
    expect(meal?.name).toBe("Test Meal");
    expect(meal?.calories).toBe(500);
    expect(meal?.protein).toBe(20);
    expect(meal?.carbs).toBe(30);
    expect(meal?.fat).toBe(10);
  });

  it("throws NotFoundError for a log that belongs to a different user", async () => {
    const wrongUserId = testUserId + 9999;
    await expect(
      nutritionService.getNutritionLogById(wrongUserId, logId),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError for a log ID that does not exist", async () => {
    await expect(
      nutritionService.getNutritionLogById(testUserId, 999999999),
    ).rejects.toThrow(NotFoundError);
  });
});

// createNutritionLog

describe("createNutritionLog", () => {
  afterAll(async () => {
    await prisma.nutritionLog.deleteMany({ where: { userId: testUserId } });
  });

  it("creates and returns a new nutrition log", async () => {
    const date = new Date("2026-03-01T00:00:00.000Z");
    const result = await nutritionService.createNutritionLog({
      userId: testUserId,
      date,
    });

    expect(result.userId).toBe(testUserId);
    expect(new Date(result.date).toISOString()).toBe(date.toISOString());
    expect(result.id).toBeDefined();
  });

  it("throws DuplicateEntryError when creating a log with a date that already exists", async () => {
    const date = new Date("2026-03-01T00:00:00.000Z");
    // The log at this date was already created above
    await expect(
      nutritionService.createNutritionLog({ userId: testUserId, date }),
    ).rejects.toThrow(DuplicateEntryError);
  });
});

// updateNutritionLog
describe("updateNutritionLog", () => {
  beforeEach(async () => {
    await prisma.nutritionLog.deleteMany({ where: { userId: testUserId } });
  });

  it("throws a NotFoundError when log to update is not found", async () => {
    const newDate = new Date("2026-04-15T00:00:00.000Z");
    await expect(
      nutritionService.updateNutritionLog(99999999, testUserId, {
        date: newDate,
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws a DuplicateEntryError when updating log to have an existing date", async () => {
    // Create and verify two logs
    const date1 = new Date("2026-03-01T00:00:00.000Z");
    const result1 = await nutritionService.createNutritionLog({
      userId: testUserId,
      date: date1,
    });

    expect(result1.userId).toBe(testUserId);
    expect(new Date(result1.date).toISOString()).toBe(date1.toISOString());
    expect(result1.id).toBeDefined();

    const date2 = new Date("2026-03-02T00:00:00.000Z");
    const result2 = await nutritionService.createNutritionLog({
      userId: testUserId,
      date: date2,
    });

    expect(result2.userId).toBe(testUserId);
    expect(new Date(result2.date).toISOString()).toBe(date2.toISOString());
    expect(result2.id).toBeDefined();

    // Update the first log to have the date of the second log
    await expect(
      nutritionService.updateNutritionLog(result1.id, testUserId, {
        date: date2,
      }),
    ).rejects.toThrow(
      new DuplicateEntryError("Nutrition log with this date already exists."),
    );
  });

  it("creates and updates a nutrition log", async () => {
    const date = new Date("2026-03-01T00:00:00.000Z");
    const result = await nutritionService.createNutritionLog({
      userId: testUserId,
      date,
    });

    expect(result.userId).toBe(testUserId);
    expect(new Date(result.date).toISOString()).toBe(date.toISOString());
    expect(result.id).toBeDefined();

    const newDate = new Date("2026-04-15T00:00:00.000Z");
    const updatedLog = await nutritionService.updateNutritionLog(
      result.id,
      testUserId,
      { date: newDate },
    );

    expect(new Date(updatedLog.date).toISOString()).toBe(newDate.toISOString());
    expect(updatedLog.userId).toBe(testUserId);
    expect(result.id).toBeDefined();
  });
});

// deleteNutritionLog

describe("deleteNutritionLog", () => {
  beforeEach(async () => {
    await prisma.nutritionLog.deleteMany({ where: { userId: testUserId } });
  });

  it("deletes an existing log and returns undefined", async () => {
    const log = await prisma.nutritionLog.create({
      data: { userId: testUserId, date: new Date("2026-05-01T00:00:00.000Z") },
    });

    const result = await nutritionService.deleteNutritionLog(
      log.id,
      testUserId,
    );
    expect(result).toBeUndefined();

    // Confirm it's actually gone from the DB
    const gone = await prisma.nutritionLog.findUnique({
      where: { id: log.id },
    });
    expect(gone).toBeNull();
  });

  it("throws NotFoundError when trying to delete a log that doesn't exist", async () => {
    await expect(
      nutritionService.deleteNutritionLog(999999999, testUserId),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError when log exists but belongs to a different user", async () => {
    const log = await prisma.nutritionLog.create({
      data: { userId: testUserId, date: new Date("2026-05-01T00:00:00.000Z") },
    });

    await expect(
      nutritionService.deleteNutritionLog(log.id, 3254354),
    ).rejects.toThrow(NotFoundError);
  });
});
