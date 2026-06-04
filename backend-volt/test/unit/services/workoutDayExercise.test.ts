// Unit tests: workout day exercise service with a mocked database.
// This call is hoisted so the db is mocked before the prisma import.
vi.mock("../../../src/db.js");

import { type DeepMockProxy, mockReset } from "vitest-mock-extended";
import { expect, test, describe, vi, beforeEach } from "vitest";
import { prisma } from "../../../src/db.js";
import * as svc from "../../../src/services/workoutDayExercise.service.js";
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

// A raw WorkoutDayExercise row as Prisma returns it: the workoutDayId/exerciseId
// FK columns are present and must be stripped by the mapper, and the referenced
// exercise is denormalized to id/slug/name.
function rawSlot(overrides: Record<string, unknown> = {}) {
  return {
    id: "wde-1",
    workoutDayId: "day-1",
    exerciseId: "ex-1",
    order: 1,
    targetSets: 4,
    targetRepsMin: 8,
    targetRepsMax: 12,
    restSeconds: 90,
    exercise: { id: "ex-1", slug: "bench_press", name: "Bench Press" },
    ...overrides,
  } as any;
}

// The DTO shape rawSlot() maps to: FKs gone, exercise kept.
const mappedSlot = {
  id: "wde-1",
  order: 1,
  targetSets: 4,
  targetRepsMin: 8,
  targetRepsMax: 12,
  restSeconds: 90,
  exercise: { id: "ex-1", slug: "bench_press", name: "Bench Press" },
};

describe("WorkoutDayExercise Service getAllWorkoutDayExercises", () => {
  beforeEach(() => mockReset(prismaMock));

  test("throws NotFoundError when the day is missing or not owned", async () => {
    prismaMock.workoutDay.findFirst.mockResolvedValueOnce(null);

    await expect(
      svc.getAllWorkoutDayExercises("plan-1", "day-1", "user-1"),
    ).rejects.toThrow(new NotFoundError("Workout day not found."));
  });

  test("scopes the lookup to the day, its plan, and the owner; slots ordered by `order`", async () => {
    prismaMock.workoutDay.findFirst.mockResolvedValueOnce({
      exercises: [],
    } as any);

    await svc.getAllWorkoutDayExercises("plan-1", "day-1", "user-1");

    // Ownership flows through the relation filter; slots come back pre-sorted.
    expect(prismaMock.workoutDay.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "day-1",
          workoutPlanId: "plan-1",
          workoutPlan: { userId: "user-1" },
        },
        include: {
          exercises: expect.objectContaining({ orderBy: { order: "asc" } }),
        },
      }),
    );
  });

  test("returns the mapped slots (FKs stripped)", async () => {
    prismaMock.workoutDay.findFirst.mockResolvedValueOnce({
      exercises: [
        rawSlot({ id: "wde-1", order: 1 }),
        rawSlot({ id: "wde-2", order: 2 }),
      ],
    } as any);

    const result = await svc.getAllWorkoutDayExercises(
      "plan-1",
      "day-1",
      "user-1",
    );

    expect(result).toStrictEqual({
      exercises: [
        { ...mappedSlot, id: "wde-1", order: 1 },
        { ...mappedSlot, id: "wde-2", order: 2 },
      ],
    });
    expect(result.exercises[0]).not.toHaveProperty("workoutDayId");
    expect(result.exercises[0]).not.toHaveProperty("exerciseId");
  });

  test("returns an empty list when the day has no slots", async () => {
    prismaMock.workoutDay.findFirst.mockResolvedValueOnce({
      exercises: [],
    } as any);

    const result = await svc.getAllWorkoutDayExercises(
      "plan-1",
      "day-1",
      "user-1",
    );

    expect(result).toStrictEqual({ exercises: [] });
  });

  test("propagates an unexpected error", async () => {
    const dbError = new Error("Prisma database is currently unavailable.");
    prismaMock.workoutDay.findFirst.mockRejectedValueOnce(dbError);

    await expect(
      svc.getAllWorkoutDayExercises("plan-1", "day-1", "user-1"),
    ).rejects.toThrow(dbError);
  });
});

