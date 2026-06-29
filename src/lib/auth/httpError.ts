export class HttpError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function httpStatusFromError(err: unknown, fallback = 500): number {
  if (err instanceof HttpError) return err.statusCode;
  if (err instanceof Error && "statusCode" in err && typeof (err as Error & { statusCode: unknown }).statusCode === "number") {
    return (err as Error & { statusCode: number }).statusCode;
  }
  return fallback;
}
