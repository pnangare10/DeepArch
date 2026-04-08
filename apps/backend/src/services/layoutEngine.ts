import type { AINodeDraft, AIEdgeDraft } from '@deeparch/shared';

const NODE_W = 200;
const NODE_H = 80;
const COL_GAP = 120;   // horizontal gap between columns
const ROW_GAP = 60;    // vertical gap between nodes in the same column
const START_X = 80;
const START_Y = 80;

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

  // Compute column height so we can vertically center each column
  const colHeights = layers.map((l) => {
    const count = byLayer.get(l)!.length;
    return count * NODE_H + (count - 1) * ROW_GAP;
  });
  const maxColHeight = Math.max(...colHeights, NODE_H);

  // Place nodes: center each column vertically relative to the tallest column
  const positions = new Map<string, { x: number; y: number }>();
  for (let col = 0; col < layers.length; col++) {
    const layerNodes = byLayer.get(layers[col])!;
    const colH = colHeights[col];
    const topOffset = (maxColHeight - colH) / 2;
    const x = START_X + col * (NODE_W + COL_GAP);
    for (let row = 0; row < layerNodes.length; row++) {
      positions.set(layerNodes[row].tempId, {
        x,
        y: START_Y + topOffset + row * (NODE_H + ROW_GAP),
      });
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

    const srcCX = sp.x + NODE_W / 2;
    const tgtCX = tp.x + NODE_W / 2;
    const srcCY = sp.y + NODE_H / 2;
    const tgtCY = tp.y + NODE_H / 2;

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
