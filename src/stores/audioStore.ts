import { create } from 'zustand';
import { isStorageUrl, resolveStorageUrl } from '../utils/audioStorage';

interface AudioState {
  // Global audio player state
  currentPlayingAudioUrl: string | null;
  resolvedPlayingAudioUrl: string | null;
  globalIsPlaying: boolean;
  globalAudioDuration: number;
  globalAudioCurrentTime: number;
  
  // Mobile-specific state
  isUserInteracting: boolean;
  pendingPlayRequest: string | null;
  
  // Modal state
  showUrlModal: boolean;
  audioDownloadUrl: string;
  
  // Error state
  lastError: string | null;
  showErrorModal: boolean;
  
  // Actions
  setCurrentPlayingAudioUrl: (url: string | null) => void;
  setResolvedPlayingAudioUrl: (url: string | null) => void;
  setGlobalIsPlaying: (playing: boolean) => void;
  setGlobalAudioDuration: (duration: number) => void;
  setGlobalAudioCurrentTime: (time: number) => void;
  setShowUrlModal: (show: boolean) => void;
  setAudioDownloadUrl: (url: string) => void;
  setIsUserInteracting: (interacting: boolean) => void;
  setPendingPlayRequest: (url: string | null) => void;
  setLastError: (error: string | null) => void;
  setShowErrorModal: (show: boolean) => void;
  
  // Complex actions
  playAudio: (audioUrl: string) => Promise<void>;
  togglePlayPause: () => void;
  seekAudio: (time: number) => void;
  closePlayer: () => void;
  handleUserInteraction: () => void;
  showError: (error: string) => void;
  clearError: () => void;
}

export const useAudioStore = create<AudioState>((set, get) => ({
  // Initial state
  currentPlayingAudioUrl: null,
  resolvedPlayingAudioUrl: null,
  globalIsPlaying: false,
  globalAudioDuration: 0,
  globalAudioCurrentTime: 0,
  isUserInteracting: false,
  pendingPlayRequest: null,
  showUrlModal: false,
  audioDownloadUrl: '',
  lastError: null,
  showErrorModal: false,
  
  // Simple setters
  setCurrentPlayingAudioUrl: (url) => set({ currentPlayingAudioUrl: url }),
  setResolvedPlayingAudioUrl: (url) => set({ resolvedPlayingAudioUrl: url }),
  setGlobalIsPlaying: (playing) => set({ globalIsPlaying: playing }),
  setGlobalAudioDuration: (duration) => set({ globalAudioDuration: duration }),
  setGlobalAudioCurrentTime: (time) => set({ globalAudioCurrentTime: time }),
  setShowUrlModal: (show) => set({ showUrlModal: show }),
  setAudioDownloadUrl: (url) => set({ audioDownloadUrl: url }),
  setIsUserInteracting: (interacting) => set({ isUserInteracting: interacting }),
  setPendingPlayRequest: (url) => set({ pendingPlayRequest: url }),
  setLastError: (error) => set({ lastError: error }),
  setShowErrorModal: (show) => set({ showErrorModal: show }),
  
  // Complex actions
  playAudio: async (audioUrl) => {
    console.log('AudioStore: playAudio called with URL:', audioUrl);
    const { currentPlayingAudioUrl, globalIsPlaying } = get();
    
    // Mark user interaction
    set({ isUserInteracting: true });
    
    if (currentPlayingAudioUrl === audioUrl) {
      // Toggle play/pause for same audio
      console.log('AudioStore: Toggling play/pause for current audio');
      set({ globalIsPlaying: !globalIsPlaying });
    } else {
      // Play new audio - resolve URL first if it's a storage URL
      let resolvedUrl = audioUrl;
      if (isStorageUrl(audioUrl)) {
        console.log('AudioStore: Resolving storage URL:', audioUrl);
        try {
          const resolved = await resolveStorageUrl(audioUrl);
          if (resolved) {
            resolvedUrl = resolved.url;
            console.log('AudioStore: Resolved to blob URL:', resolvedUrl);
          } else {
            console.error('AudioStore: Failed to resolve storage URL - no result');
            get().showError('Failed to load audio file - file may be corrupted or missing');
            return;
          }
        } catch (error) {
          console.error('AudioStore: Failed to resolve storage URL:', error);
          get().showError(`Failed to load audio file: ${error}`);
          return;
        }
      }
      
      console.log('AudioStore: Setting new audio to play:', resolvedUrl);
      set({
        currentPlayingAudioUrl: audioUrl,
        resolvedPlayingAudioUrl: resolvedUrl,
        globalIsPlaying: true,
        globalAudioCurrentTime: 0,
        pendingPlayRequest: audioUrl
      });
    }
  },
  
  showError: (error) => {
    set({ 
      lastError: error,
      showErrorModal: true 
    });
  },
  
  clearError: () => {
    set({ 
      lastError: null,
      showErrorModal: false 
    });
  },
  
  togglePlayPause: () => {
    set((state) => ({ 
      globalIsPlaying: !state.globalIsPlaying,
      isUserInteracting: true 
    }));
  },
  
  seekAudio: (time) => {
    console.log('AudioStore: Seeking to time:', time);
    set({ 
      globalAudioCurrentTime: time,
      isUserInteracting: true 
    });
  },
  
  closePlayer: () => {
    set({
      currentPlayingAudioUrl: null,
      resolvedPlayingAudioUrl: null,
      globalIsPlaying: false,
      globalAudioCurrentTime: 0,
      globalAudioDuration: 0,
      pendingPlayRequest: null,
      isUserInteracting: false
    });
  },
  
  handleUserInteraction: () => {
    const { pendingPlayRequest } = get();
    set({ isUserInteracting: true });
    
    // If there's a pending play request, try to fulfill it
    if (pendingPlayRequest) {
      console.log('AudioStore: Processing pending play request:', pendingPlayRequest);
      set({ pendingPlayRequest: null });
    }
  }
}));