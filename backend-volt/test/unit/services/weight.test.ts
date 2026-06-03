// Unit tests: weight service with a mocked database.
// This call is hoisted so the db is mocked before the prisma import.
vi.mock("../../../src/db.js");

import type { DeepMockProxy } from "vitest-mock-extended";
import { expect, test, describe, vi, beforeEach } from "vitest";
import { prisma } from "../../../src/db.js";
import * as weightService from "../../../src/services/weight.service.js";
import { Prisma } from "../../../src/generated/prisma/client.js";
import { NotFoundError } from "../../../src/errors.js";

// Cast to the deep mock proxy so the mockResolved*/mockRejected* helpers type-check.
const prismaMock = prisma as unknown as DeepMockProxy<typeof prisma>;

// Build a P-coded Prisma error so we can drive the service's catch branches.
function prismaError(code: string) {
  return new Prisma.PrismaClientKnownRequestError(`Prisma error ${code}`, {
    code,
    clientVersion: "7.4.2",
  });
}

describe("Weight Service getAllWeights", () => {
  // getAllWeights uses the ARRAY-style transaction
  // (prisma.$transaction([findMany, count])), so the whole call resolves to the
  // [rows, total] tuple — stub it directly with mockResolvedValueOnce.
  beforeEach(() => vi.clearAllMocks());

  test("returns an empty page when the user has no weights", async () => {
    prismaMock.$transaction.mockResolvedValueOnce([[], 0] as any);

    const result = await weightService.getAllWeights("user-1", 1, 10);

    expect(result).toStrictEqual({ weights: [], total: 0, page: 1, limit: 10 });
  });

  test("maps raw rows to DTOs (userId stripped, date as YYYY-MM-DD) and echoes page/limit", async () => {
    const rows = [
      { id: "w-1", userId: "user-1", amount: 180.5, date: new Date("2026-04-14T00:00:00.000Z") },
      { id: "w-2", userId: "user-1", amount: 179.2, date: new Date("2026-04-13T00:00:00.000Z") },
    ];
    prismaMock.$transaction.mockResolvedValueOnce([rows, 2] as any);

    const result = await weightService.getAllWeights("user-1", 1, 10);

    expect(result).toStrictEqual({
      weights: [
        { id: "w-1", amount: 180.5, date: "2026-04-14" },
        { id: "w-2", amount: 179.2, date: "2026-04-13" },
      ],
      total: 2,
      page: 1,
      limit: 10,
    });
    // FK column must never survive the mapper
    expect(result.weights[0]).not.toHaveProperty("userId");
  });

  test("passes the correct where/skip/take/orderBy to findMany for the requested page", async () => {
    prismaMock.$transaction.mockResolvedValueOnce([[], 0] as any);
    // The service builds the findMany/count query objects eagerly and hands them
    // to $transaction as an array — so assert on what weight.findMany was called with.
    await weightService.getAllWeights("user-7", 3, 5);

    // page 3, limit 5 => skip (3-1)*5 = 10
    expect(prismaMock.weight.findMany).toHaveBeenCalledWith({
      where: { userId: "user-7" },
      skip: 10,
      take: 5,
      orderBy: { date: "desc" },
    });
    expect(prismaMock.weight.count).toHaveBeenCalledWith({
      where: { userId: "user-7" },
    });
  });

  test("propagates a server error thrown inside the transaction", async () => {
    const dbError = new Error("Prisma database is currently unavailable.");
    prismaMock.$transaction.mockRejectedValueOnce(dbError);

    await expect(weightService.getAllWeights("user-1", 1, 10)).rejects.toThrow(
      dbError,
    );
  });

  test("propagates a non-Error thrown value", async () => {
    prismaMock.$transaction.mockRejectedValueOnce("some invalid non-error");

    await expect(weightService.getAllWeights("user-1", 1, 10)).rejects.toBe(
      "some invalid non-error",
    );
  });
});

