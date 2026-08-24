export class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const notFound = (message = 'Resource not found') => new AppError(message, 404, 'NOT_FOUND');
export const badRequest = (message = 'Bad request') => new AppError(message, 400, 'BAD_REQUEST');
export const unauthorized = (message = 'Unauthorized') => new AppError(message, 401, 'UNAUTHORIZED');
export const forbidden = (message = 'Forbidden') => new AppError(message, 403, 'FORBIDDEN');
export const conflict = (message = 'Conflict') => new AppError(message, 409, 'CONFLICT');
