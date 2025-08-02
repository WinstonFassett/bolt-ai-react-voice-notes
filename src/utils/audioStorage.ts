// IndexedDB Audio Storage Utility
const DB_NAME = 'MonologAudioDB';
const DB_VERSION = 1;
const STORE_NAME = 'audioFiles';

interface StoredAudio {
  id: string;
  audioBlob: Blob;
  timestamp: number;
  mimeType: string;
}

class AudioStorage {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async saveAudio(audioBlob: Blob, fileName: string, mimeType: string = 'audio/webm'): Promise<string> {
    if (!this.db) await this.init();
    
    console.log('💾 AudioStorage: Starting save process', {
      fileName,
      originalSize: audioBlob.size,
      originalMimeType: mimeType,
      userAgent: navigator.userAgent
    });
    
    // Convert WebM to WAV for iOS compatibility
    const processedBlob = await this.processAudioForCompatibility(audioBlob, mimeType);
    const finalMimeType = this.getCompatibleMimeType();
    
    console.log('💾 AudioStorage: Audio processed', {
      finalSize: processedBlob.size,
      finalMimeType,
      conversionApplied: processedBlob !== audioBlob
    });
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const audioData: StoredAudio = {
        id: fileName,
        audioBlob: processedBlob,
        timestamp: Date.now(),
        mimeType: finalMimeType
      };
      
      const request = store.put(audioData);
      
      request.onsuccess = () => {
        // Return a custom URL that we can use to identify this audio
        const storageUrl = `audio-storage://${fileName}`;
        console.log('💾 AudioStorage: Audio saved successfully', {
          fileName,
          storageUrl,
          blobSize: processedBlob.size,
          finalMimeType
        });
        resolve(storageUrl);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  private async processAudioForCompatibility(audioBlob: Blob, originalMimeType: string): Promise<Blob> {
    // Check if we're on iOS/Safari and the audio is WebM
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isWebM = originalMimeType.includes('webm') || originalMimeType.includes('ogg');
    
    console.log('🔄 AudioStorage: Checking compatibility', {
      isIOS,
      isSafari,
      isWebM,
      originalMimeType,
      needsConversion: (isIOS || isSafari) && isWebM
    });
    
    if ((isIOS || isSafari) && isWebM) {
      console.log('🔄 Converting WebM to WAV for iOS/Safari compatibility');
      try {
        const convertedBlob = await this.convertToWAV(audioBlob);
        console.log('✅ Audio conversion successful', {
          originalSize: audioBlob.size,
          convertedSize: convertedBlob.size
        });
        return convertedBlob;
      } catch (error) {
        console.error('❌ Failed to convert audio format:', error);
        // Try to create a simple WAV wrapper as fallback
        try {
          const fallbackBlob = await this.createWAVFallback(audioBlob);
          console.log('⚠️ Using fallback WAV wrapper');
          return fallbackBlob;
        } catch (fallbackError) {
          console.error('❌ Fallback conversion also failed:', fallbackError);
          // Return original blob as last resort
          return audioBlob;
        }
      }
    }
    
    return audioBlob;
  }

  private async convertToWAV(audioBlob: Blob): Promise<Blob> {
    console.log('🔄 Starting WebM to WAV conversion');
    
    // Create audio context with iOS-compatible settings
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 44100 // Use standard sample rate for better compatibility
    });
    
    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      console.log('🔄 Audio blob converted to array buffer, size:', arrayBuffer.byteLength);
      
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      console.log('🔄 Audio decoded successfully', {
        duration: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate,
        numberOfChannels: audioBuffer.numberOfChannels,
        length: audioBuffer.length
      });
      
      const wavBlob = await this.audioBufferToWAV(audioBuffer);
      console.log('✅ WAV conversion complete, size:', wavBlob.size);
      
