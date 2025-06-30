import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PlayIcon, 
  PauseIcon, 
  XMarkIcon,
  BackwardIcon,
  ForwardIcon
} from '@heroicons/react/24/solid';
import { isStorageUrl, getStorageId } from '../../utils/audioStorage';
import { useAudioStore } from '../../stores/audioStore';

interface GlobalAudioPlayerProps {
  currentPlayingAudioUrl: string | null;
  globalIsPlaying: boolean;
  globalAudioDuration: number;
  globalAudioCurrentTime: number;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onClose: () => void;
  notes: Array<{id: string; title: string; audioUrl?: string; duration?: number}>;
  onSelectNote?: (noteId: string) => void;
}

export const GlobalAudioPlayer: React.FC<GlobalAudioPlayerProps> = ({
  currentPlayingAudioUrl,
  globalIsPlaying,
  globalAudioDuration,
  globalAudioCurrentTime,
  onPlayPause,
  onSeek,
  onClose,
  notes,
  onSelectNote
}) => {
  const { setIsUserInteracting } = useAudioStore();
  
  const formatTime = (seconds: number) => {
    if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Find the note that matches the current playing audio
  const currentNote = notes.find(note => note.audioUrl === currentPlayingAudioUrl);
  const displayTitle = currentNote?.title || 'Audio Playback';
  
  // ALWAYS use the note's stored duration - never let the audio element override it
  // The note duration is the actual recorded duration and should never change
  const effectiveDuration = currentNote?.duration || 0;
  
  // Only use globalAudioDuration for progress calculation if we don't have a stored duration
  const progressDuration = effectiveDuration > 0 ? effectiveDuration : globalAudioDuration;

  const handleTitleClick = () => {
    if (currentNote && onSelectNote) {
      onSelectNote(currentNote.id);
    }
  };
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Mark user interaction
    setIsUserInteracting(true);
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = percentage * progressDuration;
    console.log('Progress clicked, seeking to:', newTime);
    if (isFinite(newTime) && newTime >= 0) {
      onSeek(newTime);
    }
  };

  const handleSkipBackward = () => {
    setIsUserInteracting(true);
    const newTime = Math.max(0, globalAudioCurrentTime - 10);
    onSeek(newTime);
  };

  const handleSkipForward = () => {
    setIsUserInteracting(true);
    const newTime = Math.min(progressDuration, globalAudioCurrentTime + 10);
    onSeek(newTime);
  };
  
  const handlePlayPause = () => {
    setIsUserInteracting(true);
    console.log('GlobalAudioPlayer: Play/pause button clicked');
    onPlayPause();
  };
  
  const handleClose = () => {
    setIsUserInteracting(true);
    onClose();
  };

  const progressPercentage = progressDuration > 0 
    ? (globalAudioCurrentTime / progressDuration) * 100 
    : 0;
    
  // Ensure progress percentage is valid
  const safeProgressPercentage = isFinite(progressPercentage) && progressPercentage >= 0 
    ? Math.min(100, progressPercentage) 
    : 0;

  if (!currentPlayingAudioUrl) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="fixed bottom-24 left-4 right-4 z-30 max-w-md mx-auto"
      >
        <div className="bg-gray-900/90 backdrop-blur-xl border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4">
              {/* Header with Close Button */}
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={handleTitleClick}
                  className="text-sm text-white font-medium hover:text-indigo-400 transition-colors text-left flex-1 truncate cursor-pointer"
                  disabled={!currentNote || !onSelectNote}
                >
                  {displayTitle}
                </button>
                <button
                  onClick={onClose}
                  className="w-6 h-6 rounded-full hover:bg-gray-700 flex items-center justify-center transition-colors"
                >
                  <XMarkIcon className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              {/* Progress Bar */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs text-gray-400 font-mono w-10">
                  {formatTime(globalAudioCurrentTime)}
                </span>
                <div 
                  className="flex-1 h-2 bg-gray-700 rounded-full cursor-pointer"
                  onClick={handleProgressClick}
                >
                  <div 
                    className="h-full bg-indigo-500 rounded-full transition-all duration-100"
                    style={{ 
                      width: `${safeProgressPercentage}%` 
                    }}
                  />
                </div>
                <span className="text-xs text-gray-400 font-mono w-10">
                  {formatTime(progressDuration)}
                </span>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-2">
                {/* Skip Backward 5s */}
                <button
                  onClick={handleSkipBackward}
                  className="w-10 h-10 rounded-full hover:bg-gray-700 flex items-center justify-center transition-colors"
                  title="Skip back 10 seconds"
                >
                  <BackwardIcon className="w-5 h-5 text-gray-300" />
                </button>

                {/* Play/Pause */}
                <button
                  onClick={handlePlayPause}
                  className="w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center transition-colors"
                  type="button"
                >
                  {globalIsPlaying ? (
                    <PauseIcon className="w-6 h-6 text-white" />
                  ) : (
                    <PlayIcon className="w-6 h-6 text-white ml-0.5" />
                  )}
                </button>

                {/* Skip Forward 10s */}
                <button
                  onClick={handleSkipForward}
                  className="w-10 h-10 rounded-full hover:bg-gray-700 flex items-center justify-center transition-colors"
                  title="Skip forward 10 seconds"
                >
                  <ForwardIcon className="w-5 h-5 text-gray-300" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};