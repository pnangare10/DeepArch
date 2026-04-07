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
}

export interface AIEdgeDraft {
  sourceId: string;
  targetId: string;
  label?: string;
}

export interface AIArchitectureSchema {
  nodes: AINodeDraft[];
  edges: AIEdgeDraft[];
}

export type AISSEEvent =
  | { type: 'status'; message: string }
  | { type: 'done'; nodeCount: number; edgeCount: number }
  | { type: 'error'; message: string };
