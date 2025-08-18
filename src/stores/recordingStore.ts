import { create } from 'zustand';
import { audioStorage } from '../utils/audioStorage';

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
  
  // Internal refs (no React refs needed)
  mediaRecorderInstance: MediaRecorder | null;
  audioStreamInstance: MediaStream | null;
  recordedChunksInternal: Blob[];
  timerInterval: number | null;
  
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
  
  // High-level actions that handle everything
  startRecordingFlow: () => Promise<void>;
  pauseRecordingFlow: () => void;
  resumeRecordingFlow: () => void;
  stopRecordingFlow: () => void;
  cancelRecordingFlow: () => void;
  cleanup: () => void;
  handleRecordingStop: () => Promise<void>;
  createNoteFromRecording: () => Promise<void>;
  startTranscription: (audioBlob: Blob, noteId: string) => Promise<void>;
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
  
  mediaRecorderInstance: null,
  audioStreamInstance: null,
  recordedChunksInternal: [],
  timerInterval: null,
  
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
    const state = get();
  
    // Stop the media recorder if it exists
    if (state.mediaRecorderInstance && state.mediaRecorderInstance.state !== 'inactive') {
      state.mediaRecorderInstance.stop();
    }
  
    // Stop the timer
    if (state.timerInterval) {
      clearInterval(state.timerInterval);
    }
  
    // Release the audio stream
    if (state.audioStreamInstance) {
      state.audioStreamInstance.getTracks().forEach(track => track.stop());
    }
  
    set({
      isRecording: false,
      isPaused: false,
      timerInterval: null
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
    // Calculate elapsed time based on start time and paused duration for accuracy
    // This prevents timer jumps by using the actual elapsed time instead of incrementing
    const now = Date.now();
    const state = get();
    const elapsedMs = now - state.recordingStartTime - state.pausedDuration;
    const elapsedSeconds = Math.floor(elapsedMs / 1000);
    
    set({
      recordingTime: elapsedSeconds
    });
  },
  
  calculateFinalDuration: () => {
    const state = get();
    const endTime = Date.now();
    const totalTime = endTime - state.recordingStartTime;
    const actualRecordingTime = totalTime - state.pausedDuration;
    return Math.floor(actualRecordingTime / 1000);
  },
  
  // High-level flows that handle everything
  startRecordingFlow: async () => {
    try {
      console.log('🎙️ RecordingStore: Starting recording flow');
      
      // Clear previous data
      set({ recordedChunksInternal: [] });
      
      // Get audio stream with lower quality settings for voice notes
      // These settings optimize for voice recording while reducing file size
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      
      // Check if mediaDevices is available
      if (!navigator.mediaDevices) {
        console.error('❌ RecordingStore: MediaDevices API not available');
        throw new Error('Media recording is not supported in this browser or context');
      }
      
      // Audio constraints optimized for voice recording and smaller file size
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          // Mono audio is sufficient for voice notes and reduces file size by half
          channelCount: 1,
          // Lower sample rate still good for voice but smaller files
          sampleRate: 22050
        } 
      });
      
      // Set up MediaRecorder with compatible format and compression
      let options: MediaRecorderOptions = {
        // Low bitrate for voice is sufficient (8-16kbps is typical for voice)
        audioBitsPerSecond: 16000
      };
      
      if (isIOS || isSafari) {
        // iOS/Safari optimizations
        if (MediaRecorder.isTypeSupported('audio/mp4')) {
          options.mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/aac')) {
          options.mimeType = 'audio/aac';
        } else if (MediaRecorder.isTypeSupported('audio/wav')) {
          options.mimeType = 'audio/wav';
        }
      } else {
        // Opus codec provides excellent compression for voice
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          options.mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          options.mimeType = 'audio/webm';
        }
      }
      
      const recorder = new MediaRecorder(stream, options);
      
      recorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) {
          console.log(`🎙️ RecordingStore: Received data chunk of size ${event.data.size} bytes`);
          const currentState = get();
          set({ 
            recordedChunksInternal: [...currentState.recordedChunksInternal, event.data],
            recordedChunks: [...currentState.recordedChunks, event.data]
          });
        } else {
          console.warn('🎙️ RecordingStore: Received empty data chunk');
        }
      });
      
      recorder.addEventListener('stop', () => {
        console.log('🎙️ RecordingStore: MediaRecorder stop event fired');
        get().handleRecordingStop();
      });
      
      // Use a smaller timeslice for more frequent chunks, which helps with reliability
      recorder.start(500);
      
      // Start timer
      const interval = window.setInterval(() => {
        get().updateRecordingTime();
      }, 1000);
      
      // Update state
      set({
        mediaRecorderInstance: recorder,
        audioStreamInstance: stream,
        timerInterval: interval,
        isRecording: true,
        isPaused: false,
        isCancelled: false,
        recordingTime: 0,
        recordingStartTime: Date.now(),
        pausedDuration: 0,
        pauseStartTime: 0,
        recordedChunks: [],
        audioStream: stream,
        mediaRecorder: recorder
      });
      
      // No need to navigate - React Router handles this now
      
    } catch (error) {
      console.error('❌ RecordingStore: Failed to start recording:', error);
      throw error;
    }
  },
  
  pauseRecordingFlow: () => {
    const state = get();
    console.log('🎙️ RecordingStore: Attempting to pause recording');
    
    if (!state.isRecording || state.isPaused) {
      console.log('🎙️ RecordingStore: Cannot pause - not recording or already paused');
      return;
    }
    
    if (state.mediaRecorderInstance) {
      try {
        // Request data before pausing to ensure we have the latest chunks
        state.mediaRecorderInstance.requestData();
        
        // Check if pause is supported in this browser
        if (typeof state.mediaRecorderInstance.pause === 'function') {
          state.mediaRecorderInstance.pause();
          console.log('🎙️ RecordingStore: MediaRecorder paused');
        } else {
          console.warn('🎙️ RecordingStore: MediaRecorder pause not supported, stopping instead');
          // If pause isn't supported, we'll need to stop and restart later
          // For now, just mark as paused in the UI
        }
        
        const now = Date.now();
        set({
          isPaused: true,
          pauseStartTime: now
        });
        
        // Stop the timer
        if (state.timerInterval) {
          clearInterval(state.timerInterval);
          set({ timerInterval: null });
        }
      } catch (error) {
        console.error('❌ RecordingStore: Error pausing recording:', error);
      }
    } else {
      console.error('❌ RecordingStore: Cannot pause - no MediaRecorder instance');
    }
  },
  
  resumeRecordingFlow: () => {
    const state = get();
    console.log('🎙️ RecordingStore: Attempting to resume recording');
    
    if (!state.isRecording || !state.isPaused) {
      console.log('🎙️ RecordingStore: Cannot resume - not recording or not paused');
      return;
    }
    
    if (state.mediaRecorderInstance) {
      try {
        // Check if resume is supported in this browser
        if (typeof state.mediaRecorderInstance.resume === 'function') {
          state.mediaRecorderInstance.resume();
          console.log('🎙️ RecordingStore: MediaRecorder resumed');
        } else {
          console.warn('🎙️ RecordingStore: MediaRecorder resume not supported');
          // If resume isn't supported, we'd need to restart recording
          // For now, just update the UI state
        }
        
        const now = Date.now();
        const additionalPausedTime = state.pauseStartTime > 0 ? now - state.pauseStartTime : 0;
        
        // Restart timer
        const interval = window.setInterval(() => {
          get().updateRecordingTime();
        }, 1000);
        
        set({
          isPaused: false,
          pausedDuration: state.pausedDuration + additionalPausedTime,
          pauseStartTime: 0,
          timerInterval: interval
        });
      } catch (error) {
        console.error('❌ RecordingStore: Error resuming recording:', error);
      }
    } else {
      console.error('❌ RecordingStore: Cannot resume - no MediaRecorder instance');
    }
  },
  
  stopRecordingFlow: () => {
    const state = get();
    console.log('🎙️ RecordingStore: Stopping recording flow');
    
    // First set processing state to show user something is happening
    set({ 
      isProcessing: true,
      processingStatus: 'Finalizing recording...'
    });
    
    // Make sure we're not already stopped
    if (state.mediaRecorderInstance && state.mediaRecorderInstance.state !== 'inactive') {
      console.log('🎙️ RecordingStore: Stopping MediaRecorder');
      try {
        // Request a final chunk before stopping
        if (state.mediaRecorderInstance.state === 'recording' || state.mediaRecorderInstance.state === 'paused') {
          console.log('🎙️ RecordingStore: Requesting final data chunk');
          state.mediaRecorderInstance.requestData();
          
          // Add a small delay to ensure the dataavailable event has time to fire
          setTimeout(() => {
            try {
              // Then stop the recorder - this will trigger the 'stop' event
              if (state.mediaRecorderInstance) {
                state.mediaRecorderInstance.stop();
                console.log('🎙️ RecordingStore: MediaRecorder stopped after final data request');
              }
            } catch (innerError) {
              console.error('❌ RecordingStore: Error in delayed stop:', innerError);
              get().handleRecordingStop();
            }
          }, 300);
        } else {
          // If not recording or paused, just stop
          state.mediaRecorderInstance.stop();
          console.log('🎙️ RecordingStore: MediaRecorder stopped directly');
        }
      } catch (error) {
        console.error('❌ RecordingStore: Error stopping MediaRecorder:', error);
        // If there's an error, manually trigger the stop handler
        get().handleRecordingStop();
      }
    } else {
      console.log('🎙️ RecordingStore: MediaRecorder already inactive, handling stop directly');
      // If recorder is already stopped, manually trigger the stop handler
      get().handleRecordingStop();
    }
    
    // Update UI state immediately
    set({ 
      isRecording: false, 
      isPaused: false 
    });
  },
  
  cancelRecordingFlow: () => {
    const state = get();
    console.log('🎙️ RecordingStore: Cancelling recording flow');
    
    if (state.mediaRecorderInstance) {
      state.mediaRecorderInstance.stop();
    }
    
    get().cleanup();
    set({
      isRecording: false,
      isPaused: false,
      isCancelled: true,
      recordedChunks: [],
      recordedChunksInternal: [],
      currentAudioBlob: null,
      isProcessing: false,
      processingStatus: ''
    });
  },
  
  cleanup: () => {
    const state = get();
    
    if (state.timerInterval) {
      clearInterval(state.timerInterval);
    }
    
    if (state.audioStreamInstance) {
      state.audioStreamInstance.getTracks().forEach(track => track.stop());
    }
    
    set({
      timerInterval: null,
      mediaRecorderInstance: null,
      audioStreamInstance: null,
      audioStream: null,
      mediaRecorder: null
    });
  },
  
  handleRecordingStop: async () => {
    const state = get();
    
    if (state.isCancelled) {
      console.log('🎙️ RecordingStore: Recording was cancelled, cleaning up');
      set({ recordedChunksInternal: [] });
      return;
    }
    
    console.log('🎙️ RecordingStore: Recording stopped, chunks collected:', state.recordedChunksInternal.length);
    
    // If we don't have any chunks yet, try to wait a bit for them to arrive
    if (state.recordedChunksInternal.length === 0) {
      console.log('🎙️ RecordingStore: No chunks yet, waiting briefly for chunks to arrive...');
      
      // Wait a short time for chunks to arrive (dataavailable events might be delayed)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Check again after waiting
      const updatedState = get();
      console.log('🎙️ RecordingStore: After waiting, chunks:', updatedState.recordedChunksInternal.length);
    }
    
    await get().createNoteFromRecording();
  },
  
  createNoteFromRecording: async (): Promise<void> => {
    const state = get();
    
    console.log('🎙️ RecordingStore: Creating note from recording, chunks:', state.recordedChunksInternal.length);
    
    if (state.recordedChunksInternal.length === 0) {
      console.error('❌ RecordingStore: No chunks to process');
      set({
        isProcessing: false,
        processingStatus: 'Error: No audio data recorded'
      });
      return;
    }

    try {
      const now = Date.now();
      const noteId = now.toString();
      
      // Determine the correct MIME type based on browser
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      
      // Select appropriate MIME type for the blob
      let mimeType = 'audio/webm';
      let fileExtension = 'webm';
      
      if (isIOS || isSafari) {
        if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
          fileExtension = 'mp4';
        } else if (MediaRecorder.isTypeSupported('audio/aac')) {
          mimeType = 'audio/aac';
          fileExtension = 'aac';
        }
      }
      
      console.log(`🎙️ RecordingStore: Creating blob with MIME type ${mimeType}`);
      
      // Create audio blob with the appropriate MIME type
      const audioBlob = new Blob(state.recordedChunksInternal, { type: mimeType });
      console.log(`🎙️ RecordingStore: Created blob of size ${audioBlob.size} bytes`);
      
      if (audioBlob.size < 100) {
        console.error('❌ RecordingStore: Audio blob is too small, likely no audio was recorded');
        set({
          isProcessing: false,
          processingStatus: 'Error: Recording failed'
        });
        return;
      }
      
      // Calculate duration
      const actualDuration = get().calculateFinalDuration();
      console.log(`🎙️ RecordingStore: Recording duration: ${actualDuration} seconds`);
      
      // Save audio with appropriate file extension
      const audioFileName = `recording_${noteId}.${fileExtension}`;
      const audioUrl = await audioStorage.saveAudio(audioBlob, audioFileName);
      console.log(`🎙️ RecordingStore: Saved audio to ${audioUrl}`);
      
      // Create note
      const newNote = {
        id: noteId,
        title: 'Voice Recording',
        content: '',
        audioUrl,
        duration: actualDuration,
        createdAt: now,
        updatedAt: now,
        created: now,
        lastEdited: now,
        versions: [],
        tags: []
      };
      
      // Add to notes store
      const { useNotesStore } = await import('./notesStore');
      useNotesStore.getState().addNote(newNote);
      console.log(`🎙️ RecordingStore: Added note to store with ID ${noteId}`);
      
      // Reset processing state
      set({
        isProcessing: false,
        processingStatus: ''
      });
      
      // Use React Router for navigation without page reload
      console.log(`🎙️ RecordingStore: Navigating to note detail page for ${noteId}`);
      
      // Use React Router for navigation to avoid page reloads
      // Import dynamically to avoid circular dependencies
      try {
        // Use the history API directly to avoid circular imports
        // This will use the React Router context without requiring imports
        window.history.pushState({}, '', `/note/${noteId}`);
        
        // Dispatch a navigation event to notify React Router of the change
        const navigationEvent = new PopStateEvent('popstate');
        window.dispatchEvent(navigationEvent);
        
        console.log(`🎙️ RecordingStore: Navigated to note ${noteId} using history API`);
      } catch (error) {
        console.error('❌ RecordingStore: Error navigating with history API:', error);
      }
      
      // Start transcription
      await get().startTranscription(audioBlob, noteId);
      
    } catch (error) {
      console.error('❌ RecordingStore: Error creating note:', error);
      set({
        isProcessing: false,
        processingStatus: 'Error creating note'
      });
    }
  },
  
  startTranscription: async (audioBlob: Blob, noteId: string) => {
    try {
      const audioBuffer = await audioBlob.arrayBuffer();
      const audioContext = new AudioContext({ sampleRate: 16000 });
      const audioData = await audioContext.decodeAudioData(audioBuffer);
      
      // Use the transcription store - it handles its own processing state
      const { useTranscriptionStore } = await import('./transcriptionStore');
      useTranscriptionStore.getState().startTranscription(audioData, noteId);
      
    } catch (error) {
      console.error('❌ RecordingStore: Error starting transcription:', error);
    }
  }
}));