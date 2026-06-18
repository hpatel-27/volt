import "dotenv/config";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { prisma } from "../db.js";

// Local snapshot of the exercise library. Generated/refreshed from upstream via
// `npx tsx src/scripts/exportExercises.ts`; hand-edited for tweaks and additions.
const DATA_PATH = resolve(import.meta.dirname, "../data/exercises.json");

type SeedExercise = {
  slug: string;
  name: string;
  force?: string;
  level?: string;
  mechanic?: string;
  equipment?: string;
  category?: string;
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  instructions?: string[];
  images?: string[];
};

async function seedExercises() {
  console.log(`Reading exercises from ${DATA_PATH}...`);
  const exercises = JSON.parse(
    await readFile(DATA_PATH, "utf-8"),
  ) as SeedExercise[];
  console.log(`Loaded ${exercises.length} exercises. Upserting by slug...`);

  // Upsert keyed on the unique `slug`: re-running after editing the JSON updates
  // existing rows and inserts new ones, without deleting exercises that user
  // workouts/logs already reference. Chunked so we don't open 873 connections.
  const chunkSize = 50;
  let processed = 0;

  for (let i = 0; i < exercises.length; i += chunkSize) {
    const chunk = exercises.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map((ex) =>
        prisma.exercise.upsert({
          where: { slug: ex.slug },
          create: ex,
          update: ex,
        }),
      ),
    );
    processed += chunk.length;
    console.log(`Upserted ${processed} / ${exercises.length}...`);
  }

  // Prune: remove DB exercises no longer in the JSON, but only orphans — never
  // delete one that a workout or log references (the relation filters guard
  // against FK violations and silent data loss). Referenced-but-removed
  // exercises are left in place and reported so they can be handled manually.
  const slugs = exercises.map((ex) => ex.slug);

  const { count: pruned } = await prisma.exercise.deleteMany({
    where: {
      slug: { notIn: slugs },
      workoutDayExercises: { none: {} },
      exerciseLogs: { none: {} },
    },
  });

  const stale = await prisma.exercise.findMany({
    where: { slug: { notIn: slugs } },
    select: { slug: true },
  });
  console.log(`Pruned ${pruned} orphaned exercises not present in the JSON.`);
  if (stale.length > 0) {
    console.warn(
      `Kept ${stale.length} exercise(s) not in the JSON because they are referenced by workouts/logs: ${stale
        .map((e) => e.slug)
        .join(", ")}`,
    );
  }

  const total = await prisma.exercise.count();
  console.log(`Done. Total exercises in database: ${total}`);
}

seedExercises()
  .then(() => {
    console.log("Exercise seeding completed successfully.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error during exercise seeding:", err);
    process.exit(1);
  });
