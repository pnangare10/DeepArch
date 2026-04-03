export interface ArchEdge {
  id: string;
  projectId: string;
  sourceId: string;
  targetId: string;
  parentId: string | null;
  sourceHandle: string | null;
  targetHandle: string | null;
  label: string | null;
  edgeType: string;
  metadata: Record<string, unknown>;
  style: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEdgeDTO {
  sourceId: string;
  targetId: string;
  parentId?: string | null;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  label?: string;
  edgeType?: string;
  metadata?: Record<string, unknown>;
  style?: Record<string, unknown>;
}

export interface UpdateEdgeDTO {
  label?: string;
  edgeType?: string;
  metadata?: Record<string, unknown>;
  style?: Record<string, unknown>;
}
