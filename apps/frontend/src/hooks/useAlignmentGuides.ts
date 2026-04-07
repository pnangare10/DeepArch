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

const SNAP_THRESHOLD = 8; // px — snap kicks in within this distance
const SHOW_THRESHOLD = 8; // same, guide line appears at same distance

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

export function useAlignmentGuides(nodes: FlowNode[]) {
  const [guides, setGuides] = useState<GuideLineSpec[]>([]);
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  // Called by Canvas with the snapped position so we can apply it back to React Flow
  const applySnapRef = useRef<((nodeId: string, x: number, y: number) => void) | null>(null);

  // Track the last snapped position so dragStop can re-apply it
  const lastSnapRef = useRef<{ nodeId: string; x: number; y: number } | null>(null);

  const onNodeDrag: OnNodeDrag = useCallback((_event, draggedNode) => {
    const db = getBounds(draggedNode);
    if (!db) { setGuides([]); return; }

    const w = (draggedNode.measured?.width  ?? draggedNode.width)  as number;
    const h = (draggedNode.measured?.height ?? draggedNode.height) as number;

    const dAnchorsX = [db.left, db.centerX, db.right];
    const dAnchorsY = [db.top,  db.centerY, db.bottom];

    const seen = new Set<string>();
    const result: GuideLineSpec[] = [];

    // Track best snap per axis
    let snapX: number | null = null;
    let snapXOffset: number | null = null; // how much to shift node.x
    let bestDistX = SNAP_THRESHOLD + 1;

    let snapY: number | null = null;
    let snapYOffset: number | null = null;
    let bestDistY = SNAP_THRESHOLD + 1;

    for (const candidate of nodesRef.current) {
      if (candidate.id === draggedNode.id) continue;
      const cb = getBounds(candidate);
      if (!cb) continue;

      const cAnchorsX = [cb.left, cb.centerX, cb.right];
      const cAnchorsY = [cb.top,  cb.centerY, cb.bottom];

      // Vertical guides (X alignment)
      for (let di = 0; di < dAnchorsX.length; di++) {
        for (const ca of cAnchorsX) {
          const dist = Math.abs(dAnchorsX[di] - ca);
          if (dist <= SHOW_THRESHOLD) {
            const key = `v:${ca}`;
            if (!seen.has(key)) { seen.add(key); result.push({ orientation: 'vertical', position: ca }); }
          }
          if (dist < bestDistX) {
            bestDistX = dist;
            snapX = ca;
            // Compute node.x from which anchor matched: left=0, centerX=w/2, right=w
            snapXOffset = di === 0 ? 0 : di === 1 ? w / 2 : w;
          }
        }
      }

      // Horizontal guides (Y alignment)
      for (let di = 0; di < dAnchorsY.length; di++) {
        for (const ca of cAnchorsY) {
          const dist = Math.abs(dAnchorsY[di] - ca);
          if (dist <= SHOW_THRESHOLD) {
            const key = `h:${ca}`;
            if (!seen.has(key)) { seen.add(key); result.push({ orientation: 'horizontal', position: ca }); }
          }
          if (dist < bestDistY) {
            bestDistY = dist;
            snapY = ca;
            snapYOffset = di === 0 ? 0 : di === 1 ? h / 2 : h;
          }
        }
      }
    }

    setGuides(result);

    // Apply snap if within threshold
    const snappedX = snapX !== null && bestDistX <= SNAP_THRESHOLD
      ? snapX - snapXOffset!
      : draggedNode.position.x;
    const snappedY = snapY !== null && bestDistY <= SNAP_THRESHOLD
      ? snapY - snapYOffset!
      : draggedNode.position.y;

    const didSnap = snappedX !== draggedNode.position.x || snappedY !== draggedNode.position.y;
    if (didSnap) {
      lastSnapRef.current = { nodeId: draggedNode.id, x: snappedX, y: snappedY };
      applySnapRef.current?.(draggedNode.id, snappedX, snappedY);
    } else {
      lastSnapRef.current = null;
    }
  }, []);

  const onNodeDragStop: OnNodeDrag = useCallback(() => {
    setGuides([]);
    // React Flow fires a final position update on mouseup using the unsnapped mouse coords.
    // Re-apply the last snapped position after a microtask so it wins.
    if (lastSnapRef.current) {
      const { nodeId, x, y } = lastSnapRef.current;
      lastSnapRef.current = null;
      setTimeout(() => {
        applySnapRef.current?.(nodeId, x, y);
      }, 0);
    }
  }, []);

  return { guides, onNodeDrag, onNodeDragStop, applySnapRef };
}
