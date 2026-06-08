// Unit tests: set log service with a mocked database.
// This call is hoisted so the db is mocked before the prisma import.
vi.mock("../../../src/db.js");

import { type DeepMockProxy, mockReset } from "vitest-mock-extended";
import { expect, test, describe, vi, beforeEach } from "vitest";
import { prisma } from "../../../src/db.js";
import * as setLogService from "../../../src/services/setLog.service.js";
import { Prisma } from "../../../src/generated/prisma/client.js";
import { DuplicateEntryError, NotFoundError } from "../../../src/errors.js";

// Cast to the deep mock proxy so the mockResolved*/mockRejected* helpers type-check.
const prismaMock = prisma as unknown as DeepMockProxy<typeof prisma>;

// Build a P-coded Prisma error so we can drive the service's catch branches.
function prismaError(code: string) {
  return new Prisma.PrismaClientKnownRequestError(`Prisma error ${code}`, {
    code,
    clientVersion: "7.4.2",
  });
}

// A raw SetLog row as Prisma returns it — the exerciseLogId FK is present and
// must be stripped by the mapper (toSetLogDto).
function rawSet(overrides: Record<string, unknown> = {}) {
  return {
    id: "set-1",
    exerciseLogId: "el-1",
    setNumber: 1,
    reps: 10,
    weight: 135,
    ...overrides,
  } as any;
}

describe("SetLog Service getAllSetLogs", () => {
  beforeEach(() => mockReset(prismaMock));

  test("throws NotFoundError when the parent exercise log is missing or not owned", async () => {
    prismaMock.exerciseLog.findFirst.mockResolvedValueOnce(null);

    await expect(
      setLogService.getAllSetLogs("log-1", "el-1", "user-1"),
    ).rejects.toThrow(new NotFoundError("Exercise log not found."));
  });

  test("scopes the parent lookup through the full ownership chain and orders sets", async () => {
    prismaMock.exerciseLog.findFirst.mockResolvedValueOnce({ sets: [] } as any);

    await setLogService.getAllSetLogs("log-1", "el-1", "user-1");

    expect(prismaMock.exerciseLog.findFirst).toHaveBeenCalledWith({
      where: {
        id: "el-1",
        workoutLogId: "log-1",
        workoutLog: { userId: "user-1" },
      },
      include: { sets: { orderBy: { setNumber: "asc" } } },
    });
  });

  test("returns a wrapped, mapped list (exerciseLogId stripped)", async () => {
    prismaMock.exerciseLog.findFirst.mockResolvedValueOnce({
      sets: [rawSet(), rawSet({ id: "set-2", setNumber: 2, reps: 8, weight: 145 })],
    } as any);

    const result = await setLogService.getAllSetLogs("log-1", "el-1", "user-1");

    expect(result).toStrictEqual({
      sets: [
        { id: "set-1", setNumber: 1, reps: 10, weight: 135 },
        { id: "set-2", setNumber: 2, reps: 8, weight: 145 },
      ],
    });
    expect(result.sets[0]).not.toHaveProperty("exerciseLogId");
  });

  test("returns an empty wrapped list when the exercise log has no sets", async () => {
    prismaMock.exerciseLog.findFirst.mockResolvedValueOnce({ sets: [] } as any);

    const result = await setLogService.getAllSetLogs("log-1", "el-1", "user-1");
    expect(result).toStrictEqual({ sets: [] });
  });

  test("propagates an unexpected error", async () => {
    const dbError = new Error("Prisma database is currently unavailable.");
    prismaMock.exerciseLog.findFirst.mockRejectedValueOnce(dbError);

    await expect(
      setLogService.getAllSetLogs("log-1", "el-1", "user-1"),
    ).rejects.toThrow(dbError);
  });
});

