// Integration tests: workout plan controller via the real Express app + DB.
// Clerk auth is stubbed so requests resolve to a known test user.
// This call is hoisted so the module is mocked before the import.
vi.mock("@clerk/express", async () => {
  const { makeClerkMock } = await import("../../helpers/clerkMock.js");
  return makeClerkMock("integration_test_workoutPlan_controller_user");
});

import {
  it,
  describe,
  vi,
  beforeAll,
  afterAll,
  beforeEach,
  expect,
} from "vitest";
import { prisma } from "../../../src/db.js";
import request from "supertest";
import { createApp } from "../../../src/app.js";

const app = createApp({ skipRateLimit: true });

// Unique clerkId so this test user doesn't collide with other suites running in parallel
const TEST_CLERK_ID = "integration_test_workoutPlan_controller_user";
let testUserId: string;

// A second user (no auth) used to prove ownership boundaries return 404
const OTHER_CLERK_ID = "integration_test_workoutPlan_controller_other";
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
    where: { slug: "integration_test_workoutPlan_ctrl_bench" },
    update: {},
    create: {
      slug: "integration_test_workoutPlan_ctrl_bench",
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

describe("GET /api/v1/workout-plans", () => {
  beforeEach(resetPlans);
  afterAll(resetPlans);

  // Pagination is enforced by shared middleware; one representative case each.
  it("returns 400 when page is missing", async () => {
    await request(app)
      .get("/api/v1/workout-plans")
      .query({ limit: "10" })
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toBe("Page and limit must be positive integers");
      });
  });

  it("returns 400 when limit is not numeric", async () => {
    await request(app)
      .get("/api/v1/workout-plans")
      .query({ page: "1", limit: "nope" })
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toBe("Page and limit must be positive integers");
      });
  });

  it("returns 200 with an empty page shape", async () => {
    await request(app)
      .get("/api/v1/workout-plans")
      .query({ page: 1, limit: 10 })
      .expect("Content-Type", /json/)
      .expect(200)
      .expect((res) => {
        expect(res.body.page).toBe(1);
        expect(res.body.limit).toBe(10);
        expect(res.body.total).toBe(0);
        expect(res.body.workoutPlans).toStrictEqual([]);
      });
  });

  it("excludes the active plan and reports daysPerWeek (no userId)", async () => {
    const active = await prisma.workoutPlan.create({
      data: { userId: testUserId, name: "Active Plan" },
    });
    const listed = await prisma.workoutPlan.create({
      data: { userId: testUserId, name: "Listed Plan", type: "STRENGTH" },
    });
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

    await request(app)
      .get("/api/v1/workout-plans")
      .query({ page: 1, limit: 10 })
      .expect(200)
      .expect((res) => {
        expect(res.body.total).toBe(1);
        expect(res.body.workoutPlans).toHaveLength(1);
        const dto = res.body.workoutPlans[0];
        expect(dto.id).toBe(listed.id);
        expect(dto.daysPerWeek).toBe(2);
        expect(dto.type).toBe("STRENGTH");
        expect(dto).not.toHaveProperty("userId");
      });
  });
});

describe("GET /api/v1/workout-plans/active", () => {
  beforeEach(resetPlans);
  afterAll(resetPlans);

  it("returns 200 with null when no plan is active", async () => {
    await request(app)
      .get("/api/v1/workout-plans/active")
      .expect(200)
      .expect((res) => {
        expect(res.body ?? null).toBeNull();
      });
  });

  it("returns 200 with the active plan summary", async () => {
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

    await request(app)
      .get("/api/v1/workout-plans/active")
      .expect(200)
      .expect((res) => {
        expect(res.body.id).toBe(plan.id);
        expect(res.body.daysPerWeek).toBe(1);
        expect(res.body.type).toBe("HYPERTROPHY");
        expect(res.body).not.toHaveProperty("userId");
      });
  });
});