describe("Weight Service getWeightsByRange", () => {
  beforeEach(() => vi.clearAllMocks());

  test("returns mapped weights and their count for the window, ascending", async () => {
    const from = new Date("2026-04-01T00:00:00.000Z");
    const to = new Date("2026-04-30T00:00:00.000Z");
    prismaMock.weight.findMany.mockResolvedValueOnce([
      { id: "w-1", userId: "user-1", amount: 181, date: new Date("2026-04-10T00:00:00.000Z") },
      { id: "w-2", userId: "user-1", amount: 180, date: new Date("2026-04-20T00:00:00.000Z") },
    ] as any);

    const result = await weightService.getWeightsByRange("user-1", from, to);

    expect(result.total).toBe(2);
    expect(result.weights).toStrictEqual([
      { id: "w-1", amount: 181, date: "2026-04-10" },
      { id: "w-2", amount: 180, date: "2026-04-20" },
    ]);
    expect(prismaMock.weight.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1", date: { gte: from, lte: to } },
      orderBy: { date: "asc" },
    });
  });

  test("returns an empty result when nothing falls in range", async () => {
    prismaMock.weight.findMany.mockResolvedValueOnce([]);

    const result = await weightService.getWeightsByRange(
      "user-1",
      new Date("2026-01-01"),
      new Date("2026-01-02"),
    );

    expect(result).toStrictEqual({ weights: [], total: 0 });
  });

  test("propagates an unexpected error", async () => {
    const dbError = new Error("Prisma database is currently unavailable.");
    prismaMock.weight.findMany.mockRejectedValueOnce(dbError);

    await expect(
      weightService.getWeightsByRange("user-1", new Date(), new Date()),
    ).rejects.toThrow(dbError);
  });
});

describe("Weight Service getWeightById", () => {
  beforeEach(() => vi.clearAllMocks());

  test("throws NotFoundError when no row matches the (id, userId) pair", async () => {
    // findFirst resolves to null by default, triggering the NotFoundError branch
    await expect(
      weightService.getWeightById("user-1", "w-1"),
    ).rejects.toThrow(new NotFoundError("Weight entry with id: w-1 not found."));
  });

  test("scopes the lookup to the owning user via findFirst", async () => {
    prismaMock.weight.findFirst.mockResolvedValueOnce({
      id: "w-1",
      userId: "user-1",
      amount: 175,
      date: new Date("2026-04-13T00:00:00.000Z"),
    } as any);

    await weightService.getWeightById("user-1", "w-1");

    expect(prismaMock.weight.findFirst).toHaveBeenCalledWith({
      where: { id: "w-1", userId: "user-1" },
    });
  });

  test("propagates an unexpected error", async () => {
    const dbError = new Error("Prisma database is currently unavailable.");
    prismaMock.weight.findFirst.mockRejectedValueOnce(dbError);

    await expect(
      weightService.getWeightById("user-1", "w-1"),
    ).rejects.toThrow(dbError);
  });

  test("returns the mapped weight (no userId leaked)", async () => {
    prismaMock.weight.findFirst.mockResolvedValueOnce({
      id: "w-1",
      userId: "user-1",
      amount: 175.3,
      date: new Date("2026-04-13T00:00:00.000Z"),
    } as any);

    const result = await weightService.getWeightById("user-1", "w-1");

    expect(result).toStrictEqual({ id: "w-1", amount: 175.3, date: "2026-04-13" });
    expect(result).not.toHaveProperty("userId");
  });
});

describe("Weight Service createWeight", () => {
  // createWeight has no try/catch — there is no unique constraint on (userId, date),
  // so there is no P2002 path here; any DB error propagates unchanged.
  beforeEach(() => vi.clearAllMocks());

  test("returns the created weight mapped to a DTO", async () => {
    prismaMock.weight.create.mockResolvedValueOnce({
      id: "w-1",
      userId: "user-1",
      amount: 182.4,
      date: new Date("2026-04-13T00:00:00.000Z"),
    } as any);

    const result = await weightService.createWeight({
      userId: "user-1",
      amount: 182.4,
      date: "2026-04-13T00:00:00.000Z",
    });

    expect(result).toStrictEqual({ id: "w-1", amount: 182.4, date: "2026-04-13" });
    expect(result).not.toHaveProperty("userId");
    expect(prismaMock.weight.create).toHaveBeenCalledWith({
      data: { userId: "user-1", amount: 182.4, date: "2026-04-13T00:00:00.000Z" },
    });
  });

  test("propagates an unexpected error unchanged", async () => {
    const dbError = new Error("Prisma database is currently unavailable.");
    prismaMock.weight.create.mockRejectedValueOnce(dbError);

    await expect(
      weightService.createWeight({
        userId: "user-1",
        amount: 180,
        date: "2026-04-13T00:00:00.000Z",
      }),
    ).rejects.toThrow(dbError);
  });

  test("propagates a non-Error thrown value", async () => {
    prismaMock.weight.create.mockRejectedValueOnce(42);

    await expect(
      weightService.createWeight({
        userId: "user-1",
        amount: 180,
        date: "2026-04-13T00:00:00.000Z",
      }),
    ).rejects.toBe(42);
  });
});

