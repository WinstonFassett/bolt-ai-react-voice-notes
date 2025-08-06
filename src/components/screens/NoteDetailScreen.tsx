import {
  ArrowLeftIcon,
  DocumentDuplicateIcon,
  PauseIcon,
  PlayIcon,
  SparklesIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  ShareIcon
} from '@heroicons/react/24/outline';
import { AnimatePresence, motion } from 'framer-motion';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import 'share-api-polyfill';
import { useAgentsStore } from '../../stores/agentsStore';
import { useAudioStore } from '../../stores/audioStore';
import { resolveStorageUrl } from '../../utils/audioStorage';
import { Note, useNotesStore } from '../../stores/notesStore';
import { useTranscriptionStore } from '../../stores/transcriptionStore';
import { BottomNavigation } from '../BottomNavigation';
import { CrepeEditorWrapper } from '../CrepeEditor';
import { RunAgentsDialog } from '../RunAgentsDialog';
import { TakeawayCard } from '../TakeawayCard';
import { ModelLoadingProgress } from '../ModelLoadingProgress';

interface NoteDetailScreenProps {
  note: Note;
  onBack: () => void;
  activeTab: 'record' | 'library' | 'agents' | 'settings';
  onTabChange: (tab: 'record' | 'library' | 'agents' | 'settings') => void;
}

