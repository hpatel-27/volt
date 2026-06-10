// Integration tests: weight controller via the real Express app + DB.
// Clerk auth is stubbed so requests resolve to a known test user.
// This call is hoisted so the module is mocked before the import.
vi.mock("@clerk/express", async () => {
  const { makeClerkMock } = await import("../../helpers/clerkMock.js");
  return makeClerkMock("integration_test_weight_controller_user");
});

import { it, describe, vi, beforeAll, afterAll, expect } from "vitest";
import { prisma } from "../../../src/db.js";
import request from "supertest";
import { createApp } from "../../../src/app.js";

const app = createApp({ skipRateLimit: true });

// Unique clerkId so this test user doesn't collide with other suites running in parallel
const TEST_CLERK_ID = "integration_test_weight_controller_user";
let testUserId: string;

const FAKE_UUID = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";

beforeAll(async () => {
  const user = await prisma.user.upsert({
    where: { clerkId: TEST_CLERK_ID },
    update: {},
    create: { clerkId: TEST_CLERK_ID },
  });
  testUserId = user.id;
});

afterAll(async () => {
  await prisma.weight.deleteMany({ where: { userId: testUserId } });
  await prisma.user.delete({ where: { id: testUserId } });
});

describe("GET /api/v1/weights", () => {
  afterAll(async () => {
    await prisma.weight.deleteMany({ where: { userId: testUserId } });
  });

  // Pagination validation — inline 400s, exact body match
  it("returns 400 when page is missing", async () => {
    await request(app)
      .get("/api/v1/weights")
      .query({})
      .expect("Content-Type", /json/)
      .expect(400)
      .expect({ error: "Page and limit must be positive integers" });
  });

  it("returns 400 when page is not numeric", async () => {
    await request(app)
      .get("/api/v1/weights")
      .query({ page: "notanumber", limit: "5" })
      .expect(400)
      .expect({ error: "Page and limit must be positive integers" });
  });

  it("returns 400 when page is 0 (boundary)", async () => {
    await request(app)
      .get("/api/v1/weights")
      .query({ page: "0", limit: "5" })
      .expect(400)
      .expect({ error: "Page and limit must be positive integers" });
  });

  it("returns 400 when limit is missing", async () => {
    await request(app)
      .get("/api/v1/weights")
      .query({ page: "2" })
      .expect(400)
      .expect({ error: "Page and limit must be positive integers" });
  });

  it("returns 400 when limit is negative", async () => {
    await request(app)
      .get("/api/v1/weights")
      .query({ page: "2", limit: "-100" })
      .expect(400)
      .expect({ error: "Page and limit must be positive integers" });
  });

  it("returns 200 with an empty page shape", async () => {
    await request(app)
      .get("/api/v1/weights")
      .query({ page: 1, limit: 10 })
      .expect("Content-Type", /json/)
      .expect(200)
      .expect((res) => {
        expect(res.body.page).toBe(1);
        expect(res.body.limit).toBe(10);
        expect(res.body.total).toBe(0);
        expect(Array.isArray(res.body.weights)).toBe(true);
      });
  });

  it("returns 200 with weights newest-first (no userId leaked)", async () => {
    await prisma.weight.createMany({
      data: [
        { userId: testUserId, amount: 181, date: new Date("2026-04-15T00:00:00.000Z") },
        { userId: testUserId, amount: 180, date: new Date("2026-04-16T00:00:00.000Z") },
      ],
    });

    await request(app)
      .get("/api/v1/weights")
      .query({ page: 1, limit: 5 })
      .expect(200)
      .expect((res) => {
        expect(res.body.total).toBe(2);
        expect(res.body.weights.map((w: any) => w.date)).toStrictEqual([
          "2026-04-16",
          "2026-04-15",
        ]);
        expect(res.body.weights[0]).not.toHaveProperty("userId");
      });
  });
});

