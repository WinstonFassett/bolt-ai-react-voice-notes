import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { audioStorage } from '../utils/audioStorage';
import { exportAudioFiles, exportSingleAudioFile, ExportProgressCallback, ExportStatusCallback } from '../services/audioExportService';
import { importAudioFiles } from '../services/audioImportService';

export interface NoteVersion {
  content: string;
  timestamp: number;
  description: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  versions: NoteVersion[];
  created: number;
  lastEdited: number;
  audioUrl?: string;
  duration?: number;
  createdAt?: number;
  updatedAt?: number;
  type?: 'user' | 'agent';
  sourceNoteIds?: string[];
  agentId?: string;
  takeaways?: string[];
  generatedBy?: {
    agentId: string;
    modelUsed: string;
    processedAt: number;
  };
}

interface NotesState {
  notes: Note[];
  isExportingAudio: boolean;
  exportProgress: string;
  
  // Actions
  addNote: (note: Note) => void;
  updateNote: (note: Note) => void;
  deleteNote: (id: string) => void;
  getNoteById: (id: string) => Note | undefined;
  resetExportState: () => void;
  
  // Complex actions
  createNote: () => string;
  saveVersion: (noteId: string, description: string) => void;
  restoreVersion: (noteId: string, version: NoteVersion) => void;
  updateTags: (noteId: string, tags: string[]) => void;
  
  // Data management
  exportNotes: () => void;
  importNotes: (notesData: any[]) => void;
  clearAllNotes: () => void;
  clearAllRecordings: () => void;
  downloadAllAudio: () => Promise<void>;
  downloadSingleAudio: (noteId: string) => Promise<void>;
  importAudio: (file: File) => Promise<void>;
}