describe("SetLog Service getSetById", () => {
  beforeEach(() => mockReset(prismaMock));

  test("throws NotFoundError when the set does not exist or is not owned", async () => {
    prismaMock.setLog.findFirst.mockResolvedValueOnce(null);

    await expect(
      setLogService.getSetById("user-1", "set-1"),
    ).rejects.toThrow(new NotFoundError("Set not found."));
  });

  test("scopes the lookup by set id and ownership through the relation chain", async () => {
    prismaMock.setLog.findFirst.mockResolvedValueOnce(rawSet());

    await setLogService.getSetById("user-1", "set-1");

    // The flat route has no parent ids — ownership is proven via the nested relation.
    expect(prismaMock.setLog.findFirst).toHaveBeenCalledWith({
      where: {
        id: "set-1",
        exerciseLog: { workoutLog: { userId: "user-1" } },
      },
    });
  });

  test("returns the mapped DTO (exerciseLogId stripped)", async () => {
    prismaMock.setLog.findFirst.mockResolvedValueOnce(rawSet());

    const result = await setLogService.getSetById("user-1", "set-1");

    expect(result).toStrictEqual({
      id: "set-1",
      setNumber: 1,
      reps: 10,
      weight: 135,
    });
    expect(result).not.toHaveProperty("exerciseLogId");
  });

  test("propagates an unexpected error", async () => {
    const dbError = new Error("Prisma database is currently unavailable.");
    prismaMock.setLog.findFirst.mockRejectedValueOnce(dbError);

    await expect(
      setLogService.getSetById("user-1", "set-1"),
    ).rejects.toThrow(dbError);
  });
});

describe("SetLog Service createSetLog", () => {
  // create wraps its checks + insert in a CALLBACK-style transaction.
  beforeEach(() => {
    mockReset(prismaMock);
    prismaMock.$transaction.mockImplementation((cb: any) => cb(prismaMock));
  });

  const data = { exerciseLogId: "el-1", reps: 10, weight: 135 };

  test("throws NotFoundError (and never creates) when the parent exercise log is missing", async () => {
    prismaMock.exerciseLog.findFirst.mockResolvedValueOnce(null);

    await expect(
      setLogService.createSetLog("log-1", "el-1", "user-1", data),
    ).rejects.toThrow(new NotFoundError("Exercise log not found."));
    expect(prismaMock.setLog.create).not.toHaveBeenCalled();
  });

  test("assigns setNumber 1 for the exercise log's first set", async () => {
    prismaMock.exerciseLog.findFirst.mockResolvedValueOnce({ id: "el-1" } as any);
    // No existing sets → the max-setNumber lookup comes back null.
    prismaMock.setLog.findFirst.mockResolvedValueOnce(null);
    prismaMock.setLog.create.mockResolvedValueOnce(rawSet({ setNumber: 1 }));

    const result = await setLogService.createSetLog("log-1", "el-1", "user-1", data);

    expect(prismaMock.setLog.findFirst).toHaveBeenCalledWith({
      where: { exerciseLogId: "el-1" },
      orderBy: { setNumber: "desc" },
      select: { setNumber: true },
    });
    expect(prismaMock.setLog.create).toHaveBeenCalledWith({
      data: { exerciseLogId: "el-1", reps: 10, weight: 135, setNumber: 1 },
    });
    expect(result).toStrictEqual({
      id: "set-1",
      setNumber: 1,
      reps: 10,
      weight: 135,
    });
  });

  test("assigns the next setNumber (max + 1) when sets already exist", async () => {
    prismaMock.exerciseLog.findFirst.mockResolvedValueOnce({ id: "el-1" } as any);
    prismaMock.setLog.findFirst.mockResolvedValueOnce({ setNumber: 3 } as any);
    prismaMock.setLog.create.mockResolvedValueOnce(rawSet({ id: "set-4", setNumber: 4 }));

    await setLogService.createSetLog("log-1", "el-1", "user-1", data);

    expect(prismaMock.setLog.create).toHaveBeenCalledWith({
      data: { exerciseLogId: "el-1", reps: 10, weight: 135, setNumber: 4 },
    });
  });

  test("maps a P2002 unique violation to DuplicateEntryError (409)", async () => {
    prismaMock.exerciseLog.findFirst.mockResolvedValueOnce({ id: "el-1" } as any);
    prismaMock.setLog.findFirst.mockResolvedValueOnce(null);
    prismaMock.setLog.create.mockRejectedValueOnce(prismaError("P2002"));

    await expect(
      setLogService.createSetLog("log-1", "el-1", "user-1", data),
    ).rejects.toThrow(
      new DuplicateEntryError("A set with this set number already exists."),
    );
  });

  test("propagates an unexpected error from create", async () => {
    prismaMock.exerciseLog.findFirst.mockResolvedValueOnce({ id: "el-1" } as any);
    prismaMock.setLog.findFirst.mockResolvedValueOnce(null);
    const dbError = new Error("Prisma database is currently unavailable.");
    prismaMock.setLog.create.mockRejectedValueOnce(dbError);

    await expect(
      setLogService.createSetLog("log-1", "el-1", "user-1", data),
    ).rejects.toThrow(dbError);
  });
});

