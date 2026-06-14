// Integration tests: workout day controller via the real Express app + DB.
// Clerk auth is stubbed so requests resolve to a known test user.
// This call is hoisted so the module is mocked before the import.
vi.mock("@clerk/express", async () => {
  const { makeClerkMock } = await import("../../helpers/clerkMock.js");
  return makeClerkMock("integration_test_workoutDay_controller_user");
});

import { it, describe, vi, beforeAll, afterAll, beforeEach, expect } from "vitest";
import { prisma } from "../../../src/db.js";
import request from "supertest";
import { createApp } from "../../../src/app.js";

const app = createApp({ skipRateLimit: true });

// Unique clerkId so this test user doesn't collide with other suites running in parallel
const TEST_CLERK_ID = "integration_test_workoutDay_controller_user";
let testUserId: string;

// A second user (no auth) used to prove ownership boundaries return 404
const OTHER_CLERK_ID = "integration_test_workoutDay_controller_other";
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
    where: { slug: "integration_test_workoutDay_ctrl_bench" },
    update: {},
    create: {
      slug: "integration_test_workoutDay_ctrl_bench",
      name: "Bench Press",
    },
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

const UUID = crypto.randomUUID();

describe("GET /api/v1/workout-plans/:planId/days", () => {
  beforeEach(resetPlans);
  afterAll(resetPlans);

  it("returns 400 when planId is not a UUID", async () => {
    await request(app)
      .get("/api/v1/workout-plans/not-a-uuid/days")
      .expect(400)
      .expect({ error: "Invalid planId" });
  });

  it("returns 404 when the plan does not exist", async () => {
    await request(app)
      .get(`/api/v1/workout-plans/${UUID}/days`)
      .expect(404)
      .expect((res) => {
        expect(res.body.error).toBe("Workout plan not found.");
      });
  });

  it("returns 404 when the plan belongs to another user", async () => {
    const planId = await createPlan(otherUserId, "Theirs");
    await request(app)
      .get(`/api/v1/workout-plans/${planId}/days`)
      .expect(404)
      .expect((res) => {
        expect(res.body.error).toBe("Workout plan not found.");
      });
  });

  it("returns 200 with an empty list when the plan has no days", async () => {
    const planId = await createPlan(testUserId);
    await request(app)
      .get(`/api/v1/workout-plans/${planId}/days`)
      .expect("Content-Type", /json/)
      .expect(200)
      .expect({ workoutDays: [] });
  });

  it("returns 200 with days ordered by `order` (no workoutPlanId)", async () => {
    const planId = await createPlan(testUserId);
    await prisma.workoutDay.createMany({
      data: [
        { workoutPlanId: planId, name: "Legs", order: 3 },
        { workoutPlanId: planId, name: "Push", order: 1 },
        { workoutPlanId: planId, name: "Pull", order: 2 },
      ],
    });

    await request(app)
      .get(`/api/v1/workout-plans/${planId}/days`)
      .expect(200)
      .expect((res) => {
        expect(res.body.workoutDays.map((d: any) => d.name)).toStrictEqual([
          "Push",
          "Pull",
          "Legs",
        ]);
        expect(res.body.workoutDays[0]).not.toHaveProperty("workoutPlanId");
      });
  });
});

