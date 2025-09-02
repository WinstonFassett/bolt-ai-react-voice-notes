import { MediaBunnyAudioPlayer } from './audioPlayer';
import { useFeatureFlagsStore } from '../stores/featureFlagsStore';
import { mediaBunnyService } from './mediaBunnyService';

// Legacy audio player using HTML5 Audio element
export interface LegacyPlayerOptions {
  autoplay?: boolean;
  loop?: boolean;
  volume?: number;
  startTime?: number;
  preload?: 'none' | 'metadata' | 'auto';
}

export interface HybridPlaybackState {
  isLoaded: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  usingMediaBunny: boolean;
  metadata?: any;
}

/**
 * Hybrid audio player that automatically chooses between Media Bunny and legacy implementation
 */
export class HybridAudioPlayer {
  private mediaBunnyPlayer: MediaBunnyAudioPlayer | null = null;
  private legacyPlayer: LegacyAudioPlayer | null = null;
  private usingMediaBunny = false;
  private currentAudioBlob: Blob | null = null;

  constructor(private options: LegacyPlayerOptions = {}) {}

  /**
   * Initialize the appropriate player based on feature flags and browser support
   */
  private async initializePlayer(): Promise<void> {
    const featureFlags = useFeatureFlagsStore.getState();
    
    // Check if we should use Media Bunny
    if (featureFlags.shouldUseMediaBunny('playback')) {
      try {
        // Test if Media Bunny is supported
        const isSupported = await mediaBunnyService.isSupported();
        if (isSupported) {
          console.log('🔊 HybridAudioPlayer: Using Media Bunny implementation');
          this.mediaBunnyPlayer = new MediaBunnyAudioPlayer(this.options);
          this.usingMediaBunny = true;
          return;
        }
      } catch (error) {
        console.warn('🔊 HybridAudioPlayer: Media Bunny initialization failed, falling back to legacy:', error);
      }
    }

    // Fall back to legacy implementation
    console.log('🔊 HybridAudioPlayer: Using legacy implementation');
    this.legacyPlayer = new LegacyAudioPlayer(this.options);
    this.usingMediaBunny = false;
  }

  /**
   * Load audio from blob
   */
  async loadAudio(audioBlob: Blob): Promise<void> {
    this.currentAudioBlob = audioBlob;
    
    if (!this.mediaBunnyPlayer && !this.legacyPlayer) {
      await this.initializePlayer();
    }

    if (this.usingMediaBunny && this.mediaBunnyPlayer) {
      await this.mediaBunnyPlayer.loadAudio(audioBlob);
    } else if (this.legacyPlayer) {
      await this.legacyPlayer.loadAudio(audioBlob);
    } else {
      throw new Error('No player available');
    }
  }

  /**
   * Start playback
   */
  async play(startTime?: number): Promise<void> {
    if (this.usingMediaBunny && this.mediaBunnyPlayer) {
      await this.mediaBunnyPlayer.play(startTime);
    } else if (this.legacyPlayer) {
      await this.legacyPlayer.play(startTime);
    } else {
      throw new Error('No player available or audio not loaded');
    }
  }

  /**
   * Pause playback
   */
  pause(): void {
    if (this.usingMediaBunny && this.mediaBunnyPlayer) {
      this.mediaBunnyPlayer.pause();
    } else if (this.legacyPlayer) {
      this.legacyPlayer.pause();
    }
  }

  /**
   * Stop playback
   */
  stop(): void {
    if (this.usingMediaBunny && this.mediaBunnyPlayer) {
      this.mediaBunnyPlayer.stop();
    } else if (this.legacyPlayer) {
      this.legacyPlayer.stop();
    }
  }

  /**
   * Seek to specific time
   */
  async seek(time: number): Promise<void> {
    if (this.usingMediaBunny && this.mediaBunnyPlayer) {
      await this.mediaBunnyPlayer.seek(time);
    } else if (this.legacyPlayer) {
      await this.legacyPlayer.seek(time);
    }
  }

  /**
   * Set volume (0-1)
   */
  setVolume(volume: number): void {
    if (this.usingMediaBunny && this.mediaBunnyPlayer) {
      this.mediaBunnyPlayer.setVolume(volume);
    } else if (this.legacyPlayer) {
      this.legacyPlayer.setVolume(volume);
    }
  }

