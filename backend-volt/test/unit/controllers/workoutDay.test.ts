// Unit tests: workout day controller with the service layer mocked.
// These calls are hoisted so the modules are mocked before import.
vi.mock("../../../src/services/workoutDay.service.js");
vi.mock("../../../src/db.js");

import type { Request, Response } from "express";
import { expect, it, describe, vi, beforeEach } from "vitest";
import * as workoutDayService from "../../../src/services/workoutDay.service.js";
import * as workoutDayController from "../../../src/controllers/workoutDay.controller.js";
import { BadRequestError, NotFoundError } from "../../../src/errors.js";

// Minimal Response double: status/json/send all chain via mockReturnThis.
// `locals` carries the planId/dayId that param middleware would have set.
function mockResponse(locals: Record<string, unknown> = {}) {
  return {
    locals,
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

describe("WorkoutDay Controller getAllWorkoutDays", () => {
  beforeEach(() => vi.clearAllMocks());

  it("delegates with (planId, userId) and returns the service payload", async () => {
    const mReq = { user: { id: "user-1" } } as unknown as Request;
    const mRes = mockResponse({ planId: "plan-1" });

    const payload = { workoutDays: [{ id: "day-1", name: "Push", order: 1 }] };
    vi.mocked(workoutDayService.getAllWorkoutDays).mockResolvedValueOnce(
      payload as any,
    );

    await workoutDayController.getAllWorkoutDays(mReq, mRes);

    expect(workoutDayService.getAllWorkoutDays).toHaveBeenCalledWith(
      "plan-1",
      "user-1",
    );
    expect(mRes.json).toHaveBeenCalledWith(payload);
  });

  it("propagates a service error to the error middleware", async () => {
    const mReq = { user: { id: "user-1" } } as unknown as Request;
    const mRes = mockResponse({ planId: "plan-1" });

    vi.mocked(workoutDayService.getAllWorkoutDays).mockRejectedValueOnce(
      new NotFoundError("Workout plan not found."),
    );

    await expect(
      workoutDayController.getAllWorkoutDays(mReq, mRes),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("WorkoutDay Controller getWorkoutDayById", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reads planId + dayId from res.locals and delegates in order", async () => {
    const mReq = { user: { id: "user-1" } } as unknown as Request;
    const mRes = mockResponse({ planId: "plan-1", dayId: "day-7" });

    const day = { id: "day-7", name: "Push", order: 1, exercises: [] };
    vi.mocked(workoutDayService.getWorkoutDayById).mockResolvedValueOnce(
      day as any,
    );

    await workoutDayController.getWorkoutDayById(mReq, mRes);

    expect(workoutDayService.getWorkoutDayById).toHaveBeenCalledWith(
      "plan-1",
      "user-1",
      "day-7",
    );
    expect(mRes.json).toHaveBeenCalledWith(day);
  });

  it("propagates a NotFoundError from the service", async () => {
    const mReq = { user: { id: "user-1" } } as unknown as Request;
    const mRes = mockResponse({ planId: "plan-1", dayId: "day-7" });

    vi.mocked(workoutDayService.getWorkoutDayById).mockRejectedValueOnce(
      new NotFoundError("Workout day not found."),
    );

    await expect(
      workoutDayController.getWorkoutDayById(mReq, mRes),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("WorkoutDay Controller createWorkoutDay", () => {
  beforeEach(() => vi.clearAllMocks());

  // Each invalid name short-circuits via validateBoundedString, which THROWS
  // (mapped to a 400 by the error middleware) before the service runs.
  it.each([
    ["missing name", {}],
    ["name is undefined", { name: undefined }],
    ["name is not a string", { name: 123 }],
    ["name is an empty string", { name: "" }],
  ])("throws BadRequestError when %s", async (_label, body) => {
    const mReq = { user: { id: "user-1" }, body } as unknown as Request;
    const mRes = mockResponse({ planId: "plan-1" });

    await expect(
      workoutDayController.createWorkoutDay(mReq, mRes),
    ).rejects.toThrow(BadRequestError);

    expect(workoutDayService.createWorkoutDay).not.toHaveBeenCalled();
  });

  it("builds the create input with a placeholder order and returns 201", async () => {
    const mReq = {
      user: { id: "user-1" },
      body: { name: "Push" },
    } as unknown as Request;
    const mRes = mockResponse({ planId: "plan-1" });

    const created = { id: "day-1", name: "Push", order: 1 };
    vi.mocked(workoutDayService.createWorkoutDay).mockResolvedValueOnce(
      created as any,
    );

    await workoutDayController.createWorkoutDay(mReq, mRes);

    // The controller passes order: -1; the service assigns the real position.
    expect(workoutDayService.createWorkoutDay).toHaveBeenCalledWith(
      "plan-1",
      "user-1",
      { workoutPlanId: "plan-1", name: "Push", order: -1 },
    );
    expect(mRes.status).toHaveBeenCalledWith(201);
    expect(mRes.json).toHaveBeenCalledWith(created);
  });

  it("propagates a service error", async () => {
    const mReq = {
      user: { id: "user-1" },
      body: { name: "Push" },
    } as unknown as Request;
    const mRes = mockResponse({ planId: "plan-1" });

    vi.mocked(workoutDayService.createWorkoutDay).mockRejectedValueOnce(
      new NotFoundError("Workout plan not found."),
    );

    await expect(
      workoutDayController.createWorkoutDay(mReq, mRes),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("WorkoutDay Controller updateWorkoutDay", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws BadRequestError when name is provided but empty", async () => {
    const mReq = {
      user: { id: "user-1" },
      body: { name: "" },
    } as unknown as Request;
    const mRes = mockResponse({ planId: "plan-1", dayId: "day-1" });

    await expect(
      workoutDayController.updateWorkoutDay(mReq, mRes),
    ).rejects.toThrow(BadRequestError);

    expect(workoutDayService.updateWorkoutDay).not.toHaveBeenCalled();
  });

  it("throws BadRequestError when name is provided but not a string", async () => {
    const mReq = {
      user: { id: "user-1" },
      body: { name: 42 },
    } as unknown as Request;
    const mRes = mockResponse({ planId: "plan-1", dayId: "day-1" });

    await expect(
      workoutDayController.updateWorkoutDay(mReq, mRes),
    ).rejects.toThrow(BadRequestError);
  });

  it("returns 400 when no updatable fields are provided", async () => {
    const mReq = {
      user: { id: "user-1" },
      body: {},
    } as unknown as Request;
    const mRes = mockResponse({ planId: "plan-1", dayId: "day-1" });

    await workoutDayController.updateWorkoutDay(mReq, mRes);

    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "No valid fields were provided to update.",
    });
    expect(workoutDayService.updateWorkoutDay).not.toHaveBeenCalled();
  });

  it("forwards the name to the service and returns the updated day", async () => {
    const mReq = {
      user: { id: "user-1" },
      body: { name: "Renamed" },
    } as unknown as Request;
    const mRes = mockResponse({ planId: "plan-1", dayId: "day-1" });

    const updated = { id: "day-1", name: "Renamed", order: 1, exercises: [] };
    vi.mocked(workoutDayService.updateWorkoutDay).mockResolvedValueOnce(
      updated as any,
    );

    await workoutDayController.updateWorkoutDay(mReq, mRes);

    expect(workoutDayService.updateWorkoutDay).toHaveBeenCalledWith(
      "plan-1",
      "user-1",
      "day-1",
      { name: "Renamed" },
    );
    expect(mRes.json).toHaveBeenCalledWith(updated);
  });

  it("propagates a NotFoundError from the service", async () => {
    const mReq = {
      user: { id: "user-1" },
      body: { name: "Renamed" },
    } as unknown as Request;
    const mRes = mockResponse({ planId: "plan-1", dayId: "day-1" });

    vi.mocked(workoutDayService.updateWorkoutDay).mockRejectedValueOnce(
      new NotFoundError("Workout day not found."),
    );

    await expect(
      workoutDayController.updateWorkoutDay(mReq, mRes),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("WorkoutDay Controller deleteWorkoutDay", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes the day and returns 204", async () => {
    const mReq = { user: { id: "user-1" } } as unknown as Request;
    const mRes = mockResponse({ planId: "plan-1", dayId: "day-1" });

    vi.mocked(workoutDayService.deleteWorkoutDay).mockResolvedValueOnce(
      undefined,
    );

    await workoutDayController.deleteWorkoutDay(mReq, mRes);

    expect(workoutDayService.deleteWorkoutDay).toHaveBeenCalledWith(
      "plan-1",
      "user-1",
      "day-1",
    );
    expect(mRes.status).toHaveBeenCalledWith(204);
    expect(mRes.send).toHaveBeenCalled();
  });

  it("propagates a NotFoundError from the service", async () => {
    const mReq = { user: { id: "user-1" } } as unknown as Request;
    const mRes = mockResponse({ planId: "plan-1", dayId: "day-1" });

    vi.mocked(workoutDayService.deleteWorkoutDay).mockRejectedValueOnce(
      new NotFoundError("Workout day not found."),
    );

    await expect(
      workoutDayController.deleteWorkoutDay(mReq, mRes),
    ).rejects.toThrow(NotFoundError);
  });
});
