// Integration tests: meal service against a real database
// No mocks — prisma queries run against the test DB

import { expect, describe, it, beforeAll, afterAll } from "vitest";
import { prisma } from "../../../src/db.js";
import { Prisma } from "../../../src/generated/prisma/client.js";
import * as mealService from "../../../src/services/meal.service.js";
import { NotFoundError } from "../../../src/errors.js";

// Unique clerkId so this test user doesn't collide with real users
const TEST_CLERK_ID = "integration_test_meal_service_user";
let testUserId: number;
let logId: number;

beforeAll(async () => {
  // Upsert a test user — same pattern as userMiddleware
  const user = await prisma.user.upsert({
    where: { clerkId: TEST_CLERK_ID },
    update: {},
    create: { clerkId: TEST_CLERK_ID },
  });
  testUserId = user.id;

  const log = await prisma.nutritionLog.create({
    data: { userId: testUserId, date: new Date("2026-04-01T00:00:00.000Z") },
  });
  logId = log.id;
});

afterAll(async () => {
  // Meals cascade-delete when the nutrition log is deleted,
  // so we only need to remove logs then the user
  await prisma.nutritionLog.deleteMany({ where: { userId: testUserId } });
  await prisma.user.delete({ where: { id: testUserId } });
});

// getAllMeals
describe("getAllMeals", () => {
  // After all these tests remove all the meals on the global log
  afterAll(async () => {
    await prisma.meal.deleteMany({ where: { nutritionLogId: logId } });
  });

  it("throws NotFoundError when log not found", async () => {
    await expect(mealService.getAllMeals(999999, testUserId)).rejects.toThrow(
      new NotFoundError(`Log with id: ${999999} not found.`),
    );
  });

  it("returns an empty list of meals for the log", async () => {
    const data = await mealService.getAllMeals(logId, testUserId);
    const meals = data.meals;
    expect(meals.length).toBe(0);
    expect(meals).toStrictEqual([]);
  });

  it("returns multiple meals in the list for the log", async () => {
    const firstMealData: Prisma.MealUncheckedCreateInput = {
      nutritionLogId: logId,
      name: "Greek Yogurt",
      calories: 140,
      protein: 20,
      carbs: 9,
      fat: 3,
    };

    const secondMealData: Prisma.MealUncheckedCreateInput = {
      nutritionLogId: logId,
      name: "Protein Shake",
      calories: 230,
      protein: 42,
      carbs: 9,
      fat: 3.5,
    };

    const firstMeal = await mealService.createMeal(
      logId,
      testUserId,
      firstMealData,
    );
    const secondMeal = await mealService.createMeal(
      logId,
      testUserId,
      secondMealData,
    );

    const data = await mealService.getAllMeals(logId, testUserId);
    const meals = data.meals;
    expect(meals.length).toBe(2);
    // Check the first meal
    expect(meals[0]?.nutritionLogId).toBe(logId);
    expect(meals[0]?.name).toBe("Greek Yogurt");
    expect(meals[0]?.calories).toBe(140);
    expect(meals[0]?.protein).toBe(20);
    expect(meals[0]?.carbs).toBe(9);
    expect(meals[0]?.fat).toBe(3);

    // Check the second meal
    expect(meals[1]?.nutritionLogId).toBe(logId);
    expect(meals[1]?.name).toBe("Protein Shake");
    expect(meals[1]?.calories).toBe(230);
    expect(meals[1]?.protein).toBe(42);
    expect(meals[1]?.carbs).toBe(9);
    expect(meals[1]?.fat).toBe(3.5);
  });
});

describe("getMealById", () => {
  let mealId: number;
  beforeAll(async () => {
    const mealData: Prisma.MealUncheckedCreateInput = {
      nutritionLogId: logId,
      name: "Breakfast",
      calories: 500,
      protein: 30,
      carbs: 40,
      fat: 20,
    };
    const meal = await prisma.meal.create({ data: mealData });
    mealId = meal.id;
  });
  afterAll(async () => {
    await prisma.meal.deleteMany({ where: { nutritionLogId: logId } });
  });

  it("throws NotFoundError when log not found", async () => {
    await expect(
      mealService.getMealById(999999, testUserId, mealId),
    ).rejects.toThrow(new NotFoundError(`Meal with id: ${mealId} not found.`));
  });

  it("throws NotFoundError when meal not found", async () => {
    await expect(
      mealService.getMealById(logId, testUserId, 777777),
    ).rejects.toThrow(new NotFoundError(`Meal with id: ${777777} not found.`));
  });

  it("returns the meal with the given id", async () => {
    const meal = await mealService.getMealById(logId, testUserId, mealId);
    expect(meal).toBeDefined();
    expect(meal.name).toBe("Breakfast");
    expect(meal.calories).toBe(500);
    expect(meal.protein).toBe(30);
    expect(meal.carbs).toBe(40);
    expect(meal.fat).toBe(20);
  });
});