export const useNotesStore = create<NotesState>()(
  persist(
    (set, get) => ({
      notes: [],
      isExportingAudio: false,
      exportProgress: '',
      
      // Simple actions
      addNote: (note) => set((state) => ({
        notes: [note, ...state.notes]
      })),
      
      updateNote: (updatedNote) => set((state) => ({
        notes: state.notes.map(note => 
          note.id === updatedNote.id 
            ? { ...updatedNote, lastEdited: Date.now() }
            : note
        )
      })),
      
      deleteNote: (id) => set((state) => ({
        notes: state.notes.filter(note => {
          // If deleting a note, also remove it from other notes' takeaways
          if (note.id !== id && note.takeaways) {
            note.takeaways = note.takeaways.filter(takeawayId => takeawayId !== id);
          }
          return note.id !== id;
        })
      })),
      
      getNoteById: (id) => {
        const { notes } = get();
        return notes.find(note => note.id === id);
      },
      
      // Complex actions
      createNote: () => {
        const now = Date.now();
        const newNote: Note = {
          id: now.toString(),
          title: 'New Note',
          content: '',
          tags: [],
          versions: [],
          created: now,
          lastEdited: now
        };
        
        set((state) => ({
          notes: [newNote, ...state.notes]
        }));
        
        return newNote.id;
      },
      
      saveVersion: (noteId, description) => {
        const { notes } = get();
        const note = notes.find(n => n.id === noteId);
        if (note) {
          const newVersion: NoteVersion = {
            content: note.content,
            timestamp: Date.now(),
            description
          };
          
          const updatedNote = {
            ...note,
            versions: [...note.versions, newVersion],
            lastEdited: Date.now()
          };
          
          set((state) => ({
            notes: state.notes.map(n => n.id === noteId ? updatedNote : n)
          }));
        }
      },
      
      restoreVersion: (noteId, version) => {
        const { notes } = get();
        const note = notes.find(n => n.id === noteId);
        if (note) {
          const updatedNote = {
            ...note,
            content: version.content,
            lastEdited: Date.now()
          };
          
          set((state) => ({
            notes: state.notes.map(n => n.id === noteId ? updatedNote : n)
          }));
        }
      },
      
      updateTags: (noteId, tags) => {
        const { notes } = get();
        const note = notes.find(n => n.id === noteId);
        if (note) {
          const updatedNote = {
            ...note,
            tags,
            lastEdited: Date.now()
          };
          
          set((state) => ({
            notes: state.notes.map(n => n.id === noteId ? updatedNote : n)
          }));
        }
      },
      
      // Data management
      exportNotes: () => {
        const { notes } = get();
        const notesBlob = new Blob([JSON.stringify(notes, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(notesBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'monolog-notes-export.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      },
      
      importNotes: (notesData) => {
        const now = Date.now();
        const migratedNotes = notesData.map(note => ({
          ...note,
          tags: note.tags || [],
          versions: note.versions || [],
          created: note.created || now,
          lastEdited: note.lastEdited || now
        }));
        
        set({ notes: migratedNotes });
      },
      
      clearAllNotes: () => {
        const { notes } = get();
        if (notes.length === 0) return;
        
        const confirmed = window.confirm('Are you sure you want to delete all notes? This action cannot be undone.');
        if (!confirmed) return;
        
        set({ notes: [] });
        
        // Clear audio storage
        audioStorage.getAllAudioIds().then(ids => {
          ids.forEach(id => audioStorage.deleteAudio(id));
        });
      },
      
      clearAllRecordings: () => {
        const { notes } = get();
        const recordingsCount = notes.filter(note => note.audioUrl).length;
        if (recordingsCount === 0) return;
        
        const confirmed = window.confirm('Are you sure you want to delete all audio recordings? The text content will be preserved.');
        if (!confirmed) return;
        
        const updatedNotes = notes.map(note => ({
          ...note,
          audioUrl: undefined,
          duration: undefined
        }));
        
        set({ notes: updatedNotes });
        
        // Clear audio storage
        audioStorage.getAllAudioIds().then(ids => {
          ids.forEach(id => audioStorage.deleteAudio(id));
        });
      },
      
      // Reset export state on app initialization or errors
      resetExportState: () => {
        set({ exportProgress: '', isExportingAudio: false });
      },
      
      downloadAllAudio: async (): Promise<void> => {
        const { notes } = get();
        const notesWithAudio = notes.filter(note => note.audioUrl);
        
        // Reset progress state
        set({ exportProgress: 'Preparing export...', isExportingAudio: true });
        
        try {
          // Use the exported service function
          await exportAudioFiles(
            notesWithAudio,
            // Progress callback with UI update
            (message) => {
              console.log('Export progress:', message); // Log for debugging
              set({ exportProgress: message });
            },
            // Status callback
            (isExporting) => set({ isExportingAudio: isExporting })
          );
        } catch (error) {
          console.error('Error in downloadAllAudio:', error);
          set({ 
            exportProgress: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            isExportingAudio: false 
          });
          
          // Reset progress after a delay
          setTimeout(() => {
            set({ exportProgress: '' });
          }, 5000);
        }
      },
      
      // Export a single audio file (better for iOS)
      downloadSingleAudio: async (noteId: string): Promise<void> => {
        const { notes } = get();
        const note = notes.find(note => note.id === noteId);
        
        if (!note || !note.audioUrl) {
          alert('No audio recording found to export.');
          return;
        }
        
        // Reset progress state
        set({ exportProgress: 'Preparing export...', isExportingAudio: true });
        
        try {
          // Use the single file export function
          await exportSingleAudioFile(
            note,
            // Progress callback
            (message) => {
              console.log('Export progress:', message); // Log for debugging
              set({ exportProgress: message });
            },
            // Status callback
            (isExporting) => set({ isExportingAudio: isExporting })
          );
        } catch (error) {
          console.error('Error in downloadSingleAudio:', error);
          set({ 
            exportProgress: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            isExportingAudio: false 
          });
          
          // Reset progress after a delay
          setTimeout(() => {
            set({ exportProgress: '' });
          }, 5000);
        }
      },
      
      importAudio: async (file: File): Promise<void> => {
        const { notes } = get();
        
        // Use the exported service function
        await importAudioFiles(
          file,
          notes,
          // Progress callback
          (message) => set({ exportProgress: message }),
          // Status callback
          (isImporting) => set({ isExportingAudio: isImporting }),
          // Note update callback
          (noteId, audioUrl) => {
            set((state) => ({
              notes: state.notes.map(n => 
                n.id === noteId 
                  ? { ...n, audioUrl } 
                  : n
              )
            }));
          }
        );
      }
    }),
    {
      name: 'notes-store',
      version: 0,
      migrate: (persistedState: any) => persistedState,
      partialize: (state) => ({
        ...state,
        // Exclude these fields from persistence
        isExportingAudio: false,
        exportProgress: ''
      }),
      // Reset export state on rehydration for already persisted values
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Force reset export state when loading from storage
          state.isExportingAudio = false;
          state.exportProgress = '';
        }
      }
    }
  )
);