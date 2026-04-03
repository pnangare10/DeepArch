import prisma from '../../utils/db.js';
import type {
  ArchNode,
  CreateNodeDTO,
  UpdateNodeDTO,
  BatchPositionUpdate,
  NodeMetadata,
} from '@deeparch/shared';
import { DEFAULT_NODE_METADATA } from '@deeparch/shared';
import type { INodeRepository } from '../interfaces/INodeRepository.js';

function toArchNode(row: any): ArchNode {
  return {
    id: row.id,
    projectId: row.projectId,
    parentId: row.parentId,
    name: row.name,
    description: row.description,
    nodeType: row.nodeType,
    positionX: row.positionX,
    positionY: row.positionY,
    width: row.width,
    height: row.height,
    metadata: JSON.parse(row.metadata || '{}'),
    style: row.style ? JSON.parse(row.style) : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    childCount: row._count?.children ?? undefined,
  };
}

export class PrismaNodeRepository implements INodeRepository {
  async findByParent(projectId: string, parentId: string | null): Promise<ArchNode[]> {
    const nodes = await prisma.node.findMany({
      where: { projectId, parentId },
      include: { _count: { select: { children: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return nodes.map(toArchNode);
  }

  async findById(id: string): Promise<ArchNode | null> {
    const node = await prisma.node.findUnique({
      where: { id },
      include: { _count: { select: { children: true } } },
    });
    if (!node) return null;
    return toArchNode(node);
  }

  async create(projectId: string, data: CreateNodeDTO): Promise<ArchNode> {
    const metadata: NodeMetadata = {
      ...DEFAULT_NODE_METADATA,
      ...data.metadata,
    };
    const node = await prisma.node.create({
      data: {
        projectId,
        parentId: data.parentId ?? null,
        name: data.name,
        description: data.description,
        nodeType: data.nodeType ?? 'default',
        positionX: data.positionX,
        positionY: data.positionY,
        width: data.width,
        height: data.height,
        metadata: JSON.stringify(metadata),
        style: data.style ? JSON.stringify(data.style) : undefined,
      },
      include: { _count: { select: { children: true } } },
    });
    return toArchNode(node);
  }

  async update(id: string, data: UpdateNodeDTO): Promise<ArchNode> {
    const updateData: any = { ...data };
    if (data.metadata !== undefined) {
      const existing = await prisma.node.findUnique({ where: { id } });
      const existingMeta = existing ? JSON.parse(existing.metadata || '{}') : {};
      updateData.metadata = JSON.stringify({ ...existingMeta, ...data.metadata });
    }
    if (data.style !== undefined) {
      updateData.style = JSON.stringify(data.style);
    }
    const node = await prisma.node.update({
      where: { id },
      data: updateData,
      include: { _count: { select: { children: true } } },
    });
    return toArchNode(node);
  }

  async delete(id: string): Promise<void> {
    await prisma.node.delete({ where: { id } });
  }

  async batchUpdatePositions(updates: BatchPositionUpdate[]): Promise<void> {
    await prisma.$transaction(
      updates.map((u) =>
        prisma.node.update({
          where: { id: u.id },
          data: { positionX: u.positionX, positionY: u.positionY },
        }),
      ),
    );
  }

  async searchByName(projectId: string, query: string): Promise<ArchNode[]> {
    const nodes = await prisma.node.findMany({
      where: {
        projectId,
        OR: [
          { name: { contains: query } },
          { description: { contains: query } },
        ],
      },
      include: { _count: { select: { children: true } } },
      take: 50,
    });
    return nodes.map(toArchNode);
  }

  async getAncestorPath(nodeId: string): Promise<{ id: string; name: string }[]> {
    const path: { id: string; name: string }[] = [];
    let currentId: string | null = nodeId;

    while (currentId) {
      const node = await prisma.node.findUnique({
        where: { id: currentId },
        select: { id: true, name: true, parentId: true },
      });
      if (!node) break;
      path.unshift({ id: node.id, name: node.name });
      currentId = node.parentId;
    }

    return path;
  }
}
