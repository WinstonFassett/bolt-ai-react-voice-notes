import { create } from 'zustand';
import { useSettingsStore } from './settingsStore';
import { useNotesStore } from './notesStore';
import { useRecordingStore } from './recordingStore';
import { useAgentsStore } from './agentsStore';
import { generateSmartTitle } from '../utils/titleGenerator';

interface TranscriptionState {
  // Worker state
  worker: Worker | null;
  isInitialized: boolean;
  
  // Current transcription
  currentNoteId: string | null;
  lastTranscription: string | null;
  
  // Actions
  initializeWorker: () => void;
  startTranscription: (audioData: AudioBuffer, noteId: string) => void;
  cleanup: () => void;
  
  // Internal handlers
  handleWorkerMessage: (event: MessageEvent) => void;
  updateTranscription: (text: string) => void;
  completeTranscription: (text: string) => void;
}

export const useTranscriptionStore = create<TranscriptionState>((set, get) => ({
  worker: null,
  isInitialized: false,
  currentNoteId: null,
  lastTranscription: null,
  
  initializeWorker: () => {
    const state = get();
    if (state.worker) return;

    console.log('🎯 TranscriptionStore: Initializing worker');
    
    const worker = new Worker(new URL("../worker.js", import.meta.url), {
      type: "module",
    });

    worker.addEventListener("message", get().handleWorkerMessage);
    
    set({ 
      worker, 
      isInitialized: true 
    });
  },
  
  handleWorkerMessage: (event: MessageEvent) => {
    const message = event.data;

    switch (message.status) {
      case "update":
        if (message.data && message.data[0]) {
          get().updateTranscription(message.data[0]);
        }
        break;

      case "complete":
        if (message.data && message.data.text) {
          get().completeTranscription(message.data.text);
        }
        break;

      case "error":
        console.error('❌ TranscriptionStore: Worker error:', message.data);
        useRecordingStore.getState().setIsProcessing(false);
        useRecordingStore.getState().setProcessingStatus('Transcription failed');
        break;
    }
  },
  
  startTranscription: (audioData: AudioBuffer, noteId: string) => {
    const state = get();
    
    if (!state.worker) {
      get().initializeWorker();
    }
    
    if (!state.worker) {
      console.error('❌ TranscriptionStore: Worker not initialized');
      return;
    }

    console.log('🎯 TranscriptionStore: Starting transcription for note:', noteId);
    
    set({
      currentNoteId: noteId,
      lastTranscription: null
    });

    // Get settings
    const settings = useSettingsStore.getState();

    // Process audio
    let audio;
    if (audioData.numberOfChannels === 2) {
      const SCALING_FACTOR = Math.sqrt(2);
      let left = audioData.getChannelData(0);
      let right = audioData.getChannelData(1);

      audio = new Float32Array(left.length);
      for (let i = 0; i < audioData.length; ++i) {
        audio[i] = SCALING_FACTOR * (left[i] + right[i]) / 2;
      }
    } else {
      audio = audioData.getChannelData(0);
    }

    // Send to worker
    state.worker.postMessage({
      audio,
      model: settings.model,
      multilingual: settings.multilingual,
      quantized: settings.quantized,
      subtask: settings.multilingual ? settings.subtask : null,
      language: settings.multilingual && settings.language !== "auto" ? settings.language : null,
    });
  },
  
  updateTranscription: (text: string) => {
    const state = get();
    if (!state.currentNoteId || !text) return;

    // Update note content progressively
    const notesStore = useNotesStore.getState();
    const note = notesStore.getNoteById(state.currentNoteId);
    
    if (note) {
      const updatedNote = {
        ...note,
        content: text,
        updatedAt: Date.now(),
        lastEdited: Date.now()
      };
      notesStore.updateNote(updatedNote);
    }
  },
  
  completeTranscription: (text: string) => {
    const state = get();
    if (!state.currentNoteId || !text || text === state.lastTranscription) return;

    console.log('✅ TranscriptionStore: Transcription complete');
    
    set({ lastTranscription: text });

    const notesStore = useNotesStore.getState();
    const note = notesStore.getNoteById(state.currentNoteId);

    if (note) {
      const smartTitle = generateSmartTitle(text);
      const updatedNote = {
        ...note,
        title: smartTitle,
        content: text,
        updatedAt: Date.now(),
        lastEdited: Date.now()
      };

      notesStore.updateNote(updatedNote);

      // Run auto-agents if available
      const agentsStore = useAgentsStore.getState();
      if (agentsStore.canRunAnyAgents()) {
        console.log('🤖 TranscriptionStore: Running auto-agents');
        agentsStore.processNoteWithAllAutoAgents(state.currentNoteId);
      }
    }

    // Clear processing state
    useRecordingStore.getState().setIsProcessing(false);
    useRecordingStore.getState().setProcessingStatus('');
    set({ currentNoteId: null });
  },
  
  cleanup: () => {
    const state = get();
    if (state.worker) {
      state.worker.terminate();
    }
    
    set({
      worker: null,
      isInitialized: false,
      currentNoteId: null,
      lastTranscription: null
    });
  }
}));