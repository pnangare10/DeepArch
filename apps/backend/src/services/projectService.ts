import type { IProjectRepository, ProjectExport } from '../repositories/interfaces/IProjectRepository.js';
import type { Project, CreateProjectDTO, UpdateProjectDTO } from '@deeparch/shared';
import { AppError } from '../middleware/errorHandler.js';
import { getMemberRole } from './memberService.js';

export class ProjectService {
  constructor(private repo: IProjectRepository) {}

  async getAll(userId: string): Promise<Project[]> {
    return this.repo.findByUserId(userId);
  }

  async getById(id: string, userId: string): Promise<Project> {
    const project = await this.repo.findById(id);
    if (!project) throw new AppError(404, 'Project not found');
    const role = await getMemberRole(id, userId);
    if (!role) throw new AppError(403, 'Forbidden');
    return project;
  }

  async create(data: CreateProjectDTO, userId: string): Promise<Project> {
    if (!data.name?.trim()) throw new AppError(400, 'Project name is required');
    return this.repo.create(data, userId);
  }

  async update(id: string, data: UpdateProjectDTO, userId: string): Promise<Project> {
    await this.getById(id, userId);
    return this.repo.update(id, data);
  }

  async delete(id: string, userId: string): Promise<void> {
    const project = await this.repo.findById(id);
    if (!project) throw new AppError(404, 'Project not found');
    if (project.userId !== userId) throw new AppError(403, 'Only the project owner can delete this project');
    await this.repo.delete(id);
  }

  async exportProject(id: string, userId: string): Promise<ProjectExport> {
    await this.getById(id, userId);
    return this.repo.exportProject(id);
  }

  async importProject(data: ProjectExport, userId: string): Promise<Project> {
    if (!data.project?.name?.trim()) throw new AppError(400, 'Project name is required');
    if (!Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
      throw new AppError(400, 'Invalid export format');
    }
    return this.repo.importProject(data, userId);
  }
}
