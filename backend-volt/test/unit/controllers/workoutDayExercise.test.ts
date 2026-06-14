// Unit tests: workout day exercise controller with the service layer mocked.
// These calls are hoisted so the modules are mocked before import.
vi.mock("../../../src/services/workoutDayExercise.service.js");
vi.mock("../../../src/db.js");

import type { Request, Response } from "express";
import { expect, it, describe, vi, beforeEach } from "vitest";
import * as svc from "../../../src/services/workoutDayExercise.service.js";
import * as controller from "../../../src/controllers/workoutDayExercise.controller.js";
import { BadRequestError, NotFoundError } from "../../../src/errors.js";

// Minimal Response double: status/json/send chain via mockReturnThis.
// `locals` carries the planId/dayId/dayExerciseId that param middleware would set.
function mockResponse(locals: Record<string, unknown> = {}) {
  return {
    locals,
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

describe("WorkoutDayExercise Controller getAllWorkoutDayExercises", () => {
  beforeEach(() => vi.clearAllMocks());

  it("delegates with (planId, dayId, userId) and returns the payload", async () => {
    const mReq = { user: { id: "user-1" } } as unknown as Request;
    const mRes = mockResponse({ planId: "plan-1", dayId: "day-1" });

    const payload = { exercises: [{ id: "wde-1", order: 1 }] };
    vi.mocked(svc.getAllWorkoutDayExercises).mockResolvedValueOnce(
      payload as any,
    );

    await controller.getAllWorkoutDayExercises(mReq, mRes);

    expect(svc.getAllWorkoutDayExercises).toHaveBeenCalledWith(
      "plan-1",
      "day-1",
      "user-1",
    );
    expect(mRes.json).toHaveBeenCalledWith(payload);
  });

  it("propagates a service error to the error middleware", async () => {
    const mReq = { user: { id: "user-1" } } as unknown as Request;
    const mRes = mockResponse({ planId: "plan-1", dayId: "day-1" });

    vi.mocked(svc.getAllWorkoutDayExercises).mockRejectedValueOnce(
      new NotFoundError("Workout day not found."),
    );

    await expect(
      controller.getAllWorkoutDayExercises(mReq, mRes),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("WorkoutDayExercise Controller getWorkoutDayExerciseById", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reads the ids from res.locals and delegates as (planId, dayId, dayExerciseId, userId)", async () => {
    const mReq = { user: { id: "user-1" } } as unknown as Request;
    const mRes = mockResponse({
      planId: "plan-1",
      dayId: "day-1",
      dayExerciseId: "wde-1",
    });

    const slot = { id: "wde-1", order: 1 };
    vi.mocked(svc.getWorkoutDayExerciseById).mockResolvedValueOnce(slot as any);

    await controller.getWorkoutDayExerciseById(mReq, mRes);

    // Note the argument order: userId is LAST for getById.
    expect(svc.getWorkoutDayExerciseById).toHaveBeenCalledWith(
      "plan-1",
      "day-1",
      "wde-1",
      "user-1",
    );
    expect(mRes.json).toHaveBeenCalledWith(slot);
  });

  it("propagates a NotFoundError from the service", async () => {
    const mReq = { user: { id: "user-1" } } as unknown as Request;
    const mRes = mockResponse({
      planId: "plan-1",
      dayId: "day-1",
      dayExerciseId: "wde-1",
    });

    vi.mocked(svc.getWorkoutDayExerciseById).mockRejectedValueOnce(
      new NotFoundError("Workout day exercise with id: wde-1 not found."),
    );

    await expect(
      controller.getWorkoutDayExerciseById(mReq, mRes),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("WorkoutDayExercise Controller createWorkoutDayExercise", () => {
  beforeEach(() => vi.clearAllMocks());

  // exerciseId must be a non-empty string; validateBoundedString THROWS
  // (mapped to a 400 by the error middleware) before the service runs.
  it.each([
    ["exerciseId is missing", {}],
    ["exerciseId is undefined", { exerciseId: undefined }],
    ["exerciseId is not a string", { exerciseId: 123 }],
    ["exerciseId is an empty string", { exerciseId: "" }],
  ])("throws BadRequestError when %s", async (_label, body) => {
    const mReq = { user: { id: "user-1" }, body } as unknown as Request;
    const mRes = mockResponse({ planId: "plan-1", dayId: "day-1" });

    await expect(
      controller.createWorkoutDayExercise(mReq, mRes),
    ).rejects.toThrow(BadRequestError);

    expect(svc.createWorkoutDayExercise).not.toHaveBeenCalled();
  });

  it("builds the create input with a placeholder order and returns 201", async () => {
    const mReq = {
      user: { id: "user-1" },
      body: { exerciseId: "ex-1" },
    } as unknown as Request;
    const mRes = mockResponse({ planId: "plan-1", dayId: "day-1" });

    const created = { id: "wde-1", order: 1 };
    vi.mocked(svc.createWorkoutDayExercise).mockResolvedValueOnce(
      created as any,
    );

    await controller.createWorkoutDayExercise(mReq, mRes);

    // workoutDayId comes from res.locals.dayId; order is the throwaway -1.
    expect(svc.createWorkoutDayExercise).toHaveBeenCalledWith(
      "plan-1",
      "day-1",
      "user-1",
      { workoutDayId: "day-1", exerciseId: "ex-1", order: -1 },
    );
    expect(mRes.status).toHaveBeenCalledWith(201);
    expect(mRes.json).toHaveBeenCalledWith(created);
  });

  it("forwards sanitized optional fields onto the create input", async () => {
    const mReq = {
      user: { id: "user-1" },
      body: {
        exerciseId: "ex-1",
        targetSets: 4,
        targetRepsMin: 8,
        targetRepsMax: 12,
        restSeconds: 90,
      },
    } as unknown as Request;
    const mRes = mockResponse({ planId: "plan-1", dayId: "day-1" });

    vi.mocked(svc.createWorkoutDayExercise).mockResolvedValueOnce({} as any);

    await controller.createWorkoutDayExercise(mReq, mRes);

    expect(svc.createWorkoutDayExercise).toHaveBeenCalledWith(
      "plan-1",
      "day-1",
      "user-1",
      {
        workoutDayId: "day-1",
        exerciseId: "ex-1",
        order: -1,
        targetSets: 4,
        targetRepsMin: 8,
        targetRepsMax: 12,
        restSeconds: 90,
      },
    );
  });

  // The numeric validators THROW BadRequestError (caught by errorMiddleware),
  // and the service is never reached.
  it.each([
    "targetSets",
    "targetRepsMin",
    "targetRepsMax",
    "restSeconds",
  ])("throws BadRequestError when %s is not a positive integer", async (field) => {
    const mReq = {
      user: { id: "user-1" },
      body: { exerciseId: "ex-1", [field]: 0 },
    } as unknown as Request;
    const mRes = mockResponse({ planId: "plan-1", dayId: "day-1" });

    await expect(
      controller.createWorkoutDayExercise(mReq, mRes),
    ).rejects.toThrow(BadRequestError);
    expect(svc.createWorkoutDayExercise).not.toHaveBeenCalled();
  });

  it("propagates a service error", async () => {
    const mReq = {
      user: { id: "user-1" },
      body: { exerciseId: "ex-1" },
    } as unknown as Request;
    const mRes = mockResponse({ planId: "plan-1", dayId: "day-1" });

    vi.mocked(svc.createWorkoutDayExercise).mockRejectedValueOnce(
      new NotFoundError("Exercise not found."),
    );

    await expect(
      controller.createWorkoutDayExercise(mReq, mRes),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("WorkoutDayExercise Controller updateWorkoutDayExercise", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws BadRequestError when exerciseId is provided but empty", async () => {
    const mReq = {
      user: { id: "user-1" },
      body: { exerciseId: "   " },
    } as unknown as Request;
    const mRes = mockResponse({
      planId: "plan-1",
      dayId: "day-1",
      dayExerciseId: "wde-1",
    });

    await expect(
      controller.updateWorkoutDayExercise(mReq, mRes),
    ).rejects.toThrow(BadRequestError);

    expect(svc.updateWorkoutDayExercise).not.toHaveBeenCalled();
  });

  it("returns 400 when no updatable fields are provided", async () => {
    const mReq = {
      user: { id: "user-1" },
      body: {},
    } as unknown as Request;
    const mRes = mockResponse({
      planId: "plan-1",
      dayId: "day-1",
      dayExerciseId: "wde-1",
    });

    await controller.updateWorkoutDayExercise(mReq, mRes);

    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "No valid fields were provided to update.",
    });
    expect(svc.updateWorkoutDayExercise).not.toHaveBeenCalled();
  });

  it("throws BadRequestError when a numeric field is invalid", async () => {
    const mReq = {
      user: { id: "user-1" },
      body: { restSeconds: -5 },
    } as unknown as Request;
    const mRes = mockResponse({
      planId: "plan-1",
      dayId: "day-1",
      dayExerciseId: "wde-1",
    });

    await expect(
      controller.updateWorkoutDayExercise(mReq, mRes),
    ).rejects.toThrow(BadRequestError);
    expect(svc.updateWorkoutDayExercise).not.toHaveBeenCalled();
  });

  it("forwards only the provided fields and delegates as (planId, dayId, userId, dayExerciseId, data)", async () => {
    const mReq = {
      user: { id: "user-1" },
      body: { exerciseId: "ex-2", targetSets: 5 },
    } as unknown as Request;
    const mRes = mockResponse({
      planId: "plan-1",
      dayId: "day-1",
      dayExerciseId: "wde-1",
    });

    const updated = { id: "wde-1", order: 1, targetSets: 5 };
    vi.mocked(svc.updateWorkoutDayExercise).mockResolvedValueOnce(
      updated as any,
    );

    await controller.updateWorkoutDayExercise(mReq, mRes);

    expect(svc.updateWorkoutDayExercise).toHaveBeenCalledWith(
      "plan-1",
      "day-1",
      "user-1",
      "wde-1",
      { exerciseId: "ex-2", targetSets: 5 },
    );
    expect(mRes.json).toHaveBeenCalledWith(updated);
  });

  it("propagates a NotFoundError from the service", async () => {
    const mReq = {
      user: { id: "user-1" },
      body: { targetSets: 5 },
    } as unknown as Request;
    const mRes = mockResponse({
      planId: "plan-1",
      dayId: "day-1",
      dayExerciseId: "wde-1",
    });

    vi.mocked(svc.updateWorkoutDayExercise).mockRejectedValueOnce(
      new NotFoundError("Workout day exercise not found."),
    );

    await expect(
      controller.updateWorkoutDayExercise(mReq, mRes),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("WorkoutDayExercise Controller deleteWorkoutDayExercise", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes the slot and returns 204", async () => {
    const mReq = { user: { id: "user-1" } } as unknown as Request;
    const mRes = mockResponse({
      planId: "plan-1",
      dayId: "day-1",
      dayExerciseId: "wde-1",
    });

    vi.mocked(svc.deleteWorkoutDayExercise).mockResolvedValueOnce(undefined);

    await controller.deleteWorkoutDayExercise(mReq, mRes);

    expect(svc.deleteWorkoutDayExercise).toHaveBeenCalledWith(
      "plan-1",
      "day-1",
      "user-1",
      "wde-1",
    );
    expect(mRes.status).toHaveBeenCalledWith(204);
    expect(mRes.send).toHaveBeenCalled();
  });

  it("propagates a NotFoundError from the service", async () => {
    const mReq = { user: { id: "user-1" } } as unknown as Request;
    const mRes = mockResponse({
      planId: "plan-1",
      dayId: "day-1",
      dayExerciseId: "wde-1",
    });

    vi.mocked(svc.deleteWorkoutDayExercise).mockRejectedValueOnce(
      new NotFoundError("Workout day exercise not found."),
    );

    await expect(
      controller.deleteWorkoutDayExercise(mReq, mRes),
    ).rejects.toThrow(NotFoundError);
  });
});
