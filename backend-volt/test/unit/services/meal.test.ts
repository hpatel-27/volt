// Mock the database
// This call is hoisted so the db is mocked before the prisma import
vi.mock("../../../src/db.js");

import type { DeepMockProxy } from "vitest-mock-extended";
import { expect, test, describe, vi, beforeEach } from "vitest";
import { prisma } from "../../../src/db.js";
import * as mealService from "../../../src/services/meal.service.js";

// Mock prisma proxy, otherwise a type error exists when trying to call the mockResolved...
const prismaMock = prisma as unknown as DeepMockProxy<typeof prisma>;

describe("Meal Service getAllMeals", () => {
  // Prevent individual test context from leaking into other tests
  beforeEach(() => vi.clearAllMocks());

  test("Log not found or does not belong to user", async () => {
    // Invalid userId and logId
    const logId = 15;
    const userId = 12;
    // Log not found
    await expect(mealService.getAllMeals(logId, userId)).rejects.toThrow(
      `Log with id: ${logId} not found.`,
    );
  });

  test("Database or known error retrieving meals", async () => {
    // Create a log that the meal can be associated to
    const logId = 15;
    const userId = 12;
    const date = new Date("2026-04-11T14:48:00.000Z");
    prismaMock.nutritionLog.findUnique.mockResolvedValueOnce({
      id: logId,
      userId,
      date,
    });

    // Throw an error with fake sensitive information
    prismaMock.meal.findMany.mockRejectedValueOnce(
      new Error("Prisma database at url: someUrl is currently unavailable."),
    );

    // Expect that the original error message is overwritten with a safer message to pass
    // to the client
    await expect(mealService.getAllMeals(logId, userId)).rejects.toThrow(
      "Error retrieving meals for this log.",
    );
  });

  test("Non-error instance thrown when retrieving meals", async () => {
    // Create a log that the meal can be associated to
    const logId = 15;
    const userId = 12;
    const date = new Date("2026-04-11T14:48:00.000Z");
    prismaMock.nutritionLog.findUnique.mockResolvedValueOnce({
      id: logId,
      userId,
      date,
    });

    // Throw something that is not an instance of Error, i.e. a number
    prismaMock.meal.findMany.mockRejectedValueOnce(42);

    // Return a safe message to the client that some unknown value was thrown
    await expect(mealService.getAllMeals(logId, userId)).rejects.toThrow(
      "Unknown error when retrieving meals for this log.",
    );
  });

  test("Empty meals list for a log", async () => {
    // Create a log that the meal can be associated to
    const logId = 15;
    const userId = 12;
    const date = new Date("2026-04-11T14:48:00.000Z");
    prismaMock.nutritionLog.findUnique.mockResolvedValueOnce({
      id: logId,
      userId,
      date,
    });

    // There should be no meals associated with this log (empty list)
    prismaMock.meal.findMany.mockResolvedValueOnce([]);

    const meals = await mealService.getAllMeals(logId, userId);
    expect(meals.length).toBe(0);
    expect(meals).toStrictEqual([]);
  });

  test("Multiple meals in list for a log", async () => {
    // Create a log that the meal can be associated to
    const logId = 15;
    const userId = 12;
    const date = new Date("2026-04-11T14:48:00.000Z");
    prismaMock.nutritionLog.findUnique.mockResolvedValueOnce({
      id: logId,
      userId,
      date,
    });

    const firstMealId = 14;
    const secondMealId = 17;
    // There should be 2 meals associated with this log
    prismaMock.meal.findMany.mockResolvedValueOnce([
      {
        id: firstMealId,
        nutritionLogId: logId,
        name: "Tortilla",
        calories: 200,
        protein: 5,
        fat: 2,
        carbs: 10,
      },
      {
        id: secondMealId,
        nutritionLogId: logId,
        name: "Milk",
        calories: 120,
        protein: 8,
        fat: 2,
        carbs: 0,
      },
    ]);

    // Get all the meals for the log and we should expect to receive the above two meals
    const meals = await mealService.getAllMeals(logId, userId);
    expect(meals.length).toBe(2);
    expect(meals).toStrictEqual([
      {
        id: firstMealId,
        nutritionLogId: logId,
        name: "Tortilla",
        calories: 200,
        protein: 5,
        fat: 2,
        carbs: 10,
      },
      {
        id: secondMealId,
        nutritionLogId: logId,
        name: "Milk",
        calories: 120,
        protein: 8,
        fat: 2,
        carbs: 0,
      },
    ]);
  });
});
