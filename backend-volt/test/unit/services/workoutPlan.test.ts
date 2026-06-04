// Unit tests: workout plan service with a mocked database.
// This call is hoisted so the db is mocked before the prisma import.
vi.mock("../../../src/db.js");

import { type DeepMockProxy, mockReset } from "vitest-mock-extended";
import { expect, test, describe, vi, beforeEach } from "vitest";
import { prisma } from "../../../src/db.js";
import * as workoutPlanService from "../../../src/services/workoutPlan.service.js";
import { Prisma } from "../../../src/generated/prisma/client.js";
import { BadRequestError, NotFoundError } from "../../../src/errors.js";

// Cast to the deep mock proxy so the mockResolved*/mockRejected* helpers type-check.
const prismaMock = prisma as unknown as DeepMockProxy<typeof prisma>;

// Build a P-coded Prisma error so we can drive the service's catch branches.
function prismaError(code: string) {
  return new Prisma.PrismaClientKnownRequestError(`Prisma error ${code}`, {
    code,
    clientVersion: "7.4.2",
  });
}

// A raw WorkoutPlan row as Prisma returns it for the LIST/summary queries:
// real Date objects, the userId FK, and the _count aggregate the mapper reads.
function rawPlanWithCount(overrides: Record<string, unknown> = {}) {
  return {
    id: "plan-1",
    userId: "user-1",
    name: "Push Pull Legs",
    type: "STRENGTH",
    createdAt: new Date("2026-04-14T12:30:00.000Z"),
    updatedAt: new Date("2026-04-15T08:00:00.000Z"),
    _count: { workoutDays: 3 },
    ...overrides,
  } as any;
}

// A raw WorkoutPlan row as Prisma returns it for the DETAIL queries: nested
// days, each with its exercise slots and the denormalized exercise reference.
function rawPlanWithDays(overrides: Record<string, unknown> = {}) {
  return {
    id: "plan-1",
    userId: "user-1",
    name: "Push Pull Legs",
    type: "HYPERTROPHY",
    createdAt: new Date("2026-04-14T12:30:00.000Z"),
    updatedAt: null,
    workoutDays: [
      {
        id: "day-1",
        workoutPlanId: "plan-1",
        name: "Push",
        order: 0,
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
      },
    ],
    ...overrides,
  } as any;
}

