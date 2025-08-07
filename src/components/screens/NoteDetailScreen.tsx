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
import { formatDistanceToNow } from 'date-fns';
import { useAgentsStore } from '../../stores/agentsStore';
import { useAudioStore } from '../../stores/audioStore';
import { resolveStorageUrl } from '../../utils/audioStorage';
import { Note, useNotesStore } from '../../stores/notesStore';
import { useTranscriptionStore } from '../../stores/transcriptionStore';
import { BottomNavigation } from '../BottomNavigation';
import { CrepeEditorWrapper } from '../CrepeEditor';
import { RunAgentsDialog } from '../RunAgentsDialog';
import { ModelLoadingProgress } from '../ModelLoadingProgress';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { cn } from '../../lib/utils';
import { toast } from '../../hooks/use-toast';

interface NoteDetailScreenProps {
  note: Note;
  onBack: () => void;
  activeTab: 'record' | 'library' | 'agents' | 'settings';
  onTabChange: (tab: 'record' | 'library' | 'agents' | 'settings') => void;
}

export const NoteDetailScreen: React.FC<NoteDetailScreenProps> = ({
  note,
  onBack,
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
    setIsUserInteracting,
    togglePlayPause
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

  // Note: sourceNote is already defined below

  // Import functionality removed as it's handled elsewhere

  // Check if this is an agent-generated note
  const isAgentNote = note?.type === 'agent';
  const sourceNote = isAgentNote && note.sourceNoteIds?.[0] 
    ? notes.find(n => n.id === note.sourceNoteIds![0])
    : null;
  
  // Get transcription status for this specific note
  const isTranscribing = note ? isNoteProcessing(note.id) : false;
  const transcriptionStatus = note ? getNoteProcessingStatus(note.id) : '';
  
  // Get child notes for this note
  const childNotes = notes.filter(n => 
    n.sourceNoteIds && n.sourceNoteIds.includes(note.id)
  );
  
  // Get child notes for a given parent note
  const getChildNotes = (parentId: string): Note[] => {
    if (!parentId) return [];
    return notes.filter(note => 
      note && note.sourceNoteIds && note.sourceNoteIds.includes(parentId)
    ).sort((a, b) => b.lastEdited - a.lastEdited);
  };

  // Recursive function to render a note with its children
  const renderNoteWithChildren = (note: Note, level: number = 0) => {
    if (!note) return null;
    const isCurrentlyPlaying = currentPlayingAudioUrl === note.audioUrl && globalIsPlaying;
    const formattedDate = formatDistanceToNow(new Date(note.lastEdited), { addSuffix: true });
    const childNotes = getChildNotes(note.id);
    const isAgentNote = note.type === 'agent';
    const hasAudio = note.audioUrl !== null && note.audioUrl !== undefined;
    const formattedDuration = note.duration ? 
      `${Math.floor(note.duration / 60)}:${(note.duration % 60).toString().padStart(2, '0')}` : 
      null;
    
    return (
      <div key={note.id} className={level === 0 ? 'mb-2' : 'mt-2'}>
        <Card 
          className={cn(
            "cursor-pointer hover:bg-accent/50 transition-all duration-200",
            isAgentNote && "border-l-4 border-l-primary"
          )}
          onClick={() => navigate(`/note/${note.id}`)}
          style={{ marginLeft: `${level * 16}px` }}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {/* Left column for play button or icon */}
              <div className="flex-shrink-0">
                {hasAudio ? (
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (note.audioUrl) {
                        if (currentPlayingAudioUrl === note.audioUrl && globalIsPlaying) {
                          togglePlayPause();
                        } else {
                          playAudio(note.audioUrl);
                        }
                      }
                    }}
                    className="h-12 w-12 rounded-full"
                  >
                    {isCurrentlyPlaying ? (
                      <PauseIcon className="h-5 w-5" />
                    ) : (
                      <PlayIcon className="h-5 w-5" />
                    )}
                  </Button>
                ) : (
                  <div className="h-12 w-12 rounded-full bg-accent flex items-center justify-center">
                    {isAgentNote ? (
                      <SparklesIcon className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <DocumentDuplicateIcon className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                )}
              </div>
              
              {/* Main content */}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium pr-8 line-clamp-2">{note.title || 'Untitled Note'}</h4>
                
                {/* Content preview */}
                <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                  {getContentPreview(note.content)}
                </p>
                
                {/* Info row */}
                <div className="flex items-center text-xs text-muted-foreground mb-2">
                  <span>{formattedDate}</span>
                  {formattedDuration && (
                    <>
                      <span className="mx-1">•</span>
                      <span>{formattedDuration}</span>
                    </>
                  )}
                  {childNotes.length > 0 && (
                    <>
                      <span className="mx-1">•</span>
                      <span>{childNotes.length} child note{childNotes.length !== 1 ? 's' : ''}</span>
                    </>
                  )}
                </div>
                
                {/* Tags */}
                {note.tags && note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {note.tags.map(tag => (
                      <span
                        key={tag}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/library?q=${encodeURIComponent(tag)}`);
                        }}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs 
                                bg-primary/20 text-primary border border-primary/30 
                                cursor-pointer hover:bg-primary/30"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Render child notes */}
        {childNotes.length > 0 && childNotes.map(childNote => renderNoteWithChildren(childNote, level + 1))}
      </div>
    );
  };

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
      toast({
        title: 'Share Failed',
        description: 'No audio available to share',
        variant: 'destructive'
      });
      return;
    }

    // Check if Web Share API is supported at all
    if (!('share' in navigator)) {
      toast({
        title: 'Share Failed',
        description: 'Sharing is not supported on this browser',
        variant: 'destructive'
      });
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
            toast({
              title: 'Share Failed',
              description: 'Could not access the audio file',
              variant: 'destructive'
            });
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
      toast({
        title: 'Share Failed',
        description: 'Could not share the audio file',
        variant: 'destructive'
      });
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
      toast({
        title: 'Playback Error',
        description: 'No audio recording available for this note',
        variant: 'destructive'
      });
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
  
  // All child notes are now considered takeaways - no separate sections
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
  
  // Helper function to get a plain text preview of content for cards
  const getContentPreview = (content: string) => {
    if (!content) return '';
    // Get first 150 characters of content, preserving the raw text
    return content.substring(0, 150).trim() + (content.length > 150 ? '...' : '');
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
      toast({
        title: 'Download Failed',
        description: 'No audio available to download',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Resolve the storage URL to get the actual blob URL
      const resolvedAudio = await resolveStorageUrl(note.audioUrl);
      if (!resolvedAudio) {
        toast({
          title: 'Download Failed',
          description: 'Could not access the audio file',
          variant: 'destructive'
        });
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
      toast({
        title: 'Download Failed',
        description: 'Could not download the audio file',
        variant: 'destructive'
      });
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
    <div className="flex flex-col h-full bg-background relative">
      {/* Import status feedback removed - handled elsewhere */}
      {/* Header with Breadcrumb Navigation */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="safe-area-top py-4 px-4 border-b border-border"
      >
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col gap-2">
            {/* Breadcrumb Navigation */}
            <div className="flex items-center text-sm overflow-x-auto pb-2 scrollbar-hide">
              <Button
                onClick={() => navigate('/library')}
                variant="link"
                className="text-muted-foreground hover:text-foreground p-0 h-auto"
              >
                Library
              </Button>
              
              {/* Show source note breadcrumb for agent notes */}
              {isAgentNote && sourceNote && (
                <>
                  <span className="mx-2 text-muted-foreground">/</span>
                  <Button
                    onClick={() => navigate(`/note/${sourceNote.id}`)}
                    variant="link"
                    className="text-muted-foreground hover:text-foreground p-0 h-auto truncate max-w-[150px]"
                    title={sourceNote.title || 'Untitled Note'}
                  >
                    {sourceNote.title || 'Untitled Note'}
                  </Button>
                </>
              )}
              
              {/* Current note */}
              <span className="mx-2 text-muted-foreground">/</span>
              <span className="text-foreground truncate max-w-[200px]" title={note.title || 'Untitled Note'}>
                {note.title || 'Untitled Note'}
              </span>
            </div>
          </div>
          {/* Actions row */}
          <div className="flex items-center justify-between">
            <Button
              onClick={onBack}
              variant="ghost"
              size="icon"
              className="rounded-lg"
            >
              <ArrowLeftIcon className="w-6 h-6" />
            </Button>
            
            {/* Show source note link for agent notes */}
            {isAgentNote && sourceNote && (
              <Button
                onClick={() => navigate(`/note/${sourceNote.id}`)}
                variant="secondary"
                className="flex items-center gap-2 px-3 py-1 h-auto"
              >
                <span className="text-sm text-muted-foreground">Source:</span>
                <span className="text-sm truncate max-w-32">{sourceNote.title}</span>
              </Button>
            )}
          
            {/* No edit toggle needed - always in edit mode */}
            
            {/* Simple delete button */}
            <Button
              onClick={() => setShowDeleteConfirm(true)}
              variant="destructive"
              className="p-2 rounded-lg"
              title="Delete note"
            >
              <TrashIcon className="w-5 h-5" />
            </Button>
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
              className="w-full text-2xl font-bold bg-transparent placeholder-muted-foreground
                       border-none outline-none focus:ring-0"
              placeholder="Note Title"
              disabled={false}
            />
            
            <div className="flex items-center justify-between text-sm text-muted-foreground">
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
                <Button
                  onClick={handlePlayAudio}
                  variant="secondary"
                  className="w-12 h-12 rounded-full"
                >
                  {isCurrentlyPlaying ? (
                    <PauseIcon className="w-5 h-5" />
                  ) : (
                    <PlayIcon className="w-5 h-5" />
                  )}
                </Button>
                <div>
                  <div className="text-sm">Audio Recording</div>
                  <div className="text-xs text-muted-foreground">
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
                    <Button
                      onClick={() => setShowRetranscribeConfirm(true)}
                      variant="secondary"
                      className="p-2 rounded-lg"
                      title="Re-transcribe audio"
                    >
                      <SparklesIcon className="w-4 h-4" />
                    </Button>
                  )}
                  <Button 
                    onClick={handleDownloadAudio}
                    variant="secondary"
                    className="p-2"
                    aria-label="Download audio"
                    title="Download audio"
                  >
                    <ArrowDownTrayIcon className="h-5 w-5" />
                  </Button>
                  
                  {/* Only show share button if Web Share API is supported */}
                  {typeof navigator !== 'undefined' && 'share' in navigator && (
                    <Button 
                      onClick={handleShareAudio}
                      variant="secondary"
                      className="p-2"
                      aria-label="Share audio"
                      title="Share audio"
                    >
                      <ShareIcon className="h-5 w-5" />
                    </Button>
                  )}
                  
                  <Button
                    onClick={handleDeleteAudio}
                    variant="destructive"
                    className="p-2"
                    aria-label="Delete audio"
                    title="Delete audio recording"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </Button>
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
                      className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full"
                    />
                    <span className="text-sm text-primary/80 font-medium">
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
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs 
                           bg-card text-card-foreground border border-border 
                           cursor-pointer hover:bg-accent/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/library?q=${encodeURIComponent(tag)}`);
                  }}
                >
                  {tag}
                  {!isAgentNote && (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent tag click navigation
                      handleRemoveTag(tag);
                    }}
                    variant="secondary"
                    className="ml-1"
                  >
                    ×
                  </Button>
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
              className="w-full px-3 py-2 bg-input border border-input rounded-lg 
                       placeholder-muted-foreground focus:outline-none focus:ring-2 
                       focus:ring-ring focus:border-transparent"
            />
            )}
          </div>

          {/* Editor with floating copy button */}
          <div className="border border-border rounded-lg p-4 relative">
            {/* Floating copy button */}
            <Button
              onClick={handleCopyToClipboard}
              variant="secondary"
              className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-1 bg-gray-700/80 hover:bg-gray-600/80 
                        text-white text-sm rounded-lg transition-colors shadow-md"
              title="Copy content"
            >
              <DocumentDuplicateIcon className="w-4 h-4" />
              Copy
            </Button>
            
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
         
          {/* Takeaways Section with AI Agents Button */}
          <div className="mt-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <DocumentDuplicateIcon className="w-5 h-5 text-muted-foreground" />
                Descendants
                {childNotes.length > 0 && (
                  <span className="text-sm text-muted-foreground font-normal ml-2">
                    ({childNotes.length})
                  </span>
                )}
              </h3>
              {canRunAnyAgents() && content.trim() && (
                <Button
                  onClick={() => setShowRunAgentsDialog(true)}
                  disabled={agentsProcessing}
                  variant="default"
                  className="flex items-center gap-2 px-4 py-2"
                >
                  <SparklesIcon className="w-5 h-5" />
                  Run AI Agents
                </Button>
              )}
            </div>
            
            {childNotes.length > 0 && (
              <div className="space-y-2">
                {/* Use the same recursive rendering pattern as LibraryScreen */}
                {childNotes
                  .filter(note => !note.sourceNoteIds || note.sourceNoteIds.length === 0 || !note.sourceNoteIds.some(id => childNotes.some(n => n.id === id)))
                  .sort((a, b) => b.lastEdited - a.lastEdited)
                  .map((childNote) => renderNoteWithChildren(childNote, 0))}
              </div>
            )}
            
            {childNotes.length === 0 && !agentsProcessing && (
              <p className="text-sm text-gray-400 italic">No takeaways yet. Run AI agents to generate insights.</p>
            )}
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
        <BottomNavigation
          activeTab="library"
          onTabChange={onTabChange}
        />
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
              className="bg-background rounded-xl p-6 max-w-md w-full border border-border shadow-lg"
            >
              <h3 className="text-lg font-semibold text-destructive mb-4">Delete Note</h3>
              <p className="text-muted-foreground mb-6">
                Are you sure you want to delete this note? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  onClick={() => setShowDeleteConfirm(false)}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeleteNote}
                  variant="destructive"
                >
                  Delete
                </Button>
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
              className="bg-background rounded-xl p-6 max-w-md w-full border border-border shadow-lg"
            >
              <h3 className="text-lg font-semibold mb-4">Re-transcribe Audio</h3>
              <p className="text-muted-foreground mb-6">
                This will replace the current content with a new transcription. This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  onClick={() => setShowRetranscribeConfirm(false)}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRetranscribe}
                  variant="default"
                >
                  Re-transcribe
                </Button>
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
              className="bg-background rounded-xl p-6 max-w-md w-full border border-border shadow-lg"
            >
              <h3 className="text-lg font-semibold text-destructive mb-4">Delete Audio Recording</h3>
              <p className="text-muted-foreground mb-6">
                Are you sure you want to delete the audio recording? The text content will be preserved.
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  onClick={() => setShowDeleteAudioConfirm(false)}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmDeleteAudio}
                  variant="destructive"
                >
                  Delete Audio
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
      
  );
};