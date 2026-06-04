// Integration tests: workout day service against a real database.
// No mocks — prisma queries run against the test DB (TEST_DATABASE_URL).

import { expect, describe, it, beforeAll, afterAll, beforeEach } from "vitest";
import { prisma } from "../../../src/db.js";
import * as workoutDayService from "../../../src/services/workoutDay.service.js";
import { NotFoundError } from "../../../src/errors.js";

// Unique clerkId so this test user doesn't collide with real users or other suites
const TEST_CLERK_ID = "integration_test_workoutDay_service_user";
let testUserId: string;

// A second user used to prove cross-user isolation (one user can't touch another's days)
const OTHER_CLERK_ID = "integration_test_workoutDay_service_other";
let otherUserId: string;

// A shared exercise so detail tests can attach real workout-day exercise slots
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
    where: { slug: "integration_test_workoutDay_bench" },
    update: {},
    create: { slug: "integration_test_workoutDay_bench", name: "Bench Press" },
  });
  exerciseId = exercise.id;
});

afterAll(async () => {
  // Days + day-exercises cascade with their plan, so deleting plans is enough.
  await prisma.user.updateMany({
    where: { id: { in: [testUserId, otherUserId] } },
    data: { activePlanId: null },
  });
  await prisma.workoutPlan.deleteMany({ where: { userId: testUserId } });
  await prisma.workoutPlan.deleteMany({ where: { userId: otherUserId } });
  await prisma.exercise.delete({ where: { id: exerciseId } });
  await prisma.user.delete({ where: { id: testUserId } });
  await prisma.user.delete({ where: { id: otherUserId } });
});

// Remove both users' plans (and, by cascade, their days) between describes.
async function resetPlans() {
  await prisma.user.updateMany({
    where: { id: { in: [testUserId, otherUserId] } },
    data: { activePlanId: null },
  });
  await prisma.workoutPlan.deleteMany({ where: { userId: testUserId } });
  await prisma.workoutPlan.deleteMany({ where: { userId: otherUserId } });
}

// Create a plan owned by the given user and return its id.
async function createPlan(userId: string, name = "Plan") {
  const plan = await prisma.workoutPlan.create({ data: { userId, name } });
  return plan.id;
}