describe("WorkoutPlan Service getAllWorkoutPlans", () => {
  // getAllWorkoutPlans wraps its queries in a CALLBACK-style transaction
  // (prisma.$transaction(async (tx) => ...)). The default implementation runs
  // the callback against the same prisma mock so each inner query is stubbable.
  beforeEach(() => {
    mockReset(prismaMock);
    prismaMock.$transaction.mockImplementation((cb: any) => cb(prismaMock));
  });

  test("throws NotFoundError when the user record is missing", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null);

    await expect(
      workoutPlanService.getAllWorkoutPlans("ghost-user", 1, 10),
    ).rejects.toThrow(new NotFoundError("User not found."));
    // The plan queries are never reached once the user lookup fails
    expect(prismaMock.workoutPlan.findMany).not.toHaveBeenCalled();
  });

  test("returns an empty page when the user has no plans", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ activePlanId: null } as any);
    prismaMock.workoutPlan.findMany.mockResolvedValueOnce([]);
    prismaMock.workoutPlan.count.mockResolvedValueOnce(0);

    const result = await workoutPlanService.getAllWorkoutPlans("user-1", 1, 10);

    expect(result).toStrictEqual({
      workoutPlans: [],
      total: 0,
      page: 1,
      limit: 10,
    });
  });

  test("does not filter by id when there is no active plan", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ activePlanId: null } as any);
    prismaMock.workoutPlan.findMany.mockResolvedValueOnce([]);
    prismaMock.workoutPlan.count.mockResolvedValueOnce(0);

    await workoutPlanService.getAllWorkoutPlans("user-1", 1, 10);

    // No activePlanId => the `id: { not }` clause is spread away, leaving just userId
    expect(prismaMock.workoutPlan.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      skip: 0,
      take: 10,
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { workoutDays: true } } },
    });
    expect(prismaMock.workoutPlan.count).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
  });

  test("excludes the active plan from the list query", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      activePlanId: "active-plan",
    } as any);
    prismaMock.workoutPlan.findMany.mockResolvedValueOnce([]);
    prismaMock.workoutPlan.count.mockResolvedValueOnce(0);

    await workoutPlanService.getAllWorkoutPlans("user-1", 1, 10);

    expect(prismaMock.workoutPlan.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1", id: { not: "active-plan" } },
      skip: 0,
      take: 10,
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { workoutDays: true } } },
    });
    // The count must use the SAME filter, otherwise total would be off by one
    expect(prismaMock.workoutPlan.count).toHaveBeenCalledWith({
      where: { userId: "user-1", id: { not: "active-plan" } },
    });
  });

  test("maps plans to summaries with daysPerWeek from _count (no userId leaked)", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ activePlanId: null } as any);
    prismaMock.workoutPlan.findMany.mockResolvedValueOnce([
      rawPlanWithCount({ id: "plan-a", _count: { workoutDays: 5 } }),
      rawPlanWithCount({
        id: "plan-b",
        type: null,
        updatedAt: null,
        _count: { workoutDays: 0 },
      }),
    ]);
    prismaMock.workoutPlan.count.mockResolvedValueOnce(2);

    const result = await workoutPlanService.getAllWorkoutPlans("user-1", 1, 10);

    expect(result.total).toBe(2);
    expect(result.workoutPlans).toStrictEqual([
      {
        id: "plan-a",
        name: "Push Pull Legs",
        type: "STRENGTH",
        daysPerWeek: 5,
        createdAt: "2026-04-14",
        updatedAt: "2026-04-15",
      },
      {
        id: "plan-b",
        name: "Push Pull Legs",
        type: null,
        daysPerWeek: 0,
        createdAt: "2026-04-14",
        updatedAt: null,
      },
    ]);
    expect(result.workoutPlans[0]).not.toHaveProperty("userId");
  });

  test("computes skip/take from the requested page", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ activePlanId: null } as any);
    prismaMock.workoutPlan.findMany.mockResolvedValueOnce([]);
    prismaMock.workoutPlan.count.mockResolvedValueOnce(0);

    await workoutPlanService.getAllWorkoutPlans("user-1", 3, 5);

    // page 3, limit 5 => skip (3-1)*5 = 10
    expect(prismaMock.workoutPlan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 5 }),
    );
  });

  test("propagates a non-Error thrown value", async () => {
    prismaMock.$transaction.mockRejectedValueOnce("boom");

    await expect(
      workoutPlanService.getAllWorkoutPlans("user-1", 1, 10),
    ).rejects.toBe("boom");
  });
});

describe("WorkoutPlan Service getActiveWorkoutPlan", () => {
  beforeEach(() => {
    mockReset(prismaMock);
    prismaMock.$transaction.mockImplementation((cb: any) => cb(prismaMock));
  });

  test("returns null when the user has no active plan", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ activePlanId: null } as any);

    const result = await workoutPlanService.getActiveWorkoutPlan("user-1");

    expect(result).toBeNull();
    // Short-circuits before touching the plan table
    expect(prismaMock.workoutPlan.findUnique).not.toHaveBeenCalled();
  });

  test("returns null when the user record itself is missing", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null);

    const result = await workoutPlanService.getActiveWorkoutPlan("user-1");

    expect(result).toBeNull();
  });

  test("throws NotFoundError when the active plan id no longer resolves", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      activePlanId: "dangling",
    } as any);
    prismaMock.workoutPlan.findUnique.mockResolvedValueOnce(null);

    await expect(
      workoutPlanService.getActiveWorkoutPlan("user-1"),
    ).rejects.toThrow(
      new NotFoundError("User has an active plan, but it was not found."),
    );
  });

  test("returns the mapped active plan summary", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      activePlanId: "plan-1",
    } as any);
    prismaMock.workoutPlan.findUnique.mockResolvedValueOnce(
      rawPlanWithCount({ id: "plan-1", _count: { workoutDays: 4 } }),
    );

    const result = await workoutPlanService.getActiveWorkoutPlan("user-1");

    expect(result).toStrictEqual({
      id: "plan-1",
      name: "Push Pull Legs",
      type: "STRENGTH",
      daysPerWeek: 4,
      createdAt: "2026-04-14",
      updatedAt: "2026-04-15",
    });
    expect(prismaMock.workoutPlan.findUnique).toHaveBeenCalledWith({
      where: { id: "plan-1" },
      include: { _count: { select: { workoutDays: true } } },
    });
  });
});

