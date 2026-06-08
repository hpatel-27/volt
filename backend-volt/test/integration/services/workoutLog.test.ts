// Integration tests: workout log service against a real database.
// No mocks — prisma queries run against the test DB (TEST_DATABASE_URL).

import { expect, describe, it, beforeAll, afterAll, beforeEach } from "vitest";
import { prisma } from "../../../src/db.js";
import * as workoutLogService from "../../../src/services/workoutLog.service.js";
import { NotFoundError } from "../../../src/errors.js";

// Unique clerkId so this test user doesn't collide with real users or other suites
const TEST_CLERK_ID = "integration_test_workoutLog_service_user";
let testUserId: string;

// A second user used to prove cross-user isolation (one user can't touch another's logs)
const OTHER_CLERK_ID = "integration_test_workoutLog_service_other";
let otherUserId: string;

// A shared exercise so detail tests can attach real exercise logs + sets
let exerciseId: string;

beforeAll(async () => {
  const user = await prisma.user.upsert({
    where: { clerkId: TEST_CLERK_ID },
    update: {},
    create: { clerkId: TEST_CLERK_ID },
  });
  testUserId = user.id;

  const other = await prisma.user.upsert({
    where: { clerkId: OTHER_CLERK_ID },
    update: {},
    create: { clerkId: OTHER_CLERK_ID },
  });
  otherUserId = other.id;

  const exercise = await prisma.exercise.upsert({
    where: { slug: "integration_test_workoutLog_bench" },
    update: {},
    create: { slug: "integration_test_workoutLog_bench", name: "Bench Press" },
  });
  exerciseId = exercise.id;
});

afterAll(async () => {
  // Logs reference the user directly, so they must go before the users. Plans
  // cascade their days; days SetNull onto any logs that referenced them.
  await prisma.workoutLog.deleteMany({ where: { userId: testUserId } });
  await prisma.workoutLog.deleteMany({ where: { userId: otherUserId } });
  await prisma.workoutPlan.deleteMany({ where: { userId: testUserId } });
  await prisma.workoutPlan.deleteMany({ where: { userId: otherUserId } });
  await prisma.exercise.delete({ where: { id: exerciseId } });
  await prisma.user.delete({ where: { id: testUserId } });
  await prisma.user.delete({ where: { id: otherUserId } });
});

// Wipe both users' logs (and any plans they created) between describes so state
// from one block can't leak into the next.
async function reset() {
  await prisma.workoutLog.deleteMany({ where: { userId: testUserId } });
  await prisma.workoutLog.deleteMany({ where: { userId: otherUserId } });
  await prisma.workoutPlan.deleteMany({ where: { userId: testUserId } });
  await prisma.workoutPlan.deleteMany({ where: { userId: otherUserId } });
}

// Create a plan + a single day owned by `userId`, returning both ids.
async function createPlanWithDay(userId: string, name = "Push") {
  const plan = await prisma.workoutPlan.create({ data: { userId, name: "Plan" } });
  const day = await prisma.workoutDay.create({
    data: { workoutPlanId: plan.id, name, order: 1 },
  });
  return { planId: plan.id, dayId: day.id };
}

