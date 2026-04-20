// This call is hoisted so the service is mocked before the import
vi.mock("@clerk/express", () => {
  return {
    clerkMiddleware: () => (req: any, res: Response, next: NextFunction) => {
      req.auth = "integration_test_nutrition_controller_user";
      next();
    },
    getAuth: (req: any) => ({
      isAuthenticated: true,
      userId: req.auth,
    }),
  };
});

import type { Response, NextFunction } from "express";
import { it, describe, vi, beforeAll, afterAll, expect } from "vitest";
import { prisma } from "../../../src/db.js";
import request from "supertest";
import { createApp } from "../../../src/app.js";

const app = createApp({ skipRateLimit: true });

// Unique clerkId so this test user doesn't collide with other test files running in parallel
const TEST_CLERK_ID = "integration_test_nutrition_controller_user";
let testUserId: number;

beforeAll(async () => {
  // Upsert a test user — same pattern as userMiddleware
  const user = await prisma.user.upsert({
    where: { clerkId: TEST_CLERK_ID },
    update: {},
    create: { clerkId: TEST_CLERK_ID },
  });
  testUserId = user.id;
});

afterAll(async () => {
  // Meals cascade-delete when the nutrition log is deleted,
  // so we only need to remove logs then the user
  await prisma.nutritionLog.deleteMany({ where: { userId: testUserId } });
  await prisma.user.delete({ where: { id: testUserId } });
});

describe("GET /api/v1/nutrition", () => {
  // Sending query parameters are always going to be strings when they are sent,
  // so only when they are not provided can they be of another type (undefined)

  // Page query param validation
  it("returns 400 when missing page query parameter / not a string", async () => {
    await request(app)
      .get("/api/v1/nutrition")
      .query({})
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .expect(400)
      .expect({ error: "Missing required parameters" });
  });

  it("returns 400 when page not parsed to number", async () => {
    await request(app)
      .get("/api/v1/nutrition")
      .query({ page: "notanumber", limit: "5" })
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .expect(400)
      .expect({ error: "Page and limit must be positive integers" });
  });

  it("returns 400 when page not parsed to positive number", async () => {
    await request(app)
      .get("/api/v1/nutrition")
      .query({ page: "-999", limit: "5" })
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .expect(400)
      .expect({ error: "Page and limit must be positive integers" });
  });

  it("returns 400 when page not parsed to positive number (boundary)", async () => {
    await request(app)
      .get("/api/v1/nutrition")
      .query({ page: "0", limit: "5" })
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .expect(400)
      .expect({ error: "Page and limit must be positive integers" });
  });

  // Limit query param validation
  it("returns 400 when missing limit query parameter / not a string", async () => {
    await request(app)
      .get("/api/v1/nutrition")
      .query({ page: "2" })
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .expect(400)
      .expect({ error: "Missing required parameters" });
  });

  it("returns 400 when limit not parseable to number", async () => {
    await request(app)
      .get("/api/v1/nutrition")
      .query({ page: "2", limit: "fjklsdjf" })
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .expect(400)
      .expect({ error: "Page and limit must be positive integers" });
  });

  it("returns 400 when limit < 1", async () => {
    await request(app)
      .get("/api/v1/nutrition")
      .query({ page: "2", limit: "-100" })
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .expect(400)
      .expect({ error: "Page and limit must be positive integers" });
  });

  it("returns 400 when limit < 1 (boundary)", async () => {
    await request(app)
      .get("/api/v1/nutrition")
      .query({ page: "2", limit: "0" })
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .expect(400)
      .expect({ error: "Page and limit must be positive integers" });
  });

  // Success states

  it("returns 200 with empty array", async () => {
    await request(app)
      .get("/api/v1/nutrition")
      .query({ page: 1, limit: 10 })
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .expect(200);
  });

  it("returns 200 with 2 logs for the user", async () => {
    const dateOne = new Date("2026-04-15T00:00:00.000Z");
    const dateTwo = new Date("2026-04-16T00:00:00.000Z");
    const log1 = await prisma.nutritionLog.create({
      data: { userId: testUserId, date: dateOne },
    });
    const log2 = await prisma.nutritionLog.create({
      data: { userId: testUserId, date: dateTwo },
    });

    await request(app)
      .get("/api/v1/nutrition")
      .query({ page: 1, limit: 5 })
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .expect(200)
      .expect((res) => {
        expect(res.body.limit).toBe(5);
        expect(res.body.page).toBe(1);
        expect(res.body.total).toBe(2);

        // Check each of the logs (descending order)
        expect(res.body.nutritionLogs[0]?.id).toBe(log2.id);
        expect(res.body.nutritionLogs[0]?.date).toBe(dateTwo.toISOString());
        expect(res.body.nutritionLogs[0]?.userId).toBe(testUserId);

        expect(res.body.nutritionLogs[1]?.id).toBe(log1.id);
        expect(res.body.nutritionLogs[1]?.date).toBe(dateOne.toISOString());
        expect(res.body.nutritionLogs[1]?.userId).toBe(testUserId);
      });
  });
});

