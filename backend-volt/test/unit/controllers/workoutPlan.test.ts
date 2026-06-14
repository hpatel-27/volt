// Unit tests: workout plan controller with the service layer mocked.
// These calls are hoisted so the modules are mocked before import.
vi.mock("../../../src/services/workoutPlan.service.js");
vi.mock("../../../src/db.js");

import type { Request, Response } from "express";
import { expect, it, describe, vi, beforeEach } from "vitest";
import * as workoutPlanService from "../../../src/services/workoutPlan.service.js";
import * as workoutPlanController from "../../../src/controllers/workoutPlan.controller.js";
import { BadRequestError, NotFoundError } from "../../../src/errors.js";

// Minimal Response double: status/json/send all chain via mockReturnThis.
function mockResponse(locals: Record<string, unknown> = {}) {
  return {
    locals,
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

describe("WorkoutPlan Controller getAllWorkoutPlans", () => {
  beforeEach(() => vi.clearAllMocks());

  it("passes pagination through and returns the service payload", async () => {
    const mReq = {
      user: { id: "user-1" },
      pagination: { page: 2, limit: 5 },
      query: {},
    } as unknown as Request;
    const mRes = mockResponse();

    const payload = { workoutPlans: [], total: 0, page: 2, limit: 5 };
    vi.mocked(workoutPlanService.getAllWorkoutPlans).mockResolvedValueOnce(
      payload as any,
    );

    await workoutPlanController.getAllWorkoutPlans(mReq, mRes);

    expect(workoutPlanService.getAllWorkoutPlans).toHaveBeenCalledWith(
      "user-1",
      2,
      5,
      undefined,
    );
    expect(mRes.json).toHaveBeenCalledWith(payload);
  });

  it("forwards a valid type filter to the service", async () => {
    const mReq = {
      user: { id: "user-1" },
      pagination: { page: 1, limit: 10 },
      query: { type: "STRENGTH" },
    } as unknown as Request;
    const mRes = mockResponse();

    const payload = { workoutPlans: [], total: 0, page: 1, limit: 10 };
    vi.mocked(workoutPlanService.getAllWorkoutPlans).mockResolvedValueOnce(
      payload as any,
    );

    await workoutPlanController.getAllWorkoutPlans(mReq, mRes);

    expect(workoutPlanService.getAllWorkoutPlans).toHaveBeenCalledWith(
      "user-1",
      1,
      10,
      "STRENGTH",
    );
  });

  it("throws BadRequestError on an invalid type filter and never calls the service", async () => {
    const mReq = {
      user: { id: "user-1" },
      pagination: { page: 1, limit: 10 },
      query: { type: "CARDIO" },
    } as unknown as Request;
    const mRes = mockResponse();

    await expect(
      workoutPlanController.getAllWorkoutPlans(mReq, mRes),
    ).rejects.toThrow(BadRequestError);

    expect(workoutPlanService.getAllWorkoutPlans).not.toHaveBeenCalled();
  });

  it("propagates a service error to the error middleware", async () => {
    const mReq = {
      user: { id: "user-1" },
      pagination: { page: 1, limit: 10 },
      query: {},
    } as unknown as Request;
    const mRes = mockResponse();

    vi.mocked(workoutPlanService.getAllWorkoutPlans).mockRejectedValueOnce(
      new Error("Server error."),
    );

    await expect(
      workoutPlanController.getAllWorkoutPlans(mReq, mRes),
    ).rejects.toThrow("Server error.");
  });
});

describe("WorkoutPlan Controller getActiveWorkoutPlan", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the active plan summary", async () => {
    const mReq = { user: { id: "user-1" } } as unknown as Request;
    const mRes = mockResponse();

    const active = {
      id: "plan-1",
      name: "PPL",
      type: "STRENGTH",
      daysPerWeek: 3,
      createdAt: "2026-04-14",
      updatedAt: null,
    };
    vi.mocked(workoutPlanService.getActiveWorkoutPlan).mockResolvedValueOnce(
      active as any,
    );

    await workoutPlanController.getActiveWorkoutPlan(mReq, mRes);

    expect(workoutPlanService.getActiveWorkoutPlan).toHaveBeenCalledWith("user-1");
    expect(mRes.json).toHaveBeenCalledWith(active);
  });

  it("returns null straight through when no plan is active", async () => {
    const mReq = { user: { id: "user-1" } } as unknown as Request;
    const mRes = mockResponse();

    vi.mocked(workoutPlanService.getActiveWorkoutPlan).mockResolvedValueOnce(null);

    await workoutPlanController.getActiveWorkoutPlan(mReq, mRes);

    expect(mRes.json).toHaveBeenCalledWith(null);
  });
});

