import React, { useState } from 'react';
import { reportError } from '../services/errorReporting';
import { useNotesStore } from '../stores/notesStore';

interface AudioOptimizationButtonProps {
  noteId: string;
  className?: string;
}

/**
 * Button component that triggers audio optimization for a specific note
 * Shows optimization status and prevents multiple optimization attempts
 */
export const AudioOptimizationButton: React.FC<AudioOptimizationButtonProps> = ({ 
  noteId, 
  className = ''
}) => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [message, setMessage] = useState('');
  
  const { 
    getNoteById, 
    optimizeAudio, 
    isOptimizingAudio, 
    optimizationProgress 
  } = useNotesStore();
  
  const note = getNoteById(noteId);
  
  // If note doesn't exist or has no audio, don't render anything
  if (!note || !note.audioUrl) {
    return null;
  }
  
  // If audio is already optimized, show a badge instead of button
  if (note.optimizedAudio) {
    return (
      <span className={`text-xs text-green-600 font-medium px-2 py-1 bg-green-100 rounded-full ${className}`}>
        Optimized
      </span>
    );
  }
  
  const handleOptimize = async () => {
    setIsOptimizing(true);
    setMessage('Starting optimization...');
    
    try {
      await optimizeAudio(noteId);
      setMessage('Optimization complete!');
    } catch (error) {
      console.error('Error optimizing audio:', error);
      reportError(error instanceof Error ? error : new Error('Unknown error'), { 
        context: 'AudioOptimizationButton', 
        noteId 
      });
      setMessage(error instanceof Error ? error.message : 'Optimization failed');
    } finally {
      // Clear message after a delay
      setTimeout(() => {
        setMessage('');
        setIsOptimizing(false);
      }, 3000);
    }
  };
  
  // If global optimization is in progress, show the global progress
  if (isOptimizingAudio) {
    return (
      <div className={`flex items-center ${className}`}>
        <span className="text-xs text-blue-600 mr-2">{optimizationProgress}</span>
        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  // If local optimization is in progress, show local progress
  if (isOptimizing) {
    return (
      <div className={`flex items-center ${className}`}>
        <span className="text-xs text-blue-600 mr-2">{message}</span>
        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  // Regular button state
  return (
    <button
      onClick={handleOptimize}
      className={`text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1 rounded-md flex items-center ${className}`}
      title="Optimize audio to reduce file size and improve performance"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
      Optimize
    </button>
  );
};
