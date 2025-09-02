import { 
  Input, 
  ALL_FORMATS, 
  BlobSource,
  type AudioTrack
} from 'mediabunny';
import { mediaBunnyService } from './mediaBunnyService';
import type { AudioMetadata, MediaBunnyError, MediaBunnyErrorType } from '../types/mediaBunny';

export interface PlaybackOptions {
  autoplay?: boolean;
  loop?: boolean;
  volume?: number;
  startTime?: number;
  preload?: 'none' | 'metadata' | 'auto';
}

export interface PlaybackEvent {
  type: 'loadstart' | 'loadedmetadata' | 'loadeddata' | 'canplay' | 'play' | 'pause' | 'ended' | 'timeupdate' | 'error';
  data?: any;
  timestamp: number;
}

export interface PlaybackState {
  isLoaded: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  metadata: AudioMetadata | null;
}

export class MediaBunnyAudioPlayer {
  private input: Input | null = null;
  private audioTrack: AudioTrack | null = null;
  private audioContext: AudioContext | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  
  private state: PlaybackState = {
    isLoaded: false,
    isPlaying: false,
    isPaused: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    metadata: null
  };
  
  private eventListeners: Array<(event: PlaybackEvent) => void> = [];
  private timeUpdateInterval: number | null = null;
  private startTime = 0;
  private pauseTime = 0;

  constructor(private options: PlaybackOptions = {}) {
    this.state.volume = options.volume ?? 1;
  }

  /**
   * Load audio from blob
   */
  async loadAudio(audioBlob: Blob): Promise<void> {
    try {
      await this.cleanup();
      
      // Create Media Bunny input
      this.input = new Input({
        source: new BlobSource(audioBlob),
        formats: ALL_FORMATS,
      });

      // Get audio metadata
      const duration = await this.input.computeDuration();
      this.audioTrack = await this.input.getPrimaryAudioTrack();
      
      this.state.metadata = {
        duration,
        sampleRate: this.audioTrack.sampleRate,
        numberOfChannels: this.audioTrack.numberOfChannels,
        codec: this.audioTrack.codec
      };
      
      this.state.duration = duration;
      
      this.emitEvent({ type: 'loadedmetadata', data: this.state.metadata, timestamp: Date.now() });
      
      // Initialize audio context if needed
      await this.initializeAudioContext();
      
      // Decode audio data for playback
      await this.decodeAudioData();
      
      this.state.isLoaded = true;
      this.emitEvent({ type: 'loadeddata', timestamp: Date.now() });
      this.emitEvent({ type: 'canplay', timestamp: Date.now() });

      console.log('MediaBunnyAudioPlayer: Audio loaded successfully', this.state.metadata);

      // Auto-play if requested
      if (this.options.autoplay) {
        await this.play();
      }

    } catch (error) {
      console.error('MediaBunnyAudioPlayer: Failed to load audio:', error);
      this.emitEvent({ 
        type: 'error', 
        data: this.createError('INITIALIZATION_FAILED', `Failed to load audio: ${error}`),
        timestamp: Date.now() 
      });
      throw error;
    }
  }

