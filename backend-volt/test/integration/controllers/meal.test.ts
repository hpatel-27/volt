// Integration tests: meal controller via the real Express app + DB.
// Clerk auth is stubbed so requests resolve to a known test user.
// This call is hoisted so the module is mocked before the import.
vi.mock("@clerk/express", async () => {
  const { makeClerkMock } = await import("../../helpers/clerkMock.js");
  return makeClerkMock("integration_test_meal_controller_user");
});

import { it, describe, vi, beforeAll, afterAll, expect } from "vitest";
import { prisma } from "../../../src/db.js";
import request from "supertest";
import { createApp } from "../../../src/app.js";

const app = createApp({ skipRateLimit: true });

const TEST_CLERK_ID = "integration_test_meal_controller_user";
let testUserId: string;
// The date used as the URL key for the nutrition log
const LOG_DATE = "2026-04-01";
const FAKE_UUID = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";

beforeAll(async () => {
  const user = await prisma.user.upsert({
    where: { clerkId: TEST_CLERK_ID },
    update: {},
    create: { clerkId: TEST_CLERK_ID },
  });
  testUserId = user.id;

  // The nutrition log most meal tests operate on, keyed by LOG_DATE
  await prisma.nutritionLog.create({
    data: { userId: testUserId, date: new Date("2026-04-01T00:00:00.000Z") },
  });
});

afterAll(async () => {
  // Meals cascade-delete with their nutrition log
  await prisma.nutritionLog.deleteMany({ where: { userId: testUserId } });
  await prisma.user.delete({ where: { id: testUserId } });
});

async function getLogId(): Promise<string> {
  const log = await prisma.nutritionLog.findFirstOrThrow({
    where: { userId: testUserId, date: new Date("2026-04-01T00:00:00.000Z") },
  });
  return log.id;
}

describe("GET /api/v1/nutrition-logs/:date/meals", () => {
  it("returns 400 when the date is not YYYY-MM-DD", async () => {
    await request(app)
      .get(`/api/v1/nutrition-logs/notadate/meals`)
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toContain("YYYY-MM-DD");
      });
  });

  it("returns 404 when the date has no log", async () => {
    await request(app)
      .get(`/api/v1/nutrition-logs/2000-01-01/meals`)
      .expect(404)
      .expect((res) => {
        expect(res.body.error).toBe("Nutrition log not found.");
      });
  });

  it("returns 200 with a { meals: [] } shape", async () => {
    await request(app)
      .get(`/api/v1/nutrition-logs/${LOG_DATE}/meals`)
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body.meals)).toBe(true);
      });
  });
});

