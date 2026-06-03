// Unit tests: meal controller with the service layer mocked.
// These calls are hoisted so the modules are mocked before import.
vi.mock("../../../src/services/meal.service.js");
// The meal controller calls the nutrition service to resolve date -> logId
vi.mock("../../../src/services/nutrition.service.js");
vi.mock("../../../src/db.js");

import type { Request, Response } from "express";
import { expect, it, describe, vi, beforeEach } from "vitest";
import * as mealService from "../../../src/services/meal.service.js";
import * as nutritionService from "../../../src/services/nutrition.service.js";
import * as mealController from "../../../src/controllers/meal.controller.js";
import { NotFoundError, BadRequestError } from "../../../src/errors.js";

// Shared fixtures
const MOCK_DATE = "2026-04-15";
const MOCK_LOG_ID = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const MOCK_LOG = { id: MOCK_LOG_ID, date: "2026-04-15", meals: [] };
// A meal DTO as the service returns it (no nutritionLogId)
const MOCK_MEAL = {
  id: "meal-uuid-1",
  name: "Breakfast",
  calories: 500,
  protein: 30,
  carbs: 60,
  fat: 15,
};

function mockRequest(body: Record<string, unknown> = {}) {
  return { user: { id: "user-uuid-1" }, body } as unknown as Request;
}

function mockResponse(locals: Record<string, unknown> = { date: MOCK_DATE }) {
  return {
    locals,
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

describe("Meal Controller getAllMeals", () => {
  beforeEach(() => vi.clearAllMocks());

  it("resolves the logId and returns the service payload", async () => {
    const mRes = mockResponse();
    vi.mocked(nutritionService.getNutritionLogByDate).mockResolvedValueOnce(
      MOCK_LOG as any,
    );
    vi.mocked(mealService.getAllMeals).mockResolvedValueOnce({ meals: [] });

    await mealController.getAllMeals(mockRequest(), mRes);

    expect(nutritionService.getNutritionLogByDate).toHaveBeenCalledWith(
      "user-uuid-1",
      MOCK_DATE,
    );
    expect(mealService.getAllMeals).toHaveBeenCalledWith(
      MOCK_LOG_ID,
      "user-uuid-1",
    );
    expect(mRes.json).toHaveBeenCalledWith({ meals: [] });
  });

  it("returns multiple meals", async () => {
    const mRes = mockResponse();
    const meals = { meals: [MOCK_MEAL, { ...MOCK_MEAL, id: "meal-uuid-2" }] };
    vi.mocked(nutritionService.getNutritionLogByDate).mockResolvedValueOnce(
      MOCK_LOG as any,
    );
    vi.mocked(mealService.getAllMeals).mockResolvedValueOnce(meals as any);

    await mealController.getAllMeals(mockRequest(), mRes);
    expect(mRes.json).toHaveBeenCalledWith(meals);
  });

  it("propagates a NotFoundError when the log is not found", async () => {
    const mRes = mockResponse();
    vi.mocked(nutritionService.getNutritionLogByDate).mockRejectedValueOnce(
      new NotFoundError("Nutrition log not found."),
    );

    await expect(mealController.getAllMeals(mockRequest(), mRes)).rejects.toThrow(
      NotFoundError,
    );
  });

  it("propagates a non-Error thrown value", async () => {
    const mRes = mockResponse();
    vi.mocked(nutritionService.getNutritionLogByDate).mockRejectedValueOnce(
      "unknown error value",
    );

    await expect(mealController.getAllMeals(mockRequest(), mRes)).rejects.toBe(
      "unknown error value",
    );
  });
});

describe("Meal Controller getMealById", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the meal for the resolved log", async () => {
    const mRes = mockResponse({ date: MOCK_DATE, mealId: "meal-uuid-1" });
    vi.mocked(nutritionService.getNutritionLogByDate).mockResolvedValueOnce(
      MOCK_LOG as any,
    );
    vi.mocked(mealService.getMealById).mockResolvedValueOnce(MOCK_MEAL as any);

    await mealController.getMealById(mockRequest(), mRes);

    expect(mealService.getMealById).toHaveBeenCalledWith(
      MOCK_LOG_ID,
      "user-uuid-1",
      "meal-uuid-1",
    );
    expect(mRes.json).toHaveBeenCalledWith(MOCK_MEAL);
  });

  it("propagates a NotFoundError from the service", async () => {
    const mRes = mockResponse({ date: MOCK_DATE, mealId: "meal-uuid-1" });
    vi.mocked(nutritionService.getNutritionLogByDate).mockResolvedValueOnce(
      MOCK_LOG as any,
    );
    vi.mocked(mealService.getMealById).mockRejectedValueOnce(
      new NotFoundError("Meal with id: meal-uuid-1 not found."),
    );

    await expect(mealController.getMealById(mockRequest(), mRes)).rejects.toThrow(
      NotFoundError,
    );
  });

  it("propagates a non-Error thrown value", async () => {
    const mRes = mockResponse({ date: MOCK_DATE, mealId: "meal-uuid-1" });
    vi.mocked(nutritionService.getNutritionLogByDate).mockResolvedValueOnce(
      MOCK_LOG as any,
    );
    vi.mocked(mealService.getMealById).mockRejectedValueOnce("unknown");

    await expect(mealController.getMealById(mockRequest(), mRes)).rejects.toBe(
      "unknown",
    );
  });
});

