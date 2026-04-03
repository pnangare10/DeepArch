export interface BreadcrumbItem {
  id: string | null;
  name: string;
}

export interface SearchResult {
  nodeId: string;
  name: string;
  description: string | null;
  nodeType: string;
  parentId: string | null;
  path: BreadcrumbItem[];
}
