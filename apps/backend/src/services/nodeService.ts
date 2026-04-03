import type { INodeRepository } from '../repositories/interfaces/INodeRepository.js';
import type { ArchNode, CreateNodeDTO, UpdateNodeDTO, BatchPositionUpdate } from '@deeparch/shared';
import { AppError } from '../middleware/errorHandler.js';

export class NodeService {
  constructor(private repo: INodeRepository) {}

  async getByParent(projectId: string, parentId: string | null): Promise<ArchNode[]> {
    return this.repo.findByParent(projectId, parentId);
  }

  async getById(id: string): Promise<ArchNode> {
    const node = await this.repo.findById(id);
    if (!node) throw new AppError(404, 'Node not found');
    return node;
  }

  async create(projectId: string, data: CreateNodeDTO): Promise<ArchNode> {
    if (!data.name?.trim()) throw new AppError(400, 'Node name is required');
    if (data.parentId) {
      const parent = await this.repo.findById(data.parentId);
      if (!parent) throw new AppError(400, 'Parent node not found');
      if (parent.projectId !== projectId) throw new AppError(400, 'Parent belongs to different project');
    }
    return this.repo.create(projectId, data);
  }

  async update(id: string, data: UpdateNodeDTO): Promise<ArchNode> {
    await this.getById(id);
    return this.repo.update(id, data);
  }

  async delete(id: string): Promise<ArchNode> {
    const node = await this.getById(id);
    await this.repo.delete(id);
    return node;
  }

  async batchUpdatePositions(updates: BatchPositionUpdate[]): Promise<void> {
    if (!updates.length) return;
    await this.repo.batchUpdatePositions(updates);
  }
}
