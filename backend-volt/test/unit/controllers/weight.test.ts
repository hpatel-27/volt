// Unit tests: weight controller with the service layer mocked.
// These calls are hoisted so the modules are mocked before import.
vi.mock("../../../src/services/weight.service.js");
vi.mock("../../../src/db.js");

import type { Request, Response } from "express";
import { expect, it, describe, vi, beforeEach } from "vitest";
import * as weightService from "../../../src/services/weight.service.js";
import * as weightController from "../../../src/controllers/weight.controller.js";
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

describe("Weight Controller getAllWeights", () => {
  beforeEach(() => vi.clearAllMocks());

  it("passes pagination through and returns the service payload", async () => {
    const mReq = {
      user: { id: "user-1" },
      pagination: { page: 2, limit: 5 },
    } as unknown as Request;
    const mRes = mockResponse();

    const payload = { weights: [], total: 0, page: 2, limit: 5 };
    vi.mocked(weightService.getAllWeights).mockResolvedValueOnce(payload as any);

    await weightController.getAllWeights(mReq, mRes);

    expect(weightService.getAllWeights).toHaveBeenCalledWith("user-1", 2, 5);
    expect(mRes.json).toHaveBeenCalledWith(payload);
  });

  it("propagates a service Error to the error middleware", async () => {
    const mReq = {
      user: { id: "user-1" },
      pagination: { page: 1, limit: 10 },
    } as unknown as Request;
    const mRes = mockResponse();

    vi.mocked(weightService.getAllWeights).mockRejectedValueOnce(
      new Error("Server error."),
    );

    await expect(
      weightController.getAllWeights(mReq, mRes),
    ).rejects.toThrow("Server error.");
  });

  it("propagates a non-Error thrown value", async () => {
    const mReq = {
      user: { id: "user-1" },
      pagination: { page: 1, limit: 10 },
    } as unknown as Request;
    const mRes = mockResponse();

    vi.mocked(weightService.getAllWeights).mockRejectedValueOnce("someunknown");

    await expect(weightController.getAllWeights(mReq, mRes)).rejects.toBe(
      "someunknown",
    );
  });
});

describe("Weight Controller getWeightsByRange", () => {
  beforeEach(() => vi.clearAllMocks());

  it("passes the parsed from/to dates and returns the weights", async () => {
    const fromDate = new Date("2026-04-01T00:00:00.000Z");
    const toDate = new Date("2026-04-14T00:00:00.000Z");
    const mReq = { user: { id: "user-1" } } as unknown as Request;
    const mRes = mockResponse({ fromDate, toDate });

    const payload = {
      weights: [
        { id: "w-1", amount: 181, date: "2026-04-02" },
        { id: "w-2", amount: 180, date: "2026-04-10" },
      ],
      total: 2,
    };
    vi.mocked(weightService.getWeightsByRange).mockResolvedValueOnce(
      payload as any,
    );

    await weightController.getWeightsByRange(mReq, mRes);

    expect(weightService.getWeightsByRange).toHaveBeenCalledWith(
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

    vi.mocked(weightService.getWeightsByRange).mockRejectedValueOnce(
      new Error("db down"),
    );

    await expect(
      weightController.getWeightsByRange(mReq, mRes),
    ).rejects.toThrow("db down");
  });
});

describe("Weight Controller getWeightById", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reads the validated weightId from res.locals and returns the weight", async () => {
    const mReq = { user: { id: "user-1" } } as unknown as Request;
    const mRes = mockResponse({ weightId: "w-9" });

    const weight = { id: "w-9", amount: 175, date: "2026-04-15" };
    vi.mocked(weightService.getWeightById).mockResolvedValueOnce(weight as any);

    await weightController.getWeightById(mReq, mRes);

    expect(weightService.getWeightById).toHaveBeenCalledWith("user-1", "w-9");
    expect(mRes.json).toHaveBeenCalledWith(weight);
  });

  it("propagates a NotFoundError from the service", async () => {
    const mReq = { user: { id: "user-1" } } as unknown as Request;
    const mRes = mockResponse({ weightId: "w-9" });

    vi.mocked(weightService.getWeightById).mockRejectedValueOnce(
      new NotFoundError("Weight entry with id: w-9 not found."),
    );

    await expect(
      weightController.getWeightById(mReq, mRes),
    ).rejects.toThrow(NotFoundError);
  });

  it("propagates a non-Error thrown value", async () => {
    const mReq = { user: { id: "user-1" } } as unknown as Request;
    const mRes = mockResponse({ weightId: "w-9" });

    vi.mocked(weightService.getWeightById).mockRejectedValueOnce("unknown");

    await expect(weightController.getWeightById(mReq, mRes)).rejects.toBe(
      "unknown",
    );
  });
});