describe("Meal Controller createMeal", () => {
  beforeEach(() => vi.clearAllMocks());

  // --- Name validation: handled inline, returns 400 (does not throw) ---
  it.each([
    ["missing", undefined],
    ["a non-string", 32456],
    ["an empty string", ""],
  ])("returns 400 when name is %s", async (_label, name) => {
    const mRes = mockResponse();
    await mealController.createMeal(
      mockRequest({ name, calories: 500, protein: 30, carbs: 60, fat: 15 }),
      mRes,
    );
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Name is a required parameter and cannot be an empty string.",
    });
  });

  // --- Macro validation: delegated to validateNonNegativeNumber, which THROWS ---
  it.each([
    ["calories", "Calories"],
    ["protein", "Protein"],
    ["carbs", "Carbs"],
    ["fat", "Fat"],
  ])("throws BadRequestError when %s is missing", async (field, label) => {
    const body: Record<string, unknown> = {
      name: "Breakfast",
      calories: 500,
      protein: 30,
      carbs: 60,
      fat: 15,
    };
    body[field] = undefined;
    const mRes = mockResponse();

    await expect(
      mealController.createMeal(mockRequest(body), mRes),
    ).rejects.toThrow(
      new BadRequestError(`${label} is required and must be a non-negative number`),
    );
  });

  it.each(["calories", "protein", "carbs", "fat"])(
    "throws BadRequestError when %s is negative",
    async (field) => {
      const body: Record<string, unknown> = {
        name: "Breakfast",
        calories: 500,
        protein: 30,
        carbs: 60,
        fat: 15,
      };
      body[field] = -1;
      const mRes = mockResponse();

      await expect(
        mealController.createMeal(mockRequest(body), mRes),
      ).rejects.toThrow(BadRequestError);
    },
  );

  it("creates the meal against the find-or-created log and returns 201", async () => {
    const mRes = mockResponse();
    vi.mocked(
      nutritionService.findOrCreateNutritionLogByDate,
    ).mockResolvedValueOnce(MOCK_LOG as any);
    vi.mocked(mealService.createMeal).mockResolvedValueOnce(MOCK_MEAL as any);

    await mealController.createMeal(
      mockRequest({ name: "Breakfast", calories: 500, protein: 30, carbs: 60, fat: 15 }),
      mRes,
    );

    // Uses find-or-create (not getByDate) so a meal can be logged on a fresh day
    expect(nutritionService.findOrCreateNutritionLogByDate).toHaveBeenCalledWith(
      "user-uuid-1",
      MOCK_DATE,
    );
    expect(mealService.createMeal).toHaveBeenCalledWith({
      nutritionLogId: MOCK_LOG_ID,
      name: "Breakfast",
      calories: 500,
      protein: 30,
      carbs: 60,
      fat: 15,
    });
    expect(mRes.status).toHaveBeenCalledWith(201);
    expect(mRes.json).toHaveBeenCalledWith(MOCK_MEAL);
  });

  it("propagates a non-Error thrown value from the service", async () => {
    const mRes = mockResponse();
    vi.mocked(
      nutritionService.findOrCreateNutritionLogByDate,
    ).mockResolvedValueOnce(MOCK_LOG as any);
    vi.mocked(mealService.createMeal).mockRejectedValueOnce("unknown");

    await expect(
      mealController.createMeal(
        mockRequest({ name: "Breakfast", calories: 500, protein: 30, carbs: 60, fat: 15 }),
        mRes,
      ),
    ).rejects.toBe("unknown");
  });
});

