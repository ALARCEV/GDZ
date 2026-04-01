export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function badRequest(message: string, details?: unknown) {
  return new ApiError(400, "bad_request", message, details);
}

export function unauthorized(message = "Authentication is required.") {
  return new ApiError(401, "unauthorized", message);
}

export function forbidden(message = "You do not have access to this resource.") {
  return new ApiError(403, "forbidden", message);
}

export function notFound(message = "Resource not found.") {
  return new ApiError(404, "not_found", message);
}

export function conflict(message: string, details?: unknown) {
  return new ApiError(409, "conflict", message, details);
}

export function quotaExceeded(message: string, details?: unknown) {
  return new ApiError(429, "quota_exceeded", message, details);
}

export function unprocessable(message: string, details?: unknown) {
  return new ApiError(422, "unprocessable_entity", message, details);
}
