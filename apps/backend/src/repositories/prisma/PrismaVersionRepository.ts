import prisma from '../../utils/db.js';
import type { ArchNode, ArchEdge, ProjectVersion } from '@deeparch/shared';
import type { IVersionRepository, VersionSnapshot } from '../interfaces/IVersionRepository.js';

function toDto(v: {
  id: string;
  projectId: string;
  name: string;
  nodeCount: number;
  edgeCount: number;
  createdAt: Date;
  createdBy: { id: string; name: string };
}): ProjectVersion {
  return {
    id: v.id,
    projectId: v.projectId,
    name: v.name,
    nodeCount: v.nodeCount,
    edgeCount: v.edgeCount,
    createdAt: v.createdAt.toISOString(),
    createdBy: { id: v.createdBy.id, name: v.createdBy.name },
  };
}

// Order nodes so every parent precedes its children (FK-safe insert order)
function topoSort(nodes: ArchNode[]): ArchNode[] {
  const byParent = new Map<string | null, ArchNode[]>();
  for (const n of nodes) {
    const key = n.parentId ?? null;
    const list = byParent.get(key) ?? [];
    list.push(n);
    byParent.set(key, list);
  }
  const sorted: ArchNode[] = [];
  const queue: (string | null)[] = [null];
  while (queue.length > 0) {
    const parentId = queue.shift()!;
    for (const node of byParent.get(parentId) ?? []) {
      sorted.push(node);
      queue.push(node.id);
    }
  }
  // Nodes with a missing parent (corrupt snapshot) are dropped rather than breaking the insert
  return sorted;
}

export class PrismaVersionRepository implements IVersionRepository {
  async listByProject(projectId: string): Promise<ProjectVersion[]> {
    const versions = await prisma.projectVersion.findMany({
      where: { projectId },
      include: { createdBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return versions.map(toDto);
  }

  async findById(id: string): Promise<(ProjectVersion & { snapshot: VersionSnapshot }) | null> {
    const v = await prisma.projectVersion.findUnique({
      where: { id },
      include: { createdBy: { select: { id: true, name: true } } },
    });
    if (!v) return null;
    return { ...toDto(v), snapshot: JSON.parse(v.snapshot) as VersionSnapshot };
  }

  async create(projectId: string, name: string, createdById: string): Promise<ProjectVersion> {
    const rawNodes = await prisma.node.findMany({ where: { projectId }, orderBy: { createdAt: 'asc' } });
    const rawEdges = await prisma.edge.findMany({ where: { projectId }, orderBy: { createdAt: 'asc' } });

    const nodes: ArchNode[] = rawNodes.map((n) => ({
      id: n.id,
      projectId: n.projectId,
      parentId: n.parentId,
      name: n.name,
      description: n.description,
      nodeType: n.nodeType,
      positionX: n.positionX,
      positionY: n.positionY,
      width: n.width,
      height: n.height,
      metadata: JSON.parse(n.metadata || '{}'),
      style: n.style ? JSON.parse(n.style) : null,
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
    }));

    const edges: ArchEdge[] = rawEdges.map((e) => ({
      id: e.id,
      projectId: e.projectId,
      sourceId: e.sourceId,
      targetId: e.targetId,
      parentId: e.parentId,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
      label: e.label,
      edgeType: e.edgeType,
      metadata: JSON.parse(e.metadata || '{}'),
      style: e.style ? JSON.parse(e.style) : null,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    }));

    const snapshot: VersionSnapshot = { version: '1', nodes, edges };

    const v = await prisma.projectVersion.create({
      data: {
        projectId,
        name,
        snapshot: JSON.stringify(snapshot),
        nodeCount: nodes.length,
        edgeCount: edges.length,
        createdById,
      },
      include: { createdBy: { select: { id: true, name: true } } },
    });
    return toDto(v);
  }

  async delete(id: string): Promise<void> {
    await prisma.projectVersion.delete({ where: { id } });
  }

  async restore(projectId: string, snapshot: VersionSnapshot): Promise<void> {
    const nodes = topoSort(snapshot.nodes);
    const nodeIds = new Set(nodes.map((n) => n.id));

    await prisma.$transaction(async (tx) => {
      // Wipe current tree — edges cascade with nodes, but delete explicitly for clarity
      await tx.edge.deleteMany({ where: { projectId } });
      await tx.node.deleteMany({ where: { projectId } });

      // Re-create with original IDs so intra-snapshot references stay valid
      if (nodes.length > 0) {
        await tx.node.createMany({
          data: nodes.map((n) => ({
            id: n.id,
            projectId,
            parentId: n.parentId,
            name: n.name,
            description: n.description,
            nodeType: n.nodeType,
            positionX: n.positionX,
            positionY: n.positionY,
            width: n.width,
            height: n.height,
            metadata: JSON.stringify(n.metadata),
            style: n.style ? JSON.stringify(n.style) : null,
            createdAt: new Date(n.createdAt),
            updatedAt: new Date(n.updatedAt),
          })),
        });
      }

      const edges = snapshot.edges.filter(
        (e) =>
          nodeIds.has(e.sourceId) &&
          nodeIds.has(e.targetId) &&
          (e.parentId == null || nodeIds.has(e.parentId)),
      );
      if (edges.length > 0) {
        await tx.edge.createMany({
          data: edges.map((e) => ({
            id: e.id,
            projectId,
            sourceId: e.sourceId,
            targetId: e.targetId,
            parentId: e.parentId,
            sourceHandle: e.sourceHandle,
            targetHandle: e.targetHandle,
            label: e.label,
            edgeType: e.edgeType,
            metadata: JSON.stringify(e.metadata),
            style: e.style ? JSON.stringify(e.style) : null,
            createdAt: new Date(e.createdAt),
            updatedAt: new Date(e.updatedAt),
          })),
        });
      }
    });
  }
}