describe("WorkoutPlan Service getWorkoutPlanById", () => {
  beforeEach(() => mockReset(prismaMock));

  test("throws NotFoundError when the plan does not exist", async () => {
    prismaMock.workoutPlan.findUnique.mockResolvedValueOnce(null);

    await expect(
      workoutPlanService.getWorkoutPlanById("user-1", "plan-1"),
    ).rejects.toThrow(new NotFoundError("Workout plan not found."));
  });

  test("propagates an unexpected error", async () => {
    const dbError = new Error("Prisma database is currently unavailable.");
    prismaMock.workoutPlan.findUnique.mockRejectedValueOnce(dbError);

    await expect(
      workoutPlanService.getWorkoutPlanById("user-1", "plan-1"),
    ).rejects.toThrow(dbError);
  });

  test("scopes the lookup to the owning user", async () => {
    prismaMock.workoutPlan.findUnique.mockResolvedValueOnce(rawPlanWithDays());

    await workoutPlanService.getWorkoutPlanById("user-1", "plan-1");

    // Ownership is enforced in the WHERE clause, not after the fetch
    expect(prismaMock.workoutPlan.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "plan-1", userId: "user-1" } }),
    );
  });

  test("returns the detail DTO with nested days + exercises (FKs stripped)", async () => {
    prismaMock.workoutPlan.findUnique.mockResolvedValueOnce(rawPlanWithDays());

    const result = await workoutPlanService.getWorkoutPlanById("user-1", "plan-1");

    expect(result).toStrictEqual({
      id: "plan-1",
      name: "Push Pull Legs",
      type: "HYPERTROPHY",
      createdAt: "2026-04-14",
      updatedAt: null,
      workoutDays: [
        {
          id: "day-1",
          name: "Push",
          order: 0,
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
        },
      ],
    });
    // Detail DTO omits userId and the join-table FKs
    expect(result).not.toHaveProperty("userId");
    expect(result).not.toHaveProperty("daysPerWeek");
    expect(result.workoutDays[0]).not.toHaveProperty("workoutPlanId");
    expect(result.workoutDays[0]!.exercises[0]).not.toHaveProperty("workoutDayId");
  });
});

describe("WorkoutPlan Service createWorkoutPlan", () => {
  beforeEach(() => {
    mockReset(prismaMock);
    prismaMock.$transaction.mockImplementation((cb: any) => cb(prismaMock));
  });

  test("auto-activates the user's first plan", async () => {
    prismaMock.workoutPlan.create.mockResolvedValueOnce(
      rawPlanWithCount({ id: "first-plan", _count: { workoutDays: 0 } }),
    );
    // count === 1 => this is the user's only plan, so it becomes active
    prismaMock.workoutPlan.count.mockResolvedValueOnce(1);
    prismaMock.user.update.mockResolvedValueOnce({} as any);

    const result = await workoutPlanService.createWorkoutPlan({
      userId: "user-1",
      name: "Push Pull Legs",
      type: "STRENGTH",
    });

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { activePlanId: "first-plan" },
    });
    expect(result).toStrictEqual({
      id: "first-plan",
      name: "Push Pull Legs",
      type: "STRENGTH",
      daysPerWeek: 0,
      createdAt: "2026-04-14",
      updatedAt: "2026-04-15",
    });
  });

  test("does not activate when the user already owns other plans", async () => {
    prismaMock.workoutPlan.create.mockResolvedValueOnce(rawPlanWithCount());
    // count > 1 => not the first plan, leave the active plan untouched
    prismaMock.workoutPlan.count.mockResolvedValueOnce(3);

    await workoutPlanService.createWorkoutPlan({
      userId: "user-1",
      name: "Second Plan",
    });

    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  test("propagates an unexpected error", async () => {
    const dbError = new Error("Prisma database is currently unavailable.");
    prismaMock.workoutPlan.create.mockRejectedValueOnce(dbError);

    await expect(
      workoutPlanService.createWorkoutPlan({ userId: "user-1", name: "X" }),
    ).rejects.toThrow(dbError);
  });
});

