// Unit tests: workout day service with a mocked database.
// This call is hoisted so the db is mocked before the prisma import.
vi.mock("../../../src/db.js");

import { type DeepMockProxy, mockReset } from "vitest-mock-extended";
import { expect, test, describe, vi, beforeEach } from "vitest";
import { prisma } from "../../../src/db.js";
import * as workoutDayService from "../../../src/services/workoutDay.service.js";
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

// A raw WorkoutDay row as Prisma returns it for the LIST query: the
// workoutPlanId FK is present and must be stripped by the mapper.
function rawDay(overrides: Record<string, unknown> = {}) {
  return {
    id: "day-1",
    workoutPlanId: "plan-1",
    name: "Push",
    order: 1,
    ...overrides,
  } as any;
}

// A raw WorkoutDay row as Prisma returns it for the DETAIL query: nested
// exercise slots, each with its FK columns and the denormalized exercise ref.
function rawDayWithExercises(overrides: Record<string, unknown> = {}) {
  return {
    id: "day-1",
    workoutPlanId: "plan-1",
    name: "Push",
    order: 1,
    exercises: [
      {
        id: "wde-1",
        workoutDayId: "day-1",
        exerciseId: "ex-1",
        order: 0,
        targetSets: 4,
        targetRepsMin: 8,
        targetRepsMax: 12,
        restSeconds: 90,
        exercise: { id: "ex-1", slug: "bench_press", name: "Bench Press" },
      },
    ],
    ...overrides,
  } as any;
}

describe("WorkoutDay Service getAllWorkoutDays", () => {
  beforeEach(() => mockReset(prismaMock));

  test("throws NotFoundError when the plan is missing or not owned", async () => {
    prismaMock.workoutPlan.findUnique.mockResolvedValueOnce(null);

    await expect(
      workoutDayService.getAllWorkoutDays("plan-1", "user-1"),
    ).rejects.toThrow(new NotFoundError("Workout plan not found."));
  });

  test("scopes the lookup to the owner and requests days ordered by `order`", async () => {
    prismaMock.workoutPlan.findUnique.mockResolvedValueOnce({
      workoutDays: [],
    } as any);

    await workoutDayService.getAllWorkoutDays("plan-1", "user-1");

    // Ownership is enforced in the WHERE clause; days come back pre-sorted.
    expect(prismaMock.workoutPlan.findUnique).toHaveBeenCalledWith({
      where: { id: "plan-1", userId: "user-1" },
      include: { workoutDays: { orderBy: { order: "asc" } } },
    });
  });

  test("returns the mapped days (workoutPlanId stripped)", async () => {
    prismaMock.workoutPlan.findUnique.mockResolvedValueOnce({
      workoutDays: [
        rawDay({ id: "day-1", name: "Push", order: 1 }),
        rawDay({ id: "day-2", name: "Pull", order: 2 }),
      ],
    } as any);

    const result = await workoutDayService.getAllWorkoutDays("plan-1", "user-1");

    expect(result).toStrictEqual({
      workoutDays: [
        { id: "day-1", name: "Push", order: 1 },
        { id: "day-2", name: "Pull", order: 2 },
      ],
    });
    expect(result.workoutDays[0]).not.toHaveProperty("workoutPlanId");
  });

  test("returns an empty list when the plan has no days", async () => {
    prismaMock.workoutPlan.findUnique.mockResolvedValueOnce({
      workoutDays: [],
    } as any);

    const result = await workoutDayService.getAllWorkoutDays("plan-1", "user-1");

    expect(result).toStrictEqual({ workoutDays: [] });
  });

  test("propagates an unexpected error", async () => {
    const dbError = new Error("Prisma database is currently unavailable.");
    prismaMock.workoutPlan.findUnique.mockRejectedValueOnce(dbError);

    await expect(
      workoutDayService.getAllWorkoutDays("plan-1", "user-1"),
    ).rejects.toThrow(dbError);
  });
});

