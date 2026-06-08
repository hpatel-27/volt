// Integration tests: set log service against a real database.
// No mocks — prisma queries run against the test DB (TEST_DATABASE_URL).

import { expect, describe, it, beforeAll, afterAll, beforeEach } from "vitest";
import { prisma } from "../../../src/db.js";
import * as setLogService from "../../../src/services/setLog.service.js";
import { NotFoundError } from "../../../src/errors.js";

const TEST_CLERK_ID = "integration_test_setLog_service_user";
let testUserId: string;

// A second user used to prove cross-user isolation.
const OTHER_CLERK_ID = "integration_test_setLog_service_other";
let otherUserId: string;

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
    where: { slug: "integration_test_setLog_bench" },
    update: {},
    create: { slug: "integration_test_setLog_bench", name: "Bench Press" },
  });
  exerciseId = exercise.id;
});

afterAll(async () => {
  // Sets cascade with their exercise log, which cascades with its workout log,
  // so deleting the logs is enough to clean the whole chain.
  await prisma.workoutLog.deleteMany({ where: { userId: testUserId } });
  await prisma.workoutLog.deleteMany({ where: { userId: otherUserId } });
  await prisma.exercise.delete({ where: { id: exerciseId } });
  await prisma.user.delete({ where: { id: testUserId } });
  await prisma.user.delete({ where: { id: otherUserId } });
});

async function reset() {
  await prisma.workoutLog.deleteMany({ where: { userId: testUserId } });
  await prisma.workoutLog.deleteMany({ where: { userId: otherUserId } });
}

// Build a full ownership chain (workout log → exercise log) for `userId` and
// return both ids so set-log queries have a real parent to hang off of.
async function createChain(userId: string) {
  const log = await prisma.workoutLog.create({
    data: { userId, date: new Date("2026-06-07") },
  });
  const exerciseLog = await prisma.exerciseLog.create({
    data: { workoutLogId: log.id, exerciseId },
  });
  return { logId: log.id, exerciseLogId: exerciseLog.id };
}

