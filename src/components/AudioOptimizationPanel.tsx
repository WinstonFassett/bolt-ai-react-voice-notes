import React, { useState, useEffect } from 'react';
import { useNotesStore } from '../stores/notesStore';
import { 
  AudioFileInfo, 
  identifyLargeAudioFiles, 
  formatBytes, 
  calculateTotalSavings,
  optimizeNoteAudio
} from '../services/audioOptimizationService';

/**
 * Component that identifies large audio files and offers optimization
 */
export default function AudioOptimizationPanel() {
  const { notes, updateNote } = useNotesStore();
  const [largeFiles, setLargeFiles] = useState<AudioFileInfo[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizingFile, setOptimizingFile] = useState<string | null>(null);
  const [progress, setProgress] = useState('');
  const [optimizedCount, setOptimizedCount] = useState(0);

  // Scan for large audio files
  const scanForLargeFiles = async () => {
    setIsScanning(true);
    try {
      const files = await identifyLargeAudioFiles(notes);
      setLargeFiles(files);
    } catch (error) {
      console.error('Error scanning for large files:', error);
    } finally {
      setIsScanning(false);
    }
  };

  // Optimize a single file
  const optimizeSingleFile = async (file: AudioFileInfo) => {
    setIsOptimizing(true);
    setOptimizingFile(file.noteId);
    
    try {
      // Find the note
      const note = notes.find(n => n.id === file.noteId);
      if (!note) throw new Error('Note not found');
      
      // Optimize the audio
      const optimizedUrl = await optimizeNoteAudio(note, (msg) => setProgress(msg));
      
      // Update the note with optimized audio
      await updateNote({
        ...note,
        audioUrl: optimizedUrl,
        optimizedAudio: true
      });
      
      // Remove from large files list
      setLargeFiles(prev => prev.filter(f => f.noteId !== file.noteId));
      
      // Increment optimized count
      setOptimizedCount(prev => prev + 1);
      
      // Show success message
      setProgress('Optimization complete!');
      setTimeout(() => setProgress(''), 3000);
    } catch (error) {
      console.error('Error optimizing file:', error);
      setProgress(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setProgress(''), 5000);
    } finally {
      setIsOptimizing(false);
      setOptimizingFile(null);
    }
  };

  // Optimize all files
  const optimizeAllFiles = async () => {
    setIsOptimizing(true);
    setOptimizedCount(0);
    
    for (const file of largeFiles) {
      setOptimizingFile(file.noteId);
      
      try {
        // Find the note
        const note = notes.find(n => n.id === file.noteId);
        if (!note) continue;
        
        // Optimize the audio
        setProgress(`Optimizing "${file.title}"...`);
        const optimizedUrl = await optimizeNoteAudio(note, (msg) => setProgress(msg));
        
        // Update the note with optimized audio
        await updateNote({
          ...note,
          audioUrl: optimizedUrl,
          optimizedAudio: true
        });
        
        // Increment optimized count
        setOptimizedCount(prev => prev + 1);
        
        // Brief pause between files
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error('Error optimizing file:', error);
        // Continue with next file
      }
    }
    
    // Rescan to update the list
    await scanForLargeFiles();
    
    setIsOptimizing(false);
    setOptimizingFile(null);
    setProgress('All optimizations complete!');
    setTimeout(() => setProgress(''), 3000);
  };

  // Calculate total potential savings
  const totalSavings = calculateTotalSavings(largeFiles);
  
  // Format for display
  const formattedSavings = formatBytes(totalSavings);

  // Initial scan on mount
  useEffect(() => {
    scanForLargeFiles();
  }, [notes.length]); // Re-scan when notes change

  if (largeFiles.length === 0 && !isScanning) {
    return null; // Don't show anything if no large files found
  }

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
      <h3 className="text-lg font-medium text-orange-800 mb-2">
        Audio Optimization
      </h3>
      
      {isScanning ? (
        <p className="text-sm text-orange-600">Scanning for large audio files...</p>
      ) : (
        <>
          <p className="text-sm text-orange-700 mb-3">
            {largeFiles.length > 0 ? (
              <>
                Found {largeFiles.length} large audio {largeFiles.length === 1 ? 'file' : 'files'} that could be optimized.
                Potential space savings: <strong>{formattedSavings}</strong>
              </>
            ) : (
              'No large audio files found.'
            )}
          </p>
          
          {largeFiles.length > 0 && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <button
                  onClick={optimizeAllFiles}
                  disabled={isOptimizing}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
                >
                  Optimize All Files
                </button>
                
                <button
                  onClick={scanForLargeFiles}
                  disabled={isOptimizing}
                  className="text-orange-600 hover:text-orange-800 text-sm disabled:opacity-50"
                >
                  Rescan
                </button>
              </div>
              
              {isOptimizing && (
                <div className="text-sm text-orange-600">
                  {progress} {optimizedCount > 0 && `(${optimizedCount}/${largeFiles.length} complete)`}
                </div>
              )}
              
              <div className="max-h-60 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-orange-700">
                    <tr>
                      <th className="pb-2">Title</th>
                      <th className="pb-2">Size</th>
                      <th className="pb-2">Duration</th>
                      <th className="pb-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {largeFiles.map(file => (
                      <tr key={file.noteId} className="border-t border-orange-200">
                        <td className="py-2 pr-2 truncate max-w-[150px]">{file.title}</td>
                        <td className="py-2 pr-2">{formatBytes(file.size)}</td>
                        <td className="py-2 pr-2">{Math.round(file.duration)}s</td>
                        <td className="py-2">
                          <button
                            onClick={() => optimizeSingleFile(file)}
                            disabled={isOptimizing}
                            className={`text-xs px-2 py-1 rounded ${
                              optimizingFile === file.noteId
                                ? 'bg-orange-200 text-orange-800'
                                : 'bg-orange-100 hover:bg-orange-200 text-orange-800'
                            } disabled:opacity-50`}
                          >
                            {optimizingFile === file.noteId ? 'Optimizing...' : 'Optimize'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
