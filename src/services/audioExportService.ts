import { Note } from '../stores/notesStore';
import { resolveStorageUrl } from '../utils/audioStorage';

/**
 * Service for exporting audio files from notes
 */
export interface ExportProgressCallback {
  (message: string): void;
}

export interface ExportStatusCallback {
  (isExporting: boolean): void;
}

// Device detection helpers
export const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
export const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

// Check if Web Share API is available and can share files
export const canShareFiles = () => {
  return navigator.canShare && navigator.canShare({ files: [new File([""], "test.txt")] });
};

/**
 * Exports a single audio file - better for iOS
 * Uses Web Share API when available
 */
export async function exportSingleAudioFile(
  note: Note,
  onProgress: ExportProgressCallback,
  onStatus: ExportStatusCallback
): Promise<void> {
  // Show loading UI
  onStatus(true);
  onProgress('Preparing to export audio...');
  
  try {
    if (!note.audioUrl) {
      alert('No audio recording found to export.');
      onStatus(false);
      onProgress('');
      return;
    }
    
    // Resolve the storage URL to a blob URL
    onProgress('Resolving audio URL...');
    const resolvedAudio = await resolveStorageUrl(note.audioUrl);
    if (!resolvedAudio) {
      throw new Error(`Failed to resolve audio URL: ${note.audioUrl}`);
    }
    
    // Fetch the audio using the resolved URL
    onProgress('Fetching audio...');
    const response = await fetch(resolvedAudio.url);
    if (!response.ok) throw new Error(`Failed to fetch audio: ${response.statusText}`);
    
    // Get the audio as a blob
    onProgress('Processing audio data...');
    const audioBlob = await response.blob();
    
    // Create a filename that includes note title and ID
    const titleSnippet = note.title ? note.title.slice(0, 20).replace(/[^a-z0-9]/gi, '_') : 'untitled';
    const extension = resolvedAudio.mimeType.includes('wav') ? 'wav' : 'webm';
    const filename = `${titleSnippet}_${note.id}.${extension}`;
    
    // Create a File object from the blob
    const audioFile = new File([audioBlob], filename, { type: resolvedAudio.mimeType });
    
    // Use Web Share API if available
    if (canShareFiles()) {
      onProgress('Opening share dialog...');
      await navigator.share({
        files: [audioFile],
        title: 'Export Audio',
        text: `Audio recording: ${note.title || 'Untitled'}`
      });
    } else {
      // Fallback to download link
      onProgress('Creating download link...');
      const url = URL.createObjectURL(audioBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    
    onStatus(false);
    onProgress('');
    
  } catch (error) {
    console.error('Error exporting audio file:', error);
    onProgress(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    onStatus(false);
    
    // Reset progress after a delay
    setTimeout(() => {
      onProgress('');
    }, 5000);
  }
}

/**
 * Exports all audio files from notes as a zip file or individual files
 * Uses different approaches based on platform capabilities
 */
export async function exportAudioFiles(
  notesWithAudio: Note[],
  onProgress: ExportProgressCallback,
  onStatus: ExportStatusCallback
): Promise<void> {
  // Show loading UI
  onStatus(true);
  onProgress('Preparing to export audio...');
  
  try {
    if (notesWithAudio.length === 0) {
      alert('No audio recordings found to export.');
      onStatus(false);
      onProgress('');
      return;
    }
    
    // Log device information for debugging
    console.log('Device detection:', { isIOS, isSafari, userAgent: navigator.userAgent });
    
    // For iOS devices, offer individual file export instead of zip
    if (isIOS && notesWithAudio.length > 1) {
      // Ask user if they want to export files individually
      const useIndividualExport = window.confirm(
        'On iOS, exporting multiple audio files at once may cause memory issues. ' +
        'Would you like to export files individually instead? ' +
        '(Cancel = try batch export anyway)'
      );
      
      if (useIndividualExport) {
        // Export first file and show message about how to export others
        onProgress('Preparing to export individual file...');
        await exportSingleAudioFile(notesWithAudio[0], onProgress, onStatus);
        
        // Show message about exporting other files
        if (notesWithAudio.length > 1) {
          alert(`First file exported. You can export the remaining ${notesWithAudio.length - 1} files individually from each note.`);
        }
        
        return;
      }
      
      // If user wants to try batch export anyway, warn about potential issues
      console.log('User chose to attempt batch export on iOS');
    }
    
    // For iOS with Web Share API support, use zip.js + Web Share API
    if (isIOS && canShareFiles()) {
      await exportWithZipJsAndShare(notesWithAudio, onProgress, onStatus);
      return;
    }
    
    // For desktop browsers, use StreamSaver approach
    await exportWithStreamSaver(notesWithAudio, onProgress, onStatus);
    
  } catch (error) {
    console.error('Error in exportAudioFiles:', error);
    onProgress(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    onStatus(false);
    
    // Reset progress after a delay
    setTimeout(() => {
      onProgress('');
    }, 5000);
  }
}

/**
 * Export audio files using zip.js and Web Share API (for iOS)
 */
async function exportWithZipJsAndShare(
  notesWithAudio: Note[],
  onProgress: ExportProgressCallback,
  onStatus: ExportStatusCallback
): Promise<void> {
  try {
    // Dynamically import zip.js
    const { ZipWriter, BlobWriter, BlobReader } = await import('@zip.js/zip.js');
    
    onProgress('Creating zip archive...');
    
    // Create a zip writer that writes to a blob
    const zipWriter = new ZipWriter(new BlobWriter());
    const totalNotes = notesWithAudio.length;
    
    // Process files one by one
    for (let i = 0; i < notesWithAudio.length; i++) {
      const note = notesWithAudio[i];
      
      if (!note.audioUrl) continue;
      
      // More detailed progress updates
      onProgress(`Processing file ${i + 1} of ${notesWithAudio.length}...`);
      
      try {
        // Resolve the storage URL to a blob URL
        const resolvedAudio = await resolveStorageUrl(note.audioUrl);
        if (!resolvedAudio) {
          throw new Error(`Failed to resolve audio URL: ${note.audioUrl}`);
        }
        
        // Fetch the audio using the resolved URL
        const response = await fetch(resolvedAudio.url);
        if (!response.ok) throw new Error(`Failed to fetch audio: ${response.statusText}`);
        
        // Get the audio as a blob
        const audioBlob = await response.blob();
        
        // Create a filename that includes note title and ID
        const titleSnippet = note.title ? note.title.slice(0, 20).replace(/[^a-z0-9]/gi, '_') : 'untitled';
        const extension = resolvedAudio.mimeType.includes('wav') ? 'wav' : 'webm';
        const filename = `${titleSnippet}_${note.id}.${extension}`;
        
        // Add to zip
        onProgress(`Adding file ${i + 1}/${totalNotes} to zip...`);
        await zipWriter.add(filename, new BlobReader(audioBlob));
        
        // Clear reference to help garbage collection
        await new Promise(resolve => setTimeout(resolve, 50));
        
      } catch (error) {
        console.error('Error processing audio file:', error);
        onProgress(`Error processing audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Continue with next file even if this one failed
      }
    }
    
    // Close the zip and get the final blob
    onProgress('Finalizing zip file...');
    const zipBlob = await zipWriter.close();
    
    // Create a File object from the blob
    const zipFile = new File(
      [zipBlob], 
      `bolt-audio-export-${new Date().toISOString().slice(0, 10)}.zip`, 
      { type: 'application/zip' }
    );
    
    // Share the zip file using Web Share API
    onProgress('Opening share dialog...');
    await navigator.share({
      files: [zipFile],
      title: 'Export Audio',
      text: `${notesWithAudio.length} audio recordings`
    });
    
    // Show success message
    onStatus(false);
    onProgress('');
    
  } catch (error) {
    console.error('Error in exportWithZipJsAndShare:', error);
    throw error; // Let the main function handle the error
  }
}

/**
 * Export audio files using StreamSaver.js and a web worker (for desktop)
 */
async function exportWithStreamSaver(
  notesWithAudio: Note[],
  onProgress: ExportProgressCallback,
  onStatus: ExportStatusCallback
): Promise<void> {
  try {
    // Dynamically import StreamSaver (only load when needed)
    const streamSaverModule = await import('streamsaver');
    const streamSaver = streamSaverModule.default;
    
    // Create a download stream
    const fileStream = streamSaver.createWriteStream(
      `bolt-audio-export-${new Date().toISOString().slice(0, 10)}.zip`
    );
    
    // Process in smaller batches to avoid memory issues on iOS
    const batchSize = 1; // Process one file at a time to minimize memory usage
    const totalNotes = notesWithAudio.length;
    let processedCount = 0;
    
    // Create a web worker for zip creation
    const zipWorker = new Worker(new URL('../workers/zipWorker.js', import.meta.url), { type: 'module' });
    
    // Set up promise for worker completion
    const workerPromise = new Promise<void>((resolve, reject) => {
      zipWorker.onmessage = (event) => {
        const msg = event.data;
        
        switch (msg.type) {
          case 'ready':
            // Worker is ready, start sending files
            break;
            
          case 'progress':
            // Update progress UI
            onProgress(msg.message);
            break;
            
          case 'data':
            // Write data to the file stream
            const writer = fileStream.getWriter();
            writer.write(msg.data);
            writer.releaseLock();
            break;
            
          case 'complete':
            // Close the stream when done
            const finalWriter = fileStream.getWriter();
            finalWriter.close();
            resolve();
            break;
            
          case 'error':
            reject(new Error(msg.error));
            break;
        }
      };
      
      zipWorker.onerror = (error) => {
        reject(new Error(`Worker error: ${error.message}`));
      };
    });
    
    // Configure the worker
    zipWorker.postMessage({
      type: 'configure',
      totalFiles: totalNotes,
      batchSize: batchSize
    });
    
    // Process audio files one by one to minimize memory usage
    for (let i = 0; i < notesWithAudio.length; i++) {
      const note = notesWithAudio[i];
      const currentBatch = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(notesWithAudio.length / batchSize);
      
      // More detailed progress updates
      onProgress(`Processing file ${i + 1} of ${notesWithAudio.length} (batch ${currentBatch}/${totalBatches})`);
      
      try {
        if (!note.audioUrl) continue;
        
        // Get the audio blob from storage
        const audioUrl = note.audioUrl;
        
        // Resolve the storage URL to a blob URL
        onProgress(`Resolving audio URL for file ${i + 1}/${notesWithAudio.length}...`);
        const resolvedAudio = await resolveStorageUrl(audioUrl);
        if (!resolvedAudio) {
          throw new Error(`Failed to resolve audio URL: ${audioUrl}`);
        }
        
        // Fetch the audio using the resolved URL
        onProgress(`Fetching audio for file ${i + 1}/${notesWithAudio.length}...`);
        const response = await fetch(resolvedAudio.url);
        if (!response.ok) throw new Error(`Failed to fetch audio: ${response.statusText}`);
        
        // Use streaming approach for blob creation if possible
        onProgress(`Processing audio data for file ${i + 1}/${notesWithAudio.length}...`);
        let audioBlob;
        
        // Create a filename that includes note title and ID for reimporting
        const titleSnippet = note.title ? note.title.slice(0, 20).replace(/[^a-z0-9]/gi, '_') : 'untitled';
        // Use the correct extension based on the MIME type
        const extension = resolvedAudio.mimeType.includes('wav') ? 'wav' : 'webm';
        const filename = `${titleSnippet}_${note.id}.${extension}`;
        
        // Use smaller chunks when reading the response
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Cannot read response body');
        }
        
        // Read in smaller chunks to avoid memory spikes
        // Instead of collecting all chunks in memory, we'll send them directly to the worker
        let totalSize = 0;
        let chunkCount = 0;
        
        // Create a unique ID for this file to track chunks in the worker
        const fileId = `${note.id}-${Date.now()}`;
        
        // Tell the worker we're starting a new file
        zipWorker.postMessage({
          type: 'startFile',
          fileId,
          filename,
          mimeType: resolvedAudio.mimeType
        });
        
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            // Tell the worker we're done with this file
            zipWorker.postMessage({
              type: 'endFile',
              fileId
            });
            break;
          }
          
          // Send this chunk directly to the worker
          zipWorker.postMessage({
            type: 'addChunk',
            fileId,
            chunk: value
          }, [value.buffer]); // Transfer ownership of the buffer to avoid copying
          
          totalSize += value.length;
          chunkCount++;
          
          // Update progress periodically
          if (chunkCount % 5 === 0) {
            onProgress(`Reading audio data: ${totalSize} bytes read...`);
            // Brief pause to allow UI updates and garbage collection
            await new Promise(resolve => setTimeout(resolve, 20));
          }
        }
        
        processedCount++;
        onProgress(`Added ${processedCount}/${totalNotes} audio files to zip`);
        
        // Longer yield to the event loop to prevent UI freezing and allow garbage collection
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error('Error processing audio file:', error);
        onProgress(`Error processing audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Continue with next file even if this one failed
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Finalize the zip file
    onProgress('Finalizing zip file...');
    zipWorker.postMessage({ type: 'finalize' });
    
    // Wait for the worker to complete
    await workerPromise;
    
    // Show success message
    onStatus(false);
    onProgress('');
    alert('Audio export complete!');
  } catch (error) {
    console.error('Error in exportWithStreamSaver:', error);
    throw error; // Let the main function handle the error
  }
}
