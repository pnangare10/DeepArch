import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public data?: Record<string, any>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    const response: any = { error: err.message };
    if (err.data?.retryAfter) {
      res.set('Retry-After', err.data.retryAfter.toString());
      response.retryAfter = err.data.retryAfter;
    }
    res.status(err.statusCode).json(response);
    return;
  }

  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
}
