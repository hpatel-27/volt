// Integration tests: set log controller via the real Express app + DB.
// Set logs use a SPLIT router: list + create are nested under an exercise log
// (/workout-logs/:logId/exercises/:exerciseLogId/sets), while read/update/delete
// by id are flat (/sets/:setId). Both are exercised here.
// Clerk auth is stubbed so requests resolve to a known test user.
// This call is hoisted so the module is mocked before the import.
vi.mock("@clerk/express", async () => {
  const { makeClerkMock } = await import("../../helpers/clerkMock.js");
  return makeClerkMock("integration_test_setLog_controller_user");
});

import { it, describe, vi, beforeAll, afterAll, beforeEach, expect } from "vitest";
import { prisma } from "../../../src/db.js";
import request from "supertest";
import { createApp } from "../../../src/app.js";

const app = createApp({ skipRateLimit: true });

const TEST_CLERK_ID = "integration_test_setLog_controller_user";
let testUserId: string;

// A second user (never authenticated) used to prove ownership boundaries return 404.
const OTHER_CLERK_ID = "integration_test_setLog_controller_other";
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
    where: { slug: "integration_test_setLog_ctrl_bench" },
    update: {},
    create: { slug: "integration_test_setLog_ctrl_bench", name: "Bench Press" },
  });
  exerciseId = exercise.id;
});

