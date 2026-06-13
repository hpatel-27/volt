import { BadRequestError } from "../errors.js";

function capitalizeFirstLetter(str: string) {
  if (!str) return ""; // Handles empty strings or null/undefined
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Return null if there are no issues with the validation
// Throws BadRequestError which is picked up by the error middleware
// for all errors to keep error handling in one location
export function validatePositiveInt(
  name: string,
  value: unknown,
  max: number,
): null {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value <= 0 ||
    value > max
  ) {
    throw new BadRequestError(
      `${capitalizeFirstLetter(name)} must be greater than 0 and less than ${max}`,
    );
  }
  return null;
}

export function validateNonNegativeNumber(
  name: string,
  value: unknown,
  max: number,
): null {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > max
  ) {
    throw new BadRequestError(
      `${capitalizeFirstLetter(name)} must be between 0 and ${max}`,
    );
  }
  return null;
}

export function validatePositiveNumber(
  name: string,
  value: unknown,
  max: number,
): null {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value <= 0 ||
    value > max
  ) {
    throw new BadRequestError(
      `${capitalizeFirstLetter(name)} must be between 1 and ${max}`,
    );
  }
  return null;
}

export function validateBoundedString(
  name: string,
  value: unknown,
  maxLen: number,
  { allowEmpty = false } = {},
): string {
  if (typeof value !== "string") {
    throw new BadRequestError(
      `${capitalizeFirstLetter(name)} is required and must be a string`,
    );
  }

  if (value.length > maxLen) {
    throw new BadRequestError(
      `${capitalizeFirstLetter(name)} must be at most ${maxLen} characters long`,
    );
  }

  const trimmed = value.trim();
  if (!allowEmpty && trimmed.length < 1) {
    throw new BadRequestError(
      `${capitalizeFirstLetter(name)} must be a non-empty string`,
    );
  }

  return trimmed; // return the trimmed value, controllers don't need to trim
}

// Caller is responsible for any normalization (e.g. lowercasing) before the
// check. Returns the value so it can be assigned directly.
export function validateEnum(
  name: string,
  value: unknown,
  allowed: readonly string[],
): string {
  if (typeof value !== "string" || !allowed.includes(value)) {
    throw new BadRequestError(
      `${capitalizeFirstLetter(name)} must be one of: ${allowed.join(", ")}`,
    );
  }
  return value;
}

// Validates an array of strings: caps the item count and delegates each element
// to validateBoundedString (which handles enforcement non-empty + maxLen and trims).
// Returns the array of trimmed elements.
export function validateStringArray(
  name: string,
  value: unknown,
  maxItems: number,
  maxLen: number,
): string[] {
  if (!Array.isArray(value)) {
    throw new BadRequestError(
      `${capitalizeFirstLetter(name)} must be an array of strings`,
    );
  }
  if (value.length > maxItems) {
    throw new BadRequestError(
      `${capitalizeFirstLetter(name)} can have at most ${maxItems} items`,
    );
  }
  return value.map((el, i) =>
    validateBoundedString(`${name}[${i}]`, el, maxLen),
  );
}