  /**
   * Get current playback time
   */
  getCurrentTime(): number {
    if (this.usingMediaBunny && this.mediaBunnyPlayer) {
      return this.mediaBunnyPlayer.getCurrentTime();
    } else if (this.legacyPlayer) {
      return this.legacyPlayer.getCurrentTime();
    }
    return 0;
  }

  /**
   * Get playback state
   */
  getState(): HybridPlaybackState {
    let state: any = {
      isLoaded: false,
      isPlaying: false,
      isPaused: false,
      currentTime: 0,
      duration: 0,
      volume: 1,
      usingMediaBunny: this.usingMediaBunny,
      metadata: null
    };

    if (this.usingMediaBunny && this.mediaBunnyPlayer) {
      const mbState = this.mediaBunnyPlayer.getState();
      state = { ...state, ...mbState, usingMediaBunny: true };
    } else if (this.legacyPlayer) {
      const legacyState = this.legacyPlayer.getState();
      state = { ...state, ...legacyState, usingMediaBunny: false };
    }

    return state;
  }

  /**
   * Add event listener for playback events
   */
  addEventListener(listener: (event: any) => void): void {
    if (this.usingMediaBunny && this.mediaBunnyPlayer) {
      this.mediaBunnyPlayer.addEventListener(listener);
    } else if (this.legacyPlayer) {
      this.legacyPlayer.addEventListener(listener);
    }
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: (event: any) => void): void {
    if (this.usingMediaBunny && this.mediaBunnyPlayer) {
      this.mediaBunnyPlayer.removeEventListener(listener);
    } else if (this.legacyPlayer) {
      this.legacyPlayer.removeEventListener(listener);
    }
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    if (this.mediaBunnyPlayer) {
      await this.mediaBunnyPlayer.cleanup();
      this.mediaBunnyPlayer = null;
    }
    
    if (this.legacyPlayer) {
      await this.legacyPlayer.cleanup();
      this.legacyPlayer = null;
    }
    
    this.currentAudioBlob = null;
  }
}

/**
 * Legacy audio player implementation using HTML5 Audio
 */
class LegacyAudioPlayer {
  private audioElement: HTMLAudioElement | null = null;
  private audioUrl: string | null = null;
  private eventListeners: Array<(event: any) => void> = [];
  private state = {
    isLoaded: false,
    isPlaying: false,
    isPaused: false,
    currentTime: 0,
    duration: 0,
    volume: 1
  };

  constructor(private options: LegacyPlayerOptions = {}) {
    this.state.volume = options.volume ?? 1;
  }

