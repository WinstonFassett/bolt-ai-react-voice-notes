import { 
  Output, 
  BufferTarget, 
  Mp4OutputFormat, 
  WebMOutputFormat,
  WavOutputFormat,
  type AudioEncodingConfig,
  type AudioCodec
} from 'mediabunny';
import { mediaBunnyService, AUDIO_PRESETS, type AudioPreset } from './mediaBunnyService';
import type { ExtendedAudioConfig, MediaBunnyError, MediaBunnyErrorType } from '../types/mediaBunny';

export interface RecordingOptions {
  preset?: AudioPreset;
  format?: 'auto' | 'mp4' | 'webm' | 'wav';
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
}

export interface RecordingEvent {
  type: 'start' | 'stop' | 'pause' | 'resume' | 'data' | 'error';
  data?: any;
  timestamp: number;
}

export class MediaBunnyAudioRecorder {
  private output: Output | null = null;
  private audioStream: MediaStream | null = null;
  private audioSource: any | null = null;
  private isRecording = false;
  private isPaused = false;
  private recordingStartTime = 0;
  private pausedDuration = 0;
  private pauseStartTime = 0;
  private eventListeners: Array<(event: RecordingEvent) => void> = [];
  private recordingConfig: ExtendedAudioConfig | null = null;

  constructor(private options: RecordingOptions = {}) {}

  /**
   * Initialize the recorder with optimal settings
   */
  async initialize(): Promise<void> {
    try {
      const isSupported = await mediaBunnyService.isSupported();
      if (!isSupported) {
        throw this.createError(
          'INITIALIZATION_FAILED',
          'Media Bunny is not supported in this browser'
        );
      }

      // Get optimal format and codec
      const format = this.options.format === 'auto' || !this.options.format 
        ? await mediaBunnyService.getOptimalFormat()
        : this.options.format;

      const preset = this.options.preset || 'voice';
      const codec = await mediaBunnyService.getBestAudioCodec(preset);

      if (!codec) {
        throw this.createError(
          'CODEC_NOT_AVAILABLE',
          `No supported codec found for ${format} format`
        );
      }

      // Create recording configuration
      this.recordingConfig = {
        ...AUDIO_PRESETS[preset],
        codec,
        preset,
        format
      };

      console.log('MediaBunnyAudioRecorder: Initialized with config:', this.recordingConfig);
    } catch (error) {
      console.error('MediaBunnyAudioRecorder: Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Start recording with Media Bunny
   */
  async startRecording(): Promise<void> {
    if (this.isRecording) {
      throw this.createError('INITIALIZATION_FAILED', 'Recording already in progress');
    }

    if (!this.recordingConfig) {
      await this.initialize();
    }

    try {
      // Get user media with optimized constraints
      this.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: this.options.echoCancellation ?? true,
          noiseSuppression: this.options.noiseSuppression ?? true,
          autoGainControl: this.options.autoGainControl ?? true,
          channelCount: this.recordingConfig!.numberOfChannels,
          sampleRate: this.recordingConfig!.sampleRate
        }
      });

      // Create appropriate output format
      let outputFormat;
      switch (this.recordingConfig!.format) {
        case 'mp4':
          outputFormat = new Mp4OutputFormat();
          break;
        case 'webm':
          outputFormat = new WebMOutputFormat();
          break;
        case 'wav':
          outputFormat = new WavOutputFormat();
          break;
        default:
          throw this.createError('INVALID_FORMAT', `Unsupported format: ${this.recordingConfig!.format}`);
      }

      // Create Media Bunny output
      this.output = new Output({
        format: outputFormat,
        target: new BufferTarget()
      });

      // Create audio source from stream
      // Note: This would need Media Bunny's stream source implementation
      // For now, we'll use a placeholder that needs to be implemented
      this.audioSource = await this.createAudioSourceFromStream(
        this.audioStream, 
        this.recordingConfig!
      );

      this.output.addAudioTrack(this.audioSource);
      await this.output.start();

      // Track timing
      this.recordingStartTime = Date.now();
      this.pausedDuration = 0;
      this.pauseStartTime = 0;
      this.isRecording = true;
      this.isPaused = false;

      this.emitEvent({ type: 'start', timestamp: Date.now() });
      console.log('MediaBunnyAudioRecorder: Recording started');

    } catch (error) {
      console.error('MediaBunnyAudioRecorder: Failed to start recording:', error);
      await this.cleanup();
      throw error;
    }
  }

