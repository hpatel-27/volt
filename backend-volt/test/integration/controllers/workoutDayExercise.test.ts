// Integration tests: workout day exercise controller via the real Express app + DB.
// Clerk auth is stubbed so requests resolve to a known test user.
// This call is hoisted so the module is mocked before the import.
vi.mock("@clerk/express", async () => {
  const { makeClerkMock } = await import("../../helpers/clerkMock.js");
  return makeClerkMock("integration_test_wde_controller_user");
});

import { it, describe, vi, beforeAll, afterAll, beforeEach, expect } from "vitest";
import { prisma } from "../../../src/db.js";
import request from "supertest";
import { createApp } from "../../../src/app.js";

const app = createApp({ skipRateLimit: true });

const TEST_CLERK_ID = "integration_test_wde_controller_user";
let testUserId: string;

const OTHER_CLERK_ID = "integration_test_wde_controller_other";
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
    where: { slug: "integration_test_wde_ctrl_bench" },
    update: {},
    create: { slug: "integration_test_wde_ctrl_bench", name: "Bench Press" },
  });
  exerciseId = exercise.id;
});

afterAll(async () => {
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

async function createSlot(dayId: string, order = 1, data = {}) {
  const slot = await prisma.workoutDayExercise.create({
    data: { workoutDayId: dayId, exerciseId, order, ...data },
  });
  return slot.id;
}

// Base path builder for the deeply nested route.
const base = (planId: string, dayId: string) =>
  `/api/v1/workout-plans/${planId}/days/${dayId}/exercises`;

const UUID = crypto.randomUUID();

describe("GET /workout-plans/:planId/days/:dayId/exercises", () => {
  beforeEach(resetPlans);
  afterAll(resetPlans);

  it("returns 400 when planId is not a UUID", async () => {
    await request(app)
      .get(`/api/v1/workout-plans/not-a-uuid/days/${UUID}/exercises`)
      .expect(400)
      .expect({ error: "Invalid planId" });
  });

  it("returns 400 when dayId is not a UUID", async () => {
    const planId = await createPlan(testUserId);
    await request(app)
      .get(`/api/v1/workout-plans/${planId}/days/not-a-uuid/exercises`)
      .expect(400)
      .expect({ error: "Invalid dayId" });
  });

  it("returns 404 when the day does not exist", async () => {
    const planId = await createPlan(testUserId);
    await request(app)
      .get(base(planId, UUID))
      .expect(404)
      .expect((res) => {
        expect(res.body.error).toBe("Workout day not found.");
      });
  });

  it("returns 404 when the day belongs to another user", async () => {
    const planId = await createPlan(otherUserId, "Theirs");
    const dayId = await createDay(planId);
    await request(app)
      .get(base(planId, dayId))
      .expect(404)
      .expect((res) => {
        expect(res.body.error).toBe("Workout day not found.");
      });
  });

  it("returns 200 with an empty list when the day has no slots", async () => {
    const planId = await createPlan(testUserId);
    const dayId = await createDay(planId);
    await request(app)
      .get(base(planId, dayId))
      .expect("Content-Type", /json/)
      .expect(200)
      .expect({ exercises: [] });
  });

  it("returns 200 with slots ordered by `order` (no FKs)", async () => {
    const planId = await createPlan(testUserId);
    const dayId = await createDay(planId);
    await prisma.workoutDayExercise.createMany({
      data: [
        { workoutDayId: dayId, exerciseId, order: 3 },
        { workoutDayId: dayId, exerciseId, order: 1 },
        { workoutDayId: dayId, exerciseId, order: 2 },
      ],
    });

    await request(app)
      .get(base(planId, dayId))
      .expect(200)
      .expect((res) => {
        expect(res.body.exercises.map((e: any) => e.order)).toStrictEqual([
          1, 2, 3,
        ]);
        expect(res.body.exercises[0]).not.toHaveProperty("workoutDayId");
        expect(res.body.exercises[0]).not.toHaveProperty("exerciseId");
      });
  });
});

describe("GET /workout-plans/:planId/days/:dayId/exercises/:dayExerciseId", () => {
  beforeEach(resetPlans);
  afterAll(resetPlans);

  it("returns 400 when dayExerciseId is not a UUID", async () => {
    const planId = await createPlan(testUserId);
    const dayId = await createDay(planId);
    await request(app)
      .get(`${base(planId, dayId)}/not-a-uuid`)
      .expect(400)
      .expect({ error: "Invalid dayExerciseId" });
  });

  it("returns 404 for an unknown slot id", async () => {
    const planId = await createPlan(testUserId);
    const dayId = await createDay(planId);
    await request(app)
      .get(`${base(planId, dayId)}/${UUID}`)
      .expect(404)
      .expect((res) => {
        expect(res.body.error).toBe(
          `Workout day exercise with id: ${UUID} not found.`,
        );
      });
  });

  it("returns 404 when the slot belongs to another user's plan", async () => {
    const planId = await createPlan(otherUserId, "Theirs");
    const dayId = await createDay(planId);
    const slotId = await createSlot(dayId);
    await request(app)
      .get(`${base(planId, dayId)}/${slotId}`)
      .expect(404);
  });

  it("returns 200 with the slot's denormalized exercise (no FKs)", async () => {
    const planId = await createPlan(testUserId);
    const dayId = await createDay(planId);
    const slotId = await createSlot(dayId, 1, {
      targetSets: 4,
      targetRepsMin: 8,
      targetRepsMax: 12,
      restSeconds: 90,
    });

    await request(app)
      .get(`${base(planId, dayId)}/${slotId}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.id).toBe(slotId);
        expect(res.body.targetSets).toBe(4);
        expect(res.body).not.toHaveProperty("workoutDayId");
        expect(res.body).not.toHaveProperty("exerciseId");
        expect(res.body.exercise).toStrictEqual({
          id: exerciseId,
          slug: "integration_test_wde_ctrl_bench",
          name: "Bench Press",
        });
      });
  });
});

describe("POST /workout-plans/:planId/days/:dayId/exercises", () => {
  beforeEach(resetPlans);
  afterAll(resetPlans);

  it("returns 400 when planId is not a UUID", async () => {
    await request(app)
      .post(`/api/v1/workout-plans/not-a-uuid/days/${UUID}/exercises`)
      .set("Content-Type", "application/json")
      .send({ exerciseId })
      .expect(400)
      .expect({ error: "Invalid planId" });
  });

  it("returns 400 when exerciseId is missing", async () => {
    const planId = await createPlan(testUserId);
    const dayId = await createDay(planId);
    await request(app)
      .post(base(planId, dayId))
      .set("Content-Type", "application/json")
      .send({})
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toContain("xercise");
      });
  });

  it("returns 400 when a numeric field is not a positive integer", async () => {
    const planId = await createPlan(testUserId);
    const dayId = await createDay(planId);
    await request(app)
      .post(base(planId, dayId))
      .set("Content-Type", "application/json")
      .send({ exerciseId, targetSets: 0 })
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toContain("TargetSets");
      });
  });

  it("returns 404 when the day does not exist", async () => {
    const planId = await createPlan(testUserId);
    await request(app)
      .post(base(planId, UUID))
      .set("Content-Type", "application/json")
      .send({ exerciseId })
      .expect(404)
      .expect((res) => {
        expect(res.body.error).toBe("Workout day not found.");
      });
  });

  it("returns 404 when the referenced exercise does not exist", async () => {
    const planId = await createPlan(testUserId);
    const dayId = await createDay(planId);
    await request(app)
      .post(base(planId, dayId))
      .set("Content-Type", "application/json")
      .send({ exerciseId: crypto.randomUUID() })
      .expect(404)
      .expect((res) => {
        expect(res.body.error).toBe("Exercise not found.");
      });
  });

  it("returns 201 with the created slot at order 1 (no FKs)", async () => {
    const planId = await createPlan(testUserId);
    const dayId = await createDay(planId);
    await request(app)
      .post(base(planId, dayId))
      .set("Content-Type", "application/json")
      .send({ exerciseId, targetSets: 4 })
      .expect(201)
      .expect((res) => {
        expect(res.body.id).toBeDefined();
        expect(res.body.order).toBe(1);
        expect(res.body.targetSets).toBe(4);
        expect(res.body).not.toHaveProperty("workoutDayId");
        expect(res.body).not.toHaveProperty("exerciseId");
        expect(res.body.exercise.id).toBe(exerciseId);
      });

    const slots = await prisma.workoutDayExercise.findMany({
      where: { workoutDayId: dayId },
    });
    expect(slots).toHaveLength(1);
  });
});

describe("PATCH /workout-plans/:planId/days/:dayId/exercises/:dayExerciseId", () => {
  beforeEach(resetPlans);
  afterAll(resetPlans);

  it("returns 400 when dayExerciseId is not a UUID", async () => {
    const planId = await createPlan(testUserId);
    const dayId = await createDay(planId);
    await request(app)
      .patch(`${base(planId, dayId)}/not-a-uuid`)
      .set("Content-Type", "application/json")
      .send({ targetSets: 5 })
      .expect(400)
      .expect({ error: "Invalid dayExerciseId" });
  });

  it("returns 400 when no updatable fields are provided", async () => {
    const planId = await createPlan(testUserId);
    const dayId = await createDay(planId);
    const slotId = await createSlot(dayId);
    await request(app)
      .patch(`${base(planId, dayId)}/${slotId}`)
      .set("Content-Type", "application/json")
      .send({})
      .expect(400)
      .expect({ error: "No valid fields were provided to update." });
  });

  it("returns 400 when exerciseId is provided but empty", async () => {
    const planId = await createPlan(testUserId);
    const dayId = await createDay(planId);
    const slotId = await createSlot(dayId);
    await request(app)
      .patch(`${base(planId, dayId)}/${slotId}`)
      .set("Content-Type", "application/json")
      .send({ exerciseId: "   " })
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toContain("xercise");
      });
  });

  it("returns 404 when the slot does not exist", async () => {
    const planId = await createPlan(testUserId);
    const dayId = await createDay(planId);
    await request(app)
      .patch(`${base(planId, dayId)}/${UUID}`)
      .set("Content-Type", "application/json")
      .send({ targetSets: 5 })
      .expect(404)
      .expect((res) => {
        expect(res.body.error).toBe("Workout day exercise not found.");
      });
  });

  it("returns 404 when the slot belongs to another user's plan", async () => {
    const planId = await createPlan(otherUserId, "Theirs");
    const dayId = await createDay(planId);
    const slotId = await createSlot(dayId, 1, { targetSets: 3 });
    await request(app)
      .patch(`${base(planId, dayId)}/${slotId}`)
      .set("Content-Type", "application/json")
      .send({ targetSets: 9 })
      .expect(404);

    const unchanged = await prisma.workoutDayExercise.findUnique({
      where: { id: slotId },
    });
    expect(unchanged!.targetSets).toBe(3);
  });

  it("returns 200 with the updated slot", async () => {
    const planId = await createPlan(testUserId);
    const dayId = await createDay(planId);
    const slotId = await createSlot(dayId, 1, { targetSets: 3 });
    await request(app)
      .patch(`${base(planId, dayId)}/${slotId}`)
      .set("Content-Type", "application/json")
      .send({ targetSets: 5, restSeconds: 60 })
      .expect(200)
      .expect((res) => {
        expect(res.body.targetSets).toBe(5);
        expect(res.body.restSeconds).toBe(60);
        expect(res.body).not.toHaveProperty("workoutDayId");
      });
  });
});

describe("DELETE /workout-plans/:planId/days/:dayId/exercises/:dayExerciseId", () => {
  beforeEach(resetPlans);
  afterAll(resetPlans);

  it("returns 400 when dayExerciseId is not a UUID", async () => {
    const planId = await createPlan(testUserId);
    const dayId = await createDay(planId);
    await request(app)
      .delete(`${base(planId, dayId)}/not-a-uuid`)
      .expect(400)
      .expect({ error: "Invalid dayExerciseId" });
  });

  it("returns 404 when the slot does not exist", async () => {
    const planId = await createPlan(testUserId);
    const dayId = await createDay(planId);
    await request(app)
      .delete(`${base(planId, dayId)}/${UUID}`)
      .expect(404)
      .expect((res) => {
        expect(res.body.error).toBe("Workout day exercise not found.");
      });
  });

  it("returns 404 when the slot belongs to another user's plan", async () => {
    const planId = await createPlan(otherUserId, "Theirs");
    const dayId = await createDay(planId);
    const slotId = await createSlot(dayId);
    await request(app)
      .delete(`${base(planId, dayId)}/${slotId}`)
      .expect(404);

    const stillThere = await prisma.workoutDayExercise.findUnique({
      where: { id: slotId },
    });
    expect(stillThere).not.toBeNull();
  });

  it("returns 204 and removes the slot", async () => {
    const planId = await createPlan(testUserId);
    const dayId = await createDay(planId);
    const slotId = await createSlot(dayId);

    await request(app)
      .delete(`${base(planId, dayId)}/${slotId}`)
      .expect(204);

    const gone = await prisma.workoutDayExercise.findUnique({
      where: { id: slotId },
    });
    expect(gone).toBeNull();
  });
});