describe("Weight Controller createWeight", () => {
  beforeEach(() => vi.clearAllMocks());

  it("builds the input from userId + amount + normalized date and returns 201", async () => {
    // parseDate middleware normalizes the body date into res.locals.date
    const mReq = {
      user: { id: "user-1" },
      body: { amount: 180.5 },
    } as unknown as Request;
    const mRes = mockResponse({ date: "2026-04-15T00:00:00.000Z" });

    const created = { id: "w-7", amount: 180.5, date: "2026-04-15" };
    vi.mocked(weightService.createWeight).mockResolvedValueOnce(created as any);

    await weightController.createWeight(mReq, mRes);

    expect(weightService.createWeight).toHaveBeenCalledWith({
      userId: "user-1",
      amount: 180.5,
      date: "2026-04-15T00:00:00.000Z",
    });
    expect(mRes.status).toHaveBeenCalledWith(201);
    expect(mRes.json).toHaveBeenCalledWith(created);
  });

  // validatePositiveNumber throws BadRequestError (it does not return a 400 inline),
  // so the controller rejects and never reaches the service.
  it.each([
    ["missing", undefined],
    ["zero", 0],
    ["negative", -5],
    ["non-numeric", "180"],
  ])("throws BadRequestError when amount is %s", async (_label, amount) => {
    const mReq = {
      user: { id: "user-1" },
      body: { amount },
    } as unknown as Request;
    const mRes = mockResponse({ date: "2026-04-15T00:00:00.000Z" });

    await expect(
      weightController.createWeight(mReq, mRes),
    ).rejects.toThrow(BadRequestError);
    expect(weightService.createWeight).not.toHaveBeenCalled();
  });

  it("propagates a service error", async () => {
    const mReq = {
      user: { id: "user-1" },
      body: { amount: 180 },
    } as unknown as Request;
    const mRes = mockResponse({ date: "2026-04-12T00:00:00.000Z" });

    vi.mocked(weightService.createWeight).mockRejectedValueOnce(
      new Error("Error creating weight in database."),
    );

    await expect(
      weightController.createWeight(mReq, mRes),
    ).rejects.toThrow(Error);
  });
});