describe("Meal Controller updateMeal", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 when name is an empty string", async () => {
    const mRes = mockResponse({ date: MOCK_DATE, mealId: "meal-uuid-1" });
    await mealController.updateMeal(mockRequest({ name: "" }), mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Meal name cannot be an empty string.",
    });
  });

  it("returns 400 when name is the wrong type", async () => {
    const mRes = mockResponse({ date: MOCK_DATE, mealId: "meal-uuid-1" });
    await mealController.updateMeal(mockRequest({ name: 123 }), mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Meal name cannot be an empty string.",
    });
  });

  it.each([
    ["calories", -1],
    ["calories", "500"],
    ["protein", -1],
    ["protein", true],
    ["carbs", -1],
    ["carbs", "60g"],
    ["fat", -1],
    ["fat", "15g"],
  ])("throws BadRequestError when %s is %s", async (field, value) => {
    const mRes = mockResponse({ date: MOCK_DATE, mealId: "meal-uuid-1" });
    await expect(
      mealController.updateMeal(mockRequest({ [field]: value }), mRes),
    ).rejects.toThrow(BadRequestError);
  });

  it("returns 400 when no valid fields are provided", async () => {
    const mRes = mockResponse({ date: MOCK_DATE, mealId: "meal-uuid-1" });
    await mealController.updateMeal(mockRequest({}), mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "No valid fields were provided to update.",
    });
  });

  it("performs a partial update (name only) and returns the meal", async () => {
    const mRes = mockResponse({ date: MOCK_DATE, mealId: "meal-uuid-1" });
    const updated = { ...MOCK_MEAL, name: "Updated Breakfast" };
    vi.mocked(nutritionService.getNutritionLogByDate).mockResolvedValueOnce(
      MOCK_LOG as any,
    );
    vi.mocked(mealService.updateMeal).mockResolvedValueOnce(updated as any);

    await mealController.updateMeal(mockRequest({ name: "Updated Breakfast" }), mRes);

    expect(mealService.updateMeal).toHaveBeenCalledWith(
      MOCK_LOG_ID,
      "user-uuid-1",
      "meal-uuid-1",
      { name: "Updated Breakfast" },
    );
    expect(mRes.json).toHaveBeenCalledWith(updated);
  });

  it("accepts zero-value macros (boundary: 0 is valid)", async () => {
    const mRes = mockResponse({ date: MOCK_DATE, mealId: "meal-uuid-1" });
    const updated = { ...MOCK_MEAL, calories: 0, protein: 0 };
    vi.mocked(nutritionService.getNutritionLogByDate).mockResolvedValueOnce(
      MOCK_LOG as any,
    );
    vi.mocked(mealService.updateMeal).mockResolvedValueOnce(updated as any);

    await mealController.updateMeal(mockRequest({ calories: 0, protein: 0 }), mRes);

    expect(mealService.updateMeal).toHaveBeenCalledWith(
      MOCK_LOG_ID,
      "user-uuid-1",
      "meal-uuid-1",
      { calories: 0, protein: 0 },
    );
    expect(mRes.json).toHaveBeenCalledWith(updated);
  });

  it("propagates a NotFoundError from the service", async () => {
    const mRes = mockResponse({ date: MOCK_DATE, mealId: "meal-uuid-1" });
    vi.mocked(nutritionService.getNutritionLogByDate).mockResolvedValueOnce(
      MOCK_LOG as any,
    );
    vi.mocked(mealService.updateMeal).mockRejectedValueOnce(
      new NotFoundError("Meal not found."),
    );

    await expect(
      mealController.updateMeal(mockRequest({ name: "Updated" }), mRes),
    ).rejects.toThrow(NotFoundError);
  });

  it("propagates a non-Error thrown value", async () => {
    const mRes = mockResponse({ date: MOCK_DATE, mealId: "meal-uuid-1" });
    vi.mocked(nutritionService.getNutritionLogByDate).mockResolvedValueOnce(
      MOCK_LOG as any,
    );
    vi.mocked(mealService.updateMeal).mockRejectedValueOnce("unknown");

    await expect(
      mealController.updateMeal(mockRequest({ name: "Updated" }), mRes),
    ).rejects.toBe("unknown");
  });
});

describe("Meal Controller deleteMeal", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes the meal and returns 204", async () => {
    const mRes = mockResponse({ date: MOCK_DATE, mealId: "meal-uuid-1" });
    vi.mocked(nutritionService.getNutritionLogByDate).mockResolvedValueOnce(
      MOCK_LOG as any,
    );
    vi.mocked(mealService.deleteMeal).mockResolvedValueOnce(undefined);

    await mealController.deleteMeal(mockRequest(), mRes);

    expect(mealService.deleteMeal).toHaveBeenCalledWith(
      MOCK_LOG_ID,
      "user-uuid-1",
      "meal-uuid-1",
    );
    expect(mRes.status).toHaveBeenCalledWith(204);
    expect(mRes.send).toHaveBeenCalled();
  });

  it("propagates a NotFoundError when the log is not found", async () => {
    const mRes = mockResponse({ date: MOCK_DATE, mealId: "meal-uuid-1" });
    vi.mocked(nutritionService.getNutritionLogByDate).mockRejectedValueOnce(
      new NotFoundError("Nutrition log not found."),
    );

    await expect(mealController.deleteMeal(mockRequest(), mRes)).rejects.toThrow(
      NotFoundError,
    );
  });

  it("propagates a non-Error thrown value", async () => {
    const mRes = mockResponse({ date: MOCK_DATE, mealId: "meal-uuid-1" });
    vi.mocked(nutritionService.getNutritionLogByDate).mockResolvedValueOnce(
      MOCK_LOG as any,
    );
    vi.mocked(mealService.deleteMeal).mockRejectedValueOnce("unknown");

    await expect(mealController.deleteMeal(mockRequest(), mRes)).rejects.toBe(
      "unknown",
    );
  });
});
