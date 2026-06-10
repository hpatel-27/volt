// Unit tests: workout log service with a mocked database.
// This call is hoisted so the db is mocked before the prisma import.
vi.mock("../../../src/db.js");

import { type DeepMockProxy, mockReset } from "vitest-mock-extended";
import { expect, test, describe, vi, beforeEach } from "vitest";
import { prisma } from "../../../src/db.js";
import * as workoutLogService from "../../../src/services/workoutLog.service.js";
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

// A raw WorkoutLog row as Prisma returns it for the SUMMARY (list/today/range)
// query: the userId + workoutDayId FKs and createdAt are present and must be
// stripped by the mapper; workoutDay is the denormalized {id,name} ref (or null),
// and _count.exerciseLogs becomes `exerciseCount`. The SUMMARY include also
// hydrates each set's {weight, reps} so the mapper can sum total volume:
//   Σ weight × reps = (135×10 + 145×8) + (90×12) = 1350 + 1160 + 1080 = 3590.
// `_count` and the `exerciseLogs` sets are independent fields here, so a test can
// override either alone (e.g. an empty session: exerciseLogs [] → totalVolume 0).
function rawSummary(overrides: Record<string, unknown> = {}) {
  return {
    id: "log-1",
    userId: "user-1",
    workoutDayId: "day-1",
    date: new Date("2026-06-07T00:00:00.000Z"),
    createdAt: new Date("2026-06-07T08:00:00.000Z"),
    workoutDay: { id: "day-1", name: "Push" },
    _count: { exerciseLogs: 3 },
    exerciseLogs: [
      { sets: [{ weight: 135, reps: 10 }, { weight: 145, reps: 8 }] },
      { sets: [{ weight: 90, reps: 12 }] },
    ],
    ...overrides,
  } as any;
}

// A raw WorkoutLog row as Prisma returns it for the DETAIL query: nested
// exercise logs, each with its FK columns, the denormalized exercise ref, and
// ordered sets.
function rawDetail(overrides: Record<string, unknown> = {}) {
  return {
    id: "log-1",
    userId: "user-1",
    workoutDayId: "day-1",
    date: new Date("2026-06-07T00:00:00.000Z"),
    createdAt: new Date("2026-06-07T08:00:00.000Z"),
    workoutDay: { id: "day-1", name: "Push" },
    exerciseLogs: [
      {
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
      },
    ],
    ...overrides,
  } as any;
}

// The DTO the detail mapper should produce from rawDetail() above.
const expectedDetailDto = {
  id: "log-1",
  date: "2026-06-07",
  workoutDay: { id: "day-1", name: "Push" },
  exercises: [
    {
      id: "el-1",
      exercise: { id: "ex-1", slug: "bench_press", name: "Bench Press" },
      notes: "felt strong",
      sets: [
        { id: "set-1", setNumber: 1, reps: 10, weight: 135 },
        { id: "set-2", setNumber: 2, reps: 8, weight: 145 },
      ],
    },
  ],
};

