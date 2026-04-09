import type { User, UserPreferences } from '@deeparch/shared';

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  create(data: { email: string; name: string; password: string }): Promise<User>;
  updatePreferences(userId: string, preferences: UserPreferences): Promise<User>;
  getPreferences(userId: string): Promise<UserPreferences>;
}