describe("GET /api/v1/workout-plans/:planId", () => {
  beforeEach(resetPlans);
  afterAll(resetPlans);

  it("returns 400 when planId is not a UUID", async () => {
    await request(app)
      .get("/api/v1/workout-plans/not-a-uuid")
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toBe("Invalid planId");
      });
  });

  it("returns 404 when no plan exists for that id", async () => {
    await request(app)
      .get(`/api/v1/workout-plans/${crypto.randomUUID()}`)
      .expect(404)
      .expect((res) => {
        expect(res.body.error).toBe("Workout plan not found.");
      });
  });

  it("returns 404 when the plan belongs to another user", async () => {
    const plan = await prisma.workoutPlan.create({
      data: { userId: otherUserId, name: "Theirs" },
    });

    await request(app)
      .get(`/api/v1/workout-plans/${plan.id}`)
      .expect(404)
      .expect((res) => {
        expect(res.body.error).toBe("Workout plan not found.");
      });
  });

  it("returns 200 with the plan's days and exercises (no userId)", async () => {
    const plan = await prisma.workoutPlan.create({
      data: { userId: testUserId, name: "Detail", type: "STRENGTH" },
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

    await request(app)
      .get(`/api/v1/workout-plans/${plan.id}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.id).toBe(plan.id);
        expect(res.body).not.toHaveProperty("userId");
        expect(res.body.workoutDays).toHaveLength(1);
        const d = res.body.workoutDays[0];
        expect(d.name).toBe("Push");
        expect(d).not.toHaveProperty("workoutPlanId");
        expect(d.exercises).toHaveLength(1);
        expect(d.exercises[0].targetSets).toBe(4);
        expect(d.exercises[0]).not.toHaveProperty("workoutDayId");
        expect(d.exercises[0].exercise).toStrictEqual({
          id: exerciseId,
          slug: "integration_test_workoutPlan_ctrl_bench",
          name: "Bench Press",
        });
      });
  });
});

describe("POST /api/v1/workout-plans", () => {
  beforeEach(resetPlans);
  afterAll(resetPlans);

  it("returns 400 when name is missing", async () => {
    await request(app)
      .post("/api/v1/workout-plans")
      .set("Content-Type", "application/json")
      .send({})
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toContain("Name");
      });
  });

  it("returns 400 when name is an empty string", async () => {
    await request(app)
      .post("/api/v1/workout-plans")
      .set("Content-Type", "application/json")
      .send({ name: "" })
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toContain("Name");
      });
  });

  it("returns 400 when name is not a string", async () => {
    await request(app)
      .post("/api/v1/workout-plans")
      .set("Content-Type", "application/json")
      .send({ name: 123 })
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toContain("Name");
      });
  });

  it("returns 400 when type is invalid", async () => {
    await request(app)
      .post("/api/v1/workout-plans")
      .set("Content-Type", "application/json")
      .send({ name: "PPL", type: "BODYBUILDING" })
      .expect(400)
      .expect({
        error:
          "Invalid type was provided. STRENGTH, HYPERTROPHY, and WEIGHT LOSS are the only types currently supported.",
      });
  });

  it("returns 201 with the created plan and auto-activates the first one", async () => {
    await request(app)
      .post("/api/v1/workout-plans")
      .set("Content-Type", "application/json")
      .send({ name: "My First Plan" })
      .expect(201)
      .expect((res) => {
        expect(res.body.id).toBeDefined();
        expect(res.body.name).toBe("My First Plan");
        expect(res.body.type).toBeNull();
        expect(res.body.daysPerWeek).toBe(0);
        expect(res.body).not.toHaveProperty("userId");
      });

    // The first plan a user owns becomes their active plan
    const user = await prisma.user.findUnique({ where: { id: testUserId } });
    expect(user!.activePlanId).not.toBeNull();
  });

  it("returns 201 and accepts the OTHER plan type", async () => {
    await request(app)
      .post("/api/v1/workout-plans")
      .set("Content-Type", "application/json")
      .send({ name: "Recovery", type: "OTHER" })
      .expect(201)
      .expect((res) => {
        expect(res.body.type).toBe("OTHER");
      });
  });
});

describe("PATCH /api/v1/workout-plans/:planId", () => {
  beforeEach(resetPlans);
  afterAll(resetPlans);

  it("returns 400 when planId is not a UUID", async () => {
    await request(app)
      .patch("/api/v1/workout-plans/not-a-uuid")
      .set("Content-Type", "application/json")
      .send({ name: "X" })
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toBe("Invalid planId");
      });
  });

  it("returns 400 when no updatable fields are provided", async () => {
    const plan = await prisma.workoutPlan.create({
      data: { userId: testUserId, name: "Plan" },
    });
    await request(app)
      .patch(`/api/v1/workout-plans/${plan.id}`)
      .set("Content-Type", "application/json")
      .send({})
      .expect(400)
      .expect({ error: "No valid fields were provided to update." });
  });

  it("returns 400 when name is empty", async () => {
    const plan = await prisma.workoutPlan.create({
      data: { userId: testUserId, name: "Plan" },
    });
    await request(app)
      .patch(`/api/v1/workout-plans/${plan.id}`)
      .set("Content-Type", "application/json")
      .send({ name: "" })
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toContain("Name");
      });
  });

  it("returns 404 when the plan does not exist", async () => {
    await request(app)
      .patch(`/api/v1/workout-plans/${crypto.randomUUID()}`)
      .set("Content-Type", "application/json")
      .send({ name: "X" })
      .expect(404)
      .expect((res) => {
        expect(res.body.error).toBe("Workout plan not found.");
      });
  });

  it("returns 404 when the plan belongs to another user", async () => {
    const plan = await prisma.workoutPlan.create({
      data: { userId: otherUserId, name: "Theirs" },
    });
    await request(app)
      .patch(`/api/v1/workout-plans/${plan.id}`)
      .set("Content-Type", "application/json")
      .send({ name: "Hijacked" })
      .expect(404);

    const unchanged = await prisma.workoutPlan.findUnique({
      where: { id: plan.id },
    });
    expect(unchanged!.name).toBe("Theirs");
  });

  it("returns 200 with the updated plan detail", async () => {
    const plan = await prisma.workoutPlan.create({
      data: { userId: testUserId, name: "Before", type: "STRENGTH" },
    });
    await request(app)
      .patch(`/api/v1/workout-plans/${plan.id}`)
      .set("Content-Type", "application/json")
      .send({ name: "After", type: "WEIGHT_LOSS" })
      .expect(200)
      .expect((res) => {
        expect(res.body.name).toBe("After");
        expect(res.body.type).toBe("WEIGHT_LOSS");
        expect(res.body.workoutDays).toStrictEqual([]);
        expect(res.body).not.toHaveProperty("userId");
      });
  });
});

describe("DELETE /api/v1/workout-plans/:planId", () => {
  beforeEach(resetPlans);
  afterAll(resetPlans);

  it("returns 400 when planId is not a UUID", async () => {
    await request(app)
      .delete("/api/v1/workout-plans/not-a-uuid")
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toBe("Invalid planId");
      });
  });

  it("returns 404 when the plan does not exist", async () => {
    await request(app)
      .delete(`/api/v1/workout-plans/${crypto.randomUUID()}`)
      .expect(404)
      .expect((res) => {
        expect(res.body.error).toBe("Workout plan not found.");
      });
  });

  it("returns 400 when attempting to delete the active plan", async () => {
    const plan = await prisma.workoutPlan.create({
      data: { userId: testUserId, name: "Active" },
    });
    await prisma.user.update({
      where: { id: testUserId },
      data: { activePlanId: plan.id },
    });

    await request(app)
      .delete(`/api/v1/workout-plans/${plan.id}`)
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toBe("Active workout plan cannot be deleted.");
      });

    const stillThere = await prisma.workoutPlan.findUnique({
      where: { id: plan.id },
    });
    expect(stillThere).not.toBeNull();
  });

  it("returns 404 when the plan belongs to another user", async () => {
    const plan = await prisma.workoutPlan.create({
      data: { userId: otherUserId, name: "Theirs" },
    });
    await request(app).delete(`/api/v1/workout-plans/${plan.id}`).expect(404);

    const stillThere = await prisma.workoutPlan.findUnique({
      where: { id: plan.id },
    });
    expect(stillThere).not.toBeNull();
  });

  it("returns 204 and removes a non-active plan", async () => {
    const plan = await prisma.workoutPlan.create({
      data: { userId: testUserId, name: "Doomed" },
    });

    await request(app).delete(`/api/v1/workout-plans/${plan.id}`).expect(204);

    const gone = await prisma.workoutPlan.findUnique({
      where: { id: plan.id },
    });
    expect(gone).toBeNull();
  });
});

describe("POST /api/v1/workout-plans/:planId/activate", () => {
  beforeEach(resetPlans);
  afterAll(resetPlans);

  it("returns 400 when planId is not a UUID", async () => {
    await request(app)
      .post("/api/v1/workout-plans/not-a-uuid/activate")
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toBe("Invalid planId");
      });
  });

  it("returns 404 when the plan does not exist", async () => {
    await request(app)
      .post(`/api/v1/workout-plans/${crypto.randomUUID()}/activate`)
      .expect(404)
      .expect((res) => {
        expect(res.body.error).toBe("Workout plan not found.");
      });
  });

  it("returns 404 when activating another user's plan", async () => {
    const plan = await prisma.workoutPlan.create({
      data: { userId: otherUserId, name: "Theirs" },
    });
    await request(app)
      .post(`/api/v1/workout-plans/${plan.id}/activate`)
      .expect(404);

    const other = await prisma.user.findUnique({ where: { id: otherUserId } });
    expect(other!.activePlanId).toBeNull();
  });

  it("returns 200, switches the active plan, and hides it from the list", async () => {
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

    await request(app)
      .post(`/api/v1/workout-plans/${planB.id}/activate`)
      .expect(200)
      .expect({ activePlanId: planB.id });

    // /active now reflects B
    await request(app)
      .get("/api/v1/workout-plans/active")
      .expect(200)
      .expect((res) => expect(res.body.id).toBe(planB.id));

    // and the list now hides B (the active one) and shows A instead
    await request(app)
      .get("/api/v1/workout-plans")
      .query({ page: 1, limit: 10 })
      .expect(200)
      .expect((res) => {
        const ids = res.body.workoutPlans.map((p: any) => p.id);
        expect(ids).toContain(planA.id);
        expect(ids).not.toContain(planB.id);
      });
  });
});
