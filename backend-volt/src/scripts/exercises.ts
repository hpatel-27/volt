import "dotenv/config";
import { prisma } from "../db.js";

async function seedExercises() {
  try {
    console.log("Fetching exercises from GitHub repository...");

    // Fetch the exercises JSON from the repo
    const response = await fetch(
      "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json",
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch exercises: ${response.statusText}`);
    }

    // Exercises data
    const exercises = await response.json();
    console.log(
      `Fetched ${exercises.length} exercises. Seeding into database...`,
    );

    // Clear existing exercises
    console.log("Clearing existing exercises from database...");
    await prisma.exercise.deleteMany();

    // Insert new exercises in batches to avoid overwhelming the database
    const batchSize = 100;
    let insertedCount = 0;

    for (let i = 0; i < exercises.length; i += batchSize) {
      const batch = exercises.slice(i, i + batchSize);
      console.log(
        `Inserting batch ${Math.floor(i / batchSize) + 1} / ${Math.ceil(exercises.length / batchSize)}...`,
      );
      await prisma.exercise.createMany({
        data: batch,
      });
      insertedCount += batch.length;
      console.log(
        `Inserted ${insertedCount} / ${exercises.length} exercises so far...`,
      );
    }

    console.log(
      `Successfully inserted ${insertedCount} exercises into the database.`,
    );

    // Check database
    const totalExercises = await prisma.exercise.count();
    console.log(`Total exercises in database: ${totalExercises}`);
  } catch (err) {
    console.error("Error seeding exercises:", err);
  }
}

// Seed the exercises
seedExercises()
  .then(() => {
    console.log("Exercise seeding completed successfully.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error during exercise seeding:", err);
    process.exit(1);
  });
