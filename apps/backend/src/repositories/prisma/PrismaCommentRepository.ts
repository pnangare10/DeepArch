import { PrismaClient } from '@prisma/client';
import type { ICommentRepository, CommentRecord } from '../interfaces/ICommentRepository.js';

const prisma = new PrismaClient();

function toRecord(c: {
  id: string;
  nodeId: string;
  projectId: string;
  userId: string;
  text: string;
  createdAt: Date;
  updatedAt: Date;
  user: { name: string };
}): CommentRecord {
  return {
    id: c.id,
    nodeId: c.nodeId,
    projectId: c.projectId,
    userId: c.userId,
    text: c.text,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    user: c.user,
  };
}

export class PrismaCommentRepository implements ICommentRepository {
  async findByNode(nodeId: string): Promise<CommentRecord[]> {
    const rows = await prisma.comment.findMany({
      where: { nodeId },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toRecord);
  }

  async findById(id: string): Promise<CommentRecord | null> {
    const row = await prisma.comment.findUnique({
      where: { id },
      include: { user: { select: { name: true } } },
    });
    return row ? toRecord(row) : null;
  }

  async create(nodeId: string, projectId: string, userId: string, text: string): Promise<CommentRecord> {
    const row = await prisma.comment.create({
      data: { nodeId, projectId, userId, text },
      include: { user: { select: { name: true } } },
    });
    return toRecord(row);
  }

  async update(id: string, text: string): Promise<CommentRecord> {
    const row = await prisma.comment.update({
      where: { id },
      data: { text },
      include: { user: { select: { name: true } } },
    });
    return toRecord(row);
  }

  async delete(id: string): Promise<void> {
    await prisma.comment.delete({ where: { id } });
  }
}
