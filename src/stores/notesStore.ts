import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { audioStorage, resolveStorageUrl } from '../utils/audioStorage';
import JSZip from 'jszip';

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
  
  // Actions
  addNote: (note: Note) => void;
  updateNote: (note: Note) => void;
  deleteNote: (id: string) => void;
  getNoteById: (id: string) => Note | undefined;
  
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
}

export const useNotesStore = create<NotesState>()(
  persist(
    (set, get) => ({
      notes: [],
      
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
      
      downloadAllAudio: async () => {
        const { notes } = get();
        const notesWithAudio = notes.filter(note => note.audioUrl);
        
        if (notesWithAudio.length === 0) {
          alert('No audio recordings found');
          return;
        }
        
        // Create a new zip file
        const zip = new JSZip();
        let processedCount = 0;
        let successCount = 0;
        
        try {
          // Add a loading indicator
          const loadingDiv = document.createElement('div');
          loadingDiv.textContent = `Preparing audio files (0/${notesWithAudio.length})...`;
          loadingDiv.style.position = 'fixed';
          loadingDiv.style.top = '10px';
          loadingDiv.style.left = '50%';
          loadingDiv.style.transform = 'translateX(-50%)';
          loadingDiv.style.padding = '10px';
          loadingDiv.style.backgroundColor = '#4f46e5';
          loadingDiv.style.color = 'white';
          loadingDiv.style.borderRadius = '4px';
          loadingDiv.style.zIndex = '9999';
          document.body.appendChild(loadingDiv);
          
          // Process each note with audio
          for (const note of notesWithAudio) {
            if (!note.audioUrl) continue;
            
            try {
              // Use resolveStorageUrl which properly handles audio-storage:// URLs
              const resolvedAudio = await resolveStorageUrl(note.audioUrl);
              if (!resolvedAudio) {
                console.error(`Failed to resolve audio URL for note: ${note.id}`);
                processedCount++;
                loadingDiv.textContent = `Preparing audio files (${successCount}/${notesWithAudio.length})... (${processedCount} processed)`;
                continue;
              }
              
              // Create a safe filename
              const safeTitle = note.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
              const extension = resolvedAudio.mimeType.split('/')[1] || 'webm';
              const fileName = `${safeTitle}_${note.id}.${extension}`;
              
              // Add to zip
              const response = await fetch(resolvedAudio.url);
              const blob = await response.blob();
              
              if (blob.size > 0) {
                zip.file(fileName, blob);
                successCount++;
              } else {
                console.error(`Empty blob for note: ${note.id}`);
              }
              
              // Update progress
              processedCount++;
              loadingDiv.textContent = `Preparing audio files (${successCount}/${notesWithAudio.length})... (${processedCount} processed)`;
            } catch (err) {
              console.error(`Error processing audio for note ${note.id}:`, err);
              processedCount++;
              loadingDiv.textContent = `Preparing audio files (${successCount}/${notesWithAudio.length})... (${processedCount} processed)`;
            }
          }
          
          // Check if any audio files were successfully processed
          if (successCount === 0) {
            document.body.removeChild(loadingDiv);
            alert('No audio files could be processed. This may be because the audio files are no longer available.');
            return;
          }
          
          // Update the loading indicator
          loadingDiv.textContent = `Creating zip file with ${successCount} audio files...`;
          
          // Generate the zip file
          const zipBlob = await zip.generateAsync({ type: 'blob' });
          
          if (zipBlob.size < 100) { // Check if zip is suspiciously small
            document.body.removeChild(loadingDiv);
            alert('Error creating zip file: The generated file appears to be empty or corrupted.');
            return;
          }
          
          const zipUrl = URL.createObjectURL(zipBlob);
          
          // Create download link
          const a = document.createElement('a');
          a.href = zipUrl;
          a.download = 'bolt-voice-notes-audio.zip';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          
          // Clean up
          URL.revokeObjectURL(zipUrl);
          document.body.removeChild(loadingDiv);
          
          return;
        } catch (error) {
          console.error('Error downloading audio files:', error);
          
          // Remove loading indicator if it exists
          try {
            const loadingElement = document.querySelector('div[style*="position: fixed"][style*="zIndex: 9999"]');
            if (loadingElement && loadingElement.parentNode) {
              loadingElement.parentNode.removeChild(loadingElement);
            }
          } catch (e) {
            console.error('Error removing loading indicator:', e);
          }
          
          alert('Error downloading audio files: ' + (error instanceof Error ? error.message : 'Unknown error'));
        }
      }
    }),
    {
      name: 'notes-store',
      version: 0,
      migrate: (persistedState: any) => persistedState
    }
  )
);