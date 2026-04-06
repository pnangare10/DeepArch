import { create } from 'zustand';
import { createNavigationSlice, type NavigationSlice } from './navigationSlice';
import { createCanvasSlice, type CanvasSlice } from './canvasSlice';
import { createSearchSlice, type SearchSlice } from './searchSlice';
import { createMetadataSlice, type MetadataSlice } from './metadataSlice';
import { createAuthSlice, type AuthSlice } from './authSlice';
import { createCollaborationSlice, type CollaborationSlice } from './collaborationSlice';
import type { Comment } from '@deeparch/shared';

// Comment event inbox — set by socket handlers, consumed by CommentSection
export interface CommentEventState {
  incomingComment: Comment | null;
  incomingCommentUpdate: { commentId: string; text: string; updatedAt: string } | null;
  incomingCommentDelete: string | null;
  clearCommentEvents: () => void;
}

export type StoreState = NavigationSlice & CanvasSlice & SearchSlice & MetadataSlice & AuthSlice & CollaborationSlice & CommentEventState;

export const useStore = create<StoreState>()((...a) => ({
  ...createNavigationSlice(...a),
  ...createCanvasSlice(...a),
  ...createSearchSlice(...a),
  ...createMetadataSlice(...a),
  ...createAuthSlice(...a),
  ...createCollaborationSlice(...a),
  incomingComment: null,
  incomingCommentUpdate: null,
  incomingCommentDelete: null,
  clearCommentEvents: () => a[0]({ incomingComment: null, incomingCommentUpdate: null, incomingCommentDelete: null }),
}));
