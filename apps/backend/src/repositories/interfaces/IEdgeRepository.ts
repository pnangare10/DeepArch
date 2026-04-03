import type { ArchEdge, CreateEdgeDTO, UpdateEdgeDTO } from '@deeparch/shared';

export interface IEdgeRepository {
  findByParent(projectId: string, parentId: string | null): Promise<ArchEdge[]>;
  findById(id: string): Promise<ArchEdge | null>;
  create(projectId: string, data: CreateEdgeDTO): Promise<ArchEdge>;
  update(id: string, data: UpdateEdgeDTO): Promise<ArchEdge>;
  delete(id: string): Promise<void>;
}
