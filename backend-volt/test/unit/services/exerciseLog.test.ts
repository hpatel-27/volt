// Unit tests: exercise log service with a mocked database.
// This call is hoisted so the db is mocked before the prisma import.
vi.mock("../../../src/db.js");

import { type DeepMockProxy, mockReset } from "vitest-mock-extended";
import { expect, test, describe, vi, beforeEach } from "vitest";
import { prisma } from "../../../src/db.js";
import * as exerciseLogService from "../../../src/services/exerciseLog.service.js";
import { Prisma } from "../../../src/generated/prisma/client.js";
import { NotFoundError } from "../../../src/errors.js";

// Cast to the deep mock proxy so the mockResolved*/mockRejected* helpers type-check.
const prismaMock = prisma as unknown as DeepMockProxy<typeof prisma>;

// Build a P-coded Prisma error so we can drive the service's catch branches.
function prismaError(code: string) {
  return new Prisma.PrismaClientKnownRequestError(`Prisma error ${code}`, {
    code,
    clientVersion: "7.4.2",
  });
}

// A raw ExerciseLog row as Prisma returns it for the DETAIL query: the
// exerciseId + workoutLogId FKs are present and must be stripped by the mapper;
// `exercise` is the denormalized ref and `sets` are pre-ordered by setNumber.
function rawExerciseLog(overrides: Record<string, unknown> = {}) {
  return {
    id: "el-1",
    exerciseId: "ex-1",
    workoutLogId: "log-1",
    notes: "felt strong",
    exercise: { id: "ex-1", slug: "bench_press", name: "Bench Press" },
    sets: [
      {
        id: "set-1",
        exerciseLogId: "el-1",
        setNumber: 1,
        reps: 10,
        weight: 135,
      },
      {
        id: "set-2",
        exerciseLogId: "el-1",
        setNumber: 2,
        reps: 8,
        weight: 145,
      },
    ],
    ...overrides,
  } as any;
}

// The DTO the mapper should produce from rawExerciseLog() above.
const expectedDto = {
  id: "el-1",
  exercise: { id: "ex-1", slug: "bench_press", name: "Bench Press" },
  notes: "felt strong",
  sets: [
    { id: "set-1", setNumber: 1, reps: 10, weight: 135 },
    { id: "set-2", setNumber: 2, reps: 8, weight: 145 },
  ],
};

describe("ExerciseLog Service getAllExerciseLogs", () => {
  beforeEach(() => mockReset(prismaMock));

  test("throws NotFoundError when the parent workout log is missing or not owned", async () => {
    prismaMock.workoutLog.findUnique.mockResolvedValueOnce(null);

    await expect(
      exerciseLogService.getAllExerciseLogs("log-1", "user-1"),
    ).rejects.toThrow(new NotFoundError("Workout log not found."));
  });

  test("scopes the parent lookup to the log id AND the owning user", async () => {
    prismaMock.workoutLog.findUnique.mockResolvedValueOnce({
      exerciseLogs: [],
    } as any);

    await exerciseLogService.getAllExerciseLogs("log-1", "user-1");

    expect(prismaMock.workoutLog.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "log-1", userId: "user-1" },
      }),
    );
  });

  test("returns a wrapped, mapped list (FKs stripped)", async () => {
    prismaMock.workoutLog.findUnique.mockResolvedValueOnce({
      exerciseLogs: [rawExerciseLog(), rawExerciseLog({ id: "el-2", notes: null })],
    } as any);

    const result = await exerciseLogService.getAllExerciseLogs("log-1", "user-1");

    expect(result).toStrictEqual({
      exerciseLogs: [expectedDto, { ...expectedDto, id: "el-2", notes: null }],
    });
    expect(result.exerciseLogs[0]).not.toHaveProperty("workoutLogId");
    expect(result.exerciseLogs[0]).not.toHaveProperty("exerciseId");
  });

  test("returns an empty wrapped list when the log has no exercises", async () => {
    prismaMock.workoutLog.findUnique.mockResolvedValueOnce({
      exerciseLogs: [],
    } as any);

    const result = await exerciseLogService.getAllExerciseLogs("log-1", "user-1");
    expect(result).toStrictEqual({ exerciseLogs: [] });
  });

  test("propagates an unexpected error", async () => {
    const dbError = new Error("Prisma database is currently unavailable.");
    prismaMock.workoutLog.findUnique.mockRejectedValueOnce(dbError);

    await expect(
      exerciseLogService.getAllExerciseLogs("log-1", "user-1"),
    ).rejects.toThrow(dbError);
  });
});

