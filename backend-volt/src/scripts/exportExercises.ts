// One-time export: pulls the exercise dataset from the free-exercise-db GitHub
// repo and writes it to a local JSON file (src/data/exercises.json) that the
// seed script reads from afterwards. Run this only when you want to refresh the
// snapshot from upstream — day-to-day edits happen directly in the JSON file.
//
//   npx tsx src/scripts/exportExercises.ts
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const REMOTE_URL =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";

// Relative image paths in the dataset (e.g. "Bench_Press/0.jpg") resolve
// against this directory in the upstream repo.
const IMAGE_BASE_URL =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";

const OUTPUT_PATH = resolve(import.meta.dirname, "../data/exercises.json");

type RemoteExercise = {
  id: string;
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

// Our local shape: the remote `id` becomes our `slug`, images are absolute.
type LocalExercise = Omit<RemoteExercise, "id"> & { slug: string };

function toLocalExercise(remote: RemoteExercise): LocalExercise {
  const { id, images, ...rest } = remote;

  // Relative paths -> absolute URLs. Missing field becomes []; already-absolute
  // URLs are left untouched so re-running on exported data is idempotent.
  const absoluteImages = (images ?? []).map((path) =>
    path.startsWith("http") ? path : IMAGE_BASE_URL + path,
  );

  return { ...rest, slug: id, images: absoluteImages };
}

async function exportExercises() {
  console.log("Fetching exercises from GitHub repository...");
  const response = await fetch(REMOTE_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch exercises: ${response.statusText}`);
  }

  const remote = (await response.json()) as RemoteExercise[];
  console.log(`Fetched ${remote.length} exercises. Transforming...`);

  const local = remote.map(toLocalExercise);

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(local, null, 2) + "\n");

  console.log(`Wrote ${local.length} exercises to ${OUTPUT_PATH}`);
}

exportExercises()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error exporting exercises:", err);
    process.exit(1);
  });
