import type { StateCreator } from 'zustand';
import type {
  Node as FlowNode,
  Edge as FlowEdge,
  OnNodesChange,
  OnEdgesChange,
  Connection,
} from '@xyflow/react';
import { applyNodeChanges, applyEdgeChanges } from '@xyflow/react';
import type { CreateNodeDTO, UpdateNodeDTO, ArchNode, ArchEdge } from '@deeparch/shared';
import { nodesApi } from '../api/nodes';
import { edgesApi } from '../api/edges';
import { dbNodeToFlowNode, dbEdgeToFlowEdge } from '../lib/transforms';
import type { StoreState } from './index';
import type { EntryExitConnection, PortSide } from './navigationSlice';

export const PORT_NODE_PREFIX = '__port__';
export const isPortNode = (id: string) => id.startsWith(PORT_NODE_PREFIX);

// Spacing from the real-node bounding box to where ports are placed
const PORT_MARGIN = 160;
const PORT_NODE_WIDTH = 180;
const PORT_NODE_HEIGHT = 70;

function buildPortNodes(
  connections: EntryExitConnection[],
  realNodes: FlowNode[],
): FlowNode[] {
  if (connections.length === 0) return [];

  // Compute bounding box of existing real nodes, or default to canvas centre
  let minX = 0, minY = 0, maxX = 600, maxY = 400;
  if (realNodes.length > 0) {
    minX = Math.min(...realNodes.map((n) => n.position.x));
    minY = Math.min(...realNodes.map((n) => n.position.y));
    maxX = Math.max(...realNodes.map((n) => n.position.x + (n.width ?? 180)));
    maxY = Math.max(...realNodes.map((n) => n.position.y + (n.height ?? 60)));
  }

  // Group connections by side so we can spread them evenly along each edge
  const bySide: Record<PortSide, EntryExitConnection[]> = {
    top: [], bottom: [], left: [], right: [],
  };
  for (const c of connections) bySide[c.side].push(c);

  const portNodes: FlowNode[] = [];

  const placeAlongSide = (
    side: PortSide,
    items: EntryExitConnection[],
  ) => {
    const count = items.length;
    // Minimum gap between port nodes so they never stack
    const MIN_GAP = PORT_NODE_WIDTH + 20;
    const MIN_V_GAP = PORT_NODE_HEIGHT + 20;

    items.forEach((conn, i) => {
      let x = 0, y = 0;

      if (side === 'top' || side === 'bottom') {
        // Spread horizontally — use max of bounding-box-derived spacing and minimum gap
        const span = Math.max(maxX - minX, MIN_GAP * count);
        const centerX = (minX + maxX) / 2;
        const totalWidth = MIN_GAP * (count - 1);
        x = count === 1
          ? centerX - PORT_NODE_WIDTH / 2
          : centerX - totalWidth / 2 + i * MIN_GAP - PORT_NODE_WIDTH / 2;
        y = side === 'top'
          ? minY - PORT_MARGIN - PORT_NODE_HEIGHT
          : maxY + PORT_MARGIN;
        // Fallback: if span-based gives more room, use it instead
        const spanX = minX + (span / (count + 1)) * (i + 1) - PORT_NODE_WIDTH / 2;
        if (Math.abs(spanX - centerX) > Math.abs(x - centerX)) x = spanX;
      } else {
        // left / right — spread vertically
        const span = Math.max(maxY - minY, MIN_V_GAP * count);
        const centerY = (minY + maxY) / 2;
        const totalHeight = MIN_V_GAP * (count - 1);
        y = count === 1
          ? centerY - PORT_NODE_HEIGHT / 2
          : centerY - totalHeight / 2 + i * MIN_V_GAP - PORT_NODE_HEIGHT / 2;
        x = side === 'left'
          ? minX - PORT_MARGIN - PORT_NODE_WIDTH
          : maxX + PORT_MARGIN;
        const spanY = minY + (span / (count + 1)) * (i + 1) - PORT_NODE_HEIGHT / 2;
        if (Math.abs(spanY - centerY) > Math.abs(y - centerY)) y = spanY;
      }

      portNodes.push({
        id: `${PORT_NODE_PREFIX}${conn.nodeId}_${side}`,
        type: 'portNode',
        position: { x, y },
        selectable: false,
        deletable: false,
        data: {
          name: conn.nodeName,
          portDirection: conn.direction,
          portSide: side,
        },
        width: PORT_NODE_WIDTH,
        height: PORT_NODE_HEIGHT,
      });
    });
  };

  for (const side of ['top', 'bottom', 'left', 'right'] as PortSide[]) {
    placeAlongSide(side, bySide[side]);
  }

  return portNodes;
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface HistorySnapshot {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface ClipboardNode {
  id: string;
  name: string;
  description: string | null;
  nodeType: string;
  positionX: number;
  positionY: number;
}

export interface CanvasSlice {
  nodes: FlowNode[];
  edges: FlowEdge[];
  isLoading: boolean;
  saveStatus: SaveStatus;
  undoStack: HistorySnapshot[];
  clipboard: ClipboardNode[] | null;
  loadLevel: (projectId: string, parentId: string | null) => Promise<void>;
  addNode: (projectId: string, data: CreateNodeDTO) => Promise<void>;
  updateNode: (projectId: string, nodeId: string, data: UpdateNodeDTO) => Promise<void>;
  deleteNode: (projectId: string, nodeId: string) => Promise<void>;
  addEdge: (projectId: string, connection: Connection) => Promise<void>;
  deleteEdge: (projectId: string, edgeId: string) => Promise<void>;
  updateEdgeLabel: (projectId: string, edgeId: string, label: string) => Promise<void>;
  copySelectedNodes: () => void;
  copyNodeById: (nodeId: string) => void;
  cutNode: (projectId: string, nodeId: string) => Promise<void>;
  pasteNodes: (projectId: string, offsetX?: number, offsetY?: number) => Promise<void>;
  reparentNode: (projectId: string, nodeId: string, newParentId: string | null) => Promise<void>;
  copyToLevel: (projectId: string, nodeId: string, newParentId: string | null) => Promise<void>;
  undo: () => void;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  pendingPositionUpdates: Map<string, { x: number; y: number }>;
  clearPendingPositions: () => void;
  setSaveStatus: (status: SaveStatus) => void;
  // Local-only mutations (used by WS event handlers — skip API calls)
  addNodeLocal: (node: ArchNode) => void;
  updateNodeLocal: (nodeId: string, data: Partial<ArchNode>) => void;
  deleteNodeLocal: (nodeId: string) => void;
  moveNodesLocal: (updates: { id: string; x: number; y: number }[]) => void;
  addEdgeLocal: (edge: ArchEdge) => void;
  deleteEdgeLocal: (edgeId: string) => void;
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
  clipboard: null,
  pendingPositionUpdates: new Map(),

  loadLevel: async (projectId, parentId) => {
    set({ isLoading: true });
    try {
      const [nodesData, edgesData] = await Promise.all([
        nodesApi.getByParent(projectId, parentId),
        edgesApi.getByParent(projectId, parentId),
      ]);
      const realNodes = nodesData.map(dbNodeToFlowNode);
      // Inject port nodes for external connections (set by navigateInto before loadLevel)
      const { entryExitConnections } = get();
      const portNodes = buildPortNodes(entryExitConnections, realNodes);

      // Build a map from real node ID → port node canvas ID so edges can be remapped.
      // Port node ID format: __port__{realNodeId}_{side}
      const realIdToPortId = new Map<string, string>();
      for (const portNode of portNodes) {
        // Extract real node ID: strip prefix and trailing _{side}
        const withoutPrefix = portNode.id.slice(PORT_NODE_PREFIX.length);
        const realId = withoutPrefix.replace(/_(?:top|bottom|left|right)$/, '');
        realIdToPortId.set(realId, portNode.id);
      }

      // Remap edge source/target to port node IDs where applicable
      const flowEdges = edgesData.map((e) => {
        const fe = dbEdgeToFlowEdge(e);
        return {
          ...fe,
          source: realIdToPortId.get(fe.source) ?? fe.source,
          target: realIdToPortId.get(fe.target) ?? fe.target,
        };
      });

      set({
        nodes: [...realNodes, ...portNodes],
        edges: flowEdges,
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
    // Keep port nodes from current canvas — they are not part of history
    const portNodes = state.nodes.filter((n) => isPortNode(n.id));
    const currentNodes = state.nodes.filter((n) => !isPortNode(n.id));
    const currentEdges = state.edges;

    // Apply snapshot immediately for snappy UI (port nodes stay)
    set({ nodes: [...prev.nodes, ...portNodes], edges: prev.edges, undoStack: state.undoStack.slice(0, -1) });

    if (!projectId) return;

    // Diff real nodes only
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
        undoStack: [...state.undoStack.slice(-19), { nodes: state.nodes.filter((n) => !isPortNode(n.id)), edges: state.edges }],
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
        nodes: state.nodes.map((n) => {
          if (n.id !== nodeId) return n;
          return {
            ...n,
            data: {
              ...n.data,
              name: updated.name,
              description: updated.description,
              nodeType: updated.nodeType,
              metadata: updated.metadata,
            },
          };
        }),
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

    // Port node ID format: __port__{realNodeId}_{side}
    // Edges connecting a port node to an internal node ARE saved to the DB —
    // the port node is substituted with its real node ID.
    const extractRealId = (id: string) =>
      isPortNode(id) ? id.slice(PORT_NODE_PREFIX.length).replace(/_(?:top|bottom|left|right)$/, '') : id;

    const srcIsPort = isPortNode(connection.source);
    const tgtIsPort = isPortNode(connection.target);

    if (srcIsPort || tgtIsPort) {
      const realSource = extractRealId(connection.source);
      const realTarget = extractRealId(connection.target);
      try {
        const edge = await edgesApi.create(projectId, {
          sourceId: realSource,
          targetId: realTarget,
          parentId: currentParentId,
          sourceHandle: connection.sourceHandle ?? null,
          targetHandle: connection.targetHandle ?? null,
        });
        // Keep the port node ID in the canvas edge so the visual connection stays
        // anchored to the port node, but the persisted edge uses real IDs.
        set((state) => ({
          edges: [...state.edges, {
            ...dbEdgeToFlowEdge(edge),
            source: connection.source!,
            target: connection.target!,
          }],
        }));
      } catch (err) {
        console.error('Failed to save port edge:', err);
      }
      return;
    }

    try {
      const edge = await edgesApi.create(projectId, {
        sourceId: connection.source,
        targetId: connection.target,
        parentId: currentParentId,
        sourceHandle: connection.sourceHandle ?? null,
        targetHandle: connection.targetHandle ?? null,
      });
      set((state) => ({
        undoStack: [...state.undoStack.slice(-19), { nodes: state.nodes.filter((n) => !isPortNode(n.id)), edges: state.edges }],
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

  copySelectedNodes: () => {
    const selected = get().nodes.filter((n) => n.selected && !isPortNode(n.id));
    if (selected.length === 0) return;
    set({
      clipboard: selected.map((n) => ({
        id: n.id,
        name: n.data.name as string,
        description: (n.data.description as string | null) ?? null,
        nodeType: (n.data.nodeType as string) ?? 'default',
        positionX: n.position.x,
        positionY: n.position.y,
      })),
    });
  },

  copyNodeById: (nodeId) => {
    if (isPortNode(nodeId)) return;
    const node = get().nodes.find((n) => n.id === nodeId);
    if (!node) return;
    set({
      clipboard: [{
        id: node.id,
        name: node.data.name as string,
        description: (node.data.description as string | null) ?? null,
        nodeType: (node.data.nodeType as string) ?? 'default',
        positionX: node.position.x,
        positionY: node.position.y,
      }],
    });
  },

  cutNode: async (projectId, nodeId) => {
    if (isPortNode(nodeId)) return;
    const node = get().nodes.find((n) => n.id === nodeId);
    if (!node) return;
    // Put in clipboard first, then delete
    set({
      clipboard: [{
        id: node.id,
        name: node.data.name as string,
        description: (node.data.description as string | null) ?? null,
        nodeType: (node.data.nodeType as string) ?? 'default',
        positionX: node.position.x,
        positionY: node.position.y,
      }],
    });
    set((state) => ({
      undoStack: [...state.undoStack.slice(-19), { nodes: state.nodes, edges: state.edges }],
    }));
    await nodesApi.delete(projectId, nodeId);
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== nodeId),
      edges: state.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
    }));
  },

  copyToLevel: async (projectId, nodeId, newParentId) => {
    const node = get().nodes.find((n) => n.id === nodeId);
    if (!node) return;
    try {
      await nodesApi.create(projectId, {
        name: node.data.name as string,
        description: (node.data.description as string | undefined),
        nodeType: (node.data.nodeType as string) ?? 'default',
        positionX: node.position.x,
        positionY: node.position.y,
        parentId: newParentId,
      });
      // Node is created at target level — no change to current canvas view
    } catch (err) {
      console.error('Failed to copy node to level:', err);
    }
  },

  pasteNodes: async (projectId, offsetX = 40, offsetY = 40) => {
    const { clipboard, currentParentId } = get();
    if (!clipboard || clipboard.length === 0) return;
    try {
      const created = await Promise.all(
        clipboard.map((n) =>
          nodesApi.create(projectId, {
            name: n.name,
            description: n.description ?? undefined,
            nodeType: n.nodeType,
            positionX: n.positionX + offsetX,
            positionY: n.positionY + offsetY,
            parentId: currentParentId,
          }),
        ),
      );
      set((state) => ({
        undoStack: [...state.undoStack.slice(-19), { nodes: state.nodes, edges: state.edges }],
        nodes: [...state.nodes, ...created.map(dbNodeToFlowNode)],
        // Shift clipboard positions so repeated pastes cascade
        clipboard: state.clipboard!.map((n) => ({
          ...n,
          positionX: n.positionX + offsetX,
          positionY: n.positionY + offsetY,
        })),
      }));
    } catch (err) {
      console.error('Failed to paste nodes:', err);
    }
  },

  reparentNode: async (projectId, nodeId, newParentId) => {
    try {
      await nodesApi.update(projectId, nodeId, { parentId: newParentId });
      // Remove node and any edges connected to it from the current level view
      set((state) => ({
        nodes: state.nodes.filter((n) => n.id !== nodeId),
        edges: state.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      }));
    } catch (err) {
      console.error('Failed to reparent node:', err);
    }
  },

  clearPendingPositions: () => {
    set({ pendingPositionUpdates: new Map() });
  },

  setSaveStatus: (status) => {
    set({ saveStatus: status });
  },

  // ---- Local-only mutations for real-time collaboration ----

  addNodeLocal: (node) => {
    const flowNode = dbNodeToFlowNode(node);
    set((state) => ({ nodes: [...state.nodes, flowNode] }));
  },

  updateNodeLocal: (nodeId, data) => {
    set((state) => ({
      nodes: state.nodes.map((n) => {
        if (n.id !== nodeId) return n;
        return {
          ...n,
          data: {
            ...n.data,
            ...(data.name !== undefined && { name: data.name }),
            ...(data.description !== undefined && { description: data.description }),
            ...(data.nodeType !== undefined && { nodeType: data.nodeType }),
            ...(data.metadata !== undefined && { metadata: data.metadata }),
          },
        };
      }),
    }));
  },

  deleteNodeLocal: (nodeId) => {
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== nodeId),
      edges: state.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
    }));
  },

  moveNodesLocal: (updates) => {
    const posMap = new Map(updates.map((u) => [u.id, { x: u.x, y: u.y }]));
    set((state) => ({
      nodes: state.nodes.map((n) => {
        const pos = posMap.get(n.id);
        return pos ? { ...n, position: pos } : n;
      }),
    }));
  },

  addEdgeLocal: (edge) => {
    const flowEdge = dbEdgeToFlowEdge(edge);
    set((state) => ({ edges: [...state.edges, flowEdge] }));
  },

  deleteEdgeLocal: (edgeId) => {
    set((state) => ({ edges: state.edges.filter((e) => e.id !== edgeId) }));
  },

  onNodesChange: (changes) => {
    // Intercept 'remove' changes to call the API (skip port nodes — they are virtual)
    const removeChanges = changes.filter((c) => c.type === 'remove' && !isPortNode((c as { id: string }).id));
    if (removeChanges.length > 0) {
      const { projectId } = get();
      if (projectId) {
        const state = get();
        const realNodes = state.nodes.filter((n) => !isPortNode(n.id));
        set({ undoStack: [...state.undoStack.slice(-19), { nodes: realNodes, edges: state.edges }] });
        for (const c of removeChanges) {
          nodesApi.delete(projectId, (c as { id: string }).id).catch((err) =>
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
          edgesApi.delete(projectId, (c as { id: string }).id).catch((err) =>
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