describe("WorkoutLog Service getAllWorkoutLogs", () => {
  // getAllWorkoutLogs wraps findMany + count in a CALLBACK-style transaction;
  // the default implementation runs the callback against the same mock so each
  // inner query can be stubbed individually.
  beforeEach(() => {
    mockReset(prismaMock);
    prismaMock.$transaction.mockImplementation((cb: any) => cb(prismaMock));
  });

  test("returns an empty page when the user has no logs", async () => {
    prismaMock.workoutLog.findMany.mockResolvedValueOnce([]);
    prismaMock.workoutLog.count.mockResolvedValueOnce(0);

    const result = await workoutLogService.getAllWorkoutLogs("user-1", 1, 10);

    expect(result).toStrictEqual({
      workoutLogs: [],
      total: 0,
      page: 1,
      limit: 10,
    });
  });

  test("scopes the query to the owner with paginated skip/take and stable ordering", async () => {
    prismaMock.workoutLog.findMany.mockResolvedValueOnce([]);
    prismaMock.workoutLog.count.mockResolvedValueOnce(0);

    // page 3, limit 5 → skip the first 10 rows.
    await workoutLogService.getAllWorkoutLogs("user-1", 3, 5);

    expect(prismaMock.workoutLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1" },
        skip: 10,
        take: 5,
        // Same-day sessions tie-break on createdAt so the list is deterministic.
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      }),
    );
    expect(prismaMock.workoutLog.count).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
  });

  test("maps rows to summaries (FKs + createdAt stripped, _count → exerciseCount)", async () => {
    prismaMock.workoutLog.findMany.mockResolvedValueOnce([
      rawSummary({ id: "log-a", date: new Date("2026-06-07T00:00:00.000Z") }),
      // An ad-hoc session has no template day → workoutDay is null, and with no
      // exercise logs its total volume is 0.
      rawSummary({
        id: "log-b",
        workoutDayId: null,
        workoutDay: null,
        _count: { exerciseLogs: 0 },
        exerciseLogs: [],
      }),
    ]);
    prismaMock.workoutLog.count.mockResolvedValueOnce(2);

    const result = await workoutLogService.getAllWorkoutLogs("user-1", 1, 10);

    expect(result.total).toBe(2);
    expect(result.workoutLogs).toStrictEqual([
      {
        id: "log-a",
        date: "2026-06-07",
        workoutDay: { id: "day-1", name: "Push" },
        exerciseCount: 3,
        totalVolume: 3590,
      },
      {
        id: "log-b",
        date: "2026-06-07",
        workoutDay: null,
        exerciseCount: 0,
        totalVolume: 0,
      },
    ]);
    // FKs and the insertion-order timestamp never leak into the DTO.
    expect(result.workoutLogs[0]).not.toHaveProperty("userId");
    expect(result.workoutLogs[0]).not.toHaveProperty("workoutDayId");
    expect(result.workoutLogs[0]).not.toHaveProperty("createdAt");
  });

  test("propagates a server error thrown inside the transaction", async () => {
    const dbError = new Error("Prisma database is currently unavailable.");
    prismaMock.$transaction.mockRejectedValueOnce(dbError);

    await expect(
      workoutLogService.getAllWorkoutLogs("user-1", 1, 10),
    ).rejects.toThrow(dbError);
  });

  test("propagates a non-Error thrown value", async () => {
    prismaMock.$transaction.mockRejectedValueOnce("some invalid non-error");

    await expect(
      workoutLogService.getAllWorkoutLogs("user-1", 1, 10),
    ).rejects.toBe("some invalid non-error");
  });
});

describe("WorkoutLog Service getTodayWorkoutLogs", () => {
  beforeEach(() => mockReset(prismaMock));

  test("queries today's sessions scoped to the owner, ordered by insertion", async () => {
    prismaMock.workoutLog.findMany.mockResolvedValueOnce([rawSummary()]);

    await workoutLogService.getTodayWorkoutLogs("user-1", "2026-06-07");

    expect(prismaMock.workoutLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        // The YYYY-MM-DD string is normalized to a UTC-midnight Date instant.
        where: { userId: "user-1", date: new Date("2026-06-07") },
        orderBy: { createdAt: "asc" },
      }),
    );
  });

  test("maps the rows to summary DTOs", async () => {
    prismaMock.workoutLog.findMany.mockResolvedValueOnce([
      rawSummary({ id: "log-a" }),
      rawSummary({
        id: "log-b",
        _count: { exerciseLogs: 1 },
        exerciseLogs: [{ sets: [{ weight: 100, reps: 5 }] }],
      }),
    ]);

    const result = await workoutLogService.getTodayWorkoutLogs(
      "user-1",
      "2026-06-07",
    );

    expect(result).toStrictEqual([
      {
        id: "log-a",
        date: "2026-06-07",
        workoutDay: { id: "day-1", name: "Push" },
        exerciseCount: 3,
        totalVolume: 3590,
      },
      {
        id: "log-b",
        date: "2026-06-07",
        workoutDay: { id: "day-1", name: "Push" },
        exerciseCount: 1,
        totalVolume: 500,
      },
    ]);
  });

  test("returns an empty array when there are no sessions today", async () => {
    prismaMock.workoutLog.findMany.mockResolvedValueOnce([]);

    const result = await workoutLogService.getTodayWorkoutLogs(
      "user-1",
      "2026-06-07",
    );

    expect(result).toStrictEqual([]);
  });

  test("propagates an unexpected error", async () => {
    const dbError = new Error("Prisma database is currently unavailable.");
    prismaMock.workoutLog.findMany.mockRejectedValueOnce(dbError);

    await expect(
      workoutLogService.getTodayWorkoutLogs("user-1", "2026-06-07"),
    ).rejects.toThrow(dbError);
  });
});

