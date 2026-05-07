export class FetchError extends Error {
  status: number;
  requestId: string | null;
  detail: string;

  constructor(
    status: number,
    detail: string,
    requestId: string | null,
    message?: string,
  ) {
    super(
      message ??
        `Fetch error for Request ${requestId ?? "unknown"}: ${status} ${detail}`,
    );
    this.name = "FetchError";
    this.status = status;
    this.requestId = requestId;
    this.detail = detail;
  }
}

export function getUserFacingMessage(error: unknown): string {
  if (error instanceof FetchError) {
    if (error.status >= 500) return "Server error, please try again.";
    return error.detail;
  }
  return "Couldn't reach the server.";
}