// Get NutritionLog By ID

describe("GET /api/v1/nutrition/:id", () => {
  it("returns 400 when id is not a number", async () => {
    await request(app)
      .get("/api/v1/nutrition/notanumber")
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .expect(400)
      .expect({ error: "Invalid log ID" });
  });

  it("returns 404 when log not found", async () => {
    await request(app)
      .get("/api/v1/nutrition/999999999")
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .expect(404)
      .expect({ error: "Nutrition log not found" });
  });

  it("returns 200 with the log", async () => {
    const log = await prisma.nutritionLog.create({
      data: { userId: testUserId, date: new Date("2026-01-01T00:00:00.000Z") },
    });

    await request(app)
      .get(`/api/v1/nutrition/${log.id}`)
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .expect(200)
      .expect((res) => {
        expect(res.body.id).toBe(log.id);
        expect(res.body.userId).toBe(testUserId);
        expect(res.body.date).toBe(
          new Date("2026-01-01T00:00:00.000Z").toISOString(),
        );
      });
  });
});

// Create NutritionLogs

describe("POST /api/v1/nutrition", () => {
  it("returns 400 when missing date", async () => {
    await request(app)
      .post("/api/v1/nutrition")
      .set("Accept", "application/json")
      .set("Content-Type", "application/json")
      .send({})
      .expect("Content-Type", /json/)
      .expect(400)
      .expect({ error: "Missing required parameters" });
  });

  it("returns 400 when date is not a string", async () => {
    await request(app)
      .post("/api/v1/nutrition")
      .set("Accept", "application/json")
      .set("Content-Type", "application/json")
      .send({ date: 12345 })
      .expect("Content-Type", /json/)
      .expect(400)
      .expect({ error: "Date must be a string" });
  });

  it("returns 400 when date is not valid ISO 8601", async () => {
    await request(app)
      .post("/api/v1/nutrition")
      .set("Accept", "application/json")
      .set("Content-Type", "application/json")
      .send({ date: "not-a-date" })
      .expect("Content-Type", /json/)
      .expect(400)
      .expect({ error: "Date must be in ISO 8601 format" });
  });

  it("returns 409 when a log already exists for that date", async () => {
    const date = "2026-01-10T00:00:00.000Z";
    await prisma.nutritionLog.create({
      data: { userId: testUserId, date: new Date(date) },
    });

    await request(app)
      .post("/api/v1/nutrition")
      .set("Accept", "application/json")
      .set("Content-Type", "application/json")
      .send({ date })
      .expect("Content-Type", /json/)
      .expect(409)
      .expect({ error: "A nutrition log at this date already exists." });
  });

  it("returns 201 with the created log", async () => {
    const date = "2026-01-15T00:00:00.000Z";

    await request(app)
      .post("/api/v1/nutrition")
      .set("Accept", "application/json")
      .set("Content-Type", "application/json")
      .send({ date })
      .expect("Content-Type", /json/)
      .expect(201)
      .expect((res) => {
        expect(res.body.id).toBeDefined();
        expect(res.body.userId).toBe(testUserId);
        expect(res.body.date).toBe(date);
      });
  });
});