  async loadAudio(audioBlob: Blob): Promise<void> {
    try {
      await this.cleanup();
      
      // Create blob URL
      this.audioUrl = URL.createObjectURL(audioBlob);
      
      // Create audio element
      this.audioElement = new Audio();
      this.audioElement.preload = this.options.preload || 'metadata';
      this.audioElement.volume = this.state.volume;
      
      if (this.options.loop) {
        this.audioElement.loop = true;
      }
      
      // iOS compatibility
      if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
        this.audioElement.setAttribute('webkit-playsinline', 'true');
        this.audioElement.setAttribute('playsinline', 'true');
      }
      
      // Set up event listeners
      this.setupAudioEventListeners();
      
      // Load the audio
      this.audioElement.src = this.audioUrl;
      
      // Wait for metadata to load
      await new Promise<void>((resolve, reject) => {
        const onLoadedMetadata = () => {
          this.state.isLoaded = true;
          this.state.duration = this.audioElement?.duration || 0;
          this.emitEvent({ type: 'loadedmetadata', timestamp: Date.now() });
          this.emitEvent({ type: 'canplay', timestamp: Date.now() });
          resolve();
        };
        
        const onError = () => {
          const error = new Error('Failed to load audio');
          this.emitEvent({ type: 'error', data: error, timestamp: Date.now() });
          reject(error);
        };
        
        this.audioElement!.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });
        this.audioElement!.addEventListener('error', onError, { once: true });
        
        // Timeout after 10 seconds
        setTimeout(() => {
          this.audioElement!.removeEventListener('loadedmetadata', onLoadedMetadata);
          this.audioElement!.removeEventListener('error', onError);
          reject(new Error('Audio loading timeout'));
        }, 10000);
      });
      
      console.log('🔊 LegacyAudioPlayer: Audio loaded successfully');

      // Auto-play if requested
      if (this.options.autoplay) {
        await this.play();
      }

    } catch (error) {
      console.error('🔊 LegacyAudioPlayer: Failed to load audio:', error);
      throw error;
    }
  }

  async play(startTime?: number): Promise<void> {
    if (!this.audioElement || !this.state.isLoaded) {
      throw new Error('Audio not loaded');
    }

    try {
      if (startTime !== undefined) {
        this.audioElement.currentTime = startTime;
      }

      const playPromise = this.audioElement.play();
      if (playPromise) {
        await playPromise;
      }

      this.state.isPlaying = true;
      this.state.isPaused = false;
      this.emitEvent({ type: 'play', timestamp: Date.now() });

    } catch (error) {
      console.error('🔊 LegacyAudioPlayer: Play failed:', error);
      this.emitEvent({ type: 'error', data: error, timestamp: Date.now() });
      throw error;
    }
  }

  pause(): void {
    if (!this.audioElement || !this.state.isPlaying) return;

    this.audioElement.pause();
    this.state.isPlaying = false;
    this.state.isPaused = true;
    this.emitEvent({ type: 'pause', timestamp: Date.now() });
  }

  stop(): void {
    if (!this.audioElement) return;

    this.audioElement.pause();
    this.audioElement.currentTime = 0;
    this.state.isPlaying = false;
    this.state.isPaused = false;
    this.state.currentTime = 0;
    this.emitEvent({ type: 'stop', timestamp: Date.now() });
  }

  async seek(time: number): Promise<void> {
    if (!this.audioElement) return;
    
    const clampedTime = Math.max(0, Math.min(time, this.state.duration));
    this.audioElement.currentTime = clampedTime;
    this.state.currentTime = clampedTime;
    this.emitEvent({ type: 'timeupdate', timestamp: Date.now() });
  }

  setVolume(volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.state.volume = clampedVolume;
    
    if (this.audioElement) {
      this.audioElement.volume = clampedVolume;
    }
  }

  getCurrentTime(): number {
    return this.audioElement?.currentTime || this.state.currentTime;
  }

  getState(): {
    isLoaded: boolean;
    isPlaying: boolean;
    isPaused: boolean;
    currentTime: number;
    duration: number;
    volume: number;
  } {
    return {
      ...this.state,
      currentTime: this.getCurrentTime()
    };
  }

  addEventListener(listener: (event: any) => void): void {
    this.eventListeners.push(listener);
  }

  removeEventListener(listener: (event: any) => void): void {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  async cleanup(): Promise<void> {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.removeAttribute('src');
      this.audioElement.load();
      this.audioElement = null;
    }
    
    if (this.audioUrl) {
      URL.revokeObjectURL(this.audioUrl);
      this.audioUrl = null;
    }
    
    this.state = {
      isLoaded: false,
      isPlaying: false,
      isPaused: false,
      currentTime: 0,
      duration: 0,
      volume: this.state.volume
    };
  }

  private setupAudioEventListeners(): void {
    if (!this.audioElement) return;

    this.audioElement.addEventListener('timeupdate', () => {
      this.state.currentTime = this.audioElement?.currentTime || 0;
      this.emitEvent({ type: 'timeupdate', timestamp: Date.now() });
    });

    this.audioElement.addEventListener('ended', () => {
      this.state.isPlaying = false;
      this.state.isPaused = false;
      this.state.currentTime = this.state.duration;
      this.emitEvent({ type: 'ended', timestamp: Date.now() });
    });

    this.audioElement.addEventListener('error', () => {
      const error = this.audioElement?.error || new Error('Audio playback error');
      this.emitEvent({ type: 'error', data: error, timestamp: Date.now() });
    });

    this.audioElement.addEventListener('pause', () => {
      if (!this.state.isPlaying) return; // Ignore programmatic pauses
      this.state.isPlaying = false;
      this.state.isPaused = true;
      this.emitEvent({ type: 'pause', timestamp: Date.now() });
    });

    this.audioElement.addEventListener('play', () => {
      this.state.isPlaying = true;
      this.state.isPaused = false;
      this.emitEvent({ type: 'play', timestamp: Date.now() });
    });
  }

  private emitEvent(event: any): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('LegacyAudioPlayer: Error in event listener:', error);
      }
    });
  }
}