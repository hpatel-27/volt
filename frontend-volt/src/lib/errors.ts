export class FetchError extends Error {
  status: number;
  requestId: string | null;

  constructor(status: number, message: string, requestId: string | null) {
    super(message);
    this.name = "FetchError";
    this.status = status;
    this.requestId = requestId;
  }
}
