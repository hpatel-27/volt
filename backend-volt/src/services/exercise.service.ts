import { prisma } from "../db.js";
import { Prisma } from "../generated/prisma/client.js";
import { DuplicateEntryError, NotFoundError } from "../errors.js";
import type {
  CreateExerciseInput,
  UpdateExerciseInput,
} from "../types/exercise.dto.js";

// Get a paginated list of exercises.
// This allows clients to fetch exercises in chunks, which is more efficient than fetching all exercises at once.
async function getExercises(page: number, limit: number) {
  const [exercises, total] = await prisma.$transaction([
    // Use offset pagination to limit the number of exercises returned in one request, and allow clients
    // to specify the offset and limit via query parameters. This is more efficient than returning all
    // exercises at once, especially if there are many exercises in the database.
    prisma.exercise.findMany({
      skip: (page - 1) * limit,
      take: limit,
    }),
    // Get total count of exercises for pagination. This allows the client to know how many total exercises
    // there are, and calculate how many pages of results exist.
    prisma.exercise.count(),
  ]);

  return { exercises, total, page, limit };
}

// Get a specific exercise by ID (its name). This allows clients to fetch details about a specific exercise.
async function getExerciseById(id: string) {
  const exercise = await prisma.exercise.findUnique({
    where: { id },
  });

  if (!exercise) {
    throw new NotFoundError(`No exercise found with ID: ${id}`);
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

async function updateExercise(id: string, data: UpdateExerciseInput) {
  try {
    const exercise = await prisma.exercise.update({
      where: { id },
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

async function deleteExercise(id: string) {
  try {
    await prisma.exercise.delete({
      where: { id },
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
