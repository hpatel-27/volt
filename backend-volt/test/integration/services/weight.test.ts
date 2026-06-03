// Integration tests: weight service against a real database.
// No mocks — prisma queries run against the test DB (TEST_DATABASE_URL).

import { expect, describe, it, beforeAll, afterAll, beforeEach } from "vitest";
import { prisma } from "../../../src/db.js";
import * as weightService from "../../../src/services/weight.service.js";
import { NotFoundError } from "../../../src/errors.js";

// Unique clerkId so this test user doesn't collide with real users or other suites
const TEST_CLERK_ID = "integration_test_weight_service_user";
let testUserId: string;

// A second user used to prove cross-user isolation (one user can't touch another's weights)
const OTHER_CLERK_ID = "integration_test_weight_service_other";
let otherUserId: string;

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
});

afterAll(async () => {
  await prisma.weight.deleteMany({ where: { userId: testUserId } });
  await prisma.weight.deleteMany({ where: { userId: otherUserId } });
  await prisma.user.delete({ where: { id: testUserId } });
  await prisma.user.delete({ where: { id: otherUserId } });
});

describe("getAllWeights", () => {
  beforeEach(async () => {
    await prisma.weight.deleteMany({ where: { userId: testUserId } });
  });

  it("returns an empty page when the user has no weights", async () => {
    const result = await weightService.getAllWeights(testUserId, 1, 10);
    expect(result).toStrictEqual({ weights: [], total: 0, page: 1, limit: 10 });
  });

  it("returns weights newest-first with userId stripped and date as YYYY-MM-DD", async () => {
    await prisma.weight.createMany({
      data: [
        { userId: testUserId, amount: 181, date: new Date("2026-01-01T00:00:00.000Z") },
        { userId: testUserId, amount: 180, date: new Date("2026-01-02T00:00:00.000Z") },
        { userId: testUserId, amount: 179, date: new Date("2026-01-03T00:00:00.000Z") },
      ],
    });

    const result = await weightService.getAllWeights(testUserId, 1, 10);

    expect(result.total).toBe(3);
    // orderBy date desc — most recent first
    expect(result.weights.map((w) => w.date)).toStrictEqual([
      "2026-01-03",
      "2026-01-02",
      "2026-01-01",
    ]);
    expect(result.weights[0]).not.toHaveProperty("userId");
    expect(result.weights[0]?.amount).toBe(179);
  });

  it("paginates — page 2 with limit 1 skips the newest entry", async () => {
    await prisma.weight.createMany({
      data: [
        { userId: testUserId, amount: 181, date: new Date("2026-01-01T00:00:00.000Z") },
        { userId: testUserId, amount: 180, date: new Date("2026-01-02T00:00:00.000Z") },
      ],
    });

    const result = await weightService.getAllWeights(testUserId, 2, 1);

    expect(result.weights.length).toBe(1);
    expect(result.page).toBe(2);
    expect(result.limit).toBe(1);
    // total reflects the full count, not the page size
    expect(result.total).toBe(2);
    // page 2 (limit 1) of a desc list is the older entry
    expect(result.weights[0]?.date).toBe("2026-01-01");
  });

  it("does not include another user's weights", async () => {
    await prisma.weight.create({
      data: { userId: otherUserId, amount: 200, date: new Date("2026-01-05T00:00:00.000Z") },
    });
    await prisma.weight.create({
      data: { userId: testUserId, amount: 180, date: new Date("2026-01-06T00:00:00.000Z") },
    });

    const result = await weightService.getAllWeights(testUserId, 1, 10);
    expect(result.total).toBe(1);
    expect(result.weights[0]?.amount).toBe(180);
  });
});

describe("getWeightsByRange", () => {
  beforeEach(async () => {
    await prisma.weight.deleteMany({ where: { userId: testUserId } });
  });

  it("returns only weights whose date falls within [from, to], ascending", async () => {
    await prisma.weight.createMany({
      data: [
        { userId: testUserId, amount: 181, date: new Date("2026-03-01T00:00:00.000Z") },
        { userId: testUserId, amount: 180, date: new Date("2026-03-10T00:00:00.000Z") },
        { userId: testUserId, amount: 179, date: new Date("2026-03-20T00:00:00.000Z") },
      ],
    });

    const result = await weightService.getWeightsByRange(
      testUserId,
      new Date("2026-03-05T00:00:00.000Z"),
      new Date("2026-03-15T00:00:00.000Z"),
    );

    expect(result.total).toBe(1);
    expect(result.weights.map((w) => w.date)).toStrictEqual(["2026-03-10"]);
  });

  it("includes the boundary dates (gte/lte are inclusive), ascending", async () => {
    await prisma.weight.createMany({
      data: [
        { userId: testUserId, amount: 181, date: new Date("2026-03-01T00:00:00.000Z") },
        { userId: testUserId, amount: 180, date: new Date("2026-03-10T00:00:00.000Z") },
      ],
    });

    const result = await weightService.getWeightsByRange(
      testUserId,
      new Date("2026-03-01T00:00:00.000Z"),
      new Date("2026-03-10T00:00:00.000Z"),
    );

    expect(result.total).toBe(2);
    expect(result.weights.map((w) => w.date)).toStrictEqual([
      "2026-03-01",
      "2026-03-10",
    ]);
  });

  it("returns an empty result when nothing is in range", async () => {
    const result = await weightService.getWeightsByRange(
      testUserId,
      new Date("2099-01-01T00:00:00.000Z"),
      new Date("2099-12-31T00:00:00.000Z"),
    );
    expect(result).toStrictEqual({ weights: [], total: 0 });
  });

  it("does not include another user's weights in the window", async () => {
    await prisma.weight.create({
      data: { userId: otherUserId, amount: 200, date: new Date("2026-03-08T00:00:00.000Z") },
    });

    const result = await weightService.getWeightsByRange(
      testUserId,
      new Date("2026-03-01T00:00:00.000Z"),
      new Date("2026-03-31T00:00:00.000Z"),
    );
    expect(result.total).toBe(0);
  });
});

