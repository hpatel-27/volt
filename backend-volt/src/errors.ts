class NotFoundError extends Error {
  name: string;
  statusCode: number;

  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
    this.statusCode = 404;
  }
}

export { NotFoundError };
