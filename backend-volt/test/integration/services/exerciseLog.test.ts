// Integration tests: exercise log service against a real database.
// No mocks — prisma queries run against the test DB (TEST_DATABASE_URL).

import { expect, describe, it, beforeAll, afterAll, beforeEach } from "vitest";
import { prisma } from "../../../src/db.js";
import * as exerciseLogService from "../../../src/services/exerciseLog.service.js";
import { NotFoundError } from "../../../src/errors.js";

const TEST_CLERK_ID = "integration_test_exerciseLog_service_user";
let testUserId: string;

// A second user used to prove cross-user isolation.
const OTHER_CLERK_ID = "integration_test_exerciseLog_service_other";
let otherUserId: string;

// Two exercises: one to log, one to swap to on update.
let exerciseId: string;
let exerciseId2: string;

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
    where: { slug: "integration_test_exerciseLog_bench" },
    update: {},
    create: { slug: "integration_test_exerciseLog_bench", name: "Bench Press" },
  });
  exerciseId = exercise.id;

  const exercise2 = await prisma.exercise.upsert({
    where: { slug: "integration_test_exerciseLog_squat" },
    update: {},
    create: { slug: "integration_test_exerciseLog_squat", name: "Squat" },
  });
  exerciseId2 = exercise2.id;
});

afterAll(async () => {
  // Exercise logs + sets cascade with their workout log, so deleting logs is enough.
  await prisma.workoutLog.deleteMany({ where: { userId: testUserId } });
  await prisma.workoutLog.deleteMany({ where: { userId: otherUserId } });
  await prisma.exercise.delete({ where: { id: exerciseId } });
  await prisma.exercise.delete({ where: { id: exerciseId2 } });
  await prisma.user.delete({ where: { id: testUserId } });
  await prisma.user.delete({ where: { id: otherUserId } });
});

async function reset() {
  await prisma.workoutLog.deleteMany({ where: { userId: testUserId } });
  await prisma.workoutLog.deleteMany({ where: { userId: otherUserId } });
}

// Create an ad-hoc workout log owned by `userId` and return its id.
async function createLog(userId: string) {
  const log = await prisma.workoutLog.create({
    data: { userId, date: new Date("2026-06-07") },
  });
  return log.id;
}