describe("GET /api/v1/workout-plans/:planId/days/:dayId", () => {
  beforeEach(resetPlans);
  afterAll(resetPlans);

  it("returns 400 when dayId is not a UUID", async () => {
    const planId = await createPlan(testUserId);
    await request(app)
      .get(`/api/v1/workout-plans/${planId}/days/not-a-uuid`)
      .expect(400)
      .expect({ error: "Invalid dayId" });
  });

  it("returns 400 when planId is not a UUID", async () => {
    await request(app)
      .get(`/api/v1/workout-plans/not-a-uuid/days/${UUID}`)
      .expect(400)
      .expect({ error: "Invalid planId" });
  });

  it("returns 404 for an unknown day id", async () => {
    const planId = await createPlan(testUserId);
    await request(app)
      .get(`/api/v1/workout-plans/${planId}/days/${crypto.randomUUID()}`)
      .expect(404)
      .expect((res) => {
        expect(res.body.error).toBe("Workout day not found.");
      });
  });

  it("returns 404 when the day belongs to another user's plan", async () => {
    const planId = await createPlan(otherUserId, "Theirs");
    const day = await prisma.workoutDay.create({
      data: { workoutPlanId: planId, name: "Push", order: 1 },
    });
    await request(app)
      .get(`/api/v1/workout-plans/${planId}/days/${day.id}`)
      .expect(404)
      .expect((res) => {
        expect(res.body.error).toBe("Workout day not found.");
      });
  });

  it("returns 200 with the day's exercises (no FKs)", async () => {
    const planId = await createPlan(testUserId);
    const day = await prisma.workoutDay.create({
      data: { workoutPlanId: planId, name: "Push", order: 1 },
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

    await request(app)
      .get(`/api/v1/workout-plans/${planId}/days/${day.id}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.id).toBe(day.id);
        expect(res.body.name).toBe("Push");
        expect(res.body).not.toHaveProperty("workoutPlanId");
        expect(res.body.exercises).toHaveLength(1);
        const slot = res.body.exercises[0];
        expect(slot.targetSets).toBe(4);
        expect(slot).not.toHaveProperty("workoutDayId");
        expect(slot.exercise).toStrictEqual({
          id: exerciseId,
          slug: "integration_test_workoutDay_ctrl_bench",
          name: "Bench Press",
        });
      });
  });
});

describe("POST /api/v1/workout-plans/:planId/days", () => {
  beforeEach(resetPlans);
  afterAll(resetPlans);

  it("returns 400 when planId is not a UUID", async () => {
    await request(app)
      .post("/api/v1/workout-plans/not-a-uuid/days")
      .set("Content-Type", "application/json")
      .send({ name: "Push" })
      .expect(400)
      .expect({ error: "Invalid planId" });
  });

  it("returns 400 when name is missing", async () => {
    const planId = await createPlan(testUserId);
    await request(app)
      .post(`/api/v1/workout-plans/${planId}/days`)
      .set("Content-Type", "application/json")
      .send({})
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toContain("Name");
      });
  });

  it("returns 400 when name is an empty string", async () => {
    const planId = await createPlan(testUserId);
    await request(app)
      .post(`/api/v1/workout-plans/${planId}/days`)
      .set("Content-Type", "application/json")
      .send({ name: "" })
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toContain("Name");
      });
  });

  it("returns 404 when the plan does not exist", async () => {
    await request(app)
      .post(`/api/v1/workout-plans/${UUID}/days`)
      .set("Content-Type", "application/json")
      .send({ name: "Push" })
      .expect(404)
      .expect((res) => {
        expect(res.body.error).toBe("Workout plan not found.");
      });
  });

  it("returns 404 when the plan belongs to another user", async () => {
    const planId = await createPlan(otherUserId, "Theirs");
    await request(app)
      .post(`/api/v1/workout-plans/${planId}/days`)
      .set("Content-Type", "application/json")
      .send({ name: "Hijacked" })
      .expect(404);

    const days = await prisma.workoutDay.findMany({
      where: { workoutPlanId: planId },
    });
    expect(days).toHaveLength(0);
  });

  it("returns 201 with the created day at order 1 (no workoutPlanId)", async () => {
    const planId = await createPlan(testUserId);
    await request(app)
      .post(`/api/v1/workout-plans/${planId}/days`)
      .set("Content-Type", "application/json")
      .send({ name: "Push" })
      .expect(201)
      .expect((res) => {
        expect(res.body.id).toBeDefined();
        expect(res.body.name).toBe("Push");
        expect(res.body.order).toBe(1);
        expect(res.body).not.toHaveProperty("workoutPlanId");
      });

    const days = await prisma.workoutDay.findMany({
      where: { workoutPlanId: planId },
    });
    expect(days).toHaveLength(1);
  });
});

describe("PATCH /api/v1/workout-plans/:planId/days/:dayId", () => {
  beforeEach(resetPlans);
  afterAll(resetPlans);

  it("returns 400 when dayId is not a UUID", async () => {
    const planId = await createPlan(testUserId);
    await request(app)
      .patch(`/api/v1/workout-plans/${planId}/days/not-a-uuid`)
      .set("Content-Type", "application/json")
      .send({ name: "X" })
      .expect(400)
      .expect({ error: "Invalid dayId" });
  });

  it("returns 400 when no updatable fields are provided", async () => {
    const planId = await createPlan(testUserId);
    const day = await prisma.workoutDay.create({
      data: { workoutPlanId: planId, name: "Push", order: 1 },
    });
    await request(app)
      .patch(`/api/v1/workout-plans/${planId}/days/${day.id}`)
      .set("Content-Type", "application/json")
      .send({})
      .expect(400)
      .expect({ error: "No valid fields were provided to update." });
  });

  it("returns 400 when name is empty", async () => {
    const planId = await createPlan(testUserId);
    const day = await prisma.workoutDay.create({
      data: { workoutPlanId: planId, name: "Push", order: 1 },
    });
    await request(app)
      .patch(`/api/v1/workout-plans/${planId}/days/${day.id}`)
      .set("Content-Type", "application/json")
      .send({ name: "" })
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toContain("Name");
      });
  });

  it("returns 404 when the day does not exist", async () => {
    const planId = await createPlan(testUserId);
    await request(app)
      .patch(`/api/v1/workout-plans/${planId}/days/${crypto.randomUUID()}`)
      .set("Content-Type", "application/json")
      .send({ name: "X" })
      .expect(404)
      .expect((res) => {
        expect(res.body.error).toBe("Workout day not found.");
      });
  });

  it("returns 404 when the day belongs to another user's plan", async () => {
    const planId = await createPlan(otherUserId, "Theirs");
    const day = await prisma.workoutDay.create({
      data: { workoutPlanId: planId, name: "Before", order: 1 },
    });
    await request(app)
      .patch(`/api/v1/workout-plans/${planId}/days/${day.id}`)
      .set("Content-Type", "application/json")
      .send({ name: "Hijacked" })
      .expect(404);

    const unchanged = await prisma.workoutDay.findUnique({
      where: { id: day.id },
    });
    expect(unchanged!.name).toBe("Before");
  });

  it("returns 200 with the updated day detail", async () => {
    const planId = await createPlan(testUserId);
    const day = await prisma.workoutDay.create({
      data: { workoutPlanId: planId, name: "Before", order: 1 },
    });
    await request(app)
      .patch(`/api/v1/workout-plans/${planId}/days/${day.id}`)
      .set("Content-Type", "application/json")
      .send({ name: "After" })
      .expect(200)
      .expect((res) => {
        expect(res.body.name).toBe("After");
        expect(res.body.order).toBe(1);
        expect(res.body.exercises).toStrictEqual([]);
        expect(res.body).not.toHaveProperty("workoutPlanId");
      });
  });
});

describe("DELETE /api/v1/workout-plans/:planId/days/:dayId", () => {
  beforeEach(resetPlans);
  afterAll(resetPlans);

  it("returns 400 when dayId is not a UUID", async () => {
    const planId = await createPlan(testUserId);
    await request(app)
      .delete(`/api/v1/workout-plans/${planId}/days/not-a-uuid`)
      .expect(400)
      .expect({ error: "Invalid dayId" });
  });

  it("returns 404 when the day does not exist", async () => {
    const planId = await createPlan(testUserId);
    await request(app)
      .delete(`/api/v1/workout-plans/${planId}/days/${crypto.randomUUID()}`)
      .expect(404)
      .expect((res) => {
        expect(res.body.error).toBe("Workout day not found.");
      });
  });

  it("returns 404 when the day belongs to another user's plan", async () => {
    const planId = await createPlan(otherUserId, "Theirs");
    const day = await prisma.workoutDay.create({
      data: { workoutPlanId: planId, name: "Doomed", order: 1 },
    });
    await request(app)
      .delete(`/api/v1/workout-plans/${planId}/days/${day.id}`)
      .expect(404);

    const stillThere = await prisma.workoutDay.findUnique({
      where: { id: day.id },
    });
    expect(stillThere).not.toBeNull();
  });

  it("returns 204 and removes the day", async () => {
    const planId = await createPlan(testUserId);
    const day = await prisma.workoutDay.create({
      data: { workoutPlanId: planId, name: "Doomed", order: 1 },
    });

    await request(app)
      .delete(`/api/v1/workout-plans/${planId}/days/${day.id}`)
      .expect(204);

    const gone = await prisma.workoutDay.findUnique({ where: { id: day.id } });
    expect(gone).toBeNull();
  });
});