describe("ExerciseLog Service getExerciseLogById", () => {
  beforeEach(() => mockReset(prismaMock));

  test("throws NotFoundError when the exercise log does not exist", async () => {
    prismaMock.exerciseLog.findFirst.mockResolvedValueOnce(null);

    await expect(
      exerciseLogService.getExerciseLogById("log-1", "user-1", "el-1"),
    ).rejects.toThrow(new NotFoundError("Exercise log not found."));
  });

  test("scopes the lookup through the full ownership chain", async () => {
    prismaMock.exerciseLog.findFirst.mockResolvedValueOnce(rawExerciseLog());

    await exerciseLogService.getExerciseLogById("log-1", "user-1", "el-1");

    // The row must belong to this exercise log, under this parent workout log,
    // owned by this user.
    expect(prismaMock.exerciseLog.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "el-1",
          workoutLogId: "log-1",
          workoutLog: { userId: "user-1" },
        },
      }),
    );
  });

  test("returns the mapped DTO with ordered sets (FKs stripped)", async () => {
    prismaMock.exerciseLog.findFirst.mockResolvedValueOnce(rawExerciseLog());

    const result = await exerciseLogService.getExerciseLogById(
      "log-1",
      "user-1",
      "el-1",
    );

    expect(result).toStrictEqual(expectedDto);
    expect(result).not.toHaveProperty("workoutLogId");
    expect(result).not.toHaveProperty("exerciseId");
    expect(result.sets[0]).not.toHaveProperty("exerciseLogId");
  });

  test("propagates an unexpected error", async () => {
    const dbError = new Error("Prisma database is currently unavailable.");
    prismaMock.exerciseLog.findFirst.mockRejectedValueOnce(dbError);

    await expect(
      exerciseLogService.getExerciseLogById("log-1", "user-1", "el-1"),
    ).rejects.toThrow(dbError);
  });
});

describe("ExerciseLog Service createExerciseLog", () => {
  // create wraps its checks + insert in a CALLBACK-style transaction.
  beforeEach(() => {
    mockReset(prismaMock);
    prismaMock.$transaction.mockImplementation((cb: any) => cb(prismaMock));
  });

  const data = { workoutLogId: "log-1", exerciseId: "ex-1", notes: "go" };

  test("throws NotFoundError (and never creates) when the parent log is missing", async () => {
    prismaMock.workoutLog.findUnique.mockResolvedValueOnce(null);

    await expect(
      exerciseLogService.createExerciseLog("log-1", "user-1", data),
    ).rejects.toThrow(new NotFoundError("Workout log not found."));
    expect(prismaMock.exercise.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.exerciseLog.create).not.toHaveBeenCalled();
  });

  test("throws NotFoundError (and never creates) when the exercise is missing", async () => {
    prismaMock.workoutLog.findUnique.mockResolvedValueOnce({ id: "log-1" } as any);
    prismaMock.exercise.findUnique.mockResolvedValueOnce(null);

    await expect(
      exerciseLogService.createExerciseLog("log-1", "user-1", data),
    ).rejects.toThrow(new NotFoundError("Exercise not found."));
    expect(prismaMock.exerciseLog.create).not.toHaveBeenCalled();
  });

  test("verifies log ownership + exercise, then creates and returns the DTO", async () => {
    prismaMock.workoutLog.findUnique.mockResolvedValueOnce({ id: "log-1" } as any);
    prismaMock.exercise.findUnique.mockResolvedValueOnce({ id: "ex-1" } as any);
    prismaMock.exerciseLog.create.mockResolvedValueOnce(rawExerciseLog());

    const result = await exerciseLogService.createExerciseLog(
      "log-1",
      "user-1",
      data,
    );

    expect(prismaMock.workoutLog.findUnique).toHaveBeenCalledWith({
      where: { id: "log-1", userId: "user-1" },
    });
    expect(prismaMock.exercise.findUnique).toHaveBeenCalledWith({
      where: { id: "ex-1" },
    });
    expect(prismaMock.exerciseLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data }),
    );
    expect(result).toStrictEqual(expectedDto);
  });

  test("propagates an unexpected error from create", async () => {
    prismaMock.workoutLog.findUnique.mockResolvedValueOnce({ id: "log-1" } as any);
    prismaMock.exercise.findUnique.mockResolvedValueOnce({ id: "ex-1" } as any);
    const dbError = new Error("Prisma database is currently unavailable.");
    prismaMock.exerciseLog.create.mockRejectedValueOnce(dbError);

    await expect(
      exerciseLogService.createExerciseLog("log-1", "user-1", data),
    ).rejects.toThrow(dbError);
  });
});

