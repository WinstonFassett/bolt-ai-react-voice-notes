import { MediaBunnyAudioRecorder } from './audioRecorder';
import { useFeatureFlagsStore } from '../stores/featureFlagsStore';
import { mediaBunnyService } from './mediaBunnyService';

// Re-export the legacy recording logic for fallback
interface LegacyRecorderOptions {
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
  channelCount?: number;
  sampleRate?: number;
  audioBitsPerSecond?: number;
}

export interface HybridRecordingResult {
  audioBlob: Blob;
  duration: number;
  format: string;
  usingMediaBunny: boolean;
  metadata?: any;
}

/**
 * Hybrid audio recorder that automatically chooses between Media Bunny and legacy implementation
 */
export class HybridAudioRecorder {
  private mediaBunnyRecorder: MediaBunnyAudioRecorder | null = null;
  private legacyRecorder: LegacyAudioRecorder | null = null;
  private usingMediaBunny = false;
  private isRecording = false;

  constructor(private options: LegacyRecorderOptions = {}) {}

  /**
   * Initialize the appropriate recorder based on feature flags and browser support
   */
  async initialize(): Promise<void> {
    const featureFlags = useFeatureFlagsStore.getState();
    
    // Check if we should use Media Bunny
    if (featureFlags.shouldUseMediaBunny('recording')) {
      try {
        // Test if Media Bunny is supported
        const isSupported = await mediaBunnyService.isSupported();
        if (isSupported) {
          console.log('🎙️ HybridAudioRecorder: Using Media Bunny implementation');
          this.mediaBunnyRecorder = new MediaBunnyAudioRecorder({
            preset: 'voice',
            format: 'auto',
            echoCancellation: this.options.echoCancellation,
            noiseSuppression: this.options.noiseSuppression,
            autoGainControl: this.options.autoGainControl
          });
          
          await this.mediaBunnyRecorder.initialize();
          this.usingMediaBunny = true;
          return;
        }
      } catch (error) {
        console.warn('🎙️ HybridAudioRecorder: Media Bunny initialization failed, falling back to legacy:', error);
      }
    }

    // Fall back to legacy implementation
    console.log('🎙️ HybridAudioRecorder: Using legacy implementation');
    this.legacyRecorder = new LegacyAudioRecorder(this.options);
    await this.legacyRecorder.initialize();
    this.usingMediaBunny = false;
  }

  /**
   * Start recording
   */
  async startRecording(): Promise<void> {
    if (!this.mediaBunnyRecorder && !this.legacyRecorder) {
      await this.initialize();
    }

    this.isRecording = true;

    if (this.usingMediaBunny && this.mediaBunnyRecorder) {
      await this.mediaBunnyRecorder.startRecording();
    } else if (this.legacyRecorder) {
      await this.legacyRecorder.startRecording();
    } else {
      throw new Error('No recorder available');
    }
  }

  /**
   * Stop recording
   */
  async stopRecording(): Promise<HybridRecordingResult> {
    if (!this.isRecording) {
      throw new Error('No recording in progress');
    }

    this.isRecording = false;

    if (this.usingMediaBunny && this.mediaBunnyRecorder) {
      const audioBlob = await this.mediaBunnyRecorder.stopRecording();
      const state = this.mediaBunnyRecorder.getState();
      
      return {
        audioBlob,
        duration: state.duration,
        format: state.config?.format || 'unknown',
        usingMediaBunny: true,
        metadata: state.config
      };
    } else if (this.legacyRecorder) {
      const result = await this.legacyRecorder.stopRecording();
      return {
        ...result,
        usingMediaBunny: false
      };
    } else {
      throw new Error('No recorder available');
    }
  }

  /**
   * Pause recording
   */
  async pauseRecording(): Promise<void> {
    if (this.usingMediaBunny && this.mediaBunnyRecorder) {
      await this.mediaBunnyRecorder.pauseRecording();
    } else if (this.legacyRecorder) {
      await this.legacyRecorder.pauseRecording();
    }
  }

  /**
   * Resume recording
   */
  async resumeRecording(): Promise<void> {
    if (this.usingMediaBunny && this.mediaBunnyRecorder) {
      await this.mediaBunnyRecorder.resumeRecording();
    } else if (this.legacyRecorder) {
      await this.legacyRecorder.resumeRecording();
    }
  }

  /**
   * Cancel recording
   */
  async cancelRecording(): Promise<void> {
    this.isRecording = false;

    if (this.usingMediaBunny && this.mediaBunnyRecorder) {
      await this.mediaBunnyRecorder.cancelRecording();
    } else if (this.legacyRecorder) {
      await this.legacyRecorder.cancelRecording();
    }
  }

  /**
   * Get current recording duration
   */
  getRecordingDuration(): number {
    if (this.usingMediaBunny && this.mediaBunnyRecorder) {
      return this.mediaBunnyRecorder.getRecordingDuration();
    } else if (this.legacyRecorder) {
      return this.legacyRecorder.getRecordingDuration();
    }
    return 0;
  }

  /**
   * Get recording state
   */
  getState(): {
    isRecording: boolean;
    isPaused: boolean;
    duration: number;
    usingMediaBunny: boolean;
  } {
    let isPaused = false;

    if (this.usingMediaBunny && this.mediaBunnyRecorder) {
      const state = this.mediaBunnyRecorder.getState();
      isPaused = state.isPaused;
    } else if (this.legacyRecorder) {
      isPaused = this.legacyRecorder.isPaused();
    }

    return {
      isRecording: this.isRecording,
      isPaused,
      duration: this.getRecordingDuration(),
      usingMediaBunny: this.usingMediaBunny
    };
  }

