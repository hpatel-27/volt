// Integration tests: workout log controller via the real Express app + DB.
// Clerk auth is stubbed so requests resolve to a known test user.
// This call is hoisted so the module is mocked before the import.
vi.mock("@clerk/express", () => {
  return {
    clerkMiddleware: () => (req: any, _res: Response, next: NextFunction) => {
      req.auth = "integration_test_workoutLog_controller_user";
      next();
    },
    getAuth: (req: any) => ({
      isAuthenticated: true,
      userId: req.auth,
    }),
  };
});

import type { Response, NextFunction } from "express";
import { it, describe, vi, beforeAll, afterAll, beforeEach, expect } from "vitest";
import { prisma } from "../../../src/db.js";
import request from "supertest";
import { createApp } from "../../../src/app.js";

const app = createApp({ skipRateLimit: true });

// Unique clerkId so this test user doesn't collide with other suites running in parallel
const TEST_CLERK_ID = "integration_test_workoutLog_controller_user";
let testUserId: string;

// A second user (never authenticated) used to prove ownership boundaries return 404
const OTHER_CLERK_ID = "integration_test_workoutLog_controller_other";
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
    where: { slug: "integration_test_workoutLog_ctrl_bench" },
    update: {},
    create: {
      slug: "integration_test_workoutLog_ctrl_bench",
      name: "Bench Press",
    },
  });
  exerciseId = exercise.id;
});

afterAll(async () => {
  await prisma.workoutLog.deleteMany({ where: { userId: testUserId } });
  await prisma.workoutLog.deleteMany({ where: { userId: otherUserId } });
  await prisma.workoutPlan.deleteMany({ where: { userId: testUserId } });
  await prisma.workoutPlan.deleteMany({ where: { userId: otherUserId } });
  await prisma.exercise.delete({ where: { id: exerciseId } });
  await prisma.user.delete({ where: { id: testUserId } });
  await prisma.user.delete({ where: { id: otherUserId } });
});

async function reset() {
  await prisma.workoutLog.deleteMany({ where: { userId: testUserId } });
  await prisma.workoutLog.deleteMany({ where: { userId: otherUserId } });
  await prisma.workoutPlan.deleteMany({ where: { userId: testUserId } });
  await prisma.workoutPlan.deleteMany({ where: { userId: otherUserId } });
}

async function createPlanWithDay(userId: string, name = "Push") {
  const plan = await prisma.workoutPlan.create({ data: { userId, name: "Plan" } });
  const day = await prisma.workoutDay.create({
    data: { workoutPlanId: plan.id, name, order: 1 },
  });
  return { planId: plan.id, dayId: day.id };
}

const UUID = crypto.randomUUID();

describe("GET /api/v1/workout-logs", () => {
  beforeEach(reset);
  afterAll(reset);

  it("returns 400 when pagination params are missing", async () => {
    await request(app)
      .get("/api/v1/workout-logs")
      .expect(400)
      .expect({ error: "Page and limit must be positive integers" });
  });

  it("returns 200 with an empty page when the user has no logs", async () => {
    await request(app)
      .get("/api/v1/workout-logs?page=1&limit=10")
      .expect("Content-Type", /json/)
      .expect(200)
      .expect({ workoutLogs: [], total: 0, page: 1, limit: 10 });
  });

  it("returns 200 with summaries ordered newest-first (no userId)", async () => {
    await prisma.workoutLog.createMany({
      data: [
        { userId: testUserId, date: new Date("2026-06-05") },
        { userId: testUserId, date: new Date("2026-06-07") },
      ],
    });

    await request(app)
      .get("/api/v1/workout-logs?page=1&limit=10")
      .expect(200)
      .expect((res) => {
        expect(res.body.total).toBe(2);
        expect(res.body.workoutLogs.map((l: any) => l.date)).toStrictEqual([
          "2026-06-07",
          "2026-06-05",
        ]);
        expect(res.body.workoutLogs[0]).not.toHaveProperty("userId");
      });
  });

  it("does not include another user's logs", async () => {
    await prisma.workoutLog.create({
      data: { userId: otherUserId, date: new Date("2026-06-07") },
    });

    await request(app)
      .get("/api/v1/workout-logs?page=1&limit=10")
      .expect(200)
      .expect({ workoutLogs: [], total: 0, page: 1, limit: 10 });
  });
});

describe("GET /api/v1/workout-logs/today", () => {
  beforeEach(reset);
  afterAll(reset);

  // A thrown BadRequestError flows through errorMiddleware → { error, requestId }.
  it("returns 400 when the date query param is missing", async () => {
    await request(app)
      .get("/api/v1/workout-logs/today")
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toBe(
          "date query param must be in YYYY-MM-DD format",
        );
      });
  });

  it("returns 400 when the date query param has the wrong format", async () => {
    await request(app)
      .get("/api/v1/workout-logs/today?date=06-07-2026")
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toBe(
          "date query param must be in YYYY-MM-DD format",
        );
      });
  });

  it("returns 200 with only the given day's sessions", async () => {
    await prisma.workoutLog.createMany({
      data: [
        { userId: testUserId, date: new Date("2026-06-07") },
        { userId: testUserId, date: new Date("2026-06-06") },
      ],
    });

    await request(app)
      .get("/api/v1/workout-logs/today?date=2026-06-07")
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveLength(1);
        expect(res.body[0].date).toBe("2026-06-07");
      });
  });
});

