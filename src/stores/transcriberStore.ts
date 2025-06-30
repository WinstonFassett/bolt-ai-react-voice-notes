import { create } from 'zustand';
import { useSettingsStore } from './settingsStore';

interface ProgressItem {
  file: string;
  loaded: number;
  progress: number;
  total: number;
  name: string;
  status: string;
}

interface TranscriberUpdateData {
  data: [
    string,
    { chunks: { text: string; timestamp: [number, number | null] }[] },
  ];
  text: string;
}

interface TranscriberCompleteData {
  data: {
    text: string;
    chunks: { text: string; timestamp: [number, number | null] }[];
  };
}

export interface TranscriberData {
  isBusy: boolean;
  text: string;
  chunks: { text: string; timestamp: [number, number | null] }[];
}

interface TranscriberState {
  // Core state
  transcript: TranscriberData | undefined;
  isBusy: boolean;
  isModelLoading: boolean;
  progressItems: ProgressItem[];
  webWorker: Worker | null;
  isInitialized: boolean;
  
  // Actions
  initializeTranscriber: () => void;
  startTranscription: (audioData: AudioBuffer) => void;
  resetTranscription: () => void;
  cleanupTranscriber: () => void;
  
  // Internal methods
  createWebWorker: () => Worker;
  handleWorkerMessage: (event: MessageEvent) => void;
}

export const useTranscriberStore = create<TranscriberState>((set, get) => ({
  // Initial state
  transcript: undefined,
  isBusy: false,
  isModelLoading: false,
  progressItems: [],
  webWorker: null,
  isInitialized: false,
  
  // Initialize the transcriber and web worker
  initializeTranscriber: () => {
    const state = get();
    if (state.isInitialized) {
      console.log('🎯 TranscriberStore: Already initialized');
      return;
    }
    
    console.log('🎯 TranscriberStore: Initializing transcriber');
    
    try {
      const worker = state.createWebWorker();
      set({ 
        webWorker: worker, 
        isInitialized: true 
      });
      console.log('✅ TranscriberStore: Transcriber initialized successfully');
    } catch (error) {
      console.error('❌ TranscriberStore: Failed to initialize transcriber:', error);
    }
  },
  
  // Create and configure the web worker
  createWebWorker: () => {
    const worker = new Worker(new URL("../worker.js", import.meta.url), {
      type: "module",
    });
    
    // Set up message handler
    worker.addEventListener("message", get().handleWorkerMessage);
    
    return worker;
  },
  
  // Handle messages from the web worker
  handleWorkerMessage: (event: MessageEvent) => {
    const message = event.data;
    console.log('🎯 TranscriberStore: Worker message:', message.status);
    
    switch (message.status) {
      case "progress":
        // Model file progress: update one of the progress items
        set((state) => ({
          progressItems: state.progressItems.map((item) => {
            if (item.file === message.file) {
              return { ...item, progress: message.progress };
            }
            return item;
          })
        }));
        break;
        
      case "update":
        // Received partial update
        const updateMessage = message as TranscriberUpdateData;
        set({
          transcript: {
            isBusy: true,
            text: updateMessage.data[0],
            chunks: updateMessage.data[1].chunks,
          }
        });
        break;
        
      case "complete":
        // Received complete transcript
        const completeMessage = message as TranscriberCompleteData;
        console.log('✅ TranscriberStore: Transcription complete:', completeMessage.data.text.length, 'characters');
        set({
          transcript: {
            isBusy: false,
            text: completeMessage.data.text,
            chunks: completeMessage.data.chunks,
          },
          isBusy: false
        });
        break;
        
      case "initiate":
        // Model file start load: add a new progress item to the list
        set((state) => ({
          isModelLoading: true,
          progressItems: [...state.progressItems, message]
        }));
        break;
        
      case "ready":
        set({ isModelLoading: false });
        break;
        
      case "error":
        console.error('❌ TranscriberStore: Worker error:', message.data);
        set({ isBusy: false });
        alert(
          `${message.data.message} This is most likely because you are using Safari on an M1/M2 Mac. Please try again from Chrome, Firefox, or Edge.\n\nIf this is not the case, please file a bug report.`,
        );
        break;
        
      case "done":
        // Model file loaded: remove the progress item from the list
        set((state) => ({
          progressItems: state.progressItems.filter((item) => item.file !== message.file)
        }));
        break;
        
      default:
        // initiate/download/done
        break;
    }
  },
  
  // Start transcription with audio data
  startTranscription: (audioData: AudioBuffer) => {
    const { webWorker } = get();
    if (!webWorker) {
      console.error('❌ TranscriberStore: No web worker available');
      return;
    }
    
    console.log('🎯 TranscriberStore: Starting transcription');
    
    // Get current settings
    const settings = useSettingsStore.getState();
    
    // Reset state
    set({
      transcript: undefined,
      isBusy: true
    });
    
    // Process audio data
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
      // If the audio is not stereo, we can just use the first channel
      audio = audioData.getChannelData(0);
    }
    
    // Send to worker
    webWorker.postMessage({
      audio,
      model: settings.model,
      multilingual: settings.multilingual,
      quantized: settings.quantized,
      subtask: settings.multilingual ? settings.subtask : null,
      language: settings.multilingual && settings.language !== "auto" ? settings.language : null,
    });
  },
  
  // Reset transcription state
  resetTranscription: () => {
    console.log('🎯 TranscriberStore: Resetting transcription');
    set({
      transcript: undefined,
      isBusy: false
    });
  },
  
  // Cleanup transcriber resources
  cleanupTranscriber: () => {
    const { webWorker } = get();
    if (webWorker) {
      console.log('🎯 TranscriberStore: Cleaning up transcriber');
      webWorker.removeEventListener("message", get().handleWorkerMessage);
      webWorker.terminate();
    }
    
    set({
      webWorker: null,
      isInitialized: false,
      transcript: undefined,
      isBusy: false,
      isModelLoading: false,
      progressItems: []
    });
  }
}));