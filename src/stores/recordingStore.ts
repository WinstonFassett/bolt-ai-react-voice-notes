import { create } from 'zustand';

interface RecordingState {
  // Recording state
  isRecording: boolean;
  isPaused: boolean;
  isCancelled: boolean;
  isProcessing: boolean;
  processingStatus: string;
  recordingTime: number;
  
  // Audio data
  audioStream: MediaStream | null;
  mediaRecorder: MediaRecorder | null;
  currentAudioBlob: Blob | null;
  recordedChunks: Blob[];
  
  // Timing
  recordingStartTime: number;
  pausedDuration: number;
  pauseStartTime: number;
  
  // Actions
  setIsRecording: (recording: boolean) => void;
  setIsPaused: (paused: boolean) => void;
  setIsCancelled: (cancelled: boolean) => void;
  setIsProcessing: (processing: boolean) => void;
  setProcessingStatus: (status: string) => void;
  setRecordingTime: (time: number) => void;
  setAudioStream: (stream: MediaStream | null) => void;
  setMediaRecorder: (recorder: MediaRecorder | null) => void;
  setCurrentAudioBlob: (blob: Blob | null) => void;
  setRecordedChunks: (chunks: Blob[]) => void;
  addRecordedChunk: (chunk: Blob) => void;
  
  // Complex actions
  startRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => void;
  cancelRecording: () => void;
  resetRecording: () => void;
  updateRecordingTime: () => void;
  calculateFinalDuration: () => number;
}

export const useRecordingStore = create<RecordingState>((set, get) => ({
  // Initial state
  isRecording: false,
  isPaused: false,
  isCancelled: false,
  isProcessing: false,
  processingStatus: '',
  recordingTime: 0,
  
  audioStream: null,
  mediaRecorder: null,
  currentAudioBlob: null,
  recordedChunks: [],
  
  recordingStartTime: 0,
  pausedDuration: 0,
  pauseStartTime: 0,
  
  // Simple setters
  setIsRecording: (recording) => set({ isRecording: recording }),
  setIsPaused: (paused) => set({ isPaused: paused }),
  setIsCancelled: (cancelled) => set({ isCancelled: cancelled }),
  setIsProcessing: (processing) => set({ isProcessing: processing }),
  setProcessingStatus: (status) => set({ processingStatus: status }),
  setRecordingTime: (time) => set({ recordingTime: time }),
  setAudioStream: (stream) => set({ audioStream: stream }),
  setMediaRecorder: (recorder) => set({ mediaRecorder: recorder }),
  setCurrentAudioBlob: (blob) => set({ currentAudioBlob: blob }),
  setRecordedChunks: (chunks) => set({ recordedChunks: chunks }),
  addRecordedChunk: (chunk) => set((state) => ({ 
    recordedChunks: [...state.recordedChunks, chunk] 
  })),
  
  // Complex actions
  startRecording: () => {
    const now = Date.now();
    set({
      isRecording: true,
      isPaused: false,
      isCancelled: false,
      recordingTime: 0,
      recordingStartTime: now,
      pausedDuration: 0,
      pauseStartTime: 0,
      recordedChunks: []
    });
  },
  
  pauseRecording: () => {
    const now = Date.now();
    set({
      isPaused: true,
      pauseStartTime: now
    });
  },
  
  resumeRecording: () => {
    const state = get();
    const now = Date.now();
    const additionalPausedTime = state.pauseStartTime > 0 ? now - state.pauseStartTime : 0;
    
    set({
      isPaused: false,
      pausedDuration: state.pausedDuration + additionalPausedTime,
      pauseStartTime: 0
    });
  },
  
  stopRecording: () => {
    set({
      isRecording: false,
      isPaused: false
    });
  },
  
  cancelRecording: () => {
    set({
      isRecording: false,
      isPaused: false,
      isCancelled: true,
      recordedChunks: [],
      currentAudioBlob: null,
      isProcessing: false,
      processingStatus: ''
    });
  },
  
  resetRecording: () => {
    set({
      isRecording: false,
      isPaused: false,
      isCancelled: false,
      isProcessing: false,
      processingStatus: '',
      recordingTime: 0,
      audioStream: null,
      mediaRecorder: null,
      currentAudioBlob: null,
      recordedChunks: [],
      recordingStartTime: 0,
      pausedDuration: 0,
      pauseStartTime: 0
    });
  },
  
  updateRecordingTime: () => {
    set((state) => ({
      recordingTime: state.recordingTime + 1
    }));
  },
  
  calculateFinalDuration: () => {
    const state = get();
    const endTime = Date.now();
    const totalTime = endTime - state.recordingStartTime;
    const actualRecordingTime = totalTime - state.pausedDuration;
    return Math.floor(actualRecordingTime / 1000);
  }
}));