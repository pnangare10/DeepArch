import type { StateCreator } from 'zustand';
import type { BreadcrumbItem } from '@deeparch/shared';
import type { StoreState } from './index';
import { nodesApi } from '../api/nodes';
import { ApiError } from '../api/client';

// Which side of the parent node the external edge connected on
export type PortSide = 'top' | 'bottom' | 'left' | 'right';

export interface EntryExitConnection {
  nodeId: string;
  nodeName: string;
  direction: 'in' | 'out';
  // The handle used on the parent node for this connection (determines port placement)
  side: PortSide;
}

export interface NavigationSlice {
  projectId: string | null;
  projectRole: string | null; // current user's role in this project (null = owner or not loaded)
  currentParentId: string | null;
  breadcrumbs: BreadcrumbItem[];
  entryExitConnections: EntryExitConnection[];
  presentationMode: boolean;
  setProjectId: (id: string) => void;
  setProjectRole: (role: string | null) => void;
  setPresentationMode: (on: boolean) => void;
  navigateInto: (nodeId: string, nodeName: string) => Promise<void>;
  navigateToLevel: (index: number) => void;
  navigateUp: () => void;
  resetNavigation: () => void;
}

// Derive a PortSide from a handle string (e.g. "top", "bottom-src", null → default)
function sideFromHandle(handle: string | null | undefined, fallback: PortSide): PortSide {
  if (!handle) return fallback;
  const lower = handle.toLowerCase();
  if (lower.includes('top')) return 'top';
  if (lower.includes('bottom')) return 'bottom';
  if (lower.includes('left')) return 'left';
  if (lower.includes('right')) return 'right';
  return fallback;
}

export const createNavigationSlice: StateCreator<
  StoreState,
  [],
  [],
  NavigationSlice
> = (set, get) => ({
  projectId: null,
  projectRole: null,
  currentParentId: null,
  breadcrumbs: [{ id: null, name: 'Root' }],
  entryExitConnections: [],
  presentationMode: false,

  setProjectId: (id) => set({ projectId: id }),
  setProjectRole: (role) => set({ projectRole: role }),
  setPresentationMode: (on) => {
    // Leave no editing UI dangling when switching modes
    get().closeDetail();
    get().setContextMenu(null);
    set({ presentationMode: on });
  },

  navigateInto: async (nodeId, nodeName) => {
    const { breadcrumbs, projectId, edges, nodes } = get();
    if (!projectId) return;

    // Access guard: call the single-node endpoint which returns 403 if role is blocked
    try {
      await nodesApi.getById(projectId, nodeId);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        // Parse the blocked roles from the error message for a friendlier toast
        const msg = err.message || 'You do not have access to this block';
        // Fire a custom event so Canvas/Toast can display it
        window.dispatchEvent(new CustomEvent('deeparch:access-denied', { detail: { message: msg } }));
        return;
      }
      // Other errors (network, etc.) — let them propagate silently
      return;
    }

    const newBreadcrumbs = [...breadcrumbs, { id: nodeId, name: nodeName }];

    // Build entry/exit connections from the current level's edges, including side info
    const connections: EntryExitConnection[] = [];
    for (const edge of edges) {
      if (edge.target === nodeId) {
        // Something flows INTO this node — use the targetHandle to determine which side it arrives on
        const srcNode = nodes.find((n) => n.id === edge.source);
        if (srcNode) {
          connections.push({
            nodeId: edge.source,
            nodeName: (srcNode.data?.name as string) ?? edge.source,
            direction: 'in',
            side: sideFromHandle(edge.targetHandle, 'left'),
          });
        }
      }
      if (edge.source === nodeId) {
        // Something flows OUT of this node — use the sourceHandle for the exit side
        const tgtNode = nodes.find((n) => n.id === edge.target);
        if (tgtNode) {
          connections.push({
            nodeId: edge.target,
            nodeName: (tgtNode.data?.name as string) ?? edge.target,
            direction: 'out',
            side: sideFromHandle(edge.sourceHandle, 'right'),
          });
        }
      }
    }

    set({ currentParentId: nodeId, breadcrumbs: newBreadcrumbs, entryExitConnections: connections });
    get().loadLevel(projectId, nodeId);
  },

  navigateToLevel: (index) => {
    const { breadcrumbs, projectId } = get();
    const target = breadcrumbs[index];
    const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
    set({ currentParentId: target.id, breadcrumbs: newBreadcrumbs, entryExitConnections: [] });
    if (projectId) get().loadLevel(projectId, target.id);
  },

  navigateUp: () => {
    const { breadcrumbs } = get();
    if (breadcrumbs.length <= 1) return;
    get().navigateToLevel(breadcrumbs.length - 2);
  },

  resetNavigation: () =>
    set({
      currentParentId: null,
      breadcrumbs: [{ id: null, name: 'Root' }],
      entryExitConnections: [],
    }),
});
