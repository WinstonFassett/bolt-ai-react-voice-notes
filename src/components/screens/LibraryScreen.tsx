import React, { useState, useMemo, useCallback } from 'react';
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
import { Plus, Search, Play, Pause, Trash2 } from 'lucide-react';
import { AddButton } from '../AddButton';
import { AppHeader } from '../Layout/AppHeader';
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';

interface LibraryScreenProps {
  onUploadFile: () => void;
  onFromUrl: () => void;
}

export const LibraryScreen: React.FC<LibraryScreenProps> = ({ onUploadFile, onFromUrl }) => {
  // Get everything from stores
  const { notes, deleteNote, createNote } = useNotesStore();
  const { startRecordingFlow } = useRecordingStore();
  const { playAudio, pauseAudio, currentPlayingAudioUrl, isPlaying } = useAudioStore();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);

  // Filter and sort notes based on search query
  const filteredNotes = useMemo(() => {
    const searchLower = searchQuery.toLowerCase();
    return notes.filter(note => {
      return (
        note.title.toLowerCase().includes(searchLower) ||
        note.content.toLowerCase().includes(searchLower) ||
        note.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }).sort((a, b) => b.lastEdited - a.lastEdited);
  }, [notes, searchQuery]);

  // Group notes by date categories
  const groupedNotes = useMemo(() => {
    const groups: { [key: string]: Note[] } = {};
    const now = new Date();
    
    filteredNotes.forEach(note => {
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

  // Event handlers
  const handleDeleteClick = useCallback((note: Note) => {
    setNoteToDelete(note);
    setShowDeleteConfirm(true);
  }, []);

  const handleCancelDelete = useCallback(() => {
    setNoteToDelete(null);
    setShowDeleteConfirm(false);
  }, []);

  const handleAudioToggle = useCallback((audioUrl: string | undefined) => {
    if (!audioUrl) return;
    
    if (currentPlayingAudioUrl === audioUrl && isPlaying) {
      pauseAudio();
    } else {
      playAudio(audioUrl);
    }
  }, [currentPlayingAudioUrl, isPlaying, pauseAudio, playAudio]);

  // Helper function to truncate content
  const truncateContent = (content: string, maxLength: number = 120) => {
    const plainText = content.replace(/[#*`]/g, '').trim();
    return plainText.length > maxLength ? plainText.slice(0, maxLength) + '...' : plainText;
  };

  // Render a note card with redesigned UI
  const renderNoteCard = (note: Note) => {
    const isCurrentlyPlaying = currentPlayingAudioUrl === note.audioUrl && isPlaying;
    const formattedDate = formatDistanceToNow(new Date(note.lastEdited), { addSuffix: true });
    
    return (
      <Card 
        key={note.id}
        className="cursor-pointer hover:bg-accent/50 transition-all duration-200 hover:shadow-md hover:scale-[1.01] 
                 border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
        onClick={() => navigate(`/note/${note.id}`)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium truncate mb-1">{note.title}</h3>
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {truncateContent(note.content)}
              </p>
              
              {note.tags.length > 0 && (
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
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              {note.audioUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAudioToggle(note.audioUrl);
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
                  handleDeleteClick(note);
                }}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="h-full flex flex-col">
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
        <div className="p-4 space-y-4 max-w-4xl mx-auto">
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
          {filteredNotes.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-4">
                {searchQuery ? 'No notes match your search' : 'No notes yet'}
              </div>
              <Button onClick={() => startRecordingFlow()}>
                <Plus className="h-4 w-4 mr-2" />
                Create your first note
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedNotes).map(([groupName, groupNotes]) => (
                <div key={groupName} className="space-y-3">
                  <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    {groupName}
                  </h2>
                  <div className="space-y-3">
                    {groupNotes.map(note => renderNoteCard(note))}
                  </div>
                </div>
              ))}
            </div>
          )}
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
                  onClick={handleCancelDelete}
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
