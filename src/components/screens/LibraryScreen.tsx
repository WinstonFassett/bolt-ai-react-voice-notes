import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

// Import existing stores
import { useNotesStore, Note } from '../../stores/notesStore';
import { useRecordingStore } from '../../stores/recordingStore';
import { useAudioStore } from '../../stores/audioStore';

// Import redesigned UI components
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent } from '../ui/card';
import { Plus, Search, Play, Pause, Trash2, Bot, FileText } from 'lucide-react';
import { AppHeader } from '../Layout/AppHeader';
import { AddButton } from '../AddButton';
import { cn } from '../../lib/utils';

interface LibraryScreenProps {
  onUploadFile: () => void;
  onFromUrl: () => void;
}

export const LibraryScreen: React.FC<LibraryScreenProps> = ({ onUploadFile, onFromUrl }) => {
  // Get everything from stores
  const { notes, deleteNote, createNote } = useNotesStore();
  const { startRecordingFlow } = useRecordingStore();
  const { playAudio, togglePlayPause, currentPlayingAudioUrl, globalIsPlaying } = useAudioStore();
  const navigate = useNavigate();

  // Initialize search query from URL parameters if present
  const [searchQuery, setSearchQuery] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('q') || '';
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
  
  // Update URL when search query changes
  useEffect(() => {
    const url = new URL(window.location.href);
    if (searchQuery) {
      url.searchParams.set('q', searchQuery);
    } else {
      url.searchParams.delete('q');
    }
    window.history.pushState({}, '', url);
  }, [searchQuery]);

  // Filter notes to only show top-level notes (no parent)
  const topLevelNotes = useMemo(() => {
    return notes.filter(note => !note.sourceNoteIds || note.sourceNoteIds.length === 0);
  }, [notes]);
  
  // Apply search filter
  const filteredNotes = useMemo(() => {
    if (!searchQuery) return topLevelNotes;
    
    const searchLower = searchQuery.toLowerCase();
    return topLevelNotes.filter(note => {
      if (!note) return false;
      return (
        (note.title && note.title.toLowerCase().includes(searchLower)) ||
        (note.content && note.content.toLowerCase().includes(searchLower)) ||
        (note.tags && note.tags.some(tag => tag.toLowerCase().includes(searchLower)))
      );
    });
  }, [topLevelNotes, searchQuery]);

  // Group notes by date
  const groupedNotes = useMemo(() => {
    const groups: { [key: string]: Note[] } = {};
    const now = new Date();
    
    filteredNotes.forEach(note => {
      if (!note) return;
      const noteDate = new Date(note.lastEdited);
      const diffInDays = Math.floor((now.getTime() - noteDate.getTime()) / (1000 * 60 * 60 * 24));
      
      let groupKey: string;
      if (diffInDays === 0) {
        groupKey = 'Today';
      } else if (diffInDays === 1) {
        groupKey = 'Yesterday';
      } else if (diffInDays < 7) {
        groupKey = 'This Week';
      } else if (diffInDays < 30) {
        groupKey = 'This Month';
      } else {
        groupKey = 'Older';
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(note);
    });
    
    return groups;
  }, [filteredNotes]);

  // Helper function to format content for display
  const formatContent = (content: string, maxLength: number = 120) => {
    if (!content) return '';
    
    // Format markdown for display
    const formatted = content
      .replace(/^#+\s+/gm, '') // Remove headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links but keep text
      .trim();
    
    // Get first paragraph and truncate if needed
    const firstParagraph = formatted.split('\n')[0];
    return firstParagraph.length > maxLength ? firstParagraph.slice(0, maxLength) + '...' : firstParagraph;
  };

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
                      <Pause className="h-5 w-5" />
                    ) : (
                      <Play className="h-5 w-5" />
                    )}
                  </Button>
                ) : (
                  <div className="h-12 w-12 rounded-full bg-accent flex items-center justify-center">
                    {isAgentNote ? (
                      <Bot className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                )}
              </div>
              
              {/* Main content */}
              <div className="flex-1 min-w-0">
                {/* Title row with delete button */}
                <div className="flex items-start justify-between mb-1 relative">
                  <h3 className="font-medium pr-8 line-clamp-2">
                    {note.title || 'Untitled Note'}
                  </h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setNoteToDelete(note);
                      setShowDeleteConfirm(true);
                    }}
                    className="h-6 w-6 p-0 absolute top-0 right-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Content preview */}
                {note.content && (
                  <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                    {formatContent(note.content)}
                  </p>
                )}
                
                {/* Info row - date, duration, child count */}
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
                
                {/* Tags row - always at the bottom */}
                {note.tags && note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {note.tags.map(tag => (
                      <span
                        key={tag}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSearchQuery(tag);
                          const url = new URL(window.location.href);
                          url.searchParams.set('q', tag);
                          window.history.pushState({}, '', url);
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

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto">
      {/* Header with AppHeader component */}
      <AppHeader 
        title="Library" 
        actions={
          <AddButton
            onStartRecording={startRecordingFlow}
            onUploadFile={onUploadFile}
            onFromUrl={onFromUrl}
            onCreateNote={() => {
              const newNoteId = createNote();
              navigate(`/note/${newNoteId}`);
            }}
          />
        }
      />
      
      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <div className="p-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Notes List */}
          <div className="space-y-6">
            {Object.keys(groupedNotes).length > 0 ? (
              Object.entries(groupedNotes).map(([groupName, groupNotes]) => (
                <div key={groupName} className="space-y-3">
                  <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                    {groupName}
                  </h2>
                  <div className="space-y-3">
                    {groupNotes.map(note => renderNoteWithChildren(note))}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <div className="text-muted-foreground mb-4">
                  {searchQuery ? 'No notes match your search' : 'No notes yet'}
                </div>
                <Button onClick={() => startRecordingFlow()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create your first note
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && noteToDelete && (
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
              className="bg-background rounded-xl p-6 max-w-md w-full border border-border"
            >
              <h3 className="text-lg font-semibold mb-4">Delete Note</h3>
              <p className="mb-2">
                Are you sure you want to delete "{noteToDelete.title}"?
              </p>
              <p className="text-muted-foreground text-sm mb-6">
                This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setNoteToDelete(null);
                    setShowDeleteConfirm(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    deleteNote(noteToDelete.id);
                    setNoteToDelete(null);
                    setShowDeleteConfirm(false);
                  }}
                >
                  Delete Note
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};