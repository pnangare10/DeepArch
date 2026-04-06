import prisma from '../../utils/db.js';
import type { User } from '@deeparch/shared';
import type { IUserRepository } from '../interfaces/IUserRepository.js';

function toUser(row: { id: string; email: string; name: string; createdAt: Date; updatedAt: Date }): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class PrismaUserRepository implements IUserRepository {
  async findByEmail(email: string): Promise<User | null> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return null;
    return toUser(user);
  }

  // Returns the user AND password hash (needed by authService for verification)
  async findByEmailWithPassword(email: string): Promise<(User & { password: string }) | null> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return null;
    return { ...toUser(user), password: user.password };
  }

  async create(data: { email: string; name: string; password: string }): Promise<User> {
    const user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: data.password,
      },
    });
    return toUser(user);
  }
}