  /**
   * Add event listener for recording events
   */
  addEventListener(listener: (event: any) => void): void {
    if (this.usingMediaBunny && this.mediaBunnyRecorder) {
      this.mediaBunnyRecorder.addEventListener(listener);
    } else if (this.legacyRecorder) {
      this.legacyRecorder.addEventListener(listener);
    }
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: (event: any) => void): void {
    if (this.usingMediaBunny && this.mediaBunnyRecorder) {
      this.mediaBunnyRecorder.removeEventListener(listener);
    } else if (this.legacyRecorder) {
      this.legacyRecorder.removeEventListener(listener);
    }
  }
}

/**
 * Legacy audio recorder implementation (extracted from recordingStore.ts)
 */
class LegacyAudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  private recordedChunks: Blob[] = [];
  private isRecording = false;
  private isPaused = false;
  private recordingStartTime = 0;
  private pausedDuration = 0;
  private pauseStartTime = 0;
  private eventListeners: Array<(event: any) => void> = [];

  constructor(private options: LegacyRecorderOptions = {}) {}

  async initialize(): Promise<void> {
    // Legacy initialization logic is handled in startRecording
    // This is for interface compatibility
  }

  async startRecording(): Promise<void> {
    if (this.isRecording) {
      throw new Error('Recording already in progress');
    }

    try {
      // Get audio stream with legacy settings
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      
      if (!navigator.mediaDevices) {
        throw new Error('Media recording is not supported in this browser');
      }
      
      this.audioStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: this.options.echoCancellation ?? true,
          noiseSuppression: this.options.noiseSuppression ?? true,
          autoGainControl: this.options.autoGainControl ?? true,
          channelCount: this.options.channelCount ?? 1,
          sampleRate: this.options.sampleRate ?? 22050
        } 
      });
      
      // Set up MediaRecorder with compatibility options
      let mediaRecorderOptions: MediaRecorderOptions = {
        audioBitsPerSecond: this.options.audioBitsPerSecond ?? 16000
      };
      
      if (isIOS || isSafari) {
        if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mediaRecorderOptions.mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/aac')) {
          mediaRecorderOptions.mimeType = 'audio/aac';
        } else if (MediaRecorder.isTypeSupported('audio/wav')) {
          mediaRecorderOptions.mimeType = 'audio/wav';
        }
      } else {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mediaRecorderOptions.mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mediaRecorderOptions.mimeType = 'audio/webm';
        }
      }
      
      this.mediaRecorder = new MediaRecorder(this.audioStream, mediaRecorderOptions);
      
      this.mediaRecorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      });
      
      this.mediaRecorder.start(500);
      
      this.recordingStartTime = Date.now();
      this.pausedDuration = 0;
      this.pauseStartTime = 0;
      this.isRecording = true;
      this.isPaused = false;
      
      this.emitEvent({ type: 'start', timestamp: Date.now() });
      
    } catch (error) {
      this.cleanup();
      throw error;
    }
  }

  async stopRecording(): Promise<{ audioBlob: Blob; duration: number; format: string }> {
    if (!this.isRecording) {
      throw new Error('No recording in progress');
    }

    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No media recorder available'));
        return;
      }

      this.mediaRecorder.addEventListener('stop', () => {
        try {
          const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
          const audioBlob = new Blob(this.recordedChunks, { type: mimeType });
          const duration = this.getRecordingDuration();
          
          this.emitEvent({ type: 'stop', data: { audioBlob, duration }, timestamp: Date.now() });
          
          resolve({
            audioBlob,
            duration,
            format: mimeType
          });
        } catch (error) {
          reject(error);
        } finally {
          this.cleanup();
        }
      });

      this.mediaRecorder.stop();
      this.isRecording = false;
    });
  }

  async pauseRecording(): Promise<void> {
    if (!this.isRecording || this.isPaused || !this.mediaRecorder) {
      return;
    }

    if (typeof this.mediaRecorder.pause === 'function') {
      this.mediaRecorder.pause();
    }
    
    this.isPaused = true;
    this.pauseStartTime = Date.now();
    this.emitEvent({ type: 'pause', timestamp: Date.now() });
  }

  async resumeRecording(): Promise<void> {
    if (!this.isRecording || !this.isPaused || !this.mediaRecorder) {
      return;
    }

    if (typeof this.mediaRecorder.resume === 'function') {
      this.mediaRecorder.resume();
    }
    
    const pauseDuration = Date.now() - this.pauseStartTime;
    this.pausedDuration += pauseDuration;
    this.pauseStartTime = 0;
    this.isPaused = false;
    this.emitEvent({ type: 'resume', timestamp: Date.now() });
  }

  async cancelRecording(): Promise<void> {
    if (this.mediaRecorder) {
      this.mediaRecorder.stop();
    }
    this.cleanup();
    this.emitEvent({ type: 'cancel', timestamp: Date.now() });
  }

  getRecordingDuration(): number {
    if (!this.isRecording) return 0;
    
    const now = Date.now();
    const totalTime = now - this.recordingStartTime;
    const currentPauseDuration = this.isPaused ? (now - this.pauseStartTime) : 0;
    const actualRecordingTime = totalTime - this.pausedDuration - currentPauseDuration;
    
    return Math.floor(actualRecordingTime / 1000);
  }

  isPaused(): boolean {
    return this.isPaused;
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

  private emitEvent(event: any): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('LegacyAudioRecorder: Error in event listener:', error);
      }
    });
  }

  private cleanup(): void {
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
      this.audioStream = null;
    }
    
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.isRecording = false;
    this.isPaused = false;
  }
}