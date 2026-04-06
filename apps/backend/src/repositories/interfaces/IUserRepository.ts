import type { User } from '@deeparch/shared';

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  create(data: { email: string; name: string; password: string }): Promise<User>;
}
