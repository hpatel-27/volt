export function parsePositiveNumber(
  raw: string,
  max: number,
  { allowEmpty = false } = {},
): number | null | false {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return allowEmpty ? null : false;

  const num = Number(trimmed);
  if (!Number.isFinite(num)) return false;
  if (num <= 0 || num > max) return false;
  return num;
}

export function parseNonNegativeNumber(
  raw: string,
  max: number,
  { allowEmpty = false } = {},
): number | null | false {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return allowEmpty ? null : false;

  const num = Number(trimmed);
  if (!Number.isFinite(num)) return false;
  if (num < 0 || num > max) return false;
  return num;
}

export function parsePositiveInt(
  raw: string,
  max: number,
  { allowEmpty = false } = {},
): number | null | false {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return allowEmpty ? null : false;

  const num = Number(trimmed);
  if (!Number.isInteger(num)) return false;
  if (num <= 0 || num > max) return false;
  return num;
}

/**
 * Trims and length-bounds a text field, mirroring the backend's
 * `validateBoundedString`.
 */
export function parseBoundedString(
  raw: string,
  { maxLen, allowEmpty = false }: { maxLen: number; allowEmpty?: boolean },
): string | false {
  // Check max length before trimming, min length after
  if (raw.length > maxLen) return false;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return allowEmpty ? trimmed : false;
  return trimmed;
}
