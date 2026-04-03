import type { IProjectRepository, ProjectExport } from '../repositories/interfaces/IProjectRepository.js';
import type { Project, CreateProjectDTO, UpdateProjectDTO } from '@deeparch/shared';
import { AppError } from '../middleware/errorHandler.js';

export class ProjectService {
  constructor(private repo: IProjectRepository) {}

  async getAll(): Promise<Project[]> {
    return this.repo.findAll();
  }

  async getById(id: string): Promise<Project> {
    const project = await this.repo.findById(id);
    if (!project) throw new AppError(404, 'Project not found');
    return project;
  }

  async create(data: CreateProjectDTO): Promise<Project> {
    if (!data.name?.trim()) throw new AppError(400, 'Project name is required');
    return this.repo.create(data);
  }

  async update(id: string, data: UpdateProjectDTO): Promise<Project> {
    await this.getById(id);
    return this.repo.update(id, data);
  }

  async delete(id: string): Promise<void> {
    await this.getById(id);
    await this.repo.delete(id);
  }

  async exportProject(id: string): Promise<ProjectExport> {
    await this.getById(id);
    return this.repo.exportProject(id);
  }

  async importProject(data: ProjectExport): Promise<Project> {
    if (!data.project?.name?.trim()) throw new AppError(400, 'Project name is required');
    if (!Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
      throw new AppError(400, 'Invalid export format');
    }
    return this.repo.importProject(data);
  }
}
