/**
 * Audio Optimization Service
 * 
 * Handles audio compression and optimization to reduce file sizes
 * and prevent memory issues on iOS devices.
 */

import { reportError } from './errorReporting';
import { Note } from '../stores/notesStore';
import { resolveStorageUrl } from '../utils/audioStorage';

// Size thresholds in bytes
export const LARGE_AUDIO_THRESHOLD = 20 * 1024 * 1024; // 20MB
export const OPTIMAL_BITRATE = 64000; // 64 kbps - good for speech

/**
 * Information about an audio file
 */
export interface AudioFileInfo {
  noteId: string;
  title: string;
  size: number;
  duration: number; // in seconds
  bitrate: number; // in bits per second
  format: string;
  url: string;
}

/**
 * Check if an audio file needs optimization
 */
export function needsOptimization(info: AudioFileInfo): boolean {
  // Files over threshold or with high bitrate need optimization
  return info.size > LARGE_AUDIO_THRESHOLD || info.bitrate > OPTIMAL_BITRATE * 1.5;
}

/**
 * Calculate potential space savings from optimization
 */
export function calculatePotentialSavings(info: AudioFileInfo): number {
  // Estimate size after optimization
  const optimalSize = (info.duration * OPTIMAL_BITRATE) / 8; // Convert bits to bytes
  const savings = Math.max(0, info.size - optimalSize);
  return savings;
}

/**
 * Get audio file information for a note
 */
export async function getAudioFileInfo(note: Note): Promise<AudioFileInfo | null> {
  if (!note.audioUrl) return null;
  
  try {
    // Resolve the storage URL to a blob URL
    const resolvedAudio = await resolveStorageUrl(note.audioUrl);
    if (!resolvedAudio) {
      throw new Error(`Failed to resolve audio URL: ${note.audioUrl}`);
    }
    
    // Fetch the audio using the resolved URL
    const response = await fetch(resolvedAudio.url, { method: 'HEAD' });
    if (!response.ok) throw new Error(`Failed to fetch audio: ${response.statusText}`);
    
    // Get size from headers
    const size = parseInt(response.headers.get('content-length') || '0', 10);
    
    // Get duration and format by loading a small portion of the audio
    const audioElement = document.createElement('audio');
    audioElement.src = resolvedAudio.url;
    
    const duration = await new Promise<number>((resolve) => {
      audioElement.addEventListener('loadedmetadata', () => {
        resolve(audioElement.duration);
      });
      
      // Handle errors
      audioElement.addEventListener('error', () => {
        console.error('Error loading audio metadata');
        resolve(0);
      });
      
      // Set timeout in case it never loads
      setTimeout(() => resolve(0), 5000);
    });
    
    // Calculate bitrate
    const bitrate = duration > 0 ? (size * 8) / duration : 0;
    
    // Get format from MIME type
    const format = resolvedAudio.mimeType.split('/')[1] || 'unknown';
    
    return {
      noteId: note.id,
      title: note.title || 'Untitled',
      size,
      duration,
      bitrate,
      format,
      url: resolvedAudio.url
    };
  } catch (error) {
    reportError(error as Error, { context: 'getAudioFileInfo', noteId: note.id });
    return null;
  }
}

/**
 * List all audio files with their information
 * This is now on-demand rather than automatically filtering
 */
export async function identifyLargeAudioFiles(notes: Note[]): Promise<AudioFileInfo[]> {
  const audioFiles: AudioFileInfo[] = [];
  
  for (const note of notes) {
    if (note.audioUrl) {
      try {
        const info = await getAudioFileInfo(note);
        if (info) {
          // Add size classification for UI display
          audioFiles.push(info);
        }
      } catch (error) {
        console.error('Error checking file info:', error);
      }
    }
  }
  
  // Sort by size (largest first)
  return audioFiles.sort((a, b) => b.size - a.size);
}

/**
 * Calculate total potential space savings
 */
