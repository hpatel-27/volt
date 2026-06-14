// Integration tests: nutrition controller via the real Express app + DB.
// Clerk auth is stubbed so requests resolve to a known test user.
// This call is hoisted so the module is mocked before the import.
vi.mock("@clerk/express", async () => {
  const { makeClerkMock } = await import("../../helpers/clerkMock.js");
  return makeClerkMock("integration_test_nutrition_controller_user");
});

import { it, describe, vi, beforeAll, afterAll, expect } from "vitest";
import { prisma } from "../../../src/db.js";
import request from "supertest";
import { createApp } from "../../../src/app.js";

const app = createApp({ skipRateLimit: true });

// Unique clerkId so this test user doesn't collide with other suites running in parallel
const TEST_CLERK_ID = "integration_test_nutrition_controller_user";
let testUserId: string;

beforeAll(async () => {
  const user = await prisma.user.upsert({
    where: { clerkId: TEST_CLERK_ID },
    update: {},
    create: { clerkId: TEST_CLERK_ID },
  });
  testUserId = user.id;
});

afterAll(async () => {
  // Meals cascade-delete with their nutrition log, so removing logs then the user is enough
  await prisma.nutritionLog.deleteMany({ where: { userId: testUserId } });
  await prisma.user.delete({ where: { id: testUserId } });
});

describe("GET /api/v1/nutrition-logs", () => {
  // Query params arrive as strings; only omission yields a non-string (undefined).

  // Page param validation
  it("returns 400 when page is missing", async () => {
    await request(app)
      .get("/api/v1/nutrition-logs")
      .query({})
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .expect(400)
      .expect({ error: "Page and limit must be positive integers" });
  });

  it("returns 400 when page is not numeric", async () => {
    await request(app)
      .get("/api/v1/nutrition-logs")
      .query({ page: "notanumber", limit: "5" })
      .expect(400)
      .expect({ error: "Page and limit must be positive integers" });
  });

  it("returns 400 when page is negative", async () => {
    await request(app)
      .get("/api/v1/nutrition-logs")
      .query({ page: "-999", limit: "5" })
      .expect(400)
      .expect({ error: "Page and limit must be positive integers" });
  });

  it("returns 400 when page is 0 (boundary)", async () => {
    await request(app)
      .get("/api/v1/nutrition-logs")
      .query({ page: "0", limit: "5" })
      .expect(400)
      .expect({ error: "Page and limit must be positive integers" });
  });

  // Limit param validation
  it("returns 400 when limit is missing", async () => {
    await request(app)
      .get("/api/v1/nutrition-logs")
      .query({ page: "2" })
      .expect(400)
      .expect({ error: "Page and limit must be positive integers" });
  });

  it("returns 400 when limit is not numeric", async () => {
    await request(app)
      .get("/api/v1/nutrition-logs")
      .query({ page: "2", limit: "fjklsdjf" })
      .expect(400)
      .expect({ error: "Page and limit must be positive integers" });
  });

  it("returns 400 when limit is negative", async () => {
    await request(app)
      .get("/api/v1/nutrition-logs")
      .query({ page: "2", limit: "-100" })
      .expect(400)
      .expect({ error: "Page and limit must be positive integers" });
  });

  it("returns 400 when limit is 0 (boundary)", async () => {
    await request(app)
      .get("/api/v1/nutrition-logs")
      .query({ page: "2", limit: "0" })
      .expect(400)
      .expect({ error: "Page and limit must be positive integers" });
  });

  // Success states
  it("returns 200 with an empty page shape", async () => {
    await request(app)
      .get("/api/v1/nutrition-logs")
      .query({ page: 1, limit: 10 })
      .expect("Content-Type", /json/)
      .expect(200)
      .expect((res) => {
        expect(res.body.page).toBe(1);
        expect(res.body.limit).toBe(10);
        expect(Array.isArray(res.body.nutritionLogs)).toBe(true);
      });
  });

  it("returns 200 with summaries (totals + mealCount) in descending date order", async () => {
    const earlier = await prisma.nutritionLog.create({
      data: { userId: testUserId, date: new Date("2026-04-15T00:00:00.000Z") },
    });
    const later = await prisma.nutritionLog.create({
      data: { userId: testUserId, date: new Date("2026-04-16T00:00:00.000Z") },
    });
    await prisma.meal.create({
      data: { nutritionLogId: later.id, name: "Lunch", calories: 700, protein: 40, carbs: 80, fat: 20 },
    });

    await request(app)
      .get("/api/v1/nutrition-logs")
      .query({ page: 1, limit: 5 })
      .expect(200)
      .expect((res) => {
        expect(res.body.limit).toBe(5);
        expect(res.body.page).toBe(1);
        expect(res.body.total).toBeGreaterThanOrEqual(2);

        const byId = Object.fromEntries(
          res.body.nutritionLogs.map((l: any) => [l.id, l]),
        );
        expect(byId[later.id].mealCount).toBe(1);
        expect(byId[later.id].totals).toStrictEqual({
          calories: 700,
          protein: 40,
          carbs: 80,
          fat: 20,
        });
        expect(byId[earlier.id].mealCount).toBe(0);
        // summaries never leak userId
        expect(byId[later.id]).not.toHaveProperty("userId");
      });

    await prisma.nutritionLog.deleteMany({ where: { userId: testUserId } });
  });
});

