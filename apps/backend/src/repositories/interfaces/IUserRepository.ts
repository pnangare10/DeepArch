import type { User, UserPreferences } from '@deeparch/shared';

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  findByEmailWithPassword(email: string): Promise<(User & { password: string; failedLoginAttempts: number; lockedUntil: Date | null }) | null>;
  create(data: { email: string; name: string; password: string }): Promise<User>;
  updatePreferences(userId: string, preferences: UserPreferences): Promise<User>;
  getPreferences(userId: string): Promise<UserPreferences>;
  setResetToken(userId: string, hash: string, expiresAt: Date): Promise<void>;
  findByResetTokenHash(hash: string): Promise<(User & { password: string; resetTokenHash: string; resetTokenExpiresAt: Date | null }) | null>;
  clearResetToken(userId: string): Promise<void>;
  recordFailedLogin(userId: string): Promise<{ lockedUntil: Date | null }>;
  resetFailedLogins(userId: string): Promise<void>;
}
