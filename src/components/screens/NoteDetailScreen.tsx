import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import 'share-api-polyfill'
import { TiptapEditor, TiptapRenderer } from '../ui/TiptapEditor';
import { Note, NoteVersion } from '../../stores/notesStore';
import { 
  ArrowLeftIcon,
  ShareIcon,
  PlayIcon,
  PauseIcon,
  DocumentDuplicateIcon,
  SparklesIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { BottomNavigation } from '../ui/BottomNavigation';
import { useSummarizer } from '../../hooks/useSummarizer';
import { TextSummary } from '../TextSummary';
import { useAudioStore } from '../../stores/audioStore';
import { useAgentsStore } from '../../stores/agentsStore';
import { useNotesStore } from '../../stores/notesStore';
import { useRecordingStore } from '../../stores/recordingStore';
import { useTranscriptionStore } from '../../stores/transcriptionStore';
import { useRoutingStore } from '../../stores/routingStore';
import { TakeawayCard } from '../ui/TakeawayCard';
import { RunAgentsDialog } from '../ui/RunAgentsDialog';
import { ModelLoadingProgress } from '../ui/ModelLoadingProgress';
import { PencilIcon } from '@heroicons/react/24/solid';

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
    getAutoRunAgents, 
    processNoteWithAllAutoAgents,
    isProcessing: agentsProcessing,
    processingStatus: agentsStatus
  } = useAgentsStore();
  
  const { 
    notes, 
    updateNote, 
    deleteNote, 
    saveVersion, 
    restoreVersion, 
    updateTags 
  } = useNotesStore();
  
  const { 
    startTranscriptionFromUrl,
    isNoteProcessing,
    getNoteProcessingStatus
  } = useTranscriptionStore();
  const { navigateToNote } = useRoutingStore();
  
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [tagInput, setTagInput] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRetranscribeConfirm, setShowRetranscribeConfirm] = useState(false);
  const [showRunAgentsDialog, setShowRunAgentsDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const editorRef = useRef<any>(null);

  // Check if this is an agent-generated note
  const isAgentNote = note?.type === 'agent';
  const sourceNote = isAgentNote && note.sourceNoteIds?.[0] 
    ? notes.find(n => n.id === note.sourceNoteIds![0])
    : null;
  
  // Get transcription status for this specific note
  const isTranscribing = isNoteProcessing(note.id);
  const transcriptionStatus = getNoteProcessingStatus(note.id);

  const {
    isLoading,
    progress,
    summary,
    model,
    summarize,
    clearSummary,
    changeModel,
  } = useSummarizer();

  // Update local state when note prop changes (for reactive updates)
  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
    }
  }, [note]);

  // Force editor to update when content changes from transcription
  useEffect(() => {
    if (note?.content && note.content !== content) {
      console.log('Note content changed, updating editor:', note.content.length, 'chars');
      setContent(note.content);
    }
  }, [note?.content]);
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

  const handleSummarize = async () => {
    console.log('summarize', editorRef.current)
    if (editorRef.current) {
      const textContent = editorRef.current.getContent({ format: 'text' });
      
      if (textContent.trim()) {
        await summarize(textContent);
      }
    }
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

  const handleShareAudio = () => {
    navigator.share({
      title: 'Web Share API Polyfill',
      text: 'A polyfill for the Share API. Use it to share in both desktops and mobile devices.',
      url: "https://winstonfassett.com"
    })
    .then( _ => console.log('Yay, you shared it :)'))
    .catch( error => console.log('Oh noh! You couldn\'t share it! :\'(\n', error));
  }

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

  const handleDeleteNote = () => {
    deleteNote(note.id);
    onBack();
  };

  const handleDeleteAudio = () => {
    setShowDeleteAudioConfirm(true);
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

  if (!note) {
    return null;
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 relative">
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
              onClick={() => navigateToNote(sourceNote.id)}
              className="flex items-center gap-2 px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <span className="text-sm text-gray-300">Source:</span>
              <span className="text-sm text-white truncate max-w-32">{sourceNote.title}</span>
            </button>
          )}
          
          {/* Edit toggle for agent notes */}
          {isAgentNote && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`p-2 rounded-lg transition-colors ${
                isEditing 
                  ? 'bg-indigo-600 text-white' 
                  : 'hover:bg-gray-800 text-gray-400'
              }`}
              title={isEditing ? 'Stop editing' : 'Edit note'}
            >
              <PencilIcon className="w-5 h-5" />
            </button>
          )}
          
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
              disabled={isAgentNote && !isEditing}
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
                    onClick={handleDeleteAudio}
                    className="p-2 rounded-lg hover:bg-red-600/20 transition-colors"
                    title="Delete audio recording"
                  >
                    <TrashIcon className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Show transcription/model loading status */}
          {isTranscribing && (
            <div className="card">
              <div className="flex items-center gap-3 mb-3">
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
                  {(!isAgentNote || isEditing) && (
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
            {(!isAgentNote || isEditing) && (
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

          {/* Editor */}
          {isAgentNote && !isEditing ? (
            /* Read-only view for agent notes with better markdown rendering */
            <div className="border border-gray-700 rounded-lg bg-gray-800 p-4">
              <TiptapRenderer content={note.content} />
            </div>
          ) : (
            <TiptapEditor
              content={content}
              onChange={handleEditorChange}
              placeholder="Start writing your note..."
            />
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
                      onSelect={(id) => navigateToNote(id)}
                      onDelete={(id) => deleteNote(id)}
                    />
                ))}
              </div>
            </div>
          )}
          
          {/* AI Summary */}
          {(!isAgentNote || isEditing) && (
            <TextSummary
              summary={summary}
              isLoading={isLoading}
              progress={progress}
              onClose={clearSummary}
              model={model}
              onModelChange={changeModel}
            />
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <div className="flex-1"></div>
            
            {/* AI Agents Button */}
            {canRunAnyAgents() && content.trim() && (
              <button
                onClick={() => setShowRunAgentsDialog(true)}
                disabled={agentsProcessing}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 
                         disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                <SparklesIcon className="w-5 h-5" />
                Run AI Agents
              </button>
            )}
            
            {/* AI Summary Button - only for non-agent notes or when editing */}
            {(!isAgentNote || isEditing) && !isLoading && content.trim() && (
              <button
                onClick={handleSummarize}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 
                         disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                <SparklesIcon className="w-5 h-5" />
                AI Summary
              </button>
            )}
            
            {/* Copy Button - moved after AI button */}
            <button
              onClick={handleCopyToClipboard}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 
                       text-white rounded-lg transition-colors"
            >
              <DocumentDuplicateIcon className="w-5 h-5" />
              Copy
            </button>
          </div>

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