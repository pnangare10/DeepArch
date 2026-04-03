import { useEffect, useRef, useCallback } from 'react';
import { nodesApi } from '../api/nodes';
import { useStore } from '../store';

export function useAutoSave(projectId: string) {
  const pendingPositionUpdates = useStore((s) => s.pendingPositionUpdates);
  const clearPendingPositions = useStore((s) => s.clearPendingPositions);
  const setSaveStatus = useStore((s) => s.setSaveStatus);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep a ref to the latest pending updates so triggerSave always reads current state
  const pendingRef = useRef(pendingPositionUpdates);
  useEffect(() => {
    pendingRef.current = pendingPositionUpdates;
  }, [pendingPositionUpdates]);

  const flush = useCallback(async (updates: { id: string; positionX: number; positionY: number }[]) => {
    if (updates.length === 0) {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 1500);
      return;
    }
    setSaveStatus('saving');
    try {
      await nodesApi.batchUpdatePositions(projectId, updates);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('Auto-save failed:', err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }, [projectId, setSaveStatus]);

  // Debounced auto-save triggered when pendingPositionUpdates Map reference changes
  useEffect(() => {
    if (pendingPositionUpdates.size === 0) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      const current = pendingRef.current;
      if (current.size === 0) return;
      const updates = Array.from(current.entries()).map(([id, pos]) => ({
        id,
        positionX: pos.x,
        positionY: pos.y,
      }));
      clearPendingPositions();
      await flush(updates);
    }, 1000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [pendingPositionUpdates, clearPendingPositions, flush]);

  // Manual save — always reads latest from ref
  const triggerSave = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const current = pendingRef.current;
    const updates = Array.from(current.entries()).map(([id, pos]) => ({
      id,
      positionX: pos.x,
      positionY: pos.y,
    }));
    clearPendingPositions();
    await flush(updates);
  }, [clearPendingPositions, flush]);

  // Ctrl+S global shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        triggerSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [triggerSave]);

  return { triggerSave };
}
