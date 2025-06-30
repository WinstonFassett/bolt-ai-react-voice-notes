import { create } from 'zustand';

interface AudioDebugInfo {
  timestamp: string;
  event: string;
  details: any;
}

interface DebugState {
  isDebugVisible: boolean;
  debugInfo: AudioDebugInfo[];
  
  // Actions
  setDebugVisible: (visible: boolean) => void;
  addDebugEvent: (event: string, details?: any) => void;
  clearDebugInfo: () => void;
}

export const useDebugStore = create<DebugState>((set, get) => ({
  isDebugVisible: false,
  debugInfo: [],
  
  setDebugVisible: (visible) => set({ isDebugVisible: visible }),
  
  addDebugEvent: (event, details) => {
    const timestamp = new Date().toLocaleTimeString();
    const newEvent: AudioDebugInfo = {
      timestamp,
      event,
      details
    };
    
    set((state) => ({
      debugInfo: [...state.debugInfo, newEvent].slice(-50) // Keep last 50 events
    }));
  },
  
  clearDebugInfo: () => set({ debugInfo: [] })
}));