describe("WorkoutPlan Service updateWorkoutPlan", () => {
  beforeEach(() => mockReset(prismaMock));

  test("throws NotFoundError when the plan to update is missing (P2025)", async () => {
    prismaMock.workoutPlan.update.mockRejectedValueOnce(prismaError("P2025"));

    await expect(
      workoutPlanService.updateWorkoutPlan("user-1", "plan-1", { name: "New" }),
    ).rejects.toThrow(new NotFoundError("Workout plan not found."));
  });

  test("rethrows non-P2025 Prisma errors unchanged", async () => {
    const fkError = prismaError("P2003");
    prismaMock.workoutPlan.update.mockRejectedValueOnce(fkError);

    await expect(
      workoutPlanService.updateWorkoutPlan("user-1", "plan-1", { name: "New" }),
    ).rejects.toBe(fkError);
  });

  test("propagates a non-Error thrown value", async () => {
    prismaMock.workoutPlan.update.mockRejectedValueOnce(99);

    await expect(
      workoutPlanService.updateWorkoutPlan("user-1", "plan-1", { name: "New" }),
    ).rejects.toBe(99);
  });

  test("scopes the update to the owner and returns the detail DTO", async () => {
    prismaMock.workoutPlan.update.mockResolvedValueOnce(
      rawPlanWithDays({ name: "Renamed", type: "WEIGHT_LOSS" }),
    );

    const result = await workoutPlanService.updateWorkoutPlan(
      "user-1",
      "plan-1",
      { name: "Renamed", type: "WEIGHT_LOSS" },
    );

    expect(prismaMock.workoutPlan.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "plan-1", userId: "user-1" },
        data: { name: "Renamed", type: "WEIGHT_LOSS" },
      }),
    );
    expect(result.name).toBe("Renamed");
    expect(result.type).toBe("WEIGHT_LOSS");
    expect(result).not.toHaveProperty("userId");
    expect(result.workoutDays).toHaveLength(1);
  });
});

describe("WorkoutPlan Service deleteWorkoutPlan", () => {
  beforeEach(() => {
    mockReset(prismaMock);
    prismaMock.$transaction.mockImplementation((cb: any) => cb(prismaMock));
  });

  test("throws BadRequestError when deleting the active plan (and skips delete)", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      activePlanId: "plan-1",
    } as any);

    await expect(
      workoutPlanService.deleteWorkoutPlan("user-1", "plan-1"),
    ).rejects.toThrow(
      new BadRequestError("Active workout plan cannot be deleted."),
    );
    expect(prismaMock.workoutPlan.delete).not.toHaveBeenCalled();
  });

  test("throws NotFoundError when the plan does not exist (P2025)", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      activePlanId: "another-plan",
    } as any);
    prismaMock.workoutPlan.delete.mockRejectedValueOnce(prismaError("P2025"));

    await expect(
      workoutPlanService.deleteWorkoutPlan("user-1", "plan-1"),
    ).rejects.toThrow(new NotFoundError("Workout plan not found."));
  });

  test("propagates an unexpected error", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ activePlanId: null } as any);
    const dbError = new Error("Prisma database is currently unavailable.");
    prismaMock.workoutPlan.delete.mockRejectedValueOnce(dbError);

    await expect(
      workoutPlanService.deleteWorkoutPlan("user-1", "plan-1"),
    ).rejects.toThrow(dbError);
  });

  test("deletes a non-active plan scoped to the owner and resolves undefined", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      activePlanId: "another-plan",
    } as any);
    prismaMock.workoutPlan.delete.mockResolvedValueOnce(rawPlanWithCount() as any);

    const result = await workoutPlanService.deleteWorkoutPlan("user-1", "plan-1");

    expect(result).toBeUndefined();
    expect(prismaMock.workoutPlan.delete).toHaveBeenCalledWith({
      where: { id: "plan-1", userId: "user-1" },
    });
  });
});

describe("WorkoutPlan Service activateWorkoutPlan", () => {
  beforeEach(() => {
    mockReset(prismaMock);
    prismaMock.$transaction.mockImplementation((cb: any) => cb(prismaMock));
  });

  test("throws NotFoundError when the plan is missing or not owned", async () => {
    prismaMock.workoutPlan.findUnique.mockResolvedValueOnce(null);

    await expect(
      workoutPlanService.activateWorkoutPlan("user-1", "plan-1"),
    ).rejects.toThrow(new NotFoundError("Workout plan not found."));
    // The user is only mutated once ownership is confirmed
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  test("sets the user's activePlanId and returns it", async () => {
    prismaMock.workoutPlan.findUnique.mockResolvedValueOnce(
      rawPlanWithCount() as any,
    );
    prismaMock.user.update.mockResolvedValueOnce({} as any);

    const result = await workoutPlanService.activateWorkoutPlan(
      "user-1",
      "plan-1",
    );

    expect(prismaMock.workoutPlan.findUnique).toHaveBeenCalledWith({
      where: { id: "plan-1", userId: "user-1" },
    });
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { activePlanId: "plan-1" },
    });
    expect(result).toStrictEqual({ activePlanId: "plan-1" });
  });
});