describe("GET /api/v1/weights/range", () => {
  afterAll(async () => {
    await prisma.weight.deleteMany({ where: { userId: testUserId } });
  });

  it("returns 400 when from/to are missing", async () => {
    await request(app)
      .get("/api/v1/weights/range")
      .expect(400)
      .expect({ error: "The FROM and TO dates must both be provided" });
  });

  it("returns 400 when from is after to", async () => {
    await request(app)
      .get("/api/v1/weights/range")
      .query({ from: "2026-03-10", to: "2026-03-01" })
      .expect(400)
      .expect({ error: "The FROM date must be on or before TO" });
  });

  it("returns 400 when the dates are not valid ISO strings", async () => {
    await request(app)
      .get("/api/v1/weights/range")
      .query({ from: "not-a-date", to: "also-bad" })
      .expect(400)
      .expect({ error: "The FROM and TO dates must be valid ISO date strings" });
  });

  it("returns 200 with only the weights inside the window (ascending)", async () => {
    await prisma.weight.createMany({
      data: [
        { userId: testUserId, amount: 181, date: new Date("2026-03-01T00:00:00.000Z") },
        { userId: testUserId, amount: 180, date: new Date("2026-03-05T00:00:00.000Z") },
        { userId: testUserId, amount: 179, date: new Date("2026-03-20T00:00:00.000Z") },
      ],
    });

    await request(app)
      .get("/api/v1/weights/range")
      .query({ from: "2026-03-01", to: "2026-03-10" })
      .expect(200)
      .expect((res) => {
        expect(res.body.total).toBe(2);
        expect(res.body.weights.map((w: any) => w.date)).toStrictEqual([
          "2026-03-01",
          "2026-03-05",
        ]);
      });
  });
});

describe("GET /api/v1/weights/:weightId", () => {
  let weightId: string;

  beforeAll(async () => {
    const weight = await prisma.weight.create({
      data: { userId: testUserId, amount: 175.5, date: new Date("2026-01-01T00:00:00.000Z") },
    });
    weightId = weight.id;
  });

  afterAll(async () => {
    await prisma.weight.deleteMany({ where: { userId: testUserId } });
  });

  it("returns 400 when the weightId param is not a UUID", async () => {
    await request(app)
      .get("/api/v1/weights/notauuid")
      .expect(400)
      .expect({ error: "Invalid weightId" });
  });

  it("returns 404 when no weight matches the id", async () => {
    await request(app)
      .get(`/api/v1/weights/${FAKE_UUID}`)
      .expect(404)
      .expect((res) => {
        expect(res.body.error).toBe(
          `Weight entry with id: ${FAKE_UUID} not found.`,
        );
      });
  });

  it("returns 200 with the weight (id + amount + date, no userId)", async () => {
    await request(app)
      .get(`/api/v1/weights/${weightId}`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toStrictEqual({
          id: weightId,
          amount: 175.5,
          date: "2026-01-01",
        });
      });
  });
});

describe("POST /api/v1/weights", () => {
  afterAll(async () => {
    await prisma.weight.deleteMany({ where: { userId: testUserId } });
  });

  // parseDate runs before the controller, so a missing/invalid date short-circuits
  // with the inline date error before amount is ever validated.
  it("returns 400 when date is missing", async () => {
    await request(app)
      .post("/api/v1/weights")
      .set("Content-Type", "application/json")
      .send({ amount: 180 })
      .expect(400)
      .expect({ error: "Date must be a string in ISO 8601 format" });
  });

  it("returns 400 when date is not valid ISO 8601", async () => {
    await request(app)
      .post("/api/v1/weights")
      .set("Content-Type", "application/json")
      .send({ amount: 180, date: "not-a-date" })
      .expect(400)
      .expect({ error: "Date must be a string in ISO 8601 format" });
  });

  // amount validation throws BadRequestError → errorMiddleware → { error, requestId }
  it("returns 400 when amount is missing", async () => {
    await request(app)
      .post("/api/v1/weights")
      .set("Content-Type", "application/json")
      .send({ date: "2026-01-15T00:00:00.000Z" })
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toBe(
          "Amount is required and must be a positive number",
        );
      });
  });

  it("returns 400 when amount is zero (boundary — must be strictly positive)", async () => {
    await request(app)
      .post("/api/v1/weights")
      .set("Content-Type", "application/json")
      .send({ amount: 0, date: "2026-01-15T00:00:00.000Z" })
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toBe(
          "Amount is required and must be a positive number",
        );
      });
  });

  it("returns 400 when amount is not a number", async () => {
    await request(app)
      .post("/api/v1/weights")
      .set("Content-Type", "application/json")
      .send({ amount: "180", date: "2026-01-15T00:00:00.000Z" })
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toBe(
          "Amount is required and must be a positive number",
        );
      });
  });

  it("returns 201 with the created weight (id + amount + date, no userId)", async () => {
    await request(app)
      .post("/api/v1/weights")
      .set("Content-Type", "application/json")
      .send({ amount: 182.5, date: "2026-01-15T00:00:00.000Z" })
      .expect(201)
      .expect((res) => {
        expect(res.body.id).toBeDefined();
        expect(res.body.amount).toBe(182.5);
        expect(res.body.date).toBe("2026-01-15");
        expect(res.body).not.toHaveProperty("userId");
      });
  });
});