describe("getAllSetLogs", () => {
  beforeEach(reset);
  afterAll(reset);

  it("throws NotFoundError when the parent exercise log does not exist", async () => {
    const { logId } = await createChain(testUserId);

    await expect(
      setLogService.getAllSetLogs(logId, crypto.randomUUID(), testUserId),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError when the parent exercise log belongs to another user", async () => {
    const { logId, exerciseLogId } = await createChain(otherUserId);

    await expect(
      setLogService.getAllSetLogs(logId, exerciseLogId, testUserId),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError when queried under the wrong parent workout log", async () => {
    const { exerciseLogId } = await createChain(testUserId);
    const other = await createChain(testUserId);

    // The exercise log exists and is owned by the user, but not under other.logId.
    await expect(
      setLogService.getAllSetLogs(other.logId, exerciseLogId, testUserId),
    ).rejects.toThrow(NotFoundError);
  });

  it("returns an empty wrapped list when there are no sets", async () => {
    const { logId, exerciseLogId } = await createChain(testUserId);

    const result = await setLogService.getAllSetLogs(
      logId,
      exerciseLogId,
      testUserId,
    );
    expect(result).toStrictEqual({ sets: [] });
  });

  it("returns the sets ordered by setNumber asc (exerciseLogId stripped)", async () => {
    const { logId, exerciseLogId } = await createChain(testUserId);
    // Insert out of order to prove the service sorts.
    await prisma.setLog.createMany({
      data: [
        { exerciseLogId, setNumber: 3, reps: 6, weight: 155 },
        { exerciseLogId, setNumber: 1, reps: 10, weight: 135 },
        { exerciseLogId, setNumber: 2, reps: 8, weight: 145 },
      ],
    });

    const result = await setLogService.getAllSetLogs(
      logId,
      exerciseLogId,
      testUserId,
    );

    expect(result.sets.map((s) => s.setNumber)).toStrictEqual([1, 2, 3]);
    expect(result.sets[0]).not.toHaveProperty("exerciseLogId");
  });
});

describe("getSetById", () => {
  beforeEach(reset);
  afterAll(reset);

  it("returns the set when it belongs to the user", async () => {
    const { exerciseLogId } = await createChain(testUserId);
    const set = await prisma.setLog.create({
      data: { exerciseLogId, setNumber: 1, reps: 5, weight: 200 },
    });

    const result = await setLogService.getSetById(testUserId, set.id);

    expect(result).toStrictEqual({
      id: set.id,
      setNumber: 1,
      reps: 5,
      weight: 200,
    });
  });

  it("throws NotFoundError for an unknown set id", async () => {
    await expect(
      setLogService.getSetById(testUserId, crypto.randomUUID()),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError when the set belongs to another user", async () => {
    const { exerciseLogId } = await createChain(otherUserId);
    const set = await prisma.setLog.create({
      data: { exerciseLogId, setNumber: 1, reps: 5, weight: 200 },
    });

    await expect(
      setLogService.getSetById(testUserId, set.id),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("createSetLog", () => {
  beforeEach(reset);
  afterAll(reset);

  it("assigns setNumber 1 to the first set and persists it", async () => {
    const { logId, exerciseLogId } = await createChain(testUserId);

    const result = await setLogService.createSetLog(
      logId,
      exerciseLogId,
      testUserId,
      { exerciseLogId, reps: 10, weight: 135 },
    );

    expect(result.setNumber).toBe(1);
    expect(result.reps).toBe(10);
    expect(result.weight).toBe(135);

    const persisted = await prisma.setLog.findUnique({ where: { id: result.id } });
    expect(persisted!.exerciseLogId).toBe(exerciseLogId);
  });

  it("auto-increments setNumber as sets are appended", async () => {
    const { logId, exerciseLogId } = await createChain(testUserId);

    const first = await setLogService.createSetLog(logId, exerciseLogId, testUserId, {
      exerciseLogId,
      reps: 10,
      weight: 135,
    });
    const second = await setLogService.createSetLog(logId, exerciseLogId, testUserId, {
      exerciseLogId,
      reps: 8,
      weight: 145,
    });
    const third = await setLogService.createSetLog(logId, exerciseLogId, testUserId, {
      exerciseLogId,
      reps: 6,
      weight: 155,
    });

    expect([first.setNumber, second.setNumber, third.setNumber]).toStrictEqual([
      1, 2, 3,
    ]);
  });

  it("throws NotFoundError when the parent exercise log is unknown", async () => {
    const { logId } = await createChain(testUserId);
    const missing = crypto.randomUUID();

    await expect(
      setLogService.createSetLog(logId, missing, testUserId, {
        exerciseLogId: missing,
        reps: 10,
        weight: 135,
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError (creating nothing) when the parent belongs to another user", async () => {
    const { logId, exerciseLogId } = await createChain(otherUserId);

    await expect(
      setLogService.createSetLog(logId, exerciseLogId, testUserId, {
        exerciseLogId,
        reps: 10,
        weight: 135,
      }),
    ).rejects.toThrow(NotFoundError);

    const sets = await prisma.setLog.findMany({ where: { exerciseLogId } });
    expect(sets).toHaveLength(0);
  });

  it("throws NotFoundError when created under the wrong parent workout log", async () => {
    const { exerciseLogId } = await createChain(testUserId);
    const other = await createChain(testUserId);

    await expect(
      setLogService.createSetLog(other.logId, exerciseLogId, testUserId, {
        exerciseLogId,
        reps: 10,
        weight: 135,
      }),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("updateSetLog", () => {
  beforeEach(reset);
  afterAll(reset);

  it("updates reps and weight and returns the DTO", async () => {
    const { exerciseLogId } = await createChain(testUserId);
    const set = await prisma.setLog.create({
      data: { exerciseLogId, setNumber: 1, reps: 10, weight: 135 },
    });

    const result = await setLogService.updateSetLog(testUserId, set.id, {
      reps: 12,
      weight: 140,
    });

    expect(result.reps).toBe(12);
    expect(result.weight).toBe(140);
    // setNumber is immutable here — only reps/weight change.
    expect(result.setNumber).toBe(1);
  });

  it("throws NotFoundError for an unknown set id", async () => {
    await expect(
      setLogService.updateSetLog(testUserId, crypto.randomUUID(), { reps: 12 }),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError when the set belongs to another user", async () => {
    const { exerciseLogId } = await createChain(otherUserId);
    const set = await prisma.setLog.create({
      data: { exerciseLogId, setNumber: 1, reps: 10, weight: 135 },
    });

    await expect(
      setLogService.updateSetLog(testUserId, set.id, { reps: 99 }),
    ).rejects.toThrow(NotFoundError);

    const unchanged = await prisma.setLog.findUnique({ where: { id: set.id } });
    expect(unchanged!.reps).toBe(10);
  });
});

describe("deleteSetLog", () => {
  beforeEach(reset);
  afterAll(reset);

  it("deletes the set", async () => {
    const { exerciseLogId } = await createChain(testUserId);
    const set = await prisma.setLog.create({
      data: { exerciseLogId, setNumber: 1, reps: 10, weight: 135 },
    });

    const result = await setLogService.deleteSetLog(testUserId, set.id);
    expect(result).toBeUndefined();

    expect(
      await prisma.setLog.findUnique({ where: { id: set.id } }),
    ).toBeNull();
  });

  it("throws NotFoundError for an unknown set id", async () => {
    await expect(
      setLogService.deleteSetLog(testUserId, crypto.randomUUID()),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError when the set belongs to another user", async () => {
    const { exerciseLogId } = await createChain(otherUserId);
    const set = await prisma.setLog.create({
      data: { exerciseLogId, setNumber: 1, reps: 10, weight: 135 },
    });

    await expect(
      setLogService.deleteSetLog(testUserId, set.id),
    ).rejects.toThrow(NotFoundError);

    expect(
      await prisma.setLog.findUnique({ where: { id: set.id } }),
    ).not.toBeNull();
  });
});
