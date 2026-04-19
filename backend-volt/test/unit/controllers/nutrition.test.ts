// Mock the nutrition service
// This call is hoisted so the service is mocked before the import
vi.mock("../../../src/services/nutrition.service.js");
// Mock the database
// This call is hoisted so the db is mocked before anything else
vi.mock("../../../src/db.js");
import type { Request, Response } from "express";
import { expect, it, describe, vi, beforeEach } from "vitest";
import * as nutritionService from "../../../src/services/nutrition.service.js";
import * as nutritionController from "../../../src/controllers/nutrition.controller.js";
import { NotFoundError, DuplicateEntryError } from "../../../src/errors.js";

describe("Nutrition Controller getAllNutritionLogs", () => {
  beforeEach(() => vi.clearAllMocks());

  // Bad Request paths
  it("should return 400 - no userId", async () => {
    const mReq = {
      user: { id: undefined },
      query: { page: "1", limit: "10" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await nutritionController.getAllNutritionLogs(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Missing required parameters",
    });
  });

  it("should return 400 - page is not a string", async () => {
    const mReq = {
      user: { id: 1 },
      query: { page: 1, limit: "10" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await nutritionController.getAllNutritionLogs(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Missing required parameters",
    });
  });

  it("should return 400 - limit is not a string", async () => {
    const mReq = {
      user: { id: 1 },
      query: { page: "1", limit: 10 },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await nutritionController.getAllNutritionLogs(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Missing required parameters",
    });
  });

  it("should return 400 - parsed page is not a number", async () => {
    const mReq = {
      user: { id: 1 },
      query: { page: "abd", limit: "10" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await nutritionController.getAllNutritionLogs(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Page and limit must be positive integers",
    });
  });

  it("should return 400 - parsed limit is not a number", async () => {
    const mReq = {
      user: { id: 1 },
      query: { page: "1", limit: "abg" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await nutritionController.getAllNutritionLogs(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Page and limit must be positive integers",
    });
  });

  it("should return 400 - parsed page is negative", async () => {
    const mReq = {
      user: { id: 1 },
      query: { page: "-999", limit: "10" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await nutritionController.getAllNutritionLogs(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Page and limit must be positive integers",
    });
  });

  it("should return 400 - parsed page is not positive", async () => {
    const mReq = {
      user: { id: 1 },
      query: { page: "0", limit: "10" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await nutritionController.getAllNutritionLogs(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Page and limit must be positive integers",
    });
  });

  it("should return 400 - parsed limit is negative", async () => {
    const mReq = {
      user: { id: 1 },
      query: { page: "1", limit: "-999" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await nutritionController.getAllNutritionLogs(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Page and limit must be positive integers",
    });
  });

  it("should return 400 - parsed limit is not positive", async () => {
    const mReq = {
      user: { id: 1 },
      query: { page: "1", limit: "0" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await nutritionController.getAllNutritionLogs(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Page and limit must be positive integers",
    });
  });

  it("should return 200 and return 0 nutrition logs", async () => {
    const mReq = {
      user: { id: 1 },
      query: { page: "1", limit: "10" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    vi.mocked(nutritionService.getAllNutritionLogs).mockResolvedValueOnce({
      nutritionLogs: [],
      total: 0,
      page: 1,
      limit: 10,
    } as any);

    await nutritionController.getAllNutritionLogs(mReq, mRes);
    expect(mRes.json).toHaveBeenCalledWith({
      nutritionLogs: [],
      total: 0,
      page: 1,
      limit: 10,
    });
  });

  // Caught Error paths
  it("should return 500 - service throws Error", async () => {
    const mReq = {
      user: { id: 16 },
      query: { page: "1", limit: "5" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    vi.mocked(nutritionService.getAllNutritionLogs).mockRejectedValueOnce(
      new Error("Error fetching nutrition logs from database."),
    );

    await nutritionController.getAllNutritionLogs(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(500);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Error fetching nutrition logs from database.",
    });
  });

  it("should return 500 - service throws unknown", async () => {
    // When the service is mocked to throw a non-Error, the controller's own else
    // branch fires — returning its own message, not the service's.
    const mReq = {
      user: { id: 16 },
      query: { page: "1", limit: "5" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    vi.mocked(nutritionService.getAllNutritionLogs).mockRejectedValueOnce(
      "someunknownvalue",
    );

    await nutritionController.getAllNutritionLogs(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(500);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Unknown error fetching nutrition logs",
    });
  });

  it("should return 200 and return multiple nutrition logs", async () => {
    const mReq = {
      user: { id: 1 },
      query: { page: "1", limit: "10" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    const firstDate = new Date("2026-04-11T14:48:00.000Z");
    const secondDate = new Date("2026-04-13T14:48:00.000Z");

    vi.mocked(nutritionService.getAllNutritionLogs).mockResolvedValueOnce({
      nutritionLogs: [
        { id: 15, userId: 1, date: firstDate },
        { id: 18, userId: 1, date: secondDate },
      ],
      total: 2,
      page: 1,
      limit: 10,
    } as any);

    await nutritionController.getAllNutritionLogs(mReq, mRes);
    expect(mRes.json).toHaveBeenCalledWith({
      nutritionLogs: [
        { id: 15, userId: 1, date: firstDate },
        { id: 18, userId: 1, date: secondDate },
      ],
      total: 2,
      page: 1,
      limit: 10,
    });
  });
});

describe("Nutrition Controller getNutritionLogById", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should return 400 - no userId", async () => {
    const mReq = {
      user: { id: undefined },
      params: { id: "1" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await nutritionController.getNutritionLogById(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Missing required parameters",
    });
  });

  it("should return 400 - no logId", async () => {
    const mReq = {
      user: { id: 1 },
      params: { id: undefined },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await nutritionController.getNutritionLogById(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Missing required parameters",
    });
  });

  it("should return 400 - logId is not a string", async () => {
    const mReq = {
      user: { id: 1 },
      params: { id: 123 },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await nutritionController.getNutritionLogById(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Missing required parameters",
    });
  });

  it("should return 400 - logId is NaN", async () => {
    const mReq = {
      user: { id: 1 },
      params: { id: "abc" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await nutritionController.getNutritionLogById(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({ error: "Invalid log ID" });
  });

  it("should return 404 - log not found", async () => {
    const mReq = {
      user: { id: 1 },
      params: { id: "99" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    vi.mocked(nutritionService.getNutritionLogById).mockRejectedValueOnce(
      new NotFoundError("Nutrition log not found"),
    );

    await nutritionController.getNutritionLogById(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(404);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Nutrition log not found",
    });
  });

  it("should return 500 - service throws Error", async () => {
    const mReq = {
      user: { id: 1 },
      params: { id: "1" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    vi.mocked(nutritionService.getNutritionLogById).mockRejectedValueOnce(
      new Error("Error fetching nutrition log from database."),
    );

    await nutritionController.getNutritionLogById(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(500);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Error fetching nutrition log from database.",
    });
  });

  it("should return 500 - service throws unknown", async () => {
    const mReq = {
      user: { id: 1 },
      params: { id: "1" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    vi.mocked(nutritionService.getNutritionLogById).mockRejectedValueOnce(
      "unknown",
    );

    await nutritionController.getNutritionLogById(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(500);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Unknown error fetching nutrition log",
    });
  });

  it("should return 200 - success", async () => {
    const mReq = {
      user: { id: 1 },
      params: { id: "5" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    const mockLog = {
      id: 5,
      userId: 1,
      date: new Date("2026-04-15T00:00:00.000Z"),
    };
    vi.mocked(nutritionService.getNutritionLogById).mockResolvedValueOnce(
      mockLog as any,
    );

    await nutritionController.getNutritionLogById(mReq, mRes);
    expect(mRes.json).toHaveBeenCalledWith(mockLog);
  });
});

describe("Nutrition Controller createNutritionLog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should return 400 - no userId", async () => {
    const mReq = {
      user: { id: undefined },
      body: { date: "2026-04-15T00:00:00.000Z" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await nutritionController.createNutritionLog(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Missing required parameters",
    });
  });

  it("should return 400 - no date", async () => {
    const mReq = {
      user: { id: 1 },
      body: {},
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await nutritionController.createNutritionLog(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Missing required parameters",
    });
  });

  it("should return 400 - date is not a string", async () => {
    const mReq = {
      user: { id: 1 },
      body: { date: 3242348793 },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await nutritionController.createNutritionLog(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({ error: "Date must be a string" });
  });

  it("should return 400 - date is not in Date format", async () => {
    const mReq = {
      user: { id: 1 },
      body: { date: "3242348793" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await nutritionController.createNutritionLog(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Date must be in ISO 8601 format",
    });
  });

  it("should return 409 - duplicate date", async () => {
    const mReq = {
      user: { id: 1 },
      body: { date: "2026-04-15T00:00:00.000Z" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    vi.mocked(nutritionService.createNutritionLog).mockRejectedValueOnce(
      new DuplicateEntryError("A nutrition log at this date already exists."),
    );

    await nutritionController.createNutritionLog(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(409);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "A nutrition log at this date already exists.",
    });
  });

  it("should return 500 - service throws Error", async () => {
    const mReq = {
      user: { id: 1 },
      body: { date: "2026-04-15T00:00:00.000Z" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    vi.mocked(nutritionService.createNutritionLog).mockRejectedValueOnce(
      new Error("Error creating nutrition log in database."),
    );

    await nutritionController.createNutritionLog(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(500);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Error creating nutrition log in database.",
    });
  });

  it("should return 500 - service throws unknown", async () => {
    const mReq = {
      user: { id: 1 },
      body: { date: "2026-04-15T00:00:00.000Z" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    vi.mocked(nutritionService.createNutritionLog).mockRejectedValueOnce(
      "unknown",
    );

    await nutritionController.createNutritionLog(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(500);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Unknown error creating nutrition log",
    });
  });

  it("should return 201 - success, date is converted to ISO format before service call", async () => {
    // The controller converts the raw date string to a full ISO-8601 timestamp.
    // "2026-04-15" becomes "2026-04-15T00:00:00.000Z" — the service receives the
    // normalised value, not the raw input.
    const mReq = {
      user: { id: 1 },
      body: { date: "2026-04-15" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    const mockLog = {
      id: 7,
      userId: 1,
      date: new Date("2026-04-15T00:00:00.000Z"),
    };
    vi.mocked(nutritionService.createNutritionLog).mockResolvedValueOnce(
      mockLog as any,
    );

    await nutritionController.createNutritionLog(mReq, mRes);

    expect(vi.mocked(nutritionService.createNutritionLog)).toHaveBeenCalledWith(
      {
        userId: 1,
        date: "2026-04-15T00:00:00.000Z",
      },
    );
    expect(mRes.status).toHaveBeenCalledWith(201);
    expect(mRes.json).toHaveBeenCalledWith(mockLog);
  });
});

describe("Nutrition Controller updateNutritionLog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should return 400 - no userId", async () => {
    const mReq = {
      user: { id: undefined },
      params: { id: "5" },
      body: { date: "2026-04-15T00:00:00.000Z" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await nutritionController.updateNutritionLog(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Missing required parameters",
    });
  });

  it("should return 400 - no logId", async () => {
    const mReq = {
      user: { id: undefined },
      params: { id: undefined },
      body: { date: "2026-04-15T00:00:00.000Z" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await nutritionController.updateNutritionLog(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Missing required parameters",
    });
  });

  it("should return 400 - no date", async () => {
    const mReq = {
      user: { id: 1 },
      params: { id: "5" },
      body: {},
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await nutritionController.updateNutritionLog(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Missing required parameters",
    });
  });

  it("should return 400 - logId is not a string", async () => {
    const mReq = {
      user: { id: undefined },
      params: { id: 12335243 },
      body: { date: "2026-04-15T00:00:00.000Z" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await nutritionController.updateNutritionLog(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Missing required parameters",
    });
  });

  it("should return 400 - date is not a string", async () => {
    const mReq = {
      user: { id: undefined },
      params: { id: "5" },
      body: { date: 324252343 },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await nutritionController.updateNutritionLog(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Missing required parameters",
    });
  });

  it("should return 400 - logId is NaN", async () => {
    const mReq = {
      user: { id: 1 },
      params: { id: "abc" },
      body: { date: "2026-04-15T00:00:00.000Z" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await nutritionController.updateNutritionLog(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({ error: "Invalid log ID" });
  });

  it("should return 400 - date is not valid ISO 8601", async () => {
    const mReq = {
      user: { id: 1 },
      params: { id: "5" },
      body: { date: "not-a-real-date" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await nutritionController.updateNutritionLog(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Date must be in ISO 8601 format",
    });
  });

  it("should return 404 - log not found", async () => {
    const mReq = {
      user: { id: 1 },
      params: { id: "5" },
      body: { date: "2026-04-15T00:00:00.000Z" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    vi.mocked(nutritionService.updateNutritionLog).mockRejectedValueOnce(
      new NotFoundError("Nutrition log not found."),
    );

    await nutritionController.updateNutritionLog(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(404);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Nutrition log not found.",
    });
  });

  it("should return 409 - log with provided date already exists for the user", async () => {
    const mReq = {
      user: { id: 1 },
      params: { id: "5" },
      body: { date: "2026-04-16T00:00:00.000Z" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    vi.mocked(nutritionService.updateNutritionLog).mockRejectedValueOnce(
      new DuplicateEntryError("Nutrition log with this date already exists."),
    );

    await nutritionController.updateNutritionLog(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(409);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Nutrition log with this date already exists.",
    });
  });

  it("should return 500 - service throws Error", async () => {
    const mReq = {
      user: { id: 1 },
      params: { id: "5" },
      body: { date: "2026-04-15T00:00:00.000Z" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    vi.mocked(nutritionService.updateNutritionLog).mockRejectedValueOnce(
      new Error("Error updating nutrition log in database."),
    );

    await nutritionController.updateNutritionLog(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(500);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Error updating nutrition log in database.",
    });
  });

  it("should return 500 - service throws unknown", async () => {
    const mReq = {
      user: { id: 1 },
      params: { id: "5" },
      body: { date: "2026-04-15T00:00:00.000Z" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    vi.mocked(nutritionService.updateNutritionLog).mockRejectedValueOnce(
      "unknown",
    );

    await nutritionController.updateNutritionLog(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(500);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Unknown error updating nutrition log",
    });
  });

  it("should return 200 - success, date is converted to ISO format before service call", async () => {
    const mReq = {
      user: { id: 1 },
      params: { id: "5" },
      body: { date: "2026-04-16" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    const mockLog = {
      id: 5,
      userId: 1,
      date: new Date("2026-04-16T00:00:00.000Z"),
    };
    vi.mocked(nutritionService.updateNutritionLog).mockResolvedValueOnce(
      mockLog as any,
    );

    await nutritionController.updateNutritionLog(mReq, mRes);

    expect(vi.mocked(nutritionService.updateNutritionLog)).toHaveBeenCalledWith(
      5,
      1,
      { date: "2026-04-16T00:00:00.000Z" },
    );
    expect(mRes.json).toHaveBeenCalledWith(mockLog);
  });
});

describe("Nutrition Controller deleteNutritionLog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should return 400 - no userId", async () => {
    const mReq = {
      user: { id: undefined },
      params: { id: "5" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await nutritionController.deleteNutritionLog(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Missing required parameters",
    });
  });

  it("should return 400 - no logId", async () => {
    const mReq = {
      user: { id: 1 },
      params: { id: undefined },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await nutritionController.deleteNutritionLog(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Missing required parameters",
    });
  });

  it("should return 400 - logId is not a string", async () => {
    const mReq = {
      user: { id: 1 },
      params: { id: 8749371 },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await nutritionController.deleteNutritionLog(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Missing required parameters",
    });
  });

  it("should return 400 - logId is NaN", async () => {
    const mReq = {
      user: { id: 1 },
      params: { id: "abc" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await nutritionController.deleteNutritionLog(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({ error: "Invalid log ID" });
  });

  it("should return 404 - log not found", async () => {
    const mReq = {
      user: { id: 1 },
      params: { id: "5" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    } as unknown as Response;

    vi.mocked(nutritionService.deleteNutritionLog).mockRejectedValueOnce(
      new NotFoundError("Nutrition log not found."),
    );

    await nutritionController.deleteNutritionLog(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(404);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Nutrition log not found.",
    });
  });

  it("should return 500 - service throws Error", async () => {
    const mReq = {
      user: { id: 1 },
      params: { id: "5" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    } as unknown as Response;

    vi.mocked(nutritionService.deleteNutritionLog).mockRejectedValueOnce(
      new Error("Error deleting nutrition log from database."),
    );

    await nutritionController.deleteNutritionLog(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(500);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Error deleting nutrition log from database.",
    });
  });

  it("should return 500 - service throws unknown", async () => {
    const mReq = {
      user: { id: 1 },
      params: { id: "5" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    } as unknown as Response;

    vi.mocked(nutritionService.deleteNutritionLog).mockRejectedValueOnce(
      "unknown",
    );

    await nutritionController.deleteNutritionLog(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(500);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Unknown error deleting nutrition log",
    });
  });

  it("should return 204 - success", async () => {
    const mReq = {
      user: { id: 1 },
      params: { id: "5" },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    } as unknown as Response;

    vi.mocked(nutritionService.deleteNutritionLog).mockResolvedValueOnce(
      undefined,
    );

    await nutritionController.deleteNutritionLog(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(204);
    expect(mRes.send).toHaveBeenCalled();
  });
});
