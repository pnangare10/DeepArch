import type { ProjectVersion } from '@deeparch/shared';
import { PrismaVersionRepository } from '../repositories/prisma/PrismaVersionRepository.js';
import { AppError } from '../middleware/errorHandler.js';
import { assertMember, assertMinRole } from './memberService.js';

const repo = new PrismaVersionRepository();

const MAX_NAME_LENGTH = 100;

export async function listVersions(projectId: string, userId: string): Promise<ProjectVersion[]> {
  await assertMember(projectId, userId);
  return repo.listByProject(projectId);
}

export async function createVersion(
  projectId: string,
  userId: string,
  name: string,
): Promise<ProjectVersion> {
  await assertMinRole(projectId, userId, 'developer');
  const trimmed = name?.trim();
  if (!trimmed) throw new AppError(400, 'Version name is required');
  if (trimmed.length > MAX_NAME_LENGTH) {
    throw new AppError(400, `Version name must be at most ${MAX_NAME_LENGTH} characters`);
  }
  return repo.create(projectId, trimmed, userId);
}

export async function restoreVersion(
  projectId: string,
  versionId: string,
  userId: string,
): Promise<ProjectVersion> {
  await assertMinRole(projectId, userId, 'dev-architect');

  const version = await repo.findById(versionId);
  if (!version || version.projectId !== projectId) {
    throw new AppError(404, 'Version not found');
  }

  // Safety net: snapshot the current state before overwriting it
  const backup = await repo.create(projectId, `Backup before restoring "${version.name}"`, userId);

  await repo.restore(projectId, version.snapshot);
  return backup;
}

export async function deleteVersion(
  projectId: string,
  versionId: string,
  userId: string,
): Promise<void> {
  await assertMinRole(projectId, userId, 'dev-architect');
  const version = await repo.findById(versionId);
  if (!version || version.projectId !== projectId) {
    throw new AppError(404, 'Version not found');
  }
  await repo.delete(versionId);
}