describe("getAllExerciseLogs", () => {
  beforeEach(reset);
  afterAll(reset);

  it("throws NotFoundError when the parent workout log does not exist", async () => {
    await expect(
      exerciseLogService.getAllExerciseLogs(crypto.randomUUID(), testUserId),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError when the parent log belongs to another user", async () => {
    const logId = await createLog(otherUserId);

    await expect(
      exerciseLogService.getAllExerciseLogs(logId, testUserId),
    ).rejects.toThrow(NotFoundError);
  });

  it("returns an empty wrapped list when the log has no exercises", async () => {
    const logId = await createLog(testUserId);

    const result = await exerciseLogService.getAllExerciseLogs(logId, testUserId);
    expect(result).toStrictEqual({ exerciseLogs: [] });
  });

  it("returns the log's exercises with sets ordered by setNumber (FKs stripped)", async () => {
    const logId = await createLog(testUserId);
    const el = await prisma.exerciseLog.create({
      data: { workoutLogId: logId, exerciseId, notes: "felt strong" },
    });
    await prisma.setLog.createMany({
      data: [
        { exerciseLogId: el.id, setNumber: 2, reps: 8, weight: 145 },
        { exerciseLogId: el.id, setNumber: 1, reps: 10, weight: 135 },
      ],
    });

    const result = await exerciseLogService.getAllExerciseLogs(logId, testUserId);

    expect(result.exerciseLogs).toHaveLength(1);
    const dto = result.exerciseLogs[0]!;
    expect(dto.notes).toBe("felt strong");
    expect(dto.exercise).toStrictEqual({
      id: exerciseId,
      slug: "integration_test_exerciseLog_bench",
      name: "Bench Press",
    });
    expect(dto).not.toHaveProperty("workoutLogId");
    expect(dto).not.toHaveProperty("exerciseId");
    expect(dto.sets.map((s) => s.setNumber)).toStrictEqual([1, 2]);
    expect(dto.sets[0]).not.toHaveProperty("exerciseLogId");
  });
});

describe("getExerciseLogById", () => {
  beforeEach(reset);
  afterAll(reset);

  it("returns the exercise log with its sets", async () => {
    const logId = await createLog(testUserId);
    const el = await prisma.exerciseLog.create({
      data: { workoutLogId: logId, exerciseId },
    });
    await prisma.setLog.create({
      data: { exerciseLogId: el.id, setNumber: 1, reps: 5, weight: 200 },
    });

    const result = await exerciseLogService.getExerciseLogById(
      logId,
      testUserId,
      el.id,
    );

    expect(result.id).toBe(el.id);
    expect(result.sets).toHaveLength(1);
    expect(result.sets[0]).toMatchObject({ setNumber: 1, reps: 5, weight: 200 });
  });

  it("throws NotFoundError for an unknown exercise log id", async () => {
    const logId = await createLog(testUserId);

    await expect(
      exerciseLogService.getExerciseLogById(
        logId,
        testUserId,
        crypto.randomUUID(),
      ),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError when the exercise log belongs to another user's log", async () => {
    const logId = await createLog(otherUserId);
    const el = await prisma.exerciseLog.create({
      data: { workoutLogId: logId, exerciseId },
    });

    await expect(
      exerciseLogService.getExerciseLogById(logId, testUserId, el.id),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError when queried under the wrong parent log", async () => {
    const logId = await createLog(testUserId);
    const otherLogId = await createLog(testUserId);
    const el = await prisma.exerciseLog.create({
      data: { workoutLogId: logId, exerciseId },
    });

    // The exercise log exists and is owned by the user, but not under otherLogId.
    await expect(
      exerciseLogService.getExerciseLogById(otherLogId, testUserId, el.id),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("createExerciseLog", () => {
  beforeEach(reset);
  afterAll(reset);

  it("creates an exercise log and persists it under the parent", async () => {
    const logId = await createLog(testUserId);

    const result = await exerciseLogService.createExerciseLog(logId, testUserId, {
      workoutLogId: logId,
      exerciseId,
      notes: "warmup",
    });

    expect(result.id).toBeDefined();
    expect(result.notes).toBe("warmup");
    expect(result.exercise.id).toBe(exerciseId);
    expect(result.sets).toStrictEqual([]);

    const persisted = await prisma.exerciseLog.findUnique({
      where: { id: result.id },
    });
    expect(persisted!.workoutLogId).toBe(logId);
  });

  it("throws NotFoundError when the parent log is unknown", async () => {
    const missing = crypto.randomUUID();

    await expect(
      exerciseLogService.createExerciseLog(missing, testUserId, {
        workoutLogId: missing,
        exerciseId,
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError (creating nothing) when the parent log is another user's", async () => {
    const logId = await createLog(otherUserId);

    await expect(
      exerciseLogService.createExerciseLog(logId, testUserId, {
        workoutLogId: logId,
        exerciseId,
      }),
    ).rejects.toThrow(NotFoundError);

    const rows = await prisma.exerciseLog.findMany({
      where: { workoutLogId: logId },
    });
    expect(rows).toHaveLength(0);
  });

  it("throws NotFoundError when the exercise does not exist", async () => {
    const logId = await createLog(testUserId);

    await expect(
      exerciseLogService.createExerciseLog(logId, testUserId, {
        workoutLogId: logId,
        exerciseId: crypto.randomUUID(),
      }),
    ).rejects.toThrow(NotFoundError);

    const rows = await prisma.exerciseLog.findMany({
      where: { workoutLogId: logId },
    });
    expect(rows).toHaveLength(0);
  });
});

describe("updateExerciseLog", () => {
  beforeEach(reset);
  afterAll(reset);

  it("updates notes and returns the DTO", async () => {
    const logId = await createLog(testUserId);
    const el = await prisma.exerciseLog.create({
      data: { workoutLogId: logId, exerciseId, notes: "before" },
    });

    const result = await exerciseLogService.updateExerciseLog(
      logId,
      testUserId,
      el.id,
      { notes: "after" },
    );

    expect(result.notes).toBe("after");
  });

  it("clears notes when set to null", async () => {
    const logId = await createLog(testUserId);
    const el = await prisma.exerciseLog.create({
      data: { workoutLogId: logId, exerciseId, notes: "before" },
    });

    const result = await exerciseLogService.updateExerciseLog(
      logId,
      testUserId,
      el.id,
      { notes: null },
    );

    expect(result.notes).toBeNull();
  });

  it("swaps the exercise and denormalizes the new ref", async () => {
    const logId = await createLog(testUserId);
    const el = await prisma.exerciseLog.create({
      data: { workoutLogId: logId, exerciseId },
    });

    const result = await exerciseLogService.updateExerciseLog(
      logId,
      testUserId,
      el.id,
      { exerciseId: exerciseId2 },
    );

    expect(result.exercise).toStrictEqual({
      id: exerciseId2,
      slug: "integration_test_exerciseLog_squat",
      name: "Squat",
    });
  });

  it("throws NotFoundError for an unknown exercise log id", async () => {
    const logId = await createLog(testUserId);

    await expect(
      exerciseLogService.updateExerciseLog(
        logId,
        testUserId,
        crypto.randomUUID(),
        { notes: "x" },
      ),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError when the exercise log belongs to another user", async () => {
    const logId = await createLog(otherUserId);
    const el = await prisma.exerciseLog.create({
      data: { workoutLogId: logId, exerciseId, notes: "before" },
    });

    await expect(
      exerciseLogService.updateExerciseLog(logId, testUserId, el.id, {
        notes: "hijacked",
      }),
    ).rejects.toThrow(NotFoundError);

    const unchanged = await prisma.exerciseLog.findUnique({
      where: { id: el.id },
    });
    expect(unchanged!.notes).toBe("before");
  });

  it("throws NotFoundError when updated under the wrong parent log", async () => {
    const logId = await createLog(testUserId);
    const otherLogId = await createLog(testUserId);
    const el = await prisma.exerciseLog.create({
      data: { workoutLogId: logId, exerciseId, notes: "before" },
    });

    await expect(
      exerciseLogService.updateExerciseLog(otherLogId, testUserId, el.id, {
        notes: "mismatch",
      }),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("deleteExerciseLog", () => {
  beforeEach(reset);
  afterAll(reset);

  it("deletes the exercise log and cascades its sets", async () => {
    const logId = await createLog(testUserId);
    const el = await prisma.exerciseLog.create({
      data: { workoutLogId: logId, exerciseId },
    });
    await prisma.setLog.create({
      data: { exerciseLogId: el.id, setNumber: 1, reps: 10, weight: 135 },
    });

    const result = await exerciseLogService.deleteExerciseLog(
      logId,
      testUserId,
      el.id,
    );
    expect(result).toBeUndefined();

    expect(
      await prisma.exerciseLog.findUnique({ where: { id: el.id } }),
    ).toBeNull();
    expect(
      await prisma.setLog.findMany({ where: { exerciseLogId: el.id } }),
    ).toHaveLength(0);
  });

  it("throws NotFoundError for an unknown exercise log id", async () => {
    const logId = await createLog(testUserId);

    await expect(
      exerciseLogService.deleteExerciseLog(
        logId,
        testUserId,
        crypto.randomUUID(),
      ),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError when the exercise log belongs to another user", async () => {
    const logId = await createLog(otherUserId);
    const el = await prisma.exerciseLog.create({
      data: { workoutLogId: logId, exerciseId },
    });

    await expect(
      exerciseLogService.deleteExerciseLog(logId, testUserId, el.id),
    ).rejects.toThrow(NotFoundError);

    expect(
      await prisma.exerciseLog.findUnique({ where: { id: el.id } }),
    ).not.toBeNull();
  });

  it("throws NotFoundError when deleted under the wrong parent log", async () => {
    const logId = await createLog(testUserId);
    const otherLogId = await createLog(testUserId);
    const el = await prisma.exerciseLog.create({
      data: { workoutLogId: logId, exerciseId },
    });

    await expect(
      exerciseLogService.deleteExerciseLog(otherLogId, testUserId, el.id),
    ).rejects.toThrow(NotFoundError);

    expect(
      await prisma.exerciseLog.findUnique({ where: { id: el.id } }),
    ).not.toBeNull();
  });
});
