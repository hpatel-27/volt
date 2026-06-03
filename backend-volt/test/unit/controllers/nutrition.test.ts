// Unit tests: nutrition controller with the service layer mocked.
// These calls are hoisted so the modules are mocked before import.
vi.mock("../../../src/services/nutrition.service.js");
vi.mock("../../../src/db.js");

import type { Request, Response } from "express";
import { expect, it, describe, vi, beforeEach } from "vitest";
import * as nutritionService from "../../../src/services/nutrition.service.js";
import * as nutritionController from "../../../src/controllers/nutrition.controller.js";
import { NotFoundError, BadRequestError } from "../../../src/errors.js";

// Minimal Response double: status/json/send all chain via mockReturnThis.
function mockResponse(locals: Record<string, unknown> = {}) {
  return {
    locals,
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

describe("Nutrition Controller getAllNutritionLogs", () => {
  beforeEach(() => vi.clearAllMocks());

  it("passes pagination through and returns the service payload", async () => {
    const mReq = {
      user: { id: "user-1" },
      pagination: { page: 1, limit: 10 },
    } as unknown as Request;
    const mRes = mockResponse();

    const payload = { nutritionLogs: [], total: 0, page: 1, limit: 10 };
    vi.mocked(nutritionService.getAllNutritionLogs).mockResolvedValueOnce(
      payload as any,
    );

    await nutritionController.getAllNutritionLogs(mReq, mRes);

    expect(nutritionService.getAllNutritionLogs).toHaveBeenCalledWith(
      "user-1",
      1,
      10,
    );
    expect(mRes.json).toHaveBeenCalledWith(payload);
  });

  it("returns multiple summaries from the service", async () => {
    const mReq = {
      user: { id: "user-1" },
      pagination: { page: 1, limit: 10 },
    } as unknown as Request;
    const mRes = mockResponse();

    const payload = {
      nutritionLogs: [
        {
          id: "log-1",
          date: "2026-04-11",
          totals: { calories: 500, protein: 30, carbs: 50, fat: 15 },
          mealCount: 2,
        },
        {
          id: "log-2",
          date: "2026-04-13",
          totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
          mealCount: 0,
        },
      ],
      total: 2,
      page: 1,
      limit: 10,
    };
    vi.mocked(nutritionService.getAllNutritionLogs).mockResolvedValueOnce(
      payload as any,
    );

    await nutritionController.getAllNutritionLogs(mReq, mRes);
    expect(mRes.json).toHaveBeenCalledWith(payload);
  });

  it("propagates a service Error to the error middleware", async () => {
    const mReq = {
      user: { id: "user-1" },
      pagination: { page: 1, limit: 5 },
    } as unknown as Request;
    const mRes = mockResponse();

    vi.mocked(nutritionService.getAllNutritionLogs).mockRejectedValueOnce(
      new Error("Server error."),
    );

    await expect(
      nutritionController.getAllNutritionLogs(mReq, mRes),
    ).rejects.toThrow("Server error.");
  });

  it("propagates a non-Error thrown value", async () => {
    const mReq = {
      user: { id: "user-1" },
      pagination: { page: 1, limit: 10 },
    } as unknown as Request;
    const mRes = mockResponse();

    vi.mocked(nutritionService.getAllNutritionLogs).mockRejectedValueOnce(
      "someunknownvalue",
    );

    await expect(
      nutritionController.getAllNutritionLogs(mReq, mRes),
    ).rejects.toBe("someunknownvalue");
  });
});

describe("Nutrition Controller getNutritionLogsByRange", () => {
  beforeEach(() => vi.clearAllMocks());

  it("passes the parsed from/to dates and returns the logs", async () => {
    const fromDate = new Date("2026-04-01T00:00:00.000Z");
    const toDate = new Date("2026-04-14T00:00:00.000Z");
    const mReq = { user: { id: "user-1" } } as unknown as Request;
    const mRes = mockResponse({ fromDate, toDate });

    const payload = {
      logs: [
        { id: "log-1", date: "2026-04-02" },
        { id: "log-2", date: "2026-04-10" },
      ],
      total: 2,
    };
    vi.mocked(nutritionService.getNutritionLogsByRange).mockResolvedValueOnce(
      payload as any,
    );

    await nutritionController.getNutritionLogsByRange(mReq, mRes);

    expect(nutritionService.getNutritionLogsByRange).toHaveBeenCalledWith(
      "user-1",
      fromDate,
      toDate,
    );
    expect(mRes.json).toHaveBeenCalledWith(payload);
  });

  it("propagates a service error", async () => {
    const mReq = { user: { id: "user-1" } } as unknown as Request;
    const mRes = mockResponse({
      fromDate: new Date("2026-04-01"),
      toDate: new Date("2026-04-14"),
    });

    vi.mocked(nutritionService.getNutritionLogsByRange).mockRejectedValueOnce(
      new Error("db down"),
    );

    await expect(
      nutritionController.getNutritionLogsByRange(mReq, mRes),
    ).rejects.toThrow("db down");
  });
});

describe("Nutrition Controller getTodayNutritionLog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 when the date query param is missing", async () => {
    const mReq = { user: { id: "user-1" }, query: {} } as unknown as Request;
    const mRes = mockResponse();

    await expect(
      nutritionController.getTodayNutritionLog(mReq, mRes),
    ).rejects.toThrow(BadRequestError);
  });

  it("returns 400 when the date query param is malformed", async () => {
    const mReq = {
      user: { id: "user-1" },
      query: { date: "04-13-2026" },
    } as unknown as Request;
    const mRes = mockResponse();

    await expect(
      nutritionController.getTodayNutritionLog(mReq, mRes),
    ).rejects.toThrow(BadRequestError);
  });

  it("returns null when nothing is logged for today", async () => {
    const mReq = {
      user: { id: "user-1" },
      query: { date: "2026-04-13" },
    } as unknown as Request;
    const mRes = mockResponse();

    vi.mocked(nutritionService.getTodayNutritionLog).mockResolvedValueOnce(null);

    await nutritionController.getTodayNutritionLog(mReq, mRes);

    expect(nutritionService.getTodayNutritionLog).toHaveBeenCalledWith(
      "user-1",
      "2026-04-13",
    );
    expect(mRes.json).toHaveBeenCalledWith(null);
  });

  it("returns today's summary when one exists", async () => {
    const mReq = {
      user: { id: "user-1" },
      query: { date: "2026-04-13" },
    } as unknown as Request;
    const mRes = mockResponse();

    const summary = {
      id: "log-1",
      date: "2026-04-13",
      totals: { calories: 500, protein: 35, carbs: 50, fat: 15 },
      mealCount: 2,
    };
    vi.mocked(nutritionService.getTodayNutritionLog).mockResolvedValueOnce(
      summary as any,
    );

    await nutritionController.getTodayNutritionLog(mReq, mRes);
    expect(mRes.json).toHaveBeenCalledWith(summary);
  });
});

