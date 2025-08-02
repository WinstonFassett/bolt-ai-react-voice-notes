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
 * Format duration in seconds to a readable string
 */
const formatDuration = (seconds: number): string => {
  // Handle invalid values
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '0s';
  }
  
  // Round to nearest second
  const roundedSeconds = Math.round(seconds);
  
  // Format as MM:SS for longer durations
  if (roundedSeconds >= 60) {
    const minutes = Math.floor(roundedSeconds / 60);
    const remainingSeconds = roundedSeconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  
  // Just show seconds for short clips
  return `${roundedSeconds}s`;
};

/**
 * Component that lists audio files and offers on-demand optimization
 */
export default function AudioOptimizationPanel() {
  const { notes, updateNote } = useNotesStore();
  const [audioFiles, setAudioFiles] = useState<AudioFileInfo[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizingFile, setOptimizingFile] = useState<string | null>(null);
  const [progress, setProgress] = useState('');
  const [optimizedCount, setOptimizedCount] = useState(0);
  const [showOptimized, setShowOptimized] = useState(false);

  // Scan for audio files
  const scanForAudioFiles = async () => {
    setIsScanning(true);
    try {
      const files = await identifyLargeAudioFiles(notes);
      setAudioFiles(files);
    } catch (error) {
      console.error('Error scanning for audio files:', error);
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
      setProgress('Preparing audio for optimization...');
      const optimizedUrl = await optimizeNoteAudio(note, (msg) => setProgress(msg));
      
      // Update the note with optimized audio
      setProgress('Saving optimized audio...');
      await updateNote({
        ...note,
        audioUrl: optimizedUrl,
        optimizedAudio: true
      });
      
      // Update file in the list to show as optimized
      setAudioFiles(prev => prev.map(f => 
        f.noteId === file.noteId 
          ? { ...f, optimized: true } 
          : f
      ));
      
      // Increment optimized count
      setOptimizedCount(prev => prev + 1);
      
      // Show success message
      setProgress('Audio successfully optimized!');
      setTimeout(() => setProgress(''), 2000); // Clear message after 2 seconds
    } catch (error) {
      reportError(error as Error);
      console.error('Error optimizing file:', error);
      
      // Show error message to user
      setProgress(`Error: ${(error as Error).message || 'Failed to optimize audio'}`);
      setTimeout(() => setProgress(''), 3000); // Clear error after 3 seconds
    } finally {
      setIsOptimizing(false);
      setOptimizingFile(null);
    }
  };

  // Optimize all files
  const optimizeAllFiles = async () => {
    setIsOptimizing(true);
    setOptimizedCount(0);
    
    for (const file of audioFiles) {
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
    await scanForAudioFiles();
    
    setIsOptimizing(false);
    setOptimizingFile(null);
    setProgress('All optimizations complete!');
    setTimeout(() => setProgress(''), 3000);
  };

  // Calculate total potential savings
  const totalSavings = calculateTotalSavings(audioFiles);
  
  // Format for display
  const formattedSavings = formatBytes(totalSavings);

  // No automatic scanning on mount - completely on-demand

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
      <h3 className="text-lg font-medium text-orange-800 mb-2">
        Audio Optimization
      </h3>
      
      {isScanning ? (
        <p className="text-sm text-orange-600">Scanning for audio files...</p>
      ) : (
        <>
          <p className="text-sm text-orange-700 mb-3">
            {audioFiles.length > 0 ? (
              <>
                Found {audioFiles.length} audio {audioFiles.length === 1 ? 'file' : 'files'} that can be optimized.
                Potential space savings: <strong>{formattedSavings}</strong>
              </>
            ) : (
              'Click "Scan for Audio Files" to find audio files that can be optimized.'
            )}
          </p>
          
          <div className="flex justify-between items-center">
            <button
              onClick={optimizeAllFiles}
              disabled={isOptimizing}
              className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
            >
              Optimize All Files
            </button>
            
            <button
              onClick={scanForAudioFiles}
              disabled={isOptimizing}
              className="text-orange-600 hover:text-orange-800 text-sm disabled:opacity-50"
            >
              Scan for Audio Files
            </button>
          </div>
          {audioFiles.length > 0 && (
            <div className="space-y-3">
              
              {isOptimizing && (
                <div className="text-sm text-orange-600">
                  {progress} {optimizedCount > 0 && `(${optimizedCount}/${audioFiles.length} complete)`}
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
                    {audioFiles.map(file => (
                      <tr key={file.noteId} className="border-t border-orange-200">
                        <td className="py-2 pr-2 truncate max-w-[150px]">{file.title}</td>
                        <td className="py-2 pr-2">{formatBytes(file.size)}</td>
                        <td className="py-2 pr-2">{formatDuration(file.duration)}</td>
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
