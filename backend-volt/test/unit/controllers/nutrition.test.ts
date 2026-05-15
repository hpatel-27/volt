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
      user: { id: "user-uuid-1" },
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
      user: { id: "user-uuid-16" },
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
      user: { id: "user-uuid-16" },
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
      user: { id: "user-uuid-1" },
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
        { id: "log-uuid-15", userId: "user-uuid-1", date: firstDate },
        { id: "log-uuid-18", userId: "user-uuid-1", date: secondDate },
      ],
      total: 2,
      page: 1,
      limit: 10,
    } as any);

    await nutritionController.getAllNutritionLogs(mReq, mRes);
    expect(mRes.json).toHaveBeenCalledWith({
      nutritionLogs: [
        { id: "log-uuid-15", userId: "user-uuid-1", date: firstDate },
        { id: "log-uuid-18", userId: "user-uuid-1", date: secondDate },
      ],
      total: 2,
      page: 1,
      limit: 10,
    });
  });
});

describe("Nutrition Controller getNutritionLogByDate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should throw error", async () => {
    const mReq = {
      user: { id: "user-uuid-1" },
    } as unknown as Request;
    const mRes = {
      locals: { date: "2026-04-15" },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    vi.mocked(nutritionService.getNutritionLogByDate).mockRejectedValueOnce(
      new Error("Error fetching nutrition log from database."),
    );

    await expect(
      nutritionController.getNutritionLogByDate(mReq, mRes),
    ).rejects.toThrow(Error);
  });

  it("should throw unknown error", async () => {
    const mReq = {
      user: { id: "user-uuid-1" },
    } as unknown as Request;
    const mRes = {
      locals: { date: "2026-04-15" },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    vi.mocked(nutritionService.getNutritionLogByDate).mockRejectedValueOnce(
      "unknown",
    );

    await expect(
      nutritionController.getNutritionLogByDate(mReq, mRes),
    ).rejects.toThrow("unknown");
  });

  it("should return 200 - success", async () => {
    const mReq = {
      user: { id: "user-uuid-1" },
    } as unknown as Request;
    const mRes = {
      locals: { date: "2026-04-15" },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    const mockLog = {
      id: "log-uuid-5",
      userId: "user-uuid-1",
      date: new Date("2026-04-15T00:00:00.000Z"),
    };
    vi.mocked(nutritionService.getNutritionLogByDate).mockResolvedValueOnce(
      mockLog as any,
    );

    await nutritionController.getNutritionLogByDate(mReq, mRes);
    expect(mRes.json).toHaveBeenCalledWith(mockLog);
  });
});

describe("Nutrition Controller createNutritionLog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should throw error", async () => {
    const mReq = {
      user: { id: "user-uuid-1" },
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
      user: { id: "user-uuid-1" },
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
    // The date middleware converts the raw date string to a full ISO-8601 timestamp.
    // "2026-04-15" becomes "2026-04-15T00:00:00.000Z" — the service receives the
    // normalized value, not the raw input.
    const mReq = {
      user: { id: "user-uuid-1" },
    } as unknown as Request;
    const mRes = {
      locals: { date: "2026-04-15T00:00:00.000Z" },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    const mockLog = {
      id: "log-uuid-7",
      userId: "user-uuid-1",
      date: new Date("2026-04-15T00:00:00.000Z"),
    };
    vi.mocked(nutritionService.createNutritionLog).mockResolvedValueOnce(
      mockLog as any,
    );

    await nutritionController.createNutritionLog(mReq, mRes);

    expect(vi.mocked(nutritionService.createNutritionLog)).toHaveBeenCalledWith(
      {
        userId: "user-uuid-1",
        date: "2026-04-15T00:00:00.000Z",
      },
    );
    expect(mRes.status).toHaveBeenCalledWith(201);
    expect(mRes.json).toHaveBeenCalledWith(mockLog);
  });
});

describe("Nutrition Controller updateNutritionLog", () => {
  beforeEach(() => vi.clearAllMocks());

  // Since date is the URL key, PATCH always returns 405
  it("should return 405 - date cannot be changed via PATCH", async () => {
    const mReq = {
      user: { id: "user-uuid-1" },
      body: {},
    } as unknown as Request;
    const mRes = {
      locals: { date: "2026-04-16" },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await nutritionController.updateNutritionLog(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(405);
    expect(mRes.json).toHaveBeenCalledWith({
      error:
        "Nutrition log date cannot be changed. To move a log, delete it and create a new one.",
    });
  });
});

describe("Nutrition Controller deleteNutritionLog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should throw error", async () => {
    const mReq = {
      user: { id: "user-uuid-1" },
    } as unknown as Request;
    const mRes = {
      locals: { date: "2026-04-15" },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    } as unknown as Response;

    vi.mocked(nutritionService.deleteNutritionLogByDate).mockRejectedValueOnce(
      new NotFoundError("Nutrition log not found."),
    );

    await expect(
      nutritionController.deleteNutritionLog(mReq, mRes),
    ).rejects.toThrow(NotFoundError);
  });

  it("should throw unknown error", async () => {
    const mReq = {
      user: { id: "user-uuid-1" },
    } as unknown as Request;
    const mRes = {
      locals: { date: "2026-04-15" },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    } as unknown as Response;

    vi.mocked(nutritionService.deleteNutritionLogByDate).mockRejectedValueOnce(
      "unknown",
    );

    await expect(
      nutritionController.deleteNutritionLog(mReq, mRes),
    ).rejects.toThrow("unknown");
  });

  it("should return 204 - success", async () => {
    const mReq = {
      user: { id: "user-uuid-1" },
    } as unknown as Request;
    const mRes = {
      locals: { date: "2026-04-15" },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    } as unknown as Response;

    vi.mocked(nutritionService.deleteNutritionLogByDate).mockResolvedValueOnce(
      undefined,
    );

    await nutritionController.deleteNutritionLog(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(204);
    expect(mRes.send).toHaveBeenCalled();
  });
});
