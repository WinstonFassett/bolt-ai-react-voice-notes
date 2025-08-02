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

/**
 * Exports all audio files from notes as a zip file
 * Uses StreamSaver.js and a web worker for memory-efficient streaming
 */
export async function exportAudioFiles(
  notesWithAudio: Note[],
  onProgress: ExportProgressCallback,
  onStatusChange: ExportStatusCallback
): Promise<void> {
  // Show loading UI
  onStatusChange(true);
  onProgress('Preparing to export audio...');
  
  try {
    if (notesWithAudio.length === 0) {
      alert('No audio recordings found to export.');
      onStatusChange(false);
      onProgress('');
      return;
    }
    
    // Dynamically import StreamSaver (only load when needed)
    const streamSaverModule = await import('streamsaver');
    const streamSaver = streamSaverModule.default;
    
    // Create a download stream
    const fileStream = streamSaver.createWriteStream(
      `bolt-audio-export-${new Date().toISOString().slice(0, 10)}.zip`
    );
    
    // Process in small batches to avoid memory issues on iOS
    const batchSize = 3;
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
    
    // Process audio files in batches
    for (let i = 0; i < notesWithAudio.length; i += batchSize) {
      const batch = notesWithAudio.slice(i, i + batchSize);
      onProgress(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(notesWithAudio.length / batchSize)}...`);
      
      // Process each note in the batch
      await Promise.all(batch.map(async (note) => {
        try {
          if (!note.audioUrl) return;
          
          // Get the audio blob from storage
          const audioUrl = note.audioUrl;
          
          // Resolve the storage URL to a blob URL
          const resolvedAudio = await resolveStorageUrl(audioUrl);
          if (!resolvedAudio) {
            throw new Error(`Failed to resolve audio URL: ${audioUrl}`);
          }
          
          // Fetch the audio using the resolved URL
          const response = await fetch(resolvedAudio.url);
          if (!response.ok) throw new Error(`Failed to fetch audio: ${response.statusText}`);
          
          const audioBlob = await response.blob();
          
          // Create a filename that includes note title and ID for reimporting
          const titleSnippet = note.title ? note.title.slice(0, 20).replace(/[^a-z0-9]/gi, '_') : 'untitled';
          // Use the correct extension based on the MIME type
          const extension = resolvedAudio.mimeType.includes('wav') ? 'wav' : 'webm';
          const filename = `${titleSnippet}_${note.id}.${extension}`;
          
          // Send the file to the worker
          zipWorker.postMessage({
            type: 'addFile',
            filename,
            data: audioBlob
          });
          
          processedCount++;
          onProgress(`Added ${processedCount}/${totalNotes} audio files to zip`);
        } catch (error) {
          console.error('Error processing audio file:', error);
          onProgress(`Error processing audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }));
      
      // Yield to the event loop to prevent UI freezing
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    // Finalize the zip file
    onProgress('Finalizing zip file...');
    zipWorker.postMessage({ type: 'finalize' });
    
    // Wait for the worker to complete
    await workerPromise;
    
    // Show success message
    onStatusChange(false);
    onProgress('');
    alert('Audio export complete!');
  } catch (error) {
    console.error('Error exporting audio:', error);
    onStatusChange(false);
    onProgress('');
    alert(`Error exporting audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