describe("WorkoutDayExercise Service getWorkoutDayExerciseById", () => {
  beforeEach(() => mockReset(prismaMock));

  test("throws NotFoundError (with the id) when the slot does not exist", async () => {
    prismaMock.workoutDayExercise.findFirst.mockResolvedValueOnce(null);

    await expect(
      svc.getWorkoutDayExerciseById("plan-1", "day-1", "wde-1", "user-1"),
    ).rejects.toThrow(
      new NotFoundError("Workout day exercise with id: wde-1 not found."),
    );
  });

  test("scopes the lookup to the slot, day, plan, and owner", async () => {
    prismaMock.workoutDayExercise.findFirst.mockResolvedValueOnce(rawSlot());

    await svc.getWorkoutDayExerciseById("plan-1", "day-1", "wde-1", "user-1");

    expect(prismaMock.workoutDayExercise.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "wde-1",
          workoutDayId: "day-1",
          workoutDay: { workoutPlanId: "plan-1", workoutPlan: { userId: "user-1" } },
        },
      }),
    );
  });

  test("returns the mapped DTO (FKs stripped, exercise denormalized)", async () => {
    prismaMock.workoutDayExercise.findFirst.mockResolvedValueOnce(rawSlot());

    const result = await svc.getWorkoutDayExerciseById(
      "plan-1",
      "day-1",
      "wde-1",
      "user-1",
    );

    expect(result).toStrictEqual(mappedSlot);
    expect(result).not.toHaveProperty("workoutDayId");
    expect(result).not.toHaveProperty("exerciseId");
  });

  test("propagates an unexpected error", async () => {
    const dbError = new Error("Prisma database is currently unavailable.");
    prismaMock.workoutDayExercise.findFirst.mockRejectedValueOnce(dbError);

    await expect(
      svc.getWorkoutDayExerciseById("plan-1", "day-1", "wde-1", "user-1"),
    ).rejects.toThrow(dbError);
  });
});

