import type { Project, CreateProjectDTO, UpdateProjectDTO, ArchNode, ArchEdge } from '@deeparch/shared';

export interface ProjectExport {
  version: '1';
  project: { name: string; description: string | null };
  nodes: ArchNode[];
  edges: ArchEdge[];
}

export interface IProjectRepository {
  findAll(): Promise<Project[]>;
  findById(id: string): Promise<Project | null>;
  create(data: CreateProjectDTO): Promise<Project>;
  update(id: string, data: UpdateProjectDTO): Promise<Project>;
  delete(id: string): Promise<void>;
  exportProject(id: string): Promise<ProjectExport>;
  importProject(data: ProjectExport): Promise<Project>;
}
