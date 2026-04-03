import { prisma } from "../db.js";
import { NotFoundError } from "../errors.js";

// Get a paginated list of exercises.
// This allows clients to fetch exercises in chunks, which is more efficient than fetching all exercises at once.
async function getExercises(page: number, limit: number) {
  try {
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
  } catch (error) {
    if (error instanceof Error) {
      // Perhaps a connection error or a query error.
      // We don't want to expose internal error details to the client, so we return a generic error message.
      throw new Error("Error fetching exercises from database.");
    } else {
      throw new Error("Unknown error fetching exercises from database");
    }
  }
}

// Get a specific exercise by ID (its name). This allows clients to fetch details about a specific exercise.
async function getExerciseById(id: string) {
  try {
    const exercise = await prisma.exercise.findUnique({
      where: { id },
    });

    if (!exercise) {
      throw new NotFoundError("Exercise not found");
    }
    return exercise;
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error; // Re-throw NotFoundError to be handled by the controller
    } else if (error instanceof Error) {
      // Perhaps a connection error or a query error.
      // We don't want to expose internal error details to the client, so we return a generic error message.
      throw new Error("Error fetching exercise from database.");
    } else {
      throw new Error("Unknown error fetching exercise from database");
    }
  }
}

export { getExercises, getExerciseById };