describe("Nutrition Controller getNutritionLogByDate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the log for the resolved date", async () => {
    const mReq = { user: { id: "user-1" } } as unknown as Request;
    const mRes = mockResponse({ date: "2026-04-15" });

    const log = { id: "log-5", date: "2026-04-15", meals: [] };
    vi.mocked(nutritionService.getNutritionLogByDate).mockResolvedValueOnce(
      log as any,
    );

    await nutritionController.getNutritionLogByDate(mReq, mRes);

    expect(nutritionService.getNutritionLogByDate).toHaveBeenCalledWith(
      "user-1",
      "2026-04-15",
    );
    expect(mRes.json).toHaveBeenCalledWith(log);
  });

  it("propagates a NotFoundError from the service", async () => {
    const mReq = { user: { id: "user-1" } } as unknown as Request;
    const mRes = mockResponse({ date: "2026-04-15" });

    vi.mocked(nutritionService.getNutritionLogByDate).mockRejectedValueOnce(
      new NotFoundError("Nutrition log not found."),
    );

    await expect(
      nutritionController.getNutritionLogByDate(mReq, mRes),
    ).rejects.toThrow(NotFoundError);
  });

  it("propagates a non-Error thrown value", async () => {
    const mReq = { user: { id: "user-1" } } as unknown as Request;
    const mRes = mockResponse({ date: "2026-04-15" });

    vi.mocked(nutritionService.getNutritionLogByDate).mockRejectedValueOnce(
      "unknown",
    );

    await expect(
      nutritionController.getNutritionLogByDate(mReq, mRes),
    ).rejects.toBe("unknown");
  });
});

