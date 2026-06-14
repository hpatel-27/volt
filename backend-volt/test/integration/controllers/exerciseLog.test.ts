// Integration tests: exercise log controller via the real Express app + DB.
// Clerk auth is stubbed so requests resolve to a known test user.
// This call is hoisted so the module is mocked before the import.
vi.mock("@clerk/express", async () => {
  const { makeClerkMock } = await import("../../helpers/clerkMock.js");
  return makeClerkMock("integration_test_exerciseLog_controller_user");
});

import { it, describe, vi, beforeAll, afterAll, beforeEach, expect } from "vitest";
import { prisma } from "../../../src/db.js";
import request from "supertest";
import { createApp } from "../../../src/app.js";

const app = createApp({ skipRateLimit: true });

const TEST_CLERK_ID = "integration_test_exerciseLog_controller_user";
let testUserId: string;

// A second user (never authenticated) used to prove ownership boundaries return 404.
const OTHER_CLERK_ID = "integration_test_exerciseLog_controller_other";
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
    where: { slug: "integration_test_exerciseLog_ctrl_bench" },
    update: {},
    create: {
      slug: "integration_test_exerciseLog_ctrl_bench",
      name: "Bench Press",
    },
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

async function createLog(userId: string) {
  const log = await prisma.workoutLog.create({
    data: { userId, date: new Date("2026-06-07") },
  });
  return log.id;
}

const UUID = crypto.randomUUID();

describe("GET /api/v1/workout-logs/:logId/exercises", () => {
  beforeEach(reset);
  afterAll(reset);

  it("returns 400 when logId is not a UUID", async () => {
    await request(app)
      .get("/api/v1/workout-logs/not-a-uuid/exercises")
      .expect(400)
      .expect({ error: "Invalid logId" });
  });

  it("returns 404 when the parent log does not exist", async () => {
    await request(app)
      .get(`/api/v1/workout-logs/${UUID}/exercises`)
      .expect(404)
      .expect((res) => {
        expect(res.body.error).toBe("Workout log not found.");
      });
  });

  it("returns 404 when the parent log belongs to another user", async () => {
    const logId = await createLog(otherUserId);
    await request(app)
      .get(`/api/v1/workout-logs/${logId}/exercises`)
      .expect(404)
      .expect((res) => {
        expect(res.body.error).toBe("Workout log not found.");
      });
  });

  it("returns 200 with an empty wrapped list when the log has no exercises", async () => {
    const logId = await createLog(testUserId);
    await request(app)
      .get(`/api/v1/workout-logs/${logId}/exercises`)
      .expect("Content-Type", /json/)
      .expect(200)
      .expect({ exerciseLogs: [] });
  });

  it("returns 200 with the log's exercises and their sets (no FKs)", async () => {
    const logId = await createLog(testUserId);
    const el = await prisma.exerciseLog.create({
      data: { workoutLogId: logId, exerciseId, notes: "felt strong" },
    });
    await prisma.setLog.create({
      data: { exerciseLogId: el.id, setNumber: 1, reps: 10, weight: 135 },
    });

    await request(app)
      .get(`/api/v1/workout-logs/${logId}/exercises`)
      .expect(200)
      .expect((res) => {
        expect(res.body.exerciseLogs).toHaveLength(1);
        const dto = res.body.exerciseLogs[0];
        expect(dto.notes).toBe("felt strong");
        expect(dto).not.toHaveProperty("workoutLogId");
        expect(dto.exercise).toStrictEqual({
          id: exerciseId,
          slug: "integration_test_exerciseLog_ctrl_bench",
          name: "Bench Press",
        });
        expect(dto.sets).toHaveLength(1);
        expect(dto.sets[0]).toMatchObject({ setNumber: 1, reps: 10, weight: 135 });
      });
  });
});

