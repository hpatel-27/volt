// String lengths (character counts)
export const LIMITS = {
  NAME_MAX: 120, // meal / plan / day names
  NOTES_MAX: 2000, // exerciseLog free text
  PERSON_NAME_MAX: 100, // firstName / lastName
  ID_MAX: 100, // tight cap is safe
  SEARCH_Q_MAX: 100, // exercise search query

  // Numeric ceilings)
  BODY_WEIGHT_MAX: 1000, // lbs
  LIFT_WEIGHT_MAX: 10000, // set weight can be much higher than body weight
  HEIGHT_MAX: 300, // cm
  CALORIES_MAX: 100000, // per meal
  MACRO_MAX: 10000, // grams per meal
  REPS_MAX: 1000,
  SETS_MAX: 100,
  REST_MAX: 86400, // seconds (1 day)

  // Exercise attributes (admin-only create/update)
  EQUIPMENT_MAX: 50, // length-bound only
  CATEGORY_MAX: 50, // length-bound only
  MUSCLE_MAX: 50, // a single muscle name
  INSTRUCTION_MAX: 1000, // one instruction step is a sentence/paragraph
  IMAGE_PATH_MAX: 500, // image path / URL
  MUSCLES_MAX_ITEMS: 20, // max muscles per list
  INSTRUCTIONS_MAX_ITEMS: 50, // max instruction steps
  IMAGES_MAX_ITEMS: 20, // max images

  // User goals
  TARGET_WEIGHT_MAX: 1000, // reuse the BODY_WEIGHT_MAX rationale
  CALORIE_GOAL_MAX: 20000, // generous daily cap
  MACRO_GOAL_MAX: 2000, // grams/day
} as const;
