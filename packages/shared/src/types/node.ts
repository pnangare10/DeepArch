export interface NodeMetadata {
  customFields: { key: string; value: string }[];
  links: { label: string; url: string }[];
  tags: string[];
  // Role-based drill-in access control (owner sets these)
  accessInclude?: string[]; // if non-empty, only these roles can drill in
  accessExclude?: string[]; // if non-empty, these roles are blocked
}

export interface ArchNode {
  id: string;
  projectId: string;
  parentId: string | null;
  name: string;
  description: string | null;
  nodeType: string;
  positionX: number;
  positionY: number;
  width: number | null;
  height: number | null;
  metadata: NodeMetadata;
  style: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  childCount?: number;
}

export interface CreateNodeDTO {
  parentId?: string | null;
  name: string;
  description?: string;
  nodeType?: string;
  positionX: number;
  positionY: number;
  width?: number;
  height?: number;
  metadata?: Partial<NodeMetadata>;
  style?: Record<string, unknown>;
}

export interface UpdateNodeDTO {
  name?: string;
  description?: string;
  nodeType?: string;
  positionX?: number;
  positionY?: number;
  width?: number;
  height?: number;
  metadata?: Partial<NodeMetadata>;
  style?: Record<string, unknown>;
  parentId?: string | null;
}

export interface BatchPositionUpdate {
  id: string;
  positionX: number;
  positionY: number;
}
