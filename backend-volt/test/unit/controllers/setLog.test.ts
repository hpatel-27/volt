// Unit tests: set log controller with the service layer mocked.
// The numeric validators (src/helpers/validators.ts) are NOT mocked — they run
// for real and throw BadRequestError, which the controller lets propagate.
// These calls are hoisted so the modules are mocked before import.
vi.mock("../../../src/services/setLog.service.js");
vi.mock("../../../src/db.js");

import type { Request, Response } from "express";
import { expect, it, describe, vi, beforeEach } from "vitest";
import * as setLogService from "../../../src/services/setLog.service.js";
import * as setLogController from "../../../src/controllers/setLog.controller.js";
import { BadRequestError, NotFoundError } from "../../../src/errors.js";

// Minimal Response double: status/json/send chain via mockReturnThis.
// `locals` carries the ids that param middleware would have set: logId +
// exerciseLogId on the nested routes, setId on the flat routes.
function mockResponse(locals: Record<string, unknown> = {}) {
  return {
    locals,
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

describe("SetLog Controller getAllSetLogs", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reads logId + exerciseLogId from res.locals and delegates in order", async () => {
    const mReq = { user: { id: "user-1" } } as unknown as Request;
    const mRes = mockResponse({ logId: "log-1", exerciseLogId: "el-1" });

    const payload = { sets: [{ id: "set-1", setNumber: 1, reps: 10, weight: 135 }] };
    vi.mocked(setLogService.getAllSetLogs).mockResolvedValueOnce(payload as any);

    await setLogController.getAllSetLogs(mReq, mRes);

    expect(setLogService.getAllSetLogs).toHaveBeenCalledWith(
      "log-1",
      "el-1",
      "user-1",
    );
    expect(mRes.json).toHaveBeenCalledWith(payload);
  });

  it("propagates a NotFoundError from the service", async () => {
    const mReq = { user: { id: "user-1" } } as unknown as Request;
    const mRes = mockResponse({ logId: "log-1", exerciseLogId: "el-1" });

    vi.mocked(setLogService.getAllSetLogs).mockRejectedValueOnce(
      new NotFoundError("Exercise log not found."),
    );

    await expect(
      setLogController.getAllSetLogs(mReq, mRes),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("SetLog Controller getSetById", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reads setId from res.locals and delegates (userId, setId)", async () => {
    const mReq = { user: { id: "user-1" } } as unknown as Request;
    const mRes = mockResponse({ setId: "set-7" });

    const set = { id: "set-7", setNumber: 1, reps: 5, weight: 200 };
    vi.mocked(setLogService.getSetById).mockResolvedValueOnce(set as any);

    await setLogController.getSetById(mReq, mRes);

    expect(setLogService.getSetById).toHaveBeenCalledWith("user-1", "set-7");
    expect(mRes.json).toHaveBeenCalledWith(set);
  });

  it("propagates a NotFoundError from the service", async () => {
    const mReq = { user: { id: "user-1" } } as unknown as Request;
    const mRes = mockResponse({ setId: "set-7" });

    vi.mocked(setLogService.getSetById).mockRejectedValueOnce(
      new NotFoundError("Set not found."),
    );

    await expect(
      setLogController.getSetById(mReq, mRes),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("SetLog Controller createSetLog", () => {
  beforeEach(() => vi.clearAllMocks());

  // validatePositiveInt("reps", ...) throws BadRequestError before the service runs.
  it.each([
    ["missing", undefined],
    ["zero", 0],
    ["negative", -3],
    ["a float", 10.5],
    ["non-numeric", "10"],
  ])("throws BadRequestError when reps is %s", async (_label, reps) => {
    const mReq = {
      user: { id: "user-1" },
      body: { reps, weight: 135 },
    } as unknown as Request;
    const mRes = mockResponse({ logId: "log-1", exerciseLogId: "el-1" });

    await expect(
      setLogController.createSetLog(mReq, mRes),
    ).rejects.toThrow(BadRequestError);
    expect(setLogService.createSetLog).not.toHaveBeenCalled();
  });

  // validateNonNegativeNumber("weight", ...) throws BadRequestError. Note 0 is
  // valid (bodyweight), so it is NOT in this list.
  it.each([
    ["missing", undefined],
    ["negative", -1],
    ["non-numeric", "135"],
  ])("throws BadRequestError when weight is %s", async (_label, weight) => {
    const mReq = {
      user: { id: "user-1" },
      body: { reps: 10, weight },
    } as unknown as Request;
    const mRes = mockResponse({ logId: "log-1", exerciseLogId: "el-1" });

    await expect(
      setLogController.createSetLog(mReq, mRes),
    ).rejects.toThrow(BadRequestError);
    expect(setLogService.createSetLog).not.toHaveBeenCalled();
  });

  it("builds the create input and returns 201 (weight 0 is allowed)", async () => {
    const mReq = {
      user: { id: "user-1" },
      body: { reps: 12, weight: 0 },
    } as unknown as Request;
    const mRes = mockResponse({ logId: "log-1", exerciseLogId: "el-1" });

    const created = { id: "set-1", setNumber: 1, reps: 12, weight: 0 };
    vi.mocked(setLogService.createSetLog).mockResolvedValueOnce(created as any);

    await setLogController.createSetLog(mReq, mRes);

    // setNumber is assigned server-side, so it is not part of the controller input.
    expect(setLogService.createSetLog).toHaveBeenCalledWith(
      "log-1",
      "el-1",
      "user-1",
      { exerciseLogId: "el-1", reps: 12, weight: 0 },
    );
    expect(mRes.status).toHaveBeenCalledWith(201);
    expect(mRes.json).toHaveBeenCalledWith(created);
  });

  it("propagates a service error (e.g. DuplicateEntryError)", async () => {
    const mReq = {
      user: { id: "user-1" },
      body: { reps: 10, weight: 135 },
    } as unknown as Request;
    const mRes = mockResponse({ logId: "log-1", exerciseLogId: "el-1" });

    vi.mocked(setLogService.createSetLog).mockRejectedValueOnce(
      new NotFoundError("Exercise log not found."),
    );

    await expect(
      setLogController.createSetLog(mReq, mRes),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("SetLog Controller updateSetLog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 when no updatable fields are provided", async () => {
    const mReq = { user: { id: "user-1" }, body: {} } as unknown as Request;
    const mRes = mockResponse({ setId: "set-1" });

    await setLogController.updateSetLog(mReq, mRes);

    expect(mRes.status).toHaveBeenCalledWith(400);
    expect(mRes.json).toHaveBeenCalledWith({
      error: "No valid fields were provided to update.",
    });
    expect(setLogService.updateSetLog).not.toHaveBeenCalled();
  });

  // A provided-but-invalid field throws BadRequestError via the validators.
  it.each([
    ["reps is zero", { reps: 0 }],
    ["reps is a float", { reps: 8.5 }],
    ["weight is negative", { weight: -10 }],
    ["weight is non-numeric", { weight: "100" }],
  ])("throws BadRequestError when %s", async (_label, body) => {
    const mReq = { user: { id: "user-1" }, body } as unknown as Request;
    const mRes = mockResponse({ setId: "set-1" });

    await expect(
      setLogController.updateSetLog(mReq, mRes),
    ).rejects.toThrow(BadRequestError);
    expect(setLogService.updateSetLog).not.toHaveBeenCalled();
  });

  it("forwards a partial update (only reps) to the service", async () => {
    const mReq = {
      user: { id: "user-1" },
      body: { reps: 12 },
    } as unknown as Request;
    const mRes = mockResponse({ setId: "set-1" });

    const updated = { id: "set-1", setNumber: 1, reps: 12, weight: 135 };
    vi.mocked(setLogService.updateSetLog).mockResolvedValueOnce(updated as any);

    await setLogController.updateSetLog(mReq, mRes);

    // weight was not supplied, so it is omitted from the update data.
    expect(setLogService.updateSetLog).toHaveBeenCalledWith("user-1", "set-1", {
      reps: 12,
    });
    expect(mRes.json).toHaveBeenCalledWith(updated);
  });

  it("forwards both reps and weight (weight 0 allowed) when supplied", async () => {
    const mReq = {
      user: { id: "user-1" },
      body: { reps: 12, weight: 0 },
    } as unknown as Request;
    const mRes = mockResponse({ setId: "set-1" });

    vi.mocked(setLogService.updateSetLog).mockResolvedValueOnce({} as any);

    await setLogController.updateSetLog(mReq, mRes);

    expect(setLogService.updateSetLog).toHaveBeenCalledWith("user-1", "set-1", {
      reps: 12,
      weight: 0,
    });
  });

  it("propagates a NotFoundError from the service", async () => {
    const mReq = {
      user: { id: "user-1" },
      body: { reps: 12 },
    } as unknown as Request;
    const mRes = mockResponse({ setId: "set-1" });

    vi.mocked(setLogService.updateSetLog).mockRejectedValueOnce(
      new NotFoundError("Set not found."),
    );

    await expect(
      setLogController.updateSetLog(mReq, mRes),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("SetLog Controller deleteSetLog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes the set and returns 204", async () => {
    const mReq = { user: { id: "user-1" } } as unknown as Request;
    const mRes = mockResponse({ setId: "set-1" });

    vi.mocked(setLogService.deleteSetLog).mockResolvedValueOnce(undefined);

    await setLogController.deleteSetLog(mReq, mRes);

    expect(setLogService.deleteSetLog).toHaveBeenCalledWith("user-1", "set-1");
    expect(mRes.status).toHaveBeenCalledWith(204);
    expect(mRes.send).toHaveBeenCalled();
  });

  it("propagates a NotFoundError from the service", async () => {
    const mReq = { user: { id: "user-1" } } as unknown as Request;
    const mRes = mockResponse({ setId: "set-1" });

    vi.mocked(setLogService.deleteSetLog).mockRejectedValueOnce(
      new NotFoundError("Set not found."),
    );

    await expect(
      setLogController.deleteSetLog(mReq, mRes),
    ).rejects.toThrow(NotFoundError);
  });
});
