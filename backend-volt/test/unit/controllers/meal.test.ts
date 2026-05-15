// Mock the meal service
// This call is hoisted so the service is mocked before the import
vi.mock("../../../src/services/meal.service.js");
// Mock the nutrition service (meal controller calls it to resolve date -> logId)
vi.mock("../../../src/services/nutrition.service.js");
// Mock the database
// This call is hoisted so the db is mocked before anything else
vi.mock("../../../src/db.js");
import type { Request, Response } from "express";
import { expect, it, describe, vi, beforeEach } from "vitest";
import * as mealService from "../../../src/services/meal.service.js";
import * as nutritionService from "../../../src/services/nutrition.service.js";
import * as mealController from "../../../src/controllers/meal.controller.js";
import { NotFoundError } from "../../../src/errors.js";

// Shared test constants
const MOCK_DATE = "2026-04-15";
const MOCK_LOG_ID = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const MOCK_LOG = {
  id: MOCK_LOG_ID,
  userId: "user-uuid-1",
  date: new Date("2026-04-15T00:00:00.000Z"),
  meals: [],
};

describe("Meal Controller getAllMeals", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should throw an error when log not found", async () => {
    const mReq = {
      user: { id: "user-uuid-1" },
    } as unknown as Request;
    const mRes = {
      locals: { date: MOCK_DATE },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    vi.mocked(nutritionService.getNutritionLogByDate).mockRejectedValueOnce(
      new NotFoundError("Nutrition log not found."),
    );

    await expect(mealController.getAllMeals(mReq, mRes)).rejects.toThrow(
      NotFoundError,
    );
  });

  it("should throw an unknown error", async () => {
    const mReq = {
      user: { id: "user-uuid-1" },
    } as unknown as Request;
    const mRes = {
      locals: { date: MOCK_DATE },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    vi.mocked(nutritionService.getNutritionLogByDate).mockRejectedValueOnce(
      "unknown error value",
    );

    await expect(mealController.getAllMeals(mReq, mRes)).rejects.toThrow(
      "unknown error value",
    );
  });

  it("should return 200 - empty meals list", async () => {
    const mReq = {
      user: { id: "user-uuid-1" },
    } as unknown as Request;
    const mRes = {
      locals: { date: MOCK_DATE },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    vi.mocked(nutritionService.getNutritionLogByDate).mockResolvedValueOnce(
      MOCK_LOG as any,
    );
    vi.mocked(mealService.getAllMeals).mockResolvedValueOnce({ meals: [] });

    await mealController.getAllMeals(mReq, mRes);
    expect(mRes.json).toHaveBeenCalledWith({ meals: [] });
  });

  it("should return 200 - multiple meals", async () => {
    const mReq = {
      user: { id: "user-uuid-1" },
    } as unknown as Request;
    const mRes = {
      locals: { date: MOCK_DATE },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    const mockMeals = [
      {
        id: "meal-uuid-1",
        nutritionLogId: MOCK_LOG_ID,
        name: "Breakfast",
        calories: 500,
        protein: 30,
        carbs: 60,
        fat: 15,
      },
      {
        id: "meal-uuid-2",
        nutritionLogId: MOCK_LOG_ID,
        name: "Lunch",
        calories: 700,
        protein: 40,
        carbs: 80,
        fat: 20,
      },
    ];
    vi.mocked(nutritionService.getNutritionLogByDate).mockResolvedValueOnce(
      MOCK_LOG as any,
    );
    vi.mocked(mealService.getAllMeals).mockResolvedValueOnce(mockMeals as any);

    await mealController.getAllMeals(mReq, mRes);
    expect(mRes.json).toHaveBeenCalledWith(mockMeals);
  });
});

describe("Meal Controller getMealById", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should throw an error", async () => {
    const mReq = {
      user: { id: "user-uuid-1" },
    } as unknown as Request;
    const mRes = {
      locals: { date: MOCK_DATE, mealId: "meal-uuid-1" },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    vi.mocked(nutritionService.getNutritionLogByDate).mockResolvedValueOnce(
      MOCK_LOG as any,
    );
    vi.mocked(mealService.getMealById).mockRejectedValueOnce(
      new NotFoundError("Meal with id: meal-uuid-1 not found."),
    );

    await expect(mealController.getMealById(mReq, mRes)).rejects.toThrow(
      NotFoundError,
    );
  });

  it("should throw unknown error", async () => {
    const mReq = {
      user: { id: "user-uuid-1" },
    } as unknown as Request;
    const mRes = {
      locals: { date: MOCK_DATE, mealId: "meal-uuid-1" },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    vi.mocked(nutritionService.getNutritionLogByDate).mockResolvedValueOnce(
      MOCK_LOG as any,
    );
    vi.mocked(mealService.getMealById).mockRejectedValueOnce("unknown");

    await expect(mealController.getMealById(mReq, mRes)).rejects.toThrow(
      "unknown",
    );
  });

  it("should return 200 - success", async () => {
    const mReq = {
      user: { id: "user-uuid-1" },
    } as unknown as Request;
    const mRes = {
      locals: { date: MOCK_DATE, mealId: "meal-uuid-1" },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    const mockMeal = {
      id: "meal-uuid-1",
      nutritionLogId: MOCK_LOG_ID,
      name: "Breakfast",
      calories: 500,
      protein: 30,
      carbs: 60,
      fat: 15,
    };
    vi.mocked(nutritionService.getNutritionLogByDate).mockResolvedValueOnce(
      MOCK_LOG as any,
    );
    vi.mocked(mealService.getMealById).mockResolvedValueOnce(mockMeal as any);

    await mealController.getMealById(mReq, mRes);
    expect(mRes.json).toHaveBeenCalledWith(mockMeal);
  });
});

describe("Meal Controller createMeal", () => {
  beforeEach(() => vi.clearAllMocks());

  // Name Validation
  it("should return 400 - no name", async () => {
    const mReq = {
      user: { id: "user-uuid-1" },
      body: {
        name: undefined,
        calories: 500,
        protein: 30,
        carbs: 60,
        fat: 15,
      },
    } as unknown as Request;
    const mRes = {
      locals: { date: MOCK_DATE },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await mealController.createMeal(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Name is a required parameter and cannot be an empty string.",
    });
  });

  it("should return 400 - name is not a string", async () => {
    const mReq = {
      user: { id: "user-uuid-1" },
      body: {
        name: 32456,
        calories: 500,
        protein: 30,
        carbs: 60,
        fat: 15,
      },
    } as unknown as Request;
    const mRes = {
      locals: { date: MOCK_DATE },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await mealController.createMeal(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Name is a required parameter and cannot be an empty string.",
    });
  });

  it("should return 400 - name cannot be an empty string", async () => {
    const mReq = {
      user: { id: "user-uuid-1" },
      body: {
        name: "",
        calories: 500,
        protein: 30,
        carbs: 60,
        fat: 15,
      },
    } as unknown as Request;
    const mRes = {
      locals: { date: MOCK_DATE },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await mealController.createMeal(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Name is a required parameter and cannot be an empty string.",
    });
  });

  // Calorie Validation
  it("should return 400 - no calories", async () => {
    const mReq = {
      user: { id: "user-uuid-1" },
      body: {
        name: "Breakfast",
        calories: undefined,
        protein: 30,
        carbs: 60,
        fat: 15,
      },
    } as unknown as Request;
    const mRes = {
      locals: { date: MOCK_DATE },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await mealController.createMeal(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Calories is a required parameter.",
    });
  });

  it("should return 400 - calories is not a number", async () => {
    const mReq = {
      user: { id: "user-uuid-1" },
      body: {
        name: "Breakfast",
        calories: "undefined",
        protein: 30,
        carbs: 60,
        fat: 15,
      },
    } as unknown as Request;
    const mRes = {
      locals: { date: MOCK_DATE },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await mealController.createMeal(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Calories is a required parameter.",
    });
  });

  it("should return 400 - calories must be non-negative", async () => {
    const mReq = {
      user: { id: "user-uuid-1" },
      body: {
        name: "Breakfast",
        calories: -100,
        protein: 30,
        carbs: 60,
        fat: 15,
      },
    } as unknown as Request;
    const mRes = {
      locals: { date: MOCK_DATE },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await mealController.createMeal(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Calories is a required parameter.",
    });
  });

  it("should return 400 - calories must be non-negative - boundary", async () => {
    const mReq = {
      user: { id: "user-uuid-1" },
      body: {
        name: "Breakfast",
        calories: -1,
        protein: 30,
        carbs: 60,
        fat: 15,
      },
    } as unknown as Request;
    const mRes = {
      locals: { date: MOCK_DATE },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await mealController.createMeal(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Calories is a required parameter.",
    });
  });

  // Protein Validation
  it("should return 400 - no protein", async () => {
    const mReq = {
      user: { id: "user-uuid-1" },
      body: {
        name: "Breakfast",
        calories: 500,
        protein: undefined,
        carbs: 60,
        fat: 15,
      },
    } as unknown as Request;
    const mRes = {
      locals: { date: MOCK_DATE },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await mealController.createMeal(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Protein is a required parameter.",
    });
  });

  it("should return 400 - protein is not a number", async () => {
    const mReq = {
      user: { id: "user-uuid-1" },
      body: {
        name: "Breakfast",
        calories: 500,
        protein: "undefined",
        carbs: 60,
        fat: 15,
      },
    } as unknown as Request;
    const mRes = {
      locals: { date: MOCK_DATE },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await mealController.createMeal(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Protein is a required parameter.",
    });
  });

  it("should return 400 - protein must be non-negative", async () => {
    const mReq = {
      user: { id: "user-uuid-1" },
      body: {
        name: "Breakfast",
        calories: 500,
        protein: -100,
        carbs: 60,
        fat: 15,
      },
    } as unknown as Request;
    const mRes = {
      locals: { date: MOCK_DATE },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await mealController.createMeal(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Protein is a required parameter.",
    });
  });

  it("should return 400 - protein must be non-negative - boundary", async () => {
    const mReq = {
      user: { id: "user-uuid-1" },
      body: {
        name: "Breakfast",
        calories: 500,
        protein: -1,
        carbs: 60,
        fat: 15,
      },
    } as unknown as Request;
    const mRes = {
      locals: { date: MOCK_DATE },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await mealController.createMeal(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Protein is a required parameter.",
    });
  });

  // Carbs Validation
  it("should return 400 - no carbs", async () => {
    const mReq = {
      user: { id: "user-uuid-1" },
      body: {
        name: "Breakfast",
        calories: 500,
        protein: 80,
        carbs: undefined,
        fat: 15,
      },
    } as unknown as Request;
    const mRes = {
      locals: { date: MOCK_DATE },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await mealController.createMeal(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Carbs is a required parameter.",
    });
  });

  it("should return 400 - carbs must be a number", async () => {
    const mReq = {
      user: { id: "user-uuid-1" },
      body: {
        name: "Breakfast",
        calories: 500,
        protein: 80,
        carbs: "undefined",
        fat: 15,
      },
    } as unknown as Request;
    const mRes = {
      locals: { date: MOCK_DATE },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await mealController.createMeal(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Carbs is a required parameter.",
    });
  });

  it("should return 400 - carbs must be non-negative", async () => {
    const mReq = {
      user: { id: "user-uuid-1" },
      body: {
        name: "Breakfast",
        calories: 500,
        protein: 80,
        carbs: -100,
        fat: 15,
      },
    } as unknown as Request;
    const mRes = {
      locals: { date: MOCK_DATE },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await mealController.createMeal(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Carbs is a required parameter.",
    });
  });

  it("should return 400 - carbs must be non-negative - boundary", async () => {
    const mReq = {
      user: { id: "user-uuid-1" },
      body: {
        name: "Breakfast",
        calories: 500,
        protein: 80,
        carbs: -1,
        fat: 15,
      },
    } as unknown as Request;
    const mRes = {
      locals: { date: MOCK_DATE },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await mealController.createMeal(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Carbs is a required parameter.",
    });
  });

  // Fat Validation
  it("should return 400 - no fat", async () => {
    const mReq = {
      user: { id: "user-uuid-1" },
      body: {
        name: "Breakfast",
        calories: 500,
        protein: 80,
        carbs: 60,
        fat: undefined,
      },
    } as unknown as Request;
    const mRes = {
      locals: { date: MOCK_DATE },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await mealController.createMeal(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Fat is a required parameter.",
    });
  });

  it("should return 400 - fat must be a number", async () => {
    const mReq = {
      user: { id: "user-uuid-1" },
      body: {
        name: "Breakfast",
        calories: 500,
        protein: 80,
        carbs: 60,
        fat: "undefined",
      },
    } as unknown as Request;
    const mRes = {
      locals: { date: MOCK_DATE },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await mealController.createMeal(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Fat is a required parameter.",
    });
  });

  it("should return 400 - fat must be non-negative", async () => {
    const mReq = {
      user: { id: "user-uuid-1" },
      body: {
        name: "Breakfast",
        calories: 500,
        protein: 80,
        carbs: 60,
        fat: -100,
      },
    } as unknown as Request;
    const mRes = {
      locals: { date: MOCK_DATE },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await mealController.createMeal(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Fat is a required parameter.",
    });
  });

  it("should return 400 - fat must be non-negative - boundary", async () => {
    const mReq = {
      user: { id: "user-uuid-1" },
      body: {
        name: "Breakfast",
        calories: 500,
        protein: 80,
        carbs: 60,
        fat: -1,
      },
    } as unknown as Request;
    const mRes = {
      locals: { date: MOCK_DATE },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await mealController.createMeal(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Fat is a required parameter.",
    });
  });

  it("should throw an error when log not found", async () => {
    const mReq = {
      user: { id: "user-uuid-1" },
      body: {
        name: "Breakfast",
        calories: 500,
        protein: 30,
        carbs: 60,
        fat: 15,
      },
    } as unknown as Request;
    const mRes = {
      locals: { date: MOCK_DATE },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    vi.mocked(nutritionService.getNutritionLogByDate).mockRejectedValueOnce(
      new NotFoundError("Log associated to this meal does not exist."),
    );

    await expect(mealController.createMeal(mReq, mRes)).rejects.toThrow(
      NotFoundError,
    );
  });

  it("should throw unknown error", async () => {
    const mReq = {
      user: { id: "user-uuid-1" },
      body: {
        name: "Breakfast",
        calories: 500,
        protein: 30,
        carbs: 60,
        fat: 15,
      },
    } as unknown as Request;
    const mRes = {
      locals: { date: MOCK_DATE },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    vi.mocked(nutritionService.getNutritionLogByDate).mockResolvedValueOnce(
      MOCK_LOG as any,
    );
    vi.mocked(mealService.createMeal).mockRejectedValueOnce("unknown");

    await expect(mealController.createMeal(mReq, mRes)).rejects.toThrow(
      "unknown",
    );
  });

  it("should return 201 - success", async () => {
    const mReq = {
      user: { id: "user-uuid-1" },
      body: {
        name: "Breakfast",
        calories: 500,
        protein: 30,
        carbs: 60,
        fat: 15,
      },
    } as unknown as Request;
    const mRes = {
      locals: { date: MOCK_DATE },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    const mockMeal = {
      id: "meal-uuid-10",
      nutritionLogId: MOCK_LOG_ID,
      name: "Breakfast",
      calories: 500,
      protein: 30,
      carbs: 60,
      fat: 15,
    };
    vi.mocked(nutritionService.getNutritionLogByDate).mockResolvedValueOnce(
      MOCK_LOG as any,
    );
    vi.mocked(mealService.createMeal).mockResolvedValueOnce(mockMeal as any);

    await mealController.createMeal(mReq, mRes);
    expect(mRes.json).toHaveBeenCalledWith(mockMeal);
  });
});

describe("Meal Controller updateMeal", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should return 400 - name cannot be an empty string", async () => {
    const mReq = {
      user: { id: "user-uuid-1" },
      body: { name: "" },
    } as unknown as Request;
    const mRes = {
      locals: { date: MOCK_DATE, mealId: "meal-uuid-1" },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await mealController.updateMeal(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Meal name cannot be an empty string.",
    });
  });

  it("should return 400 - name is wrong type", async () => {
    const mReq = {
      user: { id: "user-uuid-1" },
      body: { name: 123 },
    } as unknown as Request;
    const mRes = {
      locals: { date: MOCK_DATE, mealId: "meal-uuid-1" },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await mealController.updateMeal(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Meal name cannot be an empty string.",
    });
  });

  it("should return 400 - calories is negative", async () => {
    const mReq = {
      user: { id: "user-uuid-1" },
      body: { calories: -1 },
    } as unknown as Request;
    const mRes = {
      locals: { date: MOCK_DATE, mealId: "meal-uuid-1" },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await mealController.updateMeal(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Calories must be a non-negative number.",
    });
  });

  it("should return 400 - calories is wrong type", async () => {
    const mReq = {
      user: { id: "user-uuid-1" },
      body: { calories: "500" },
    } as unknown as Request;
    const mRes = {
      locals: { date: MOCK_DATE, mealId: "meal-uuid-1" },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await mealController.updateMeal(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Calories must be a non-negative number.",
    });
  });

  it("should return 400 - carbs is negative", async () => {
    const mReq = {
      user: { id: "user-uuid-1" },
      body: { carbs: -1 },
    } as unknown as Request;
    const mRes = {
      locals: { date: MOCK_DATE, mealId: "meal-uuid-1" },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await mealController.updateMeal(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Carbs must be a non-negative number.",
    });
  });

  it("should return 400 - carbs is wrong type", async () => {
    const mReq = {
      user: { id: "user-uuid-1" },
      body: { carbs: "60g" },
    } as unknown as Request;
    const mRes = {
      locals: { date: MOCK_DATE, mealId: "meal-uuid-1" },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await mealController.updateMeal(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Carbs must be a non-negative number.",
    });
  });

  it("should return 400 - protein is negative", async () => {
    const mReq = {
      user: { id: "user-uuid-1" },
      body: { protein: -1 },
    } as unknown as Request;
    const mRes = {
      locals: { date: MOCK_DATE, mealId: "meal-uuid-1" },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await mealController.updateMeal(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Protein must be a non-negative number.",
    });
  });

  it("should return 400 - protein is wrong type", async () => {
    const mReq = {
      user: { id: "user-uuid-1" },
      body: { protein: true },
    } as unknown as Request;
    const mRes = {
      locals: { date: MOCK_DATE, mealId: "meal-uuid-1" },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await mealController.updateMeal(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Protein must be a non-negative number.",
    });
  });

  it("should return 400 - fat is negative", async () => {
    const mReq = {
      user: { id: "user-uuid-1" },
      body: { fat: -1 },
    } as unknown as Request;
    const mRes = {
      locals: { date: MOCK_DATE, mealId: "meal-uuid-1" },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await mealController.updateMeal(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Fat must be a non-negative number.",
    });
  });

  it("should return 400 - fat is wrong type", async () => {
    const mReq = {
      user: { id: "user-uuid-1" },
      body: { fat: "15g" },
    } as unknown as Request;
    const mRes = {
      locals: { date: MOCK_DATE, mealId: "meal-uuid-1" },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await mealController.updateMeal(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Fat must be a non-negative number.",
    });
  });

  it("should return 400 - no valid fields provided", async () => {
    const mReq = {
      user: { id: "user-uuid-1" },
      body: {},
    } as unknown as Request;
    const mRes = {
      locals: { date: MOCK_DATE, mealId: "meal-uuid-1" },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await mealController.updateMeal(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "No valid fields were provided to update.",
    });
  });

  it("should throw an error", async () => {
    const mReq = {
      user: { id: "user-uuid-1" },
      body: { name: "Updated Breakfast" },
    } as unknown as Request;
    const mRes = {
      locals: { date: MOCK_DATE, mealId: "meal-uuid-1" },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    vi.mocked(nutritionService.getNutritionLogByDate).mockResolvedValueOnce(
      MOCK_LOG as any,
    );
    vi.mocked(mealService.updateMeal).mockRejectedValueOnce(
      new NotFoundError("Log associated to this meal does not exist."),
    );

    await expect(mealController.updateMeal(mReq, mRes)).rejects.toThrow(
      NotFoundError,
    );
  });

  it("should return 500 - service throws unknown", async () => {
    const mReq = {
      user: { id: "user-uuid-1" },
      body: { name: "Updated Breakfast" },
    } as unknown as Request;
    const mRes = {
      locals: { date: MOCK_DATE, mealId: "meal-uuid-1" },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    vi.mocked(nutritionService.getNutritionLogByDate).mockResolvedValueOnce(
      MOCK_LOG as any,
    );
    vi.mocked(mealService.updateMeal).mockRejectedValueOnce("unknown");

    await expect(mealController.updateMeal(mReq, mRes)).rejects.toThrow(
      "unknown",
    );
  });

  it("should return 200 - partial update (name only)", async () => {
    const mReq = {
      user: { id: "user-uuid-1" },
      body: { name: "Updated Breakfast" },
    } as unknown as Request;
    const mRes = {
      locals: { date: MOCK_DATE, mealId: "meal-uuid-1" },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    const updated = {
      id: "meal-uuid-1",
      nutritionLogId: MOCK_LOG_ID,
      name: "Updated Breakfast",
      calories: 500,
      protein: 30,
      carbs: 60,
      fat: 15,
    };
    vi.mocked(nutritionService.getNutritionLogByDate).mockResolvedValueOnce(
      MOCK_LOG as any,
    );
    vi.mocked(mealService.updateMeal).mockResolvedValueOnce(updated as any);

    await mealController.updateMeal(mReq, mRes);
    expect(mRes.json).toHaveBeenCalledWith(updated);
  });

  it("should return 200 - partial update with zero-value macros (boundary)", async () => {
    // 0 is valid — the check is calories < 0, not calories <= 0
    const mReq = {
      user: { id: "user-uuid-1" },
      body: { calories: 0, protein: 0 },
    } as unknown as Request;
    const mRes = {
      locals: { date: MOCK_DATE, mealId: "meal-uuid-1" },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    const updated = {
      id: "meal-uuid-1",
      nutritionLogId: MOCK_LOG_ID,
      name: "Water Fast",
      calories: 0,
      protein: 0,
      carbs: 60,
      fat: 15,
    };
    vi.mocked(nutritionService.getNutritionLogByDate).mockResolvedValueOnce(
      MOCK_LOG as any,
    );
    vi.mocked(mealService.updateMeal).mockResolvedValueOnce(updated as any);

    await mealController.updateMeal(mReq, mRes);
    expect(mRes.json).toHaveBeenCalledWith(updated);
  });

  it("should return 200 - full update", async () => {
    const mReq = {
      user: { id: "user-uuid-1" },
      body: { name: "New Meal", calories: 300, protein: 25, carbs: 40, fat: 8 },
    } as unknown as Request;
    const mRes = {
      locals: { date: MOCK_DATE, mealId: "meal-uuid-1" },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    const updated = {
      id: "meal-uuid-1",
      nutritionLogId: MOCK_LOG_ID,
      name: "New Meal",
      calories: 300,
      protein: 25,
      carbs: 40,
      fat: 8,
    };
    vi.mocked(nutritionService.getNutritionLogByDate).mockResolvedValueOnce(
      MOCK_LOG as any,
    );
    vi.mocked(mealService.updateMeal).mockResolvedValueOnce(updated as any);

    await mealController.updateMeal(mReq, mRes);
    expect(mRes.json).toHaveBeenCalledWith(updated);
  });
});

describe("Meal Controller deleteMeal", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should return 404 - log or meal not found", async () => {
    const mReq = {
      user: { id: "user-uuid-1" },
    } as unknown as Request;
    const mRes = {
      locals: { date: MOCK_DATE, mealId: "meal-uuid-1" },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    } as unknown as Response;

    vi.mocked(nutritionService.getNutritionLogByDate).mockRejectedValueOnce(
      new NotFoundError("Log associated to this meal does not exist."),
    );

    await expect(mealController.deleteMeal(mReq, mRes)).rejects.toThrow(
      NotFoundError,
    );
  });

  it("should return 500 - service throws unknown", async () => {
    const mReq = {
      user: { id: "user-uuid-1" },
    } as unknown as Request;
    const mRes = {
      locals: { date: MOCK_DATE, mealId: "meal-uuid-1" },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    } as unknown as Response;

    vi.mocked(nutritionService.getNutritionLogByDate).mockResolvedValueOnce(
      MOCK_LOG as any,
    );
    vi.mocked(mealService.deleteMeal).mockRejectedValueOnce("unknown");

    await expect(mealController.deleteMeal(mReq, mRes)).rejects.toThrow(
      "unknown",
    );
  });

  it("should return 204 - success", async () => {
    const mReq = {
      user: { id: "user-uuid-1" },
    } as unknown as Request;
    const mRes = {
      locals: { date: MOCK_DATE, mealId: "meal-uuid-1" },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    } as unknown as Response;

    vi.mocked(nutritionService.getNutritionLogByDate).mockResolvedValueOnce(
      MOCK_LOG as any,
    );
    vi.mocked(mealService.deleteMeal).mockResolvedValueOnce(undefined);

    await mealController.deleteMeal(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(204);
    expect(mRes.send).toHaveBeenCalled();
  });
});