afterAll(async () => {
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

async function createChain(userId: string) {
  const log = await prisma.workoutLog.create({
    data: { userId, date: new Date("2026-06-07") },
  });
  const exerciseLog = await prisma.exerciseLog.create({
    data: { workoutLogId: log.id, exerciseId },
  });
  return { logId: log.id, exerciseLogId: exerciseLog.id };
}

const UUID = crypto.randomUUID();
const setsPath = (logId: string, exerciseLogId: string) =>
  `/api/v1/workout-logs/${logId}/exercises/${exerciseLogId}/sets`;

describe("GET /api/v1/workout-logs/:logId/exercises/:exerciseLogId/sets", () => {
  beforeEach(reset);
  afterAll(reset);

  it("returns 400 when logId is not a UUID", async () => {
    await request(app)
      .get(`/api/v1/workout-logs/not-a-uuid/exercises/${UUID}/sets`)
      .expect(400)
      .expect({ error: "Invalid logId" });
  });

  it("returns 400 when exerciseLogId is not a UUID", async () => {
    await request(app)
      .get(`/api/v1/workout-logs/${UUID}/exercises/not-a-uuid/sets`)
      .expect(400)
      .expect({ error: "Invalid exerciseLogId" });
  });

  it("returns 404 when the parent exercise log does not exist", async () => {
    const { logId } = await createChain(testUserId);
    await request(app)
      .get(setsPath(logId, crypto.randomUUID()))
      .expect(404)
      .expect((res) => {
        expect(res.body.error).toBe("Exercise log not found.");
      });
  });

  it("returns 404 when the parent exercise log belongs to another user", async () => {
    const { logId, exerciseLogId } = await createChain(otherUserId);
    await request(app)
      .get(setsPath(logId, exerciseLogId))
      .expect(404)
      .expect((res) => {
        expect(res.body.error).toBe("Exercise log not found.");
      });
  });

  it("returns 200 with an empty wrapped list when there are no sets", async () => {
    const { logId, exerciseLogId } = await createChain(testUserId);
    await request(app)
      .get(setsPath(logId, exerciseLogId))
      .expect("Content-Type", /json/)
      .expect(200)
      .expect({ sets: [] });
  });

  it("returns 200 with the sets ordered by setNumber (no exerciseLogId)", async () => {
    const { logId, exerciseLogId } = await createChain(testUserId);
    await prisma.setLog.createMany({
      data: [
        { exerciseLogId, setNumber: 2, reps: 8, weight: 145 },
        { exerciseLogId, setNumber: 1, reps: 10, weight: 135 },
      ],
    });

    await request(app)
      .get(setsPath(logId, exerciseLogId))
      .expect(200)
      .expect((res) => {
        expect(res.body.sets.map((s: any) => s.setNumber)).toStrictEqual([1, 2]);
        expect(res.body.sets[0]).not.toHaveProperty("exerciseLogId");
      });
  });
});

describe("POST /api/v1/workout-logs/:logId/exercises/:exerciseLogId/sets", () => {
  beforeEach(reset);
  afterAll(reset);

  it("returns 400 when exerciseLogId is not a UUID", async () => {
    const { logId } = await createChain(testUserId);
    await request(app)
      .post(`/api/v1/workout-logs/${logId}/exercises/not-a-uuid/sets`)
      .set("Content-Type", "application/json")
      .send({ reps: 10, weight: 135 })
      .expect(400)
      .expect({ error: "Invalid exerciseLogId" });
  });

  it("returns 400 when reps is not a positive integer", async () => {
    const { logId, exerciseLogId } = await createChain(testUserId);
    await request(app)
      .post(setsPath(logId, exerciseLogId))
      .set("Content-Type", "application/json")
      .send({ reps: 0, weight: 135 })
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toBe("Reps is required and must be a positive integer");
      });
  });

  it("returns 400 when weight is negative", async () => {
    const { logId, exerciseLogId } = await createChain(testUserId);
    await request(app)
      .post(setsPath(logId, exerciseLogId))
      .set("Content-Type", "application/json")
      .send({ reps: 10, weight: -5 })
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toBe(
          "Weight is required and must be a non-negative number",
        );
      });
  });

  it("returns 404 when the parent exercise log does not exist", async () => {
    const { logId } = await createChain(testUserId);
    await request(app)
      .post(setsPath(logId, crypto.randomUUID()))
      .set("Content-Type", "application/json")
      .send({ reps: 10, weight: 135 })
      .expect(404)
      .expect((res) => {
        expect(res.body.error).toBe("Exercise log not found.");
      });
  });

  it("returns 201 and auto-assigns sequential set numbers (weight 0 allowed)", async () => {
    const { logId, exerciseLogId } = await createChain(testUserId);

    await request(app)
      .post(setsPath(logId, exerciseLogId))
      .set("Content-Type", "application/json")
      .send({ reps: 10, weight: 135 })
      .expect(201)
      .expect((res) => {
        expect(res.body.setNumber).toBe(1);
        expect(res.body).not.toHaveProperty("exerciseLogId");
      });

    // A bodyweight set (weight 0) is valid and lands at the next number.
    await request(app)
      .post(setsPath(logId, exerciseLogId))
      .set("Content-Type", "application/json")
      .send({ reps: 8, weight: 0 })
      .expect(201)
      .expect((res) => {
        expect(res.body.setNumber).toBe(2);
        expect(res.body.weight).toBe(0);
      });
  });
});

describe("GET /api/v1/sets/:setId", () => {
  beforeEach(reset);
  afterAll(reset);

  it("returns 400 when setId is not a UUID", async () => {
    await request(app)
      .get("/api/v1/sets/not-a-uuid")
      .expect(400)
      .expect({ error: "Invalid setId" });
  });

  it("returns 404 for an unknown set id", async () => {
    await request(app)
      .get(`/api/v1/sets/${crypto.randomUUID()}`)
      .expect(404)
      .expect((res) => {
        expect(res.body.error).toBe("Set not found.");
      });
  });

  it("returns 404 when the set belongs to another user", async () => {
    const { exerciseLogId } = await createChain(otherUserId);
    const set = await prisma.setLog.create({
      data: { exerciseLogId, setNumber: 1, reps: 10, weight: 135 },
    });
    await request(app)
      .get(`/api/v1/sets/${set.id}`)
      .expect(404)
      .expect((res) => {
        expect(res.body.error).toBe("Set not found.");
      });
  });

  it("returns 200 with the set", async () => {
    const { exerciseLogId } = await createChain(testUserId);
    const set = await prisma.setLog.create({
      data: { exerciseLogId, setNumber: 1, reps: 5, weight: 200 },
    });
    await request(app)
      .get(`/api/v1/sets/${set.id}`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toStrictEqual({
          id: set.id,
          setNumber: 1,
          reps: 5,
          weight: 200,
        });
      });
  });
});

