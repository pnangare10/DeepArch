import type { ProjectRole } from '@deeparch/shared';
import { ROLE_HIERARCHY } from '@deeparch/shared';
import { PrismaMemberRepository } from '../repositories/prisma/PrismaMemberRepository.js';
import type { MemberRecord } from '../repositories/interfaces/IMemberRepository.js';
import { AppError } from '../middleware/errorHandler.js';
import prisma from '../utils/db.js';

const repo = new PrismaMemberRepository();

export function hasMinRole(userRole: ProjectRole, minRole: ProjectRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
}

export async function getMemberRole(projectId: string, userId: string): Promise<ProjectRole | null> {
  // Check if user is project owner
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { userId: true } });
  if (!project) return null;
  if (project.userId === userId) return 'owner';

  const member = await repo.findByProjectAndUser(projectId, userId);
  return member ? member.role : null;
}

export async function assertMember(projectId: string, userId: string): Promise<ProjectRole> {
  const role = await getMemberRole(projectId, userId);
  if (!role) throw new AppError(403, 'You do not have access to this project');
  return role;
}

export async function assertMinRole(projectId: string, userId: string, minRole: ProjectRole): Promise<void> {
  const role = await assertMember(projectId, userId);
  if (!hasMinRole(role, minRole)) {
    throw new AppError(403, `This action requires at least ${minRole} role`);
  }
}

export async function listMembers(projectId: string, requesterId: string): Promise<MemberRecord[]> {
  await assertMember(projectId, requesterId);
  return repo.findByProject(projectId);
}

export async function inviteMember(
  projectId: string,
  ownerId: string,
  email: string,
  role: Exclude<ProjectRole, 'owner'>,
): Promise<MemberRecord> {
  await assertMinRole(projectId, ownerId, 'owner');

  // Resolve email → userId
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError(404, `No user found with email ${email}`);

  // Owner cannot be re-invited
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { userId: true } });
  if (project?.userId === user.id) throw new AppError(409, 'User is already the project owner');

  return repo.upsert(projectId, user.id, role);
}

export async function changeMemberRole(
  projectId: string,
  ownerId: string,
  targetUserId: string,
  role: Exclude<ProjectRole, 'owner'>,
): Promise<MemberRecord> {
  await assertMinRole(projectId, ownerId, 'owner');
  const member = await repo.findByProjectAndUser(projectId, targetUserId);
  if (!member) throw new AppError(404, 'Member not found');
  return repo.updateRole(projectId, targetUserId, role);
}

export async function removeMember(projectId: string, ownerId: string, targetUserId: string): Promise<void> {
  await assertMinRole(projectId, ownerId, 'owner');
  const member = await repo.findByProjectAndUser(projectId, targetUserId);
  if (!member) throw new AppError(404, 'Member not found');
  await repo.remove(projectId, targetUserId);
}