  /**
   * Start playback
   */
  async play(startTime?: number): Promise<void> {
    if (!this.state.isLoaded || !this.audioBuffer) {
      throw this.createError('INITIALIZATION_FAILED', 'Audio not loaded');
    }

    try {
      // Handle user interaction requirement for audio context
      if (this.audioContext?.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Stop any current playback
      if (this.sourceNode) {
        this.sourceNode.stop();
        this.sourceNode.disconnect();
      }

      // Create new source node
      this.sourceNode = this.audioContext!.createBufferSource();
      this.sourceNode.buffer = this.audioBuffer;
      
      // Connect to gain node for volume control
      if (!this.gainNode) {
        this.gainNode = this.audioContext!.createGain();
        this.gainNode.connect(this.audioContext!.destination);
      }
      
      this.sourceNode.connect(this.gainNode);
      this.gainNode.gain.value = this.state.volume;

      // Set up event listeners
      this.sourceNode.onended = () => {
        this.handlePlaybackEnd();
      };

      // Calculate start position
      const playStartTime = startTime ?? (this.state.isPaused ? this.pauseTime : 0);
      this.startTime = this.audioContext!.currentTime - playStartTime;
      
      // Start playback
      this.sourceNode.start(0, playStartTime);
      
      this.state.isPlaying = true;
      this.state.isPaused = false;
      this.state.currentTime = playStartTime;
      
      this.startTimeUpdates();
      this.emitEvent({ type: 'play', timestamp: Date.now() });
      
      console.log('MediaBunnyAudioPlayer: Playback started at', playStartTime);

    } catch (error) {
      console.error('MediaBunnyAudioPlayer: Failed to start playback:', error);
      this.emitEvent({ 
        type: 'error', 
        data: this.createError('INITIALIZATION_FAILED', `Playback failed: ${error}`),
        timestamp: Date.now() 
      });
      throw error;
    }
  }

  /**
   * Pause playback
   */
  pause(): void {
    if (!this.state.isPlaying) return;

    if (this.sourceNode) {
      this.sourceNode.stop();
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    this.pauseTime = this.getCurrentTime();
    this.state.isPlaying = false;
    this.state.isPaused = true;
    this.state.currentTime = this.pauseTime;
    
    this.stopTimeUpdates();
    this.emitEvent({ type: 'pause', timestamp: Date.now() });
    
    console.log('MediaBunnyAudioPlayer: Playback paused at', this.pauseTime);
  }

  /**
   * Stop playback
   */
  stop(): void {
    if (this.sourceNode) {
      this.sourceNode.stop();
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    this.state.isPlaying = false;
    this.state.isPaused = false;
    this.state.currentTime = 0;
    this.pauseTime = 0;
    this.startTime = 0;
    
    this.stopTimeUpdates();
    console.log('MediaBunnyAudioPlayer: Playback stopped');
  }

  /**
   * Seek to specific time
   */
  async seek(time: number): Promise<void> {
    if (!this.state.isLoaded) return;
    
    const clampedTime = Math.max(0, Math.min(time, this.state.duration));
    
    if (this.state.isPlaying) {
      // If playing, restart from new position
      await this.play(clampedTime);
    } else {
      // If paused or stopped, just update the position
      this.pauseTime = clampedTime;
      this.state.currentTime = clampedTime;
      this.emitEvent({ type: 'timeupdate', timestamp: Date.now() });
    }
    
    console.log('MediaBunnyAudioPlayer: Seeked to', clampedTime);
  }

  /**
   * Set volume (0-1)
   */
  setVolume(volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.state.volume = clampedVolume;
    
    if (this.gainNode) {
      this.gainNode.gain.value = clampedVolume;
    }
  }

  /**
   * Get current playback time
   */
  getCurrentTime(): number {
    if (!this.audioContext || !this.state.isPlaying) {
      return this.state.currentTime;
    }
    
    return Math.min(
      this.audioContext.currentTime - this.startTime,
      this.state.duration
    );
  }

  /**
   * Get playback state
   */
  getState(): PlaybackState {
    return {
      ...this.state,
      currentTime: this.getCurrentTime()
    };
  }

  /**
   * Add event listener
   */
  addEventListener(listener: (event: PlaybackEvent) => void): void {
    this.eventListeners.push(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: (event: PlaybackEvent) => void): void {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    this.stop();
    
    if (this.input) {
      this.input.close?.();
      this.input = null;
    }
    
    this.audioTrack = null;
    this.audioBuffer = null;
    
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
    
    // Don't close the audio context as it might be shared
    
    this.state = {
      isLoaded: false,
      isPlaying: false,
      isPaused: false,
      currentTime: 0,
      duration: 0,
      volume: this.state.volume,
      metadata: null
    };
  }

  // Private methods

  private async initializeAudioContext(): Promise<void> {
    if (this.audioContext) return;
    
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: this.audioTrack?.sampleRate || 44100
    });
    
    // Handle browser autoplay policies
    if (this.audioContext.state === 'suspended') {
      console.log('MediaBunnyAudioPlayer: AudioContext suspended, will resume on user interaction');
    }
  }

  private async decodeAudioData(): Promise<void> {
    if (!this.input || !this.audioContext) return;
    
    try {
      // This is a simplified approach - in reality, we'd need to extract
      // raw audio data from Media Bunny's Input and decode it
      // For now, this is a placeholder that would need Media Bunny's
      // audio data extraction capabilities
      
      console.log('MediaBunnyAudioPlayer: Audio decoding would happen here');
      
      // Placeholder: Create a silent buffer for now
      this.audioBuffer = this.audioContext.createBuffer(
        this.audioTrack!.numberOfChannels,
        this.audioContext.sampleRate * this.state.duration,
        this.audioContext.sampleRate
      );
      
    } catch (error) {
      console.error('MediaBunnyAudioPlayer: Failed to decode audio data:', error);
      throw error;
    }
  }

  private handlePlaybackEnd(): void {
    if (this.options.loop) {
      this.play(0);
    } else {
      this.state.isPlaying = false;
      this.state.isPaused = false;
      this.state.currentTime = this.state.duration;
      this.stopTimeUpdates();
      this.emitEvent({ type: 'ended', timestamp: Date.now() });
    }
  }

  private startTimeUpdates(): void {
    this.stopTimeUpdates();
    this.timeUpdateInterval = window.setInterval(() => {
      this.state.currentTime = this.getCurrentTime();
      this.emitEvent({ type: 'timeupdate', timestamp: Date.now() });
    }, 100); // Update every 100ms
  }

  private stopTimeUpdates(): void {
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
      this.timeUpdateInterval = null;
    }
  }

  private emitEvent(event: PlaybackEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('MediaBunnyAudioPlayer: Error in event listener:', error);
      }
    });
  }

  private createError(type: MediaBunnyErrorType, message: string): MediaBunnyError {
    const error = new Error(message) as MediaBunnyError;
    error.type = type;
    return error;
  }
}