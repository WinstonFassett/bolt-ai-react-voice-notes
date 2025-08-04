import { create } from 'zustand';
import { isStorageUrl, resolveStorageUrl } from '../utils/audioStorage';
import { useDebugStore } from './debugStore';

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
  
  // Internal audio element (no React ref needed)
  audioElement: HTMLAudioElement | null;
  playPromise: Promise<void> | null;
  
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
  
  // High-level audio management
  initializeAudio: () => void;
  cleanupAudio: () => void;
  loadAndPlay: (url: string) => Promise<void>;
  handleAudioError: () => void;
}

export const useAudioStore = create<AudioState>()((set, get) => ({
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
  audioElement: null,
  playPromise: null,
  
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
    
    // Initialize audio if needed
    if (!get().audioElement) {
      get().initializeAudio();
    }
    
    // Mark user interaction
    set({ isUserInteracting: true });
    
    if (currentPlayingAudioUrl === audioUrl) {
      // Toggle play/pause for same audio
      console.log('AudioStore: Toggling play/pause for current audio');
      
      if (globalIsPlaying) {
        get().audioElement?.pause();
        set({ globalIsPlaying: false });
      } else {
        await get().loadAndPlay(get().resolvedPlayingAudioUrl || '');
      }
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
        globalAudioCurrentTime: 0,
        pendingPlayRequest: audioUrl
      });
      
      // Load and play the new audio
      await get().loadAndPlay(resolvedUrl);
    }
  },
  
  initializeAudio: () => {
    const state = get();
    if (state.audioElement) return;

    console.log('🎵 AudioStore: Initializing audio element');
    
    const audio = new Audio();
    audio.preload = 'metadata';
    
    // iOS compatibility
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      audio.setAttribute('webkit-playsinline', 'true');
      audio.setAttribute('playsinline', 'true');
    }

    // Event listeners
    audio.addEventListener('loadedmetadata', () => {
      const duration = audio.duration || 0;
      set({ globalAudioDuration: duration });
      useDebugStore.getState().addDebugEvent('AUDIO_LOADED', `Duration: ${duration}s`);
    });

    audio.addEventListener('timeupdate', () => {
      set({ globalAudioCurrentTime: audio.currentTime || 0 });
    });

    audio.addEventListener('ended', () => {
      set({
        globalIsPlaying: false,
        globalAudioCurrentTime: 0,
        pendingPlayRequest: null
      });
      useDebugStore.getState().addDebugEvent('AUDIO_ENDED', 'Playback completed');
    });

    audio.addEventListener('error', () => {
      get().handleAudioError();
    });

    set({ audioElement: audio });
    useDebugStore.getState().addDebugEvent('AUDIO_INIT', 'Audio element initialized');
  },
  
  loadAndPlay: async (url: string) => {
    const state = get();
    if (!state.audioElement || !url) return;

    try {
      // Cancel any existing play promise
      if (state.playPromise) {
        state.playPromise.catch(() => {});
      }

      // Load new URL if different
      if (state.audioElement.src !== url) {
        state.audioElement.src = url;
        state.audioElement.load();
        useDebugStore.getState().addDebugEvent('AUDIO_SET_SRC', `Loading: ${url.substring(0, 50)}...`);
      }

      // Check for mobile user interaction requirement
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile && !state.isUserInteracting) {
        useDebugStore.getState().addDebugEvent('AUDIO_PENDING', 'Mobile device - pending user interaction');
        set({ 
          globalIsPlaying: false,
          pendingPlayRequest: state.currentPlayingAudioUrl 
        });
        return;
      }

      // Attempt to play
      const playPromise = state.audioElement.play();
      set({ playPromise });

      if (playPromise) {
        await playPromise;
        useDebugStore.getState().addDebugEvent('AUDIO_PLAY_SUCCESS', 'Playback started');
        set({ 
          globalIsPlaying: true,
          pendingPlayRequest: null,
          playPromise: null 
        });
      }

    } catch (error: any) {
      useDebugStore.getState().addDebugEvent('AUDIO_PLAY_FAILED', `${error.name}: ${error.message}`);
      console.error('Audio play failed:', error);
      
      let userFriendlyError = 'Failed to play audio';
      if (error.name === 'NotAllowedError') {
        userFriendlyError = 'Audio blocked by browser - try tapping play again';
        set({ pendingPlayRequest: state.currentPlayingAudioUrl });
      } else if (error.name === 'NotSupportedError') {
        userFriendlyError = 'Audio format not supported on this device';
      } else {
        userFriendlyError = `Playback failed: ${error.message || error.name}`;
      }
      
      get().showError(userFriendlyError);
      set({ 
        globalIsPlaying: false,
        playPromise: null 
      });
    }
  },
  
  handleAudioError: () => {
    const state = get();
    if (!state.audioElement?.error) return;

    const errorCode = state.audioElement.error.code;
    const errorMessage = state.audioElement.error.message;
    
    let userFriendlyError = 'Audio playback failed';
    switch (errorCode) {
      case 1: userFriendlyError = 'Audio playback was stopped'; break;
      case 2: userFriendlyError = 'Network error while loading audio'; break;
      case 3: userFriendlyError = 'Audio file is corrupted or unsupported'; break;
      case 4: userFriendlyError = 'Audio format not supported on this device'; break;
      default: userFriendlyError = `Audio error: ${errorMessage || 'Unknown error'}`;
    }
    
    get().showError(userFriendlyError);
    set({
      globalIsPlaying: false,
      currentPlayingAudioUrl: null,
      resolvedPlayingAudioUrl: null,
      pendingPlayRequest: null
    });
  },
  
  cleanupAudio: () => {
    const state = get();
    if (state.audioElement) {
      state.audioElement.pause();
      state.audioElement.removeAttribute('src');
      state.audioElement.load();
    }
    
    set({
      audioElement: null,
      playPromise: null,
      currentPlayingAudioUrl: null,
      resolvedPlayingAudioUrl: null,
      globalIsPlaying: false,
      globalAudioCurrentTime: 0,
      globalAudioDuration: 0,
      pendingPlayRequest: null
    });
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
    
    const state = get();
    if (state.audioElement) {
      if (state.globalIsPlaying) {
        get().loadAndPlay(state.resolvedPlayingAudioUrl || '');
      } else {
        state.audioElement.pause();
      }
    }
  },
  
  seekAudio: (time) => {
    console.log('AudioStore: Seeking to time:', time);
    const state = get();
    if (state.audioElement && isFinite(time) && time >= 0) {
      state.audioElement.currentTime = time;
      set({ 
        globalAudioCurrentTime: time,
        isUserInteracting: true 
      });
    }
  },
  
  closePlayer: () => {
    const state = get();
    if (state.audioElement) {
      state.audioElement.pause();
    }
    
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
      get().playAudio(pendingPlayRequest);
    }
  }
}));