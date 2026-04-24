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
  it("should return 200 and return 0 nutrition logs", async () => {
    const mReq = {
      user: { id: 1 },
      pagination: { page: 1, limit: 10 },
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
      pagination: { page: 1, limit: 5 },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    vi.mocked(nutritionService.getAllNutritionLogs).mockRejectedValueOnce(
      new Error("Server error."),
    );

    await expect(
      nutritionController.getAllNutritionLogs(mReq, mRes),
    ).rejects.toThrow(Error);
  });

  it("should throw unknown error", async () => {
    const mReq = {
      user: { id: 16 },
      pagination: { page: 1, limit: 10 },
    } as unknown as Request;
    const mRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    vi.mocked(nutritionService.getAllNutritionLogs).mockRejectedValueOnce(
      "someunknownvalue",
    );

    await expect(
      nutritionController.getAllNutritionLogs(mReq, mRes),
    ).rejects.toThrow("someunknownvalue");
  });

  it("should return 200 and return multiple nutrition logs", async () => {
    const mReq = {
      user: { id: 1 },
      pagination: { page: 1, limit: 10 },
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

  it("should throw error", async () => {
    const mReq = {
      user: { id: 1 },
    } as unknown as Request;
    const mRes = {
      locals: { logId: 1 },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    vi.mocked(nutritionService.getNutritionLogById).mockRejectedValueOnce(
      new Error("Error fetching nutrition log from database."),
    );

    await expect(
      nutritionController.getNutritionLogById(mReq, mRes),
    ).rejects.toThrow(Error);
  });

  it("should throw unknown error", async () => {
    const mReq = {
      user: { id: 1 },
    } as unknown as Request;
    const mRes = {
      locals: { logId: 1 },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    vi.mocked(nutritionService.getNutritionLogById).mockRejectedValueOnce(
      "unknown",
    );

    await expect(
      nutritionController.getNutritionLogById(mReq, mRes),
    ).rejects.toThrow("unknown");
  });

  it("should return 200 - success", async () => {
    const mReq = {
      user: { id: 1 },
    } as unknown as Request;
    const mRes = {
      locals: { logId: 5 },
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

  it("should throw error", async () => {
    const mReq = {
      user: { id: 1 },
    } as unknown as Request;
    const mRes = {
      locals: { date: "2026-04-12T00:00:00.000Z" },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    vi.mocked(nutritionService.createNutritionLog).mockRejectedValueOnce(
      new Error("Error creating nutrition log in database."),
    );

    await expect(
      nutritionController.createNutritionLog(mReq, mRes),
    ).rejects.toThrow(Error);
  });

  it("should throw unknown error", async () => {
    const mReq = {
      user: { id: 1 },
    } as unknown as Request;
    const mRes = {
      locals: { date: "2026-04-20T00:00:00.000Z" },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    vi.mocked(nutritionService.createNutritionLog).mockRejectedValueOnce(
      456345,
    );

    await expect(
      nutritionController.createNutritionLog(mReq, mRes),
    ).rejects.toThrow(456345);
  });

  it("should return 201 - success, date is converted to ISO format before service call", async () => {
    // The controller converts the raw date string to a full ISO-8601 timestamp.
    // "2026-04-15" becomes "2026-04-15T00:00:00.000Z" — the service receives the
    // normalized value, not the raw input.
    const mReq = {
      user: { id: 1 },
    } as unknown as Request;
    const mRes = {
      locals: { logId: 7, date: "2026-04-15T00:00:00.000Z" },
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

  it("should return 400 - no date", async () => {
    const mReq = {
      user: { id: 1 },
      body: {},
    } as unknown as Request;
    const mRes = {
      locals: { logId: 5 },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await nutritionController.updateNutritionLog(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "Missing required parameters",
    });
  });

  it("should throw error", async () => {
    const mReq = {
      user: { id: 1 },
    } as unknown as Request;
    const mRes = {
      locals: { logId: 5, date: "2026-04-15T00:00:00.000Z" },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    vi.mocked(nutritionService.updateNutritionLog).mockRejectedValueOnce(
      new Error("Error updating nutrition log in database."),
    );

    await expect(
      nutritionController.updateNutritionLog(mReq, mRes),
    ).rejects.toThrow(Error);
  });

  it("should throw unknown error", async () => {
    const mReq = {
      user: { id: 1 },
    } as unknown as Request;
    const mRes = {
      locals: { logId: 5, date: "2026-04-15T00:00:00.000Z" },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    vi.mocked(nutritionService.updateNutritionLog).mockRejectedValueOnce(false);

    await expect(
      nutritionController.updateNutritionLog(mReq, mRes),
    ).rejects.toThrow(false);
  });

  it("should return 200 - success, date is converted to ISO format before service call", async () => {
    const mReq = {
      user: { id: 1 },
    } as unknown as Request;
    const mRes = {
      locals: { logId: 5, date: "2026-04-16T00:00:00.000Z" },
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

  it("should throw error", async () => {
    const mReq = {
      user: { id: 1 },
    } as unknown as Request;
    const mRes = {
      locals: { logId: 5 },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    } as unknown as Response;

    vi.mocked(nutritionService.deleteNutritionLog).mockRejectedValueOnce(
      new NotFoundError("Nutrition log not found."),
    );

    await expect(
      nutritionController.deleteNutritionLog(mReq, mRes),
    ).rejects.toThrow(NotFoundError);
  });

  it("should throw unknown error", async () => {
    const mReq = {
      user: { id: 1 },
    } as unknown as Request;
    const mRes = {
      locals: { logId: 5 },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    } as unknown as Response;

    vi.mocked(nutritionService.deleteNutritionLog).mockRejectedValueOnce(
      "unknown",
    );

    await expect(
      nutritionController.deleteNutritionLog(mReq, mRes),
    ).rejects.toThrow("unknown");
  });

  it("should return 204 - success", async () => {
    const mReq = {
      user: { id: 1 },
    } as unknown as Request;
    const mRes = {
      locals: { logId: 5 },
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