describe("WorkoutLog Service getWorkoutLogsByRange", () => {
  beforeEach(() => mockReset(prismaMock));

  test("filters to the [from, to] window, orders oldest-first, and maps to summaries with totalVolume", async () => {
    const from = new Date("2026-06-01T00:00:00.000Z");
    const to = new Date("2026-06-07T00:00:00.000Z");
    prismaMock.workoutLog.findMany.mockResolvedValueOnce([
      rawSummary({ id: "log-a", date: new Date("2026-06-02T00:00:00.000Z") }),
      rawSummary({
        id: "log-b",
        date: new Date("2026-06-06T00:00:00.000Z"),
        _count: { exerciseLogs: 1 },
        exerciseLogs: [{ sets: [{ weight: 100, reps: 5 }] }],
      }),
    ]);

    const result = await workoutLogService.getWorkoutLogsByRange(
      "user-1",
      from,
      to,
    );

    // Each summary carries its own tonnage; the dashboard buckets these by weekday.
    expect(result).toStrictEqual([
      {
        id: "log-a",
        date: "2026-06-02",
        workoutDay: { id: "day-1", name: "Push" },
        exerciseCount: 3,
        totalVolume: 3590,
      },
      {
        id: "log-b",
        date: "2026-06-06",
        workoutDay: { id: "day-1", name: "Push" },
        exerciseCount: 1,
        totalVolume: 500,
      },
    ]);
    // The window is enforced in the WHERE clause (inclusive both ends), scoped to
    // the owner, and ordered ascending so the client can chart chronologically.
    expect(prismaMock.workoutLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1", date: { gte: from, lte: to } },
        orderBy: { date: "asc" },
      }),
    );
  });

  test("returns an empty array when no sessions fall in the window", async () => {
    prismaMock.workoutLog.findMany.mockResolvedValueOnce([]);

    const result = await workoutLogService.getWorkoutLogsByRange(
      "user-1",
      new Date("2026-01-01T00:00:00.000Z"),
      new Date("2026-01-02T00:00:00.000Z"),
    );

    expect(result).toStrictEqual([]);
  });

  test("propagates an unexpected error", async () => {
    const dbError = new Error("Prisma database is currently unavailable.");
    prismaMock.workoutLog.findMany.mockRejectedValueOnce(dbError);

    await expect(
      workoutLogService.getWorkoutLogsByRange("user-1", new Date(), new Date()),
    ).rejects.toThrow(dbError);
  });
});

describe("WorkoutLog Service getWorkoutLogById", () => {
  beforeEach(() => mockReset(prismaMock));

  test("throws NotFoundError when the log does not exist", async () => {
    prismaMock.workoutLog.findUnique.mockResolvedValueOnce(null);

    await expect(
      workoutLogService.getWorkoutLogById("user-1", "log-1"),
    ).rejects.toThrow(new NotFoundError("Workout log not found."));
  });

  test("scopes the lookup to the log id AND the owning user", async () => {
    prismaMock.workoutLog.findUnique.mockResolvedValueOnce(rawDetail());

    await workoutLogService.getWorkoutLogById("user-1", "log-1");

    // Ownership is enforced in the WHERE clause, not after the fetch.
    expect(prismaMock.workoutLog.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "log-1", userId: "user-1" },
      }),
    );
  });

  test("returns the detail DTO with nested exercises + sets (FKs stripped)", async () => {
    prismaMock.workoutLog.findUnique.mockResolvedValueOnce(rawDetail());

    const result = await workoutLogService.getWorkoutLogById("user-1", "log-1");

    expect(result).toStrictEqual(expectedDetailDto);
    expect(result).not.toHaveProperty("userId");
    expect(result).not.toHaveProperty("workoutDayId");
    expect(result).not.toHaveProperty("createdAt");
    expect(result.exercises![0]).not.toHaveProperty("workoutLogId");
    expect(result.exercises![0]).not.toHaveProperty("exerciseId");
    expect(result.exercises![0]!.sets[0]).not.toHaveProperty("exerciseLogId");
  });

  test("propagates an unexpected error", async () => {
    const dbError = new Error("Prisma database is currently unavailable.");
    prismaMock.workoutLog.findUnique.mockRejectedValueOnce(dbError);

    await expect(
      workoutLogService.getWorkoutLogById("user-1", "log-1"),
    ).rejects.toThrow(dbError);
  });
});

