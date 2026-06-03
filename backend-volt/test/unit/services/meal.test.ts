// Unit tests: meal service with a mocked database.
// This call is hoisted so the db is mocked before the prisma import.
vi.mock("../../../src/db.js");

import type { DeepMockProxy } from "vitest-mock-extended";
import { expect, it, describe, vi, beforeEach } from "vitest";
import { prisma } from "../../../src/db.js";
import * as mealService from "../../../src/services/meal.service.js";
import { Prisma } from "../../../src/generated/prisma/client.js";
import { NotFoundError } from "../../../src/errors.js";

const prismaMock = prisma as unknown as DeepMockProxy<typeof prisma>;

// A raw meal row as Prisma returns it — note nutritionLogId is present here but
// the mapper (toMealDto) strips it from the service's output.
function mealRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "meal-uuid-1",
    nutritionLogId: "log-uuid-15",
    name: "Milk",
    calories: 150,
    protein: 8,
    carbs: 12,
    fat: 8,
    ...overrides,
  };
}

function prismaError(code: string) {
  return new Prisma.PrismaClientKnownRequestError(`Prisma error ${code}`, {
    code,
    clientVersion: "7.4.2",
  });
}

describe("Meal Service getAllMeals", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws NotFoundError when the log is missing or not owned by the user", async () => {
    // findUnique resolves null by default -> NotFound branch
    await expect(
      mealService.getAllMeals("log-uuid-15", "user-uuid-12"),
    ).rejects.toThrow(new NotFoundError("Log with id: log-uuid-15 not found."));
  });

  it("propagates an unexpected error", async () => {
    const dbError = new Error("Prisma database is currently unavailable.");
    prismaMock.nutritionLog.findUnique.mockRejectedValueOnce(dbError);

    await expect(
      mealService.getAllMeals("log-uuid-15", "user-uuid-12"),
    ).rejects.toThrow(dbError);
  });

  it("propagates a non-Error thrown value", async () => {
    prismaMock.nutritionLog.findUnique.mockRejectedValueOnce(42);

    await expect(
      mealService.getAllMeals("log-uuid-15", "user-uuid-12"),
    ).rejects.toBe(42);
  });

  it("returns an empty meals list for a log with no meals", async () => {
    prismaMock.nutritionLog.findUnique.mockResolvedValueOnce({
      id: "log-uuid-15",
      userId: "user-uuid-12",
      date: new Date("2026-04-11T00:00:00.000Z"),
      meals: [],
    } as any);

    const data = await mealService.getAllMeals("log-uuid-15", "user-uuid-12");
    expect(data).toStrictEqual({ meals: [] });
  });

  it("maps each meal to a DTO with nutritionLogId stripped", async () => {
    prismaMock.nutritionLog.findUnique.mockResolvedValueOnce({
      id: "log-uuid-15",
      userId: "user-uuid-12",
      date: new Date("2026-04-11T00:00:00.000Z"),
      meals: [
        mealRow({ id: "meal-1", name: "Tortilla", calories: 200, protein: 5, carbs: 10, fat: 2 }),
        mealRow({ id: "meal-2", name: "Milk", calories: 120, protein: 8, carbs: 0, fat: 2 }),
      ],
    } as any);

    const { meals } = await mealService.getAllMeals(
      "log-uuid-15",
      "user-uuid-12",
    );

    expect(meals).toStrictEqual([
      { id: "meal-1", name: "Tortilla", calories: 200, protein: 5, carbs: 10, fat: 2 },
      { id: "meal-2", name: "Milk", calories: 120, protein: 8, carbs: 0, fat: 2 },
    ]);
    // Defensive: the mapper must not leak the foreign key
    expect(meals[0]).not.toHaveProperty("nutritionLogId");
  });
});