describe("getAllWorkoutLogs", () => {
  beforeEach(reset);
  afterAll(reset);

  it("returns an empty page when the user has no logs", async () => {
    const result = await workoutLogService.getAllWorkoutLogs(testUserId, 1, 10);
    expect(result).toStrictEqual({
      workoutLogs: [],
      total: 0,
      page: 1,
      limit: 10,
    });
  });

  it("orders by date desc, then createdAt desc, and reports the true total", async () => {
    // Two sessions share a day; createdAt must break the tie newest-first.
    await prisma.workoutLog.createMany({
      data: [
        {
          userId: testUserId,
          date: new Date("2026-06-05"),
          createdAt: new Date("2026-06-05T07:00:00.000Z"),
        },
        {
          userId: testUserId,
          date: new Date("2026-06-07"),
          createdAt: new Date("2026-06-07T07:00:00.000Z"), // morning
        },
        {
          userId: testUserId,
          date: new Date("2026-06-07"),
          createdAt: new Date("2026-06-07T18:00:00.000Z"), // evening (newer)
        },
      ],
    });

    const result = await workoutLogService.getAllWorkoutLogs(testUserId, 1, 10);

    expect(result.total).toBe(3);
    // 06-07 evening, 06-07 morning, then 06-05.
    expect(result.workoutLogs.map((l) => l.date)).toStrictEqual([
      "2026-06-07",
      "2026-06-07",
      "2026-06-05",
    ]);
    expect(result.workoutLogs[0]).not.toHaveProperty("userId");
  });

  it("paginates with skip/take while keeping the full total", async () => {
    await prisma.workoutLog.createMany({
      data: [
        { userId: testUserId, date: new Date("2026-06-01") },
        { userId: testUserId, date: new Date("2026-06-02") },
        { userId: testUserId, date: new Date("2026-06-03") },
      ],
    });

    const page2 = await workoutLogService.getAllWorkoutLogs(testUserId, 2, 2);

    expect(page2.total).toBe(3);
    expect(page2.page).toBe(2);
    expect(page2.limit).toBe(2);
    // desc order is 06-03, 06-02, 06-01; page 2 (skip 2) is the last one.
    expect(page2.workoutLogs).toHaveLength(1);
    expect(page2.workoutLogs[0]!.date).toBe("2026-06-01");
  });

  it("counts exercise logs per session and denormalizes the workout day", async () => {
    const { dayId } = await createPlanWithDay(testUserId);
    const log = await prisma.workoutLog.create({
      data: { userId: testUserId, date: new Date("2026-06-07"), workoutDayId: dayId },
    });
    await prisma.exerciseLog.createMany({
      data: [
        { workoutLogId: log.id, exerciseId },
        { workoutLogId: log.id, exerciseId },
      ],
    });

    const result = await workoutLogService.getAllWorkoutLogs(testUserId, 1, 10);

    expect(result.workoutLogs).toHaveLength(1);
    expect(result.workoutLogs[0]!.exerciseCount).toBe(2);
    expect(result.workoutLogs[0]!.workoutDay).toStrictEqual({
      id: dayId,
      name: "Push",
    });
  });

  it("does not return another user's logs", async () => {
    await prisma.workoutLog.create({
      data: { userId: otherUserId, date: new Date("2026-06-07") },
    });

    const result = await workoutLogService.getAllWorkoutLogs(testUserId, 1, 10);
    expect(result).toStrictEqual({
      workoutLogs: [],
      total: 0,
      page: 1,
      limit: 10,
    });
  });
});

describe("getTodayWorkoutLogs", () => {
  beforeEach(reset);
  afterAll(reset);

  it("returns only the sessions for the given day, oldest first", async () => {
    await prisma.workoutLog.createMany({
      data: [
        {
          userId: testUserId,
          date: new Date("2026-06-07"),
          createdAt: new Date("2026-06-07T18:00:00.000Z"), // evening
        },
        {
          userId: testUserId,
          date: new Date("2026-06-07"),
          createdAt: new Date("2026-06-07T07:00:00.000Z"), // morning (older)
        },
        // A different day must be excluded.
        { userId: testUserId, date: new Date("2026-06-06") },
      ],
    });

    const result = await workoutLogService.getTodayWorkoutLogs(
      testUserId,
      "2026-06-07",
    );

    expect(result).toHaveLength(2);
    expect(result.every((l) => l.date === "2026-06-07")).toBe(true);
  });

  it("returns an empty array when there are no sessions that day", async () => {
    await prisma.workoutLog.create({
      data: { userId: testUserId, date: new Date("2026-06-06") },
    });

    const result = await workoutLogService.getTodayWorkoutLogs(
      testUserId,
      "2026-06-07",
    );
    expect(result).toStrictEqual([]);
  });

  it("does not return another user's sessions for that day", async () => {
    await prisma.workoutLog.create({
      data: { userId: otherUserId, date: new Date("2026-06-07") },
    });

    const result = await workoutLogService.getTodayWorkoutLogs(
      testUserId,
      "2026-06-07",
    );
    expect(result).toStrictEqual([]);
  });
});

