/**
 * Centralized error handling for production reliability.
 */

import { logger } from "./logger";

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public metadata?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function handleError(error: unknown, context: string): AppError {
  if (error instanceof AppError) {
    logger.error(`${context}: ${error.message}`, {
      error: error.code,
      metadata: error.metadata,
    });
    return error;
  }

  if (error instanceof Error) {
    logger.error(`${context}: ${error.message}`, { error: error.name });
    return new AppError("INTERNAL_ERROR", "An unexpected error occurred", 500);
  }

  logger.error(`${context}: Unknown error`, { error: String(error) });
  return new AppError("UNKNOWN_ERROR", "An unexpected error occurred", 500);
}

export function createErrorResponse(error: AppError) {
  return {
    success: false as const,
    error: error.message,
    code: error.code,
  };
}

export function withErrorHandling<T>(fn: () => Promise<T>, context: string): Promise<T> {
  return fn().catch((error) => {
    throw handleError(error, context);
  });
}
