import type { INodeRepository } from '../repositories/interfaces/INodeRepository.js';
import type { SearchResult, BreadcrumbItem } from '@deeparch/shared';

export class SearchService {
  constructor(private nodeRepo: INodeRepository) {}

  async search(projectId: string, query: string): Promise<SearchResult[]> {
    if (!query.trim()) return [];

    const nodes = await this.nodeRepo.searchByName(projectId, query);

    const results: SearchResult[] = await Promise.all(
      nodes.map(async (node) => {
        const ancestors = await this.nodeRepo.getAncestorPath(node.id);
        const path: BreadcrumbItem[] = [
          { id: null, name: 'Root' },
          ...ancestors.slice(0, -1).map((a) => ({ id: a.id, name: a.name })),
        ];
        return {
          nodeId: node.id,
          name: node.name,
          description: node.description,
          nodeType: node.nodeType,
          parentId: node.parentId,
          path,
        };
      }),
    );

    return results;
  }
}
