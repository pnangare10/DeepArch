import type { ArchNode, ArchEdge, ProjectVersion } from '@deeparch/shared';

export interface VersionSnapshot {
  version: '1';
  nodes: ArchNode[];
  edges: ArchEdge[];
}

export interface IVersionRepository {
  listByProject(projectId: string): Promise<ProjectVersion[]>;
  findById(id: string): Promise<(ProjectVersion & { snapshot: VersionSnapshot }) | null>;
  create(projectId: string, name: string, createdById: string): Promise<ProjectVersion>;
  delete(id: string): Promise<void>;
  /** Replaces the project's entire node/edge tree with the snapshot content. */
  restore(projectId: string, snapshot: VersionSnapshot): Promise<void>;
}
