import JSZip from 'jszip';
import { Note } from '../stores/notesStore';
import { audioStorage } from '../utils/audioStorage';

/**
 * Service for importing audio files into notes
 */
export interface ImportProgressCallback {
  (message: string): void;
}

export interface ImportStatusCallback {
  (isImporting: boolean): void;
}

export interface NoteUpdateCallback {
  (noteId: string, audioUrl: string): void;
}

/**
 * Imports audio files from a zip file and associates them with notes
 * Uses batch processing to avoid memory issues on iOS
 */
export async function importAudioFiles(
  file: File,
  notes: Note[],
  onProgress: ImportProgressCallback,
  onStatusChange: ImportStatusCallback,
  onNoteUpdate: NoteUpdateCallback
): Promise<void> {
  // Check if it's a zip file
  if (file.type !== 'application/zip' && !file.name.endsWith('.zip')) {
    alert('Please select a zip file containing audio recordings');
    return;
  }
  
  // Show loading UI
  onStatusChange(true);
  onProgress('Preparing to import audio...');
  
  try {
    // Read the zip file
    onProgress('Reading zip file...');
    
    // Use JSZip to load the file
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(file);
    
    // Get all audio files from the zip
    const audioFiles = Object.values(zipContent.files).filter(zipEntry => 
      !zipEntry.dir && 
      (zipEntry.name.endsWith('.webm') || 
       zipEntry.name.endsWith('.mp3') || 
       zipEntry.name.endsWith('.m4a') || 
       zipEntry.name.endsWith('.wav'))
    );
    
    if (audioFiles.length === 0) {
      alert('No audio files found in the zip file');
      onStatusChange(false);
      onProgress('');
      return;
    }
    
    // Process in small batches to avoid memory issues on iOS
    const batchSize = 3;
    const totalFiles = audioFiles.length;
    let processedCount = 0;
    let successCount = 0;
    
    // Process files in batches
    for (let i = 0; i < audioFiles.length; i += batchSize) {
      const batch = audioFiles.slice(i, i + batchSize);
      
      // Update progress
      onProgress(`Processing audio files ${i + 1}-${Math.min(i + batch.length, totalFiles)} of ${totalFiles}`);
      
      // Process each file in the batch
      for (const zipEntry of batch) {
        try {
          const filename = zipEntry.name;
          
          // Update progress
          processedCount++;
          onProgress(`Processing audio files (${successCount}/${totalFiles})... (${processedCount} processed)`);
          
          // Extract note ID from filename
          // Expected format: title_noteId.extension
          const noteIdMatch = filename.match(/_([0-9]+)\.[a-z0-9]+$/i);
          
          if (!noteIdMatch) {
            console.warn(`Skipping file ${filename} - cannot parse note ID`);
            continue;
          }
          
          const noteId = noteIdMatch[1];
          
          // Find the note with this ID
          const note = notes.find(n => n.id === noteId);
          
          if (!note) {
            console.warn(`Note with ID ${noteId} not found, skipping audio import`);
            continue;
          }
          
          try {
            // Get the blob from the zip file
            const blob = await zipEntry.async('blob');
            
            if (blob.size === 0) {
              console.error(`Empty blob for file ${filename}`);
              continue;
            }
            
            // Determine MIME type from extension
            const extension = filename.split('.').pop()?.toLowerCase() || 'webm';
            let mimeType = 'audio/webm';
            if (extension === 'mp3') mimeType = 'audio/mpeg';
            if (extension === 'wav') mimeType = 'audio/wav';
            if (extension === 'm4a') mimeType = 'audio/mp4';
            
            // Store the audio
            const storageId = `recording_${note.id}_${Date.now()}`;
            const audioUrl = await audioStorage.saveAudio(blob, storageId, mimeType);
            
            // The saveAudio method already returns the storage URL in the format 'audio-storage://filename'
            
            // Call the update callback
            onNoteUpdate(noteId, audioUrl);
            
            successCount++;
          } catch (blobError) {
            console.error(`Error processing blob for file ${filename}:`, blobError);
          }
        } catch (fileError) {
          console.error(`Error processing file:`, fileError);
        }
      }
      
      // Force garbage collection opportunity by yielding to the event loop
      // This helps prevent memory buildup on iOS
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    // Show completion message
    if (successCount > 0) {
      onProgress(`Imported ${successCount} audio files successfully!`);
      setTimeout(() => {
        onStatusChange(false);
        onProgress('');
        alert(`Successfully imported ${successCount} audio files.`);
      }, 1000);
    } else {
      onStatusChange(false);
      onProgress('');
      alert('No audio files could be imported.');
    }
  } catch (error) {
    console.error('Error importing audio files:', error);
    onStatusChange(false);
    onProgress('');
    alert('Error importing audio files: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}
