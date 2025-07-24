import { create } from 'zustand';
import { useSettingsStore } from './settingsStore';
import { useNotesStore } from './notesStore';
import { useAgentsStore } from './agentsStore';
import { generateSmartTitle } from '../utils/titleGenerator';
import { isStorageUrl, resolveStorageUrl } from '../utils/audioStorage';

interface TranscriptionState {
  // Worker state
  worker: Worker | null;
  isInitialized: boolean;
  
  // Current transcription
  currentNoteId: string | null;
  lastTranscription: string | null;
  isProcessing: boolean;
  processingStatus: string;
  
  // Actions
  initializeWorker: () => void;
  startTranscription: (audioData: AudioBuffer, noteId: string) => void;
  startTranscriptionFromUrl: (audioUrl: string, noteId: string) => Promise<void>;
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
  isProcessing: false,
  processingStatus: '',
  
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
      case "initiate":
        set({ processingStatus: `Loading ${message.file}...` });
        break;
        
      case "progress":
        set({ processingStatus: `Loading model... ${Math.round(message.progress)}%` });
        break;
        
      case "ready":
        set({ processingStatus: 'Model loaded, starting transcription...' });
        break;
        
      case "update":
        set({ processingStatus: 'Transcribing...' });
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
        set({ 
          isProcessing: false, 
          processingStatus: 'Transcription failed',
          currentNoteId: null 
        });
        break;
    }
  },
  
  startTranscriptionFromUrl: async (audioUrl: string, noteId: string) => {
    console.log('🎯 TranscriptionStore: Starting transcription from URL:', audioUrl);
    
    set({ 
      isProcessing: true, 
      processingStatus: 'Loading audio...',
      currentNoteId: noteId 
    });
    
    try {
      // Resolve storage URL if needed
      let resolvedUrl = audioUrl;
      if (isStorageUrl(audioUrl)) {
        const resolved = await resolveStorageUrl(audioUrl);
        if (!resolved) {
          throw new Error('Failed to resolve audio URL');
        }
        resolvedUrl = resolved.url;
      }
      
      // Fetch and decode audio
      const response = await fetch(resolvedUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch audio: ${response.statusText}`);
      }
      
      const audioBlob = await response.blob();
      const audioBuffer = await audioBlob.arrayBuffer();
      const audioContext = new AudioContext({ sampleRate: 16000 });
      const audioData = await audioContext.decodeAudioData(audioBuffer);
      
      // Start transcription
      get().startTranscription(audioData, noteId);
      
    } catch (error) {
      console.error('❌ TranscriptionStore: Failed to start transcription from URL:', error);
      set({ 
        isProcessing: false, 
        processingStatus: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        currentNoteId: null 
      });
    }
  },
  
  startTranscription: (audioData: AudioBuffer, noteId: string) => {
    const state = get();
    
    if (!state.worker) {
      get().initializeWorker();
    }
    
    if (!state.worker) {
      console.error('❌ TranscriptionStore: Worker not initialized');
      set({ 
        isProcessing: false, 
        processingStatus: 'Failed to initialize transcription worker' 
      });
      return;
    }

    console.log('🎯 TranscriptionStore: Starting transcription for note:', noteId);
    
    set({
      currentNoteId: noteId,
      lastTranscription: null,
      isProcessing: true,
      processingStatus: 'Preparing transcription...'
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

    // Update note content progressively - this works regardless of current UI state
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
    // Update note - this works regardless of current UI state
      const smartTitle = generateSmartTitle(text);
      const updatedNote = {
        ...note,
        title: smartTitle,
        content: text,
        updatedAt: Date.now(),
        lastEdited: Date.now()
      };

      notesStore.updateNote(updatedNote);

      // Run auto-agents if available - this also works regardless of UI state
      const agentsStore = useAgentsStore.getState();
      if (agentsStore.canRunAnyAgents()) {
        console.log('🤖 TranscriptionStore: Running auto-agents');
        agentsStore.processNoteWithAllAutoAgents(state.currentNoteId);
      }
    }

    // Clear current note ID
    set({ currentNoteId: null });
    
    // TODO: Show toast notification when we have toast system
    console.log('🎉 Transcription completed for note:', state.currentNoteId);
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
      lastTranscription: null,
      isProcessing: false,
      processingStatus: ''
    });
  }
}));