describe("GET /api/v1/nutrition-logs/range", () => {
  afterAll(async () => {
    await prisma.nutritionLog.deleteMany({ where: { userId: testUserId } });
  });

  it("returns 400 when from/to are missing", async () => {
    await request(app)
      .get("/api/v1/nutrition-logs/range")
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toContain("both be provided");
      });
  });

  it("returns 400 when the range exceeds the 14-day maximum", async () => {
    await request(app)
      .get("/api/v1/nutrition-logs/range")
      .query({ from: "2026-01-01", to: "2026-02-01" })
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toContain("maximum of");
      });
  });

  it("returns 200 with only the logs inside the window (ascending)", async () => {
    await prisma.nutritionLog.createMany({
      data: [
        { userId: testUserId, date: new Date("2026-03-01T00:00:00.000Z") },
        { userId: testUserId, date: new Date("2026-03-05T00:00:00.000Z") },
        { userId: testUserId, date: new Date("2026-03-20T00:00:00.000Z") },
      ],
    });

    await request(app)
      .get("/api/v1/nutrition-logs/range")
      .query({ from: "2026-03-01", to: "2026-03-10" })
      .expect(200)
      .expect((res) => {
        expect(res.body.total).toBe(2);
        expect(res.body.logs.map((l: any) => l.date)).toStrictEqual([
          "2026-03-01",
          "2026-03-05",
        ]);
      });
  });
});

describe("GET /api/v1/nutrition-logs/today", () => {
  afterAll(async () => {
    await prisma.nutritionLog.deleteMany({ where: { userId: testUserId } });
  });

  it("returns 400 when the date query param is malformed", async () => {
    await request(app)
      .get("/api/v1/nutrition-logs/today")
      .query({ date: "04-13-2026" })
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toBe(
          "date query param must be in YYYY-MM-DD format",
        );
      });
  });

  it("returns 200 with null when nothing is logged today", async () => {
    await request(app)
      .get("/api/v1/nutrition-logs/today")
      .query({ date: "2099-12-31" })
      .expect(200)
      .expect((res) => {
        expect(res.body ?? null).toBeNull();
      });
  });

  it("returns 200 with the day's summary when a log exists", async () => {
    const log = await prisma.nutritionLog.create({
      data: { userId: testUserId, date: new Date("2026-07-07T00:00:00.000Z") },
    });
    await prisma.meal.create({
      data: { nutritionLogId: log.id, name: "Snack", calories: 250, protein: 12, carbs: 20, fat: 10 },
    });

    await request(app)
      .get("/api/v1/nutrition-logs/today")
      .query({ date: "2026-07-07" })
      .expect(200)
      .expect((res) => {
        expect(res.body.id).toBe(log.id);
        expect(res.body.date).toBe("2026-07-07");
        expect(res.body.mealCount).toBe(1);
        expect(res.body.totals).toStrictEqual({
          calories: 250,
          protein: 12,
          carbs: 20,
          fat: 10,
        });
      });
  });
});

