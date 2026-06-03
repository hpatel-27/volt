import { BadRequestError } from "../errors.js";

function capitalizeFirstLetter(str: string) {
  if (!str) return ""; // Handles empty strings or null/undefined
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Return null if there are no issues with the validation
// Throws BadRequestError which is picked up by the error middleware
// for all errors to keep error handling in one location
export function validatePositiveInt(name: string, value: unknown): null {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw new BadRequestError(
      `${capitalizeFirstLetter(name)} is required and must be a positive integer`,
    );
  }
  return null;
}

export function validateNonNegativeNumber(name: string, value: unknown): null {
  if (typeof value !== "number" || value < 0) {
    throw new BadRequestError(
      `${capitalizeFirstLetter(name)} is required and must be a non-negative number`,
    );
  }
  return null;
}

export function validatePositiveNumber(name: string, value: unknown): null {
  if (typeof value !== "number" || value <= 0) {
    throw new BadRequestError(
      `${capitalizeFirstLetter(name)} is required and must be a positive number`,
    );
  }
  return null;
}
