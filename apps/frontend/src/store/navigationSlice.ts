import type { StateCreator } from 'zustand';
import type { BreadcrumbItem } from '@deeparch/shared';
import type { StoreState } from './index';

export interface EntryExitConnection {
  nodeId: string;
  nodeName: string;
  direction: 'in' | 'out';
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

    // Build entry/exit connections from the current level's edges
    const connections: EntryExitConnection[] = [];
    for (const edge of edges) {
      if (edge.target === nodeId) {
        // Something flows INTO this node
        const srcNode = nodes.find((n) => n.id === edge.source);
        if (srcNode) {
          connections.push({ nodeId: edge.source, nodeName: srcNode.data?.name as string ?? edge.source, direction: 'in' });
        }
      }
      if (edge.source === nodeId) {
        // Something flows OUT of this node
        const tgtNode = nodes.find((n) => n.id === edge.target);
        if (tgtNode) {
          connections.push({ nodeId: edge.target, nodeName: tgtNode.data?.name as string ?? edge.target, direction: 'out' });
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
