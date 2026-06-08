// Unit tests: workout log controller with the service layer mocked.
// These calls are hoisted so the modules are mocked before import.
vi.mock("../../../src/services/workoutLog.service.js");
vi.mock("../../../src/db.js");

import type { Request, Response } from "express";
import { expect, it, describe, vi, beforeEach } from "vitest";
import * as workoutLogService from "../../../src/services/workoutLog.service.js";
import * as workoutLogController from "../../../src/controllers/workoutLog.controller.js";
import { BadRequestError, NotFoundError } from "../../../src/errors.js";

// Minimal Response double: status/json/send all chain via mockReturnThis.
// `locals` carries the logId/date that param + date middleware would have set.
function mockResponse(locals: Record<string, unknown> = {}) {
  return {
    locals,
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

describe("WorkoutLog Controller getAllWorkoutLogs", () => {
  beforeEach(() => vi.clearAllMocks());

  it("delegates (userId, page, limit) from req.pagination and returns the payload", async () => {
    const mReq = {
      user: { id: "user-1" },
      pagination: { page: 2, limit: 5 },
    } as unknown as Request;
    const mRes = mockResponse();

    const payload = { workoutLogs: [], total: 0, page: 2, limit: 5 };
    vi.mocked(workoutLogService.getAllWorkoutLogs).mockResolvedValueOnce(
      payload as any,
    );

    await workoutLogController.getAllWorkoutLogs(mReq, mRes);

    expect(workoutLogService.getAllWorkoutLogs).toHaveBeenCalledWith(
      "user-1",
      2,
      5,
    );
    expect(mRes.json).toHaveBeenCalledWith(payload);
  });

  it("propagates a service error to the error middleware", async () => {
    const mReq = {
      user: { id: "user-1" },
      pagination: { page: 1, limit: 10 },
    } as unknown as Request;
    const mRes = mockResponse();

    vi.mocked(workoutLogService.getAllWorkoutLogs).mockRejectedValueOnce(
      new Error("boom"),
    );

    await expect(
      workoutLogController.getAllWorkoutLogs(mReq, mRes),
    ).rejects.toThrow("boom");
  });
});

describe("WorkoutLog Controller getTodayWorkoutLogs", () => {
  beforeEach(() => vi.clearAllMocks());

  it("delegates (userId, date) from the query string and returns the summaries", async () => {
    const mReq = {
      user: { id: "user-1" },
      query: { date: "2026-06-07" },
    } as unknown as Request;
    const mRes = mockResponse();

    const summaries = [{ id: "log-1", date: "2026-06-07" }];
    vi.mocked(workoutLogService.getTodayWorkoutLogs).mockResolvedValueOnce(
      summaries as any,
    );

    await workoutLogController.getTodayWorkoutLogs(mReq, mRes);

    expect(workoutLogService.getTodayWorkoutLogs).toHaveBeenCalledWith(
      "user-1",
      "2026-06-07",
    );
    expect(mRes.json).toHaveBeenCalledWith(summaries);
  });

  // The date query param is validated in the controller (not middleware), so a
  // bad value throws BadRequestError before the service is ever consulted.
  it.each([
    ["date is missing", {}],
    ["date is an array", { date: ["2026-06-07"] }],
    ["date has the wrong format", { date: "06/07/2026" }],
    ["date is only a partial ISO date", { date: "2026-06" }],
    ["date is a full ISO timestamp", { date: "2026-06-07T00:00:00.000Z" }],
  ])("throws BadRequestError when %s", async (_label, query) => {
    const mReq = { user: { id: "user-1" }, query } as unknown as Request;
    const mRes = mockResponse();

    await expect(
      workoutLogController.getTodayWorkoutLogs(mReq, mRes),
    ).rejects.toThrow(
      new BadRequestError("date query param must be in YYYY-MM-DD format"),
    );
    expect(workoutLogService.getTodayWorkoutLogs).not.toHaveBeenCalled();
  });
});

describe("WorkoutLog Controller getWorkoutLogById", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reads logId from res.locals and delegates (userId, logId)", async () => {
    const mReq = { user: { id: "user-1" } } as unknown as Request;
    const mRes = mockResponse({ logId: "log-7" });

    const log = { id: "log-7", date: "2026-06-07", exercises: [] };
    vi.mocked(workoutLogService.getWorkoutLogById).mockResolvedValueOnce(
      log as any,
    );

    await workoutLogController.getWorkoutLogById(mReq, mRes);

    expect(workoutLogService.getWorkoutLogById).toHaveBeenCalledWith(
      "user-1",
      "log-7",
    );
    expect(mRes.json).toHaveBeenCalledWith(log);
  });

  it("propagates a NotFoundError from the service", async () => {
    const mReq = { user: { id: "user-1" } } as unknown as Request;
    const mRes = mockResponse({ logId: "log-7" });

    vi.mocked(workoutLogService.getWorkoutLogById).mockRejectedValueOnce(
      new NotFoundError("Workout log not found."),
    );

    await expect(
      workoutLogController.getWorkoutLogById(mReq, mRes),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("WorkoutLog Controller createWorkoutLog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("builds an ad-hoc create input (userId + date) and returns 201", async () => {
    const mReq = { user: { id: "user-1" }, body: {} } as unknown as Request;
    const mRes = mockResponse({ date: "2026-06-07T00:00:00.000Z" });

    const created = { id: "log-1", date: "2026-06-07", exercises: [] };
    vi.mocked(workoutLogService.createWorkoutLog).mockResolvedValueOnce(
      created as any,
    );

    await workoutLogController.createWorkoutLog(mReq, mRes);

    // No workoutDayId in the body → it is omitted from the create input.
    expect(workoutLogService.createWorkoutLog).toHaveBeenCalledWith("user-1", {
      userId: "user-1",
      date: "2026-06-07T00:00:00.000Z",
    });
    expect(mRes.status).toHaveBeenCalledWith(201);
    expect(mRes.json).toHaveBeenCalledWith(created);
  });

  it("includes a valid workoutDayId in the create input", async () => {
    const mReq = {
      user: { id: "user-1" },
      body: { workoutDayId: "day-1" },
    } as unknown as Request;
    const mRes = mockResponse({ date: "2026-06-07T00:00:00.000Z" });

    vi.mocked(workoutLogService.createWorkoutLog).mockResolvedValueOnce(
      {} as any,
    );

    await workoutLogController.createWorkoutLog(mReq, mRes);

    expect(workoutLogService.createWorkoutLog).toHaveBeenCalledWith("user-1", {
      userId: "user-1",
      date: "2026-06-07T00:00:00.000Z",
      workoutDayId: "day-1",
    });
  });

  // workoutDayId is present but not a usable string → inline 400, no service call.
  it.each([
    ["not a string", 123],
    ["an empty string", ""],
    ["null is not a usable value on create", null],
  ])("returns 400 when workoutDayId is %s", async (_label, workoutDayId) => {
    const mReq = {
      user: { id: "user-1" },
      body: { workoutDayId },
    } as unknown as Request;
    const mRes = mockResponse({ date: "2026-06-07T00:00:00.000Z" });

    await workoutLogController.createWorkoutLog(mReq, mRes);

    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "workoutDayId must be a UUID string.",
    });
    expect(workoutLogService.createWorkoutLog).not.toHaveBeenCalled();
  });

  it("propagates a service error", async () => {
    const mReq = {
      user: { id: "user-1" },
      body: { workoutDayId: "day-1" },
    } as unknown as Request;
    const mRes = mockResponse({ date: "2026-06-07T00:00:00.000Z" });

    vi.mocked(workoutLogService.createWorkoutLog).mockRejectedValueOnce(
      new NotFoundError("Workout day not found."),
    );

    await expect(
      workoutLogController.createWorkoutLog(mReq, mRes),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("WorkoutLog Controller updateWorkoutLog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 when no updatable fields are provided", async () => {
    const mReq = { user: { id: "user-1" }, body: {} } as unknown as Request;
    const mRes = mockResponse({ logId: "log-1" });

    await workoutLogController.updateWorkoutLog(mReq, mRes);

    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "No valid fields were provided to update.",
    });
    expect(workoutLogService.updateWorkoutLog).not.toHaveBeenCalled();
  });

  it("returns 400 when workoutDayId is an invalid (non-null) value", async () => {
    const mReq = {
      user: { id: "user-1" },
      body: { workoutDayId: 42 },
    } as unknown as Request;
    const mRes = mockResponse({ logId: "log-1" });

    await workoutLogController.updateWorkoutLog(mReq, mRes);

    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "workoutDayId must be a UUID string or null.",
    });
    expect(workoutLogService.updateWorkoutLog).not.toHaveBeenCalled();
  });

  it("forwards a date-only update (from res.locals.date) to the service", async () => {
    const mReq = { user: { id: "user-1" }, body: {} } as unknown as Request;
    const mRes = mockResponse({
      logId: "log-1",
      date: "2026-06-08T00:00:00.000Z",
    });

    const updated = { id: "log-1", date: "2026-06-08", exercises: [] };
    vi.mocked(workoutLogService.updateWorkoutLog).mockResolvedValueOnce(
      updated as any,
    );

    await workoutLogController.updateWorkoutLog(mReq, mRes);

    expect(workoutLogService.updateWorkoutLog).toHaveBeenCalledWith(
      "user-1",
      "log-1",
      { date: "2026-06-08T00:00:00.000Z" },
    );
    expect(mRes.json).toHaveBeenCalledWith(updated);
  });

  it("forwards workoutDayId: null to unlink the template day", async () => {
    const mReq = {
      user: { id: "user-1" },
      body: { workoutDayId: null },
    } as unknown as Request;
    const mRes = mockResponse({ logId: "log-1" });

    vi.mocked(workoutLogService.updateWorkoutLog).mockResolvedValueOnce(
      {} as any,
    );

    await workoutLogController.updateWorkoutLog(mReq, mRes);

    expect(workoutLogService.updateWorkoutLog).toHaveBeenCalledWith(
      "user-1",
      "log-1",
      { workoutDayId: null },
    );
  });

  it("forwards both date and workoutDayId when supplied together", async () => {
    const mReq = {
      user: { id: "user-1" },
      body: { workoutDayId: "day-2" },
    } as unknown as Request;
    const mRes = mockResponse({
      logId: "log-1",
      date: "2026-06-08T00:00:00.000Z",
    });

    vi.mocked(workoutLogService.updateWorkoutLog).mockResolvedValueOnce(
      {} as any,
    );

    await workoutLogController.updateWorkoutLog(mReq, mRes);

    expect(workoutLogService.updateWorkoutLog).toHaveBeenCalledWith(
      "user-1",
      "log-1",
      { date: "2026-06-08T00:00:00.000Z", workoutDayId: "day-2" },
    );
  });

  it("propagates a NotFoundError from the service", async () => {
    const mReq = {
      user: { id: "user-1" },
      body: { workoutDayId: "day-2" },
    } as unknown as Request;
    const mRes = mockResponse({ logId: "log-1" });

    vi.mocked(workoutLogService.updateWorkoutLog).mockRejectedValueOnce(
      new NotFoundError("Workout log not found."),
    );

    await expect(
      workoutLogController.updateWorkoutLog(mReq, mRes),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("WorkoutLog Controller deleteWorkoutLog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes the log and returns 204", async () => {
    const mReq = { user: { id: "user-1" } } as unknown as Request;
    const mRes = mockResponse({ logId: "log-1" });

    vi.mocked(workoutLogService.deleteWorkoutLog).mockResolvedValueOnce(
      undefined,
    );

    await workoutLogController.deleteWorkoutLog(mReq, mRes);

    expect(workoutLogService.deleteWorkoutLog).toHaveBeenCalledWith(
      "user-1",
      "log-1",
    );
    expect(mRes.status).toHaveBeenCalledWith(204);
    expect(mRes.send).toHaveBeenCalled();
  });

  it("propagates a NotFoundError from the service", async () => {
    const mReq = { user: { id: "user-1" } } as unknown as Request;
    const mRes = mockResponse({ logId: "log-1" });

    vi.mocked(workoutLogService.deleteWorkoutLog).mockRejectedValueOnce(
      new NotFoundError("Workout log not found."),
    );

    await expect(
      workoutLogController.deleteWorkoutLog(mReq, mRes),
    ).rejects.toThrow(NotFoundError);
  });
});
