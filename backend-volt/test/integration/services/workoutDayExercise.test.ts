// Integration tests: workout day exercise service against a real database.
// No mocks — prisma queries run against the test DB (TEST_DATABASE_URL).

import { expect, describe, it, beforeAll, afterAll, beforeEach } from "vitest";
import { prisma } from "../../../src/db.js";
import * as svc from "../../../src/services/workoutDayExercise.service.js";
import { NotFoundError } from "../../../src/errors.js";

// Unique clerkId so this test user doesn't collide with real users or other suites
const TEST_CLERK_ID = "integration_test_workoutDayExercise_service_user";
let testUserId: string;

// A second user used to prove cross-user isolation
const OTHER_CLERK_ID = "integration_test_workoutDayExercise_service_other";
let otherUserId: string;

// Two shared exercises: one to attach, one to swap to in update tests
let exerciseId: string;
let otherExerciseId: string;

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
    where: { slug: "integration_test_wde_service_bench" },
    update: {},
    create: { slug: "integration_test_wde_service_bench", name: "Bench Press" },
  });
  exerciseId = exercise.id;

  const otherExercise = await prisma.exercise.upsert({
    where: { slug: "integration_test_wde_service_squat" },
    update: {},
    create: { slug: "integration_test_wde_service_squat", name: "Squat" },
  });
  otherExerciseId = otherExercise.id;
});

afterAll(async () => {
  // Slots cascade with their day, which cascades with its plan.
  await prisma.user.updateMany({
    where: { id: { in: [testUserId, otherUserId] } },
    data: { activePlanId: null },
  });
  await prisma.workoutPlan.deleteMany({ where: { userId: testUserId } });
  await prisma.workoutPlan.deleteMany({ where: { userId: otherUserId } });
  await prisma.exercise.delete({ where: { id: exerciseId } });
  await prisma.exercise.delete({ where: { id: otherExerciseId } });
  await prisma.user.delete({ where: { id: testUserId } });
  await prisma.user.delete({ where: { id: otherUserId } });
});

// Remove both users' plans (and, by cascade, their days + slots) between describes.
async function resetPlans() {
  await prisma.user.updateMany({
    where: { id: { in: [testUserId, otherUserId] } },
    data: { activePlanId: null },
  });
  await prisma.workoutPlan.deleteMany({ where: { userId: testUserId } });
  await prisma.workoutPlan.deleteMany({ where: { userId: otherUserId } });
}

async function createPlan(userId: string, name = "Plan") {
  const plan = await prisma.workoutPlan.create({ data: { userId, name } });
  return plan.id;
}

async function createDay(planId: string, name = "Push", order = 1) {
  const day = await prisma.workoutDay.create({
    data: { workoutPlanId: planId, name, order },
  });
  return day.id;
}