// Update NutritionLog with an ID

describe("PATCH /api/v1/nutrition/:id", () => {
  it("returns 400 when id is not a number", async () => {
    await request(app)
      .patch("/api/v1/nutrition/notanumber")
      .set("Accept", "application/json")
      .set("Content-Type", "application/json")
      .send({ date: "2026-02-01T00:00:00.000Z" })
      .expect("Content-Type", /json/)
      .expect(400)
      .expect({ error: "Invalid log ID" });
  });

  it("returns 400 when missing date", async () => {
    const log = await prisma.nutritionLog.create({
      data: { userId: testUserId, date: new Date("2026-02-05T00:00:00.000Z") },
    });

    await request(app)
      .patch(`/api/v1/nutrition/${log.id}`)
      .set("Accept", "application/json")
      .set("Content-Type", "application/json")
      .send({})
      .expect("Content-Type", /json/)
      .expect(400)
      .expect({ error: "Missing required parameters" });
  });

  it("returns 400 when date is not valid ISO 8601", async () => {
    const log = await prisma.nutritionLog.create({
      data: { userId: testUserId, date: new Date("2026-02-06T00:00:00.000Z") },
    });

    await request(app)
      .patch(`/api/v1/nutrition/${log.id}`)
      .set("Accept", "application/json")
      .set("Content-Type", "application/json")
      .send({ date: "not-a-date" })
      .expect("Content-Type", /json/)
      .expect(400)
      .expect({ error: "Date must be in ISO 8601 format" });
  });

  it("returns 404 when log not found", async () => {
    await request(app)
      .patch("/api/v1/nutrition/999999999")
      .set("Accept", "application/json")
      .set("Content-Type", "application/json")
      .send({ date: "2026-02-07T00:00:00.000Z" })
      .expect("Content-Type", /json/)
      .expect(404)
      .expect({ error: "Nutrition log not found." });
  });

  it("returns 409 when date conflicts with an existing log", async () => {
    const existing = await prisma.nutritionLog.create({
      data: { userId: testUserId, date: new Date("2026-02-10T00:00:00.000Z") },
    });
    const toUpdate = await prisma.nutritionLog.create({
      data: { userId: testUserId, date: new Date("2026-02-11T00:00:00.000Z") },
    });

    await request(app)
      .patch(`/api/v1/nutrition/${toUpdate.id}`)
      .set("Accept", "application/json")
      .set("Content-Type", "application/json")
      .send({ date: existing.date.toISOString() })
      .expect("Content-Type", /json/)
      .expect(409)
      .expect({ error: "Nutrition log with this date already exists." });
  });

  it("returns 200 with the updated log", async () => {
    const log = await prisma.nutritionLog.create({
      data: { userId: testUserId, date: new Date("2026-02-15T00:00:00.000Z") },
    });
    const newDate = "2026-02-20T00:00:00.000Z";

    await request(app)
      .patch(`/api/v1/nutrition/${log.id}`)
      .set("Accept", "application/json")
      .set("Content-Type", "application/json")
      .send({ date: newDate })
      .expect("Content-Type", /json/)
      .expect(200)
      .expect((res) => {
        expect(res.body.id).toBe(log.id);
        expect(res.body.userId).toBe(testUserId);
        expect(res.body.date).toBe(newDate);
      });
  });
});

describe("DELETE /api/v1/nutrition/:id", () => {
  it("returns 400 when id is not a number", async () => {
    await request(app)
      .delete("/api/v1/nutrition/notanumber")
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .expect(400)
      .expect({ error: "Invalid log ID" });
  });

  it("returns 404 when log not found", async () => {
    await request(app)
      .delete("/api/v1/nutrition/999999999")
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .expect(404)
      .expect({ error: "Nutrition log not found." });
  });

  it("returns 204 when log is deleted", async () => {
    const log = await prisma.nutritionLog.create({
      data: { userId: testUserId, date: new Date("2026-02-25T00:00:00.000Z") },
    });

    await request(app).delete(`/api/v1/nutrition/${log.id}`).expect(204);
  });
});