describe("WorkoutLog Service createWorkoutLog", () => {
  beforeEach(() => {
    mockReset(prismaMock);
    prismaMock.$transaction.mockImplementation((cb: any) => cb(prismaMock));
  });

  test("ad-hoc create (no workoutDayId) skips the transaction and returns the detail DTO", async () => {
    prismaMock.workoutLog.create.mockResolvedValueOnce(
      rawDetail({ workoutDayId: null, workoutDay: null }),
    );

    const data = { userId: "user-1", date: "2026-06-07T00:00:00.000Z" };
    const result = await workoutLogService.createWorkoutLog("user-1", data);

    // No template day → no ownership pre-check, so the transaction is untouched.
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(prismaMock.workoutDay.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.workoutLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data }),
    );
    expect(result).toMatchObject({ id: "log-1", date: "2026-06-07" });
  });

  test("templated create verifies day ownership then creates the log", async () => {
    prismaMock.workoutDay.findFirst.mockResolvedValueOnce({ id: "day-1" } as any);
    prismaMock.workoutLog.create.mockResolvedValueOnce(rawDetail());

    const data = {
      userId: "user-1",
      date: "2026-06-07T00:00:00.000Z",
      workoutDayId: "day-1",
    };
    const result = await workoutLogService.createWorkoutLog("user-1", data);

    // The day must belong to a plan owned by this user.
    expect(prismaMock.workoutDay.findFirst).toHaveBeenCalledWith({
      where: { id: "day-1", workoutPlan: { userId: "user-1" } },
    });
    expect(prismaMock.workoutLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data }),
    );
    expect(result).toStrictEqual(expectedDetailDto);
  });

  test("throws NotFoundError when the workoutDay is missing or not owned, and never creates", async () => {
    prismaMock.workoutDay.findFirst.mockResolvedValueOnce(null);

    await expect(
      workoutLogService.createWorkoutLog("user-1", {
        userId: "user-1",
        date: "2026-06-07T00:00:00.000Z",
        workoutDayId: "day-1",
      }),
    ).rejects.toThrow(new NotFoundError("Workout day not found."));
    expect(prismaMock.workoutLog.create).not.toHaveBeenCalled();
  });

  test("propagates an unexpected error from create", async () => {
    const dbError = new Error("Prisma database is currently unavailable.");
    prismaMock.workoutLog.create.mockRejectedValueOnce(dbError);

    await expect(
      workoutLogService.createWorkoutLog("user-1", {
        userId: "user-1",
        date: "2026-06-07T00:00:00.000Z",
      }),
    ).rejects.toThrow(dbError);
  });
});