describe("getWorkoutLogById", () => {
  beforeEach(reset);
  afterAll(reset);

  it("returns the detail DTO with nested exercises + ordered sets (FKs stripped)", async () => {
    const { dayId } = await createPlanWithDay(testUserId);
    const log = await prisma.workoutLog.create({
      data: { userId: testUserId, date: new Date("2026-06-07"), workoutDayId: dayId },
    });
    const exerciseLog = await prisma.exerciseLog.create({
      data: { workoutLogId: log.id, exerciseId, notes: "felt strong" },
    });
    // Insert sets out of order to prove the include sorts by setNumber asc.
    await prisma.setLog.createMany({
      data: [
        { exerciseLogId: exerciseLog.id, setNumber: 2, reps: 8, weight: 145 },
        { exerciseLogId: exerciseLog.id, setNumber: 1, reps: 10, weight: 135 },
      ],
    });

    const result = await workoutLogService.getWorkoutLogById(testUserId, log.id);

    expect(result.id).toBe(log.id);
    expect(result.date).toBe("2026-06-07");
    expect(result.workoutDay).toStrictEqual({ id: dayId, name: "Push" });
    expect(result).not.toHaveProperty("userId");
    expect(result).not.toHaveProperty("workoutDayId");

    expect(result.exercises).toHaveLength(1);
    const ex = result.exercises![0]!;
    expect(ex.notes).toBe("felt strong");
    expect(ex.exercise).toStrictEqual({
      id: exerciseId,
      slug: "integration_test_workoutLog_bench",
      name: "Bench Press",
    });
    expect(ex).not.toHaveProperty("workoutLogId");
    expect(ex).not.toHaveProperty("exerciseId");
    expect(ex.sets.map((s) => s.setNumber)).toStrictEqual([1, 2]);
    expect(ex.sets[0]).not.toHaveProperty("exerciseLogId");
  });

  it("returns workoutDay: null and empty exercises for an ad-hoc session", async () => {
    const log = await prisma.workoutLog.create({
      data: { userId: testUserId, date: new Date("2026-06-07") },
    });

    const result = await workoutLogService.getWorkoutLogById(testUserId, log.id);

    expect(result.workoutDay).toBeNull();
    expect(result.exercises).toStrictEqual([]);
  });

  it("throws NotFoundError for an unknown log id", async () => {
    await expect(
      workoutLogService.getWorkoutLogById(testUserId, crypto.randomUUID()),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError when the log belongs to another user", async () => {
    const log = await prisma.workoutLog.create({
      data: { userId: otherUserId, date: new Date("2026-06-07") },
    });

    await expect(
      workoutLogService.getWorkoutLogById(testUserId, log.id),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("createWorkoutLog", () => {
  beforeEach(reset);
  afterAll(reset);

  it("creates an ad-hoc session (no day) and persists it under the owner", async () => {
    const result = await workoutLogService.createWorkoutLog(testUserId, {
      userId: testUserId,
      date: "2026-06-07T00:00:00.000Z",
    });

    expect(result.id).toBeDefined();
    expect(result.date).toBe("2026-06-07");
    expect(result.workoutDay).toBeNull();
    expect(result.exercises).toStrictEqual([]);

    const persisted = await prisma.workoutLog.findUnique({
      where: { id: result.id },
    });
    expect(persisted!.userId).toBe(testUserId);
    expect(persisted!.workoutDayId).toBeNull();
  });

  it("links a templated session to a day the user owns", async () => {
    const { dayId } = await createPlanWithDay(testUserId);

    const result = await workoutLogService.createWorkoutLog(testUserId, {
      userId: testUserId,
      date: "2026-06-07T00:00:00.000Z",
      workoutDayId: dayId,
    });

    expect(result.workoutDay).toStrictEqual({ id: dayId, name: "Push" });
    const persisted = await prisma.workoutLog.findUnique({
      where: { id: result.id },
    });
    expect(persisted!.workoutDayId).toBe(dayId);
  });

  it("throws NotFoundError (and creates nothing) when the day is unknown", async () => {
    await expect(
      workoutLogService.createWorkoutLog(testUserId, {
        userId: testUserId,
        date: "2026-06-07T00:00:00.000Z",
        workoutDayId: crypto.randomUUID(),
      }),
    ).rejects.toThrow(NotFoundError);

    const logs = await prisma.workoutLog.findMany({
      where: { userId: testUserId },
    });
    expect(logs).toHaveLength(0);
  });

  it("throws NotFoundError when the day belongs to another user's plan", async () => {
    const { dayId } = await createPlanWithDay(otherUserId);

    await expect(
      workoutLogService.createWorkoutLog(testUserId, {
        userId: testUserId,
        date: "2026-06-07T00:00:00.000Z",
        workoutDayId: dayId,
      }),
    ).rejects.toThrow(NotFoundError);

    const logs = await prisma.workoutLog.findMany({
      where: { userId: testUserId },
    });
    expect(logs).toHaveLength(0);
  });
});

describe("updateWorkoutLog", () => {
  beforeEach(reset);
  afterAll(reset);

  it("updates the date on the plain path and returns the detail DTO", async () => {
    const log = await prisma.workoutLog.create({
      data: { userId: testUserId, date: new Date("2026-06-07") },
    });

    const result = await workoutLogService.updateWorkoutLog(testUserId, log.id, {
      date: "2026-06-08T00:00:00.000Z",
    });

    expect(result.date).toBe("2026-06-08");
    expect(result.workoutDay).toBeNull();
  });

  it("links a day the user owns (transaction path) and persists it", async () => {
    const { dayId } = await createPlanWithDay(testUserId);
    const log = await prisma.workoutLog.create({
      data: { userId: testUserId, date: new Date("2026-06-07") },
    });

    const result = await workoutLogService.updateWorkoutLog(testUserId, log.id, {
      workoutDayId: dayId,
    });

    expect(result.workoutDay).toStrictEqual({ id: dayId, name: "Push" });
    const persisted = await prisma.workoutLog.findUnique({
      where: { id: log.id },
    });
    expect(persisted!.workoutDayId).toBe(dayId);
  });

  it("unlinks the day when workoutDayId is set to null", async () => {
    const { dayId } = await createPlanWithDay(testUserId);
    const log = await prisma.workoutLog.create({
      data: { userId: testUserId, date: new Date("2026-06-07"), workoutDayId: dayId },
    });

    const result = await workoutLogService.updateWorkoutLog(testUserId, log.id, {
      workoutDayId: null,
    });

    expect(result.workoutDay).toBeNull();
    const persisted = await prisma.workoutLog.findUnique({
      where: { id: log.id },
    });
    expect(persisted!.workoutDayId).toBeNull();
  });

  it("throws NotFoundError for an unknown log id", async () => {
    await expect(
      workoutLogService.updateWorkoutLog(testUserId, crypto.randomUUID(), {
        date: "2026-06-08T00:00:00.000Z",
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError when updating another user's log", async () => {
    const log = await prisma.workoutLog.create({
      data: { userId: otherUserId, date: new Date("2026-06-07") },
    });

    await expect(
      workoutLogService.updateWorkoutLog(testUserId, log.id, {
        date: "2026-06-08T00:00:00.000Z",
      }),
    ).rejects.toThrow(NotFoundError);

    const unchanged = await prisma.workoutLog.findUnique({
      where: { id: log.id },
    });
    expect(unchanged!.date).toStrictEqual(new Date("2026-06-07"));
  });

  it("throws NotFoundError when linking a day from another user's plan", async () => {
    const { dayId } = await createPlanWithDay(otherUserId);
    const log = await prisma.workoutLog.create({
      data: { userId: testUserId, date: new Date("2026-06-07") },
    });

    await expect(
      workoutLogService.updateWorkoutLog(testUserId, log.id, {
        workoutDayId: dayId,
      }),
    ).rejects.toThrow(NotFoundError);

    const unchanged = await prisma.workoutLog.findUnique({
      where: { id: log.id },
    });
    expect(unchanged!.workoutDayId).toBeNull();
  });
});

describe("deleteWorkoutLog", () => {
  beforeEach(reset);
  afterAll(reset);

  it("deletes the session and cascades its exercise logs + sets", async () => {
    const log = await prisma.workoutLog.create({
      data: { userId: testUserId, date: new Date("2026-06-07") },
    });
    const exerciseLog = await prisma.exerciseLog.create({
      data: { workoutLogId: log.id, exerciseId },
    });
    await prisma.setLog.create({
      data: { exerciseLogId: exerciseLog.id, setNumber: 1, reps: 10, weight: 135 },
    });

    const result = await workoutLogService.deleteWorkoutLog(testUserId, log.id);
    expect(result).toBeUndefined();

    expect(
      await prisma.workoutLog.findUnique({ where: { id: log.id } }),
    ).toBeNull();
    // Cascade removed the child exercise log and its set.
    expect(
      await prisma.exerciseLog.findUnique({ where: { id: exerciseLog.id } }),
    ).toBeNull();
    expect(
      await prisma.setLog.findMany({ where: { exerciseLogId: exerciseLog.id } }),
    ).toHaveLength(0);
  });

  it("throws NotFoundError for an unknown log id", async () => {
    await expect(
      workoutLogService.deleteWorkoutLog(testUserId, crypto.randomUUID()),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError when deleting another user's log", async () => {
    const log = await prisma.workoutLog.create({
      data: { userId: otherUserId, date: new Date("2026-06-07") },
    });

    await expect(
      workoutLogService.deleteWorkoutLog(testUserId, log.id),
    ).rejects.toThrow(NotFoundError);

    expect(
      await prisma.workoutLog.findUnique({ where: { id: log.id } }),
    ).not.toBeNull();
  });
});