describe("getWeightById", () => {
  let weightId: string;

  beforeAll(async () => {
    const weight = await prisma.weight.create({
      data: { userId: testUserId, amount: 175.5, date: new Date("2026-02-01T00:00:00.000Z") },
    });
    weightId = weight.id;
  });

  afterAll(async () => {
    await prisma.weight.deleteMany({ where: { userId: testUserId } });
  });

  it("returns the weight when it belongs to the user (no userId leaked)", async () => {
    const result = await weightService.getWeightById(testUserId, weightId);
    expect(result).toStrictEqual({
      id: weightId,
      amount: 175.5,
      date: "2026-02-01",
    });
    expect(result).not.toHaveProperty("userId");
  });

  it("throws NotFoundError when the weight belongs to a different user", async () => {
    await expect(
      weightService.getWeightById(otherUserId, weightId),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError for an unknown id", async () => {
    await expect(
      weightService.getWeightById(testUserId, crypto.randomUUID()),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("createWeight", () => {
  afterAll(async () => {
    await prisma.weight.deleteMany({ where: { userId: testUserId } });
  });

  it("creates and returns a new weight as a DTO (no userId)", async () => {
    const result = await weightService.createWeight({
      userId: testUserId,
      amount: 182.3,
      date: "2026-03-01T00:00:00.000Z",
    });

    expect(result.id).toBeDefined();
    expect(result.amount).toBe(182.3);
    expect(result.date).toBe("2026-03-01");
    expect(result).not.toHaveProperty("userId");
  });

  it("allows multiple weights on the same date (no unique constraint)", async () => {
    await weightService.createWeight({
      userId: testUserId,
      amount: 183,
      date: "2026-03-02T00:00:00.000Z",
    });
    // A second entry on the same date must succeed — there is no (userId, date) unique key
    await weightService.createWeight({
      userId: testUserId,
      amount: 184,
      date: "2026-03-02T00:00:00.000Z",
    });

    const count = await prisma.weight.count({
      where: { userId: testUserId, date: new Date("2026-03-02T00:00:00.000Z") },
    });
    expect(count).toBe(2);
  });
});

describe("updateWeight", () => {
  beforeEach(async () => {
    await prisma.weight.deleteMany({ where: { userId: testUserId } });
  });

  it("throws NotFoundError when the weight does not exist", async () => {
    await expect(
      weightService.updateWeight(testUserId, crypto.randomUUID(), {
        amount: 170,
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError when the weight belongs to a different user", async () => {
    const weight = await prisma.weight.create({
      data: { userId: testUserId, amount: 180, date: new Date("2026-04-01T00:00:00.000Z") },
    });

    await expect(
      weightService.updateWeight(otherUserId, weight.id, { amount: 170 }),
    ).rejects.toThrow(NotFoundError);

    // The owning user's row must be untouched by the rejected update
    const unchanged = await prisma.weight.findUnique({ where: { id: weight.id } });
    expect(unchanged?.amount).toBe(180);
  });

  it("updates amount and date and returns the mapped weight", async () => {
    const weight = await prisma.weight.create({
      data: { userId: testUserId, amount: 180, date: new Date("2026-04-01T00:00:00.000Z") },
    });

    const result = await weightService.updateWeight(testUserId, weight.id, {
      amount: 165.5,
      date: "2026-04-20T00:00:00.000Z",
    });

    expect(result.id).toBe(weight.id);
    expect(result.amount).toBe(165.5);
    expect(result.date).toBe("2026-04-20");
  });

  it("updates only the amount when date is omitted", async () => {
    const weight = await prisma.weight.create({
      data: { userId: testUserId, amount: 180, date: new Date("2026-04-01T00:00:00.000Z") },
    });

    const result = await weightService.updateWeight(testUserId, weight.id, {
      amount: 178,
    });

    expect(result.amount).toBe(178);
    // date is unchanged
    expect(result.date).toBe("2026-04-01");
  });
});

describe("deleteWeight", () => {
  beforeEach(async () => {
    await prisma.weight.deleteMany({ where: { userId: testUserId } });
  });

  it("deletes an existing weight and returns undefined", async () => {
    const weight = await prisma.weight.create({
      data: { userId: testUserId, amount: 180, date: new Date("2026-07-01T00:00:00.000Z") },
    });

    const result = await weightService.deleteWeight(testUserId, weight.id);
    expect(result).toBeUndefined();

    const gone = await prisma.weight.findUnique({ where: { id: weight.id } });
    expect(gone).toBeNull();
  });

  it("throws NotFoundError when no weight matches the id", async () => {
    await expect(
      weightService.deleteWeight(testUserId, crypto.randomUUID()),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError when the weight belongs to a different user (and leaves it intact)", async () => {
    const weight = await prisma.weight.create({
      data: { userId: testUserId, amount: 180, date: new Date("2026-07-02T00:00:00.000Z") },
    });

    await expect(
      weightService.deleteWeight(otherUserId, weight.id),
    ).rejects.toThrow(NotFoundError);

    const stillThere = await prisma.weight.findUnique({ where: { id: weight.id } });
    expect(stillThere).not.toBeNull();
  });
});