describe("WorkoutLog Service updateWorkoutLog", () => {
  beforeEach(() => {
    mockReset(prismaMock);
    prismaMock.$transaction.mockImplementation((cb: any) => cb(prismaMock));
  });

  // --- plain path (no workoutDayId, or workoutDayId === null) ---

  test("updates a field without verifying a day and returns the detail DTO", async () => {
    prismaMock.workoutLog.update.mockResolvedValueOnce(rawDetail());

    const result = await workoutLogService.updateWorkoutLog("user-1", "log-1", {
      date: "2026-06-08T00:00:00.000Z",
    });

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(prismaMock.workoutDay.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.workoutLog.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "log-1", userId: "user-1" },
        data: { date: "2026-06-08T00:00:00.000Z" },
      }),
    );
    expect(result).toStrictEqual(expectedDetailDto);
  });

  test("unlinking the day (workoutDayId: null) takes the plain path", async () => {
    prismaMock.workoutLog.update.mockResolvedValueOnce(
      rawDetail({ workoutDayId: null, workoutDay: null }),
    );

    await workoutLogService.updateWorkoutLog("user-1", "log-1", {
      workoutDayId: null,
    });

    // null is falsy, so there is no ownership pre-check for the (cleared) day.
    expect(prismaMock.workoutDay.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.workoutLog.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { workoutDayId: null } }),
    );
  });

  test("maps P2025 on the plain path to NotFoundError", async () => {
    prismaMock.workoutLog.update.mockRejectedValueOnce(prismaError("P2025"));

    await expect(
      workoutLogService.updateWorkoutLog("user-1", "log-1", {
        date: "2026-06-08T00:00:00.000Z",
      }),
    ).rejects.toThrow(new NotFoundError("Workout log not found."));
  });

  test("rethrows non-P2025 Prisma errors unchanged on the plain path", async () => {
    const fkError = prismaError("P2003");
    prismaMock.workoutLog.update.mockRejectedValueOnce(fkError);

    await expect(
      workoutLogService.updateWorkoutLog("user-1", "log-1", {
        date: "2026-06-08T00:00:00.000Z",
      }),
    ).rejects.toBe(fkError);
  });

  test("propagates a non-Error thrown value on the plain path", async () => {
    prismaMock.workoutLog.update.mockRejectedValueOnce(42);

    await expect(
      workoutLogService.updateWorkoutLog("user-1", "log-1", {
        date: "2026-06-08T00:00:00.000Z",
      }),
    ).rejects.toBe(42);
  });

  // --- transaction path (truthy workoutDayId) ---

  test("re-linking a day verifies its ownership before updating", async () => {
    prismaMock.workoutDay.findFirst.mockResolvedValueOnce({ id: "day-2" } as any);
    prismaMock.workoutLog.update.mockResolvedValueOnce(rawDetail());

    await workoutLogService.updateWorkoutLog("user-1", "log-1", {
      workoutDayId: "day-2",
    });

    expect(prismaMock.workoutDay.findFirst).toHaveBeenCalledWith({
      where: { id: "day-2", workoutPlan: { userId: "user-1" } },
    });
    expect(prismaMock.workoutLog.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "log-1", userId: "user-1" },
        data: { workoutDayId: "day-2" },
      }),
    );
  });

  test("throws NotFoundError when the re-linked day is missing or not owned, and never updates", async () => {
    prismaMock.workoutDay.findFirst.mockResolvedValueOnce(null);

    await expect(
      workoutLogService.updateWorkoutLog("user-1", "log-1", {
        workoutDayId: "day-2",
      }),
    ).rejects.toThrow(new NotFoundError("Workout day not found."));
    expect(prismaMock.workoutLog.update).not.toHaveBeenCalled();
  });

  test("maps P2025 inside the transaction path to NotFoundError (log missing)", async () => {
    prismaMock.workoutDay.findFirst.mockResolvedValueOnce({ id: "day-2" } as any);
    prismaMock.workoutLog.update.mockRejectedValueOnce(prismaError("P2025"));

    await expect(
      workoutLogService.updateWorkoutLog("user-1", "log-1", {
        workoutDayId: "day-2",
      }),
    ).rejects.toThrow(new NotFoundError("Workout log not found."));
  });
});

describe("WorkoutLog Service deleteWorkoutLog", () => {
  beforeEach(() => mockReset(prismaMock));

  test("deletes the log scoped to the owner and resolves undefined", async () => {
    prismaMock.workoutLog.delete.mockResolvedValueOnce(rawDetail() as any);

    const result = await workoutLogService.deleteWorkoutLog("user-1", "log-1");

    expect(result).toBeUndefined();
    expect(prismaMock.workoutLog.delete).toHaveBeenCalledWith({
      where: { id: "log-1", userId: "user-1" },
    });
  });

  test("maps P2025 to NotFoundError", async () => {
    prismaMock.workoutLog.delete.mockRejectedValueOnce(prismaError("P2025"));

    await expect(
      workoutLogService.deleteWorkoutLog("user-1", "log-1"),
    ).rejects.toThrow(new NotFoundError("Workout log not found."));
  });

  test("rethrows non-P2025 Prisma errors unchanged", async () => {
    const fkError = prismaError("P2003");
    prismaMock.workoutLog.delete.mockRejectedValueOnce(fkError);

    await expect(
      workoutLogService.deleteWorkoutLog("user-1", "log-1"),
    ).rejects.toBe(fkError);
  });

  test("propagates a non-Error thrown value", async () => {
    prismaMock.workoutLog.delete.mockRejectedValueOnce("unknown");

    await expect(
      workoutLogService.deleteWorkoutLog("user-1", "log-1"),
    ).rejects.toBe("unknown");
  });
});