describe("Weight Controller updateWeight", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates amount only when date is absent from res.locals", async () => {
    const mReq = {
      user: { id: "user-1" },
      body: { amount: 170 },
    } as unknown as Request;
    // parseOptionalDate left res.locals.date unset
    const mRes = mockResponse({ weightId: "w-1" });

    const updated = { id: "w-1", amount: 170, date: "2026-04-13" };
    vi.mocked(weightService.updateWeight).mockResolvedValueOnce(updated as any);

    await weightController.updateWeight(mReq, mRes);

    expect(weightService.updateWeight).toHaveBeenCalledWith("user-1", "w-1", {
      amount: 170,
    });
    expect(mRes.status).toHaveBeenCalledWith(200);
    expect(mRes.json).toHaveBeenCalledWith(updated);
  });

  it("updates date only when amount is absent from the body", async () => {
    const mReq = { user: { id: "user-1" }, body: {} } as unknown as Request;
    const mRes = mockResponse({
      weightId: "w-1",
      date: "2026-04-20T00:00:00.000Z",
    });

    const updated = { id: "w-1", amount: 180, date: "2026-04-20" };
    vi.mocked(weightService.updateWeight).mockResolvedValueOnce(updated as any);

    await weightController.updateWeight(mReq, mRes);

    expect(weightService.updateWeight).toHaveBeenCalledWith("user-1", "w-1", {
      date: "2026-04-20T00:00:00.000Z",
    });
    expect(mRes.status).toHaveBeenCalledWith(200);
  });

  it("updates both amount and date when both are present", async () => {
    const mReq = {
      user: { id: "user-1" },
      body: { amount: 165.5 },
    } as unknown as Request;
    const mRes = mockResponse({
      weightId: "w-1",
      date: "2026-04-21T00:00:00.000Z",
    });

    vi.mocked(weightService.updateWeight).mockResolvedValueOnce({
      id: "w-1",
      amount: 165.5,
      date: "2026-04-21",
    } as any);

    await weightController.updateWeight(mReq, mRes);

    expect(weightService.updateWeight).toHaveBeenCalledWith("user-1", "w-1", {
      amount: 165.5,
      date: "2026-04-21T00:00:00.000Z",
    });
  });

  it("returns 400 inline when neither amount nor date is provided", async () => {
    const mReq = { user: { id: "user-1" }, body: {} } as unknown as Request;
    const mRes = mockResponse({ weightId: "w-1" });

    await weightController.updateWeight(mReq, mRes);

    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "No valid fields to update",
    });
    expect(weightService.updateWeight).not.toHaveBeenCalled();
  });

  it.each([
    ["zero", 0],
    ["negative", -10],
    ["non-numeric", "170"],
  ])("throws BadRequestError when amount is %s", async (_label, amount) => {
    const mReq = {
      user: { id: "user-1" },
      body: { amount },
    } as unknown as Request;
    const mRes = mockResponse({ weightId: "w-1" });

    await expect(
      weightController.updateWeight(mReq, mRes),
    ).rejects.toThrow(BadRequestError);
    expect(weightService.updateWeight).not.toHaveBeenCalled();
  });

  it("propagates a NotFoundError from the service", async () => {
    const mReq = {
      user: { id: "user-1" },
      body: { amount: 170 },
    } as unknown as Request;
    const mRes = mockResponse({ weightId: "w-1" });

    vi.mocked(weightService.updateWeight).mockRejectedValueOnce(
      new NotFoundError("Weight entry not found."),
    );

    await expect(
      weightController.updateWeight(mReq, mRes),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("Weight Controller deleteWeight", () => {
  beforeEach(() => vi.clearAllMocks());

  it("delegates to the service and returns 204 with an empty body", async () => {
    const mReq = { user: { id: "user-1" } } as unknown as Request;
    const mRes = mockResponse({ weightId: "w-1" });

    vi.mocked(weightService.deleteWeight).mockResolvedValueOnce(undefined);

    await weightController.deleteWeight(mReq, mRes);

    expect(weightService.deleteWeight).toHaveBeenCalledWith("user-1", "w-1");
    expect(mRes.status).toHaveBeenCalledWith(204);
    expect(mRes.send).toHaveBeenCalled();
  });

  it("propagates a NotFoundError from the service", async () => {
    const mReq = { user: { id: "user-1" } } as unknown as Request;
    const mRes = mockResponse({ weightId: "w-1" });

    vi.mocked(weightService.deleteWeight).mockRejectedValueOnce(
      new NotFoundError("Weight entry not found."),
    );

    await expect(
      weightController.deleteWeight(mReq, mRes),
    ).rejects.toThrow(NotFoundError);
  });

  it("propagates a non-Error thrown value", async () => {
    const mReq = { user: { id: "user-1" } } as unknown as Request;
    const mRes = mockResponse({ weightId: "w-1" });

    vi.mocked(weightService.deleteWeight).mockRejectedValueOnce("unknown");

    await expect(weightController.deleteWeight(mReq, mRes)).rejects.toBe(
      "unknown",
    );
  });
});