describe("WorkoutDayExercise Service createWorkoutDayExercise", () => {
  // create wraps its queries in a CALLBACK-style transaction; run it on the mock.
  beforeEach(() => {
    mockReset(prismaMock);
    prismaMock.$transaction.mockImplementation((cb: any) => cb(prismaMock));
  });

  test("throws NotFoundError when the day is missing or not owned", async () => {
    prismaMock.workoutDay.findFirst.mockResolvedValueOnce(null);

    await expect(
      svc.createWorkoutDayExercise("plan-1", "day-1", "user-1", {
        workoutDayId: "day-1",
        exerciseId: "ex-1",
        order: -1,
      }),
    ).rejects.toThrow(new NotFoundError("Workout day not found."));
    // Neither the exercise lookup nor the slot creation runs once the day fails.
    expect(prismaMock.exercise.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.workoutDayExercise.create).not.toHaveBeenCalled();
  });

  test("throws NotFoundError when the referenced exercise does not exist", async () => {
    prismaMock.workoutDay.findFirst.mockResolvedValueOnce({
      _count: { exercises: 0 },
    } as any);
    prismaMock.exercise.findUnique.mockResolvedValueOnce(null);

    await expect(
      svc.createWorkoutDayExercise("plan-1", "day-1", "user-1", {
        workoutDayId: "day-1",
        exerciseId: "missing-ex",
        order: -1,
      }),
    ).rejects.toThrow(new NotFoundError("Exercise not found."));
    expect(prismaMock.workoutDayExercise.create).not.toHaveBeenCalled();
  });

  test("assigns order = existing slot count + 1 and touches the plan", async () => {
    // Day already has 2 slots, so the new one should land at order 3.
    prismaMock.workoutDay.findFirst.mockResolvedValueOnce({
      _count: { exercises: 2 },
    } as any);
    prismaMock.exercise.findUnique.mockResolvedValueOnce({ id: "ex-1" } as any);
    prismaMock.workoutDayExercise.create.mockResolvedValueOnce(
      rawSlot({ id: "wde-3", order: 3 }),
    );
    prismaMock.workoutPlan.update.mockResolvedValueOnce({} as any);

    const result = await svc.createWorkoutDayExercise(
      "plan-1",
      "day-1",
      "user-1",
      { workoutDayId: "day-1", exerciseId: "ex-1", order: -1 },
    );

    // The placeholder order (-1) from the controller is overwritten with 3.
    expect(prismaMock.workoutDayExercise.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { workoutDayId: "day-1", exerciseId: "ex-1", order: 3 },
      }),
    );
    // A no-op plan update bumps the plan's updatedAt timestamp.
    expect(prismaMock.workoutPlan.update).toHaveBeenCalledWith({
      where: { id: "plan-1" },
      data: {},
    });
    expect(result).toStrictEqual({ ...mappedSlot, id: "wde-3", order: 3 });
    expect(result).not.toHaveProperty("workoutDayId");
  });

  test("assigns order 1 for the day's first slot", async () => {
    prismaMock.workoutDay.findFirst.mockResolvedValueOnce({
      _count: { exercises: 0 },
    } as any);
    prismaMock.exercise.findUnique.mockResolvedValueOnce({ id: "ex-1" } as any);
    prismaMock.workoutDayExercise.create.mockResolvedValueOnce(
      rawSlot({ order: 1 }),
    );
    prismaMock.workoutPlan.update.mockResolvedValueOnce({} as any);

    await svc.createWorkoutDayExercise("plan-1", "day-1", "user-1", {
      workoutDayId: "day-1",
      exerciseId: "ex-1",
      order: -1,
    });

    expect(prismaMock.workoutDayExercise.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ order: 1 }) }),
    );
  });

  test("propagates an unexpected error", async () => {
    prismaMock.workoutDay.findFirst.mockResolvedValueOnce({
      _count: { exercises: 0 },
    } as any);
    prismaMock.exercise.findUnique.mockResolvedValueOnce({ id: "ex-1" } as any);
    const dbError = new Error("Prisma database is currently unavailable.");
    prismaMock.workoutDayExercise.create.mockRejectedValueOnce(dbError);

    await expect(
      svc.createWorkoutDayExercise("plan-1", "day-1", "user-1", {
        workoutDayId: "day-1",
        exerciseId: "ex-1",
        order: -1,
      }),
    ).rejects.toThrow(dbError);
  });
});