describe("GET /api/v1/nutrition-logs/:date/meals/:mealId", () => {
  afterAll(async () => {
    await prisma.meal.deleteMany({
      where: { nutritionLogId: await getLogId() },
    });
  });

  it("returns 400 when the date is not YYYY-MM-DD", async () => {
    await request(app)
      .get(`/api/v1/nutrition-logs/notadate/meals/${FAKE_UUID}`)
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toContain("YYYY-MM-DD");
      });
  });

  it("returns 400 when mealId is not a UUID", async () => {
    await request(app)
      .get(`/api/v1/nutrition-logs/${LOG_DATE}/meals/notauuid`)
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toBe("Invalid mealId");
      });
  });

  it("returns 404 when the date has no log", async () => {
    const logId = await getLogId();
    const meal = await prisma.meal.create({
      data: {
        nutritionLogId: logId,
        name: "Greek Yogurt",
        calories: 140,
        protein: 20,
        carbs: 9,
        fat: 3,
      },
    });

    await request(app)
      .get(`/api/v1/nutrition-logs/2000-01-01/meals/${meal.id}`)
      .expect(404)
      .expect((res) => {
        expect(res.body.error).toBe("Nutrition log not found.");
      });
  });

  it("returns 404 when the meal does not exist", async () => {
    await request(app)
      .get(`/api/v1/nutrition-logs/${LOG_DATE}/meals/${FAKE_UUID}`)
      .expect(404)
      .expect((res) => {
        expect(res.body.error).toBe(`Meal with id: ${FAKE_UUID} not found.`);
      });
  });

  it("returns 200 with the meal (no nutritionLogId leaked)", async () => {
    const logId = await getLogId();
    const meal = await prisma.meal.create({
      data: {
        nutritionLogId: logId,
        name: "Greek Yogurt",
        calories: 140,
        protein: 20,
        carbs: 9,
        fat: 3,
      },
    });

    await request(app)
      .get(`/api/v1/nutrition-logs/${LOG_DATE}/meals/${meal.id}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.id).toBe(meal.id);
        expect(res.body.name).toBe("Greek Yogurt");
        expect(res.body.calories).toBe(140);
        expect(res.body.protein).toBe(20);
        expect(res.body.carbs).toBe(9);
        expect(res.body.fat).toBe(3);
        expect(res.body).not.toHaveProperty("nutritionLogId");
      });
  });
});

describe("POST /api/v1/nutrition-logs/:date/meals", () => {
  const validMeal = {
    name: "Oatmeal",
    calories: 300,
    protein: 10,
    carbs: 54,
    fat: 6,
  };

  afterAll(async () => {
    await prisma.meal.deleteMany({
      where: { nutritionLogId: await getLogId() },
    });
  });

  it("returns 400 when the date is not YYYY-MM-DD", async () => {
    await request(app)
      .post(`/api/v1/nutrition-logs/notadate/meals`)
      .set("Content-Type", "application/json")
      .send(validMeal)
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toContain("YYYY-MM-DD");
      });
  });

  // Name validation is handled inline -> exact { error } body (no requestId)
  it("returns 400 when name is missing", async () => {
    await request(app)
      .post(`/api/v1/nutrition-logs/${LOG_DATE}/meals`)
      .set("Content-Type", "application/json")
      .send({ calories: 300, protein: 10, carbs: 54, fat: 6 })
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toContain("Name");
      });
  });

  it("returns 400 when name is an empty string", async () => {
    await request(app)
      .post(`/api/v1/nutrition-logs/${LOG_DATE}/meals`)
      .set("Content-Type", "application/json")
      .send({ ...validMeal, name: "" })
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toContain("Name");
      });
  });

  // Macro validation is delegated to validateNonNegativeNumber, which throws a
  // BadRequestError -> the body carries { error, requestId }, so assert on res.body.error.
  it.each([
    ["calories", { name: "Oatmeal", protein: 10, carbs: 54, fat: 6 }],
    ["protein", { name: "Oatmeal", calories: 300, carbs: 54, fat: 6 }],
    ["carbs", { name: "Oatmeal", calories: 300, protein: 10, fat: 6 }],
    ["fat", { name: "Oatmeal", calories: 300, protein: 10, carbs: 54 }],
  ])("returns 400 when %s is missing", async (field, body) => {
    await request(app)
      .post(`/api/v1/nutrition-logs/${LOG_DATE}/meals`)
      .set("Content-Type", "application/json")
      .send(body)
      .expect(400)
      .expect((res) => {
        expect(res.body.error.toLowerCase()).toContain(field);
      });
  });

  it.each([
    ["calories", { ...validMeal, calories: -1 }],
    ["protein", { ...validMeal, protein: -1 }],
    ["carbs", { ...validMeal, carbs: -1 }],
    ["fat", { ...validMeal, fat: -1 }],
  ])("returns 400 when %s is negative", async (field, body) => {
    await request(app)
      .post(`/api/v1/nutrition-logs/${LOG_DATE}/meals`)
      .set("Content-Type", "application/json")
      .send(body)
      .expect(400)
      .expect((res) => {
        expect(res.body.error.toLowerCase()).toContain(field);
      });
  });

  it("auto-creates the parent log when none exists and returns 201", async () => {
    // createMeal uses findOrCreateNutritionLogByDate, so posting to a fresh date
    // creates the log rather than 404-ing.
    const freshDate = "2020-08-08";
    await request(app)
      .post(`/api/v1/nutrition-logs/${freshDate}/meals`)
      .set("Content-Type", "application/json")
      .send(validMeal)
      .expect(201)
      .expect((res) => {
        expect(res.body.id).toBeDefined();
        expect(res.body.name).toBe("Oatmeal");
      });

    const createdLog = await prisma.nutritionLog.findUnique({
      where: { userId_date: { userId: testUserId, date: new Date(freshDate) } },
    });
    expect(createdLog).not.toBeNull();

    // cleanup the extra log (and its meal via cascade)
    await prisma.nutritionLog.delete({ where: { id: createdLog!.id } });
  });

  it("returns 201 with the created meal (no nutritionLogId leaked)", async () => {
    await request(app)
      .post(`/api/v1/nutrition-logs/${LOG_DATE}/meals`)
      .set("Content-Type", "application/json")
      .send(validMeal)
      .expect(201)
      .expect((res) => {
        expect(res.body.id).toBeDefined();
        expect(res.body.name).toBe(validMeal.name);
        expect(res.body.calories).toBe(validMeal.calories);
        expect(res.body.protein).toBe(validMeal.protein);
        expect(res.body.carbs).toBe(validMeal.carbs);
        expect(res.body.fat).toBe(validMeal.fat);
        expect(res.body).not.toHaveProperty("nutritionLogId");
      });
  });
});

describe("PATCH /api/v1/nutrition-logs/:date/meals/:mealId", () => {
  afterAll(async () => {
    await prisma.meal.deleteMany({
      where: { nutritionLogId: await getLogId() },
    });
  });

  // Helper to seed a meal for the shared log
  async function seedMeal() {
    const logId = await getLogId();
    return prisma.meal.create({
      data: {
        nutritionLogId: logId,
        name: "Banana",
        calories: 90,
        protein: 1,
        carbs: 23,
        fat: 0,
      },
    });
  }

  it("returns 400 when the date is not YYYY-MM-DD", async () => {
    await request(app)
      .patch(`/api/v1/nutrition-logs/notadate/meals/${FAKE_UUID}`)
      .set("Content-Type", "application/json")
      .send({ name: "Updated" })
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toContain("YYYY-MM-DD");
      });
  });

  it("returns 400 when mealId is not a UUID", async () => {
    await request(app)
      .patch(`/api/v1/nutrition-logs/${LOG_DATE}/meals/notauuid`)
      .set("Content-Type", "application/json")
      .send({ name: "Updated" })
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toBe("Invalid mealId");
      });
  });

  it("returns 400 when no valid fields are provided", async () => {
    const meal = await seedMeal();
    await request(app)
      .patch(`/api/v1/nutrition-logs/${LOG_DATE}/meals/${meal.id}`)
      .set("Content-Type", "application/json")
      .send({})
      .expect(400)
      .expect({ error: "No valid fields were provided to update." });
  });

  it("returns 400 when name is an empty string", async () => {
    const meal = await seedMeal();
    await request(app)
      .patch(`/api/v1/nutrition-logs/${LOG_DATE}/meals/${meal.id}`)
      .set("Content-Type", "application/json")
      .send({ name: "" })
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toContain("Name");
      });
  });

  it.each([["calories"], ["protein"], ["carbs"], ["fat"]])(
    "returns 400 when %s is negative",
    async (field) => {
      const meal = await seedMeal();
      await request(app)
        .patch(`/api/v1/nutrition-logs/${LOG_DATE}/meals/${meal.id}`)
        .set("Content-Type", "application/json")
        .send({ [field]: -1 })
        .expect(400)
        .expect((res) => {
          expect(res.body.error.toLowerCase()).toContain(field);
        });
    },
  );

  it("returns 404 when the date has no log", async () => {
    const meal = await seedMeal();
    await request(app)
      .patch(`/api/v1/nutrition-logs/2000-01-01/meals/${meal.id}`)
      .set("Content-Type", "application/json")
      .send({ name: "Updated" })
      .expect(404)
      .expect((res) => {
        expect(res.body.error).toBe("Nutrition log not found.");
      });
  });

  it("returns 404 when the meal does not exist", async () => {
    await request(app)
      .patch(`/api/v1/nutrition-logs/${LOG_DATE}/meals/${FAKE_UUID}`)
      .set("Content-Type", "application/json")
      .send({ name: "Updated" })
      .expect(404)
      .expect((res) => {
        expect(res.body.error).toBe("Meal not found.");
      });
  });

  it("returns 200 with the updated meal", async () => {
    const meal = await seedMeal();
    await request(app)
      .patch(`/api/v1/nutrition-logs/${LOG_DATE}/meals/${meal.id}`)
      .set("Content-Type", "application/json")
      .send({ name: "Banana Updated", calories: 100 })
      .expect(200)
      .expect((res) => {
        expect(res.body.id).toBe(meal.id);
        expect(res.body.name).toBe("Banana Updated");
        expect(res.body.calories).toBe(100);
        expect(res.body.protein).toBe(1); // unchanged
        expect(res.body).not.toHaveProperty("nutritionLogId");
      });
  });
});

describe("DELETE /api/v1/nutrition-logs/:date/meals/:mealId", () => {
  afterAll(async () => {
    await prisma.meal.deleteMany({
      where: { nutritionLogId: await getLogId() },
    });
  });

  async function seedMeal() {
    const logId = await getLogId();
    return prisma.meal.create({
      data: {
        nutritionLogId: logId,
        name: "Apple",
        calories: 80,
        protein: 0,
        carbs: 21,
        fat: 0,
      },
    });
  }

  it("returns 400 when the date is not YYYY-MM-DD", async () => {
    await request(app)
      .delete(`/api/v1/nutrition-logs/notadate/meals/${FAKE_UUID}`)
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toContain("YYYY-MM-DD");
      });
  });

  it("returns 400 when mealId is not a UUID", async () => {
    await request(app)
      .delete(`/api/v1/nutrition-logs/${LOG_DATE}/meals/notauuid`)
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toBe("Invalid mealId");
      });
  });

  it("returns 404 when the date has no log", async () => {
    const meal = await seedMeal();
    await request(app)
      .delete(`/api/v1/nutrition-logs/2000-01-01/meals/${meal.id}`)
      .expect(404)
      .expect((res) => {
        expect(res.body.error).toBe("Nutrition log not found.");
      });
  });

  it("returns 404 when the meal does not exist", async () => {
    await request(app)
      .delete(`/api/v1/nutrition-logs/${LOG_DATE}/meals/${FAKE_UUID}`)
      .expect(404)
      .expect((res) => {
        expect(res.body.error).toBe("Meal not found.");
      });
  });

  it("returns 204 and removes the meal", async () => {
    const meal = await seedMeal();
    await request(app)
      .delete(`/api/v1/nutrition-logs/${LOG_DATE}/meals/${meal.id}`)
      .expect(204);

    const gone = await prisma.meal.findUnique({ where: { id: meal.id } });
    expect(gone).toBeNull();
  });
});
