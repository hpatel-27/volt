// Strict date-only (YYYY-MM-DD) helpers shared by date.middleware and
// param.middleware so both date entry points enforce the same contract.

// Shape check — matches the format the sheets and parseDateParam already use.
// NOTE: a shape match alone still accepts impossible dates like 2024-02-30
// or 2024-13-45, so callers of isValidDateString must also confirm the value
// is a real calendar date.
const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Returns true only if `value` is a string in strict YYYY-MM-DD form AND
 * represents a real calendar date. Acts as a type guard so callers can narrow
 * `unknown` to `string` on success.
 */
export function isValidDateString(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_ONLY_REGEX.test(value)) return false;

  // Build UTC date and confirm valid date
  const date = new Date(`${value}T00:00:00Z`);
  const dateYear = date.getUTCFullYear();
  // Month is 0-indexed from the Date method, add 1 to match with the string month
  const dateMonth = date.getUTCMonth() + 1;
  const dateDay = date.getUTCDate();

  const valueYear = Number(value.slice(0, 4));

  const valueMonth = Number(value.slice(5, 7));
  const valueDay = Number(value.slice(8, 10));

  if (
    valueYear !== dateYear ||
    valueMonth !== dateMonth ||
    valueDay !== dateDay
  )
    return false;

  return true;
}

/**
 * Returns true if `value` is in the future. The cutoff is "today in UTC plus
 * one day of grace" - the grace day covers every timezone (a user's local date
 * can be at most one calendar day ahead of UTC), so a legitimate local "today"
 * is never rejected. Assumes `value` has already passed isValidDateString, so
 * the comparison can be a plain lexicographic string compare on YYYY-MM-DD.
 */
export function isFutureDate(value: string): boolean {
  const cutoff = new Date();
  // Date object handles date rollover, i.e Jun 30 -> Jul 1
  cutoff.setUTCDate(cutoff.getUTCDate() + 1);
  const cutoffIso = cutoff.toISOString().slice(0, 10);
  return value > cutoffIso;
}
