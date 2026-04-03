import type { ArchNode, CreateNodeDTO, UpdateNodeDTO, BatchPositionUpdate } from '@deeparch/shared';

export interface INodeRepository {
  findByParent(projectId: string, parentId: string | null): Promise<ArchNode[]>;
  findById(id: string): Promise<ArchNode | null>;
  create(projectId: string, data: CreateNodeDTO): Promise<ArchNode>;
  update(id: string, data: UpdateNodeDTO): Promise<ArchNode>;
  delete(id: string): Promise<void>;
  batchUpdatePositions(updates: BatchPositionUpdate[]): Promise<void>;
  searchByName(projectId: string, query: string): Promise<ArchNode[]>;
  getAncestorPath(nodeId: string): Promise<{ id: string; name: string }[]>;
}
