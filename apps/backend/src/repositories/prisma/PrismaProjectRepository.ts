import prisma from '../../utils/db.js';
import type { Project, CreateProjectDTO, UpdateProjectDTO, ArchNode, ArchEdge } from '@deeparch/shared';
import type { IProjectRepository, ProjectExport } from '../interfaces/IProjectRepository.js';

export class PrismaProjectRepository implements IProjectRepository {
  async findAll(): Promise<Project[]> {
    const projects = await prisma.project.findMany({
      include: { _count: { select: { nodes: true } } },
      orderBy: { updatedAt: 'desc' },
    });
    return projects.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      nodeCount: p._count.nodes,
    }));
  }

  async findById(id: string): Promise<Project | null> {
    const p = await prisma.project.findUnique({
      where: { id },
      include: { _count: { select: { nodes: true } } },
    });
    if (!p) return null;
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      nodeCount: p._count.nodes,
    };
  }

  async create(data: CreateProjectDTO): Promise<Project> {
    const p = await prisma.project.create({ data });
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      nodeCount: 0,
    };
  }

  async update(id: string, data: UpdateProjectDTO): Promise<Project> {
    const p = await prisma.project.update({
      where: { id },
      data,
      include: { _count: { select: { nodes: true } } },
    });
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      nodeCount: p._count.nodes,
    };
  }

  async delete(id: string): Promise<void> {
    await prisma.project.delete({ where: { id } });
  }

  async exportProject(id: string): Promise<ProjectExport> {
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) throw new Error('Project not found');

    const rawNodes = await prisma.node.findMany({ where: { projectId: id }, orderBy: { createdAt: 'asc' } });
    const rawEdges = await prisma.edge.findMany({ where: { projectId: id }, orderBy: { createdAt: 'asc' } });

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

    return {
      version: '1',
      project: { name: project.name, description: project.description },
      nodes,
      edges,
    };
  }

  async importProject(data: ProjectExport): Promise<Project> {
    return prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: { name: data.project.name, description: data.project.description },
      });

      // Build old->new ID map so edges reference correct new node IDs
      const idMap = new Map<string, string>();

      for (const node of data.nodes) {
        const created = await tx.node.create({
          data: {
            projectId: project.id,
            parentId: node.parentId ? idMap.get(node.parentId) ?? null : null,
            name: node.name,
            description: node.description,
            nodeType: node.nodeType,
            positionX: node.positionX,
            positionY: node.positionY,
            width: node.width,
            height: node.height,
            metadata: JSON.stringify(node.metadata),
            style: node.style ? JSON.stringify(node.style) : null,
          },
        });
        idMap.set(node.id, created.id);
      }

      for (const edge of data.edges) {
        const newSourceId = idMap.get(edge.sourceId);
        const newTargetId = idMap.get(edge.targetId);
        if (!newSourceId || !newTargetId) continue; // skip orphaned edges
        await tx.edge.create({
          data: {
            projectId: project.id,
            sourceId: newSourceId,
            targetId: newTargetId,
            parentId: edge.parentId ? idMap.get(edge.parentId) ?? null : null,
            sourceHandle: edge.sourceHandle,
            targetHandle: edge.targetHandle,
            label: edge.label,
            edgeType: edge.edgeType,
            metadata: JSON.stringify(edge.metadata),
            style: edge.style ? JSON.stringify(edge.style) : null,
          },
        });
      }

      return {
        id: project.id,
        name: project.name,
        description: project.description,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
        nodeCount: data.nodes.length,
      };
    });
  }
}