  /**
   * Stop recording and return the audio blob
   */
  async stopRecording(): Promise<Blob> {
    if (!this.isRecording) {
      throw this.createError('INITIALIZATION_FAILED', 'No recording in progress');
    }

    try {
      if (this.output) {
        await this.output.finalize();
        const buffer = (this.output.target as BufferTarget).buffer;
        const mimeType = this.getMimeTypeForFormat(this.recordingConfig!.format!);
        const blob = new Blob([buffer], { type: mimeType });

        this.emitEvent({ 
          type: 'stop', 
          data: { blob, duration: this.getRecordingDuration() },
          timestamp: Date.now() 
        });

        console.log('MediaBunnyAudioRecorder: Recording stopped, blob size:', blob.size);
        return blob;
      }

      throw this.createError('INITIALIZATION_FAILED', 'No output available');

    } finally {
      await this.cleanup();
    }
  }

  /**
   * Pause recording
   */
  async pauseRecording(): Promise<void> {
    if (!this.isRecording || this.isPaused) {
      return;
    }

    this.isPaused = true;
    this.pauseStartTime = Date.now();
    
    // Media Bunny doesn't have direct pause/resume, so we'd need to implement
    // this by stopping and restarting the recording while maintaining state
    // This is a placeholder for the actual implementation
    
    this.emitEvent({ type: 'pause', timestamp: Date.now() });
    console.log('MediaBunnyAudioRecorder: Recording paused');
  }

  /**
   * Resume recording
   */
  async resumeRecording(): Promise<void> {
    if (!this.isRecording || !this.isPaused) {
      return;
    }

    const pauseDuration = Date.now() - this.pauseStartTime;
    this.pausedDuration += pauseDuration;
    this.pauseStartTime = 0;
    this.isPaused = false;
    
    this.emitEvent({ type: 'resume', timestamp: Date.now() });
    console.log('MediaBunnyAudioRecorder: Recording resumed');
  }

  /**
   * Cancel recording
   */
  async cancelRecording(): Promise<void> {
    if (this.isRecording) {
      await this.cleanup();
      this.emitEvent({ type: 'stop', timestamp: Date.now() });
      console.log('MediaBunnyAudioRecorder: Recording cancelled');
    }
  }

  /**
   * Get current recording duration in seconds
   */
  getRecordingDuration(): number {
    if (!this.isRecording) return 0;
    
    const now = Date.now();
    const totalTime = now - this.recordingStartTime;
    const currentPauseDuration = this.isPaused ? (now - this.pauseStartTime) : 0;
    const actualRecordingTime = totalTime - this.pausedDuration - currentPauseDuration;
    
    return Math.floor(actualRecordingTime / 1000);
  }

  /**
   * Add event listener
   */
  addEventListener(listener: (event: RecordingEvent) => void): void {
    this.eventListeners.push(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: (event: RecordingEvent) => void): void {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  /**
   * Get current recording state
   */
  getState(): {
    isRecording: boolean;
    isPaused: boolean;
    duration: number;
    config: ExtendedAudioConfig | null;
  } {
    return {
      isRecording: this.isRecording,
      isPaused: this.isPaused,
      duration: this.getRecordingDuration(),
      config: this.recordingConfig
    };
  }

  // Private methods

  private emitEvent(event: RecordingEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('MediaBunnyAudioRecorder: Error in event listener:', error);
      }
    });
  }

  private createError(type: MediaBunnyErrorType, message: string): MediaBunnyError {
    const error = new Error(message) as MediaBunnyError;
    error.type = type;
    return error;
  }

  private getMimeTypeForFormat(format: string): string {
    switch (format) {
      case 'mp4': return 'audio/mp4';
      case 'webm': return 'audio/webm';
      case 'wav': return 'audio/wav';
      default: return 'audio/webm';
    }
  }

  private async createAudioSourceFromStream(
    stream: MediaStream, 
    config: AudioEncodingConfig
  ): Promise<any> {
    // Media Bunny doesn't have direct MediaStream support yet
    // This is a limitation we need to work around by using MediaRecorder
    // to capture the stream data and then process it with Media Bunny
    
    // For now, we'll throw an error to indicate fallback to legacy should be used
    throw new Error('Stream-based audio source not yet implemented for Media Bunny - falling back to legacy');
  }

  private async cleanup(): Promise<void> {
    this.isRecording = false;
    this.isPaused = false;

    if (this.output) {
      try {
        this.output.close?.();
      } catch (error) {
        console.warn('MediaBunnyAudioRecorder: Error closing output:', error);
      }
      this.output = null;
    }

    if (this.audioSource) {
      try {
        this.audioSource.close?.();
      } catch (error) {
        console.warn('MediaBunnyAudioRecorder: Error closing audio source:', error);
      }
      this.audioSource = null;
    }

    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
      this.audioStream = null;
    }
  }
}