describe("ExerciseLog Service updateExerciseLog", () => {
  beforeEach(() => mockReset(prismaMock));

  test("updates through the ownership chain and returns the DTO", async () => {
    prismaMock.exerciseLog.update.mockResolvedValueOnce(
      rawExerciseLog({ notes: "updated" }),
    );

    const result = await exerciseLogService.updateExerciseLog(
      "log-1",
      "user-1",
      "el-1",
      { notes: "updated" },
    );

    expect(prismaMock.exerciseLog.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "el-1",
          workoutLogId: "log-1",
          workoutLog: { userId: "user-1" },
        },
        data: { notes: "updated" },
      }),
    );
    expect(result.notes).toBe("updated");
    expect(result).not.toHaveProperty("workoutLogId");
  });

  test("forwards notes: null to clear the field", async () => {
    prismaMock.exerciseLog.update.mockResolvedValueOnce(
      rawExerciseLog({ notes: null }),
    );

    const result = await exerciseLogService.updateExerciseLog(
      "log-1",
      "user-1",
      "el-1",
      { notes: null },
    );

    expect(prismaMock.exerciseLog.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { notes: null } }),
    );
    expect(result.notes).toBeNull();
  });

  test("maps P2025 to NotFoundError", async () => {
    prismaMock.exerciseLog.update.mockRejectedValueOnce(prismaError("P2025"));

    await expect(
      exerciseLogService.updateExerciseLog("log-1", "user-1", "el-1", {
        notes: "x",
      }),
    ).rejects.toThrow(new NotFoundError("Exercise log not found."));
  });

  test("rethrows non-P2025 Prisma errors unchanged", async () => {
    const fkError = prismaError("P2003");
    prismaMock.exerciseLog.update.mockRejectedValueOnce(fkError);

    await expect(
      exerciseLogService.updateExerciseLog("log-1", "user-1", "el-1", {
        exerciseId: "ex-9",
      }),
    ).rejects.toBe(fkError);
  });

  test("propagates a non-Error thrown value", async () => {
    prismaMock.exerciseLog.update.mockRejectedValueOnce(42);

    await expect(
      exerciseLogService.updateExerciseLog("log-1", "user-1", "el-1", {
        notes: "x",
      }),
    ).rejects.toBe(42);
  });
});

describe("ExerciseLog Service deleteExerciseLog", () => {
  beforeEach(() => mockReset(prismaMock));

  test("deletes through the ownership chain and resolves undefined", async () => {
    prismaMock.exerciseLog.delete.mockResolvedValueOnce(rawExerciseLog() as any);

    const result = await exerciseLogService.deleteExerciseLog(
      "log-1",
      "user-1",
      "el-1",
    );

    expect(result).toBeUndefined();
    expect(prismaMock.exerciseLog.delete).toHaveBeenCalledWith({
      where: {
        id: "el-1",
        workoutLogId: "log-1",
        workoutLog: { userId: "user-1" },
      },
    });
  });

  test("maps P2025 to NotFoundError", async () => {
    prismaMock.exerciseLog.delete.mockRejectedValueOnce(prismaError("P2025"));

    await expect(
      exerciseLogService.deleteExerciseLog("log-1", "user-1", "el-1"),
    ).rejects.toThrow(new NotFoundError("Exercise log not found."));
  });

  test("rethrows non-P2025 Prisma errors unchanged", async () => {
    const fkError = prismaError("P2003");
    prismaMock.exerciseLog.delete.mockRejectedValueOnce(fkError);

    await expect(
      exerciseLogService.deleteExerciseLog("log-1", "user-1", "el-1"),
    ).rejects.toBe(fkError);
  });

  test("propagates a non-Error thrown value", async () => {
    prismaMock.exerciseLog.delete.mockRejectedValueOnce("unknown");

    await expect(
      exerciseLogService.deleteExerciseLog("log-1", "user-1", "el-1"),
    ).rejects.toBe("unknown");
  });
});
