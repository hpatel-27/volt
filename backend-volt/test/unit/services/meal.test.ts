// Mock the database
// This call is hoisted so the db is mocked before the prisma import
vi.mock("../../../src/db.js");

import type { DeepMockProxy } from "vitest-mock-extended";
import { expect, it, describe, vi, beforeEach } from "vitest";
import { prisma } from "../../../src/db.js";
import * as mealService from "../../../src/services/meal.service.js";
import { Prisma } from "../../../src/generated/prisma/client.js";
import { NotFoundError } from "../../../src/errors.js";

// Mock prisma proxy, otherwise a type error exists when trying to call the mockResolved...
const prismaMock = prisma as unknown as DeepMockProxy<typeof prisma>;

describe("Meal Service getAllMeals", () => {
  // Prevent individual test context from leaking into other tests
  beforeEach(() => vi.clearAllMocks());

  it("should throw error for log not found or it does not belong to the user", async () => {
    const logId = "log-uuid-15";
    const userId = "user-uuid-12";
    await expect(mealService.getAllMeals(logId, userId)).rejects.toThrow(
      `Log with id: ${logId} not found.`,
    );
  });

  it("should propagate unexpected errors", async () => {
    const logId = "log-uuid-15";
    const userId = "user-uuid-12";
    const dbError = new Error(
      "Prisma database at url: someUrl is currently unavailable.",
    );
    prismaMock.nutritionLog.findUnique.mockRejectedValueOnce(dbError);

    await expect(mealService.getAllMeals(logId, userId)).rejects.toThrow(
      dbError.message,
    );
  });

  it("should propagate unknown thrown values", async () => {
    const logId = "log-uuid-15";
    const userId = "user-uuid-12";
    prismaMock.nutritionLog.findUnique.mockRejectedValueOnce(42);

    await expect(mealService.getAllMeals(logId, userId)).rejects.toBe(42);
  });

  it("should return an empty meals list for a log", async () => {
    const logId = "log-uuid-15";
    const userId = "user-uuid-12";
    const date = new Date("2026-04-11T14:48:00.000Z");
    // findUnique now returns the log with its meals included in a single query
    prismaMock.nutritionLog.findUnique.mockResolvedValueOnce({
      id: logId,
      userId,
      date,
      meals: [],
    } as any);

    const data = await mealService.getAllMeals(logId, userId);
    const meals = data.meals;
    expect(meals.length).toBe(0);
    expect(meals).toStrictEqual([]);
  });

  it("should return multiple meals in list for a log", async () => {
    const logId = "log-uuid-15";
    const userId = "user-uuid-12";
    const date = new Date("2026-04-11T14:48:00.000Z");
    const firstMealId = "meal-uuid-14";
    const secondMealId = "meal-uuid-17";
    prismaMock.nutritionLog.findUnique.mockResolvedValueOnce({
      id: logId,
      userId,
      date,
      meals: [
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
      ],
    } as any);

    const data = await mealService.getAllMeals(logId, userId);
    const meals = data.meals;
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

  it("should throw an error when meal is not found or does not belong to the user", async () => {
    const logId = "log-uuid-15";
    const userId = "user-uuid-12";
    const mealId = "meal-uuid-109";

    // findFirst returns null when the meal/log ownership check fails — single query
    await expect(
      mealService.getMealById(logId, userId, mealId),
    ).rejects.toThrow(`Meal with id: ${mealId} not found.`);
  });

  it("should propagate unexpected errors", async () => {
    const logId = "log-uuid-15";
    const userId = "user-uuid-12";
    const mealId = "meal-uuid-109";
    const dbError = new Error(
      "Prisma database at url: someUrl is currently unavailable.",
    );
    prismaMock.meal.findFirst.mockRejectedValueOnce(dbError);

    await expect(
      mealService.getMealById(logId, userId, mealId),
    ).rejects.toThrow(dbError.message);
  });

  it("should propagate unknown thrown values", async () => {
    const logId = "log-uuid-15";
    const userId = "user-uuid-12";
    const mealId = "meal-uuid-109";
    prismaMock.meal.findFirst.mockRejectedValueOnce("45");

    await expect(mealService.getMealById(logId, userId, mealId)).rejects.toBe(
      "45",
    );
  });

  it("should return a valid meal", async () => {
    const logId = "log-uuid-17";
    const userId = "user-uuid-11";
    const mealId = "meal-uuid-341";
    prismaMock.meal.findFirst.mockResolvedValueOnce({
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
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (callback) =>
      callback(prismaMock as any),
    );
  });

  it("should throw error for log not found or it does not belong to the user", async () => {
    // Invalid userId and logId
    const logId = "log-uuid-15";
    const userId = "user-uuid-12";
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
    ).rejects.toThrow(
      new NotFoundError("Log associated to this meal does not exist."),
    );
  });

  it("should propagate unexpected errors", async () => {
    const logId = "log-uuid-15";
    const userId = "user-uuid-12";
    const date = new Date("2026-04-13T14:48:00.000Z");

    const mealData = {
      nutritionLogId: logId,
      name: "Milk",
      calories: 150,
      protein: 8,
      fat: 8,
      carbs: 12,
    };

    prismaMock.nutritionLog.findUnique.mockResolvedValueOnce({
      id: logId,
      userId,
      date,
    });

    const dbError = new Error(
      "Prisma database at url: someUrl is currently unavailable.",
    );
    prismaMock.meal.create.mockRejectedValueOnce(dbError);

    await expect(
      mealService.createMeal(logId, userId, mealData),
    ).rejects.toThrow(dbError.message);
  });

  it("should propagate unknown thrown values", async () => {
    const logId = "log-uuid-15";
    const userId = "user-uuid-12";
    const date = new Date("2026-04-13T14:48:00.000Z");

    const mealData = {
      nutritionLogId: logId,
      name: "Milk",
      calories: 150,
      protein: 8,
      fat: 8,
      carbs: 12,
    };

    prismaMock.nutritionLog.findUnique.mockResolvedValueOnce({
      id: logId,
      userId,
      date,
    } as any);
    prismaMock.meal.create.mockRejectedValueOnce(undefined);

    await expect(mealService.createMeal(logId, userId, mealData)).rejects.toBe(
      undefined,
    );
  });

  it("should create a valid meal", async () => {
    const logId = "log-uuid-15";
    const userId = "user-uuid-12";
    const date = new Date("2026-04-13T14:48:00.000Z");

    const mealData = {
      id: "meal-uuid-1",
      nutritionLogId: logId,
      name: "Milk",
      calories: 150,
      protein: 8,
      fat: 8,
      carbs: 12,
    };

    prismaMock.nutritionLog.findUnique.mockResolvedValueOnce({
      id: logId,
      userId,
      date,
    } as any);
    prismaMock.meal.create.mockResolvedValueOnce(mealData);
    const createdMeal = await mealService.createMeal(logId, userId, mealData);
    expect(createdMeal).toStrictEqual(mealData);
  });
});

describe("Meal Service updateMeal", () => {
  // Clear mocks before each tests to prevent leaks
  beforeEach(() => vi.clearAllMocks());

  it("should throw a NotFoundError when meal or log is not found", async () => {
    const logId = "log-uuid-15";
    const userId = "user-uuid-12";
    const mealId = "meal-uuid-1";
    const updateData = { name: "Whole Milk" };

    // P2025 is thrown by Prisma when the update target doesn't exist, which
    // now covers both "meal not found" and "log doesn't belong to user"
    const error = new Prisma.PrismaClientKnownRequestError(
      "Prisma error with meal to update not found.",
      { code: "P2025", clientVersion: "7.4.2" },
    );
    prismaMock.meal.update.mockRejectedValueOnce(error);

    await expect(
      mealService.updateMeal(logId, userId, mealId, updateData),
    ).rejects.toThrow("Meal not found.");
  });

  it("should propagate unexpected errors", async () => {
    const logId = "log-uuid-15";
    const userId = "user-uuid-12";
    const mealId = "meal-uuid-1";
    const updateData = { name: "Whole Milk" };
    const dbError = new Error(
      "Prisma database at url: someUrl is currently unavailable.",
    );
    prismaMock.meal.update.mockRejectedValueOnce(dbError);

    await expect(
      mealService.updateMeal(logId, userId, mealId, updateData),
    ).rejects.toThrow(dbError.message);
  });

  it("should propagate unknown thrown values", async () => {
    const logId = "log-uuid-15";
    const userId = "user-uuid-12";
    const mealId = "meal-uuid-1";
    const updateData = { name: "Whole Milk" };
    prismaMock.meal.update.mockRejectedValueOnce(undefined);

    await expect(
      mealService.updateMeal(logId, userId, mealId, updateData),
    ).rejects.toBe(undefined);
  });

  it("should complete a valid meal update", async () => {
    const logId = "log-uuid-15";
    const userId = "user-uuid-12";
    const mealId = "meal-uuid-109";
    const mealData = {
      id: mealId,
      nutritionLogId: logId,
      name: "Whole Milk",
      calories: 150,
      protein: 8,
      fat: 8,
      carbs: 12,
    };
    const updateData = { name: "Whole Milk" };

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

  it("should throw a NotFoundError when meal or log is not found", async () => {
    const logId = "log-uuid-15";
    const userId = "user-uuid-12";
    const mealId = "meal-uuid-1";

    const error = new Prisma.PrismaClientKnownRequestError(
      "Prisma error with meal to delete not found.",
      { code: "P2025", clientVersion: "7.4.2" },
    );
    prismaMock.meal.delete.mockRejectedValueOnce(error);

    await expect(mealService.deleteMeal(logId, userId, mealId)).rejects.toThrow(
      "Meal not found.",
    );
  });

  it("should propagate unexpected errors", async () => {
    const logId = "log-uuid-15";
    const userId = "user-uuid-12";
    const mealId = "meal-uuid-1";
    const dbError = new Error(
      "Prisma database at url: someUrl is currently unavailable.",
    );
    prismaMock.meal.delete.mockRejectedValueOnce(dbError);

    await expect(mealService.deleteMeal(logId, userId, mealId)).rejects.toThrow(
      dbError.message,
    );
  });

  it("should propagate unknown thrown values", async () => {
    const logId = "log-uuid-15";
    const userId = "user-uuid-12";
    const mealId = "meal-uuid-1";
    prismaMock.meal.delete.mockRejectedValueOnce(undefined);

    await expect(mealService.deleteMeal(logId, userId, mealId)).rejects.toBe(
      undefined,
    );
  });

  it("should complete a valid meal delete", async () => {
    const logId = "log-uuid-15";
    const userId = "user-uuid-12";
    const mealId = "meal-uuid-1";

    prismaMock.meal.delete.mockResolvedValueOnce({
      id: mealId,
      nutritionLogId: logId,
      name: "Milk",
      calories: 150,
      protein: 8,
      fat: 8,
      carbs: 12,
    });

    const result = await mealService.deleteMeal(logId, userId, mealId);
    expect(result).toBeUndefined();
  });
});
