import type { AINodeDraft, AIEdgeDraft } from '@deeparch/shared';

const NODE_W = 200;
const NODE_H = 80;
const NODE_STICKY_H = 150; // sticky notes are taller
const COL_GAP = 180;   // horizontal gap between columns
const ROW_GAP = 80;    // vertical gap between nodes in the same column
const START_X = 100;
const START_Y = 100;

function nodeHeight(n: AINodeDraft): number {
  return n.nodeType === 'sticky-note' ? NODE_STICKY_H : NODE_H;
}

export interface LayoutResult {
  positions: Map<string, { x: number; y: number }>;
  /** Suggested sourceHandle / targetHandle per edge (e.g. "right" → "left") */
  edgeHandles: Map<string, { sourceHandle: string; targetHandle: string }>;
}

export function computeLayout(nodes: AINodeDraft[], edges: AIEdgeDraft[]): LayoutResult {
  // Group nodes by layer
  const byLayer = new Map<number, AINodeDraft[]>();
  for (const n of nodes) {
    const arr = byLayer.get(n.layer) ?? [];
    arr.push(n);
    byLayer.set(n.layer, arr);
  }

  const layers = [...byLayer.keys()].sort((a, b) => a - b);

  // Compute column height using actual per-node heights (sticky notes are taller)
  const colHeights = layers.map((l) => {
    const colNodes = byLayer.get(l)!;
    return colNodes.reduce((sum, n, i) =>
      sum + nodeHeight(n) + (i < colNodes.length - 1 ? ROW_GAP : 0), 0);
  });
  const maxColHeight = Math.max(...colHeights, NODE_H);

  // Place nodes: center each column vertically relative to the tallest column
  const positions = new Map<string, { x: number; y: number }>();
  for (let col = 0; col < layers.length; col++) {
    const layerNodes = byLayer.get(layers[col])!;
    const colH = colHeights[col];
    const topOffset = (maxColHeight - colH) / 2;
    const x = START_X + col * (NODE_W + COL_GAP);
    let yOffset = START_Y + topOffset;
    for (const node of layerNodes) {
      positions.set(node.tempId, { x, y: yOffset });
      yOffset += nodeHeight(node) + ROW_GAP;
    }
  }

  // Compute smart edge handles based on relative node positions
  const edgeHandles = new Map<string, { sourceHandle: string; targetHandle: string }>();
  const tempIdToLayer = new Map(nodes.map((n) => [n.tempId, n.layer]));

  for (const edge of edges) {
    const sp = positions.get(edge.sourceId);
    const tp = positions.get(edge.targetId);
    if (!sp || !tp) continue;

    const srcLayer = tempIdToLayer.get(edge.sourceId) ?? 0;
    const tgtLayer = tempIdToLayer.get(edge.targetId) ?? 0;

    const srcNode = nodes.find((n) => n.tempId === edge.sourceId);
    const tgtNode = nodes.find((n) => n.tempId === edge.targetId);
    const srcH = srcNode ? nodeHeight(srcNode) : NODE_H;
    const tgtH = tgtNode ? nodeHeight(tgtNode) : NODE_H;

    const srcCX = sp.x + NODE_W / 2;
    const tgtCX = tp.x + NODE_W / 2;
    const srcCY = sp.y + srcH / 2;
    const tgtCY = tp.y + tgtH / 2;

    const dx = tgtCX - srcCX;
    const dy = tgtCY - srcCY;

    let sourceHandle: string;
    let targetHandle: string;

    if (srcLayer !== tgtLayer) {
      // Cross-layer (horizontal flow): use right → left
      sourceHandle = dx >= 0 ? 'right' : 'left';
      targetHandle = dx >= 0 ? 'left' : 'right';
    } else {
      // Same layer (vertical arrangement): use bottom → top or top → bottom
      if (Math.abs(dy) >= Math.abs(dx)) {
        sourceHandle = dy >= 0 ? 'bottom' : 'top';
        targetHandle = dy >= 0 ? 'top' : 'bottom';
      } else {
        sourceHandle = dx >= 0 ? 'right' : 'left';
        targetHandle = dx >= 0 ? 'left' : 'right';
      }
    }

    edgeHandles.set(`${edge.sourceId}→${edge.targetId}`, { sourceHandle, targetHandle });
  }

  return { positions, edgeHandles };
}
