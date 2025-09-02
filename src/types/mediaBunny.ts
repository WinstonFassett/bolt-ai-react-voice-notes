import type { AudioCodec, AudioEncodingConfig } from 'mediabunny';

// Extended audio configuration for our use case
export interface ExtendedAudioConfig extends AudioEncodingConfig {
  preset?: 'voice' | 'music' | 'highQuality';
  format?: 'mp4' | 'webm' | 'wav';
}

// Recording state specific to Media Bunny
export interface MediaBunnyRecordingState {
  isInitialized: boolean;
  currentFormat: 'mp4' | 'webm' | 'wav';
  currentCodec: AudioCodec | null;
  supportedCodecs: AudioCodec[];
  recordingQuality: 'voice' | 'music' | 'highQuality';
}

// Playback state specific to Media Bunny
export interface MediaBunnyPlaybackState {
  inputInstance: any | null; // Media Bunny Input instance
  audioMetadata: AudioMetadata | null;
  isStreamingSupported: boolean;
}

// Audio metadata extracted by Media Bunny
export interface AudioMetadata {
  duration: number;
  sampleRate: number;
  numberOfChannels: number;
  codec?: string;
  bitrate?: number;
  format?: string;
}

// Media Bunny service capabilities
export interface MediaBunnyCapabilities {
  isSupported: boolean;
  supportedCodecs: AudioCodec[];
  preferredFormat: string;
  webCodecsSupported: boolean;
  hardwareAcceleration: boolean;
}

// Conversion options
export interface ConversionOptions {
  inputFormat: string;
  outputFormat: 'mp4' | 'webm' | 'wav';
  quality: 'voice' | 'music' | 'highQuality';
  preserveMetadata: boolean;
}

// Error types for Media Bunny operations
export enum MediaBunnyErrorType {
  NOT_SUPPORTED = 'NOT_SUPPORTED',
  CODEC_NOT_AVAILABLE = 'CODEC_NOT_AVAILABLE',
  CONVERSION_FAILED = 'CONVERSION_FAILED',
  INVALID_FORMAT = 'INVALID_FORMAT',
  INITIALIZATION_FAILED = 'INITIALIZATION_FAILED'
}

export interface MediaBunnyError extends Error {
  type: MediaBunnyErrorType;
  details?: any;
}

// Feature flags for gradual rollout
export interface MediaBunnyFeatureFlags {
  useMediaBunnyRecording: boolean;
  useMediaBunnyPlayback: boolean;
  useMediaBunnyStorage: boolean;
  enableAudioTesting: boolean;
  enableAdvancedFeatures: boolean;
}