import prisma from '../../utils/db.js';
import type { User, UserPreferences } from '@deeparch/shared';
import type { IUserRepository } from '../interfaces/IUserRepository.js';

function toUser(row: { id: string; email: string; name: string; createdAt: Date; updatedAt: Date; themePreference?: string | null }): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    themePreference: row.themePreference || undefined,
  };
}

export class PrismaUserRepository implements IUserRepository {
  async findByEmail(email: string): Promise<User | null> {
    const rows = await prisma.$queryRawUnsafe<Array<{
      id: string; email: string; name: string; password: string;
      createdAt: string; updatedAt: string; themePreference: string | null;
    }>>(`SELECT * FROM User WHERE email = ?`, email);
    if (!rows.length) return null;
    const r = rows[0];
    return {
      id: r.id, email: r.email, name: r.name,
      createdAt: r.createdAt, updatedAt: r.updatedAt,
      themePreference: r.themePreference ?? undefined,
    };
  }

  // Returns the user AND password hash (needed by authService for verification)
  async findByEmailWithPassword(email: string): Promise<(User & { password: string }) | null> {
    const rows = await prisma.$queryRawUnsafe<Array<{
      id: string; email: string; name: string; password: string;
      createdAt: string; updatedAt: string; themePreference: string | null;
    }>>(`SELECT * FROM User WHERE email = ?`, email);
    if (!rows.length) return null;
    const r = rows[0];
    return {
      id: r.id, email: r.email, name: r.name, password: r.password,
      createdAt: r.createdAt, updatedAt: r.updatedAt,
      themePreference: r.themePreference ?? undefined,
    };
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

  async updatePreferences(userId: string, preferences: UserPreferences): Promise<User> {
    // Use raw SQL to avoid Prisma client regeneration requirement for new columns
    await prisma.$executeRawUnsafe(
      `UPDATE "User" SET "themePreference" = ?, "updatedAt" = datetime('now') WHERE id = ?`,
      preferences.themePreference ?? 'system',
      userId,
    );
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');
    return toUser(user);
  }

  async getPreferences(userId: string): Promise<UserPreferences> {
    const rows = await prisma.$queryRawUnsafe<{ themePreference: string | null }[]>(
      `SELECT "themePreference" FROM "User" WHERE id = ?`,
      userId,
    );
    if (!rows.length) throw new Error('User not found');
    const theme = rows[0].themePreference as 'light' | 'dark' | 'system' | undefined;
    return { themePreference: theme ?? undefined };
  }
}
