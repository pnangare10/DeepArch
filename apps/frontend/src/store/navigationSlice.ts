import type { StateCreator } from 'zustand';
import type { BreadcrumbItem } from '@deeparch/shared';
import type { StoreState } from './index';

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
  currentParentId: string | null;
  breadcrumbs: BreadcrumbItem[];
  entryExitConnections: EntryExitConnection[];
  setProjectId: (id: string) => void;
  navigateInto: (nodeId: string, nodeName: string) => void;
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
  currentParentId: null,
  breadcrumbs: [{ id: null, name: 'Root' }],
  entryExitConnections: [],

  setProjectId: (id) => set({ projectId: id }),

  navigateInto: (nodeId, nodeName) => {
    const { breadcrumbs, projectId, edges, nodes } = get();
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
    if (projectId) get().loadLevel(projectId, nodeId);
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