describe("GET /api/v1/workout-logs/:logId", () => {
  beforeEach(reset);
  afterAll(reset);

  it("returns 400 when logId is not a UUID", async () => {
    await request(app)
      .get("/api/v1/workout-logs/not-a-uuid")
      .expect(400)
      .expect({ error: "Invalid logId" });
  });

  it("returns 404 for an unknown log id", async () => {
    await request(app)
      .get(`/api/v1/workout-logs/${UUID}`)
      .expect(404)
      .expect((res) => {
        expect(res.body.error).toBe("Workout log not found.");
      });
  });

  it("returns 404 when the log belongs to another user", async () => {
    const log = await prisma.workoutLog.create({
      data: { userId: otherUserId, date: new Date("2026-06-07") },
    });
    await request(app)
      .get(`/api/v1/workout-logs/${log.id}`)
      .expect(404)
      .expect((res) => {
        expect(res.body.error).toBe("Workout log not found.");
      });
  });

  it("returns 200 with the detail payload (exercises + sets, no FKs)", async () => {
    const { dayId } = await createPlanWithDay(testUserId);
    const log = await prisma.workoutLog.create({
      data: { userId: testUserId, date: new Date("2026-06-07"), workoutDayId: dayId },
    });
    const exerciseLog = await prisma.exerciseLog.create({
      data: { workoutLogId: log.id, exerciseId, notes: "felt strong" },
    });
    await prisma.setLog.create({
      data: { exerciseLogId: exerciseLog.id, setNumber: 1, reps: 10, weight: 135 },
    });

    await request(app)
      .get(`/api/v1/workout-logs/${log.id}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.id).toBe(log.id);
        expect(res.body.date).toBe("2026-06-07");
        expect(res.body.workoutDay).toStrictEqual({ id: dayId, name: "Push" });
        expect(res.body).not.toHaveProperty("userId");
        expect(res.body.exercises).toHaveLength(1);
        const ex = res.body.exercises[0];
        expect(ex.notes).toBe("felt strong");
        expect(ex).not.toHaveProperty("workoutLogId");
        expect(ex.sets).toHaveLength(1);
        expect(ex.sets[0]).toMatchObject({ setNumber: 1, reps: 10, weight: 135 });
      });
  });
});

describe("POST /api/v1/workout-logs", () => {
  beforeEach(reset);
  afterAll(reset);

  it("returns 400 when date is missing from the body", async () => {
    await request(app)
      .post("/api/v1/workout-logs")
      .set("Content-Type", "application/json")
      .send({})
      .expect(400)
      .expect({ error: "Date must be a string in ISO 8601 format" });
  });

  it("returns 400 when workoutDayId is present but not a string", async () => {
    await request(app)
      .post("/api/v1/workout-logs")
      .set("Content-Type", "application/json")
      .send({ date: "2026-06-07", workoutDayId: 123 })
      .expect(400)
      .expect({ error: "workoutDayId must be a UUID string." });
  });

  it("returns 201 with an ad-hoc session for the authenticated user", async () => {
    await request(app)
      .post("/api/v1/workout-logs")
      .set("Content-Type", "application/json")
      .send({ date: "2026-06-07" })
      .expect(201)
      .expect((res) => {
        expect(res.body.id).toBeDefined();
        expect(res.body.date).toBe("2026-06-07");
        expect(res.body.workoutDay).toBeNull();
        expect(res.body.exercises).toStrictEqual([]);
      });

    const logs = await prisma.workoutLog.findMany({
      where: { userId: testUserId },
    });
    expect(logs).toHaveLength(1);
  });

  it("returns 201 with a session linked to the user's workout day", async () => {
    const { dayId } = await createPlanWithDay(testUserId);

    await request(app)
      .post("/api/v1/workout-logs")
      .set("Content-Type", "application/json")
      .send({ date: "2026-06-07", workoutDayId: dayId })
      .expect(201)
      .expect((res) => {
        expect(res.body.workoutDay).toStrictEqual({ id: dayId, name: "Push" });
      });
  });

  it("returns 404 when the workoutDay belongs to another user's plan", async () => {
    const { dayId } = await createPlanWithDay(otherUserId);

    await request(app)
      .post("/api/v1/workout-logs")
      .set("Content-Type", "application/json")
      .send({ date: "2026-06-07", workoutDayId: dayId })
      .expect(404)
      .expect((res) => {
        expect(res.body.error).toBe("Workout day not found.");
      });

    const logs = await prisma.workoutLog.findMany({
      where: { userId: testUserId },
    });
    expect(logs).toHaveLength(0);
  });
});

describe("PATCH /api/v1/workout-logs/:logId", () => {
  beforeEach(reset);
  afterAll(reset);

  it("returns 400 when logId is not a UUID", async () => {
    await request(app)
      .patch("/api/v1/workout-logs/not-a-uuid")
      .set("Content-Type", "application/json")
      .send({ date: "2026-06-08" })
      .expect(400)
      .expect({ error: "Invalid logId" });
  });

  it("returns 400 when no updatable fields are provided", async () => {
    await request(app)
      .patch(`/api/v1/workout-logs/${UUID}`)
      .set("Content-Type", "application/json")
      .send({})
      .expect(400)
      .expect({ error: "No valid fields were provided to update." });
  });

  it("returns 400 when the date is malformed", async () => {
    await request(app)
      .patch(`/api/v1/workout-logs/${UUID}`)
      .set("Content-Type", "application/json")
      .send({ date: "not-a-date" })
      .expect(400)
      .expect({ error: "Date must be a string in ISO 8601 format" });
  });

  it("returns 400 when workoutDayId is an invalid (non-null) value", async () => {
    await request(app)
      .patch(`/api/v1/workout-logs/${UUID}`)
      .set("Content-Type", "application/json")
      .send({ workoutDayId: 42 })
      .expect(400)
      .expect({ error: "workoutDayId must be a UUID string or null." });
  });

  it("returns 404 when the log does not exist", async () => {
    await request(app)
      .patch(`/api/v1/workout-logs/${crypto.randomUUID()}`)
      .set("Content-Type", "application/json")
      .send({ date: "2026-06-08" })
      .expect(404)
      .expect((res) => {
        expect(res.body.error).toBe("Workout log not found.");
      });
  });

  it("returns 404 when the log belongs to another user", async () => {
    const log = await prisma.workoutLog.create({
      data: { userId: otherUserId, date: new Date("2026-06-07") },
    });
    await request(app)
      .patch(`/api/v1/workout-logs/${log.id}`)
      .set("Content-Type", "application/json")
      .send({ date: "2026-06-08" })
      .expect(404);

    const unchanged = await prisma.workoutLog.findUnique({
      where: { id: log.id },
    });
    expect(unchanged!.date).toStrictEqual(new Date("2026-06-07"));
  });

  it("returns 200 and updates the date", async () => {
    const log = await prisma.workoutLog.create({
      data: { userId: testUserId, date: new Date("2026-06-07") },
    });
    await request(app)
      .patch(`/api/v1/workout-logs/${log.id}`)
      .set("Content-Type", "application/json")
      .send({ date: "2026-06-08" })
      .expect(200)
      .expect((res) => {
        expect(res.body.date).toBe("2026-06-08");
      });
  });

  it("returns 200 and unlinks the day when workoutDayId is null", async () => {
    const { dayId } = await createPlanWithDay(testUserId);
    const log = await prisma.workoutLog.create({
      data: { userId: testUserId, date: new Date("2026-06-07"), workoutDayId: dayId },
    });
    await request(app)
      .patch(`/api/v1/workout-logs/${log.id}`)
      .set("Content-Type", "application/json")
      .send({ workoutDayId: null })
      .expect(200)
      .expect((res) => {
        expect(res.body.workoutDay).toBeNull();
      });

    const persisted = await prisma.workoutLog.findUnique({
      where: { id: log.id },
    });
    expect(persisted!.workoutDayId).toBeNull();
  });
});

describe("DELETE /api/v1/workout-logs/:logId", () => {
  beforeEach(reset);
  afterAll(reset);

  it("returns 400 when logId is not a UUID", async () => {
    await request(app)
      .delete("/api/v1/workout-logs/not-a-uuid")
      .expect(400)
      .expect({ error: "Invalid logId" });
  });

  it("returns 404 for an unknown log id", async () => {
    await request(app)
      .delete(`/api/v1/workout-logs/${crypto.randomUUID()}`)
      .expect(404)
      .expect((res) => {
        expect(res.body.error).toBe("Workout log not found.");
      });
  });

  it("returns 404 when the log belongs to another user", async () => {
    const log = await prisma.workoutLog.create({
      data: { userId: otherUserId, date: new Date("2026-06-07") },
    });
    await request(app).delete(`/api/v1/workout-logs/${log.id}`).expect(404);

    expect(
      await prisma.workoutLog.findUnique({ where: { id: log.id } }),
    ).not.toBeNull();
  });

  it("returns 204 and removes the log", async () => {
    const log = await prisma.workoutLog.create({
      data: { userId: testUserId, date: new Date("2026-06-07") },
    });

    await request(app).delete(`/api/v1/workout-logs/${log.id}`).expect(204);

    expect(
      await prisma.workoutLog.findUnique({ where: { id: log.id } }),
    ).toBeNull();
  });
});