describe("getAllWorkoutDayExercises", () => {
  beforeEach(resetPlans);
  afterAll(resetPlans);

  it("throws NotFoundError when the day does not exist", async () => {
    const planId = await createPlan(testUserId);
    await expect(
      svc.getAllWorkoutDayExercises(planId, crypto.randomUUID(), testUserId),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError when the day belongs to another user", async () => {
    const planId = await createPlan(otherUserId, "Theirs");
    const dayId = await createDay(planId);

    await expect(
      svc.getAllWorkoutDayExercises(planId, dayId, testUserId),
    ).rejects.toThrow(NotFoundError);
  });

  it("returns an empty list when the day has no slots", async () => {
    const planId = await createPlan(testUserId);
    const dayId = await createDay(planId);

    const result = await svc.getAllWorkoutDayExercises(planId, dayId, testUserId);
    expect(result).toStrictEqual({ exercises: [] });
  });

  it("returns slots ordered by `order` ascending (FKs stripped)", async () => {
    const planId = await createPlan(testUserId);
    const dayId = await createDay(planId);
    // Insert out of order to prove the service sorts, not insertion order.
    await prisma.workoutDayExercise.createMany({
      data: [
        { workoutDayId: dayId, exerciseId, order: 3 },
        { workoutDayId: dayId, exerciseId, order: 1 },
        { workoutDayId: dayId, exerciseId, order: 2 },
      ],
    });

    const result = await svc.getAllWorkoutDayExercises(planId, dayId, testUserId);

    expect(result.exercises.map((e) => e.order)).toStrictEqual([1, 2, 3]);
    expect(result.exercises[0]).not.toHaveProperty("workoutDayId");
    expect(result.exercises[0]).not.toHaveProperty("exerciseId");
    expect(result.exercises[0]!.exercise).toStrictEqual({
      id: exerciseId,
      slug: "integration_test_wde_service_bench",
      name: "Bench Press",
    });
  });
});

describe("getWorkoutDayExerciseById", () => {
  let planId: string;
  let dayId: string;
  let slotId: string;

  beforeEach(async () => {
    await resetPlans();
    planId = await createPlan(testUserId, "Detail Plan");
    dayId = await createDay(planId);
    const slot = await prisma.workoutDayExercise.create({
      data: {
        workoutDayId: dayId,
        exerciseId,
        order: 1,
        targetSets: 4,
        targetRepsMin: 8,
        targetRepsMax: 12,
        restSeconds: 90,
      },
    });
    slotId = slot.id;
  });

  afterAll(resetPlans);

  it("returns the slot with the denormalized exercise (FKs stripped)", async () => {
    const result = await svc.getWorkoutDayExerciseById(
      planId,
      dayId,
      slotId,
      testUserId,
    );

    expect(result.id).toBe(slotId);
    expect(result.order).toBe(1);
    expect(result.targetSets).toBe(4);
    expect(result.restSeconds).toBe(90);
    expect(result).not.toHaveProperty("workoutDayId");
    expect(result).not.toHaveProperty("exerciseId");
    expect(result.exercise).toStrictEqual({
      id: exerciseId,
      slug: "integration_test_wde_service_bench",
      name: "Bench Press",
    });
  });

  it("throws NotFoundError for an unknown slot id", async () => {
    await expect(
      svc.getWorkoutDayExerciseById(
        planId,
        dayId,
        crypto.randomUUID(),
        testUserId,
      ),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError when the slot belongs to another user", async () => {
    await expect(
      svc.getWorkoutDayExerciseById(planId, dayId, slotId, otherUserId),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError when the slot is queried under the wrong day", async () => {
    // The slot exists and is owned, but not under this other day.
    const otherDayId = await createDay(planId, "Pull", 2);

    await expect(
      svc.getWorkoutDayExerciseById(planId, otherDayId, slotId, testUserId),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError when the slot is queried under the wrong plan", async () => {
    const otherPlanId = await createPlan(testUserId, "Other Plan");

    await expect(
      svc.getWorkoutDayExerciseById(otherPlanId, dayId, slotId, testUserId),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("createWorkoutDayExercise", () => {
  beforeEach(resetPlans);
  afterAll(resetPlans);

  it("creates the first slot at order 1 (FKs stripped, persisted)", async () => {
    const planId = await createPlan(testUserId);
    const dayId = await createDay(planId);

    const result = await svc.createWorkoutDayExercise(planId, dayId, testUserId, {
      workoutDayId: dayId,
      exerciseId,
      order: -1,
    });

    expect(result.id).toBeDefined();
    expect(result.order).toBe(1);
    expect(result).not.toHaveProperty("workoutDayId");
    expect(result).not.toHaveProperty("exerciseId");
    expect(result.exercise.id).toBe(exerciseId);

    const persisted = await prisma.workoutDayExercise.findUnique({
      where: { id: result.id },
    });
    expect(persisted!.workoutDayId).toBe(dayId);
    expect(persisted!.exerciseId).toBe(exerciseId);
  });

  it("assigns sequential order numbers as slots are added", async () => {
    const planId = await createPlan(testUserId);
    const dayId = await createDay(planId);

    const first = await svc.createWorkoutDayExercise(planId, dayId, testUserId, {
      workoutDayId: dayId,
      exerciseId,
      order: -1,
    });
    const second = await svc.createWorkoutDayExercise(planId, dayId, testUserId, {
      workoutDayId: dayId,
      exerciseId,
      order: -1,
    });
    const third = await svc.createWorkoutDayExercise(planId, dayId, testUserId, {
      workoutDayId: dayId,
      exerciseId,
      order: -1,
    });

    expect([first.order, second.order, third.order]).toStrictEqual([1, 2, 3]);
  });

  it("persists the optional target fields", async () => {
    const planId = await createPlan(testUserId);
    const dayId = await createDay(planId);

    const result = await svc.createWorkoutDayExercise(planId, dayId, testUserId, {
      workoutDayId: dayId,
      exerciseId,
      order: -1,
      targetSets: 5,
      targetRepsMin: 5,
      targetRepsMax: 8,
      restSeconds: 120,
    });

    expect(result.targetSets).toBe(5);
    expect(result.targetRepsMin).toBe(5);
    expect(result.targetRepsMax).toBe(8);
    expect(result.restSeconds).toBe(120);
  });

  it("touches the parent plan's updatedAt", async () => {
    const planId = await createPlan(testUserId);
    const dayId = await createDay(planId);
    const before = await prisma.workoutPlan.findUnique({
      where: { id: planId },
    });
    expect(before!.updatedAt).not.toBeNull();

    await svc.createWorkoutDayExercise(planId, dayId, testUserId, {
      workoutDayId: dayId,
      exerciseId,
      order: -1,
    });

    const after = await prisma.workoutPlan.findUnique({
      where: { id: planId },
    });
    // The no-op plan update inside the transaction re-stamps updatedAt, so it
    // must not move backwards (>= guards the same-millisecond case).
    expect(after!.updatedAt).not.toBeNull();
    expect(after!.updatedAt!.getTime()).toBeGreaterThanOrEqual(
      before!.updatedAt!.getTime(),
    );
  });

  it("throws NotFoundError when the day does not exist", async () => {
    const planId = await createPlan(testUserId);
    const missingDay = crypto.randomUUID();

    await expect(
      svc.createWorkoutDayExercise(planId, missingDay, testUserId, {
        workoutDayId: missingDay,
        exerciseId,
        order: -1,
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError when the day belongs to another user", async () => {
    const planId = await createPlan(otherUserId, "Theirs");
    const dayId = await createDay(planId);

    await expect(
      svc.createWorkoutDayExercise(planId, dayId, testUserId, {
        workoutDayId: dayId,
        exerciseId,
        order: -1,
      }),
    ).rejects.toThrow(NotFoundError);

    const slots = await prisma.workoutDayExercise.findMany({
      where: { workoutDayId: dayId },
    });
    expect(slots).toHaveLength(0);
  });

  it("throws NotFoundError when the referenced exercise does not exist", async () => {
    const planId = await createPlan(testUserId);
    const dayId = await createDay(planId);

    await expect(
      svc.createWorkoutDayExercise(planId, dayId, testUserId, {
        workoutDayId: dayId,
        exerciseId: crypto.randomUUID(),
        order: -1,
      }),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("updateWorkoutDayExercise", () => {
  let planId: string;
  let dayId: string;
  let slotId: string;

  beforeEach(async () => {
    await resetPlans();
    planId = await createPlan(testUserId);
    dayId = await createDay(planId);
    const slot = await prisma.workoutDayExercise.create({
      data: { workoutDayId: dayId, exerciseId, order: 1, targetSets: 3 },
    });
    slotId = slot.id;
  });

  afterAll(resetPlans);

  it("updates fields and returns the DTO", async () => {
    const result = await svc.updateWorkoutDayExercise(
      planId,
      dayId,
      testUserId,
      slotId,
      { targetSets: 5, restSeconds: 60 },
    );

    expect(result.targetSets).toBe(5);
    expect(result.restSeconds).toBe(60);
    expect(result).not.toHaveProperty("workoutDayId");
    expect(result).not.toHaveProperty("exerciseId");
  });

  it("swaps the referenced exercise when exerciseId changes", async () => {
    const result = await svc.updateWorkoutDayExercise(
      planId,
      dayId,
      testUserId,
      slotId,
      { exerciseId: otherExerciseId },
    );

    expect(result.exercise.id).toBe(otherExerciseId);
    expect(result.exercise.slug).toBe("integration_test_wde_service_squat");
  });

  it("maps a bad exercise FK (P2003) to NotFoundError", async () => {
    await expect(
      svc.updateWorkoutDayExercise(planId, dayId, testUserId, slotId, {
        exerciseId: crypto.randomUUID(),
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError for an unknown slot id", async () => {
    await expect(
      svc.updateWorkoutDayExercise(
        planId,
        dayId,
        testUserId,
        crypto.randomUUID(),
        { targetSets: 5 },
      ),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError when the slot belongs to another user", async () => {
    await expect(
      svc.updateWorkoutDayExercise(planId, dayId, otherUserId, slotId, {
        targetSets: 9,
      }),
    ).rejects.toThrow(NotFoundError);

    const unchanged = await prisma.workoutDayExercise.findUnique({
      where: { id: slotId },
    });
    expect(unchanged!.targetSets).toBe(3);
  });

  it("throws NotFoundError when the slot is updated under the wrong day", async () => {
    const otherDayId = await createDay(planId, "Pull", 2);

    await expect(
      svc.updateWorkoutDayExercise(planId, otherDayId, testUserId, slotId, {
        targetSets: 9,
      }),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("deleteWorkoutDayExercise", () => {
  let planId: string;
  let dayId: string;
  let slotId: string;

  beforeEach(async () => {
    await resetPlans();
    planId = await createPlan(testUserId);
    dayId = await createDay(planId);
    const slot = await prisma.workoutDayExercise.create({
      data: { workoutDayId: dayId, exerciseId, order: 1 },
    });
    slotId = slot.id;
  });

  afterAll(resetPlans);

  it("deletes the slot and resolves undefined", async () => {
    const result = await svc.deleteWorkoutDayExercise(
      planId,
      dayId,
      testUserId,
      slotId,
    );
    expect(result).toBeUndefined();

    const gone = await prisma.workoutDayExercise.findUnique({
      where: { id: slotId },
    });
    expect(gone).toBeNull();
  });

  it("throws NotFoundError for an unknown slot id", async () => {
    await expect(
      svc.deleteWorkoutDayExercise(
        planId,
        dayId,
        testUserId,
        crypto.randomUUID(),
      ),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError when the slot belongs to another user", async () => {
    await expect(
      svc.deleteWorkoutDayExercise(planId, dayId, otherUserId, slotId),
    ).rejects.toThrow(NotFoundError);

    const stillThere = await prisma.workoutDayExercise.findUnique({
      where: { id: slotId },
    });
    expect(stillThere).not.toBeNull();
  });

  it("throws NotFoundError when the slot is deleted under the wrong day", async () => {
    const otherDayId = await createDay(planId, "Pull", 2);

    await expect(
      svc.deleteWorkoutDayExercise(planId, otherDayId, testUserId, slotId),
    ).rejects.toThrow(NotFoundError);

    const stillThere = await prisma.workoutDayExercise.findUnique({
      where: { id: slotId },
    });
    expect(stillThere).not.toBeNull();
  });
});