export function calculateTotalSavings(files: AudioFileInfo[]): number {
  return files.reduce((total, file) => total + calculatePotentialSavings(file), 0);
}

/**
 * Format bytes to human-readable size
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get file extension from MIME type
 */
export function getFileExtensionFromMimeType(mimeType: string): string {
  const mimeToExtension: Record<string, string> = {
    'audio/webm': 'webm',
    'audio/webm;codecs=opus': 'webm',
    'audio/mp4': 'm4a',
    'audio/mpeg': 'mp3',
    'audio/ogg': 'ogg',
    'audio/ogg;codecs=opus': 'ogg',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
    'audio/x-m4a': 'm4a'
  };
  
  // Extract base MIME type without parameters
  const baseMimeType = mimeType.split(';')[0].trim();
  
  // Return the extension or a default
  return mimeToExtension[mimeType] || mimeToExtension[baseMimeType] || 'audio';
}

/**
 * Optimize an audio file using Web Audio API and MediaRecorder
 * 
 * @param audioBlob Original audio blob
 * @param onProgress Progress callback
 * @returns Optimized audio blob
 */
export async function optimizeAudioBlob(
  audioBlob: Blob,
  onProgress?: (message: string) => void
): Promise<Blob> {
  return new Promise(async (resolve, reject) => {
    try {
      onProgress?.('Decoding audio...');
      
      // Create audio context
      const audioContext = new AudioContext();
      
      // Convert blob to array buffer
      const arrayBuffer = await audioBlob.arrayBuffer();
      
      // Decode audio data
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      onProgress?.('Compressing audio...');
      
      // Create media stream from audio buffer
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      
      const destination = audioContext.createMediaStreamDestination();
      source.connect(destination);
      
      // Create media recorder with optimized settings
      const options = {
        mimeType: 'audio/webm;codecs=opus', // Opus codec is efficient for speech
        audioBitsPerSecond: OPTIMAL_BITRATE
      };
      
      // Determine the best supported format for cross-device compatibility
      let mimeType = '';
      
      // Try formats in order of preference for cross-platform compatibility
      const formatOptions = [
        'audio/webm;codecs=opus',  // Best quality/size for Chrome/Firefox/Edge
        'audio/mp4',               // Safari/iOS
        'audio/webm',              // Generic fallback
        'audio/ogg;codecs=opus',   // Another option
        'audio/wav'                // Last resort
      ];
      
      for (const format of formatOptions) {
        if (MediaRecorder.isTypeSupported(format)) {
          mimeType = format;
          break;
        }
      }
      
      if (!mimeType) {
        // If no supported format found, use default
        mimeType = 'audio/webm';
      }
      
      console.log(`Using audio format: ${mimeType} for optimization`);
      
      const mediaRecorder = new MediaRecorder(destination.stream, {
        mimeType,
        audioBitsPerSecond: OPTIMAL_BITRATE
      });
      
      // Collect chunks
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      // When recording completes
      mediaRecorder.onstop = () => {
        // Create blob from chunks
        const mimeType = mediaRecorder.mimeType;
        const optimizedBlob = new Blob(chunks, { type: mimeType });
        
        // Clean up
        source.disconnect();
        audioContext.close().catch(console.error);
        
        // Return optimized blob
        resolve(optimizedBlob);
      };
      
      // Handle errors
      mediaRecorder.onerror = (event) => {
        reject(new Error(`MediaRecorder error: ${event.error}`));
      };
      
      // Start recording and playback
      mediaRecorder.start();
      source.start(0);
      
      // Stop when audio finishes playing
      source.onended = () => {
        mediaRecorder.stop();
      };
      
      // Safety timeout in case onended doesn't fire
      setTimeout(() => {
        if (mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
      }, audioBuffer.duration * 1000 + 1000);
      
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Optimize audio for a specific note
 * 
 * @param note The note containing audio to optimize
 * @param onProgress Progress callback
 * @returns Updated audio URL
 */
export async function optimizeNoteAudio(
  note: Note,
  onProgress?: (message: string) => void
): Promise<string> {
  if (!note.audioUrl) {
    throw new Error('Note has no audio to optimize');
  }
  
  try {
    onProgress?.('Preparing audio for optimization...');
    
    // Resolve the storage URL to a blob URL
    const resolvedAudio = await resolveStorageUrl(note.audioUrl);
    if (!resolvedAudio) {
      throw new Error(`Failed to resolve audio URL: ${note.audioUrl}`);
    }
    
    // Fetch the audio using the resolved URL
    onProgress?.('Fetching audio data...');
    const response = await fetch(resolvedAudio.url);
    if (!response.ok) throw new Error(`Failed to fetch audio: ${response.statusText}`);
    
    // Get the audio as a blob
    const audioBlob = await response.blob();
    
    // Optimize the audio
    onProgress?.('Optimizing audio...');
    const optimizedBlob = await optimizeAudioBlob(audioBlob, onProgress);
    
    // Save the optimized audio
    onProgress?.('Saving optimized audio...');
    
    // Get the file extension based on mime type
    const fileExtension = getFileExtensionFromMimeType(optimizedBlob.type);
    
    // Create a file name with appropriate extension for better compatibility
    const fileName = `optimized_${note.id}.${fileExtension}`;
    
    // Create a File object with proper name and type for better compatibility
    const optimizedFile = new File([optimizedBlob], fileName, { 
      type: optimizedBlob.type,
      lastModified: new Date().getTime()
    });
    
    // Create object URL from the file
    const optimizedUrl = URL.createObjectURL(optimizedFile);
    
    // Return the new URL
    return optimizedUrl;
  } catch (error) {
    reportError(error as Error, { context: 'optimizeNoteAudio', noteId: note.id });
    throw error;
  }
}

/**
 * Process audio in chunks to avoid memory issues
 * 
 * @param audioBlob Original audio blob
 * @param chunkDuration Duration of each chunk in seconds
 * @param processor Function to process each chunk
 * @param onProgress Progress callback
 */
export async function processAudioInChunks<T>(
  audioBlob: Blob,
  chunkDuration: number,
  processor: (chunk: AudioBuffer, chunkIndex: number) => Promise<T>,
  onProgress?: (message: string, progress: number) => void
): Promise<T[]> {
  const results: T[] = [];
  
  try {
    // Create audio context
    const audioContext = new AudioContext();
    
    // Convert blob to array buffer
    const arrayBuffer = await audioBlob.arrayBuffer();
    
    // Decode audio data
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // Calculate chunk size in samples
    const sampleRate = audioBuffer.sampleRate;
    const samplesPerChunk = Math.floor(chunkDuration * sampleRate);
    
    // Calculate total number of chunks
    const totalChunks = Math.ceil(audioBuffer.length / samplesPerChunk);
    
    // Process each chunk
    for (let i = 0; i < totalChunks; i++) {
      onProgress?.(`Processing chunk ${i + 1}/${totalChunks}...`, (i / totalChunks) * 100);
      
      // Calculate chunk start and end
      const start = i * samplesPerChunk;
      const end = Math.min(start + samplesPerChunk, audioBuffer.length);
      
      // Create chunk buffer
      const chunkBuffer = audioContext.createBuffer(
        audioBuffer.numberOfChannels,
        end - start,
        sampleRate
      );
      
      // Copy data to chunk buffer
      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const channelData = audioBuffer.getChannelData(channel);
        const chunkData = chunkBuffer.getChannelData(channel);
        
        for (let j = 0; j < end - start; j++) {
          chunkData[j] = channelData[start + j];
        }
      }
      
      // Process this chunk
      const result = await processor(chunkBuffer, i);
      results.push(result);
      
      // Allow garbage collection between chunks
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    // Clean up
    audioContext.close().catch(console.error);
    
    return results;
  } catch (error) {
    reportError(error as Error, { context: 'processAudioInChunks' });
    throw error;
  }
}
