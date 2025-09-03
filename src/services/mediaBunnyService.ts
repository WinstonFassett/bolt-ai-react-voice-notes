import { 
  Input, 
  Output, 
  ALL_FORMATS, 
  BlobSource, 
  BufferTarget,
  Mp4OutputFormat,
  WebMOutputFormat,
  WavOutputFormat,
  canEncode,
  canEncodeAudio,
  getFirstEncodableAudioCodec,
  type AudioCodec,
  type AudioEncodingConfig
} from 'mediabunny';

// Audio quality presets optimized for different use cases
export const AUDIO_PRESETS = {
  voice: {
    codec: 'opus' as AudioCodec,
    bitrate: 32000,
    sampleRate: 22050,
    numberOfChannels: 1
  },
  music: {
    codec: 'opus' as AudioCodec,
    bitrate: 128000,
    sampleRate: 48000,
    numberOfChannels: 2
  },
  highQuality: {
    codec: 'aac' as AudioCodec,
    bitrate: 256000,
    sampleRate: 48000,
    numberOfChannels: 2
  }
} as const;

export type AudioPreset = keyof typeof AUDIO_PRESETS;

// Browser compatibility helpers
export class MediaBunnyService {
  private static instance: MediaBunnyService;
  
  static getInstance(): MediaBunnyService {
    if (!MediaBunnyService.instance) {
      MediaBunnyService.instance = new MediaBunnyService();
    }
    return MediaBunnyService.instance;
  }

  /**
   * Check if Media Bunny is supported in the current browser
   */
  async isSupported(): Promise<boolean> {
    try {
      // Check for basic WebCodecs support
      if (!window.AudioEncoder || !window.AudioDecoder) {
        console.log('MediaBunnyService: WebCodecs not supported');
        return false;
      }
      
      // Check if we can encode at least one audio codec
      const supportedCodec = await getFirstEncodableAudioCodec(['opus', 'aac', 'mp3']);
      return supportedCodec !== null;
    } catch (error) {
      console.error('MediaBunnyService: Error checking support:', error);
      return false;
    }
  }

  /**
   * Get the best audio codec for the current browser and use case
   */
  async getBestAudioCodec(preset: AudioPreset = 'voice'): Promise<AudioCodec | null> {
    const config = AUDIO_PRESETS[preset];
    
    // Try the preferred codec first
    if (await canEncodeAudio(config.codec, config)) {
      return config.codec;
    }
    
    // Fall back to other codecs in order of preference
    const fallbackCodecs: AudioCodec[] = ['opus', 'aac', 'mp3'];
    return await getFirstEncodableAudioCodec(fallbackCodecs, config);
  }

  /**
   * Get metadata from an audio file
   */
  async getAudioMetadata(audioBlob: Blob): Promise<{
    duration: number;
    sampleRate: number;
    numberOfChannels: number;
    codec?: string;
  }> {
    const input = new Input({
      source: new BlobSource(audioBlob),
      formats: ALL_FORMATS,
    });

    try {
      const duration = await input.computeDuration();
      const audioTrack = await input.getPrimaryAudioTrack();
      
      return {
        duration,
        sampleRate: audioTrack.sampleRate,
        numberOfChannels: audioTrack.numberOfChannels,
        codec: audioTrack.codec
      };
    } finally {
      // Clean up resources
      input.close?.();
    }
  }

  /**
   * Convert audio to a specific format
   */
  async convertAudio(
    inputBlob: Blob, 
    outputFormat: 'mp4' | 'webm' | 'wav',
    preset: AudioPreset = 'voice'
  ): Promise<Blob> {
    const input = new Input({
      source: new BlobSource(inputBlob),
      formats: ALL_FORMATS,
    });

    // Select appropriate output format
    let format;
    switch (outputFormat) {
      case 'mp4':
        format = new Mp4OutputFormat();
        break;
      case 'webm':
        format = new WebMOutputFormat();
        break;
      case 'wav':
        format = new WavOutputFormat();
        break;
      default:
        throw new Error(`Unsupported output format: ${outputFormat}`);
    }

    const output = new Output({
      format,
      target: new BufferTarget(),
    });

    try {
      // Get the best codec for this format and browser
      const supportedCodecs = format.getSupportedAudioCodecs();
      const bestCodec = await getFirstEncodableAudioCodec(supportedCodecs);
      
      if (!bestCodec) {
        throw new Error(`No supported codec found for ${outputFormat} format`);
      }

      const config = {
        ...AUDIO_PRESETS[preset],
        codec: bestCodec
      };

      // Add audio track with the best codec
      const audioSource = input.getAudioSource(config);
      output.addAudioTrack(audioSource);

      await output.start();
      await output.finalize();

      const buffer = (output.target as BufferTarget).buffer;
      return new Blob([buffer], { type: format.mimeType });

    } finally {
      // Clean up resources
      input.close?.();
      output.close?.();
    }
  }

  /**
   * Get the optimal format for the current browser
   */
  async getOptimalFormat(): Promise<'mp4' | 'webm' | 'wav'> {
    // Check browser capabilities
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    
    console.log('🍎 iOS Format Detection:', {
      userAgent: navigator.userAgent,
      isIOS,
      isSafari,
      webCodecsSupported: !!(window.AudioEncoder && window.AudioDecoder)
    });
    
    if (isIOS || isSafari) {
      // iOS/Safari prefer MP4
      const aacSupported = await canEncodeAudio('aac');
      console.log('🍎 iOS AAC Support:', aacSupported);
      
      if (aacSupported) {
        console.log('✅ iOS will use MP4/AAC - optimal format!');
        return 'mp4';
      }
      console.warn('⚠️ iOS falling back to WAV - AAC not supported');
      return 'wav'; // Fallback
    }
    
    // Modern browsers prefer WebM with Opus
    if (await canEncodeAudio('opus')) {
      console.log('✅ Desktop using WebM/Opus');
      return 'webm';
    }
    
    // Fallback to MP4 with AAC
    if (await canEncodeAudio('aac')) {
      console.log('✅ Desktop using MP4/AAC fallback');
      return 'mp4';
    }
    
    console.warn('⚠️ Desktop falling back to WAV');
    return 'wav';
  }

  /**
   * Validate an audio file can be processed
   */
  async validateAudioFile(audioBlob: Blob): Promise<boolean> {
    try {
      const metadata = await this.getAudioMetadata(audioBlob);
      return metadata.duration > 0 && metadata.sampleRate > 0;
    } catch (error) {
      console.error('MediaBunnyService: Error validating audio file:', error);
      return false;
    }
  }

  /**
   * Get browser audio capabilities
   */
  async getBrowserCapabilities(): Promise<{
    supportedCodecs: AudioCodec[];
    preferredFormat: string;
    webCodecsSupported: boolean;
  }> {
    const webCodecsSupported = !!(window.AudioEncoder && window.AudioDecoder);
    
    // Test common codecs
    const codecs: AudioCodec[] = ['opus', 'aac', 'mp3', 'flac', 'pcm-s16'];
    const supportedCodecs: AudioCodec[] = [];
    
    for (const codec of codecs) {
      if (await canEncode(codec)) {
        supportedCodecs.push(codec);
      }
    }
    
    const preferredFormat = await this.getOptimalFormat();
    
    return {
      supportedCodecs,
      preferredFormat,
      webCodecsSupported
    };
  }
}

// Export singleton instance
export const mediaBunnyService = MediaBunnyService.getInstance();