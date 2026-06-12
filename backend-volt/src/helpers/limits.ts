// String lengths (character counts)
export const LIMITS = {
  NAME_MAX: 120, // meal / plan / day names — generous but bounded
  NOTES_MAX: 2000, // exerciseLog free text — the riskiest unbounded field
  PERSON_NAME_MAX: 100, // firstName / lastName
  ID_MAX: 100, // exerciseId — comes from a fixed dataset, so a tight cap is safe
  SEARCH_Q_MAX: 100, // already hard-coded in exercise.controller — move it here

  // Numeric ceilings (pick what's physically sane for your domain)
  BODY_WEIGHT_MAX: 1000, // lbs — mirror the frontend rule that's currently missing on backend
  LIFT_WEIGHT_MAX: 10000, // set weight can be much higher than body weight
  HEIGHT_MAX: 300, // cm
  CALORIES_MAX: 100000, // per meal
  MACRO_MAX: 10000, // grams per meal
  REPS_MAX: 1000,
  SETS_MAX: 100,
  REST_MAX: 86400, // seconds (1 day) — or tighter
} as const;
