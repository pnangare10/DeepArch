import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import type { AuthResponse, LoginDTO, RegisterDTO } from '@deeparch/shared';
import type { IUserRepository } from '../repositories/interfaces/IUserRepository.js';
import { AppError } from '../middleware/errorHandler.js';

const BCRYPT_ROUNDS = 10;

function signToken(userId: string, email: string): string {
  const secret = process.env.JWT_SECRET || 'deeparch-dev-secret-do-not-use-in-production';
  return jwt.sign({ userId, email }, secret, { expiresIn: '7d' });
}

export class AuthService {
  constructor(private userRepo: IUserRepository) {}

  async register(data: RegisterDTO): Promise<AuthResponse> {
    if (!data.email?.trim()) throw new AppError(400, 'Email is required');
    if (!data.name?.trim()) throw new AppError(400, 'Name is required');
    if (!data.password || data.password.length < 6) throw new AppError(400, 'Password must be at least 6 characters');

    const existing = await this.userRepo.findByEmail(data.email.toLowerCase());
    if (existing) throw new AppError(409, 'An account with this email already exists');

    const hashedPassword = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
    const user = await this.userRepo.create({
      email: data.email.toLowerCase(),
      name: data.name.trim(),
      password: hashedPassword,
    });

    return { user, token: signToken(user.id, user.email) };
  }

  async login(data: LoginDTO): Promise<AuthResponse> {
    if (!data.email?.trim()) throw new AppError(400, 'Email is required');
    if (!data.password) throw new AppError(400, 'Password is required');

    const userWithPassword = await this.userRepo.findByEmailWithPassword(data.email.toLowerCase());
    if (!userWithPassword) throw new AppError(401, 'Invalid email or password');

    if (userWithPassword.lockedUntil && userWithPassword.lockedUntil > new Date()) {
      const retryAfter = Math.ceil((userWithPassword.lockedUntil.getTime() - Date.now()) / 1000);
      throw new AppError(429, 'Account temporarily locked. Try again later.', { retryAfter });
    }

    const valid = await bcrypt.compare(data.password, userWithPassword.password);
    if (!valid) {
      const result = await this.userRepo.recordFailedLogin(userWithPassword.id);
      if (result.lockedUntil) {
        const retryAfter = Math.ceil((result.lockedUntil.getTime() - Date.now()) / 1000);
        throw new AppError(429, 'Account temporarily locked after too many failed attempts.', { retryAfter });
      }
      throw new AppError(401, 'Invalid email or password');
    }

    await this.userRepo.resetFailedLogins(userWithPassword.id);
    const { password: _, ...user } = userWithPassword;
    return { user, token: signToken(user.id, user.email) };
  }

  async forgotPassword(email: string): Promise<{ message: string; devToken?: string }> {
    const user = await this.userRepo.findByEmail(email.toLowerCase());

    if (user) {
      const plainToken = crypto.randomBytes(32).toString('hex');
      const hash = crypto.createHash('sha256').update(plainToken).digest('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await this.userRepo.setResetToken(user.id, hash, expiresAt);

      // Return dev token in non-production environments
      if (process.env.NODE_ENV !== 'production') {
        return { message: 'If that email exists, a reset link has been sent.', devToken: plainToken };
      }
    }

    return { message: 'If that email exists, a reset link has been sent.' };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ user: any; token: string }> {
    if (!token?.trim()) throw new AppError(400, 'Reset token is required');
    if (!newPassword || newPassword.length < 6) throw new AppError(400, 'Password must be at least 6 characters');

    const hash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await this.userRepo.findByResetTokenHash(hash);

    if (!user || !user.resetTokenExpiresAt || user.resetTokenExpiresAt < new Date()) {
      throw new AppError(400, 'Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    // Update user password via Prisma directly since we don't have an updatePassword repo method
    const prisma = await import('../../utils/db.js').then(m => m.default);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    await this.userRepo.clearResetToken(user.id);
    await this.userRepo.resetFailedLogins(user.id); // unlock if locked

    const { password: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token: signToken(user.id, user.email) };
  }
}
