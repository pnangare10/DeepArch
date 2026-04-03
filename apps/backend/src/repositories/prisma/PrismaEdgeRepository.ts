import prisma from '../../utils/db.js';
import type { ArchEdge, CreateEdgeDTO, UpdateEdgeDTO } from '@deeparch/shared';
import type { IEdgeRepository } from '../interfaces/IEdgeRepository.js';

function toArchEdge(row: any): ArchEdge {
  return {
    id: row.id,
    projectId: row.projectId,
    sourceId: row.sourceId,
    targetId: row.targetId,
    parentId: row.parentId,
    sourceHandle: row.sourceHandle ?? null,
    targetHandle: row.targetHandle ?? null,
    label: row.label,
    edgeType: row.edgeType,
    metadata: JSON.parse(row.metadata || '{}'),
    style: row.style ? JSON.parse(row.style) : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class PrismaEdgeRepository implements IEdgeRepository {
  async findByParent(projectId: string, parentId: string | null): Promise<ArchEdge[]> {
    const edges = await prisma.edge.findMany({
      where: { projectId, parentId },
      orderBy: { createdAt: 'asc' },
    });
    return edges.map(toArchEdge);
  }

  async findById(id: string): Promise<ArchEdge | null> {
    const edge = await prisma.edge.findUnique({ where: { id } });
    if (!edge) return null;
    return toArchEdge(edge);
  }

  async create(projectId: string, data: CreateEdgeDTO): Promise<ArchEdge> {
    const edge = await prisma.edge.create({
      data: {
        projectId,
        sourceId: data.sourceId,
        targetId: data.targetId,
        parentId: data.parentId ?? null,
        sourceHandle: data.sourceHandle ?? null,
        targetHandle: data.targetHandle ?? null,
        label: data.label,
        edgeType: data.edgeType ?? 'default',
        metadata: data.metadata ? JSON.stringify(data.metadata) : undefined,
        style: data.style ? JSON.stringify(data.style) : undefined,
      },
    });
    return toArchEdge(edge);
  }

  async update(id: string, data: UpdateEdgeDTO): Promise<ArchEdge> {
    const updateData: any = { ...data };
    if (data.metadata !== undefined) {
      updateData.metadata = JSON.stringify(data.metadata);
    }
    if (data.style !== undefined) {
      updateData.style = JSON.stringify(data.style);
    }
    const edge = await prisma.edge.update({
      where: { id },
      data: updateData,
    });
    return toArchEdge(edge);
  }

  async delete(id: string): Promise<void> {
    await prisma.edge.delete({ where: { id } });
  }
}
