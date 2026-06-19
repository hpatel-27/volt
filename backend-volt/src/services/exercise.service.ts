import { prisma } from "../db.js";
import { Prisma } from "../generated/prisma/client.js";
import { DuplicateEntryError, NotFoundError } from "../errors.js";
import type {
  CreateExerciseInput,
  UpdateExerciseInput,
} from "../types/exercise.dto.js";

// Get a paginated list of exercises, optionally filtered by a name search query
// When `q` is provided, results are narrowed to exercises whose name matches every
// whitespace-separated token in `q` (case-insensitive) before pagination is applied
function buildSearchWhere(q?: string): Prisma.ExerciseWhereInput {
  const tokens = q?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (tokens.length === 0) return {};

  return {
    AND: tokens.map((token): Prisma.ExerciseWhereInput => {
      return { name: { contains: token, mode: "insensitive" } };
    }),
  };
}

async function getExercises(page: number, limit: number, q?: string) {
  const where = buildSearchWhere(q);

  const [exercises, total] = await prisma.$transaction([
    prisma.exercise.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.exercise.count({ where }),
  ]);

  return { exercises, total, page, limit };
}

// Get a specific exercise by slug (its name). This allows clients to fetch details about a specific exercise.
async function getExerciseById(slug: string) {
  const exercise = await prisma.exercise.findUnique({
    where: { slug },
  });

  if (!exercise) {
    throw new NotFoundError(`No exercise found with slug: ${slug}`);
  }
  return exercise;
}

async function createExercise(data: CreateExerciseInput) {
  try {
    const exercise = await prisma.exercise.create({ data });
    return exercise;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new DuplicateEntryError(
        "An exercise with this ID already exists.",
        { cause: error },
      );
    }
    throw error;
  }
}

async function updateExercise(slug: string, data: UpdateExerciseInput) {
  try {
    const exercise = await prisma.exercise.update({
      where: { slug },
      data,
    });
    return exercise;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new NotFoundError("Exercise not found.", { cause: error });
    }
    throw error;
  }
}

async function deleteExercise(slug: string) {
  try {
    await prisma.exercise.delete({
      where: { slug },
    });
    return;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new NotFoundError("Exercise not found.", { cause: error });
    }
    throw error;
  }
}

export {
  getExercises,
  getExerciseById,
  createExercise,
  updateExercise,
  deleteExercise,
};
