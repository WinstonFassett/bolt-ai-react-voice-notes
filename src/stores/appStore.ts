import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  // App State
  isLoaded: boolean;
  
  // Actions
  setIsLoaded: (loaded: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Initial state
      isLoaded: false,
      
      // Simple setters
      setIsLoaded: (loaded) => set({ isLoaded: loaded }),
    }),
    {
      name: 'app-store',
      version: 1,
      migrate: (persistedState: any) => persistedState
    }
  )
);