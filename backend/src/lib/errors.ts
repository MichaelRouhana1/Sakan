export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(404, message, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export class InsufficientCreditsError extends AppError {
  constructor(message = "Insufficient credits") {
    super(402, message, "INSUFFICIENT_CREDITS");
    this.name = "InsufficientCreditsError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(403, message, "FORBIDDEN");
    this.name = "ForbiddenError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(401, message, "UNAUTHORIZED");
    this.name = "UnauthorizedError";
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation failed") {
    super(400, message, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict") {
    super(409, message, "CONFLICT");
    this.name = "ConflictError";
  }
}

/** Hard listing fields after the 24h structural window. */
export class StructuralFieldsLockedError extends AppError {
  readonly fields: string[];

  constructor(fields: string[]) {
    const list = fields.join(", ");
    super(
      409,
      `Structural fields are locked after 24 hours: ${list}`,
      "STRUCTURAL_FIELDS_LOCKED",
    );
    this.name = "StructuralFieldsLockedError";
    this.fields = fields;
  }
}
