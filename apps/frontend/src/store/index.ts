import { create } from 'zustand';
import { createNavigationSlice, type NavigationSlice } from './navigationSlice';
import { createCanvasSlice, type CanvasSlice } from './canvasSlice';
import { createSearchSlice, type SearchSlice } from './searchSlice';
import { createMetadataSlice, type MetadataSlice } from './metadataSlice';

export type StoreState = NavigationSlice & CanvasSlice & SearchSlice & MetadataSlice;

export const useStore = create<StoreState>()((...a) => ({
  ...createNavigationSlice(...a),
  ...createCanvasSlice(...a),
  ...createSearchSlice(...a),
  ...createMetadataSlice(...a),
}));