describe("PATCH /api/v1/sets/:setId", () => {
  beforeEach(reset);
  afterAll(reset);

  it("returns 400 when setId is not a UUID", async () => {
    await request(app)
      .patch("/api/v1/sets/not-a-uuid")
      .set("Content-Type", "application/json")
      .send({ reps: 12 })
      .expect(400)
      .expect({ error: "Invalid setId" });
  });

  it("returns 400 when no updatable fields are provided", async () => {
    await request(app)
      .patch(`/api/v1/sets/${UUID}`)
      .set("Content-Type", "application/json")
      .send({})
      .expect(400)
      .expect({ error: "No valid fields were provided to update." });
  });

  it("returns 400 when reps is not a positive integer", async () => {
    await request(app)
      .patch(`/api/v1/sets/${UUID}`)
      .set("Content-Type", "application/json")
      .send({ reps: 8.5 })
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toBe("Reps is required and must be a positive integer");
      });
  });

  it("returns 404 when the set does not exist", async () => {
    await request(app)
      .patch(`/api/v1/sets/${crypto.randomUUID()}`)
      .set("Content-Type", "application/json")
      .send({ reps: 12 })
      .expect(404)
      .expect((res) => {
        expect(res.body.error).toBe("Set not found.");
      });
  });

  it("returns 404 when the set belongs to another user", async () => {
    const { exerciseLogId } = await createChain(otherUserId);
    const set = await prisma.setLog.create({
      data: { exerciseLogId, setNumber: 1, reps: 10, weight: 135 },
    });
    await request(app)
      .patch(`/api/v1/sets/${set.id}`)
      .set("Content-Type", "application/json")
      .send({ reps: 99 })
      .expect(404);

    const unchanged = await prisma.setLog.findUnique({ where: { id: set.id } });
    expect(unchanged!.reps).toBe(10);
  });

  it("returns 200 and updates reps + weight", async () => {
    const { exerciseLogId } = await createChain(testUserId);
    const set = await prisma.setLog.create({
      data: { exerciseLogId, setNumber: 1, reps: 10, weight: 135 },
    });
    await request(app)
      .patch(`/api/v1/sets/${set.id}`)
      .set("Content-Type", "application/json")
      .send({ reps: 12, weight: 140 })
      .expect(200)
      .expect((res) => {
        expect(res.body.reps).toBe(12);
        expect(res.body.weight).toBe(140);
        expect(res.body.setNumber).toBe(1);
      });
  });
});

describe("DELETE /api/v1/sets/:setId", () => {
  beforeEach(reset);
  afterAll(reset);

  it("returns 400 when setId is not a UUID", async () => {
    await request(app)
      .delete("/api/v1/sets/not-a-uuid")
      .expect(400)
      .expect({ error: "Invalid setId" });
  });

  it("returns 404 for an unknown set id", async () => {
    await request(app)
      .delete(`/api/v1/sets/${crypto.randomUUID()}`)
      .expect(404)
      .expect((res) => {
        expect(res.body.error).toBe("Set not found.");
      });
  });

  it("returns 404 when the set belongs to another user", async () => {
    const { exerciseLogId } = await createChain(otherUserId);
    const set = await prisma.setLog.create({
      data: { exerciseLogId, setNumber: 1, reps: 10, weight: 135 },
    });
    await request(app).delete(`/api/v1/sets/${set.id}`).expect(404);

    expect(
      await prisma.setLog.findUnique({ where: { id: set.id } }),
    ).not.toBeNull();
  });

  it("returns 204 and removes the set", async () => {
    const { exerciseLogId } = await createChain(testUserId);
    const set = await prisma.setLog.create({
      data: { exerciseLogId, setNumber: 1, reps: 10, weight: 135 },
    });

    await request(app).delete(`/api/v1/sets/${set.id}`).expect(204);

    expect(
      await prisma.setLog.findUnique({ where: { id: set.id } }),
    ).toBeNull();
  });
});