describe("SetLog Service updateSetLog", () => {
  beforeEach(() => mockReset(prismaMock));

  test("updates through the ownership chain and returns the DTO", async () => {
    prismaMock.setLog.update.mockResolvedValueOnce(rawSet({ reps: 12, weight: 140 }));

    const result = await setLogService.updateSetLog("user-1", "set-1", {
      reps: 12,
      weight: 140,
    });

    expect(prismaMock.setLog.update).toHaveBeenCalledWith({
      where: {
        id: "set-1",
        exerciseLog: { workoutLog: { userId: "user-1" } },
      },
      data: { reps: 12, weight: 140 },
    });
    expect(result).toStrictEqual({
      id: "set-1",
      setNumber: 1,
      reps: 12,
      weight: 140,
    });
    expect(result).not.toHaveProperty("exerciseLogId");
  });

  test("maps P2025 to NotFoundError", async () => {
    prismaMock.setLog.update.mockRejectedValueOnce(prismaError("P2025"));

    await expect(
      setLogService.updateSetLog("user-1", "set-1", { reps: 12 }),
    ).rejects.toThrow(new NotFoundError("Set not found."));
  });

  test("rethrows non-P2025 Prisma errors unchanged", async () => {
    const fkError = prismaError("P2003");
    prismaMock.setLog.update.mockRejectedValueOnce(fkError);

    await expect(
      setLogService.updateSetLog("user-1", "set-1", { reps: 12 }),
    ).rejects.toBe(fkError);
  });

  test("propagates a non-Error thrown value", async () => {
    prismaMock.setLog.update.mockRejectedValueOnce(42);

    await expect(
      setLogService.updateSetLog("user-1", "set-1", { reps: 12 }),
    ).rejects.toBe(42);
  });
});

describe("SetLog Service deleteSetLog", () => {
  beforeEach(() => mockReset(prismaMock));

  test("deletes through the ownership chain and resolves undefined", async () => {
    prismaMock.setLog.delete.mockResolvedValueOnce(rawSet() as any);

    const result = await setLogService.deleteSetLog("user-1", "set-1");

    expect(result).toBeUndefined();
    expect(prismaMock.setLog.delete).toHaveBeenCalledWith({
      where: {
        id: "set-1",
        exerciseLog: { workoutLog: { userId: "user-1" } },
      },
    });
  });

  test("maps P2025 to NotFoundError", async () => {
    prismaMock.setLog.delete.mockRejectedValueOnce(prismaError("P2025"));

    await expect(
      setLogService.deleteSetLog("user-1", "set-1"),
    ).rejects.toThrow(new NotFoundError("Set not found."));
  });

  test("rethrows non-P2025 Prisma errors unchanged", async () => {
    const fkError = prismaError("P2003");
    prismaMock.setLog.delete.mockRejectedValueOnce(fkError);

    await expect(
      setLogService.deleteSetLog("user-1", "set-1"),
    ).rejects.toBe(fkError);
  });

  test("propagates a non-Error thrown value", async () => {
    prismaMock.setLog.delete.mockRejectedValueOnce("unknown");

    await expect(
      setLogService.deleteSetLog("user-1", "set-1"),
    ).rejects.toBe("unknown");
  });
});