describe("WorkoutDay Service getWorkoutDayById", () => {
  beforeEach(() => mockReset(prismaMock));

  test("throws NotFoundError when the day does not exist", async () => {
    prismaMock.workoutDay.findFirst.mockResolvedValueOnce(null);

    await expect(
      workoutDayService.getWorkoutDayById("plan-1", "user-1", "day-1"),
    ).rejects.toThrow(new NotFoundError("Workout day not found."));
  });

  test("scopes the lookup to the day, its plan, and the owning user", async () => {
    prismaMock.workoutDay.findFirst.mockResolvedValueOnce(rawDayWithExercises());

    await workoutDayService.getWorkoutDayById("plan-1", "user-1", "day-1");

    // The day must belong to BOTH the named plan and the owning user.
    expect(prismaMock.workoutDay.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "day-1",
          workoutPlanId: "plan-1",
          workoutPlan: { userId: "user-1" },
        },
      }),
    );
  });

  test("returns the detail DTO with nested exercises (FKs stripped)", async () => {
    prismaMock.workoutDay.findFirst.mockResolvedValueOnce(rawDayWithExercises());

    const result = await workoutDayService.getWorkoutDayById(
      "plan-1",
      "user-1",
      "day-1",
    );

    expect(result).toStrictEqual({
      id: "day-1",
      name: "Push",
      order: 1,
      exercises: [
        {
          id: "wde-1",
          order: 0,
          targetSets: 4,
          targetRepsMin: 8,
          targetRepsMax: 12,
          restSeconds: 90,
          exercise: { id: "ex-1", slug: "bench_press", name: "Bench Press" },
        },
      ],
    });
    expect(result).not.toHaveProperty("workoutPlanId");
    expect(result.exercises[0]).not.toHaveProperty("workoutDayId");
    expect(result.exercises[0]).not.toHaveProperty("exerciseId");
  });

  test("propagates an unexpected error", async () => {
    const dbError = new Error("Prisma database is currently unavailable.");
    prismaMock.workoutDay.findFirst.mockRejectedValueOnce(dbError);

    await expect(
      workoutDayService.getWorkoutDayById("plan-1", "user-1", "day-1"),
    ).rejects.toThrow(dbError);
  });
});

describe("WorkoutDay Service createWorkoutDay", () => {
  // create wraps its queries in a CALLBACK-style transaction
  // (prisma.$transaction(async (tx) => ...)); run the callback against the mock.
  beforeEach(() => {
    mockReset(prismaMock);
    prismaMock.$transaction.mockImplementation((cb: any) => cb(prismaMock));
  });

  test("throws NotFoundError when the plan is missing or not owned", async () => {
    prismaMock.workoutPlan.findUnique.mockResolvedValueOnce(null);

    await expect(
      workoutDayService.createWorkoutDay("plan-1", "user-1", {
        workoutPlanId: "plan-1",
        name: "Push",
        order: -1,
      }),
    ).rejects.toThrow(new NotFoundError("Workout plan not found."));
    // The day is never created once the plan lookup fails.
    expect(prismaMock.workoutDay.create).not.toHaveBeenCalled();
  });

  test("assigns order = existing day count + 1 and touches the plan", async () => {
    // Plan already has 2 days, so the new one should land at order 3.
    prismaMock.workoutPlan.findUnique.mockResolvedValueOnce({
      _count: { workoutDays: 2 },
    } as any);
    prismaMock.workoutDay.create.mockResolvedValueOnce(
      rawDay({ id: "day-3", name: "Legs", order: 3 }),
    );
    prismaMock.workoutPlan.update.mockResolvedValueOnce({} as any);

    const result = await workoutDayService.createWorkoutDay(
      "plan-1",
      "user-1",
      { workoutPlanId: "plan-1", name: "Legs", order: -1 },
    );

    // The placeholder order (-1) from the controller is overwritten with 3.
    expect(prismaMock.workoutDay.create).toHaveBeenCalledWith({
      data: { workoutPlanId: "plan-1", name: "Legs", order: 3 },
    });
    // A no-op plan update bumps the plan's updatedAt timestamp.
    expect(prismaMock.workoutPlan.update).toHaveBeenCalledWith({
      where: { id: "plan-1" },
      data: {},
    });
    expect(result).toStrictEqual({ id: "day-3", name: "Legs", order: 3 });
    expect(result).not.toHaveProperty("workoutPlanId");
  });

  test("assigns order 1 for the plan's first day", async () => {
    prismaMock.workoutPlan.findUnique.mockResolvedValueOnce({
      _count: { workoutDays: 0 },
    } as any);
    prismaMock.workoutDay.create.mockResolvedValueOnce(
      rawDay({ id: "day-1", order: 1 }),
    );
    prismaMock.workoutPlan.update.mockResolvedValueOnce({} as any);

    await workoutDayService.createWorkoutDay("plan-1", "user-1", {
      workoutPlanId: "plan-1",
      name: "Push",
      order: -1,
    });

    expect(prismaMock.workoutDay.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ order: 1 }) }),
    );
  });

  test("propagates an unexpected error", async () => {
    prismaMock.workoutPlan.findUnique.mockResolvedValueOnce({
      _count: { workoutDays: 0 },
    } as any);
    const dbError = new Error("Prisma database is currently unavailable.");
    prismaMock.workoutDay.create.mockRejectedValueOnce(dbError);

    await expect(
      workoutDayService.createWorkoutDay("plan-1", "user-1", {
        workoutPlanId: "plan-1",
        name: "Push",
        order: -1,
      }),
    ).rejects.toThrow(dbError);
  });
});

