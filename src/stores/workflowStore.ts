import { create } from 'zustand';
import { audioStorage } from '../utils/audioStorage';
import { generateSmartTitle } from '../utils/titleGenerator';
import { useTranscriberStore } from './transcriberStore';
import axios from 'axios';
import Constants from '../utils/Constants';

interface WorkflowState {
  // Transcription workflow
  pendingNoteId: string | null;
  lastTranscription: string | null;
  
  // Actions
  setPendingNoteId: (id: string | null) => void;
  setLastTranscription: (text: string | null) => void;
  
  // Initialization
  initialize: () => void;
  
  // Workflow methods
  createNoteFromRecording: (audioBlob: Blob, duration: number) => Promise<string>;
  handleTranscriptionComplete: (text: string) => void;
  startTranscriptionProcess: (audioBlob: Blob, noteId: string) => Promise<void>;
  
  // File operations
  handleUploadFile: () => void;
  downloadAudioFromUrl: (url: string) => Promise<void>;
  
  // Import/Export
  handleImportNotes: (event: React.ChangeEvent<HTMLInputElement>) => void;
  
  // Transcriber integration
  setupTranscriberWatcher: () => void;
  cleanupTranscriberWatcher: () => void;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  // Initial state
  pendingNoteId: null,
  lastTranscription: null,
  
  // Simple setters
  setPendingNoteId: (id) => set({ pendingNoteId: id }),
  setLastTranscription: (text) => set({ lastTranscription: text }),
  
  // Initialization
  initialize: () => {
    console.log('🔄 WORKFLOW: Initializing workflow store');
    
    // Initialize the global transcriber
    useTranscriberStore.getState().initializeTranscriber();
    
    // Set up transcriber watcher
    get().setupTranscriberWatcher();
  },
  
  // Workflow methods
  createNoteFromRecording: async (audioBlob: Blob, duration: number) => {
    console.log('🔄 WORKFLOW: Creating note from recording');
    
    const now = Date.now();
    const noteId = now.toString();
    
    try {
      // Save audio to storage
      const audioFileName = `recording_${noteId}.webm`;
      const audioUrl = await audioStorage.saveAudio(audioBlob, audioFileName);
      
      console.log('✅ WORKFLOW: Audio saved to storage:', audioUrl);
      
      // Create note
      const newNote = {
        id: noteId,
        title: 'Voice Recording',
        content: '',
        audioUrl,
        duration,
        createdAt: now,
        updatedAt: now,
        created: now,
        lastEdited: now,
        versions: [],
        tags: []
      };
      
      // Add to store and navigate
      const { useNotesStore } = await import('./notesStore');
      const { useAppStore } = await import('./appStore');
      
      useNotesStore.getState().addNote(newNote);
      useAppStore.getState().navigateToNoteDetail(noteId);
      
      console.log('✅ WORKFLOW: Note created and navigation triggered');
      
      // Set pending for transcription and start it
      set({ pendingNoteId: noteId });
      get().startTranscriptionProcess(audioBlob, noteId);
      
      return noteId;
    } catch (error) {
      console.error('❌ WORKFLOW: Error creating note:', error);
      throw error;
    }
  },

  handleTranscriptionComplete: (text: string) => {
    const { pendingNoteId, lastTranscription } = get();
    
    if (text !== lastTranscription && text.trim()) {
      console.log('🔄 WORKFLOW: Processing transcription completion');
      set({ lastTranscription: text });
      
      const smartTitle = generateSmartTitle(text);
      
      import('./notesStore').then(({ useNotesStore }) => {
        import('./appStore').then(({ useAppStore }) => {
          import('./agentsStore').then(({ useAgentsStore }) => {
            const noteIdToUpdate = pendingNoteId || useAppStore.getState().selectedNoteId;
            
            if (noteIdToUpdate) {
              const notesStore = useNotesStore.getState();
              const existingNote = notesStore.getNoteById(noteIdToUpdate);
              
              if (existingNote) {
                console.log('✅ WORKFLOW: Updating note with transcribed content');
                const updatedNote = {
                  ...existingNote,
                  title: smartTitle,
                  content: text,
                  updatedAt: Date.now(),
                  lastEdited: Date.now()
                };
                
                notesStore.updateNote(updatedNote);
                
                // Run auto-agents if available and configured
                const agentsStore = useAgentsStore.getState();
                if (agentsStore.canRunAnyAgents()) {
                  console.log('🤖 WORKFLOW: Running auto-agents for transcribed note');
                  agentsStore.processNoteWithAllAutoAgents(noteIdToUpdate);
                }
              }
            }
            
            // Clear processing state
            import('./recordingStore').then(({ useRecordingStore }) => {
              useRecordingStore.getState().setIsProcessing(false);
              useRecordingStore.getState().setProcessingStatus('');
            });
            
            set({ pendingNoteId: null });
            console.log('✅ WORKFLOW: Transcription complete');
          });
        });
      });
    }
  },

