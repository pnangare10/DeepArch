import type { Node as FlowNode, Edge as FlowEdge } from '@xyflow/react';
import type { ArchNode, ArchEdge } from '@deeparch/shared';

export function dbNodeToFlowNode(node: ArchNode): FlowNode {
  return {
    id: node.id,
    type: 'archNode',
    position: { x: node.positionX, y: node.positionY },
    data: {
      name: node.name,
      description: node.description,
      nodeType: node.nodeType,
      metadata: node.metadata,
      childCount: node.childCount ?? 0,
    },
    ...(node.width && node.height
      ? { width: node.width, height: node.height }
      : {}),
  };
}

export function dbEdgeToFlowEdge(edge: ArchEdge): FlowEdge {
  return {
    id: edge.id,
    source: edge.sourceId,
    target: edge.targetId,
    sourceHandle: edge.sourceHandle ?? undefined,
    targetHandle: edge.targetHandle ?? undefined,
    type: 'archEdge',
    label: edge.label ?? undefined,
    data: {
      edgeType: edge.edgeType,
      metadata: edge.metadata,
    },
  };
}
