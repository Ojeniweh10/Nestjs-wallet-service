import { ErrorCode, ErrorCodeToHttpStatus } from './error-codes.enum';

export class BaseError extends Error {
  public readonly code: ErrorCode;
  public readonly httpStatus: number;
  public readonly metadata?: Record<string, any>;
  public readonly timestamp: Date;

  constructor(code: ErrorCode, message: string, metadata?: Record<string, any>) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = this.constructor.name;
    this.code = code;
    this.httpStatus = ErrorCodeToHttpStatus[code];
    this.metadata = metadata;
    this.timestamp = new Date();
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.metadata && { metadata: this.metadata }),
        timestamp: this.timestamp.toISOString(),
      },
    };
  }
}
