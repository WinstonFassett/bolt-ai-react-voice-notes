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
    let resolvedAudio = await resolveStorageUrl(note.audioUrl);
    if (!resolvedAudio) {
      throw new Error(`Failed to resolve audio URL: ${note.audioUrl}`);
    }
    
    // Get size from URL
    let size = 0;
    let fetchSuccess = false;
    let attempts = 0;
    const maxAttempts = 2;
    
    // Try to fetch the blob with retries
    while (!fetchSuccess && attempts < maxAttempts) {
      attempts++;
      
      // If it's a blob URL, we can fetch the blob and get its size
      if (resolvedAudio.url.startsWith('blob:')) {
        try {
          console.log(`Attempt ${attempts} to fetch blob URL: ${resolvedAudio.url.substring(0, 50)}...`);
          const response = await fetch(resolvedAudio.url);
          if (!response.ok) {
            throw new Error(`Failed to fetch blob: ${response.statusText}`);
          }
          const blob = await response.blob();
          size = blob.size;
          fetchSuccess = true;
        } catch (error) {
          console.error(`Error fetching blob URL (attempt ${attempts}):`, error);
          
          // On first failure, try to refresh the URL
          if (attempts < maxAttempts) {
            console.log('Trying to refresh the audio URL...');
            // Force a fresh URL by clearing any cached blob URLs
            URL.revokeObjectURL(resolvedAudio.url);
            
            // Get a completely fresh URL from storage
            resolvedAudio = await resolveStorageUrl(note.audioUrl, true);
            if (!resolvedAudio) {
              console.error('Failed to refresh audio URL');
              break;
            }
            console.log(`Got refreshed URL: ${resolvedAudio.url.substring(0, 50)}...`);
          }
        }
      } else {
        // Not a blob URL, no need to retry
        break;
      }
    }
    
    // If we couldn't get the size, estimate it based on the note ID
    // This is a fallback to avoid breaking the optimization process
    if (!fetchSuccess && size === 0) {
      console.log('Using fallback size estimation for audio file');
      // Use a reasonable default size for audio files (500KB)
      size = 500 * 1024;
    }
    
    // Get duration and format by loading the audio
    const audioElement = document.createElement('audio');
    // Make sure resolvedAudio is not null before accessing its properties
    if (!resolvedAudio) {
      throw new Error('Failed to resolve audio URL');
    }
    
    // Try to get duration from the audio element
    let duration = 0;
    try {
      // Use a data URL instead of blob URL if we had fetch issues
      if (!fetchSuccess && size > 0) {
        console.log('Using data URL fallback for audio metadata');
        // Create a minimal audio data URL for testing
        audioElement.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
      } else {
        audioElement.src = resolvedAudio.url;
      }
      
      duration = await new Promise<number>((resolve) => {
        audioElement.addEventListener('loadedmetadata', () => {
          // Handle Infinity or NaN duration values
          const audioDuration = audioElement.duration;
          if (Number.isFinite(audioDuration) && audioDuration > 0) {
            resolve(audioDuration);
          } else {
            // Estimate duration based on file size and typical bitrate
            const estimatedDuration = (size * 8) / (128 * 1024);
            resolve(estimatedDuration);
          }
        });
        
        // Handle errors
        audioElement.addEventListener('error', () => {
          console.error('Error loading audio metadata');
          // Estimate duration based on file size
          const estimatedDuration = (size * 8) / (128 * 1024);
          resolve(estimatedDuration);
        });
        
        // Set timeout in case it never loads
        setTimeout(() => {
          // Estimate duration based on file size
          const estimatedDuration = (size * 8) / (128 * 1024);
          resolve(estimatedDuration);
        }, 5000);
      });
    } catch (error) {
      console.warn('Could not get audio duration, using estimation:', error);
      // Estimate duration based on file size (assuming 128kbps bitrate)
      duration = size > 0 ? (size * 8) / (128 * 1024) : 0;
    }
    
    // Calculate bitrate - ensure we have valid values
    const validDuration = duration > 0 ? duration : 1;
    const bitrate = (size * 8) / validDuration;
    
    // Get format from MIME type (resolvedAudio is checked above)
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
 * List all audio files that can be optimized
 */
