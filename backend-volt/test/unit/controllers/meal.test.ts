// Mock the meal service
// This call is hoisted so the service is mocked before the import
vi.mock("../../../src/services/meal.service.js");
// Mock the database
// This call is hoisted so the db is mocked before anything else
vi.mock("../../../src/db.js");
import type { Request, Response } from "express";
import { expect, it, describe, vi, beforeEach } from "vitest";
import * as mealService from "../../../src/services/meal.service.js";
import * as mealController from "../../../src/controllers/meal.controller.js";
import { NotFoundError } from "../../../src/errors.js";

describe("Meal Controller getAllMeals", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should return 400 - no userId", async () => {
    const mReq = {
      user: { id: undefined },
      params: { logId: "1" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await mealController.getAllMeals(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Missing required parameters",
    });
  });

  it("should return 400 - no logId", async () => {
    const mReq = {
      user: { id: 167 },
      params: { logId: undefined },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await mealController.getAllMeals(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Missing required parameters",
    });
  });

  it("should return 400 - logId is not a string", async () => {
    const mReq = {
      user: { id: 167 },
      params: { logId: 823784962 },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await mealController.getAllMeals(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Missing required parameters",
    });
  });

  it("should return 400 - logId is NaN", async () => {
    const mReq = {
      user: { id: 1 },
      params: { logId: "abc" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await mealController.getAllMeals(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({ error: "Invalid log ID" });
  });

  it("should return 404 - log not found", async () => {
    const mReq = {
      user: { id: 1 },
      params: { logId: "5" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    vi.mocked(mealService.getAllMeals).mockRejectedValueOnce(
      new NotFoundError("Log with id: 5 not found."),
    );

    await mealController.getAllMeals(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(404);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Log with id: 5 not found.",
    });
  });

  it("should return 500 - service throws Error", async () => {
    const mReq = {
      user: { id: 1 },
      params: { logId: "5" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    vi.mocked(mealService.getAllMeals).mockRejectedValueOnce(
      new Error("Error retrieving meals for this log."),
    );

    await mealController.getAllMeals(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(500);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Error retrieving meals for this log.",
    });
  });

  it("should return 500 - service throws unknown", async () => {
    const mReq = {
      user: { id: 1 },
      params: { logId: "5" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    vi.mocked(mealService.getAllMeals).mockRejectedValueOnce(
      "unknown error value",
    );

    await mealController.getAllMeals(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(500);
    expect(mRes.json).toHaveBeenCalledWith({ error: "Unknown error." });
  });

  it("should return 200 - empty meals list", async () => {
    const mReq = {
      user: { id: 1 },
      params: { logId: "5" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    vi.mocked(mealService.getAllMeals).mockResolvedValueOnce([]);

    await mealController.getAllMeals(mReq, mRes);
    expect(mRes.json).toHaveBeenCalledWith([]);
  });

  it("should return 200 - multiple meals", async () => {
    const mReq = {
      user: { id: 1 },
      params: { logId: "5" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    const mockMeals = [
      {
        id: 1,
        nutritionLogId: 5,
        name: "Breakfast",
        calories: 500,
        protein: 30,
        carbs: 60,
        fat: 15,
      },
      {
        id: 2,
        nutritionLogId: 5,
        name: "Lunch",
        calories: 700,
        protein: 40,
        carbs: 80,
        fat: 20,
      },
    ];
    vi.mocked(mealService.getAllMeals).mockResolvedValueOnce(mockMeals as any);

    await mealController.getAllMeals(mReq, mRes);
    expect(mRes.json).toHaveBeenCalledWith(mockMeals);
  });
});

describe("Meal Controller getMealById", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should return 400 - no userId", async () => {
    const mReq = {
      user: { id: undefined },
      params: { logId: "5", mealId: "1" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await mealController.getMealById(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Missing required parameters",
    });
  });

  it("should return 400 - no logId", async () => {
    const mReq = {
      user: { id: 5 },
      params: { logId: undefined, mealId: "1" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await mealController.getMealById(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Missing required parameters",
    });
  });

  it("should return 400 - no mealId", async () => {
    const mReq = {
      user: { id: 1 },
      params: { logId: "5", mealId: undefined },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await mealController.getMealById(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Missing required parameters",
    });
  });

  it("should return 400 - logId is not a string", async () => {
    const mReq = {
      user: { id: 1 },
      params: { logId: 324397, mealId: undefined },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await mealController.getMealById(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Missing required parameters",
    });
  });

  it("should return 400 - mealId is not a string", async () => {
    const mReq = {
      user: { id: 1 },
      params: { logId: "324397", mealId: undefined },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await mealController.getMealById(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Missing required parameters",
    });
  });

  it("should return 400 - logId is NaN", async () => {
    const mReq = {
      user: { id: 1 },
      params: { logId: "abc", mealId: "1" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await mealController.getMealById(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({ error: "Invalid log ID" });
  });

  it("should return 400 - mealId is NaN", async () => {
    const mReq = {
      user: { id: 1 },
      params: { logId: "5", mealId: "xyz" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await mealController.getMealById(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({ error: "Invalid meal ID" });
  });

  it("should return 404 - log not found", async () => {
    const mReq = {
      user: { id: 1 },
      params: { logId: "5", mealId: "1" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    vi.mocked(mealService.getMealById).mockRejectedValueOnce(
      new NotFoundError("Log with id: 5 not found."),
    );

    await mealController.getMealById(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(404);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Log with id: 5 not found.",
    });
  });

  it("should return 404 - meal not found", async () => {
    const mReq = {
      user: { id: 1 },
      params: { logId: "5", mealId: "1" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    vi.mocked(mealService.getMealById).mockRejectedValueOnce(
      new NotFoundError("Meal with id: 1 not found."),
    );

    await mealController.getMealById(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(404);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Meal with id: 1 not found.",
    });
  });

  it("should return 500 - service throws Error", async () => {
    const mReq = {
      user: { id: 1 },
      params: { logId: "5", mealId: "1" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    vi.mocked(mealService.getMealById).mockRejectedValueOnce(
      new Error("Error retrieving meals for this log."),
    );

    await mealController.getMealById(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(500);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Error retrieving meals for this log.",
    });
  });

  it("should return 500 - service throws unknown", async () => {
    const mReq = {
      user: { id: 1 },
      params: { logId: "5", mealId: "1" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    vi.mocked(mealService.getMealById).mockRejectedValueOnce("unknown");

    await mealController.getMealById(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(500);
    expect(mRes.json).toHaveBeenCalledWith({ error: "Unknown error." });
  });

  it("should return 200 - success", async () => {
    const mReq = {
      user: { id: 1 },
      params: { logId: "5", mealId: "1" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    const mockMeal = {
      id: 1,
      nutritionLogId: 5,
      name: "Breakfast",
      calories: 500,
      protein: 30,
      carbs: 60,
      fat: 15,
    };
    vi.mocked(mealService.getMealById).mockResolvedValueOnce(mockMeal as any);

    await mealController.getMealById(mReq, mRes);
    expect(mRes.json).toHaveBeenCalledWith(mockMeal);
  });
});

describe("Meal Controller createMeal", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should return 400 - no userId", async () => {
    const mReq = {
      user: { id: undefined },
      params: { logId: "5" },
      body: {
        name: "Breakfast",
        calories: 500,
        protein: 30,
        carbs: 60,
        fat: 15,
      },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await mealController.createMeal(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Missing required parameters",
    });
  });

  it("should return 400 - no logId", async () => {
    const mReq = {
      user: { id: 2345345 },
      params: { logId: undefined },
      body: {
        name: "Breakfast",
        calories: 500,
        protein: 30,
        carbs: 60,
        fat: 15,
      },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await mealController.createMeal(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Missing required parameters",
    });
  });

  it("should return 400 - logId is not a string", async () => {
    const mReq = {
      user: { id: 2345345 },
      params: { logId: 4798534 },
      body: {
        name: "Breakfast",
        calories: 500,
        protein: 30,
        carbs: 60,
        fat: 15,
      },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await mealController.createMeal(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Missing required parameters",
    });
  });

  it("should return 400 - logId is NaN", async () => {
    const mReq = {
      user: { id: 1 },
      params: { logId: "xyz" },
      body: {
        name: "Breakfast",
        calories: 500,
        protein: 30,
        carbs: 60,
        fat: 15,
      },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await mealController.createMeal(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({ error: "Invalid log ID" });
  });

  // Name Validation
  it("should return 400 - no name", async () => {
    const mReq = {
      user: { id: 1 },
      params: { logId: "453" },
      body: {
        name: undefined,
        calories: 500,
        protein: 30,
        carbs: 60,
        fat: 15,
      },
    } as unknown as Request;
    const mRes = {
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
      user: { id: 1 },
      params: { logId: "453" },
      body: {
        name: 32456,
        calories: 500,
        protein: 30,
        carbs: 60,
        fat: 15,
      },
    } as unknown as Request;
    const mRes = {
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
      user: { id: 1 },
      params: { logId: "453" },
      body: {
        name: "",
        calories: 500,
        protein: 30,
        carbs: 60,
        fat: 15,
      },
    } as unknown as Request;
    const mRes = {
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
      user: { id: 1 },
      params: { logId: "453" },
      body: {
        name: "Breakfast",
        calories: undefined,
        protein: 30,
        carbs: 60,
        fat: 15,
      },
    } as unknown as Request;
    const mRes = {
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
      user: { id: 1 },
      params: { logId: "453" },
      body: {
        name: "Breakfast",
        calories: "undefined",
        protein: 30,
        carbs: 60,
        fat: 15,
      },
    } as unknown as Request;
    const mRes = {
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
      user: { id: 1 },
      params: { logId: "453" },
      body: {
        name: "Breakfast",
        calories: -100,
        protein: 30,
        carbs: 60,
        fat: 15,
      },
    } as unknown as Request;
    const mRes = {
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
      user: { id: 1 },
      params: { logId: "453" },
      body: {
        name: "Breakfast",
        calories: -1,
        protein: 30,
        carbs: 60,
        fat: 15,
      },
    } as unknown as Request;
    const mRes = {
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
      user: { id: 1 },
      params: { logId: "453" },
      body: {
        name: "Breakfast",
        calories: 500,
        protein: undefined,
        carbs: 60,
        fat: 15,
      },
    } as unknown as Request;
    const mRes = {
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
      user: { id: 1 },
      params: { logId: "453" },
      body: {
        name: "Breakfast",
        calories: 500,
        protein: "undefined",
        carbs: 60,
        fat: 15,
      },
    } as unknown as Request;
    const mRes = {
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
      user: { id: 1 },
      params: { logId: "453" },
      body: {
        name: "Breakfast",
        calories: 500,
        protein: -100,
        carbs: 60,
        fat: 15,
      },
    } as unknown as Request;
    const mRes = {
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
      user: { id: 1 },
      params: { logId: "453" },
      body: {
        name: "Breakfast",
        calories: 500,
        protein: -1,
        carbs: 60,
        fat: 15,
      },
    } as unknown as Request;
    const mRes = {
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
      user: { id: 1 },
      params: { logId: "453" },
      body: {
        name: "Breakfast",
        calories: 500,
        protein: 80,
        carbs: undefined,
        fat: 15,
      },
    } as unknown as Request;
    const mRes = {
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
      user: { id: 1 },
      params: { logId: "453" },
      body: {
        name: "Breakfast",
        calories: 500,
        protein: 80,
        carbs: "undefined",
        fat: 15,
      },
    } as unknown as Request;
    const mRes = {
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
      user: { id: 1 },
      params: { logId: "453" },
      body: {
        name: "Breakfast",
        calories: 500,
        protein: 80,
        carbs: -100,
        fat: 15,
      },
    } as unknown as Request;
    const mRes = {
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
      user: { id: 1 },
      params: { logId: "453" },
      body: {
        name: "Breakfast",
        calories: 500,
        protein: 80,
        carbs: -1,
        fat: 15,
      },
    } as unknown as Request;
    const mRes = {
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
  it("should return 400 - no carbs", async () => {
    const mReq = {
      user: { id: 1 },
      params: { logId: "453" },
      body: {
        name: "Breakfast",
        calories: 500,
        protein: 80,
        carbs: 60,
        fat: undefined,
      },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await mealController.createMeal(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Fat is a required parameter.",
    });
  });

  it("should return 400 - carbs must be a number", async () => {
    const mReq = {
      user: { id: 1 },
      params: { logId: "453" },
      body: {
        name: "Breakfast",
        calories: 500,
        protein: 80,
        carbs: 60,
        fat: "undefined",
      },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await mealController.createMeal(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Fat is a required parameter.",
    });
  });

  it("should return 400 - carbs must be non-negative", async () => {
    const mReq = {
      user: { id: 1 },
      params: { logId: "453" },
      body: {
        name: "Breakfast",
        calories: 500,
        protein: 80,
        carbs: 60,
        fat: -100,
      },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await mealController.createMeal(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Fat is a required parameter.",
    });
  });

  it("should return 400 - carbs must be non-negative - boundary", async () => {
    const mReq = {
      user: { id: 1 },
      params: { logId: "453" },
      body: {
        name: "Breakfast",
        calories: 500,
        protein: 80,
        carbs: 60,
        fat: -1,
      },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await mealController.createMeal(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Fat is a required parameter.",
    });
  });

  it("should return 500 - service NotFoundError falls through to 500", async () => {
    // createMeal controller has no NotFoundError handler, so it hits instanceof Error → 500
    const mReq = {
      user: { id: 1 },
      params: { logId: "999" },
      body: {
        name: "Breakfast",
        calories: 500,
        protein: 30,
        carbs: 60,
        fat: 15,
      },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    vi.mocked(mealService.createMeal).mockRejectedValueOnce(
      new NotFoundError("Log associated to this meal does not exist."),
    );

    await mealController.createMeal(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(500);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Log associated to this meal does not exist.",
    });
  });

  it("should return 500 - service throws Error", async () => {
    const mReq = {
      user: { id: 1 },
      params: { logId: "5" },
      body: {
        name: "Breakfast",
        calories: 500,
        protein: 30,
        carbs: 60,
        fat: 15,
      },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    vi.mocked(mealService.createMeal).mockRejectedValueOnce(
      new Error("Error creating meal in the database."),
    );

    await mealController.createMeal(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(500);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Error creating meal in the database.",
    });
  });

  it("should return 500 - service throws unknown", async () => {
    const mReq = {
      user: { id: 1 },
      params: { logId: "5" },
      body: {
        name: "Breakfast",
        calories: 500,
        protein: 30,
        carbs: 60,
        fat: 15,
      },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    vi.mocked(mealService.createMeal).mockRejectedValueOnce("unknown");

    await mealController.createMeal(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(500);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Unknown error encountered when creating a meal.",
    });
  });

  it("should return 200 - success", async () => {
    const mReq = {
      user: { id: 1 },
      params: { logId: "5" },
      body: {
        name: "Breakfast",
        calories: 500,
        protein: 30,
        carbs: 60,
        fat: 15,
      },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    const mockMeal = {
      id: 10,
      nutritionLogId: 5,
      name: "Breakfast",
      calories: 500,
      protein: 30,
      carbs: 60,
      fat: 15,
    };
    vi.mocked(mealService.createMeal).mockResolvedValueOnce(mockMeal as any);

    await mealController.createMeal(mReq, mRes);
    expect(mRes.json).toHaveBeenCalledWith(mockMeal);
  });
});

describe("Meal Controller updateMeal", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should return 400 - no userId", async () => {
    const mReq = {
      user: { id: undefined },
      params: { logId: "5", mealId: "1" },
      body: { name: "Dinner" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await mealController.updateMeal(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Missing required parameters",
    });
  });

  it("should return 400 - no logId", async () => {
    const mReq = {
      user: { id: 2345 },
      params: { logId: undefined, mealId: "1" },
      body: { name: "Dinner" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await mealController.updateMeal(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Missing required parameters",
    });
  });

  it("should return 400 - no mealId", async () => {
    const mReq = {
      user: { id: 2345 },
      params: { logId: "234", mealId: undefined },
      body: { name: "Dinner" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await mealController.updateMeal(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Missing required parameters",
    });
  });

  it("should return 400 - logId is NaN", async () => {
    const mReq = {
      user: { id: 1 },
      params: { logId: "abc", mealId: "1" },
      body: { name: "Dinner" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await mealController.updateMeal(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({ error: "Invalid log ID" });
  });

  it("should return 400 - mealId is NaN", async () => {
    const mReq = {
      user: { id: 1 },
      params: { logId: "5", mealId: "xyz" },
      body: { name: "Dinner" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await mealController.updateMeal(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({ error: "Invalid meal ID" });
  });

  it("should return 400 - name cannot be an empty string", async () => {
    const mReq = {
      user: { id: 1 },
      params: { logId: "5", mealId: "1" },
      body: { name: "" },
    } as unknown as Request;
    const mRes = {
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
      user: { id: 1 },
      params: { logId: "5", mealId: "1" },
      body: { name: 123 },
    } as unknown as Request;
    const mRes = {
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
      user: { id: 1 },
      params: { logId: "5", mealId: "1" },
      body: { calories: -1 },
    } as unknown as Request;
    const mRes = {
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
      user: { id: 1 },
      params: { logId: "5", mealId: "1" },
      body: { calories: "500" },
    } as unknown as Request;
    const mRes = {
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
      user: { id: 1 },
      params: { logId: "5", mealId: "1" },
      body: { carbs: -1 },
    } as unknown as Request;
    const mRes = {
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
      user: { id: 1 },
      params: { logId: "5", mealId: "1" },
      body: { carbs: "60g" },
    } as unknown as Request;
    const mRes = {
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
      user: { id: 1 },
      params: { logId: "5", mealId: "1" },
      body: { protein: -1 },
    } as unknown as Request;
    const mRes = {
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
      user: { id: 1 },
      params: { logId: "5", mealId: "1" },
      body: { protein: true },
    } as unknown as Request;
    const mRes = {
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
      user: { id: 1 },
      params: { logId: "5", mealId: "1" },
      body: { fat: -1 },
    } as unknown as Request;
    const mRes = {
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
      user: { id: 1 },
      params: { logId: "5", mealId: "1" },
      body: { fat: "15g" },
    } as unknown as Request;
    const mRes = {
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
      user: { id: 1 },
      params: { logId: "5", mealId: "1" },
      body: {},
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await mealController.updateMeal(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "No valid fields were provided to update.",
    });
  });

  it("should return 404 - log not found", async () => {
    const mReq = {
      user: { id: 1 },
      params: { logId: "5", mealId: "1" },
      body: { name: "Updated Breakfast" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    vi.mocked(mealService.updateMeal).mockRejectedValueOnce(
      new NotFoundError("Log associated to this meal does not exist."),
    );

    await mealController.updateMeal(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(404);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Log associated to this meal does not exist.",
    });
  });

  it("should return 404 - meal not found", async () => {
    const mReq = {
      user: { id: 1 },
      params: { logId: "5", mealId: "1" },
      body: { name: "Updated Breakfast" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    vi.mocked(mealService.updateMeal).mockRejectedValueOnce(
      new NotFoundError("Meal to update not found."),
    );

    await mealController.updateMeal(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(404);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Meal to update not found.",
    });
  });

  it("should return 500 - service throws Error", async () => {
    const mReq = {
      user: { id: 1 },
      params: { logId: "5", mealId: "1" },
      body: { name: "Updated Breakfast" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    vi.mocked(mealService.updateMeal).mockRejectedValueOnce(
      new Error("Error occurred during update to the meal."),
    );

    await mealController.updateMeal(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(500);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Error occurred during update to the meal.",
    });
  });

  it("should return 500 - service throws unknown", async () => {
    const mReq = {
      user: { id: 1 },
      params: { logId: "5", mealId: "1" },
      body: { name: "Updated Breakfast" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    vi.mocked(mealService.updateMeal).mockRejectedValueOnce("unknown");

    await mealController.updateMeal(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(500);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Unknown error occurred during meal update.",
    });
  });

  it("should return 200 - partial update (name only)", async () => {
    const mReq = {
      user: { id: 1 },
      params: { logId: "5", mealId: "1" },
      body: { name: "Updated Breakfast" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    const updated = {
      id: 1,
      nutritionLogId: 5,
      name: "Updated Breakfast",
      calories: 500,
      protein: 30,
      carbs: 60,
      fat: 15,
    };
    vi.mocked(mealService.updateMeal).mockResolvedValueOnce(updated as any);

    await mealController.updateMeal(mReq, mRes);
    expect(mRes.json).toHaveBeenCalledWith(updated);
  });

  it("should return 200 - partial update with zero-value macros (boundary)", async () => {
    // 0 is valid — the check is calories < 0, not calories <= 0
    const mReq = {
      user: { id: 1 },
      params: { logId: "5", mealId: "1" },
      body: { calories: 0, protein: 0 },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    const updated = {
      id: 1,
      nutritionLogId: 5,
      name: "Water Fast",
      calories: 0,
      protein: 0,
      carbs: 60,
      fat: 15,
    };
    vi.mocked(mealService.updateMeal).mockResolvedValueOnce(updated as any);

    await mealController.updateMeal(mReq, mRes);
    expect(mRes.json).toHaveBeenCalledWith(updated);
  });

  it("should return 200 - full update", async () => {
    const mReq = {
      user: { id: 1 },
      params: { logId: "5", mealId: "1" },
      body: { name: "New Meal", calories: 300, protein: 25, carbs: 40, fat: 8 },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    const updated = {
      id: 1,
      nutritionLogId: 5,
      name: "New Meal",
      calories: 300,
      protein: 25,
      carbs: 40,
      fat: 8,
    };
    vi.mocked(mealService.updateMeal).mockResolvedValueOnce(updated as any);

    await mealController.updateMeal(mReq, mRes);
    expect(mRes.json).toHaveBeenCalledWith(updated);
  });
});

describe("Meal Controller deleteMeal", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should return 400 - no userId", async () => {
    const mReq = {
      user: { id: undefined },
      params: { logId: "5", mealId: "1" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await mealController.deleteMeal(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Missing required parameters",
    });
  });

  it("should return 400 - no logId", async () => {
    const mReq = {
      user: { id: 234543 },
      params: { logId: undefined, mealId: "1" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await mealController.deleteMeal(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Missing required parameters",
    });
  });

  it("should return 400 - no mealId", async () => {
    const mReq = {
      user: { id: 2343 },
      params: { logId: "5", mealId: undefined },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await mealController.deleteMeal(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Missing required parameters",
    });
  });

  it("should return 400 - logId is wrong type", async () => {
    const mReq = {
      user: { id: 234543 },
      params: { logId: 1231234, mealId: "1" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await mealController.deleteMeal(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Missing required parameters",
    });
  });

  it("should return 400 - mealId is wrong type", async () => {
    const mReq = {
      user: { id: 2343 },
      params: { logId: "5", mealId: 456456 },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await mealController.deleteMeal(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Missing required parameters",
    });
  });

  it("should return 400 - logId is NaN", async () => {
    const mReq = {
      user: { id: 1 },
      params: { logId: "abc", mealId: "1" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await mealController.deleteMeal(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({ error: "Invalid log ID" });
  });

  it("should return 400 - mealId is NaN", async () => {
    const mReq = {
      user: { id: 1 },
      params: { logId: "5", mealId: "xyz" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await mealController.deleteMeal(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({ error: "Invalid meal ID" });
  });

  it("should return 404 - log not found", async () => {
    const mReq = {
      user: { id: 1 },
      params: { logId: "5", mealId: "1" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    } as unknown as Response;

    vi.mocked(mealService.deleteMeal).mockRejectedValueOnce(
      new NotFoundError("Log associated to this meal does not exist."),
    );

    await mealController.deleteMeal(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(404);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Log associated to this meal does not exist.",
    });
  });

  it("should return 404 - meal not found", async () => {
    const mReq = {
      user: { id: 1 },
      params: { logId: "5", mealId: "1" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    } as unknown as Response;

    vi.mocked(mealService.deleteMeal).mockRejectedValueOnce(
      new NotFoundError("Meal to delete not found."),
    );

    await mealController.deleteMeal(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(404);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Meal to delete not found.",
    });
  });

  it("should return 500 - service throws Error", async () => {
    const mReq = {
      user: { id: 1 },
      params: { logId: "5", mealId: "1" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    } as unknown as Response;

    vi.mocked(mealService.deleteMeal).mockRejectedValueOnce(
      new Error("Error occurred during delete of the meal."),
    );

    await mealController.deleteMeal(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(500);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Error occurred during delete of the meal.",
    });
  });

  it("should return 500 - service throws unknown", async () => {
    const mReq = {
      user: { id: 1 },
      params: { logId: "5", mealId: "1" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    } as unknown as Response;

    vi.mocked(mealService.deleteMeal).mockRejectedValueOnce("unknown");

    await mealController.deleteMeal(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(500);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Unknown error occurred during meal update.",
    });
  });

  it("should return 204 - success", async () => {
    const mReq = {
      user: { id: 1 },
      params: { logId: "5", mealId: "1" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    } as unknown as Response;

    vi.mocked(mealService.deleteMeal).mockResolvedValueOnce(undefined);

    await mealController.deleteMeal(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(204);
    expect(mRes.send).toHaveBeenCalled();
  });
});