describe("WorkoutDayExercise Service updateWorkoutDayExercise", () => {
  beforeEach(() => {
    mockReset(prismaMock);
    prismaMock.$transaction.mockImplementation((cb: any) => cb(prismaMock));
  });

  test("throws NotFoundError when the slot to update is missing (P2025)", async () => {
    prismaMock.workoutDayExercise.update.mockRejectedValueOnce(
      prismaError("P2025"),
    );

    await expect(
      svc.updateWorkoutDayExercise("plan-1", "day-1", "user-1", "wde-1", {
        targetSets: 5,
      }),
    ).rejects.toThrow(new NotFoundError("Workout day exercise not found."));
  });

  test("maps P2003 (bad exercise FK) to NotFoundError", async () => {
    prismaMock.workoutDayExercise.update.mockRejectedValueOnce(
      prismaError("P2003"),
    );

    await expect(
      svc.updateWorkoutDayExercise("plan-1", "day-1", "user-1", "wde-1", {
        exerciseId: "missing-ex",
      }),
    ).rejects.toThrow(new NotFoundError("Referenced exercise not found."));
  });

  test("rethrows other Prisma errors unchanged", async () => {
    const otherError = prismaError("P2002");
    prismaMock.workoutDayExercise.update.mockRejectedValueOnce(otherError);

    await expect(
      svc.updateWorkoutDayExercise("plan-1", "day-1", "user-1", "wde-1", {
        targetSets: 5,
      }),
    ).rejects.toBe(otherError);
  });

  test("propagates a non-Error thrown value", async () => {
    prismaMock.workoutDayExercise.update.mockRejectedValueOnce(99);

    await expect(
      svc.updateWorkoutDayExercise("plan-1", "day-1", "user-1", "wde-1", {
        targetSets: 5,
      }),
    ).rejects.toBe(99);
  });

  test("scopes the update to slot + day + plan + owner, returns the DTO, touches the plan", async () => {
    prismaMock.workoutDayExercise.update.mockResolvedValueOnce(
      rawSlot({ targetSets: 5 }),
    );
    prismaMock.workoutPlan.update.mockResolvedValueOnce({} as any);

    const result = await svc.updateWorkoutDayExercise(
      "plan-1",
      "day-1",
      "user-1",
      "wde-1",
      { targetSets: 5 },
    );

    expect(prismaMock.workoutDayExercise.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "wde-1",
          workoutDayId: "day-1",
          workoutDay: { workoutPlanId: "plan-1", workoutPlan: { userId: "user-1" } },
        },
        data: { targetSets: 5 },
      }),
    );
    expect(prismaMock.workoutPlan.update).toHaveBeenCalledWith({
      where: { id: "plan-1" },
      data: {},
    });
    expect(result.targetSets).toBe(5);
    expect(result).not.toHaveProperty("workoutDayId");
    expect(result).not.toHaveProperty("exerciseId");
  });
});

describe("WorkoutDayExercise Service deleteWorkoutDayExercise", () => {
  beforeEach(() => {
    mockReset(prismaMock);
    prismaMock.$transaction.mockImplementation((cb: any) => cb(prismaMock));
  });

  test("throws NotFoundError when the slot to delete is missing (P2025)", async () => {
    prismaMock.workoutDayExercise.delete.mockRejectedValueOnce(
      prismaError("P2025"),
    );

    await expect(
      svc.deleteWorkoutDayExercise("plan-1", "day-1", "user-1", "wde-1"),
    ).rejects.toThrow(new NotFoundError("Workout day exercise not found."));
  });

  test("rethrows non-P2025 Prisma errors unchanged", async () => {
    const fkError = prismaError("P2003");
    prismaMock.workoutDayExercise.delete.mockRejectedValueOnce(fkError);

    await expect(
      svc.deleteWorkoutDayExercise("plan-1", "day-1", "user-1", "wde-1"),
    ).rejects.toBe(fkError);
  });

  test("propagates a non-Error thrown value", async () => {
    prismaMock.workoutDayExercise.delete.mockRejectedValueOnce("unknown");

    await expect(
      svc.deleteWorkoutDayExercise("plan-1", "day-1", "user-1", "wde-1"),
    ).rejects.toBe("unknown");
  });

  test("deletes the slot scoped to day + plan + owner, touches the plan, resolves undefined", async () => {
    prismaMock.workoutDayExercise.delete.mockResolvedValueOnce(rawSlot() as any);
    prismaMock.workoutPlan.update.mockResolvedValueOnce({} as any);

    const result = await svc.deleteWorkoutDayExercise(
      "plan-1",
      "day-1",
      "user-1",
      "wde-1",
    );

    expect(result).toBeUndefined();
    expect(prismaMock.workoutDayExercise.delete).toHaveBeenCalledWith({
      where: {
        id: "wde-1",
        workoutDayId: "day-1",
        workoutDay: { workoutPlanId: "plan-1", workoutPlan: { userId: "user-1" } },
      },
    });
    expect(prismaMock.workoutPlan.update).toHaveBeenCalledWith({
      where: { id: "plan-1" },
      data: {},
    });
  });
});
