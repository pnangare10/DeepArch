export interface AIGenerateRequest {
  prompt: string;
  parentId: string | null;
}

export interface AINodeDraft {
  tempId: string;
  name: string;
  nodeType: string;
  description?: string;
  layer: number;
  metadata?: {
    customFields?: { key: string; value: string }[];
    links?: { label: string; url: string }[];
    tags?: string[];
    bgColor?: string;
  };
}

export interface AIEdgeDraft {
  sourceId: string;
  targetId: string;
  label?: string;
  edgeType?: string;
}

export interface AIArchitectureSchema {
  nodes: AINodeDraft[];
  edges: AIEdgeDraft[];
}

export type AISSEEvent =
  | { type: 'status'; message: string }
  | { type: 'done'; nodeCount: number; edgeCount: number }
  | { type: 'error'; message: string };
