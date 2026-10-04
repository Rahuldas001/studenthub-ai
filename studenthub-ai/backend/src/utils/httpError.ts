/** Error carrying an HTTP status code through the middleware chain. */
export class HttpError extends Error {
  readonly status: number;
  readonly details?: Record<string, string[]>;

  constructor(status: number, message: string, details?: Record<string, string[]>) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
  }

  static badRequest(message: string, details?: Record<string, string[]>): HttpError {
    return new HttpError(400, message, details);
  }

  static notFound(message = 'Resource not found'): HttpError {
    return new HttpError(404, message);
  }

  static unauthorized(message = 'Sign-in required'): HttpError {
    return new HttpError(401, message);
  }

  static forbidden(message = 'Access denied'): HttpError {
    return new HttpError(403, message);
  }
}