describe("Meal Service getMealById", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws NotFoundError when the meal is missing or not owned", async () => {
    // findFirst resolves null by default
    await expect(
      mealService.getMealById("log-uuid-15", "user-uuid-12", "meal-uuid-109"),
    ).rejects.toThrow(
      new NotFoundError("Meal with id: meal-uuid-109 not found."),
    );
  });

  it("propagates an unexpected error", async () => {
    const dbError = new Error("Prisma database is currently unavailable.");
    prismaMock.meal.findFirst.mockRejectedValueOnce(dbError);

    await expect(
      mealService.getMealById("log-uuid-15", "user-uuid-12", "meal-uuid-109"),
    ).rejects.toThrow(dbError);
  });

  it("returns the meal as a DTO without nutritionLogId", async () => {
    prismaMock.meal.findFirst.mockResolvedValueOnce(mealRow({ id: "meal-uuid-341" }) as any);

    const meal = await mealService.getMealById(
      "log-uuid-17",
      "user-uuid-11",
      "meal-uuid-341",
    );

    expect(meal).toStrictEqual({
      id: "meal-uuid-341",
      name: "Milk",
      calories: 150,
      protein: 8,
      carbs: 12,
      fat: 8,
    });
  });
});

describe("Meal Service createMeal", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates the meal and returns a DTO without nutritionLogId", async () => {
    const input = {
      nutritionLogId: "log-uuid-15",
      name: "Milk",
      calories: 150,
      protein: 8,
      carbs: 12,
      fat: 8,
    };
    prismaMock.meal.create.mockResolvedValueOnce(
      mealRow({ id: "meal-uuid-1", ...input }) as any,
    );

    const created = await mealService.createMeal(input);

    expect(created).toStrictEqual({
      id: "meal-uuid-1",
      name: "Milk",
      calories: 150,
      protein: 8,
      carbs: 12,
      fat: 8,
    });
    // The service passes the input straight through to prisma.create
    expect(prismaMock.meal.create).toHaveBeenCalledWith({ data: input });
  });

  it("propagates an unexpected error", async () => {
    const dbError = new Error("Prisma database is currently unavailable.");
    prismaMock.meal.create.mockRejectedValueOnce(dbError);

    await expect(
      mealService.createMeal({
        nutritionLogId: "log-uuid-15",
        name: "Milk",
        calories: 150,
        protein: 8,
        carbs: 12,
        fat: 8,
      }),
    ).rejects.toThrow(dbError);
  });
});

describe("Meal Service updateMeal", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws NotFoundError when the meal/log is not found (P2025)", async () => {
    prismaMock.meal.update.mockRejectedValueOnce(prismaError("P2025"));

    await expect(
      mealService.updateMeal("log-uuid-15", "user-uuid-12", "meal-uuid-1", {
        name: "Whole Milk",
      }),
    ).rejects.toThrow(new NotFoundError("Meal not found."));
  });

  it("propagates an unexpected error", async () => {
    const dbError = new Error("Prisma database is currently unavailable.");
    prismaMock.meal.update.mockRejectedValueOnce(dbError);

    await expect(
      mealService.updateMeal("log-uuid-15", "user-uuid-12", "meal-uuid-1", {
        name: "Whole Milk",
      }),
    ).rejects.toThrow(dbError);
  });

  it("returns the updated meal as a DTO without nutritionLogId", async () => {
    prismaMock.meal.update.mockResolvedValueOnce(
      mealRow({ id: "meal-uuid-109", name: "Whole Milk" }) as any,
    );

    const updated = await mealService.updateMeal(
      "log-uuid-15",
      "user-uuid-12",
      "meal-uuid-109",
      { name: "Whole Milk" },
    );

    expect(updated).toStrictEqual({
      id: "meal-uuid-109",
      name: "Whole Milk",
      calories: 150,
      protein: 8,
      carbs: 12,
      fat: 8,
    });
  });
});

describe("Meal Service deleteMeal", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws NotFoundError when the meal/log is not found (P2025)", async () => {
    prismaMock.meal.delete.mockRejectedValueOnce(prismaError("P2025"));

    await expect(
      mealService.deleteMeal("log-uuid-15", "user-uuid-12", "meal-uuid-1"),
    ).rejects.toThrow(new NotFoundError("Meal not found."));
  });

  it("propagates an unexpected error", async () => {
    const dbError = new Error("Prisma database is currently unavailable.");
    prismaMock.meal.delete.mockRejectedValueOnce(dbError);

    await expect(
      mealService.deleteMeal("log-uuid-15", "user-uuid-12", "meal-uuid-1"),
    ).rejects.toThrow(dbError);
  });

  it("resolves to undefined on success", async () => {
    prismaMock.meal.delete.mockResolvedValueOnce(mealRow() as any);

    const result = await mealService.deleteMeal(
      "log-uuid-15",
      "user-uuid-12",
      "meal-uuid-1",
    );
    expect(result).toBeUndefined();
  });
});