export async function identifyLargeAudioFiles(notes: Note[]): Promise<AudioFileInfo[]> {
  const audioFiles: AudioFileInfo[] = [];
  
  for (const note of notes) {
    if (note.audioUrl) {
      try {
        const info = await getAudioFileInfo(note);
        if (info) {
          // Include all audio files, not just large ones
          audioFiles.push(info);
        }
      } catch (error) {
        console.error('Error checking audio file:', error);
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
      
      // Determine the best supported format for cross-device compatibility
      let mimeType = '';
      
      // Try formats in order of preference for cross-platform compatibility
      // iOS/Safari compatibility is critical
      // For iOS Chrome, we need to be especially careful
      const formatOptions = [
        'audio/wav',               // Most compatible across all browsers
        'audio/mp4',               // Good for Safari/iOS
        'audio/webm',             // Generic fallback
        'audio/webm;codecs=opus', // Good for desktop Chrome/Firefox/Edge but can cause issues on iOS
        'audio/ogg;codecs=opus'   // Another option
      ];
      
      // Check if we're on iOS
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      
      // On iOS, prioritize WAV or MP4 only
      if (isIOS) {
        console.log('iOS device detected, using only WAV or MP4 format');
        for (const format of ['audio/wav', 'audio/mp4']) {
          if (MediaRecorder.isTypeSupported(format)) {
            mimeType = format;
            break;
          }
        }
      } else {
        // On other platforms, try all formats
        for (const format of formatOptions) {
          if (MediaRecorder.isTypeSupported(format)) {
            mimeType = format;
            break;
          }
        }
      }
      
      if (!mimeType) {
        // If no supported format found, use default
        mimeType = 'audio/wav';
        console.warn('No supported audio format found, falling back to WAV');
      }
      
      console.log(`Using audio format: ${mimeType} for optimization`);
      
      // Use a more conservative bitrate to ensure quality
      // 128kbps is a good balance between quality and size for voice
      const audioBitsPerSecond = Math.max(OPTIMAL_BITRATE, 128000);
      
      const mediaRecorder = new MediaRecorder(destination.stream, {
        mimeType,
        audioBitsPerSecond
      });
      
      // Collect chunks
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      // Request data every second to ensure we get multiple chunks
      // This helps with compatibility issues
      const dataInterval = setInterval(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.requestData();
        }
      }, 1000);
      
      // When recording completes
      mediaRecorder.onstop = () => {
        clearInterval(dataInterval);
        
        // Create blob from chunks
        const mimeType = mediaRecorder.mimeType;
        const optimizedBlob = new Blob(chunks, { type: mimeType });
        
        console.log(`Optimization complete: Original size: ${audioBlob.size}, New size: ${optimizedBlob.size}, Format: ${mimeType}`);
        
        // Verify the blob is valid
        if (optimizedBlob.size === 0) {
          console.error('Optimization produced an empty blob');
          // Fall back to the original blob
          resolve(audioBlob);
          return;
        }
        
        // Clean up
        source.disconnect();
        audioContext.close().catch(console.error);
        
        // Return optimized blob
        resolve(optimizedBlob);
      };
      
      // Handle errors
      mediaRecorder.onerror = (event) => {
        clearInterval(dataInterval);
        console.error('MediaRecorder error:', event);
        // Fall back to the original blob on error
        resolve(audioBlob);
      };
      
      // Start recording and playback
      mediaRecorder.start(1000); // Capture in 1-second chunks for better reliability
      source.start(0);
      
      // Stop when audio finishes playing
      source.onended = () => {
        if (mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
      };
      
      // Calculate a reasonable timeout - handle Infinity or invalid duration
      const duration = Number.isFinite(audioBuffer.duration) ? audioBuffer.duration : 30;
      const safeTimeout = Math.min(duration * 1000 + 2000, 60000); // Cap at 60 seconds max
      
      // Safety timeout in case onended doesn't fire
      setTimeout(() => {
        if (mediaRecorder.state !== 'inactive') {
          console.log('Optimization timeout reached, stopping recorder');
          mediaRecorder.stop();
        }
      }, safeTimeout);
      
    } catch (error) {
      console.error('Error in audio optimization:', error);
      // Return original blob on error instead of failing
      resolve(audioBlob);
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
    let resolvedAudio = await resolveStorageUrl(note.audioUrl);
    if (!resolvedAudio) {
      throw new Error(`Failed to resolve audio URL: ${note.audioUrl}`);
    }
    
    // Fetch the audio using the resolved URL with retry
    onProgress?.('Fetching audio data...');
    let response;
    let audioBlob;
    let success = false;
    
    // Try up to 2 times to fetch the audio
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`Attempt ${attempt} to fetch audio for optimization: ${resolvedAudio.url.substring(0, 50)}...`);
        response = await fetch(resolvedAudio.url);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch audio: ${response.statusText}`);
        }
        
        // Get the audio as a blob
        audioBlob = await response.blob();
        success = true;
        break;
      } catch (error) {
        console.error(`Error fetching audio (attempt ${attempt}):`, error);
        
        // On first failure, try to refresh the URL
        if (attempt === 1) {
          onProgress?.('Refreshing audio source...');
          
          // Explicitly revoke the old blob URL before getting a new one
          if (resolvedAudio && resolvedAudio.url.startsWith('blob:')) {
            console.log('Revoking old blob URL before refresh');
            URL.revokeObjectURL(resolvedAudio.url);
          }
          
          // Force a fresh URL from storage with forceRefresh=true
          resolvedAudio = await resolveStorageUrl(note.audioUrl, true);
          if (!resolvedAudio) {
            throw new Error(`Failed to refresh audio URL: ${note.audioUrl}`);
          }
          console.log(`Got refreshed URL: ${resolvedAudio.url.substring(0, 50)}...`);
        } else {
          // If we've tried twice and still failed, throw the error
          throw error;
        }
      }
    }
    
    if (!success || !audioBlob) {
      throw new Error('Failed to fetch audio after multiple attempts');
    }
    
    // Get original audio info for comparison
    const originalSize = audioBlob.size;
    const originalType = audioBlob.type;
    
    // Optimize the audio
    onProgress?.('Optimizing audio...');
    const optimizedBlob = await optimizeAudioBlob(audioBlob, onProgress);
    
    // Verify the optimization was successful
    if (optimizedBlob.size === 0) {
      console.error('Optimization produced an empty blob, using original');
      // Use the original blob instead
      return resolvedAudio.url;
    }
    
    // Verify the optimized blob is actually smaller
    if (optimizedBlob.size >= originalSize) {
      console.log('Optimization did not reduce file size, using original');
      return resolvedAudio.url;
    }
    
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
    
    // Log the optimization results
    console.log('Audio optimization results:', {
      noteId: note.id,
      originalSize,
      optimizedSize: optimizedBlob.size,
      originalType,
      optimizedType: optimizedBlob.type,
      savings: originalSize - optimizedBlob.size,
      savingsPercent: Math.round(((originalSize - optimizedBlob.size) / originalSize) * 100)
    });
    
    // Create object URL from the file
    const optimizedUrl = URL.createObjectURL(optimizedFile);
    
    // Test that the optimized audio is playable
    try {
      const audio = new Audio();
      audio.src = optimizedUrl;
      await new Promise<void>((resolve, reject) => {
        audio.oncanplaythrough = () => resolve();
        audio.onerror = () => reject(new Error('Optimized audio is not playable'));
        // Set a timeout in case the audio never loads
        setTimeout(() => reject(new Error('Timeout testing optimized audio')), 5000);
      });
      console.log('Optimized audio verified as playable');
    } catch (error) {
      console.error('Optimized audio is not playable, using original:', error);
      URL.revokeObjectURL(optimizedUrl);
      return resolvedAudio.url;
    }
    
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