describe("Weight Service updateWeight", () => {
  // updateWeight goes straight to prisma.weight.update with a where { id, userId }
  // ownership guard — P2025 (no row matched) is what signals "not found".
  beforeEach(() => vi.clearAllMocks());

  test("throws NotFoundError when no row matches id+userId (P2025)", async () => {
    prismaMock.weight.update.mockRejectedValueOnce(prismaError("P2025"));

    await expect(
      weightService.updateWeight("user-1", "w-1", { amount: 170 }),
    ).rejects.toThrow(new NotFoundError("Weight entry not found."));
  });

  test("propagates an unexpected Error", async () => {
    const dbError = new Error("Prisma database is currently unavailable.");
    prismaMock.weight.update.mockRejectedValueOnce(dbError);

    await expect(
      weightService.updateWeight("user-1", "w-1", { amount: 170 }),
    ).rejects.toThrow(dbError);
  });

  test("propagates a non-Error thrown value", async () => {
    prismaMock.weight.update.mockRejectedValueOnce("unknown");

    await expect(
      weightService.updateWeight("user-1", "w-1", { amount: 170 }),
    ).rejects.toBe("unknown");
  });

  test("returns the updated weight mapped, scoped to id+userId", async () => {
    prismaMock.weight.update.mockResolvedValueOnce({
      id: "w-1",
      userId: "user-1",
      amount: 170,
      date: new Date("2026-04-20T00:00:00.000Z"),
    } as any);

    const result = await weightService.updateWeight("user-1", "w-1", {
      amount: 170,
      date: "2026-04-20T00:00:00.000Z",
    });

    expect(result).toStrictEqual({ id: "w-1", amount: 170, date: "2026-04-20" });
    expect(result).not.toHaveProperty("userId");
    expect(prismaMock.weight.update).toHaveBeenCalledWith({
      where: { id: "w-1", userId: "user-1" },
      data: { amount: 170, date: "2026-04-20T00:00:00.000Z" },
    });
  });
});

describe("Weight Service deleteWeight", () => {
  // deleteWeight goes straight to prisma.weight.delete — P2025 is the only
  // "not found" signal, there is no prior findFirst check.
  beforeEach(() => vi.clearAllMocks());

  test("throws NotFoundError when no row matches id+userId (P2025)", async () => {
    prismaMock.weight.delete.mockRejectedValueOnce(prismaError("P2025"));

    await expect(
      weightService.deleteWeight("user-1", "w-1"),
    ).rejects.toThrow(new NotFoundError("Weight entry not found."));
  });

  test("propagates an unexpected Error", async () => {
    const dbError = new Error("Prisma database is currently unavailable.");
    prismaMock.weight.delete.mockRejectedValueOnce(dbError);

    await expect(
      weightService.deleteWeight("user-1", "w-1"),
    ).rejects.toThrow(dbError);
  });

  test("propagates a non-Error thrown value", async () => {
    prismaMock.weight.delete.mockRejectedValueOnce("unknown");

    await expect(
      weightService.deleteWeight("user-1", "w-1"),
    ).rejects.toBe("unknown");
  });

  test("resolves to undefined on success and scopes the delete to id+userId", async () => {
    prismaMock.weight.delete.mockResolvedValueOnce({
      id: "w-1",
      userId: "user-1",
      amount: 180,
      date: new Date("2026-04-13T00:00:00.000Z"),
    } as any);

    const result = await weightService.deleteWeight("user-1", "w-1");

    expect(result).toBeUndefined();
    expect(prismaMock.weight.delete).toHaveBeenCalledWith({
      where: { id: "w-1", userId: "user-1" },
    });
  });
});