describe("getAllWorkoutDays", () => {
  beforeEach(resetPlans);
  afterAll(resetPlans);

  it("throws NotFoundError when the plan does not exist", async () => {
    await expect(
      workoutDayService.getAllWorkoutDays(crypto.randomUUID(), testUserId),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError when the plan belongs to another user", async () => {
    const planId = await createPlan(otherUserId, "Theirs");

    await expect(
      workoutDayService.getAllWorkoutDays(planId, testUserId),
    ).rejects.toThrow(NotFoundError);
  });

  it("returns an empty list when the plan has no days", async () => {
    const planId = await createPlan(testUserId);

    const result = await workoutDayService.getAllWorkoutDays(planId, testUserId);
    expect(result).toStrictEqual({ workoutDays: [] });
  });

  it("returns days ordered by `order` ascending (workoutPlanId stripped)", async () => {
    const planId = await createPlan(testUserId);
    // Insert out of order to prove the service sorts, not the insertion order.
    await prisma.workoutDay.createMany({
      data: [
        { workoutPlanId: planId, name: "Legs", order: 3 },
        { workoutPlanId: planId, name: "Push", order: 1 },
        { workoutPlanId: planId, name: "Pull", order: 2 },
      ],
    });

    const result = await workoutDayService.getAllWorkoutDays(planId, testUserId);

    expect(result.workoutDays.map((d) => d.name)).toStrictEqual([
      "Push",
      "Pull",
      "Legs",
    ]);
    expect(result.workoutDays[0]).not.toHaveProperty("workoutPlanId");
  });
});

describe("getWorkoutDayById", () => {
  let planId: string;
  let dayId: string;

  beforeEach(async () => {
    await resetPlans();
    planId = await createPlan(testUserId, "Detail Plan");
    const day = await prisma.workoutDay.create({
      data: { workoutPlanId: planId, name: "Push", order: 1 },
    });
    dayId = day.id;
    await prisma.workoutDayExercise.create({
      data: {
        workoutDayId: dayId,
        exerciseId,
        order: 0,
        targetSets: 4,
        targetRepsMin: 8,
        targetRepsMax: 12,
        restSeconds: 90,
      },
    });
  });

  afterAll(resetPlans);

  it("returns the day with its exercises (FKs stripped, exercise denormalized)", async () => {
    const result = await workoutDayService.getWorkoutDayById(
      planId,
      testUserId,
      dayId,
    );

    expect(result.id).toBe(dayId);
    expect(result.name).toBe("Push");
    expect(result.order).toBe(1);
    expect(result).not.toHaveProperty("workoutPlanId");
    expect(result.exercises).toHaveLength(1);

    const slot = result.exercises[0]!;
    expect(slot.targetSets).toBe(4);
    expect(slot.restSeconds).toBe(90);
    expect(slot).not.toHaveProperty("workoutDayId");
    expect(slot).not.toHaveProperty("exerciseId");
    expect(slot.exercise).toStrictEqual({
      id: exerciseId,
      slug: "integration_test_workoutDay_bench",
      name: "Bench Press",
    });
  });

  it("throws NotFoundError for an unknown day id", async () => {
    await expect(
      workoutDayService.getWorkoutDayById(
        planId,
        testUserId,
        crypto.randomUUID(),
      ),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError when the day belongs to another user's plan", async () => {
    await expect(
      workoutDayService.getWorkoutDayById(planId, otherUserId, dayId),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError when the day is queried under the wrong plan", async () => {
    // The day exists and is owned by the user, but not under this other plan.
    const otherPlanId = await createPlan(testUserId, "Other Plan");

    await expect(
      workoutDayService.getWorkoutDayById(otherPlanId, testUserId, dayId),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("createWorkoutDay", () => {
  beforeEach(resetPlans);
  afterAll(resetPlans);

  it("creates the first day at order 1 (workoutPlanId stripped)", async () => {
    const planId = await createPlan(testUserId);

    const result = await workoutDayService.createWorkoutDay(
      planId,
      testUserId,
      { workoutPlanId: planId, name: "Push", order: -1 },
    );

    expect(result.id).toBeDefined();
    expect(result.name).toBe("Push");
    expect(result.order).toBe(1);
    expect(result).not.toHaveProperty("workoutPlanId");

    const persisted = await prisma.workoutDay.findUnique({
      where: { id: result.id },
    });
    expect(persisted!.workoutPlanId).toBe(planId);
  });

  it("assigns sequential order numbers as days are added", async () => {
    const planId = await createPlan(testUserId);

    const first = await workoutDayService.createWorkoutDay(planId, testUserId, {
      workoutPlanId: planId,
      name: "Push",
      order: -1,
    });
    const second = await workoutDayService.createWorkoutDay(planId, testUserId, {
      workoutPlanId: planId,
      name: "Pull",
      order: -1,
    });
    const third = await workoutDayService.createWorkoutDay(planId, testUserId, {
      workoutPlanId: planId,
      name: "Legs",
      order: -1,
    });

    expect([first.order, second.order, third.order]).toStrictEqual([1, 2, 3]);
  });

  it("touches the parent plan's updatedAt", async () => {
    const planId = await createPlan(testUserId);
    const before = await prisma.workoutPlan.findUnique({
      where: { id: planId },
    });
    expect(before!.updatedAt).not.toBeNull();

    await workoutDayService.createWorkoutDay(planId, testUserId, {
      workoutPlanId: planId,
      name: "Push",
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

  it("throws NotFoundError when the plan does not exist", async () => {
    const missing = crypto.randomUUID();
    await expect(
      workoutDayService.createWorkoutDay(missing, testUserId, {
        workoutPlanId: missing,
        name: "Push",
        order: -1,
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError when the plan belongs to another user", async () => {
    const planId = await createPlan(otherUserId, "Theirs");

    await expect(
      workoutDayService.createWorkoutDay(planId, testUserId, {
        workoutPlanId: planId,
        name: "Hijacked",
        order: -1,
      }),
    ).rejects.toThrow(NotFoundError);

    const days = await prisma.workoutDay.findMany({
      where: { workoutPlanId: planId },
    });
    expect(days).toHaveLength(0);
  });
});

describe("updateWorkoutDay", () => {
  let planId: string;
  let dayId: string;

  beforeEach(async () => {
    await resetPlans();
    planId = await createPlan(testUserId);
    const day = await prisma.workoutDay.create({
      data: { workoutPlanId: planId, name: "Before", order: 1 },
    });
    dayId = day.id;
  });

  afterAll(resetPlans);

  it("updates the name and returns the detail DTO", async () => {
    const result = await workoutDayService.updateWorkoutDay(
      planId,
      testUserId,
      dayId,
      { name: "After" },
    );

    expect(result.name).toBe("After");
    expect(result.order).toBe(1);
    expect(result.exercises).toStrictEqual([]);
    expect(result).not.toHaveProperty("workoutPlanId");
  });

  it("throws NotFoundError for an unknown day id", async () => {
    await expect(
      workoutDayService.updateWorkoutDay(
        planId,
        testUserId,
        crypto.randomUUID(),
        { name: "X" },
      ),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError when the day belongs to another user", async () => {
    await expect(
      workoutDayService.updateWorkoutDay(planId, otherUserId, dayId, {
        name: "Hijacked",
      }),
    ).rejects.toThrow(NotFoundError);

    const unchanged = await prisma.workoutDay.findUnique({
      where: { id: dayId },
    });
    expect(unchanged!.name).toBe("Before");
  });

  it("throws NotFoundError when the day is updated under the wrong plan", async () => {
    const otherPlanId = await createPlan(testUserId, "Other Plan");

    await expect(
      workoutDayService.updateWorkoutDay(otherPlanId, testUserId, dayId, {
        name: "Mismatch",
      }),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("deleteWorkoutDay", () => {
  let planId: string;
  let dayId: string;

  beforeEach(async () => {
    await resetPlans();
    planId = await createPlan(testUserId);
    const day = await prisma.workoutDay.create({
      data: { workoutPlanId: planId, name: "Doomed", order: 1 },
    });
    dayId = day.id;
  });

  afterAll(resetPlans);

  it("deletes the day and cascades its exercise slots", async () => {
    await prisma.workoutDayExercise.create({
      data: { workoutDayId: dayId, exerciseId, order: 0 },
    });

    const result = await workoutDayService.deleteWorkoutDay(
      planId,
      testUserId,
      dayId,
    );
    expect(result).toBeUndefined();

    const gone = await prisma.workoutDay.findUnique({ where: { id: dayId } });
    expect(gone).toBeNull();
    // Cascade removed the child exercise slot too
    const slots = await prisma.workoutDayExercise.findMany({
      where: { workoutDayId: dayId },
    });
    expect(slots).toHaveLength(0);
  });

  it("throws NotFoundError for an unknown day id", async () => {
    await expect(
      workoutDayService.deleteWorkoutDay(
        planId,
        testUserId,
        crypto.randomUUID(),
      ),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError when the day belongs to another user", async () => {
    await expect(
      workoutDayService.deleteWorkoutDay(planId, otherUserId, dayId),
    ).rejects.toThrow(NotFoundError);

    const stillThere = await prisma.workoutDay.findUnique({
      where: { id: dayId },
    });
    expect(stillThere).not.toBeNull();
  });

  it("throws NotFoundError when the day is deleted under the wrong plan", async () => {
    const otherPlanId = await createPlan(testUserId, "Other Plan");

    await expect(
      workoutDayService.deleteWorkoutDay(otherPlanId, testUserId, dayId),
    ).rejects.toThrow(NotFoundError);

    const stillThere = await prisma.workoutDay.findUnique({
      where: { id: dayId },
    });
    expect(stillThere).not.toBeNull();
  });
});