describe("GET /api/v1/workout-logs/:logId/exercises/:exerciseLogId", () => {
  beforeEach(reset);
  afterAll(reset);

  it("returns 400 when exerciseLogId is not a UUID", async () => {
    const logId = await createLog(testUserId);
    await request(app)
      .get(`/api/v1/workout-logs/${logId}/exercises/not-a-uuid`)
      .expect(400)
      .expect({ error: "Invalid exerciseLogId" });
  });

  it("returns 404 for an unknown exercise log id", async () => {
    const logId = await createLog(testUserId);
    await request(app)
      .get(`/api/v1/workout-logs/${logId}/exercises/${crypto.randomUUID()}`)
      .expect(404)
      .expect((res) => {
        expect(res.body.error).toBe("Exercise log not found.");
      });
  });

  it("returns 404 when the exercise log belongs to another user's log", async () => {
    const logId = await createLog(otherUserId);
    const el = await prisma.exerciseLog.create({
      data: { workoutLogId: logId, exerciseId },
    });
    await request(app)
      .get(`/api/v1/workout-logs/${logId}/exercises/${el.id}`)
      .expect(404)
      .expect((res) => {
        expect(res.body.error).toBe("Exercise log not found.");
      });
  });

  it("returns 200 with the exercise log and its sets", async () => {
    const logId = await createLog(testUserId);
    const el = await prisma.exerciseLog.create({
      data: { workoutLogId: logId, exerciseId },
    });
    await prisma.setLog.create({
      data: { exerciseLogId: el.id, setNumber: 1, reps: 5, weight: 200 },
    });

    await request(app)
      .get(`/api/v1/workout-logs/${logId}/exercises/${el.id}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.id).toBe(el.id);
        expect(res.body).not.toHaveProperty("workoutLogId");
        expect(res.body.sets).toHaveLength(1);
        expect(res.body.sets[0]).toMatchObject({ setNumber: 1, reps: 5, weight: 200 });
      });
  });
});

describe("POST /api/v1/workout-logs/:logId/exercises", () => {
  beforeEach(reset);
  afterAll(reset);

  it("returns 400 when logId is not a UUID", async () => {
    await request(app)
      .post("/api/v1/workout-logs/not-a-uuid/exercises")
      .set("Content-Type", "application/json")
      .send({ exerciseId })
      .expect(400)
      .expect({ error: "Invalid logId" });
  });

  it("returns 400 when exerciseId is missing", async () => {
    const logId = await createLog(testUserId);
    await request(app)
      .post(`/api/v1/workout-logs/${logId}/exercises`)
      .set("Content-Type", "application/json")
      .send({})
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toContain("xercise");
      });
  });

  it("returns 400 when notes is not a string", async () => {
    const logId = await createLog(testUserId);
    await request(app)
      .post(`/api/v1/workout-logs/${logId}/exercises`)
      .set("Content-Type", "application/json")
      .send({ exerciseId, notes: 42 })
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toContain("Notes");
      });
  });

  it("returns 404 when the parent log does not exist", async () => {
    await request(app)
      .post(`/api/v1/workout-logs/${UUID}/exercises`)
      .set("Content-Type", "application/json")
      .send({ exerciseId })
      .expect(404)
      .expect((res) => {
        expect(res.body.error).toBe("Workout log not found.");
      });
  });

  it("returns 404 when the exercise does not exist", async () => {
    const logId = await createLog(testUserId);
    await request(app)
      .post(`/api/v1/workout-logs/${logId}/exercises`)
      .set("Content-Type", "application/json")
      .send({ exerciseId: crypto.randomUUID() })
      .expect(404)
      .expect((res) => {
        expect(res.body.error).toBe("Exercise not found.");
      });
  });

  it("returns 201 with the created exercise log", async () => {
    const logId = await createLog(testUserId);
    await request(app)
      .post(`/api/v1/workout-logs/${logId}/exercises`)
      .set("Content-Type", "application/json")
      .send({ exerciseId, notes: "warmup" })
      .expect(201)
      .expect((res) => {
        expect(res.body.id).toBeDefined();
        expect(res.body.notes).toBe("warmup");
        expect(res.body.exercise.id).toBe(exerciseId);
        expect(res.body.sets).toStrictEqual([]);
        expect(res.body).not.toHaveProperty("workoutLogId");
      });

    const rows = await prisma.exerciseLog.findMany({
      where: { workoutLogId: logId },
    });
    expect(rows).toHaveLength(1);
  });
});

describe("PATCH /api/v1/workout-logs/:logId/exercises/:exerciseLogId", () => {
  beforeEach(reset);
  afterAll(reset);

  it("returns 400 when exerciseLogId is not a UUID", async () => {
    const logId = await createLog(testUserId);
    await request(app)
      .patch(`/api/v1/workout-logs/${logId}/exercises/not-a-uuid`)
      .set("Content-Type", "application/json")
      .send({ notes: "x" })
      .expect(400)
      .expect({ error: "Invalid exerciseLogId" });
  });

  it("returns 400 when no updatable fields are provided", async () => {
    const logId = await createLog(testUserId);
    const el = await prisma.exerciseLog.create({
      data: { workoutLogId: logId, exerciseId },
    });
    await request(app)
      .patch(`/api/v1/workout-logs/${logId}/exercises/${el.id}`)
      .set("Content-Type", "application/json")
      .send({})
      .expect(400)
      .expect({ error: "No valid fields were provided to update." });
  });

  it("returns 400 when notes is neither a string nor null", async () => {
    const logId = await createLog(testUserId);
    const el = await prisma.exerciseLog.create({
      data: { workoutLogId: logId, exerciseId },
    });
    await request(app)
      .patch(`/api/v1/workout-logs/${logId}/exercises/${el.id}`)
      .set("Content-Type", "application/json")
      .send({ notes: 42 })
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toContain("Notes");
      });
  });

  it("returns 404 when the exercise log does not exist", async () => {
    const logId = await createLog(testUserId);
    await request(app)
      .patch(`/api/v1/workout-logs/${logId}/exercises/${crypto.randomUUID()}`)
      .set("Content-Type", "application/json")
      .send({ notes: "x" })
      .expect(404)
      .expect((res) => {
        expect(res.body.error).toBe("Exercise log not found.");
      });
  });

  it("returns 404 when the exercise log belongs to another user", async () => {
    const logId = await createLog(otherUserId);
    const el = await prisma.exerciseLog.create({
      data: { workoutLogId: logId, exerciseId, notes: "before" },
    });
    await request(app)
      .patch(`/api/v1/workout-logs/${logId}/exercises/${el.id}`)
      .set("Content-Type", "application/json")
      .send({ notes: "hijacked" })
      .expect(404);

    const unchanged = await prisma.exerciseLog.findUnique({
      where: { id: el.id },
    });
    expect(unchanged!.notes).toBe("before");
  });

  it("returns 200 and updates the notes", async () => {
    const logId = await createLog(testUserId);
    const el = await prisma.exerciseLog.create({
      data: { workoutLogId: logId, exerciseId, notes: "before" },
    });
    await request(app)
      .patch(`/api/v1/workout-logs/${logId}/exercises/${el.id}`)
      .set("Content-Type", "application/json")
      .send({ notes: "after" })
      .expect(200)
      .expect((res) => {
        expect(res.body.notes).toBe("after");
      });
  });
});

describe("DELETE /api/v1/workout-logs/:logId/exercises/:exerciseLogId", () => {
  beforeEach(reset);
  afterAll(reset);

  it("returns 400 when exerciseLogId is not a UUID", async () => {
    const logId = await createLog(testUserId);
    await request(app)
      .delete(`/api/v1/workout-logs/${logId}/exercises/not-a-uuid`)
      .expect(400)
      .expect({ error: "Invalid exerciseLogId" });
  });

  it("returns 404 for an unknown exercise log id", async () => {
    const logId = await createLog(testUserId);
    await request(app)
      .delete(`/api/v1/workout-logs/${logId}/exercises/${crypto.randomUUID()}`)
      .expect(404)
      .expect((res) => {
        expect(res.body.error).toBe("Exercise log not found.");
      });
  });

  it("returns 404 when the exercise log belongs to another user", async () => {
    const logId = await createLog(otherUserId);
    const el = await prisma.exerciseLog.create({
      data: { workoutLogId: logId, exerciseId },
    });
    await request(app)
      .delete(`/api/v1/workout-logs/${logId}/exercises/${el.id}`)
      .expect(404);

    expect(
      await prisma.exerciseLog.findUnique({ where: { id: el.id } }),
    ).not.toBeNull();
  });

  it("returns 204 and removes the exercise log", async () => {
    const logId = await createLog(testUserId);
    const el = await prisma.exerciseLog.create({
      data: { workoutLogId: logId, exerciseId },
    });

    await request(app)
      .delete(`/api/v1/workout-logs/${logId}/exercises/${el.id}`)
      .expect(204);

    expect(
      await prisma.exerciseLog.findUnique({ where: { id: el.id } }),
    ).toBeNull();
  });
});
