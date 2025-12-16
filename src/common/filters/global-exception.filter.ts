import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { BaseError } from '../errors/base.error';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status: number;
    let errorResponse: any;

    if (exception instanceof BaseError) {
      status = exception.httpStatus;
      errorResponse = exception.toJSON();
      if (status >= 500) {
        this.logger.error(
          `[${request.method}] ${request.url} - ${exception.code}: ${exception.message}`,
          exception.stack,
        );
      } else {
        this.logger.warn(
          `[${request.method}] ${request.url} - ${exception.code}: ${exception.message}`,
        );
      }
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      errorResponse = {
        error: {
          code: 'VALIDATION_ERROR',
          message: exception.message,
          details:
            typeof exceptionResponse === 'object'
              ? exceptionResponse
              : { message: exceptionResponse },
          timestamp: new Date().toISOString(),
        },
      };
      this.logger.warn(`[${request.method}] ${request.url} - HTTP ${status}: ${exception.message}`);
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      const errorMessage =
        exception instanceof Error ? exception.message : 'An unexpected error occurred';
      errorResponse = {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal server error occurred',
          ...(process.env.NODE_ENV !== 'production' && {
            details: errorMessage,
          }),
          timestamp: new Date().toISOString(),
        },
      };
      this.logger.error(
        `[${request.method}] ${request.url} - Unhandled exception: ${errorMessage}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json(errorResponse);
  }
}
