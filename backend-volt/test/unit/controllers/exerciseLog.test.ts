// Unit tests: exercise log controller with the service layer mocked.
// These calls are hoisted so the modules are mocked before import.
vi.mock("../../../src/services/exerciseLog.service.js");
vi.mock("../../../src/db.js");

import type { Request, Response } from "express";
import { expect, it, describe, vi, beforeEach } from "vitest";
import * as exerciseLogService from "../../../src/services/exerciseLog.service.js";
import * as exerciseLogController from "../../../src/controllers/exerciseLog.controller.js";
import { BadRequestError, NotFoundError } from "../../../src/errors.js";

// Minimal Response double: status/json/send chain via mockReturnThis.
// `locals` carries the logId/exerciseLogId that param middleware would have set
// (logId comes from the parent mount's parseUuidParam).
function mockResponse(locals: Record<string, unknown> = {}) {
  return {
    locals,
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

describe("ExerciseLog Controller getAllExerciseLogs", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reads logId from res.locals and delegates (logId, userId)", async () => {
    const mReq = { user: { id: "user-1" } } as unknown as Request;
    const mRes = mockResponse({ logId: "log-1" });

    const payload = { exerciseLogs: [{ id: "el-1" }] };
    vi.mocked(exerciseLogService.getAllExerciseLogs).mockResolvedValueOnce(
      payload as any,
    );

    await exerciseLogController.getAllExerciseLogs(mReq, mRes);

    expect(exerciseLogService.getAllExerciseLogs).toHaveBeenCalledWith(
      "log-1",
      "user-1",
    );
    expect(mRes.json).toHaveBeenCalledWith(payload);
  });

  it("propagates a NotFoundError from the service", async () => {
    const mReq = { user: { id: "user-1" } } as unknown as Request;
    const mRes = mockResponse({ logId: "log-1" });

    vi.mocked(exerciseLogService.getAllExerciseLogs).mockRejectedValueOnce(
      new NotFoundError("Workout log not found."),
    );

    await expect(
      exerciseLogController.getAllExerciseLogs(mReq, mRes),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("ExerciseLog Controller getExerciseLogById", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reads logId + exerciseLogId from res.locals and delegates in order", async () => {
    const mReq = { user: { id: "user-1" } } as unknown as Request;
    const mRes = mockResponse({ logId: "log-1", exerciseLogId: "el-7" });

    const exerciseLog = { id: "el-7", notes: null, sets: [] };
    vi.mocked(exerciseLogService.getExerciseLogById).mockResolvedValueOnce(
      exerciseLog as any,
    );

    await exerciseLogController.getExerciseLogById(mReq, mRes);

    expect(exerciseLogService.getExerciseLogById).toHaveBeenCalledWith(
      "log-1",
      "user-1",
      "el-7",
    );
    expect(mRes.json).toHaveBeenCalledWith(exerciseLog);
  });

  it("propagates a NotFoundError from the service", async () => {
    const mReq = { user: { id: "user-1" } } as unknown as Request;
    const mRes = mockResponse({ logId: "log-1", exerciseLogId: "el-7" });

    vi.mocked(exerciseLogService.getExerciseLogById).mockRejectedValueOnce(
      new NotFoundError("Exercise log not found."),
    );

    await expect(
      exerciseLogController.getExerciseLogById(mReq, mRes),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("ExerciseLog Controller createExerciseLog", () => {
  beforeEach(() => vi.clearAllMocks());

  // exerciseId is required and must be a non-empty string → validateBoundedString THROWS.
  it.each([
    ["missing", {}],
    ["undefined", { exerciseId: undefined }],
    ["not a string", { exerciseId: 123 }],
    ["an empty string", { exerciseId: "" }],
  ])("throws BadRequestError when exerciseId is %s", async (_label, body) => {
    const mReq = { user: { id: "user-1" }, body } as unknown as Request;
    const mRes = mockResponse({ logId: "log-1" });

    await expect(
      exerciseLogController.createExerciseLog(mReq, mRes),
    ).rejects.toThrow(BadRequestError);

    expect(exerciseLogService.createExerciseLog).not.toHaveBeenCalled();
  });

  it("throws BadRequestError when notes is provided but not a string", async () => {
    const mReq = {
      user: { id: "user-1" },
      body: { exerciseId: "ex-1", notes: 42 },
    } as unknown as Request;
    const mRes = mockResponse({ logId: "log-1" });

    await expect(
      exerciseLogController.createExerciseLog(mReq, mRes),
    ).rejects.toThrow(BadRequestError);

    expect(exerciseLogService.createExerciseLog).not.toHaveBeenCalled();
  });

  it("builds the create input (without notes) and returns 201", async () => {
    const mReq = {
      user: { id: "user-1" },
      body: { exerciseId: "ex-1" },
    } as unknown as Request;
    const mRes = mockResponse({ logId: "log-1" });

    const created = { id: "el-1", sets: [] };
    vi.mocked(exerciseLogService.createExerciseLog).mockResolvedValueOnce(
      created as any,
    );

    await exerciseLogController.createExerciseLog(mReq, mRes);

    expect(exerciseLogService.createExerciseLog).toHaveBeenCalledWith(
      "log-1",
      "user-1",
      { workoutLogId: "log-1", exerciseId: "ex-1" },
    );
    expect(mRes.status).toHaveBeenCalledWith(201);
    expect(mRes.json).toHaveBeenCalledWith(created);
  });

  it("includes notes in the create input when provided", async () => {
    const mReq = {
      user: { id: "user-1" },
      body: { exerciseId: "ex-1", notes: "felt strong" },
    } as unknown as Request;
    const mRes = mockResponse({ logId: "log-1" });

    vi.mocked(exerciseLogService.createExerciseLog).mockResolvedValueOnce(
      {} as any,
    );

    await exerciseLogController.createExerciseLog(mReq, mRes);

    expect(exerciseLogService.createExerciseLog).toHaveBeenCalledWith(
      "log-1",
      "user-1",
      { workoutLogId: "log-1", exerciseId: "ex-1", notes: "felt strong" },
    );
  });

  it("propagates a service error", async () => {
    const mReq = {
      user: { id: "user-1" },
      body: { exerciseId: "ex-1" },
    } as unknown as Request;
    const mRes = mockResponse({ logId: "log-1" });

    vi.mocked(exerciseLogService.createExerciseLog).mockRejectedValueOnce(
      new NotFoundError("Exercise not found."),
    );

    await expect(
      exerciseLogController.createExerciseLog(mReq, mRes),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("ExerciseLog Controller updateExerciseLog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 when no updatable fields are provided", async () => {
    const mReq = { user: { id: "user-1" }, body: {} } as unknown as Request;
    const mRes = mockResponse({ logId: "log-1", exerciseLogId: "el-1" });

    await exerciseLogController.updateExerciseLog(mReq, mRes);

    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "No valid fields were provided to update.",
    });
    expect(exerciseLogService.updateExerciseLog).not.toHaveBeenCalled();
  });

  it("throws BadRequestError when exerciseId is provided but empty", async () => {
    const mReq = {
      user: { id: "user-1" },
      body: { exerciseId: "" },
    } as unknown as Request;
    const mRes = mockResponse({ logId: "log-1", exerciseLogId: "el-1" });

    await expect(
      exerciseLogController.updateExerciseLog(mReq, mRes),
    ).rejects.toThrow(BadRequestError);

    expect(exerciseLogService.updateExerciseLog).not.toHaveBeenCalled();
  });

  it("throws BadRequestError when notes is neither a string nor null", async () => {
    const mReq = {
      user: { id: "user-1" },
      body: { notes: 42 },
    } as unknown as Request;
    const mRes = mockResponse({ logId: "log-1", exerciseLogId: "el-1" });

    await expect(
      exerciseLogController.updateExerciseLog(mReq, mRes),
    ).rejects.toThrow(BadRequestError);

    expect(exerciseLogService.updateExerciseLog).not.toHaveBeenCalled();
  });

  it("forwards an exerciseId swap to the service", async () => {
    const mReq = {
      user: { id: "user-1" },
      body: { exerciseId: "ex-9" },
    } as unknown as Request;
    const mRes = mockResponse({ logId: "log-1", exerciseLogId: "el-1" });

    const updated = { id: "el-1", sets: [] };
    vi.mocked(exerciseLogService.updateExerciseLog).mockResolvedValueOnce(
      updated as any,
    );

    await exerciseLogController.updateExerciseLog(mReq, mRes);

    expect(exerciseLogService.updateExerciseLog).toHaveBeenCalledWith(
      "log-1",
      "user-1",
      "el-1",
      { exerciseId: "ex-9" },
    );
    expect(mRes.json).toHaveBeenCalledWith(updated);
  });

  it("forwards notes: null to clear the field", async () => {
    const mReq = {
      user: { id: "user-1" },
      body: { notes: null },
    } as unknown as Request;
    const mRes = mockResponse({ logId: "log-1", exerciseLogId: "el-1" });

    vi.mocked(exerciseLogService.updateExerciseLog).mockResolvedValueOnce(
      {} as any,
    );

    await exerciseLogController.updateExerciseLog(mReq, mRes);

    expect(exerciseLogService.updateExerciseLog).toHaveBeenCalledWith(
      "log-1",
      "user-1",
      "el-1",
      { notes: null },
    );
  });

  it("propagates a NotFoundError from the service", async () => {
    const mReq = {
      user: { id: "user-1" },
      body: { notes: "x" },
    } as unknown as Request;
    const mRes = mockResponse({ logId: "log-1", exerciseLogId: "el-1" });

    vi.mocked(exerciseLogService.updateExerciseLog).mockRejectedValueOnce(
      new NotFoundError("Exercise log not found."),
    );

    await expect(
      exerciseLogController.updateExerciseLog(mReq, mRes),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("ExerciseLog Controller deleteExerciseLog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes the exercise log and returns 204", async () => {
    const mReq = { user: { id: "user-1" } } as unknown as Request;
    const mRes = mockResponse({ logId: "log-1", exerciseLogId: "el-1" });

    vi.mocked(exerciseLogService.deleteExerciseLog).mockResolvedValueOnce(
      undefined,
    );

    await exerciseLogController.deleteExerciseLog(mReq, mRes);

    expect(exerciseLogService.deleteExerciseLog).toHaveBeenCalledWith(
      "log-1",
      "user-1",
      "el-1",
    );
    expect(mRes.status).toHaveBeenCalledWith(204);
    expect(mRes.send).toHaveBeenCalled();
  });

  it("propagates a NotFoundError from the service", async () => {
    const mReq = { user: { id: "user-1" } } as unknown as Request;
    const mRes = mockResponse({ logId: "log-1", exerciseLogId: "el-1" });

    vi.mocked(exerciseLogService.deleteExerciseLog).mockRejectedValueOnce(
      new NotFoundError("Exercise log not found."),
    );

    await expect(
      exerciseLogController.deleteExerciseLog(mReq, mRes),
    ).rejects.toThrow(NotFoundError);
  });
});
