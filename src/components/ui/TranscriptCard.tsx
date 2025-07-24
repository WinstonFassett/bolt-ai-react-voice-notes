import React from 'react';
import { motion } from 'framer-motion';
import { 
  PlayIcon, 
  PauseIcon,
  ClockIcon, 
  TagIcon,
  EllipsisVerticalIcon,
  TrashIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

import { useAudioStore } from '../../stores/audioStore';

interface TranscriptCardProps {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: number;
  audioUrl?: string;
  duration?: number;
  takeaways?: string[];
  onClick: () => void;
  onDeleteClick: () => void;
  onPlayAudio?: (audioUrl: string) => void;
  currentPlayingAudioUrl?: string | null;
  globalIsPlaying?: boolean;
}

export const TranscriptCard: React.FC<TranscriptCardProps> = ({
  title,
  content,
  duration,
  tags,
  createdAt,
  audioUrl,
  takeaways,
  onClick,
  onDeleteClick,
  onPlayAudio,
  currentPlayingAudioUrl,
  globalIsPlaying
}) => {
  const { setIsUserInteracting, showError } = useAudioStore();
  
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMins = Math.floor(diffInHours * 60);
      return `${diffInMins} min ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const stripHtml = (html: string) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const truncateText = (text: string, maxLength: number) => {
    const stripped = stripHtml(text);
    if (stripped.length <= maxLength) return stripped;
    return stripped.substring(0, maxLength) + '...';
  };

  const handlePlayAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    console.log('🎵 TranscriptCard: Play button clicked', { 
      audioUrl, 
      hasOnPlayAudio: !!onPlayAudio,
      timestamp: new Date().toISOString()
    });
    
    // Mark user interaction immediately
    setIsUserInteracting(true);
    
    console.log('TranscriptCard: Play button clicked', { audioUrl, hasOnPlayAudio: !!onPlayAudio });
    
    if (!audioUrl) {
      console.error('❌ TranscriptCard: No audio URL available');
      showError('No audio file available for this note');
      return;
    }
    if (onPlayAudio) {
      onPlayAudio(audioUrl);
    } else {
      console.error('❌ TranscriptCard: onPlayAudio handler not available');
      showError('Audio player not available');
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteClick();
  };
  const isCurrentlyPlaying = audioUrl === currentPlayingAudioUrl && globalIsPlaying;
  
  // Show duration if available
  const hasDuration = duration && duration > 0;
  
  // Only show play button if we have audio
  const showPlayButton = Boolean(audioUrl);
  
  // Determine icon based on note type and content
  const getCardIcon = () => {
    if (showPlayButton) {
      // Has audio - show play button
      return (
        <button
          onClick={handlePlayAudio}
          className={`w-16 h-16 rounded-xl text-indigo-400 hover:text-indigo-300 flex items-center justify-center transition-all duration-200 ${
            takeaways && takeaways.length > 0 
              ? 'bg-indigo-600/30 hover:bg-indigo-600/40' 
              : 'bg-indigo-600/20 hover:bg-indigo-600/30'
          }`}
        >
          {isCurrentlyPlaying ? (
            <PauseIcon className="w-6 h-6" />
          ) : (
            <PlayIcon className="w-6 h-6" />
          )}
        </button>
      );
    } else if (takeaways && takeaways.length > 0) {
      // AI generated note without audio
      return (
        <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
          <span className="text-2xl">🤖</span>
        </div>
      );
    } else {
      // Manual note without audio
      return (
        <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-gray-600/20 text-gray-400 flex items-center justify-center">
          <span className="text-2xl">📝</span>
        </div>
      );
    }
  };
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:bg-gray-800/50 transition-all duration-200 cursor-pointer group max-w-full overflow-hidden"
    >
      <div className="flex items-start gap-4 mb-3">
        {/* AI Note Indicator */}
        {takeaways && takeaways.length > 0 && (
          <div className="flex-shrink-0 w-1 h-16 bg-indigo-500 rounded-full" title="Has AI takeaways" />
        )}
        
        {/* Dynamic Icon */}
        <div className="flex-shrink-0">
          {getCardIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="font-semibold text-white text-lg leading-tight flex-1">{title}</h3>
                
              </div>
              <div className="text-xs text-gray-400 mb-2">
                <div className="flex items-center gap-2">
                  <span className="whitespace-nowrap">{formatDate(createdAt)}</span>
                  {hasDuration && <span>• {formatDuration(duration)}</span>}
                  {takeaways && takeaways.length > 0 && (
                    <span className="flex items-center gap-1 text-indigo-400">
                      • <SparklesIcon className="w-3 h-3" /> {takeaways.length} AI takeaway{takeaways.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                {/* Tags below title */}
                {tags.length > 0 && (
                  <div className="flex items-center gap-1">
                    <TagIcon className="w-3 h-3" />
                    <div className="flex flex-wrap gap-1">
                      {tags.slice(0, 2).map((tag, index) => (
                        <span key={index} className="px-2 py-1 bg-gray-700 rounded-full">
                          {tag}
                        </span>
                      ))}
                      {tags.length > 2 && (
                        <span className="px-2 py-1 bg-gray-700 rounded-full">
                          +{tags.length - 2}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <button
              onClick={handleDeleteClick}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-600 rounded-lg flex-shrink-0"
              title="Delete note"
            >
              <TrashIcon className="w-4 h-4 text-red-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <p className="text-gray-300 text-sm leading-relaxed ml-20">
        {truncateText(content, 120)}
      </p>

      {/* Hover effect */}
      <motion.div
        className="absolute inset-0 rounded-lg border border-indigo-500/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        layoutId={`hover-${title}`}
      />
    </motion.div>
  );
};