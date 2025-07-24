import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TranscriptCard } from '../ui/TranscriptCard';
import { AddButton } from '../ui/AddButton';
import { Note } from '../../stores/notesStore';
import { 
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

interface LibraryScreenProps {
  notes: Note[];
  onSelectNote: (id: string) => void;
  onDeleteNote: (id: string) => void;
  onCreateNote: () => void;
  onStartRecording: () => void;
  onUploadFile: () => void;
  onFromUrl: () => void;
  onPlayAudio: (audioUrl: string) => void;
  currentPlayingAudioUrl: string | null;
  globalIsPlaying: boolean;
}

export const LibraryScreen: React.FC<LibraryScreenProps> = ({
  notes,
  onSelectNote,
  onDeleteNote,
  onCreateNote,
  onStartRecording,
  onUploadFile,
  onFromUrl,
  onPlayAudio,
  currentPlayingAudioUrl,
  globalIsPlaying
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);

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

  const handleDeleteClick = (note: Note) => {
    setNoteToDelete(note);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (noteToDelete) {
      onDeleteNote(noteToDelete.id);
      setNoteToDelete(null);
      setShowDeleteConfirm(false);
    }
  };

  const handleCancelDelete = () => {
    setNoteToDelete(null);
    setShowDeleteConfirm(false);
  };
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-gray-900/95 backdrop-blur-lg border-b border-gray-800">
        <motion.div
        initial={{ opacity: 0, y: 0 }}
        animate={{ opacity: 1, y: 0 }}
        className="safe-area-top py-4 px-4"
      >
        <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-white">Library</h1>
          <div>
            <AddButton
              onStartRecording={onStartRecording}
              onUploadFile={onUploadFile}
              onFromUrl={onFromUrl}
              onCreateNote={onCreateNote}
            />
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search transcripts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl 
                     text-white placeholder-gray-400 focus:outline-none focus:ring-2 
                     focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        </div>
        </motion.div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-4 pb-24 pt-32 max-w-full bg-gray-900">
        <div className="max-w-4xl mx-auto">
        {filteredNotes.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
              <span className="text-2xl">🎙️</span>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">
              {searchQuery ? 'No matches found' : 'No transcripts yet'}
            </h3>
            <p className="text-gray-400 mb-6">
              {searchQuery 
                ? `No transcripts match "${searchQuery}"`
                : 'Start recording to create your first transcript'
              }
            </p>
          </motion.div>
        ) : (
          <div className="space-y-6 max-w-full">
            {Object.entries(groupedNotes).map(([groupName, groupNotes]) => (
              <div
                key={groupName}
                className="space-y-3 max-w-full"
              >
                <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
                  {groupName}
                </h2>
                <div className="space-y-3 max-w-full">
                  {groupNotes.map((note) => (
                    <TranscriptCard
                      key={note.id}
                      id={note.id}
                      title={note.title}
                      content={note.content}
                      tags={note.tags}
                      createdAt={note.lastEdited}
                      audioUrl={note.audioUrl}
                      duration={note.duration}
                      takeaways={note.takeaways}
                      onClick={() => onSelectNote(note.id)}
                      onDeleteClick={() => handleDeleteClick(note)}
                    onPlayAudio={onPlayAudio}
                    currentPlayingAudioUrl={currentPlayingAudioUrl}
                    globalIsPlaying={globalIsPlaying}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </main>
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
              className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-gray-700"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Delete Note</h3>
              <p className="text-gray-300 mb-2">
                Are you sure you want to delete "{noteToDelete.title}"?
              </p>
              <p className="text-gray-400 text-sm mb-6">
                This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={handleCancelDelete}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  Delete Note
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
      
  );
};