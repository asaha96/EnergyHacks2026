import { create } from 'zustand';

type SidebarType = 'constraints' | 'agent' | 'analytics' | 'billing' | 'implementation' | null;

interface UIState {
  sidebarOpen: SidebarType;
  openSidebar: (type: SidebarType) => void;
  closeSidebar: () => void;
  
  isMapFullscreen: boolean;
  setMapFullscreen: (value: boolean) => void;
  
  mapStyle: 'street' | 'satellite';
  setMapStyle: (style: 'street' | 'satellite') => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: null,
  openSidebar: (type) => set({ sidebarOpen: type }),
  closeSidebar: () => set({ sidebarOpen: null }),
  
  isMapFullscreen: false,
  setMapFullscreen: (value) => set({ isMapFullscreen: value }),
  
  mapStyle: 'street',
  setMapStyle: (style) => set({ mapStyle: style }),
}));
