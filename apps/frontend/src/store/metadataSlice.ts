import type { StateCreator } from 'zustand';
import type { ArchNode, NodeMetadata } from '@deeparch/shared';
import { nodesApi } from '../api/nodes';
import { dbNodeToFlowNode } from '../lib/transforms';
import type { StoreState } from './index';

export type ContextMenuTarget =
  | { type: 'node'; id: string; name: string; x: number; y: number }
  | { type: 'edge'; id: string; label: string | null; x: number; y: number }
  | { type: 'pane'; x: number; y: number; canvasX: number; canvasY: number };

export interface MetadataSlice {
  selectedNodeId: string | null;
  selectedNode: ArchNode | null;
  isDetailOpen: boolean;
  contextMenu: ContextMenuTarget | null;
  selectNode: (nodeId: string | null) => void;
  closeDetail: () => void;
  setContextMenu: (menu: ContextMenuTarget | null) => void;
  updateMetadata: (
    projectId: string,
    nodeId: string,
    metadata: Partial<NodeMetadata>,
  ) => Promise<void>;
  updateNodeInfo: (
    projectId: string,
    nodeId: string,
    data: { name?: string; description?: string; nodeType?: string },
  ) => Promise<void>;
}

export const createMetadataSlice: StateCreator<
  StoreState,
  [],
  [],
  MetadataSlice
> = (set, get) => ({
  selectedNodeId: null,
  selectedNode: null,
  isDetailOpen: false,
  contextMenu: null,

  setContextMenu: (menu) => set({ contextMenu: menu }),

  selectNode: (nodeId) => {
    if (!nodeId) {
      set({ selectedNodeId: null, selectedNode: null, isDetailOpen: false });
      return;
    }
    // Find node data from the canvas nodes
    const flowNode = get().nodes.find((n) => n.id === nodeId);
    if (flowNode) {
      set({
        selectedNodeId: nodeId,
        selectedNode: {
          id: flowNode.id,
          projectId: get().projectId!,
          parentId: get().currentParentId,
          name: flowNode.data.name as string,
          description: (flowNode.data.description as string) || null,
          nodeType: flowNode.data.nodeType as string,
          positionX: flowNode.position.x,
          positionY: flowNode.position.y,
          width: null,
          height: null,
          metadata: flowNode.data.metadata as NodeMetadata,
          style: null,
          createdAt: '',
          updatedAt: '',
          childCount: (flowNode.data.childCount as number) ?? 0,
        },
        isDetailOpen: true,
      });
    }
  },

  closeDetail: () =>
    set({ selectedNodeId: null, selectedNode: null, isDetailOpen: false }),

  updateMetadata: async (projectId, nodeId, metadata) => {
    try {
      const updated = await nodesApi.update(projectId, nodeId, { metadata });
      set((state) => ({
        nodes: state.nodes.map((n) =>
          n.id === nodeId ? dbNodeToFlowNode(updated) : n,
        ),
        selectedNode: state.selectedNodeId === nodeId ? updated : state.selectedNode,
      }));
    } catch (err) {
      console.error('Failed to update metadata:', err);
    }
  },

  updateNodeInfo: async (projectId, nodeId, data) => {
    try {
      const updated = await nodesApi.update(projectId, nodeId, data);
      set((state) => ({
        nodes: state.nodes.map((n) =>
          n.id === nodeId ? dbNodeToFlowNode(updated) : n,
        ),
        selectedNode: state.selectedNodeId === nodeId ? updated : state.selectedNode,
      }));
    } catch (err) {
      console.error('Failed to update node info:', err);
    }
  },
});
