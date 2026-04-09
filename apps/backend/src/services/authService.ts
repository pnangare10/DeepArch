import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { AuthResponse, LoginDTO, RegisterDTO } from '@deeparch/shared';
import type { PrismaUserRepository } from '../repositories/prisma/PrismaUserRepository.js';
import { AppError } from '../middleware/errorHandler.js';

const BCRYPT_ROUNDS = 10;

function signToken(userId: string, email: string): string {
  const secret = process.env.JWT_SECRET || 'deeparch-dev-secret-do-not-use-in-production';
  return jwt.sign({ userId, email }, secret, { expiresIn: '7d' });
}

export class AuthService {
  constructor(private userRepo: PrismaUserRepository) {}

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

    const valid = await bcrypt.compare(data.password, userWithPassword.password);
    if (!valid) throw new AppError(401, 'Invalid email or password');

    const { password: _, ...user } = userWithPassword;
    return { user, token: signToken(user.id, user.email) };
  }
}
