class NotFoundError extends Error {
  name: string;
  statusCode: number;

  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
    this.statusCode = 404;
  }
}

class DuplicateEntryError extends Error {
  name: string;
  statusCode: number;

  constructor(message: string) {
    super(message);
    this.name = "DuplicateEntryError";
    this.statusCode = 409;
  }
}

export { NotFoundError, DuplicateEntryError };
