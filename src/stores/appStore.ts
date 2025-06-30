import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ActiveTab = 'record' | 'library' | 'agents' | 'settings';
type AppScreen = 'main' | 'note-detail';

interface AppState {
  // UI State
  activeTab: ActiveTab;
  currentScreen: AppScreen;
  selectedNoteId: string | null;
  isLoaded: boolean;
  
  // Actions
  setActiveTab: (tab: ActiveTab) => void;
  setCurrentScreen: (screen: AppScreen) => void;
  setSelectedNoteId: (id: string | null) => void;
  setIsLoaded: (loaded: boolean) => void;
  
  // Navigation helpers
  navigateToNoteDetail: (noteId: string) => void;
  navigateToMain: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Initial state
      activeTab: 'record',
      currentScreen: 'main',
      selectedNoteId: null,
      isLoaded: false,
      
      // Simple setters
      setActiveTab: (tab) => set({ activeTab: tab }),
      setCurrentScreen: (screen) => set({ currentScreen: screen }),
      setSelectedNoteId: (id) => set({ selectedNoteId: id }),
      setIsLoaded: (loaded) => set({ isLoaded: loaded }),
      
      // Navigation helpers
      navigateToNoteDetail: (noteId) => set({
        selectedNoteId: noteId,
        currentScreen: 'note-detail',
        activeTab: 'library'
      }),
      
      navigateToMain: () => set({
        currentScreen: 'main',
        selectedNoteId: null
      })
    }),
    {
      name: 'app-store',
      version: 0,
      migrate: (persistedState: any) => persistedState
    }
  )
);