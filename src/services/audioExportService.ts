import { Note } from '../stores/notesStore';
import { resolveStorageUrl } from '../utils/audioStorage';
import { toast } from '@/hooks/use-toast';

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
  onStatus: ExportStatusCallback
): Promise<void> {
  // Show loading UI
  onStatus(true);
  onProgress('Preparing to export audio...');
  
  try {
    if (notesWithAudio.length === 0) {
      toast({
        title: 'Export Failed',
        description: 'No audio recordings found to export.',
        variant: 'destructive'
      });
      onStatus(false);
      onProgress('');
      return;
    }
    
    // Detect iOS for special handling
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    
    // Log device information for debugging
    console.log('Device detection:', { isIOS, isSafari, userAgent: navigator.userAgent });
    
    // Set StreamSaver options for iOS if needed
    if (isIOS) {
      // For iOS Safari 15.4+, we don't need to force blob fallback
      // But we'll use smaller chunk sizes and more aggressive memory management
      console.log('Using iOS-optimized export settings');
    }
    
    // Dynamically import StreamSaver (only load when needed)
    const streamSaverModule = await import('streamsaver');
    const streamSaver = streamSaverModule.default;
    
    // Create a download stream
    const fileStream = streamSaver.createWriteStream(
      `bolt-audio-export-${new Date().toISOString().slice(0, 10)}.zip`
    );
    
    // Process in smaller batches to avoid memory issues on iOS
    const batchSize = 1; // Process one file at a time on iOS to minimize memory usage
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
        
        if (isIOS) {
          // On iOS, we need to be extra careful with memory
          // Use smaller chunks when reading the response
          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error('Cannot read response body');
          }
          
          // Read in smaller chunks to avoid memory spikes
          // Instead of collecting all chunks in memory, we'll send them directly to the worker
          // This avoids building up a large array in memory
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
            
            // Update progress more frequently on iOS
            if (chunkCount % 5 === 0) {
              onProgress(`Reading audio data: ${totalSize} bytes read...`);
              // Brief pause to allow UI updates and garbage collection
              await new Promise(resolve => setTimeout(resolve, 20));
            }
          }
          
          // No need to create a blob here - the worker handles it
          audioBlob = null;
        } else {
          // On desktop, we can use the simpler approach
          audioBlob = await response.blob();
          
          // Send the file to the worker
          onProgress(`Adding file ${i + 1}/${notesWithAudio.length} to zip...`);
          zipWorker.postMessage({
            type: 'addFile',
            filename,
            data: audioBlob
          });
          
          // Clear reference to help garbage collection
          audioBlob = null;
        }
        
        processedCount++;
        onProgress(`Added ${processedCount}/${totalNotes} audio files to zip`);
        
        // Clear references to large objects to help garbage collection
        audioBlob = null;
        
        // Longer yield to the event loop on iOS to prevent UI freezing and allow garbage collection
        await new Promise(resolve => setTimeout(resolve, isIOS ? 300 : 10));
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
    toast({
      title: 'Export Complete',
      description: 'Audio export completed successfully!',
      variant: 'default'
    });
  } catch (error) {
    console.error('Error exporting audio:', error);
    onStatus(false);
    onProgress('');
    toast({
      title: 'Export Error',
      description: `Error exporting audio: ${error instanceof Error ? error.message : 'Unknown error'}`,
      variant: 'destructive'
    });
  }
}
