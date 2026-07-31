// ─── Centralized Error Handler ──────────────────────────────────────────────
import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public reason?: string;
  public field?: string;

  constructor(message: string, statusCode: number, reason?: string, field?: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.reason = reason || message;
    this.field = field;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Default values
  let statusCode = 500;
  let message = 'Internal server error';
  let reason: string | undefined = undefined;
  let field: string | undefined = undefined;
  let errors: any = undefined;

  // ─── AppError (our custom errors) ───────────────────────────────────────
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    reason = err.reason || err.message;
    field = err.field;
  }

  // ─── Zod Validation Errors ──────────────────────────────────────────────
  else if (err instanceof ZodError) {
    statusCode = 400;
    const firstErr = err.errors[0];
    const fieldName = firstErr ? firstErr.path.join('.') : undefined;
    const errMsg = firstErr ? firstErr.message : 'Invalid request data';
    message = fieldName ? `Validation failed for '${fieldName}': ${errMsg}` : `Validation failed: ${errMsg}`;
    reason = fieldName ? `Field '${fieldName}' failed validation: ${errMsg}` : errMsg;
    field = fieldName || undefined;
    errors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
  }

  // ─── JWT Errors ─────────────────────────────────────────────────────────
  else if (err instanceof TokenExpiredError) {
    statusCode = 401;
    message = 'Token has expired';
  } else if (err instanceof JsonWebTokenError) {
    statusCode = 401;
    message = 'Invalid token';
  }

  // ─── Prisma Errors ──────────────────────────────────────────────────────
  else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': {
        statusCode = 409;
        const target = (err.meta?.target as string[]) || [];
        message = `A record with this ${target.join(', ')} already exists`;
        break;
      }
      case 'P2025':
        statusCode = 404;
        message = 'Record not found';
        break;
      case 'P2003':
        statusCode = 400;
        message = 'Related record not found (foreign key constraint)';
        break;
      default:
        statusCode = 400;
        message = `Database error: ${err.message}`;
    }
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    message = 'Invalid data provided';
  }

  // ─── Log in development ─────────────────────────────────────────────────
  if (process.env.NODE_ENV === 'development') {
    console.error('🔴 Error:', err?.message || err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    error: message,
    details: err?.message || String(err),
    ...(reason && { reason }),
    ...(field && { field }),
    ...(errors && { errors }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

// 404 handler for unknown routes
export function notFoundHandler(req: Request, res: Response): void {
  const msg = `Route ${req.method} ${req.originalUrl} not found`;
  res.status(404).json({
    success: false,
    message: msg,
    error: msg,
  });
}
