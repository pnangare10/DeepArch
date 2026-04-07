import type { IEdgeRepository } from '../repositories/interfaces/IEdgeRepository.js';
import type { INodeRepository } from '../repositories/interfaces/INodeRepository.js';
import type { ArchEdge, CreateEdgeDTO, UpdateEdgeDTO } from '@deeparch/shared';
import { AppError } from '../middleware/errorHandler.js';

export class EdgeService {
  constructor(
    private repo: IEdgeRepository,
    private nodeRepo: INodeRepository,
  ) {}

  async getByParent(projectId: string, parentId: string | null): Promise<ArchEdge[]> {
    return this.repo.findByParent(projectId, parentId);
  }

  async create(projectId: string, data: CreateEdgeDTO): Promise<ArchEdge> {
    const source = await this.nodeRepo.findById(data.sourceId);
    if (!source) throw new AppError(400, 'Source node not found');
    const target = await this.nodeRepo.findById(data.targetId);
    if (!target) throw new AppError(400, 'Target node not found');
    if (source.projectId !== projectId || target.projectId !== projectId) {
      throw new AppError(400, 'Nodes belong to different project');
    }
    // Allow cross-level edges when parentId is explicitly set — this covers port-node
    // connections where one endpoint is a node from the parent level (input/output blocks).
    // In that case the edge is stored at the explicitly provided parentId level.
    const resolvedParentId = data.parentId !== undefined ? data.parentId : source.parentId;
    if (data.parentId === undefined && source.parentId !== target.parentId) {
      throw new AppError(400, 'Source and target must be at the same level (same parent)');
    }
    return this.repo.create(projectId, {
      ...data,
      parentId: resolvedParentId,
    });
  }

  async update(id: string, data: UpdateEdgeDTO): Promise<ArchEdge> {
    const edge = await this.repo.findById(id);
    if (!edge) throw new AppError(404, 'Edge not found');
    return this.repo.update(id, data);
  }

  async delete(id: string): Promise<void> {
    const edge = await this.repo.findById(id);
    if (!edge) throw new AppError(404, 'Edge not found');
    await this.repo.delete(id);
  }
}