export const NoteDetailScreen: React.FC<NoteDetailScreenProps> = ({
  note,
  onBack,
  activeTab,
  onTabChange,
}) => {
  // console.log('NoteDetailScreen', note);
  // Get everything from stores
  const { 
    playAudio, 
    currentPlayingAudioUrl, 
    globalIsPlaying, 
    globalAudioDuration, 
    globalAudioCurrentTime,
    setIsUserInteracting 
  } = useAudioStore();
  
  const { 
    canRunAnyAgents, 
    isProcessing: agentsProcessing,
    processingStatus: agentsStatus
  } = useAgentsStore();
  
  const { 
    notes, 
    updateNote, 
    deleteNote, 
    updateTags 
  } = useNotesStore();
  
  const { 
    startTranscriptionFromUrl,
    isNoteProcessing,
    getNoteProcessingStatus,
    getNoteProgressItems
  } = useTranscriptionStore();
  const navigate = useNavigate();
  
  // Simplified state management - no separate editing state
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [tagInput, setTagInput] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRetranscribeConfirm, setShowRetranscribeConfirm] = useState(false);
  const [showRunAgentsDialog, setShowRunAgentsDialog] = useState(false);

  // Import functionality removed as it's handled elsewhere

  // Check if this is an agent-generated note
  const isAgentNote = note?.type === 'agent';
  const sourceNote = isAgentNote && note.sourceNoteIds?.[0] 
    ? notes.find(n => n.id === note.sourceNoteIds![0])
    : null;
  
  // Get transcription status for this specific note
  const isTranscribing = note ? isNoteProcessing(note.id) : false;
  const transcriptionStatus = note ? getNoteProcessingStatus(note.id) : '';
  
  // Get child notes (notes that have this note as their source)
  const childNotes = notes.filter(n => 
    n.sourceNoteIds?.includes(note.id)
  );

  // Update local state when note prop changes (for reactive updates)
  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content || '');
    }
  }, [note]);

  // Force editor to update when content changes from transcription
  useEffect(() => {
    if (note?.content && note.content !== content) {
      setContent(note.content);
    }
  }, [note?.content]);


  // No need for edit mode toggle effects - always in edit mode
  // Content is saved in real-time

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    if (note) {
      updateNote({ ...note, title: newTitle });
    }
  };

  const handleEditorChange = (newContent: string) => {
    setContent(newContent);
    if (note) {
      updateNote({ ...note, content: newContent });
    }
  };

  const handleRetranscribe = async () => {
    setShowRetranscribeConfirm(false);
    
    // Clear current content
    setContent('');
    updateNote({ ...note, content: '' });
    
    // Start transcription from URL - this handles storage URLs properly
    startTranscriptionFromUrl(note.audioUrl ?? '', note.id);
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim() && note) {
      const newTag = tagInput.trim();
      if (!note.tags.includes(newTag)) {
        const newTags = [...note.tags, newTag];
        updateTags(note.id, newTags);
        setTagInput('');
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (note) {
      const newTags = note.tags.filter(tag => tag !== tagToRemove);
      updateTags(note.id, newTags);
    }
  };

  const handleShareAudio = async () => {
    if (!note.audioUrl) {
      alert('No audio available to share');
      return;
    }

    // Check if Web Share API is supported at all
    if (!('share' in navigator)) {
      alert('Sharing is not supported on this browser');
      return;
    }

    try {
      // First try simple sharing without the file
      if ('canShare' in navigator) {
        // Check if file sharing is supported
        const supportsFileSharing = await new Promise(resolve => {
          const testFile = new File([""], "test.txt", { type: "text/plain" });
          resolve(navigator.canShare({ files: [testFile] }));
        });

        if (supportsFileSharing) {
          // Resolve the storage URL to get the actual blob URL
          const resolvedAudio = await resolveStorageUrl(note.audioUrl);
          if (!resolvedAudio) {
            alert('Could not access the audio file');
            return;
          }

          // Fetch the audio as a blob
          const response = await fetch(resolvedAudio.url);
          const blob = await response.blob();

          // Create a file from the blob
          const fileName = `${note.title.replace(/\s+/g, '_')}_audio.${resolvedAudio.mimeType.split('/')[1] || 'webm'}`;
          const file = new File([blob], fileName, { type: resolvedAudio.mimeType });

          // Share the file
          // Use type assertion to help TypeScript recognize Web Share API
          const navigatorWithShare = navigator as Navigator & {
            share: (data: { files?: File[], title?: string, text?: string, url?: string }) => Promise<void>;
          };
          
          await navigatorWithShare.share({
            title: note.title,
            text: 'Audio recording from Bolt AI Voice Notes',
            files: [file]
          });
          console.log('Audio shared successfully with file');
        } else {
          // Fallback for browsers that don't support file sharing
          const navigatorWithShare = navigator as Navigator & {
            share: (data: { files?: File[], title?: string, text?: string, url?: string }) => Promise<void>;
          };
          
          await navigatorWithShare.share({
            title: note.title,
            text: 'Audio recording from Bolt AI Voice Notes'
          });
          console.log('Shared without file (file sharing not supported)');
        }
      } else {
        // Basic share fallback
        const navigatorWithShare = navigator as Navigator & {
          share: (data: { files?: File[], title?: string, text?: string, url?: string }) => Promise<void>;
        };
        
        await navigatorWithShare.share({
          title: note.title,
          text: 'Audio recording from Bolt AI Voice Notes'
        });
        console.log('Shared with basic share API');
      }
    } catch (error) {
      console.error('Error sharing audio:', error);
      alert('Could not share the audio file');
    }
  };

  const handleCopyToClipboard = () => {
    const textContent = content.replace(/<[^>]*>/g, '');
    try {
      const clipboardData = new ClipboardItem({
        'text/html': new Blob([content], { type: 'text/html' }),
        'text/plain': new Blob([textContent], { type: 'text/plain' })
      });
      navigator.clipboard.write([clipboardData]);
    } catch (err) {
      navigator.clipboard.writeText(textContent);
    }
  };

  const handlePlayAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    console.log('🎵 NoteDetailScreen: Play button clicked', { 
      audioUrl: note.audioUrl,
      timestamp: new Date().toISOString()
    });
    
    // Mark user interaction immediately
    setIsUserInteracting(true);
    
    if (!note.audioUrl) {
      // Show user-friendly error instead of silent failure
      console.error('❌ NoteDetailScreen: No audio URL available');
      alert('❌ No audio recording available for this note');
      return;
    }
    playAudio(note.audioUrl);
  };

  const isCurrentlyPlaying = note.audioUrl === currentPlayingAudioUrl && globalIsPlaying;
  
  // ALWAYS use the note's stored duration - never let the audio element override it
  // The note duration is the actual recorded duration and should never change
  const effectiveDuration = note.duration || 0;
  
  // Only use globalAudioDuration for progress calculation if we don't have a stored duration
  const progressDuration = effectiveDuration > 0 ? effectiveDuration : globalAudioDuration;
  
  // Get agent-generated takeaways for this note
  const takeawayNotes = note.takeaways 
    ? notes.filter(n => note.takeaways?.includes(n.id))
    : [];
  const getWordCount = (text: string) => {
    const strippedText = text.replace(/<[^>]*>/g, '');
    return strippedText.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const getCharacterCount = (text: string) => {
    const strippedText = text.replace(/<[^>]*>/g, '');
    return strippedText.length;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Helper function to truncate content while preserving markdown formatting
  const truncateContent = (content: string, maxLength: number = 120) => {
    if (!content) return '';
    return content.length > maxLength ? content.slice(0, maxLength) + '...' : content;
  };

  const handleDeleteNote = () => {
    deleteNote(note.id);
    onBack();
  };

  const handleDeleteAudio = () => {
    setShowDeleteAudioConfirm(true);
  };

  const handleDownloadAudio = async () => {
    if (!note.audioUrl) {
      alert('No audio available to download');
      return;
    }

    try {
      // Resolve the storage URL to get the actual blob URL
      const resolvedAudio = await resolveStorageUrl(note.audioUrl);
      if (!resolvedAudio) {
        alert('Could not access the audio file');
        return;
      }

      // Create a download link
      const downloadLink = document.createElement('a');
      downloadLink.href = resolvedAudio.url;
      
      // Set a filename based on the note title
      const fileExtension = resolvedAudio.mimeType.split('/')[1] || 'webm';
      const fileName = `${note.title.replace(/\s+/g, '_')}_audio.${fileExtension}`;
      downloadLink.download = fileName;
      
      // Trigger the download
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      console.log('Audio download initiated');
    } catch (error) {
      console.error('Error downloading audio:', error);
      alert('Could not download the audio file');
    }
  };

  const [showDeleteAudioConfirm, setShowDeleteAudioConfirm] = useState(false);

  const handleConfirmDeleteAudio = () => {
    if (note.audioUrl) {
      const updatedNote = { ...note, audioUrl: undefined, duration: undefined };
      updateNote(updatedNote);
    }
    setShowDeleteAudioConfirm(false);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Import status is used elsewhere in the component
  // The import function is handled in a different component

  if (!note) {
    return null;
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 relative">
      {/* Import status feedback removed - handled elsewhere */}
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="safe-area-top py-4 px-4 border-b border-gray-800"
      >
        <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <ArrowLeftIcon className="w-6 h-6 text-white" />
          </button>
          
          {/* Show source note link for agent notes */}
          {isAgentNote && sourceNote && (
            <button
              onClick={() => navigate(`/note/${sourceNote.id}`)}
              className="flex items-center gap-2 px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <span className="text-sm text-gray-300">Source:</span>
              <span className="text-sm text-white truncate max-w-32">{sourceNote.title}</span>
            </button>
          )}
          
          {/* No edit toggle needed - always in edit mode */}
          
          {/* Simple delete button */}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 rounded-lg hover:bg-red-600/20 transition-colors"
            title="Delete note"
          >
            <TrashIcon className="w-5 h-5 text-red-400" />
          </button>
        </div>
        </div>
      </motion.header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-4 pb-24">
        <div className="max-w-4xl mx-auto">
        <div className="space-y-6 py-4">
          {/* Title and Stats */}
          <div className="space-y-4">
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              className="w-full text-2xl font-bold bg-transparent text-white placeholder-gray-400 
                       border-none outline-none focus:ring-0"
              placeholder="Note Title"
              disabled={false}
            />
            
            <div className="flex items-center justify-between text-sm text-gray-400">
              <div className="flex items-center gap-4">
                <span>Words: {getWordCount(content)}</span>
                <span>Characters: {getCharacterCount(content)}</span>
                {effectiveDuration > 0 && <span>Duration: {formatDuration(effectiveDuration)}</span>}
              </div>
              <div>
                Last edited: {formatDate(note.lastEdited)}
              </div>
            </div>
          </div>

          {/* Audio Player */}
          {note.audioUrl && (
            <div className="card">
              <div className="flex items-center gap-4">
                <button
                  onClick={handlePlayAudio}
                  className="w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center transition-colors"
                >
                  {isCurrentlyPlaying ? (
                    <PauseIcon className="w-5 h-5 text-white" />
                  ) : (
                    <PlayIcon className="w-5 h-5 text-white ml-0.5" />
                  )}
                </button>
                <div>
                  <div className="text-sm text-gray-300">Audio Recording</div>
                  <div className="text-xs text-gray-400">
                    {isCurrentlyPlaying ? (
                      `${formatTime(globalAudioCurrentTime)} / ${formatTime(progressDuration)}`
                    ) : (
                      effectiveDuration > 0 ? `Duration: ${formatDuration(effectiveDuration)}` : 'Click to play'
                    )}
                  </div>
                </div>

                <div className="flex-1"></div>
                {/* Audio Controls */}
                <div className="flex items-center gap-1">
                  {/* Retranscribe button */}
                  {!isTranscribing && (
                    <button
                      onClick={() => setShowRetranscribeConfirm(true)}
                      className="p-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 transition-colors"
                      title="Re-transcribe audio"
                    >
                      <SparklesIcon className="w-4 h-4 text-indigo-400" />
                    </button>
                  )}
                  <button 
                    onClick={handleDownloadAudio}
                    className="p-2 text-gray-400 hover:text-indigo-500 transition-colors ml-auto"
                    aria-label="Download audio"
                    title="Download audio"
                  >
                    <ArrowDownTrayIcon className="h-5 w-5" />
                  </button>
                  
                  {/* Only show share button if Web Share API is supported */}
                  {typeof navigator !== 'undefined' && 'share' in navigator && (
                    <button 
                      onClick={handleShareAudio}
                      className="p-2 text-gray-400 hover:text-indigo-500 transition-colors"
                      aria-label="Share audio"
                      title="Share audio"
                    >
                      <ShareIcon className="h-5 w-5" />
                    </button>
                  )}
                  
                  <button
                    onClick={handleDeleteAudio}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    aria-label="Delete audio"
                    title="Delete audio recording"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Show transcription/model loading status */}
          {isTranscribing && (
            <>
              <ModelLoadingProgress
                isVisible={true}
                progressItems={getNoteProgressItems(note.id)}
                className="mb-4"
              />
              {/* Show generic status when not loading model */}
              {!getNoteProgressItems(note.id).length && (
                <div className="card">
                  <div className="flex items-center gap-3">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full"
                    />
                    <span className="text-sm text-indigo-300 font-medium">
                      {transcriptionStatus || 'Processing...'}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Tags */}
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {note.tags.map(tag => (
                <span 
                  key={tag} 
                  className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-600/20 text-indigo-300 
                           rounded-full text-sm border border-indigo-600/30"
                >
                  {tag}
                  {!isAgentNote && (
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 text-indigo-400 hover:text-indigo-200"
                  >
                    ×
                  </button>
                  )}
                </span>
              ))}
            </div>
            {!isAgentNote && (
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={handleAddTag}
              placeholder="Add tags (press Enter)"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg 
                       text-white placeholder-gray-400 focus:outline-none focus:ring-2 
                       focus:ring-indigo-500 focus:border-transparent"
            />
            )}
          </div>

          {/* Editor with floating copy button */}
          <div className="border border-gray-700 rounded-lg bg-gray-800 p-4 relative">
            {/* Floating copy button */}
            <button
              onClick={handleCopyToClipboard}
              className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-1 bg-gray-700/80 hover:bg-gray-600/80 
                        text-white text-sm rounded-lg transition-colors shadow-md"
              title="Copy content"
            >
              <DocumentDuplicateIcon className="w-4 h-4" />
              Copy
            </button>
            
            <CrepeEditorWrapper
              content={content}
              onChange={handleEditorChange}
              placeholder="Start writing your note..."
            />
          </div>
          {/* Agent note indicator with icon instead of text */}
          {isAgentNote && (
            <div className="flex items-center gap-2 text-sm text-indigo-400">
              <SparklesIcon className="w-4 h-4" />
              <span>AI Generated Content</span>
            </div>
          )}
         
          {/* Child Notes */}
          {childNotes.length > 0 && (
            <div className="space-y-3 mt-6">
              <h3 className="text-lg font-semibold text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isAgentNote ? (
                    <SparklesIcon className="w-5 h-5 text-indigo-400" />
                  ) : (
                    <DocumentDuplicateIcon className="w-5 h-5 text-gray-400" />
                  )}
                  Related Notes
                </div>
                <span className="text-sm text-gray-400 font-normal">
                  {childNotes.length} notes
                </span>
              </h3>
              <div className="space-y-3">
                {childNotes
                  .sort((a, b) => b.lastEdited - a.lastEdited)
                  .map((childNote) => (
                    <div 
                      key={childNote.id}
                      className={`p-4 rounded-lg border cursor-pointer hover:bg-gray-800/50 transition-colors
                                ${childNote.type === 'agent' ? 'border-l-4 border-l-primary border-gray-700' : 'border-gray-700'}`}
                      onClick={() => navigate(`/note/${childNote.id}`)}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {childNote.type === 'agent' ? (
                          <SparklesIcon className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                        ) : (
                          <DocumentDuplicateIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        )}
                        <h4 className="font-medium text-white">{childNote.title}</h4>
                      </div>
                      <p className="text-sm text-gray-300 line-clamp-2">
                        {truncateContent(childNote.content, 120)}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          )}
          
          {/* AI Takeaways */}
          {!isAgentNote && takeawayNotes.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                <SparklesIcon className="w-5 h-5 text-indigo-400" />
                  Recent AI Takeaways
                </div>
                <span className="text-sm text-gray-400 font-normal">
                  {takeawayNotes.length} generated
                </span>
              </h3>
              <div className="space-y-3">
                {takeawayNotes
                  .sort((a, b) => (b.createdAt || b.created || 0) - (a.createdAt || a.created || 0))
                  .map((takeaway) => (
                    <TakeawayCard
                      key={takeaway.id}
                      takeaway={takeaway}
                      onSelect={(id) => navigate(`/note/${id}`)}
                      onDelete={(id) => deleteNote(id)}
                    />
                ))}
              </div>
            </div>
          )}
          
          {/* AI Agents Section Header with Button */}
          {canRunAnyAgents() && content.trim() && (
            <div className="flex flex-wrap items-center justify-between gap-3 mt-6">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <SparklesIcon className="w-5 h-5 text-indigo-400" />
                AI Tools
              </h3>
              <button
                onClick={() => setShowRunAgentsDialog(true)}
                disabled={agentsProcessing}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 
                         disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                <SparklesIcon className="w-5 h-5" />
                Run AI Agents
              </button>
            </div>
          )}

          {/* Agent Processing Status */}
          {agentsProcessing && (
            <div className="card bg-indigo-900/20 border-indigo-700/30">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full"
                />
                <div>
                  <h3 className="font-medium text-indigo-300">AI Agents Processing</h3>
                  <p className="text-sm text-indigo-400">{agentsStatus || 'Running agents...'}</p>
                </div>
              </div>
            </div>
          )}

        </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      {onTabChange && (
        <BottomNavigation activeTab={activeTab} onTabChange={onTabChange} />
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-gray-700"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Delete Note</h3>
              <p className="text-gray-300 mb-6">
                Are you sure you want to delete this note? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteNote}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Retranscribe Confirmation Modal */}
      <AnimatePresence>
        {showRetranscribeConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-gray-700"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Re-transcribe Audio</h3>
              <p className="text-gray-300 mb-6">
                This will replace the current content with a new transcription. This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowRetranscribeConfirm(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRetranscribe}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                >
                  Re-transcribe
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Run AI Agents Dialog */}
      <AnimatePresence>
        {showRunAgentsDialog && (
          <RunAgentsDialog
            isOpen={showRunAgentsDialog}
            onClose={() => setShowRunAgentsDialog(false)}
            noteId={note.id}
            onComplete={() => {
              // Refresh the page or update state as needed
              console.log('🤖 Agents completed running');
            }}
          />
        )}
      </AnimatePresence>
      
      {/* Delete Audio Confirmation Modal */}
      <AnimatePresence>
        {showDeleteAudioConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-gray-700"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Delete Audio Recording</h3>
              <p className="text-gray-300 mb-6">
                Are you sure you want to delete the audio recording? The text content will be preserved.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowDeleteAudioConfirm(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDeleteAudio}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  Delete Audio
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
      
  );
};