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

// Throws if both bounds are present and min exceeds max. Bounds that are
// undefined (field omitted from the request) are skipped — partial updates that
// touch only one side can't be cross-checked without the stored value, so we
// only enforce the invariant when the caller supplies both numbers.
export function validateRange(
  minName: string,
  minValue: number | undefined,
  maxName: string,
  maxValue: number | undefined,
): void {
  if (minValue !== undefined && maxValue !== undefined && minValue > maxValue) {
    throw new BadRequestError(
      `${capitalizeFirstLetter(minName)} cannot be greater than ${maxName}`,
    );
  }
}

// Matches a leading URI scheme like "javascript:", "data:", "https:". Per RFC
// 3986 a scheme is ALPHA *( ALPHA / DIGIT / "+" / "-" / "." ) followed by ":".
// A value with NO match is treated as a relative path.
const URL_SCHEME_REGEX = /^([a-z][a-z0-9+.-]*):/i;

// Returns true only for image references we consider safe to store: relative
// paths (no scheme) or absolute https URLs. Everything else — javascript:,
// data:, http:, file:, etc. — is rejected.
export function isSafeImageRef(value: string): boolean {
  // Protocol-relative URLs ("//host/path") carry no scheme, so the scheme check
  // below would wave them through as relative paths — but the browser resolves
  // them to an external host. Reject them up front.
  if (value.startsWith("//")) {
    return false;
  }

  const match = URL_SCHEME_REGEX.exec(value);
  if (match === null) {
    return true;
  } else {
    // Scheme is present, allow https. match[1] holds the captured scheme without the colon.
    const scheme = match[1];
    if (scheme?.toUpperCase() === "HTTPS") {
      return true;
    } else {
      return false;
    }
  }
}

// Same shape as validateStringArray but additionally enforces isSafeImageRef on
// each element, so stored image references can never carry an unsafe scheme.
export function validateImageArray(
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
  return value.map((el, i) => {
    const trimmed = validateBoundedString(`${name}[${i}]`, el, maxLen);
    if (!isSafeImageRef(trimmed)) {
      throw new BadRequestError(
        `${capitalizeFirstLetter(name)}[${i}] must be a relative path or an https URL`,
      );
    }
    return trimmed;
  });
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
