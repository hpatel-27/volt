// Idempotent curation pass over src/data/exercises.json. Applies our local
// edits on top of the raw upstream snapshot: renames that drop needless grip
// qualifiers, removals of wide-grip duplicates, and additions of popular
// exercises missing from the dataset.
//
// Safe to re-run, and to run after a fresh `export:exercises` (it keys off the
// stable `slug`, so re-exporting from GitHub no longer wipes these edits).
//
//   npx tsx src/scripts/curateExercises.ts
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const DATA_PATH = resolve(import.meta.dirname, "../data/exercises.json");

type Exercise = {
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

// upstream slug -> { new display name, optional new slug }. A name-only rename
// is safe anywhere (references are by id, so the upsert updates in place). A
// slug change is only used where the old slug is unreferenced; here it lets the
// re-seed land our data on the clean, already-referenced `Barbell_Bench_Press`
// row and prune the ugly orphan.
type Rename = { name: string; slug?: string; instructions?: string[] };

const RENAMES: Record<string, Rename> = {
  "Barbell_Bench_Press_-_Medium_Grip": {
    name: "Barbell Bench Press",
    slug: "Barbell_Bench_Press",
  },
  "Barbell_Incline_Bench_Press_-_Medium_Grip": {
    name: "Barbell Incline Bench Press",
    slug: "Barbell_Incline_Bench_Press",
  },
  "Wide-Grip_Lat_Pulldown": {
    name: "Lat Pulldown",
    slug: "Lat_Pulldown",
    instructions: [
      "Sit at a lat pulldown machine with a wide bar attached to the top pulley, and adjust the knee pad so it secures your thighs and keeps you from being lifted by the weight.",
      "Grasp the bar with your palms facing forward, hands slightly wider than shoulder width.",
      "With your arms extended overhead, lean your torso back about 30 degrees, arch your lower back slightly, and stick your chest out. This is your starting position.",
      "As you exhale, pull the bar down until it reaches your upper chest by driving your shoulders and upper arms down and back. Keep your torso still and squeeze your back at the bottom.",
      "Hold the contraction for a second, then inhale and slowly let the bar rise back up until your arms are fully extended and your lats are stretched.",
      "Repeat for the recommended number of repetitions.",
    ],
  },
  "Wide-Grip_Pulldown_Behind_The_Neck": {
    name: "Pulldown Behind The Neck",
    slug: "Pulldown_Behind_The_Neck",
    instructions: [
      "Sit at a lat pulldown machine with a wide bar attached to the top pulley, and adjust the knee pad so it secures your thighs.",
      "Grasp the bar with your palms facing forward, hands wider than shoulder width.",
      "With your arms extended overhead, tilt your torso and head slightly forward so the bar can travel toward the back of your neck. This is your starting position.",
      "As you exhale, pull the bar down until it lightly touches the back of your neck by driving your shoulders and upper arms down and back. Keep your torso still and squeeze your back.",
      "Hold for a second, then inhale and slowly raise the bar back up until your arms are fully extended and your lats are stretched.",
      "Repeat for the recommended number of repetitions.",
    ],
  },
  "Wide-Grip_Decline_Barbell_Pullover": {
    name: "Decline Barbell Pullover",
    slug: "Decline_Barbell_Pullover",
    instructions: [
      "Lie back on a decline bench with both legs securely locked in position, and hold a barbell behind your head with a pronated grip (palms facing away), hands about shoulder-width apart.",
      "Bring the barbell up over your chest until your arms are fully extended and perpendicular to the floor. This is your starting position.",
      "Keeping your arms straight, lower the barbell back in a semicircular arc behind your head until your arms are roughly parallel to the floor. Inhale as you lower; the movement should come only from the shoulder joint.",
      "Exhale and bring the barbell back up along the same arc to the starting position, keeping full control throughout.",
      "Repeat for the recommended number of repetitions, then carefully return the barbell to a safe position.",
    ],
  },
};

// Wide-grip entries that duplicate an existing plain movement.
const REMOVALS = new Set<string>([
  "Wide-Grip_Barbell_Bench_Press", // dup of Barbell Bench Press
  "Wide-Grip_Decline_Barbell_Bench_Press", // dup of Decline Barbell Bench Press
  "Wide-Grip_Standing_Barbell_Curl", // dup of Barbell Curl
  "Wide-Grip_Rear_Pull-Up", // covered by Pullups
]);

// Popular exercises absent from the upstream dataset. Images are empty — there
// are none in the source repo for these. Attribute vocab matches the dataset
// (force/level/mechanic and the muscle names used elsewhere in the file).
const ADDITIONS: Exercise[] = [
  {
    slug: "Kelso_Shrug",
    name: "Kelso Shrug",
    force: "pull",
    level: "intermediate",
    mechanic: "isolation",
    equipment: "barbell",
    primaryMuscles: ["traps"],
    secondaryMuscles: ["middle back"],
    instructions: [
      "Lie chest-down on an incline bench holding a barbell (or dumbbells) with arms hanging straight down. This is your starting position.",
      "Keeping your arms straight, retract your shoulder blades to lift the weight, squeezing the upper back and traps.",
      "Pause at the top, then slowly lower under control back to the starting position.",
      "Repeat for the recommended number of repetitions.",
    ],
    category: "strength",
    images: [],
  },
  {
    slug: "Bulgarian_Split_Squat",
    name: "Bulgarian Split Squat",
    force: "push",
    level: "intermediate",
    mechanic: "compound",
    equipment: "dumbbell",
    primaryMuscles: ["quadriceps"],
    secondaryMuscles: ["glutes", "hamstrings", "calves"],
    instructions: [
      "Stand a couple of feet in front of a bench holding a dumbbell in each hand. Rest the top of one foot on the bench behind you. This is your starting position.",
      "Lower yourself by bending the front knee until the front thigh is roughly parallel to the floor, keeping your torso upright.",
      "Drive through the front heel to return to the starting position.",
      "Complete all repetitions on one leg, then switch sides.",
    ],
    category: "strength",
    images: [],
  },
  {
    slug: "Seated_Dumbbell_Overhead_Triceps_Extension",
    name: "Seated Dumbbell Overhead Triceps Extension",
    force: "push",
    level: "beginner",
    mechanic: "isolation",
    equipment: "dumbbell",
    primaryMuscles: ["triceps"],
    secondaryMuscles: [],
    instructions: [
      "Sit on a bench and hold a single dumbbell with both hands, raised overhead with arms extended. This is your starting position.",
      "Keeping your upper arms stationary and close to your head, lower the dumbbell behind your head by bending at the elbows. Inhale as you descend.",
      "Extend your elbows to raise the dumbbell back to the starting position, squeezing the triceps. Exhale as you press up.",
      "Repeat for the recommended number of repetitions.",
    ],
    category: "strength",
    images: [],
  },
  {
    slug: "Cable_Lateral_Raise",
    name: "Cable Lateral Raise",
    force: "push",
    level: "beginner",
    mechanic: "isolation",
    equipment: "cable",
    primaryMuscles: ["shoulders"],
    secondaryMuscles: [],
    instructions: [
      "Stand side-on to a low pulley and grasp the handle with the hand farthest from the machine, arm across the front of your body. This is your starting position.",
      "Keeping a slight bend in the elbow, raise the handle out to your side until your arm is parallel to the floor. Exhale as you lift.",
      "Pause briefly at the top, then lower the handle slowly back to the starting position.",
      "Complete all repetitions on one side, then switch arms.",
    ],
    category: "strength",
    images: [],
  },
  {
    slug: "Bayesian_Curl",
    name: "Bayesian Curl",
    force: "pull",
    level: "intermediate",
    mechanic: "isolation",
    equipment: "cable",
    primaryMuscles: ["biceps"],
    secondaryMuscles: ["forearms"],
    instructions: [
      "Set the pulley to its lowest position and attach a single handle. Grasp the handle in one hand and face away from the machine, stepping forward so your arm is extended behind your body and you feel a stretch in the biceps. This is your starting position.",
      "Keeping your upper arm stationary and slightly behind your torso, curl the handle forward and up by flexing at the elbow. Exhale as you curl and squeeze the biceps at the top.",
      "Slowly lower the handle back behind you under control until your arm is fully extended and the biceps is stretched. Inhale as you lower.",
      "Complete all repetitions on one arm, then switch sides.",
    ],
    category: "strength",
    images: [],
  },
  {
    slug: "Pec_Deck",
    name: "Pec Deck",
    force: "push",
    level: "beginner",
    mechanic: "isolation",
    equipment: "machine",
    primaryMuscles: ["chest"],
    secondaryMuscles: ["shoulders"],
    instructions: [
      "Sit at the pec deck machine and adjust the seat height so the handles are at chest level. Select an appropriate weight. Place your forearms on the pads (or grasp the handles) with your elbows bent and arms spread out to your sides. This is your starting position.",
      "Keeping a constant bend in your arms, push the pads together in a smooth arc in front of your chest by contracting your pecs. Exhale as you bring them together.",
      "Squeeze your chest at the midpoint, then slowly let the pads return to the starting position under control, feeling the stretch across your chest. Inhale as you return.",
      "Repeat for the recommended number of repetitions.",
    ],
    category: "strength",
    images: [],
  },
  {
    slug: "Single-Arm_Machine_Row",
    name: "Single-Arm Machine Row",
    force: "pull",
    level: "beginner",
    mechanic: "compound",
    equipment: "machine",
    primaryMuscles: ["middle back"],
    secondaryMuscles: ["lats", "biceps"],
    instructions: [
      "Sit at a row machine and adjust the seat and chest pad so the handles are at chest level. Grasp one handle with a neutral grip and place your other hand on the support. This is your starting position.",
      "Pull the handle toward your torso by retracting your shoulder blade and flexing the elbow, keeping your chest against the pad. Exhale as you pull.",
      "Pause and squeeze at the end of the motion, then slowly return the handle to the starting position without letting the weight rest on the stops.",
      "Complete all repetitions on one side, then switch arms.",
    ],
    category: "strength",
    images: [],
  },
  {
    slug: "Captains_Chair_Leg_Raise",
    name: "Captain's Chair Leg Raise",
    force: "pull",
    level: "beginner",
    mechanic: "compound",
    equipment: "machine",
    primaryMuscles: ["abdominals"],
    secondaryMuscles: [],
    instructions: [
      "Position yourself in a captain's chair with your forearms on the pads and your back against the back rest, legs hanging straight down. This is your starting position.",
      "Raise your knees toward your chest by contracting your abs, keeping the movement controlled. Exhale as you lift.",
      "Pause at the top, then slowly lower your legs back to the starting position without swinging.",
      "Repeat for the recommended number of repetitions.",
    ],
    category: "strength",
    images: [],
  },
];

async function curateExercises() {
  const exercises = JSON.parse(
    await readFile(DATA_PATH, "utf-8"),
  ) as Exercise[];

  let renamed = 0;
  let removed = 0;
  let added = 0;

  // Removals first, then renames on what's left.
  const kept = exercises.filter((ex) => {
    if (REMOVALS.has(ex.slug)) {
      removed++;
      return false;
    }
    return true;
  });

  for (const ex of kept) {
    const rename = RENAMES[ex.slug];
    if (!rename) continue;
    const before = JSON.stringify([ex.name, ex.slug, ex.instructions]);
    ex.name = rename.name;
    if (rename.slug) ex.slug = rename.slug;
    if (rename.instructions) ex.instructions = rename.instructions;
    if (JSON.stringify([ex.name, ex.slug, ex.instructions]) !== before) {
      renamed++;
    }
  }

  // Additions: only insert slugs not already present, so re-runs don't duplicate.
  const existingSlugs = new Set(kept.map((ex) => ex.slug));
  for (const addition of ADDITIONS) {
    if (!existingSlugs.has(addition.slug)) {
      kept.push(addition);
      added++;
    }
  }

  // Keep the file alphabetical by name so new entries land in a sensible spot.
  kept.sort((a, b) => a.name.localeCompare(b.name));

  await writeFile(DATA_PATH, JSON.stringify(kept, null, 2) + "\n");
  console.log(
    `Curated exercises: ${renamed} renamed, ${removed} removed, ${added} added. Total: ${kept.length}`,
  );
}

curateExercises()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error curating exercises:", err);
    process.exit(1);
  });
