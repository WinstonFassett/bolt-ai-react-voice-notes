import React, { useState, useMemo } from 'react';
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
import { Badge } from '../ui/badge';
import { Plus, Search, Play, Pause, Trash2, Bot } from 'lucide-react';
import { AppHeader } from '../Layout/AppHeader';
import { AddButton } from '../AddButton';

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

  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);

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

  // Helper function to truncate content while preserving markdown formatting
  const truncateContent = (content: string, maxLength: number = 120) => {
    if (!content) return '';
    // Don't strip markdown formatting, just truncate
    return content.length > maxLength ? content.slice(0, maxLength) + '...' : content;
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
    
    return (
      <div key={note.id} className="mb-3">
        <Card 
          className={`cursor-pointer hover:bg-accent/50 transition-all duration-200 hover:shadow-md hover:scale-[1.01] 
                     border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm
                     ${isAgentNote ? 'border-l-4 border-l-primary' : ''}`}
          onClick={() => navigate(`/note/${note.id}`)}
          style={{ marginLeft: `${level * 16}px` }}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                {level > 0 && (
                  <div className="text-xs text-muted-foreground mb-1">
                    {'└─ '.repeat(level)}{isAgentNote ? 'AI Analysis' : 'Child Note'}
                  </div>
                )}
                <h3 className="font-medium truncate mb-1 flex items-center gap-2">
                  {isAgentNote && <Bot className="h-4 w-4 text-primary" />}
                  {note.title || 'Untitled Note'}
                </h3>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {truncateContent(note.content)}
                </p>
                
                {note.tags && note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {note.tags.slice(0, 3).map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {note.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{note.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {formattedDate}
                  </span>
                  
                  {note.duration && (
                    <span className="text-xs text-muted-foreground">
                      {Math.floor(note.duration / 60)}:{(note.duration % 60).toString().padStart(2, '0')}
                    </span>
                  )}
                  
                  {childNotes.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {childNotes.length} child note{childNotes.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                {note.audioUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
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
                    className="h-8 w-8 p-0"
                  >
                    {isCurrentlyPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                )}
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setNoteToDelete(note);
                    setShowDeleteConfirm(true);
                  }}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
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