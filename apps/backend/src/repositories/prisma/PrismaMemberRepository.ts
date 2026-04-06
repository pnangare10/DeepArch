import { PrismaClient } from '@prisma/client';
import type { ProjectRole } from '@deeparch/shared';
import type { IMemberRepository, MemberRecord } from '../interfaces/IMemberRepository.js';

const prisma = new PrismaClient();

function toRecord(m: {
  id: string;
  projectId: string;
  userId: string;
  role: string;
  createdAt: Date;
  user: { name: string; email: string };
}): MemberRecord {
  return {
    id: m.id,
    projectId: m.projectId,
    userId: m.userId,
    role: m.role as ProjectRole,
    createdAt: m.createdAt,
    user: m.user,
  };
}

export class PrismaMemberRepository implements IMemberRepository {
  async findByProject(projectId: string): Promise<MemberRecord[]> {
    const rows = await prisma.projectMember.findMany({
      where: { projectId },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toRecord);
  }

  async findByProjectAndUser(projectId: string, userId: string): Promise<MemberRecord | null> {
    const row = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
      include: { user: { select: { name: true, email: true } } },
    });
    return row ? toRecord(row) : null;
  }

  async upsert(projectId: string, userId: string, role: ProjectRole): Promise<MemberRecord> {
    const row = await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId, userId } },
      create: { projectId, userId, role },
      update: { role },
      include: { user: { select: { name: true, email: true } } },
    });
    return toRecord(row);
  }

  async updateRole(projectId: string, userId: string, role: ProjectRole): Promise<MemberRecord> {
    const row = await prisma.projectMember.update({
      where: { projectId_userId: { projectId, userId } },
      data: { role },
      include: { user: { select: { name: true, email: true } } },
    });
    return toRecord(row);
  }

  async remove(projectId: string, userId: string): Promise<void> {
    await prisma.projectMember.delete({
      where: { projectId_userId: { projectId, userId } },
    });
  }
}