describe("createMeal", () => {
  afterAll(async () => {
    await prisma.meal.deleteMany({ where: { nutritionLogId: logId } });
  });

  it("throws NotFoundError when log not found", async () => {
    const mealData: Prisma.MealUncheckedCreateInput = {
      nutritionLogId: logId,
      name: "Milk",
      calories: 150,
      protein: 8,
      carbs: 12,
      fat: 8,
    };

    await expect(
      mealService.createMeal(999999, testUserId, mealData),
    ).rejects.toThrow(
      new NotFoundError("Log associated to this meal does not exist."),
    );
  });

  it("returns a created meal", async () => {
    const mealData: Prisma.MealUncheckedCreateInput = {
      nutritionLogId: logId,
      name: "Milk",
      calories: 150,
      protein: 8,
      carbs: 12,
      fat: 8,
    };

    const meal = await mealService.createMeal(logId, testUserId, mealData);
    expect(meal).toBeDefined();
    expect(meal.name).toBe("Milk");
    expect(meal.calories).toBe(150);
    expect(meal.protein).toBe(8);
    expect(meal.carbs).toBe(12);
    expect(meal.fat).toBe(8);
  });
});

describe("updateMeal", () => {
  afterAll(async () => {
    await prisma.meal.deleteMany({ where: { nutritionLogId: logId } });
  });

  it("throws NotFoundError when log not found", async () => {
    const mealData: Prisma.MealUncheckedCreateInput = {
      nutritionLogId: logId,
      name: "Milk",
      calories: 150,
      protein: 8,
      carbs: 12,
      fat: 8,
    };

    // Fake logId and fake mealId
    await expect(
      mealService.updateMeal(999999, testUserId, 1232, mealData),
    ).rejects.toThrow(new NotFoundError("Meal not found."));
  });

  it("throws NotFoundError when meal to update is not found", async () => {
    const mealData: Prisma.MealUncheckedCreateInput = {
      nutritionLogId: logId,
      name: "Milk",
      calories: 150,
      protein: 8,
      carbs: 12,
      fat: 8,
    };

    await mealService.createMeal(logId, testUserId, mealData);

    await expect(
      mealService.updateMeal(logId, testUserId, -2348923, { protein: 14 }),
    ).rejects.toThrow(new NotFoundError("Meal not found."));
  });

  it("returns an updated meal", async () => {
    const mealData: Prisma.MealUncheckedCreateInput = {
      nutritionLogId: logId,
      name: "Milk",
      calories: 150,
      protein: 8,
      carbs: 12,
      fat: 8,
    };

    const meal = await mealService.createMeal(logId, testUserId, mealData);

    const updatedMeal = await mealService.updateMeal(
      logId,
      testUserId,
      meal.id,
      {
        protein: 14,
      },
    );

    // Protein should be updated to the new value
    expect(updatedMeal.protein).toBe(14);
    // Confirm previous fields remained unchanged
    expect(updatedMeal.nutritionLogId).toBe(logId);
    expect(updatedMeal.name).toBe("Milk");
    expect(updatedMeal.calories).toBe(150);
    expect(updatedMeal.carbs).toBe(12);
    expect(updatedMeal.fat).toBe(8);
  });
});

describe("deleteMeal", () => {
  afterAll(async () => {
    await prisma.meal.deleteMany({ where: { nutritionLogId: logId } });
  });

  it("throws NotFoundError when log not found", async () => {
    // fake logId and fake mealId
    await expect(
      mealService.deleteMeal(999999, testUserId, 23423),
    ).rejects.toThrow(new NotFoundError("Meal not found."));
  });

  it("throws NotFoundError when meal to delete is not found", async () => {
    const mealData: Prisma.MealUncheckedCreateInput = {
      nutritionLogId: logId,
      name: "Milk",
      calories: 150,
      protein: 8,
      carbs: 12,
      fat: 8,
    };

    await mealService.createMeal(logId, testUserId, mealData);

    await expect(
      mealService.deleteMeal(logId, testUserId, -2348923),
    ).rejects.toThrow(new NotFoundError("Meal not found."));
  });

  it("returns undefined and deletes the meal successfully", async () => {
    const mealData: Prisma.MealUncheckedCreateInput = {
      nutritionLogId: logId,
      name: "Milk",
      calories: 150,
      protein: 8,
      carbs: 12,
      fat: 8,
    };

    const meal = await mealService.createMeal(logId, testUserId, mealData);
    // Deleting a meal should return no content
    const res = await mealService.deleteMeal(logId, testUserId, meal.id);
    expect(res).toBeUndefined();

    // Confirm that the deleted meal cannot be found
    const deletedMeal = await prisma.meal.findUnique({
      where: { id: meal.id, nutritionLogId: logId },
    });
    expect(deletedMeal).toBeNull();
  });
});
