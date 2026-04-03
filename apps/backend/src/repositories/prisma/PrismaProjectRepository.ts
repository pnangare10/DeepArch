import prisma from '../../utils/db.js';
import type { Project, CreateProjectDTO, UpdateProjectDTO } from '@deeparch/shared';
import type { IProjectRepository } from '../interfaces/IProjectRepository.js';

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
}
