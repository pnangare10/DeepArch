import { useState, useCallback, useRef } from 'react';
import type { Node as FlowNode, OnNodeDrag } from '@xyflow/react';

export interface GuideLineSpec {
  orientation: 'horizontal' | 'vertical';
  position: number; // flow coordinate (Y for horizontal, X for vertical)
}

interface NodeBounds {
  left: number;
  centerX: number;
  right: number;
  top: number;
  centerY: number;
  bottom: number;
}

const DEFAULT_THRESHOLD = 5;

function getBounds(node: FlowNode): NodeBounds | null {
  const w = (node.measured?.width  ?? node.width)  as number | undefined;
  const h = (node.measured?.height ?? node.height) as number | undefined;
  if (!w || !h) return null;
  return {
    left:    node.position.x,
    centerX: node.position.x + w / 2,
    right:   node.position.x + w,
    top:     node.position.y,
    centerY: node.position.y + h / 2,
    bottom:  node.position.y + h,
  };
}

export function useAlignmentGuides(nodes: FlowNode[], threshold = DEFAULT_THRESHOLD) {
  const [guides, setGuides] = useState<GuideLineSpec[]>([]);
  // Keep a ref to latest nodes so the callback never has a stale closure
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  const onNodeDrag: OnNodeDrag = useCallback((_event, draggedNode) => {
    const db = getBounds(draggedNode);
    if (!db) { setGuides([]); return; }

    const dAnchorsX = [db.left, db.centerX, db.right];
    const dAnchorsY = [db.top,  db.centerY, db.bottom];
    const seen = new Set<string>();
    const result: GuideLineSpec[] = [];

    for (const candidate of nodesRef.current) {
      if (candidate.id === draggedNode.id) continue;
      const cb = getBounds(candidate);
      if (!cb) continue;

      const cAnchorsX = [cb.left, cb.centerX, cb.right];
      const cAnchorsY = [cb.top,  cb.centerY, cb.bottom];

      for (const da of dAnchorsX) {
        for (const ca of cAnchorsX) {
          if (Math.abs(da - ca) <= threshold) {
            const key = `v:${ca}`;
            if (!seen.has(key)) {
              seen.add(key);
              result.push({ orientation: 'vertical', position: ca });
            }
          }
        }
      }

      for (const da of dAnchorsY) {
        for (const ca of cAnchorsY) {
          if (Math.abs(da - ca) <= threshold) {
            const key = `h:${ca}`;
            if (!seen.has(key)) {
              seen.add(key);
              result.push({ orientation: 'horizontal', position: ca });
            }
          }
        }
      }
    }

    setGuides(result);
  }, [threshold]);

  const onNodeDragStop: OnNodeDrag = useCallback(() => {
    setGuides([]);
  }, []);

  return { guides, onNodeDrag, onNodeDragStop };
}
