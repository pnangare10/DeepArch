import type { StateCreator } from 'zustand';
import { io as socketIo, type Socket } from 'socket.io-client';
import type { CursorEvent } from '@deeparch/shared';
import type { StoreState } from './index';
import { dbNodeToFlowNode, dbEdgeToFlowEdge } from '../lib/transforms';
import type { ArchNode, ArchEdge } from '@deeparch/shared';

export interface OnlineUser {
  userId: string;
  name: string;
  color: string;
}

export interface CollaborationSlice {
  socket: Socket | null;
  onlineUsers: OnlineUser[];
  cursors: Record<string, CursorEvent>;
  connectToProject: (projectId: string, token: string) => void;
  disconnectFromProject: () => void;
  emitCursorMove: (projectId: string, x: number, y: number) => void;
}

export const createCollaborationSlice: StateCreator<
  StoreState,
  [],
  [],
  CollaborationSlice
> = (set, get) => ({
  socket: null,
  onlineUsers: [],
  cursors: {},

  connectToProject: (projectId, token) => {
    // Disconnect existing socket if any
    const existing = get().socket;
    if (existing) existing.disconnect();

    const socket = socketIo('http://localhost:3001', {
      auth: { token },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      socket.emit('join', { projectId });
    });

    socket.on('user:joined', (user: OnlineUser) => {
      set((state) => ({
        onlineUsers: [...state.onlineUsers.filter((u) => u.userId !== user.userId), user],
      }));
    });

    socket.on('user:left', ({ userId }: { userId: string }) => {
      set((state) => ({
        onlineUsers: state.onlineUsers.filter((u) => u.userId !== userId),
        cursors: Object.fromEntries(
          Object.entries(state.cursors).filter(([id]) => id !== userId),
        ),
      }));
    });

    socket.on('cursor:moved', (event: CursorEvent) => {
      set((state) => ({
        cursors: { ...state.cursors, [event.userId]: event },
      }));
    });

    // Real-time node events — apply locally without API call
    socket.on('node:created', (node: ArchNode) => {
      get().addNodeLocal(node);
    });

    socket.on('node:updated', ({ nodeId, data }: { nodeId: string; data: Partial<ArchNode> }) => {
      get().updateNodeLocal(nodeId, data);
    });

    socket.on('node:deleted', ({ nodeId }: { nodeId: string }) => {
      get().deleteNodeLocal(nodeId);
    });

    socket.on('node:moved', ({ updates }: { updates: { id: string; x: number; y: number }[] }) => {
      get().moveNodesLocal(updates);
    });

    // Real-time edge events
    socket.on('edge:created', (edge: ArchEdge) => {
      get().addEdgeLocal(edge);
    });

    socket.on('edge:deleted', ({ edgeId }: { edgeId: string }) => {
      get().deleteEdgeLocal(edgeId);
    });

    // Real-time comment events
    socket.on('comment:created', (comment: unknown) => {
      set((state) => ({ incomingComment: comment as import('@deeparch/shared').Comment }));
    });

    socket.on('comment:updated', (payload: { commentId: string; text: string; updatedAt: string }) => {
      set({ incomingCommentUpdate: payload });
    });

    socket.on('comment:deleted', ({ commentId }: { commentId: string }) => {
      set({ incomingCommentDelete: commentId });
    });

    socket.on('disconnect', () => {
      set({ onlineUsers: [], cursors: {} });
    });

    set({ socket, onlineUsers: [] });
  },

  disconnectFromProject: () => {
    const { socket, projectId } = get();
    if (socket) {
      if (projectId) socket.emit('leave', { projectId });
      socket.disconnect();
    }
    set({ socket: null, onlineUsers: [], cursors: {} });
  },

  emitCursorMove: (projectId, x, y) => {
    const { socket, currentParentId } = get();
    if (!socket?.connected) return;
    socket.emit('cursor:move', { projectId, x, y, parentId: currentParentId });
  },
});
