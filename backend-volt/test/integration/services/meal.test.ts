// Integration tests: meal service against a real database.
// No mocks — prisma queries run against the test DB (TEST_DATABASE_URL).

import { expect, describe, it, beforeAll, afterAll } from "vitest";
import { prisma } from "../../../src/db.js";
import { Prisma } from "../../../src/generated/prisma/client.js";
import * as mealService from "../../../src/services/meal.service.js";
import { NotFoundError } from "../../../src/errors.js";

const TEST_CLERK_ID = "integration_test_meal_service_user";
let testUserId: string;
let logId: string;

// A second user to prove cross-user isolation
const OTHER_CLERK_ID = "integration_test_meal_service_other";
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

  const log = await prisma.nutritionLog.create({
    data: { userId: testUserId, date: new Date("2026-04-01T00:00:00.000Z") },
  });
  logId = log.id;
});

afterAll(async () => {
  // Meals cascade-delete with their nutrition log
  await prisma.nutritionLog.deleteMany({ where: { userId: testUserId } });
  await prisma.user.delete({ where: { id: testUserId } });
  await prisma.user.delete({ where: { id: otherUserId } });
});

describe("getAllMeals", () => {
  afterAll(async () => {
    await prisma.meal.deleteMany({ where: { nutritionLogId: logId } });
  });

  it("throws NotFoundError when the log does not exist", async () => {
    await expect(
      mealService.getAllMeals(crypto.randomUUID(), testUserId),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError when the log belongs to a different user", async () => {
    await expect(
      mealService.getAllMeals(logId, otherUserId),
    ).rejects.toThrow(NotFoundError);
  });

  it("returns an empty list for a log with no meals", async () => {
    const data = await mealService.getAllMeals(logId, testUserId);
    expect(data).toStrictEqual({ meals: [] });
  });

  it("returns the log's meals as DTOs without nutritionLogId", async () => {
    await prisma.meal.createMany({
      data: [
        { nutritionLogId: logId, name: "Greek Yogurt", calories: 140, protein: 20, carbs: 9, fat: 3 },
        { nutritionLogId: logId, name: "Protein Shake", calories: 230, protein: 42, carbs: 9, fat: 3.5 },
      ],
    });

    const { meals } = await mealService.getAllMeals(logId, testUserId);
    expect(meals).toHaveLength(2);

    // Order is not guaranteed (no orderBy), so look up by name
    const yogurt = meals.find((m) => m.name === "Greek Yogurt");
    const shake = meals.find((m) => m.name === "Protein Shake");

    expect(yogurt).toStrictEqual({
      id: yogurt!.id,
      name: "Greek Yogurt",
      calories: 140,
      protein: 20,
      carbs: 9,
      fat: 3,
    });
    expect(shake).toMatchObject({ name: "Protein Shake", calories: 230, fat: 3.5 });
    expect(yogurt).not.toHaveProperty("nutritionLogId");
  });
});

describe("getMealById", () => {
  let mealId: string;

  beforeAll(async () => {
    const meal = await prisma.meal.create({
      data: { nutritionLogId: logId, name: "Breakfast", calories: 500, protein: 30, carbs: 40, fat: 20 },
    });
    mealId = meal.id;
  });

  afterAll(async () => {
    await prisma.meal.deleteMany({ where: { nutritionLogId: logId } });
  });

  it("throws NotFoundError when the log does not exist", async () => {
    await expect(
      mealService.getMealById(crypto.randomUUID(), testUserId, mealId),
    ).rejects.toThrow(new NotFoundError(`Meal with id: ${mealId} not found.`));
  });

  it("throws NotFoundError when the meal does not exist", async () => {
    const missing = crypto.randomUUID();
    await expect(
      mealService.getMealById(logId, testUserId, missing),
    ).rejects.toThrow(new NotFoundError(`Meal with id: ${missing} not found.`));
  });

  it("throws NotFoundError when the log belongs to a different user", async () => {
    await expect(
      mealService.getMealById(logId, otherUserId, mealId),
    ).rejects.toThrow(NotFoundError);
  });

  it("returns the meal without nutritionLogId", async () => {
    const meal = await mealService.getMealById(logId, testUserId, mealId);
    expect(meal).toStrictEqual({
      id: mealId,
      name: "Breakfast",
      calories: 500,
      protein: 30,
      carbs: 40,
      fat: 20,
    });
  });
});

describe("createMeal", () => {
  afterAll(async () => {
    await prisma.meal.deleteMany({ where: { nutritionLogId: logId } });
  });

  it("creates a meal and persists it under the log", async () => {
    const meal = await mealService.createMeal({
      nutritionLogId: logId,
      name: "Milk",
      calories: 150,
      protein: 8,
      carbs: 12,
      fat: 8,
    });

    expect(meal).toMatchObject({ name: "Milk", calories: 150, protein: 8, carbs: 12, fat: 8 });
    expect(meal).not.toHaveProperty("nutritionLogId");

    // Confirm it was actually written and linked to the log
    const persisted = await prisma.meal.findUnique({ where: { id: meal.id } });
    expect(persisted?.nutritionLogId).toBe(logId);
  });

  it("rejects with a foreign-key error when the log does not exist", async () => {
    // createMeal does not pre-check ownership; the DB FK constraint enforces it
    await expect(
      mealService.createMeal({
        nutritionLogId: crypto.randomUUID(),
        name: "Orphan",
        calories: 10,
        protein: 1,
        carbs: 1,
        fat: 1,
      }),
    ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
  });
});

describe("updateMeal", () => {
  afterAll(async () => {
    await prisma.meal.deleteMany({ where: { nutritionLogId: logId } });
  });

  it("throws NotFoundError when the meal does not exist", async () => {
    await expect(
      mealService.updateMeal(logId, testUserId, crypto.randomUUID(), { protein: 14 }),
    ).rejects.toThrow(new NotFoundError("Meal not found."));
  });

  it("throws NotFoundError when the meal belongs to a different user's log", async () => {
    const meal = await prisma.meal.create({
      data: { nutritionLogId: logId, name: "Milk", calories: 150, protein: 8, carbs: 12, fat: 8 },
    });

    await expect(
      mealService.updateMeal(logId, otherUserId, meal.id, { protein: 14 }),
    ).rejects.toThrow(NotFoundError);
  });

  it("applies a partial update and leaves other fields unchanged", async () => {
    const meal = await prisma.meal.create({
      data: { nutritionLogId: logId, name: "Milk", calories: 150, protein: 8, carbs: 12, fat: 8 },
    });

    const updated = await mealService.updateMeal(logId, testUserId, meal.id, {
      protein: 14,
    });

    expect(updated).toStrictEqual({
      id: meal.id,
      name: "Milk",
      calories: 150,
      protein: 14, // only this changed
      carbs: 12,
      fat: 8,
    });
  });
});

describe("deleteMeal", () => {
  afterAll(async () => {
    await prisma.meal.deleteMany({ where: { nutritionLogId: logId } });
  });

  it("throws NotFoundError when the meal does not exist", async () => {
    await expect(
      mealService.deleteMeal(logId, testUserId, crypto.randomUUID()),
    ).rejects.toThrow(new NotFoundError("Meal not found."));
  });

  it("throws NotFoundError when the meal belongs to a different user's log", async () => {
    const meal = await prisma.meal.create({
      data: { nutritionLogId: logId, name: "Milk", calories: 150, protein: 8, carbs: 12, fat: 8 },
    });

    await expect(
      mealService.deleteMeal(logId, otherUserId, meal.id),
    ).rejects.toThrow(NotFoundError);
  });

  it("deletes the meal and returns undefined", async () => {
    const meal = await prisma.meal.create({
      data: { nutritionLogId: logId, name: "Milk", calories: 150, protein: 8, carbs: 12, fat: 8 },
    });

    const result = await mealService.deleteMeal(logId, testUserId, meal.id);
    expect(result).toBeUndefined();

    const gone = await prisma.meal.findUnique({ where: { id: meal.id } });
    expect(gone).toBeNull();
  });
});