      return wavBlob;
    } finally {
      // Always close the audio context to free resources
      try {
        await audioContext.close();
      } catch (e) {
        console.warn('Warning: Could not close audio context:', e);
      }
    }
  }

  private async createWAVFallback(audioBlob: Blob): Promise<Blob> {
    console.log('🔄 Creating WAV fallback wrapper');
    
    // Create a minimal WAV header for the raw audio data
    const arrayBuffer = await audioBlob.arrayBuffer();
    const dataSize = arrayBuffer.byteLength;
    
    // Create WAV header (44 bytes)
    const header = new ArrayBuffer(44);
    const view = new DataView(header);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, 44100, true); // Sample rate
    view.setUint32(28, 44100 * 2, true); // Byte rate
    view.setUint16(32, 2, true); // Block align
    view.setUint16(34, 16, true); // Bits per sample
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);
    
    // Combine header with audio data
    const wavBuffer = new Uint8Array(44 + dataSize);
    wavBuffer.set(new Uint8Array(header), 0);
    wavBuffer.set(new Uint8Array(arrayBuffer), 44);
    
    return new Blob([wavBuffer], { type: 'audio/wav' });
  }

  async audioBufferToWAV(audioBuffer: AudioBuffer): Promise<Blob> {
    const length = audioBuffer.length;
    const numberOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    
    console.log('🔄 Converting AudioBuffer to WAV', {
      length,
      numberOfChannels,
      sampleRate,
      duration: audioBuffer.duration
    });
    
    // Create WAV file buffer
    const buffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
    const view = new DataView(buffer);
    
    // Write WAV header
    const writeString = (view: DataView, offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + length * numberOfChannels * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, length * numberOfChannels * 2, true);
    
    // Write audio data
    const offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[i]));
        view.setInt16(offset + (i * numberOfChannels + channel) * 2, sample * 0x7FFF, true);
      }
    }
    
    const wavBlob = new Blob([buffer], { type: 'audio/wav' });
    console.log('✅ WAV file created, size:', wavBlob.size);
    return wavBlob;
  }

  private getCompatibleMimeType(): string {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    
    if (isIOS || isSafari) {
      return 'audio/wav';
    }
    
    return 'audio/webm';
  }

  async getAudio(id: string): Promise<{ url: string; mimeType: string } | null> {
    if (!this.db) await this.init();
    
    return new Promise((resolve) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);
      
      request.onsuccess = () => {
        if (request.result) {
          const audioData: StoredAudio = request.result;
          
          // Validate the blob
          if (!audioData.audioBlob || audioData.audioBlob.size === 0) {
            console.error('AudioStorage: Invalid or empty blob for ID:', id);
            resolve(null);
            return;
          }
          
          // Create blob URL with proper MIME type for better mobile compatibility  
          console.log('💾 AudioStorage: Creating blob URL for audio', { 
            id, 
            size: audioData.audioBlob.size, 
            mimeType: audioData.mimeType,
            timestamp: new Date().toISOString()
          });
          
          // Ensure we use the correct MIME type for the blob
          const blob = new Blob([audioData.audioBlob], { type: audioData.mimeType });
          const url = URL.createObjectURL(blob);
          
          console.log('✅ AudioStorage: Retrieved audio for ID:', id, 'URL:', url.substring(0, 50) + '...', 'MimeType:', audioData.mimeType, 'Blob size:', blob.size);
          resolve({ url, mimeType: audioData.mimeType });
        } else {
          console.log('❌ AudioStorage: No audio found for ID:', id);
          resolve(null);
        }
      };
      
      request.onerror = () => {
        console.error('❌ AudioStorage: Error retrieving audio for ID:', id);
        resolve(null);
      };
    });
  }
  
  /**
   * Refresh the audio blob URL for a given ID
   * This is useful when a blob URL has expired or is no longer valid
   */
  async refreshAudio(id: string): Promise<{ url: string; mimeType: string } | null> {
    if (!this.db) await this.init();
    
    // First, try to revoke any existing blob URL for this ID
    try {
      // We don't have a way to track existing blob URLs, so we'll just create a new one
      console.log('🔄 AudioStorage: Refreshing blob URL for ID:', id);
    } catch (error) {
      console.error('Error revoking blob URL:', error);
    }
    
    // Then get the audio data again and create a fresh blob URL
    return new Promise((resolve) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);
      
      request.onsuccess = () => {
        if (request.result) {
          const audioData: StoredAudio = request.result;
          
          // Validate the blob
          if (!audioData.audioBlob || audioData.audioBlob.size === 0) {
            console.error('AudioStorage: Invalid or empty blob for ID:', id);
            resolve(null);
            return;
          }
          
          // Create a fresh blob URL
          console.log('🔄 AudioStorage: Creating fresh blob URL for audio', { 
            id, 
            size: audioData.audioBlob.size, 
            mimeType: audioData.mimeType
          });
          
          // Ensure we use the correct MIME type for the blob
          const blob = new Blob([audioData.audioBlob], { type: audioData.mimeType });
          const url = URL.createObjectURL(blob);
          
          console.log('✅ AudioStorage: Refreshed audio for ID:', id, 'New URL:', url.substring(0, 50) + '...', 'MimeType:', audioData.mimeType, 'Blob size:', blob.size);
          resolve({ url, mimeType: audioData.mimeType });
        } else {
          console.log('❌ AudioStorage: No audio found for ID to refresh:', id);
          resolve(null);
        }
      };
      
      request.onerror = () => {
        console.error('❌ AudioStorage: Error refreshing audio for ID:', id);
        resolve(null);
      };
    });
  }

  async deleteAudio(id: string): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAllAudioIds(): Promise<string[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAllKeys();
      
      request.onsuccess = () => resolve(request.result as string[]);
      request.onerror = () => reject(request.error);
    });
  }
}

export const audioStorage = new AudioStorage();

// Helper function to check if URL is from our storage
export const isStorageUrl = (url: string): boolean => {
  return url.startsWith('audio-storage://');
};

// Helper function to extract ID from storage URL
export const getStorageId = (url: string): string => {
  return url.replace('audio-storage://', '');
};

// Helper function to resolve storage URL to blob URL
export const resolveStorageUrl = async (url: string, forceRefresh = false): Promise<{ url: string; mimeType: string } | null> => {
  if (!isStorageUrl(url)) {
    // Return the URL as-is for non-storage URLs
    return { url, mimeType: 'audio/webm' };
  }
  
  const id = getStorageId(url);
  
  // If forceRefresh is true, try to get a fresh blob URL
  const result = forceRefresh 
    ? await audioStorage.refreshAudio(id) 
    : await audioStorage.getAudio(id);
  
  console.log('🔗 resolveStorageUrl called', {
    originalUrl: url,
    extractedId: id,
    result: result ? { url: result.url.substring(0, 50) + '...', mimeType: result.mimeType } : null
  });
  
  if (!result) {
    console.error('❌ Failed to resolve storage URL:', url, 'ID:', id);
    return null;
  }
  
  return result;
};