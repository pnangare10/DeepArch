import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler.js';

declare global {
  namespace Express {
    interface Request {
      user?: { userId: string; email: string };
    }
  }
}

export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return next(new AppError(401, 'Unauthorized'));
  try {
    const secret = process.env.JWT_SECRET || 'deeparch-dev-secret-do-not-use-in-production';
    req.user = jwt.verify(token, secret) as { userId: string; email: string };
    next();
  } catch {
    next(new AppError(401, 'Invalid or expired token'));
  }
}