describe("WorkoutDay Service updateWorkoutDay", () => {
  beforeEach(() => {
    mockReset(prismaMock);
    prismaMock.$transaction.mockImplementation((cb: any) => cb(prismaMock));
  });

  test("throws NotFoundError when the day to update is missing (P2025)", async () => {
    prismaMock.workoutDay.update.mockRejectedValueOnce(prismaError("P2025"));

    await expect(
      workoutDayService.updateWorkoutDay("plan-1", "user-1", "day-1", {
        name: "Renamed",
      }),
    ).rejects.toThrow(new NotFoundError("Workout day not found."));
  });

  test("rethrows non-P2025 Prisma errors unchanged", async () => {
    const fkError = prismaError("P2003");
    prismaMock.workoutDay.update.mockRejectedValueOnce(fkError);

    await expect(
      workoutDayService.updateWorkoutDay("plan-1", "user-1", "day-1", {
        name: "Renamed",
      }),
    ).rejects.toBe(fkError);
  });

  test("propagates a non-Error thrown value", async () => {
    prismaMock.workoutDay.update.mockRejectedValueOnce(99);

    await expect(
      workoutDayService.updateWorkoutDay("plan-1", "user-1", "day-1", {
        name: "Renamed",
      }),
    ).rejects.toBe(99);
  });

  test("scopes the update to plan + owner, returns the detail DTO, touches the plan", async () => {
    prismaMock.workoutDay.update.mockResolvedValueOnce(
      rawDayWithExercises({ name: "Renamed" }),
    );
    prismaMock.workoutPlan.update.mockResolvedValueOnce({} as any);

    const result = await workoutDayService.updateWorkoutDay(
      "plan-1",
      "user-1",
      "day-1",
      { name: "Renamed" },
    );

    expect(prismaMock.workoutDay.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "day-1",
          workoutPlanId: "plan-1",
          workoutPlan: { userId: "user-1" },
        },
        data: { name: "Renamed" },
      }),
    );
    expect(prismaMock.workoutPlan.update).toHaveBeenCalledWith({
      where: { id: "plan-1" },
      data: {},
    });
    expect(result.name).toBe("Renamed");
    expect(result).not.toHaveProperty("workoutPlanId");
    expect(result.exercises).toHaveLength(1);
  });
});

describe("WorkoutDay Service deleteWorkoutDay", () => {
  beforeEach(() => {
    mockReset(prismaMock);
    prismaMock.$transaction.mockImplementation((cb: any) => cb(prismaMock));
  });

  test("throws NotFoundError when the day to delete is missing (P2025)", async () => {
    prismaMock.workoutDay.delete.mockRejectedValueOnce(prismaError("P2025"));

    await expect(
      workoutDayService.deleteWorkoutDay("plan-1", "user-1", "day-1"),
    ).rejects.toThrow(new NotFoundError("Workout day not found."));
  });

  test("rethrows non-P2025 Prisma errors unchanged", async () => {
    const fkError = prismaError("P2003");
    prismaMock.workoutDay.delete.mockRejectedValueOnce(fkError);

    await expect(
      workoutDayService.deleteWorkoutDay("plan-1", "user-1", "day-1"),
    ).rejects.toBe(fkError);
  });

  test("propagates a non-Error thrown value", async () => {
    prismaMock.workoutDay.delete.mockRejectedValueOnce("unknown");

    await expect(
      workoutDayService.deleteWorkoutDay("plan-1", "user-1", "day-1"),
    ).rejects.toBe("unknown");
  });

  test("deletes the day scoped to plan + owner, touches the plan, resolves undefined", async () => {
    prismaMock.workoutDay.delete.mockResolvedValueOnce(rawDay() as any);
    prismaMock.workoutPlan.update.mockResolvedValueOnce({} as any);

    const result = await workoutDayService.deleteWorkoutDay(
      "plan-1",
      "user-1",
      "day-1",
    );

    expect(result).toBeUndefined();
    expect(prismaMock.workoutDay.delete).toHaveBeenCalledWith({
      where: {
        id: "day-1",
        workoutPlanId: "plan-1",
        workoutPlan: { userId: "user-1" },
      },
    });
    expect(prismaMock.workoutPlan.update).toHaveBeenCalledWith({
      where: { id: "plan-1" },
      data: {},
    });
  });
});
