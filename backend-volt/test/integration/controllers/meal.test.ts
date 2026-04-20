// This call is hoisted so the service is mocked before the import
vi.mock("@clerk/express", () => {
  return {
    clerkMiddleware: () => (req: any, res: Response, next: NextFunction) => {
      req.auth = "integration_test_meal_controller_user";
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
const TEST_CLERK_ID = "integration_test_meal_controller_user";
let testUserId: number;
let logId: number;

beforeAll(async () => {
  // Upsert a test user — same pattern as userMiddleware
  const user = await prisma.user.upsert({
    where: { clerkId: TEST_CLERK_ID },
    update: {},
    create: { clerkId: TEST_CLERK_ID },
  });
  testUserId = user.id;

  const log = await prisma.nutritionLog.create({
    data: { userId: testUserId, date: new Date("2026-04-01T00:00:00.000Z") },
  });
  logId = log.id;
});

afterAll(async () => {
  // Meals cascade-delete when the nutrition log is deleted,
  // so we only need to remove logs then the user
  await prisma.nutritionLog.deleteMany({ where: { userId: testUserId } });
  await prisma.user.delete({ where: { id: testUserId } });
});

// GET all meals for a specific nutrition log (there are no query parameters for this)

describe("GET /api/v1/nutrition/:logId/meals", () => {
  it("returns 400 when logId is not a number", async () => {
    await request(app)
      .get(`/api/v1/nutrition/notanumber/meals`)
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .expect(400)
      .expect({ error: "Invalid log ID" });
  });

  it("returns 404 when logId not found", async () => {
    await request(app)
      .get(`/api/v1/nutrition/999999/meals`)
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .expect(404)
      .expect({ error: "Log with id: 999999 not found." });
  });

  it("returns 200 with empty array", async () => {
    await request(app)
      .get(`/api/v1/nutrition/${logId}/meals`)
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .expect(200);
  });
});

// GET a meal by id from a nutrition log
describe("GET /api/v1/nutrition/:logId/meals/:mealId", () => {
  it("returns 400 when logId is not a number", async () => {
    await request(app)
      .get(`/api/v1/nutrition/notanumber/meals/1`)
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .expect(400)
      .expect({ error: "Invalid log ID" });
  });

  it("returns 400 when mealId is not a number", async () => {
    await request(app)
      .get(`/api/v1/nutrition/${logId}/meals/notanumber`)
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .expect(400)
      .expect({ error: "Invalid meal ID" });
  });

  it("returns 404 when logId is not found", async () => {
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
      .get(`/api/v1/nutrition/999999/meals/${meal.id}`)
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .expect(404)
      .expect({ error: "Log with id: 999999 not found." });
  });

  it("returns 404 when mealId is not found", async () => {
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
      .get(`/api/v1/nutrition/${logId}/meals/999999`)
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .expect(404)
      .expect({ error: "Meal with id: 999999 not found." });
  });

  it("returns 200 and the meal with the id", async () => {
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
      .get(`/api/v1/nutrition/${logId}/meals/${meal.id}`)
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .expect(200)
      .expect((res) => {
        expect(res.body.nutritionLogId).toBe(logId);
        expect(res.body.name).toBe("Greek Yogurt");
        expect(res.body.calories).toBe(140);
        expect(res.body.protein).toBe(20);
        expect(res.body.carbs).toBe(9);
        expect(res.body.fat).toBe(3);
      });
  });
});

// POST a meal to a nutrition log
describe("POST /api/v1/nutrition/:logId/meals", () => {
  const validMeal = {
    name: "Oatmeal",
    calories: 300,
    protein: 10,
    carbs: 54,
    fat: 6,
  };

  it("returns 400 when logId is not a number", async () => {
    await request(app)
      .post(`/api/v1/nutrition/notanumber/meals`)
      .set("Accept", "application/json")
      .set("Content-Type", "application/json")
      .send(validMeal)
      .expect("Content-Type", /json/)
      .expect(400)
      .expect({ error: "Invalid log ID" });
  });

  it("returns 400 when name is missing", async () => {
    await request(app)
      .post(`/api/v1/nutrition/${logId}/meals`)
      .set("Accept", "application/json")
      .set("Content-Type", "application/json")
      .send({ calories: 300, protein: 10, carbs: 54, fat: 6 })
      .expect("Content-Type", /json/)
      .expect(400)
      .expect({
        error: "Name is a required parameter and cannot be an empty string.",
      });
  });

  it("returns 400 when name is an empty string", async () => {
    await request(app)
      .post(`/api/v1/nutrition/${logId}/meals`)
      .set("Accept", "application/json")
      .set("Content-Type", "application/json")
      .send({ ...validMeal, name: "" })
      .expect("Content-Type", /json/)
      .expect(400)
      .expect({
        error: "Name is a required parameter and cannot be an empty string.",
      });
  });

  it("returns 400 when calories is missing", async () => {
    await request(app)
      .post(`/api/v1/nutrition/${logId}/meals`)
      .set("Accept", "application/json")
      .set("Content-Type", "application/json")
      .send({ name: "Oatmeal", protein: 10, carbs: 54, fat: 6 })
      .expect("Content-Type", /json/)
      .expect(400)
      .expect({ error: "Calories is a required parameter." });
  });

  it("returns 400 when calories is negative", async () => {
    await request(app)
      .post(`/api/v1/nutrition/${logId}/meals`)
      .set("Accept", "application/json")
      .set("Content-Type", "application/json")
      .send({ ...validMeal, calories: -1 })
      .expect("Content-Type", /json/)
      .expect(400)
      .expect({ error: "Calories is a required parameter." });
  });

  it("returns 400 when protein is missing", async () => {
    await request(app)
      .post(`/api/v1/nutrition/${logId}/meals`)
      .set("Accept", "application/json")
      .set("Content-Type", "application/json")
      .send({ name: "Oatmeal", calories: 300, carbs: 54, fat: 6 })
      .expect("Content-Type", /json/)
      .expect(400)
      .expect({ error: "Protein is a required parameter." });
  });

  it("returns 400 when protein is negative", async () => {
    await request(app)
      .post(`/api/v1/nutrition/${logId}/meals`)
      .set("Accept", "application/json")
      .set("Content-Type", "application/json")
      .send({ ...validMeal, protein: -1 })
      .expect("Content-Type", /json/)
      .expect(400)
      .expect({ error: "Protein is a required parameter." });
  });

  it("returns 400 when carbs is missing", async () => {
    await request(app)
      .post(`/api/v1/nutrition/${logId}/meals`)
      .set("Accept", "application/json")
      .set("Content-Type", "application/json")
      .send({ name: "Oatmeal", calories: 300, protein: 10, fat: 6 })
      .expect("Content-Type", /json/)
      .expect(400)
      .expect({ error: "Carbs is a required parameter." });
  });

  it("returns 400 when carbs is negative", async () => {
    await request(app)
      .post(`/api/v1/nutrition/${logId}/meals`)
      .set("Accept", "application/json")
      .set("Content-Type", "application/json")
      .send({ ...validMeal, carbs: -1 })
      .expect("Content-Type", /json/)
      .expect(400)
      .expect({ error: "Carbs is a required parameter." });
  });

  it("returns 400 when fat is missing", async () => {
    await request(app)
      .post(`/api/v1/nutrition/${logId}/meals`)
      .set("Accept", "application/json")
      .set("Content-Type", "application/json")
      .send({ name: "Oatmeal", calories: 300, protein: 10, carbs: 54 })
      .expect("Content-Type", /json/)
      .expect(400)
      .expect({ error: "Fat is a required parameter." });
  });

  it("returns 400 when fat is negative", async () => {
    await request(app)
      .post(`/api/v1/nutrition/${logId}/meals`)
      .set("Accept", "application/json")
      .set("Content-Type", "application/json")
      .send({ ...validMeal, fat: -1 })
      .expect("Content-Type", /json/)
      .expect(400)
      .expect({ error: "Fat is a required parameter." });
  });

  it("returns 404 when logId not found", async () => {
    await request(app)
      .post(`/api/v1/nutrition/999999/meals`)
      .set("Accept", "application/json")
      .set("Content-Type", "application/json")
      .send(validMeal)
      .expect("Content-Type", /json/)
      .expect(404)
      .expect({ error: "Log associated to this meal does not exist." });
  });

  it("returns 201 with the created meal", async () => {
    await request(app)
      .post(`/api/v1/nutrition/${logId}/meals`)
      .set("Accept", "application/json")
      .set("Content-Type", "application/json")
      .send(validMeal)
      .expect("Content-Type", /json/)
      .expect(201)
      .expect((res) => {
        expect(res.body.nutritionLogId).toBe(logId);
        expect(res.body.name).toBe(validMeal.name);
        expect(res.body.calories).toBe(validMeal.calories);
        expect(res.body.protein).toBe(validMeal.protein);
        expect(res.body.carbs).toBe(validMeal.carbs);
        expect(res.body.fat).toBe(validMeal.fat);
      });
  });
});

// PATCH a meal in a nutrition log
describe("PATCH /api/v1/nutrition/:logId/meals/:mealId", () => {
  it("returns 400 when logId is not a number", async () => {
    await request(app)
      .patch(`/api/v1/nutrition/notanumber/meals/1`)
      .set("Accept", "application/json")
      .set("Content-Type", "application/json")
      .send({ name: "Updated" })
      .expect("Content-Type", /json/)
      .expect(400)
      .expect({ error: "Invalid log ID" });
  });

  it("returns 400 when mealId is not a number", async () => {
    await request(app)
      .patch(`/api/v1/nutrition/${logId}/meals/notanumber`)
      .set("Accept", "application/json")
      .set("Content-Type", "application/json")
      .send({ name: "Updated" })
      .expect("Content-Type", /json/)
      .expect(400)
      .expect({ error: "Invalid meal ID" });
  });

  it("returns 400 when no valid fields are provided", async () => {
    const meal = await prisma.meal.create({
      data: {
        nutritionLogId: logId,
        name: "Banana",
        calories: 90,
        protein: 1,
        carbs: 23,
        fat: 0,
      },
    });

    await request(app)
      .patch(`/api/v1/nutrition/${logId}/meals/${meal.id}`)
      .set("Accept", "application/json")
      .set("Content-Type", "application/json")
      .send({})
      .expect("Content-Type", /json/)
      .expect(400)
      .expect({ error: "No valid fields were provided to update." });
  });

  it("returns 400 when name is an empty string", async () => {
    const meal = await prisma.meal.create({
      data: {
        nutritionLogId: logId,
        name: "Banana",
        calories: 90,
        protein: 1,
        carbs: 23,
        fat: 0,
      },
    });

    await request(app)
      .patch(`/api/v1/nutrition/${logId}/meals/${meal.id}`)
      .set("Accept", "application/json")
      .set("Content-Type", "application/json")
      .send({ name: "" })
      .expect("Content-Type", /json/)
      .expect(400)
      .expect({ error: "Meal name cannot be an empty string." });
  });

  it("returns 400 when calories is negative", async () => {
    const meal = await prisma.meal.create({
      data: {
        nutritionLogId: logId,
        name: "Banana",
        calories: 90,
        protein: 1,
        carbs: 23,
        fat: 0,
      },
    });

    await request(app)
      .patch(`/api/v1/nutrition/${logId}/meals/${meal.id}`)
      .set("Accept", "application/json")
      .set("Content-Type", "application/json")
      .send({ calories: -1 })
      .expect("Content-Type", /json/)
      .expect(400)
      .expect({ error: "Calories must be a non-negative number." });
  });

  it("returns 400 when protein is negative", async () => {
    const meal = await prisma.meal.create({
      data: {
        nutritionLogId: logId,
        name: "Banana",
        calories: 90,
        protein: 1,
        carbs: 23,
        fat: 0,
      },
    });

    await request(app)
      .patch(`/api/v1/nutrition/${logId}/meals/${meal.id}`)
      .set("Accept", "application/json")
      .set("Content-Type", "application/json")
      .send({ protein: -1 })
      .expect("Content-Type", /json/)
      .expect(400)
      .expect({ error: "Protein must be a non-negative number." });
  });

  it("returns 400 when carbs is negative", async () => {
    const meal = await prisma.meal.create({
      data: {
        nutritionLogId: logId,
        name: "Banana",
        calories: 90,
        protein: 1,
        carbs: 23,
        fat: 0,
      },
    });

    await request(app)
      .patch(`/api/v1/nutrition/${logId}/meals/${meal.id}`)
      .set("Accept", "application/json")
      .set("Content-Type", "application/json")
      .send({ carbs: -1 })
      .expect("Content-Type", /json/)
      .expect(400)
      .expect({ error: "Carbs must be a non-negative number." });
  });

  it("returns 400 when fat is negative", async () => {
    const meal = await prisma.meal.create({
      data: {
        nutritionLogId: logId,
        name: "Banana",
        calories: 90,
        protein: 1,
        carbs: 23,
        fat: 0,
      },
    });

    await request(app)
      .patch(`/api/v1/nutrition/${logId}/meals/${meal.id}`)
      .set("Accept", "application/json")
      .set("Content-Type", "application/json")
      .send({ fat: -1 })
      .expect("Content-Type", /json/)
      .expect(400)
      .expect({ error: "Fat must be a non-negative number." });
  });

  it("returns 404 when logId not found", async () => {
    const meal = await prisma.meal.create({
      data: {
        nutritionLogId: logId,
        name: "Banana",
        calories: 90,
        protein: 1,
        carbs: 23,
        fat: 0,
      },
    });

    await request(app)
      .patch(`/api/v1/nutrition/999999/meals/${meal.id}`)
      .set("Accept", "application/json")
      .set("Content-Type", "application/json")
      .send({ name: "Updated" })
      .expect("Content-Type", /json/)
      .expect(404)
      .expect({ error: "Log associated to this meal does not exist." });
  });

  it("returns 404 when mealId not found", async () => {
    await request(app)
      .patch(`/api/v1/nutrition/${logId}/meals/999999`)
      .set("Accept", "application/json")
      .set("Content-Type", "application/json")
      .send({ name: "Updated" })
      .expect("Content-Type", /json/)
      .expect(404)
      .expect({ error: "Meal to update not found." });
  });

  it("returns 200 with the updated meal", async () => {
    const meal = await prisma.meal.create({
      data: {
        nutritionLogId: logId,
        name: "Banana",
        calories: 90,
        protein: 1,
        carbs: 23,
        fat: 0,
      },
    });

    await request(app)
      .patch(`/api/v1/nutrition/${logId}/meals/${meal.id}`)
      .set("Accept", "application/json")
      .set("Content-Type", "application/json")
      .send({ name: "Banana Updated", calories: 100 })
      .expect("Content-Type", /json/)
      .expect(200)
      .expect((res) => {
        expect(res.body.id).toBe(meal.id);
        expect(res.body.name).toBe("Banana Updated");
        expect(res.body.calories).toBe(100);
        expect(res.body.protein).toBe(1);
      });
  });
});

// DELETE a meal from a nutrition log
describe("DELETE /api/v1/nutrition/:logId/meals/:mealId", () => {
  it("returns 400 when logId is not a number", async () => {
    await request(app)
      .delete(`/api/v1/nutrition/notanumber/meals/1`)
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .expect(400)
      .expect({ error: "Invalid log ID" });
  });

  it("returns 400 when mealId is not a number", async () => {
    await request(app)
      .delete(`/api/v1/nutrition/${logId}/meals/notanumber`)
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .expect(400)
      .expect({ error: "Invalid meal ID" });
  });

  it("returns 404 when logId not found", async () => {
    const meal = await prisma.meal.create({
      data: {
        nutritionLogId: logId,
        name: "Apple",
        calories: 80,
        protein: 0,
        carbs: 21,
        fat: 0,
      },
    });

    await request(app)
      .delete(`/api/v1/nutrition/999999/meals/${meal.id}`)
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .expect(404)
      .expect({ error: "Log associated to this meal does not exist." });
  });

  it("returns 404 when mealId not found", async () => {
    await request(app)
      .delete(`/api/v1/nutrition/${logId}/meals/999999`)
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .expect(404)
      .expect({ error: "Meal to delete not found." });
  });

  it("returns 204 when meal is deleted", async () => {
    const meal = await prisma.meal.create({
      data: {
        nutritionLogId: logId,
        name: "Apple",
        calories: 80,
        protein: 0,
        carbs: 21,
        fat: 0,
      },
    });

    await request(app)
      .delete(`/api/v1/nutrition/${logId}/meals/${meal.id}`)
      .expect(204);
  });
});
