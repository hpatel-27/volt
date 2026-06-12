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
    value < 1 ||
    value > max
  ) {
    throw new BadRequestError(
      `${capitalizeFirstLetter(name)} is required and must be a positive integer`,
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
      `${capitalizeFirstLetter(name)}  must be between 0 and ${max}`,
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