describe("Nutrition Controller createNutritionLog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("builds the input from userId + normalized date and returns 201", async () => {
    // parseDate middleware normalizes the body date to a full ISO string in res.locals.date
    const mReq = { user: { id: "user-1" } } as unknown as Request;
    const mRes = mockResponse({ date: "2026-04-15T00:00:00.000Z" });

    const created = { id: "log-7", date: "2026-04-15" };
    vi.mocked(nutritionService.createNutritionLog).mockResolvedValueOnce(
      created as any,
    );

    await nutritionController.createNutritionLog(mReq, mRes);

    expect(nutritionService.createNutritionLog).toHaveBeenCalledWith({
      userId: "user-1",
      date: "2026-04-15T00:00:00.000Z",
    });
    expect(mRes.status).toHaveBeenCalledWith(201);
    expect(mRes.json).toHaveBeenCalledWith(created);
  });

  it("propagates a service error", async () => {
    const mReq = { user: { id: "user-1" } } as unknown as Request;
    const mRes = mockResponse({ date: "2026-04-12T00:00:00.000Z" });

    vi.mocked(nutritionService.createNutritionLog).mockRejectedValueOnce(
      new Error("Error creating nutrition log in database."),
    );

    await expect(
      nutritionController.createNutritionLog(mReq, mRes),
    ).rejects.toThrow(Error);
  });

  it("propagates a non-Error thrown value", async () => {
    const mReq = { user: { id: "user-1" } } as unknown as Request;
    const mRes = mockResponse({ date: "2026-04-20T00:00:00.000Z" });

    vi.mocked(nutritionService.createNutritionLog).mockRejectedValueOnce(456345);

    await expect(
      nutritionController.createNutritionLog(mReq, mRes),
    ).rejects.toBe(456345);
  });
});

describe("Nutrition Controller updateNutritionLog", () => {
  beforeEach(() => vi.clearAllMocks());

  // date is the URL key, so PATCH always returns 405 without touching the service
  it("returns 405 because the date cannot be changed via PATCH", async () => {
    const mReq = { user: { id: "user-1" }, body: {} } as unknown as Request;
    const mRes = mockResponse({ date: "2026-04-16" });

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

  it("deletes by date and returns 204", async () => {
    const mReq = { user: { id: "user-1" } } as unknown as Request;
    const mRes = mockResponse({ date: "2026-04-15" });

    vi.mocked(nutritionService.deleteNutritionLogByDate).mockResolvedValueOnce(
      undefined,
    );

    await nutritionController.deleteNutritionLog(mReq, mRes);

    expect(nutritionService.deleteNutritionLogByDate).toHaveBeenCalledWith(
      "user-1",
      "2026-04-15",
    );
    expect(mRes.status).toHaveBeenCalledWith(204);
    expect(mRes.send).toHaveBeenCalled();
  });

  it("propagates a NotFoundError from the service", async () => {
    const mReq = { user: { id: "user-1" } } as unknown as Request;
    const mRes = mockResponse({ date: "2026-04-15" });

    vi.mocked(nutritionService.deleteNutritionLogByDate).mockRejectedValueOnce(
      new NotFoundError("Nutrition log not found."),
    );

    await expect(
      nutritionController.deleteNutritionLog(mReq, mRes),
    ).rejects.toThrow(NotFoundError);
  });

  it("propagates a non-Error thrown value", async () => {
    const mReq = { user: { id: "user-1" } } as unknown as Request;
    const mRes = mockResponse({ date: "2026-04-15" });

    vi.mocked(nutritionService.deleteNutritionLogByDate).mockRejectedValueOnce(
      "unknown",
    );

    await expect(
      nutritionController.deleteNutritionLog(mReq, mRes),
    ).rejects.toBe("unknown");
  });
});