  startTranscriptionProcess: async (audioBlob: Blob, noteId: string) => {
    console.log('🔄 WORKFLOW: Starting transcription for note:', noteId);
    
    try {
      const { useRecordingStore } = await import('./recordingStore');
      
      useRecordingStore.getState().setIsProcessing(true);
      useRecordingStore.getState().setProcessingStatus('Transcribing audio...');
      
      const audioBuffer = await audioBlob.arrayBuffer();
      const audioContext = new AudioContext({ sampleRate: 16000 });
      const audioData = await audioContext.decodeAudioData(audioBuffer);
      
      // Use the global transcriber store
      const transcriberStore = useTranscriberStore.getState();
      transcriberStore.resetTranscription();
      transcriberStore.startTranscription(audioData);
      
      console.log('✅ WORKFLOW: Transcription started via global store');
    } catch (error) {
      console.error('❌ WORKFLOW: Error starting transcription:', error);
      import('./recordingStore').then(({ useRecordingStore }) => {
        useRecordingStore.getState().setIsProcessing(false);
        useRecordingStore.getState().setProcessingStatus('Error starting transcription');
      });
    }
  },

  setupTranscriberWatcher: () => {
    console.log('🔄 WORKFLOW: Setting up transcriber watcher');
    
    // Subscribe to transcriber store changes
    const unsubscribe = useTranscriberStore.subscribe((state, prevState) => {
      // Check if transcription completed
      if (
        state.transcript && 
        !state.isBusy && 
        state.transcript.text && 
        state.transcript.text !== prevState?.transcript?.text
      ) {
        console.log('🔄 WORKFLOW: Transcription state changed, processing completion');
        get().handleTranscriptionComplete(state.transcript.text);
      }
    });
    
    // Store the unsubscribe function for cleanup if needed
    // Note: Zustand subscriptions are automatically cleaned up when the store is destroyed
  },

  cleanupTranscriberWatcher: () => {
    // Zustand subscriptions are automatically cleaned up
    console.log('🔄 WORKFLOW: Transcriber watcher cleanup (automatic)');
  },

  handleUploadFile: () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        if (!arrayBuffer) return;

        const audioCTX = new AudioContext({ sampleRate: 16000 });
        const decoded = await audioCTX.decodeAudioData(arrayBuffer);
        
        // Use global transcriber store
        const transcriberStore = useTranscriberStore.getState();
        transcriberStore.resetTranscription();
        transcriberStore.startTranscription(decoded);
      };
      reader.readAsArrayBuffer(file);
    };
    input.click();
  },

  downloadAudioFromUrl: async (url: string) => {
    if (!url) return;

    try {
      const { data } = await axios.get(url, {
        responseType: "arraybuffer",
      });

      const audioCTX = new AudioContext({ sampleRate: Constants.SAMPLING_RATE });
      const decoded = await audioCTX.decodeAudioData(data);
      
      // Use global transcriber store
      const transcriberStore = useTranscriberStore.getState();
      transcriberStore.resetTranscription();
      transcriberStore.startTranscription(decoded);
      
      // Close modal
      import('./audioStore').then(({ useAudioStore }) => {
        useAudioStore.getState().setShowUrlModal(false);
        useAudioStore.getState().setAudioDownloadUrl('');
      });
    } catch (error) {
      console.error("❌ WORKFLOW: Failed to download audio", error);
    }
  },

  handleImportNotes: (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedNotesData = JSON.parse(e.target?.result as string);
          if (Array.isArray(importedNotesData) && importedNotesData.every(note => 
            typeof note === 'object' && 
            'id' in note && 
            'title' in note && 
            'content' in note
          )) {
            import('./notesStore').then(({ useNotesStore }) => {
              useNotesStore.getState().importNotes(importedNotesData);
            });
          } else {
            alert('Invalid notes format');
          }
        } catch (error) {
          console.error('❌ WORKFLOW: Error importing notes:', error);
          alert('Error importing notes');
        }
      };
      reader.readAsText(file);
    }
  }
}));