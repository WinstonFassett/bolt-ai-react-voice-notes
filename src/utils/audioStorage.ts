// OPFS Audio Storage Utility - 3x faster than IndexedDB
interface StoredAudioMetadata {
  id: string;
  timestamp: number;
  mimeType: string;
  size: number;
  duration?: number;
}

class AudioStorage {
  private opfsRoot: FileSystemDirectoryHandle | null = null;
  private metadataCache = new Map<string, StoredAudioMetadata>();
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    
    try {
      // Get OPFS root directory
      this.opfsRoot = await navigator.storage.getDirectory();
      
      // Create audio directory if it doesn't exist
      await this.opfsRoot.getDirectoryHandle('audio', { create: true });
      
      // Load metadata cache from OPFS
      await this.loadMetadataCache();
      
      this.initialized = true;
      console.log('📁 OPFS AudioStorage initialized successfully');
    } catch (error) {
      console.error('❌ OPFS initialization failed, falling back to IndexedDB:', error);
      await this.initIndexedDBFallback();
    }
  }

  private async loadMetadataCache(): Promise<void> {
    try {
      const metadataHandle = await this.opfsRoot!.getFileHandle('metadata.json', { create: true });
      const file = await metadataHandle.getFile();
      
      if (file.size > 0) {
        const text = await file.text();
        const metadata = JSON.parse(text);
        this.metadataCache = new Map(Object.entries(metadata));
        console.log(`📁 Loaded ${this.metadataCache.size} audio file metadata from OPFS`);
      }
    } catch (error) {
      console.warn('⚠️ Could not load metadata cache, starting fresh:', error);
      this.metadataCache = new Map();
    }
  }

  private async saveMetadataCache(): Promise<void> {
    try {
      const metadataHandle = await this.opfsRoot!.getFileHandle('metadata.json', { create: true });
      const writable = await metadataHandle.createWritable();
      
      const metadata = Object.fromEntries(this.metadataCache.entries());
      await writable.write(JSON.stringify(metadata, null, 2));
      await writable.close();
    } catch (error) {
      console.error('❌ Failed to save metadata cache:', error);
    }
  }

  private async initIndexedDBFallback(): Promise<void> {
    // Keep IndexedDB as fallback for browsers without OPFS support
    const DB_NAME = 'MonologAudioDB';
    const DB_VERSION = 1;
    const STORE_NAME = 'audioFiles';
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log('📁 IndexedDB fallback initialized');
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
    if (!this.initialized) await this.init();
    
    console.log('💾 OPFS AudioStorage: Starting save process', {
      fileName,
      originalSize: audioBlob.size,
      originalMimeType: mimeType,
      userAgent: navigator.userAgent
    });
    
    // Skip iOS WAV conversion - let Media Bunny handle optimal formats natively
    const finalBlob = audioBlob;
    const finalMimeType = mimeType;
    
    console.log('💾 OPFS AudioStorage: Saving to OPFS', {
      finalSize: finalBlob.size,
      finalMimeType,
      skipConversion: true
    });
    
    try {
      if (this.opfsRoot) {
        // Save to OPFS
        const audioDir = await this.opfsRoot.getDirectoryHandle('audio', { create: true });
        const fileHandle = await audioDir.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        
        // Stream the blob directly to OPFS - no memory buildup
        await finalBlob.stream().pipeTo(writable);
        
        // Update metadata cache
        const metadata: StoredAudioMetadata = {
          id: fileName,
          timestamp: Date.now(),
          mimeType: finalMimeType,
          size: finalBlob.size
        };
        
        this.metadataCache.set(fileName, metadata);
        await this.saveMetadataCache();
        
        const storageUrl = `opfs-storage://${fileName}`;
        console.log('✅ OPFS AudioStorage: Audio saved successfully', {
          fileName,
          storageUrl,
          blobSize: finalBlob.size,
          finalMimeType
        });
        
        return storageUrl;
      } else {
        // Fallback to IndexedDB implementation
        return await this.saveAudioIndexedDB(finalBlob, fileName, finalMimeType);
      }
    } catch (error) {
      console.error('❌ OPFS save failed, trying IndexedDB fallback:', error);
      return await this.saveAudioIndexedDB(finalBlob, fileName, finalMimeType);
    }
  }

  private async saveAudioIndexedDB(audioBlob: Blob, fileName: string, mimeType: string): Promise<string> {
    // IndexedDB fallback implementation
    console.log('📦 Using IndexedDB fallback for audio storage');
    
    const DB_NAME = 'MonologAudioDB';
    const STORE_NAME = 'audioFiles';
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        const audioData = {
          id: fileName,
          audioBlob: audioBlob,
          timestamp: Date.now(),
          mimeType: mimeType
        };
        
        const putRequest = store.put(audioData);
        
        putRequest.onsuccess = () => {
          const storageUrl = `audio-storage://${fileName}`;
          console.log('✅ IndexedDB fallback: Audio saved successfully', { fileName, storageUrl });
          resolve(storageUrl);
        };
        
        putRequest.onerror = () => reject(putRequest.error);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  // REMOVED: iOS WAV conversion methods - letting Media Bunny handle native formats

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

  // REMOVED: getCompatibleMimeType - using Media Bunny's native format detection

  async getAudio(id: string): Promise<{ url: string; mimeType: string } | null> {
    if (!this.initialized) await this.init();
    
    try {
      if (this.opfsRoot) {
        // Try OPFS first
        const audioDir = await this.opfsRoot.getDirectoryHandle('audio', { create: false });
        const fileHandle = await audioDir.getFileHandle(id);
        const file = await fileHandle.getFile();
        
        // Get metadata from cache
        const metadata = this.metadataCache.get(id);
        const mimeType = metadata?.mimeType || 'audio/webm';
        
        // Create blob URL
        const blob = new Blob([file], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        console.log('✅ OPFS AudioStorage: Retrieved audio for ID:', id, {
          url: url.substring(0, 50) + '...',
          mimeType,
          size: file.size
        });
        
        return { url, mimeType };
      } else {
        // Fallback to IndexedDB
        return await this.getAudioIndexedDB(id);
      }
    } catch (error) {
      console.warn('⚠️ OPFS retrieval failed, trying IndexedDB fallback:', error);
      return await this.getAudioIndexedDB(id);
    }
  }

  private async getAudioIndexedDB(id: string): Promise<{ url: string; mimeType: string } | null> {
    const DB_NAME = 'MonologAudioDB';
    const STORE_NAME = 'audioFiles';
    
    return new Promise((resolve) => {
      const request = indexedDB.open(DB_NAME, 1);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const getRequest = store.get(id);
        
        getRequest.onsuccess = () => {
          if (getRequest.result) {
            const audioData = getRequest.result;
            
            if (!audioData.audioBlob || audioData.audioBlob.size === 0) {
              console.error('❌ IndexedDB: Invalid or empty blob for ID:', id);
              resolve(null);
              return;
            }
            
            const blob = new Blob([audioData.audioBlob], { type: audioData.mimeType });
            const url = URL.createObjectURL(blob);
            
            console.log('✅ IndexedDB fallback: Retrieved audio for ID:', id);
            resolve({ url, mimeType: audioData.mimeType });
          } else {
            console.log('❌ IndexedDB: No audio found for ID:', id);
            resolve(null);
          }
        };
        
        getRequest.onerror = () => {
          console.error('❌ IndexedDB: Error retrieving audio for ID:', id);
          resolve(null);
        };
      };
      
      request.onerror = () => {
        console.error('❌ IndexedDB: Failed to open database');
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

// Helper function to check if URL is from our storage (OPFS or IndexedDB)
export const isStorageUrl = (url: string): boolean => {
  return url.startsWith('opfs-storage://') || url.startsWith('audio-storage://');
};

// Helper function to extract ID from storage URL
export const getStorageId = (url: string): string => {
  return url.replace('opfs-storage://', '').replace('audio-storage://', '');
};

// Helper function to resolve storage URL to blob URL
export const resolveStorageUrl = async (url: string): Promise<{ url: string; mimeType: string } | null> => {
  if (!isStorageUrl(url)) {
    // Return the URL as-is for non-storage URLs
    return { url, mimeType: 'audio/webm' };
  }
  
  const id = getStorageId(url);
  const result = await audioStorage.getAudio(id);
  
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