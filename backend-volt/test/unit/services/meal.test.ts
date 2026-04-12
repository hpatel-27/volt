// Mock the database
// This call is hoisted so the db is mocked before the prisma import
vi.mock("../../../src/db.js");

import type { DeepMockProxy } from "vitest-mock-extended";
import { expect, test, describe, vi, beforeEach } from "vitest";
import { prisma } from "../../../src/db.js";
import * as mealService from "../../../src/services/meal.service.js";
import { Prisma } from "../../../src/generated/prisma/client.js";

// Mock prisma proxy, otherwise a type error exists when trying to call the mockResolved...
const prismaMock = prisma as unknown as DeepMockProxy<typeof prisma>;

describe("Meal Service getAllMeals", () => {
  // Prevent individual test context from leaking into other tests
  beforeEach(() => vi.clearAllMocks());

  test("Error - Log not found or does not belong to user", async () => {
    // Invalid userId and logId
    const logId = 15;
    const userId = 12;
    // Log not found
    await expect(mealService.getAllMeals(logId, userId)).rejects.toThrow(
      `Log with id: ${logId} not found.`,
    );
  });

  test("Error - Database or known error retrieving meals", async () => {
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

  test("Error - Non-error instance thrown when retrieving meals", async () => {
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

describe("Meal Service getMealById", () => {
  // Prevent individual test context from leaking into other tests
  beforeEach(() => vi.clearAllMocks());

  test("Error - Log not found or does not belong to user", async () => {
    // Invalid userId and logId
    const logId = 15;
    const userId = 12;
    const mealId = 109;

    // Log not found
    await expect(
      mealService.getMealById(logId, userId, mealId),
    ).rejects.toThrow(`Log with id: ${logId} not found.`);
  });

  test("Error - Meal with a given id not found or does not match with the logId", async () => {
    // Create a log that the meal can be associated to
    const logId = 15;
    const userId = 12;
    const date = new Date("2026-04-11T14:48:00.000Z");
    prismaMock.nutritionLog.findUnique.mockResolvedValueOnce({
      id: logId,
      userId,
      date,
    });

    // Meal with this id does not exist or does not match with the provided logId
    const mealId = 109;
    await expect(
      mealService.getMealById(logId, userId, mealId),
    ).rejects.toThrow(`Meal with id: ${mealId} not found.`);
  });

  test("Error - generic server error", async () => {
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
    prismaMock.meal.findUnique.mockRejectedValueOnce(
      new Error("Prisma database at url: someUrl is currently unavailable."),
    );

    const mealId = 109;

    // Service should throw a generic error message to prevent leaking
    // sensitive information to the client
    await expect(
      mealService.getMealById(logId, userId, mealId),
    ).rejects.toThrow("Error retrieving meals for this log.");
  });

  test("Error - Unknown error thrown (non-error instance)", async () => {
    // Create a log that the meal can be associated to
    const logId = 15;
    const userId = 12;
    const date = new Date("2026-04-11T14:48:00.000Z");
    prismaMock.nutritionLog.findUnique.mockResolvedValueOnce({
      id: logId,
      userId,
      date,
    });

    // Non-error thrown on findUnique
    prismaMock.meal.findUnique.mockRejectedValueOnce("45");

    const mealId = 109;

    // Service should throw a generic error message to prevent leaking
    // sensitive information to the client
    await expect(
      mealService.getMealById(logId, userId, mealId),
    ).rejects.toThrow("Unknown error when retrieving meals for this log.");
  });

  test("should return a valid meal", async () => {
    // Create a log that the meal can be associated to
    const logId = 17;
    const userId = 11;
    const date = new Date("2026-04-13T14:48:00.000Z");
    prismaMock.nutritionLog.findUnique.mockResolvedValueOnce({
      id: logId,
      userId,
      date,
    });

    // Create a meal that we can expect to receive
    const mealId = 341;
    prismaMock.meal.findUnique.mockResolvedValueOnce({
      id: mealId,
      nutritionLogId: logId,
      name: "Milk",
      calories: 150,
      protein: 8,
      fat: 8,
      carbs: 12,
    });

    const meal = await mealService.getMealById(logId, userId, mealId);
    expect(meal).toStrictEqual({
      id: mealId,
      nutritionLogId: logId,
      name: "Milk",
      calories: 150,
      protein: 8,
      fat: 8,
      carbs: 12,
    });
  });
});

describe("Meal Service createMeal", () => {
  // Clear mocks between tests
  beforeEach(() => vi.clearAllMocks());

  test("Error - Log not found or does not belong to user", async () => {
    // Invalid userId and logId
    const logId = 15;
    const userId = 12;
    const mealData = {
      nutritionLogId: logId,
      name: "Milk",
      calories: 150,
      protein: 8,
      fat: 8,
      carbs: 12,
    };

    // Log not found
    await expect(
      mealService.createMeal(logId, userId, mealData),
    ).rejects.toThrow("Log associated to this meal does not exist.");
  });

  test("Error - Server error", async () => {
    // Setup log and meal data
    const logId = 15;
    const userId = 12;
    const date = new Date("2026-04-13T14:48:00.000Z");

    const mealData = {
      nutritionLogId: logId,
      name: "Milk",
      calories: 150,
      protein: 8,
      fat: 8,
      carbs: 12,
    };

    // Valid log
    prismaMock.nutritionLog.findUnique.mockResolvedValueOnce({
      id: logId,
      userId,
      date,
    });

    // Expect server error on meal create
    prismaMock.meal.create.mockRejectedValueOnce(
      new Error("Prisma database at url: someUrl is currently unavailable."),
    );

    await expect(
      mealService.createMeal(logId, userId, mealData),
    ).rejects.toThrow("Error creating meal in the database.");
  });

  test("Error - Unknown error", async () => {
    // Setup log and meal data
    const logId = 15;
    const userId = 12;
    const date = new Date("2026-04-13T14:48:00.000Z");

    const mealData = {
      nutritionLogId: logId,
      name: "Milk",
      calories: 150,
      protein: 8,
      fat: 8,
      carbs: 12,
    };

    // Valid log
    prismaMock.nutritionLog.findUnique.mockResolvedValueOnce({
      id: logId,
      userId,
      date,
    });

    // Expect server error on meal create
    prismaMock.meal.create.mockRejectedValueOnce(undefined);

    await expect(
      mealService.createMeal(logId, userId, mealData),
    ).rejects.toThrow("Unknown error when creating meal.");
  });

  test("Valid create meal", async () => {
    // Setup log and meal data
    const logId = 15;
    const userId = 12;
    const date = new Date("2026-04-13T14:48:00.000Z");

    const mealData = {
      id: 1,
      nutritionLogId: logId,
      name: "Milk",
      calories: 150,
      protein: 8,
      fat: 8,
      carbs: 12,
    };

    // Valid log
    prismaMock.nutritionLog.findUnique.mockResolvedValueOnce({
      id: logId,
      userId,
      date,
    });

    // Resolve a valid meal
    prismaMock.meal.create.mockResolvedValueOnce(mealData);

    const createdMeal = await mealService.createMeal(logId, userId, mealData);
    expect(createdMeal).toStrictEqual(mealData);
  });
});

describe("Meal Service updateMeal", () => {
  // Clear mocks before each tests to prevent leaks
  beforeEach(() => vi.clearAllMocks());

  test("Error - Log does not exist for this user", async () => {
    // Setup log and meal data
    const logId = 15;
    const userId = 12;

    // Fake update data
    const mealId = 1;
    const updateData = {
      name: "Whole Milk",
    };

    // Prisma will not be able to find a log with this data, so we expect
    // to see the NotFoundError with this message
    await expect(
      mealService.updateMeal(logId, userId, mealId, updateData),
    ).rejects.toThrow("Log associated to this meal does not exist.");
  });

  test("Error - Prisma request error", async () => {
    // Setup log and meal data
    const logId = 15;
    const userId = 12;
    const date = new Date("2026-04-13T14:48:00.000Z");

    // Fake update data
    const mealId = 1;
    const updateData = {
      name: "Whole Milk",
    };

    // Valid log
    prismaMock.nutritionLog.findUnique.mockResolvedValueOnce({
      id: logId,
      userId,
      date,
    });

    const error = new Prisma.PrismaClientKnownRequestError(
      "Prisma error with meal to update not found.",
      { code: "P2025", clientVersion: "7.4.2" },
    );

    prismaMock.meal.update.mockRejectedValueOnce(error);

    // Trying to update a meal with an invalid mealId should throw a Prisma error
    await expect(
      mealService.updateMeal(logId, userId, mealId, updateData),
    ).rejects.toThrow("Meal to update not found.");
  });

  test("Error - Server error", async () => {
    // Setup log and meal data
    const logId = 15;
    const userId = 12;
    const date = new Date("2026-04-13T14:48:00.000Z");

    // Fake update data
    const mealId = 1;
    const updateData = {
      name: "Whole Milk",
    };

    // Valid log
    prismaMock.nutritionLog.findUnique.mockResolvedValueOnce({
      id: logId,
      userId,
      date,
    });

    prismaMock.meal.update.mockRejectedValueOnce(
      new Error("Prisma database at url: someUrl is currently unavailable."),
    );

    await expect(
      mealService.updateMeal(logId, userId, mealId, updateData),
    ).rejects.toThrow("Error occurred during update to the meal.");
  });

  test("Error - Unknown error", async () => {
    // Setup log and meal data
    const logId = 15;
    const userId = 12;
    const date = new Date("2026-04-13T14:48:00.000Z");

    // Fake update data
    const mealId = 1;
    const updateData = {
      name: "Whole Milk",
    };

    // Valid log
    prismaMock.nutritionLog.findUnique.mockResolvedValueOnce({
      id: logId,
      userId,
      date,
    });

    prismaMock.meal.update.mockRejectedValueOnce(undefined);

    await expect(
      mealService.updateMeal(logId, userId, mealId, updateData),
    ).rejects.toThrow("Unknown error occurred during the update to the meal.");
  });

  test("Valid update", async () => {
    // Setup log and meal data
    const logId = 15;
    const userId = 12;
    const date = new Date("2026-04-13T14:48:00.000Z");

    // Meal data
    const mealId = 109;
    const mealData = {
      id: mealId,
      nutritionLogId: logId,
      name: "Whole Milk",
      calories: 150,
      protein: 8,
      fat: 8,
      carbs: 12,
    };
    const updateData = {
      name: "Whole Milk",
    };

    // Valid log
    prismaMock.nutritionLog.findUnique.mockResolvedValueOnce({
      id: logId,
      userId,
      date,
    });

    // Pretend that the update comes back with this data
    prismaMock.meal.update.mockResolvedValueOnce(mealData);

    const updatedMeal = await mealService.updateMeal(
      logId,
      userId,
      mealId,
      updateData,
    );

    expect(updatedMeal).toStrictEqual(mealData);
  });
});

describe("Meal Service deleteMeal", () => {
  beforeEach(() => vi.clearAllMocks());

  test("Error - Log does not exist for this user", async () => {
    const logId = 15;
    const userId = 12;
    const mealId = 1;

    await expect(mealService.deleteMeal(logId, userId, mealId)).rejects.toThrow(
      "Log associated to this meal does not exist.",
    );
  });

  test("Error - Prisma request error (meal not found)", async () => {
    const logId = 15;
    const userId = 12;
    const date = new Date("2026-04-13T14:48:00.000Z");
    const mealId = 1;

    prismaMock.nutritionLog.findUnique.mockResolvedValueOnce({
      id: logId,
      userId,
      date,
    });

    const error = new Prisma.PrismaClientKnownRequestError(
      "Prisma error with meal to delete not found.",
      { code: "P2025", clientVersion: "7.4.2" },
    );

    prismaMock.meal.delete.mockRejectedValueOnce(error);

    await expect(mealService.deleteMeal(logId, userId, mealId)).rejects.toThrow(
      "Meal to delete not found.",
    );
  });

  test("Error - Server error", async () => {
    const logId = 15;
    const userId = 12;
    const date = new Date("2026-04-13T14:48:00.000Z");
    const mealId = 1;

    prismaMock.nutritionLog.findUnique.mockResolvedValueOnce({
      id: logId,
      userId,
      date,
    });

    prismaMock.meal.delete.mockRejectedValueOnce(
      new Error("Prisma database at url: someUrl is currently unavailable."),
    );

    await expect(mealService.deleteMeal(logId, userId, mealId)).rejects.toThrow(
      "Error occurred during delete of the meal.",
    );
  });

  test("Error - Unknown error", async () => {
    const logId = 15;
    const userId = 12;
    const date = new Date("2026-04-13T14:48:00.000Z");
    const mealId = 1;

    prismaMock.nutritionLog.findUnique.mockResolvedValueOnce({
      id: logId,
      userId,
      date,
    });

    prismaMock.meal.delete.mockRejectedValueOnce(undefined);

    await expect(mealService.deleteMeal(logId, userId, mealId)).rejects.toThrow(
      "Unknown error occurred during the meal deletion.",
    );
  });

  test("Valid delete", async () => {
    const logId = 15;
    const userId = 12;
    const date = new Date("2026-04-13T14:48:00.000Z");
    const mealId = 1;

    prismaMock.nutritionLog.findUnique.mockResolvedValueOnce({
      id: logId,
      userId,
      date,
    });

    // Prisma will return the delete meal
    prismaMock.meal.delete.mockResolvedValueOnce({
      id: mealId,
      nutritionLogId: logId,
      name: "Milk",
      calories: 150,
      protein: 8,
      fat: 8,
      carbs: 12,
    });

    // The service should return no content
    const result = await mealService.deleteMeal(logId, userId, mealId);
    expect(result).toBeUndefined();
  });
});
