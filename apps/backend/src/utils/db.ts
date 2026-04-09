import { PrismaClient } from '@prisma/client';
import path from 'path';

// For non-SQLite databases (PostgreSQL, MySQL, etc.) pass DATABASE_URL through unchanged.
// For SQLite, resolve relative paths to absolute so the process CWD doesn't matter.
// Falls back to local dev.db only when DATABASE_URL is completely unset.
function resolveDbUrl(): string {
  const env = process.env.DATABASE_URL ?? '';
  if (!env) {
    // No env var at all — local dev fallback
    return `file:${path.resolve(process.cwd(), 'prisma', 'dev.db').replace(/\\/g, '/')}`;
  }
  if (!env.startsWith('file:')) {
    // PostgreSQL, MySQL, etc. — use as-is
    return env;
  }
  // SQLite: resolve relative paths to absolute
  const filePart = env.slice('file:'.length);
  if (path.isAbsolute(filePart)) return env;
  return `file:${path.resolve(process.cwd(), filePart).replace(/\\/g, '/')}`;
}

const prisma = new PrismaClient({ datasourceUrl: resolveDbUrl() });

// Add themePreference column if it doesn't exist (safe to run on every startup)
prisma.$executeRawUnsafe(
  `ALTER TABLE User ADD COLUMN themePreference TEXT DEFAULT 'system'`,
).catch(() => {
  // Silently ignore — column already exists
});

export default prisma;