describe("PATCH /api/v1/weights/:weightId", () => {
  let weightId: string;

  beforeAll(async () => {
    const weight = await prisma.weight.create({
      data: { userId: testUserId, amount: 180, date: new Date("2026-02-01T00:00:00.000Z") },
    });
    weightId = weight.id;
  });

  afterAll(async () => {
    await prisma.weight.deleteMany({ where: { userId: testUserId } });
  });

  it("returns 400 when the weightId param is not a UUID", async () => {
    await request(app)
      .patch("/api/v1/weights/notauuid")
      .set("Content-Type", "application/json")
      .send({ amount: 170 })
      .expect(400)
      .expect({ error: "Invalid weightId" });
  });

  it("returns 400 when the date is present but invalid", async () => {
    await request(app)
      .patch(`/api/v1/weights/${weightId}`)
      .set("Content-Type", "application/json")
      .send({ date: "not-a-date" })
      .expect(400)
      .expect({ error: "Date must be a string in ISO 8601 format" });
  });

  it("returns 400 when amount is present but not positive", async () => {
    await request(app)
      .patch(`/api/v1/weights/${weightId}`)
      .set("Content-Type", "application/json")
      .send({ amount: -5 })
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toBe(
          "Amount is required and must be a positive number",
        );
      });
  });

  it("returns 400 when no updatable fields are provided", async () => {
    await request(app)
      .patch(`/api/v1/weights/${weightId}`)
      .set("Content-Type", "application/json")
      .send({})
      .expect(400)
      .expect({ error: "No valid fields to update" });
  });

  it("returns 404 when the weight does not exist", async () => {
    await request(app)
      .patch(`/api/v1/weights/${FAKE_UUID}`)
      .set("Content-Type", "application/json")
      .send({ amount: 170 })
      .expect(404)
      .expect((res) => {
        expect(res.body.error).toBe("Weight entry not found.");
      });
  });

  it("returns 200 with the updated weight", async () => {
    await request(app)
      .patch(`/api/v1/weights/${weightId}`)
      .set("Content-Type", "application/json")
      .send({ amount: 168.5, date: "2026-02-10T00:00:00.000Z" })
      .expect(200)
      .expect((res) => {
        expect(res.body.id).toBe(weightId);
        expect(res.body.amount).toBe(168.5);
        expect(res.body.date).toBe("2026-02-10");
        expect(res.body).not.toHaveProperty("userId");
      });
  });
});

describe("DELETE /api/v1/weights/:weightId", () => {
  afterAll(async () => {
    await prisma.weight.deleteMany({ where: { userId: testUserId } });
  });

  it("returns 400 when the weightId param is not a UUID", async () => {
    await request(app)
      .delete("/api/v1/weights/notauuid")
      .expect(400)
      .expect({ error: "Invalid weightId" });
  });

  it("returns 404 when the weight does not exist", async () => {
    await request(app)
      .delete(`/api/v1/weights/${FAKE_UUID}`)
      .expect(404)
      .expect((res) => {
        expect(res.body.error).toBe("Weight entry not found.");
      });
  });

  it("returns 204 and removes the weight", async () => {
    const weight = await prisma.weight.create({
      data: { userId: testUserId, amount: 180, date: new Date("2026-02-25T00:00:00.000Z") },
    });

    await request(app).delete(`/api/v1/weights/${weight.id}`).expect(204);

    const gone = await prisma.weight.findUnique({ where: { id: weight.id } });
    expect(gone).toBeNull();
  });
});
