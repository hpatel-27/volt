class NotFoundError extends Error {
  statusCode: number = 404;
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "NotFoundError";
  }
}

class DuplicateEntryError extends Error {
  statusCode: number = 409;
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "DuplicateEntryError";
  }
}

export { NotFoundError, DuplicateEntryError };