describe("GET /api/v1/nutrition-logs/:date", () => {
  afterAll(async () => {
    await prisma.nutritionLog.deleteMany({ where: { userId: testUserId } });
  });

  it("returns 400 when the date param is not YYYY-MM-DD", async () => {
    await request(app)
      .get("/api/v1/nutrition-logs/notadate")
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toContain("YYYY-MM-DD");
      });
  });

  it("returns 404 when no log exists for that date", async () => {
    await request(app)
      .get("/api/v1/nutrition-logs/2000-01-01")
      .expect(404)
      .expect((res) => {
        expect(res.body.error).toBe("Nutrition log not found.");
      });
  });

  it("returns 200 with the log and its meals (no userId)", async () => {
    const log = await prisma.nutritionLog.create({
      data: { userId: testUserId, date: new Date("2026-01-01T00:00:00.000Z") },
    });
    await prisma.meal.create({
      data: { nutritionLogId: log.id, name: "Eggs", calories: 150, protein: 13, carbs: 1, fat: 10 },
    });

    await request(app)
      .get("/api/v1/nutrition-logs/2026-01-01")
      .expect(200)
      .expect((res) => {
        expect(res.body.id).toBe(log.id);
        expect(res.body.date).toBe("2026-01-01");
        expect(res.body).not.toHaveProperty("userId");
        expect(res.body.meals).toHaveLength(1);
        expect(res.body.meals[0].name).toBe("Eggs");
        expect(res.body.meals[0]).not.toHaveProperty("nutritionLogId");
      });
  });
});

describe("POST /api/v1/nutrition-logs", () => {
  afterAll(async () => {
    await prisma.nutritionLog.deleteMany({ where: { userId: testUserId } });
  });

  it("returns 400 when date is missing", async () => {
    await request(app)
      .post("/api/v1/nutrition-logs")
      .set("Content-Type", "application/json")
      .send({})
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toContain("ISO 8601");
      });
  });

  it("returns 400 when date is not a string", async () => {
    await request(app)
      .post("/api/v1/nutrition-logs")
      .set("Content-Type", "application/json")
      .send({ date: 12345 })
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toContain("ISO 8601");
      });
  });

  it("returns 400 when date is not valid ISO 8601", async () => {
    await request(app)
      .post("/api/v1/nutrition-logs")
      .set("Content-Type", "application/json")
      .send({ date: "not-a-date" })
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toContain("ISO 8601");
      });
  });

  it("returns 409 when a log already exists for that date", async () => {
    const date = "2026-01-10";
    await prisma.nutritionLog.create({
      data: { userId: testUserId, date: new Date(date) },
    });

    await request(app)
      .post("/api/v1/nutrition-logs")
      .set("Content-Type", "application/json")
      .send({ date })
      .expect(409)
      .expect((res) => {
        expect(res.body.error).toBe(
          "A nutrition log at this date already exists.",
        );
      });
  });

  it("returns 201 with the created log (id + date, no userId)", async () => {
    const date = "2026-01-15";

    await request(app)
      .post("/api/v1/nutrition-logs")
      .set("Content-Type", "application/json")
      .send({ date })
      .expect(201)
      .expect((res) => {
        expect(res.body.id).toBeDefined();
        expect(res.body.date).toBe("2026-01-15");
        expect(res.body).not.toHaveProperty("userId");
      });
  });
});

describe("PATCH /api/v1/nutrition-logs/:date", () => {
  it("returns 400 when the date param is not YYYY-MM-DD", async () => {
    await request(app)
      .patch("/api/v1/nutrition-logs/notadate")
      .set("Content-Type", "application/json")
      .send({})
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toContain("YYYY-MM-DD");
      });
  });

  it("returns 405 because the date is the URL key and cannot be changed", async () => {
    await request(app)
      .patch("/api/v1/nutrition-logs/2026-02-01")
      .set("Content-Type", "application/json")
      .send({})
      .expect(405)
      .expect({
        error:
          "Nutrition log date cannot be changed. To move a log, delete it and create a new one.",
      });
  });
});

describe("DELETE /api/v1/nutrition-logs/:date", () => {
  afterAll(async () => {
    await prisma.nutritionLog.deleteMany({ where: { userId: testUserId } });
  });

  it("returns 400 when the date param is not YYYY-MM-DD", async () => {
    await request(app)
      .delete("/api/v1/nutrition-logs/notadate")
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toContain("YYYY-MM-DD");
      });
  });

  it("returns 404 when no log exists for that date", async () => {
    await request(app)
      .delete("/api/v1/nutrition-logs/2000-01-01")
      .expect(404)
      .expect((res) => {
        expect(res.body.error).toBe("Nutrition log not found.");
      });
  });

  it("returns 204 and removes the log", async () => {
    await prisma.nutritionLog.create({
      data: { userId: testUserId, date: new Date("2026-02-25T00:00:00.000Z") },
    });

    await request(app).delete("/api/v1/nutrition-logs/2026-02-25").expect(204);

    const gone = await prisma.nutritionLog.findUnique({
      where: {
        userId_date: { userId: testUserId, date: new Date("2026-02-25") },
      },
    });
    expect(gone).toBeNull();
  });
});
