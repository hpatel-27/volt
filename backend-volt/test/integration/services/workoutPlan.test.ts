// Integration tests: workout plan service against a real database.
// No mocks — prisma queries run against the test DB (TEST_DATABASE_URL).

import { expect, describe, it, beforeAll, afterAll, beforeEach } from "vitest";
import { prisma } from "../../../src/db.js";
import * as workoutPlanService from "../../../src/services/workoutPlan.service.js";
import { BadRequestError, NotFoundError } from "../../../src/errors.js";

// Unique clerkId so this test user doesn't collide with real users or other suites
const TEST_CLERK_ID = "integration_test_workoutPlan_service_user";
let testUserId: string;

// A second user used to prove cross-user isolation (one user can't touch another's plans)
const OTHER_CLERK_ID = "integration_test_workoutPlan_service_other";
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
    where: { slug: "integration_test_workoutPlan_bench" },
    update: {},
    create: { slug: "integration_test_workoutPlan_bench", name: "Bench Press" },
  });
  exerciseId = exercise.id;
});

afterAll(async () => {
  // Days + day-exercises cascade with their plan, so deleting plans is enough.
  // Clear activePlanId first (plain string column, no FK) for tidiness.
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

// Reset both users' plans + active pointer between describes to keep state isolated.
async function resetPlans() {
  await prisma.user.updateMany({
    where: { id: { in: [testUserId, otherUserId] } },
    data: { activePlanId: null },
  });
  await prisma.workoutPlan.deleteMany({ where: { userId: testUserId } });
  await prisma.workoutPlan.deleteMany({ where: { userId: otherUserId } });
}

// Force a plan's updatedAt, bypassing Prisma's @updatedAt, so order-by tests
// don't depend on millisecond-precise wall-clock timestamps.
async function setUpdatedAt(planId: string, when: Date) {
  await prisma.$executeRaw`UPDATE workout_plans SET "updatedAt" = ${when} WHERE id = ${planId}`;
}

describe("getAllWorkoutPlans", () => {
  beforeEach(resetPlans);
  afterAll(resetPlans);

  it("throws NotFoundError when the user does not exist", async () => {
    await expect(
      workoutPlanService.getAllWorkoutPlans(crypto.randomUUID(), 1, 10),
    ).rejects.toThrow(NotFoundError);
  });

  it("returns an empty page when the user has no plans", async () => {
    const result = await workoutPlanService.getAllWorkoutPlans(testUserId, 1, 10);
    expect(result).toStrictEqual({
      workoutPlans: [],
      total: 0,
      page: 1,
      limit: 10,
    });
  });

  it("excludes the active plan and reports daysPerWeek", async () => {
    const active = await prisma.workoutPlan.create({
      data: { userId: testUserId, name: "Active Plan" },
    });
    const listed = await prisma.workoutPlan.create({
      data: { userId: testUserId, name: "Listed Plan", type: "STRENGTH" },
    });
    // Give the listed plan two days so daysPerWeek should be 2
    await prisma.workoutDay.createMany({
      data: [
        { workoutPlanId: listed.id, name: "Push", order: 0 },
        { workoutPlanId: listed.id, name: "Pull", order: 1 },
      ],
    });
    await prisma.user.update({
      where: { id: testUserId },
      data: { activePlanId: active.id },
    });

    const result = await workoutPlanService.getAllWorkoutPlans(testUserId, 1, 10);

    expect(result.total).toBe(1);
    expect(result.workoutPlans).toHaveLength(1);
    const dto = result.workoutPlans[0]!;
    expect(dto.id).toBe(listed.id);
    expect(dto.name).toBe("Listed Plan");
    expect(dto.type).toBe("STRENGTH");
    expect(dto.daysPerWeek).toBe(2);
    expect(dto.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(dto).not.toHaveProperty("userId");
  });

  it("orders by updatedAt descending (most recently touched first)", async () => {
    const planA = await prisma.workoutPlan.create({
      data: { userId: testUserId, name: "Plan A" },
    });
    const planB = await prisma.workoutPlan.create({
      data: { userId: testUserId, name: "Plan B" },
    });
    // Pin updatedAt explicitly via raw SQL so the ordering can't tie on the
    // millisecond-precision timestamps Prisma's @updatedAt would otherwise set.
    await setUpdatedAt(planA.id, new Date("2026-02-01T00:00:00.000Z"));
    await setUpdatedAt(planB.id, new Date("2026-01-01T00:00:00.000Z"));

    const result = await workoutPlanService.getAllWorkoutPlans(testUserId, 1, 10);

    // A has the later updatedAt, so it sorts first
    expect(result.workoutPlans.map((p) => p.name)).toStrictEqual([
      "Plan A",
      "Plan B",
    ]);
  });

  it("paginates — page 2 with limit 1 returns the second-ranked plan", async () => {
    const planA = await prisma.workoutPlan.create({
      data: { userId: testUserId, name: "Plan A" },
    });
    const planB = await prisma.workoutPlan.create({
      data: { userId: testUserId, name: "Plan B" },
    });
    // Deterministic order: A newer than B, so page 1 = A, page 2 = B
    await setUpdatedAt(planA.id, new Date("2026-02-01T00:00:00.000Z"));
    await setUpdatedAt(planB.id, new Date("2026-01-01T00:00:00.000Z"));

    const page1 = await workoutPlanService.getAllWorkoutPlans(testUserId, 1, 1);
    const page2 = await workoutPlanService.getAllWorkoutPlans(testUserId, 2, 1);

    expect(page1.workoutPlans).toHaveLength(1);
    expect(page2.workoutPlans).toHaveLength(1);
    expect(page2.page).toBe(2);
    expect(page2.limit).toBe(1);
    expect(page1.workoutPlans[0]!.name).toBe("Plan A");
    expect(page2.workoutPlans[0]!.name).toBe("Plan B");
  });

  it("does not include another user's plans", async () => {
    await prisma.workoutPlan.create({
      data: { userId: testUserId, name: "Mine" },
    });
    await prisma.workoutPlan.create({
      data: { userId: otherUserId, name: "Theirs" },
    });

    const result = await workoutPlanService.getAllWorkoutPlans(testUserId, 1, 10);
    expect(result.total).toBe(1);
    expect(result.workoutPlans[0]!.name).toBe("Mine");
  });
});

describe("getActiveWorkoutPlan", () => {
  beforeEach(resetPlans);
  afterAll(resetPlans);

  it("returns null when the user has no active plan", async () => {
    const result = await workoutPlanService.getActiveWorkoutPlan(testUserId);
    expect(result).toBeNull();
  });

  it("returns the active plan summary with daysPerWeek", async () => {
    const plan = await prisma.workoutPlan.create({
      data: { userId: testUserId, name: "Active", type: "HYPERTROPHY" },
    });
    await prisma.workoutDay.create({
      data: { workoutPlanId: plan.id, name: "Full Body", order: 0 },
    });
    await prisma.user.update({
      where: { id: testUserId },
      data: { activePlanId: plan.id },
    });

    const result = await workoutPlanService.getActiveWorkoutPlan(testUserId);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(plan.id);
    expect(result!.type).toBe("HYPERTROPHY");
    expect(result!.daysPerWeek).toBe(1);
    expect(result).not.toHaveProperty("userId");
  });

  it("throws NotFoundError when activePlanId points to a missing plan", async () => {
    // Dangling pointer: activePlanId set but the plan never existed / was removed
    await prisma.user.update({
      where: { id: testUserId },
      data: { activePlanId: crypto.randomUUID() },
    });

    await expect(
      workoutPlanService.getActiveWorkoutPlan(testUserId),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("getWorkoutPlanById", () => {
  let planId: string;

  beforeEach(async () => {
    await resetPlans();
    const plan = await prisma.workoutPlan.create({
      data: { userId: testUserId, name: "Detail Plan", type: "STRENGTH" },
    });
    const day = await prisma.workoutDay.create({
      data: { workoutPlanId: plan.id, name: "Push", order: 0 },
    });
    await prisma.workoutDayExercise.create({
      data: {
        workoutDayId: day.id,
        exerciseId,
        order: 0,
        targetSets: 4,
        targetRepsMin: 8,
        targetRepsMax: 12,
        restSeconds: 90,
      },
    });
    planId = plan.id;
  });

  afterAll(resetPlans);

  it("returns the plan with its days and exercises (no userId)", async () => {
    const result = await workoutPlanService.getWorkoutPlanById(
      testUserId,
      planId,
    );

    expect(result.id).toBe(planId);
    expect(result.type).toBe("STRENGTH");
    expect(result).not.toHaveProperty("userId");
    expect(result.workoutDays).toHaveLength(1);

    const day = result.workoutDays[0]!;
    expect(day.name).toBe("Push");
    expect(day).not.toHaveProperty("workoutPlanId");
    expect(day.exercises).toHaveLength(1);

    const slot = day.exercises[0]!;
    expect(slot.targetSets).toBe(4);
    expect(slot.restSeconds).toBe(90);
    expect(slot).not.toHaveProperty("workoutDayId");
    expect(slot.exercise).toStrictEqual({
      id: exerciseId,
      slug: "integration_test_workoutPlan_bench",
      name: "Bench Press",
    });
  });

  it("throws NotFoundError when the plan belongs to a different user", async () => {
    await expect(
      workoutPlanService.getWorkoutPlanById(otherUserId, planId),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError for an unknown id", async () => {
    await expect(
      workoutPlanService.getWorkoutPlanById(testUserId, crypto.randomUUID()),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("createWorkoutPlan", () => {
  beforeEach(resetPlans);
  afterAll(resetPlans);

  it("creates the first plan and auto-activates it", async () => {
    const result = await workoutPlanService.createWorkoutPlan({
      userId: testUserId,
      name: "First",
      type: "STRENGTH",
    });

    expect(result.id).toBeDefined();
    expect(result.name).toBe("First");
    expect(result.daysPerWeek).toBe(0);
    expect(result).not.toHaveProperty("userId");

    const user = await prisma.user.findUnique({ where: { id: testUserId } });
    expect(user!.activePlanId).toBe(result.id);
  });

  it("does not change the active plan when creating a subsequent plan", async () => {
    const first = await workoutPlanService.createWorkoutPlan({
      userId: testUserId,
      name: "First",
    });
    const second = await workoutPlanService.createWorkoutPlan({
      userId: testUserId,
      name: "Second",
    });

    const user = await prisma.user.findUnique({ where: { id: testUserId } });
    // Still pointing at the first plan, not the newly created one
    expect(user!.activePlanId).toBe(first.id);
    expect(user!.activePlanId).not.toBe(second.id);
  });
});

describe("updateWorkoutPlan", () => {
  beforeEach(resetPlans);
  afterAll(resetPlans);

  it("updates name and type and returns the detail DTO", async () => {
    const plan = await prisma.workoutPlan.create({
      data: { userId: testUserId, name: "Before", type: "STRENGTH" },
    });

    const result = await workoutPlanService.updateWorkoutPlan(
      testUserId,
      plan.id,
      { name: "After", type: "WEIGHT_LOSS" },
    );

    expect(result.name).toBe("After");
    expect(result.type).toBe("WEIGHT_LOSS");
    expect(result.workoutDays).toStrictEqual([]);
    expect(result).not.toHaveProperty("userId");
  });

  it("throws NotFoundError for an unknown id", async () => {
    await expect(
      workoutPlanService.updateWorkoutPlan(testUserId, crypto.randomUUID(), {
        name: "X",
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError when the plan belongs to a different user", async () => {
    const plan = await prisma.workoutPlan.create({
      data: { userId: testUserId, name: "Mine" },
    });

    await expect(
      workoutPlanService.updateWorkoutPlan(otherUserId, plan.id, {
        name: "Hijacked",
      }),
    ).rejects.toThrow(NotFoundError);

    // The owner's record is untouched
    const unchanged = await prisma.workoutPlan.findUnique({
      where: { id: plan.id },
    });
    expect(unchanged!.name).toBe("Mine");
  });
});

describe("deleteWorkoutPlan", () => {
  beforeEach(resetPlans);
  afterAll(resetPlans);

  it("deletes a non-active plan and cascades its days", async () => {
    const plan = await prisma.workoutPlan.create({
      data: { userId: testUserId, name: "Doomed" },
    });
    await prisma.workoutDay.create({
      data: { workoutPlanId: plan.id, name: "Day", order: 0 },
    });

    const result = await workoutPlanService.deleteWorkoutPlan(
      testUserId,
      plan.id,
    );
    expect(result).toBeUndefined();

    const gone = await prisma.workoutPlan.findUnique({ where: { id: plan.id } });
    expect(gone).toBeNull();
    // Cascade removed the child day too
    const days = await prisma.workoutDay.findMany({
      where: { workoutPlanId: plan.id },
    });
    expect(days).toHaveLength(0);
  });

  it("throws BadRequestError when deleting the active plan", async () => {
    const plan = await prisma.workoutPlan.create({
      data: { userId: testUserId, name: "Active" },
    });
    await prisma.user.update({
      where: { id: testUserId },
      data: { activePlanId: plan.id },
    });

    await expect(
      workoutPlanService.deleteWorkoutPlan(testUserId, plan.id),
    ).rejects.toThrow(BadRequestError);

    // The plan must still exist after the rejected delete
    const stillThere = await prisma.workoutPlan.findUnique({
      where: { id: plan.id },
    });
    expect(stillThere).not.toBeNull();
  });

  it("throws NotFoundError for an unknown id", async () => {
    await expect(
      workoutPlanService.deleteWorkoutPlan(testUserId, crypto.randomUUID()),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError when the plan belongs to a different user", async () => {
    const plan = await prisma.workoutPlan.create({
      data: { userId: testUserId, name: "Mine" },
    });

    await expect(
      workoutPlanService.deleteWorkoutPlan(otherUserId, plan.id),
    ).rejects.toThrow(NotFoundError);

    const stillThere = await prisma.workoutPlan.findUnique({
      where: { id: plan.id },
    });
    expect(stillThere).not.toBeNull();
  });
});

describe("activateWorkoutPlan", () => {
  beforeEach(resetPlans);
  afterAll(resetPlans);

  it("sets the user's activePlanId and returns it", async () => {
    const planA = await prisma.workoutPlan.create({
      data: { userId: testUserId, name: "A" },
    });
    const planB = await prisma.workoutPlan.create({
      data: { userId: testUserId, name: "B" },
    });
    await prisma.user.update({
      where: { id: testUserId },
      data: { activePlanId: planA.id },
    });

    const result = await workoutPlanService.activateWorkoutPlan(
      testUserId,
      planB.id,
    );
    expect(result).toStrictEqual({ activePlanId: planB.id });

    const user = await prisma.user.findUnique({ where: { id: testUserId } });
    expect(user!.activePlanId).toBe(planB.id);
  });

  it("throws NotFoundError for an unknown id", async () => {
    await expect(
      workoutPlanService.activateWorkoutPlan(testUserId, crypto.randomUUID()),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError when activating another user's plan", async () => {
    const plan = await prisma.workoutPlan.create({
      data: { userId: testUserId, name: "Mine" },
    });

    await expect(
      workoutPlanService.activateWorkoutPlan(otherUserId, plan.id),
    ).rejects.toThrow(NotFoundError);

    // The other user's active pointer was not set
    const other = await prisma.user.findUnique({ where: { id: otherUserId } });
    expect(other!.activePlanId).toBeNull();
  });
});
