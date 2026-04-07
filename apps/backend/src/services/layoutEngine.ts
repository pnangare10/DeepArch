import type { AINodeDraft } from '@deeparch/shared';

const COLUMN_WIDTH = 260;
const ROW_HEIGHT = 110;
const START_X = 100;
const START_Y = 100;

export function computeLayout(nodes: AINodeDraft[]): Map<string, { x: number; y: number }> {
  const byLayer = new Map<number, AINodeDraft[]>();
  for (const n of nodes) {
    const arr = byLayer.get(n.layer) ?? [];
    arr.push(n);
    byLayer.set(n.layer, arr);
  }

  const layers = [...byLayer.keys()].sort((a, b) => a - b);
  const positions = new Map<string, { x: number; y: number }>();

  for (let col = 0; col < layers.length; col++) {
    const layerNodes = byLayer.get(layers[col])!;
    for (let row = 0; row < layerNodes.length; row++) {
      positions.set(layerNodes[row].tempId, {
        x: START_X + col * COLUMN_WIDTH,
        y: START_Y + row * ROW_HEIGHT,
      });
    }
  }

  return positions;
}
