import type { StateCreator } from 'zustand';
import type {
  Node as FlowNode,
  Edge as FlowEdge,
  OnNodesChange,
  OnEdgesChange,
  Connection,
} from '@xyflow/react';
import { applyNodeChanges, applyEdgeChanges } from '@xyflow/react';
import type { CreateNodeDTO, UpdateNodeDTO } from '@deeparch/shared';
import { nodesApi } from '../api/nodes';
import { edgesApi } from '../api/edges';
import { dbNodeToFlowNode, dbEdgeToFlowEdge } from '../lib/transforms';
import type { StoreState } from './index';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface HistorySnapshot {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface CanvasSlice {
  nodes: FlowNode[];
  edges: FlowEdge[];
  isLoading: boolean;
  saveStatus: SaveStatus;
  undoStack: HistorySnapshot[];
  loadLevel: (projectId: string, parentId: string | null) => Promise<void>;
  addNode: (projectId: string, data: CreateNodeDTO) => Promise<void>;
  updateNode: (projectId: string, nodeId: string, data: UpdateNodeDTO) => Promise<void>;
  deleteNode: (projectId: string, nodeId: string) => Promise<void>;
  addEdge: (projectId: string, connection: Connection) => Promise<void>;
  deleteEdge: (projectId: string, edgeId: string) => Promise<void>;
  updateEdgeLabel: (projectId: string, edgeId: string, label: string) => Promise<void>;
  undo: () => void;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  pendingPositionUpdates: Map<string, { x: number; y: number }>;
  clearPendingPositions: () => void;
  setSaveStatus: (status: SaveStatus) => void;
}

export const createCanvasSlice: StateCreator<
  StoreState,
  [],
  [],
  CanvasSlice
> = (set, get) => ({
  nodes: [],
  edges: [],
  isLoading: false,
  saveStatus: 'idle',
  undoStack: [],
  pendingPositionUpdates: new Map(),

  loadLevel: async (projectId, parentId) => {
    set({ isLoading: true });
    try {
      const [nodesData, edgesData] = await Promise.all([
        nodesApi.getByParent(projectId, parentId),
        edgesApi.getByParent(projectId, parentId),
      ]);
      set({
        nodes: nodesData.map(dbNodeToFlowNode),
        edges: edgesData.map(dbEdgeToFlowEdge),
        isLoading: false,
      });
    } catch (err) {
      console.error('Failed to load level:', err);
      set({ isLoading: false });
    }
  },

  undo: () => {
    const state = get();
    if (state.undoStack.length === 0) return;
    const { projectId, currentParentId } = state;
    const prev = state.undoStack[state.undoStack.length - 1];
    const currentNodes = state.nodes;
    const currentEdges = state.edges;

    // Apply snapshot immediately for snappy UI
    set({ nodes: prev.nodes, edges: prev.edges, undoStack: state.undoStack.slice(0, -1) });

    if (!projectId) return;

    // Diff nodes: which were added (need delete) vs removed (need recreate)
    const prevNodeIds = new Set(prev.nodes.map((n) => n.id));
    const curNodeIds = new Set(currentNodes.map((n) => n.id));

    const nodesToDelete = currentNodes.filter((n) => !prevNodeIds.has(n.id));
    const nodesToRecreate = prev.nodes.filter((n) => !curNodeIds.has(n.id));

    // Diff edges
    const prevEdgeIds = new Set(prev.edges.map((e) => e.id));
    const curEdgeIds = new Set(currentEdges.map((e) => e.id));

    const edgesToDelete = currentEdges.filter((e) => !prevEdgeIds.has(e.id));
    const edgesToRecreate = prev.edges.filter((e) => !curEdgeIds.has(e.id));

    // Position changes: nodes in both snapshots whose position changed
    const nodesToMove = prev.nodes.filter((n) => {
      const cur = currentNodes.find((c) => c.id === n.id);
      return cur && (cur.position.x !== n.position.x || cur.position.y !== n.position.y);
    });

    (async () => {
      await Promise.all([
        ...nodesToDelete.map((n) => nodesApi.delete(projectId, n.id).catch(console.error)),
        ...edgesToDelete.map((e) => edgesApi.delete(projectId, e.id).catch(console.error)),
      ]);
      await Promise.all([
        ...nodesToRecreate.map((n) =>
          nodesApi.create(projectId, {
            parentId: currentParentId,
            name: n.data.name as string,
            description: n.data.description as string | undefined,
            nodeType: n.data.nodeType as string | undefined,
            positionX: n.position.x,
            positionY: n.position.y,
          }).catch(console.error)
        ),
        ...edgesToRecreate.map((e) =>
          edgesApi.create(projectId, {
            sourceId: e.source,
            targetId: e.target,
            parentId: currentParentId,
            sourceHandle: e.sourceHandle ?? null,
            targetHandle: e.targetHandle ?? null,
            label: e.label as string | undefined,
          }).catch(console.error)
        ),
        ...(nodesToMove.length > 0
          ? [nodesApi.batchUpdatePositions(projectId, nodesToMove.map((n) => ({
              id: n.id,
              positionX: n.position.x,
              positionY: n.position.y,
            }))).catch(console.error)]
          : []),
      ]);
    })();
  },

  addNode: async (projectId, data) => {
    try {
      const node = await nodesApi.create(projectId, data);
      set((state) => ({
        undoStack: [...state.undoStack.slice(-19), { nodes: state.nodes, edges: state.edges }],
        nodes: [...state.nodes, dbNodeToFlowNode(node)],
      }));
    } catch (err) {
      console.error('Failed to add node:', err);
    }
  },

  updateNode: async (projectId, nodeId, data) => {
    try {
      const updated = await nodesApi.update(projectId, nodeId, data);
      set((state) => ({
        nodes: state.nodes.map((n) =>
          n.id === nodeId ? dbNodeToFlowNode(updated) : n,
        ),
      }));
    } catch (err) {
      console.error('Failed to update node:', err);
    }
  },

  deleteNode: async (projectId, nodeId) => {
    try {
      // Snapshot before delete
      set((state) => ({
        undoStack: [...state.undoStack.slice(-19), { nodes: state.nodes, edges: state.edges }],
      }));
      await nodesApi.delete(projectId, nodeId);
      set((state) => ({
        nodes: state.nodes.filter((n) => n.id !== nodeId),
        edges: state.edges.filter(
          (e) => e.source !== nodeId && e.target !== nodeId,
        ),
      }));
    } catch (err) {
      console.error('Failed to delete node:', err);
    }
  },

  addEdge: async (projectId, connection) => {
    if (!connection.source || !connection.target) return;
    const { currentParentId } = get();
    try {
      const edge = await edgesApi.create(projectId, {
        sourceId: connection.source,
        targetId: connection.target,
        parentId: currentParentId,
        sourceHandle: connection.sourceHandle ?? null,
        targetHandle: connection.targetHandle ?? null,
      });
      set((state) => ({
        undoStack: [...state.undoStack.slice(-19), { nodes: state.nodes, edges: state.edges }],
        edges: [...state.edges, dbEdgeToFlowEdge(edge)],
      }));
    } catch (err) {
      console.error('Failed to add edge:', err);
    }
  },

  deleteEdge: async (projectId, edgeId) => {
    try {
      await edgesApi.delete(projectId, edgeId);
      set((state) => ({
        edges: state.edges.filter((e) => e.id !== edgeId),
      }));
    } catch (err) {
      console.error('Failed to delete edge:', err);
    }
  },

  updateEdgeLabel: async (projectId, edgeId, label) => {
    try {
      const updated = await edgesApi.update(projectId, edgeId, { label });
      set((state) => ({
        edges: state.edges.map((e) =>
          e.id === edgeId ? { ...e, label: updated.label ?? '' } : e,
        ),
      }));
    } catch (err) {
      console.error('Failed to update edge label:', err);
    }
  },

  clearPendingPositions: () => {
    set({ pendingPositionUpdates: new Map() });
  },

  setSaveStatus: (status) => {
    set({ saveStatus: status });
  },

  onNodesChange: (changes) => {
    // Intercept 'remove' changes to call the API
    const removeChanges = changes.filter((c) => c.type === 'remove');
    if (removeChanges.length > 0) {
      const { projectId } = get();
      if (projectId) {
        const state = get();
        set({ undoStack: [...state.undoStack.slice(-19), { nodes: state.nodes, edges: state.edges }] });
        for (const c of removeChanges) {
          nodesApi.delete(projectId, c.id).catch((err) =>
            console.error('Failed to delete node:', err),
          );
        }
      }
    }
    set((state) => {
      const newNodes = applyNodeChanges(changes, state.nodes);
      // Track position changes for batch save — create a NEW Map so useEffect sees a new reference
      let newPending: Map<string, { x: number; y: number }> | null = null;
      for (const change of changes) {
        if (change.type === 'position' && change.position) {
          if (!newPending) newPending = new Map(state.pendingPositionUpdates);
          newPending.set(change.id, { x: change.position.x, y: change.position.y });
        }
      }
      return newPending
        ? { nodes: newNodes, pendingPositionUpdates: newPending }
        : { nodes: newNodes };
    });
  },

  onEdgesChange: (changes) => {
    // Intercept 'remove' changes to call the API
    const removeChanges = changes.filter((c) => c.type === 'remove');
    if (removeChanges.length > 0) {
      const { projectId } = get();
      if (projectId) {
        for (const c of removeChanges) {
          edgesApi.delete(projectId, c.id).catch((err) =>
            console.error('Failed to delete edge:', err),
          );
        }
      }
    }
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
    }));
  },
});