describe("WorkoutPlan Controller getWorkoutPlanById", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reads planId from res.locals and returns the plan", async () => {
    const mReq = { user: { id: "user-1" } } as unknown as Request;
    const mRes = mockResponse({ planId: "plan-7" });

    const plan = { id: "plan-7", name: "PPL", workoutDays: [] };
    vi.mocked(workoutPlanService.getWorkoutPlanById).mockResolvedValueOnce(
      plan as any,
    );

    await workoutPlanController.getWorkoutPlanById(mReq, mRes);

    expect(workoutPlanService.getWorkoutPlanById).toHaveBeenCalledWith(
      "user-1",
      "plan-7",
    );
    expect(mRes.json).toHaveBeenCalledWith(plan);
  });

  it("propagates a NotFoundError from the service", async () => {
    const mReq = { user: { id: "user-1" } } as unknown as Request;
    const mRes = mockResponse({ planId: "plan-7" });

    vi.mocked(workoutPlanService.getWorkoutPlanById).mockRejectedValueOnce(
      new NotFoundError("Workout plan not found."),
    );

    await expect(
      workoutPlanController.getWorkoutPlanById(mReq, mRes),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("WorkoutPlan Controller createWorkoutPlan", () => {
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
    const mRes = mockResponse();

    await expect(
      workoutPlanController.createWorkoutPlan(mReq, mRes),
    ).rejects.toThrow(BadRequestError);

    expect(workoutPlanService.createWorkoutPlan).not.toHaveBeenCalled();
  });

  it("throws BadRequestError when type is not a valid PlanType", async () => {
    const mReq = {
      user: { id: "user-1" },
      body: { name: "PPL", type: "BODYBUILDING" },
    } as unknown as Request;
    const mRes = mockResponse();

    await expect(
      workoutPlanController.createWorkoutPlan(mReq, mRes),
    ).rejects.toThrow(BadRequestError);

    expect(workoutPlanService.createWorkoutPlan).not.toHaveBeenCalled();
  });

  it("creates a plan without a type and returns 201", async () => {
    const mReq = {
      user: { id: "user-1" },
      body: { name: "PPL" },
    } as unknown as Request;
    const mRes = mockResponse();

    const created = {
      id: "plan-1",
      name: "PPL",
      type: null,
      daysPerWeek: 0,
      createdAt: "2026-04-14",
      updatedAt: null,
    };
    vi.mocked(workoutPlanService.createWorkoutPlan).mockResolvedValueOnce(
      created as any,
    );

    await workoutPlanController.createWorkoutPlan(mReq, mRes);

    expect(workoutPlanService.createWorkoutPlan).toHaveBeenCalledWith({
      userId: "user-1",
      name: "PPL",
      type: undefined,
    });
    expect(mRes.status).toHaveBeenCalledWith(201);
    expect(mRes.json).toHaveBeenCalledWith(created);
  });

  // OTHER is a real PlanType even though the error copy only names the other three,
  // so it must pass validation and reach the service.
  it("accepts the OTHER plan type and returns 201", async () => {
    const mReq = {
      user: { id: "user-1" },
      body: { name: "Recovery", type: "OTHER" },
    } as unknown as Request;
    const mRes = mockResponse();

    vi.mocked(workoutPlanService.createWorkoutPlan).mockResolvedValueOnce(
      { id: "plan-2" } as any,
    );

    await workoutPlanController.createWorkoutPlan(mReq, mRes);

    expect(workoutPlanService.createWorkoutPlan).toHaveBeenCalledWith({
      userId: "user-1",
      name: "Recovery",
      type: "OTHER",
    });
    expect(mRes.status).toHaveBeenCalledWith(201);
  });

  it("propagates a service error", async () => {
    const mReq = {
      user: { id: "user-1" },
      body: { name: "PPL", type: "STRENGTH" },
    } as unknown as Request;
    const mRes = mockResponse();

    vi.mocked(workoutPlanService.createWorkoutPlan).mockRejectedValueOnce(
      new Error("db down"),
    );

    await expect(
      workoutPlanController.createWorkoutPlan(mReq, mRes),
    ).rejects.toThrow("db down");
  });
});

describe("WorkoutPlan Controller updateWorkoutPlan", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws BadRequestError when name is provided but empty", async () => {
    const mReq = {
      user: { id: "user-1" },
      body: { name: "" },
    } as unknown as Request;
    const mRes = mockResponse({ planId: "plan-1" });

    await expect(
      workoutPlanController.updateWorkoutPlan(mReq, mRes),
    ).rejects.toThrow(BadRequestError);

    expect(workoutPlanService.updateWorkoutPlan).not.toHaveBeenCalled();
  });

  it("throws BadRequestError when name is provided but not a string", async () => {
    const mReq = {
      user: { id: "user-1" },
      body: { name: 42 },
    } as unknown as Request;
    const mRes = mockResponse({ planId: "plan-1" });

    await expect(
      workoutPlanController.updateWorkoutPlan(mReq, mRes),
    ).rejects.toThrow(BadRequestError);
  });

  it("throws BadRequestError when type is invalid", async () => {
    const mReq = {
      user: { id: "user-1" },
      body: { type: "CARDIO" },
    } as unknown as Request;
    const mRes = mockResponse({ planId: "plan-1" });

    await expect(
      workoutPlanController.updateWorkoutPlan(mReq, mRes),
    ).rejects.toThrow(BadRequestError);

    expect(workoutPlanService.updateWorkoutPlan).not.toHaveBeenCalled();
  });

  it("returns 400 when no updatable fields are provided", async () => {
    const mReq = {
      user: { id: "user-1" },
      body: {},
    } as unknown as Request;
    const mRes = mockResponse({ planId: "plan-1" });

    await workoutPlanController.updateWorkoutPlan(mReq, mRes);

    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "No valid fields were provided to update.",
    });
    expect(workoutPlanService.updateWorkoutPlan).not.toHaveBeenCalled();
  });

  it("forwards only the provided fields to the service", async () => {
    const mReq = {
      user: { id: "user-1" },
      body: { name: "Renamed", type: "HYPERTROPHY" },
    } as unknown as Request;
    const mRes = mockResponse({ planId: "plan-1" });

    const updated = { id: "plan-1", name: "Renamed", workoutDays: [] };
    vi.mocked(workoutPlanService.updateWorkoutPlan).mockResolvedValueOnce(
      updated as any,
    );

    await workoutPlanController.updateWorkoutPlan(mReq, mRes);

    expect(workoutPlanService.updateWorkoutPlan).toHaveBeenCalledWith(
      "user-1",
      "plan-1",
      { name: "Renamed", type: "HYPERTROPHY" },
    );
    expect(mRes.json).toHaveBeenCalledWith(updated);
  });

  it("updates the name alone without sending a type", async () => {
    const mReq = {
      user: { id: "user-1" },
      body: { name: "Just The Name" },
    } as unknown as Request;
    const mRes = mockResponse({ planId: "plan-1" });

    vi.mocked(workoutPlanService.updateWorkoutPlan).mockResolvedValueOnce(
      {} as any,
    );

    await workoutPlanController.updateWorkoutPlan(mReq, mRes);

    expect(workoutPlanService.updateWorkoutPlan).toHaveBeenCalledWith(
      "user-1",
      "plan-1",
      { name: "Just The Name" },
    );
  });

  it("propagates a NotFoundError from the service", async () => {
    const mReq = {
      user: { id: "user-1" },
      body: { name: "Renamed" },
    } as unknown as Request;
    const mRes = mockResponse({ planId: "plan-1" });

    vi.mocked(workoutPlanService.updateWorkoutPlan).mockRejectedValueOnce(
      new NotFoundError("Workout plan not found."),
    );

    await expect(
      workoutPlanController.updateWorkoutPlan(mReq, mRes),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("WorkoutPlan Controller deleteWorkoutPlan", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes the plan and returns 204", async () => {
    const mReq = { user: { id: "user-1" } } as unknown as Request;
    const mRes = mockResponse({ planId: "plan-1" });

    vi.mocked(workoutPlanService.deleteWorkoutPlan).mockResolvedValueOnce(
      undefined,
    );

    await workoutPlanController.deleteWorkoutPlan(mReq, mRes);

    expect(workoutPlanService.deleteWorkoutPlan).toHaveBeenCalledWith(
      "user-1",
      "plan-1",
    );
    expect(mRes.status).toHaveBeenCalledWith(204);
    expect(mRes.send).toHaveBeenCalled();
  });

  it("propagates a BadRequestError when the plan is active", async () => {
    const mReq = { user: { id: "user-1" } } as unknown as Request;
    const mRes = mockResponse({ planId: "plan-1" });

    vi.mocked(workoutPlanService.deleteWorkoutPlan).mockRejectedValueOnce(
      new BadRequestError("Active workout plan cannot be deleted."),
    );

    await expect(
      workoutPlanController.deleteWorkoutPlan(mReq, mRes),
    ).rejects.toThrow(BadRequestError);
  });

  it("propagates a NotFoundError from the service", async () => {
    const mReq = { user: { id: "user-1" } } as unknown as Request;
    const mRes = mockResponse({ planId: "plan-1" });

    vi.mocked(workoutPlanService.deleteWorkoutPlan).mockRejectedValueOnce(
      new NotFoundError("Workout plan not found."),
    );

    await expect(
      workoutPlanController.deleteWorkoutPlan(mReq, mRes),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("WorkoutPlan Controller activateWorkoutPlan", () => {
  beforeEach(() => vi.clearAllMocks());

  it("activates the plan and returns the new active id", async () => {
    const mReq = { user: { id: "user-1" } } as unknown as Request;
    const mRes = mockResponse({ planId: "plan-1" });

    vi.mocked(workoutPlanService.activateWorkoutPlan).mockResolvedValueOnce({
      activePlanId: "plan-1",
    } as any);

    await workoutPlanController.activateWorkoutPlan(mReq, mRes);

    expect(workoutPlanService.activateWorkoutPlan).toHaveBeenCalledWith(
      "user-1",
      "plan-1",
    );
    expect(mRes.json).toHaveBeenCalledWith({ activePlanId: "plan-1" });
  });

  it("propagates a NotFoundError from the service", async () => {
    const mReq = { user: { id: "user-1" } } as unknown as Request;
    const mRes = mockResponse({ planId: "plan-1" });

    vi.mocked(workoutPlanService.activateWorkoutPlan).mockRejectedValueOnce(
      new NotFoundError("Workout plan not found."),
    );

    await expect(
      workoutPlanController.activateWorkoutPlan(mReq, mRes),
    ).rejects.toThrow(NotFoundError);
  });
});
