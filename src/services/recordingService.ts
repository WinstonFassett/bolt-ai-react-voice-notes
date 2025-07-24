import { useRecordingStore } from '../stores/recordingStore';
import { useNotesStore } from '../stores/notesStore';
import { useRoutingStore } from '../stores/routingStore';
import { useAgentsStore } from '../stores/agentsStore';
import { audioStorage } from '../utils/audioStorage';
import { generateSmartTitle } from '../utils/titleGenerator';

class RecordingService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  private recordedChunks: Blob[] = [];
  private intervalRef: number | null = null;

  async startRecording() {
    try {
      console.log('🎙️ RecordingService: Starting recording');
      
      // Clear previous data
      this.recordedChunks = [];
      
      // Get audio stream with compatible settings
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      this.audioStream = stream;
      
      // Use compatible format
      let options: MediaRecorderOptions = {};
      if (isIOS || isSafari) {
        if (MediaRecorder.isTypeSupported('audio/mp4')) {
          options.mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/aac')) {
          options.mimeType = 'audio/aac';
        } else if (MediaRecorder.isTypeSupported('audio/wav')) {
          options.mimeType = 'audio/wav';
        }
      } else {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          options.mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          options.mimeType = 'audio/webm';
        }
      }
      
      this.mediaRecorder = new MediaRecorder(stream, options);
      
      this.mediaRecorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      });
      
      this.mediaRecorder.addEventListener('stop', () => {
        this.handleRecordingStop();
      });
      
      this.mediaRecorder.start(1000);
      
      // Update store
      const recordingStore = useRecordingStore.getState();
      recordingStore.startRecording();
      recordingStore.setAudioStream(stream);
      recordingStore.setMediaRecorder(this.mediaRecorder);
      
      // Start timer
      this.startTimer();
      
      // Navigate to record tab
      useRoutingStore.getState().setTab('record');
      
    } catch (error) {
      console.error('❌ RecordingService: Failed to start recording:', error);
      throw error;
    }
  }

  pauseRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
      useRecordingStore.getState().pauseRecording();
      this.stopTimer();
    }
  }

  resumeRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
      useRecordingStore.getState().resumeRecording();
      this.startTimer();
    }
  }

  stopRecording() {
    console.log('🎙️ RecordingService: Stopping recording');
    
    if (this.mediaRecorder && (this.mediaRecorder.state === 'recording' || this.mediaRecorder.state === 'paused')) {
      this.mediaRecorder.stop();
    }
    
    this.cleanup();
    useRecordingStore.getState().stopRecording();
  }

  cancelRecording() {
    console.log('🎙️ RecordingService: Cancelling recording');
    
    if (this.mediaRecorder) {
      this.mediaRecorder.stop();
    }
    
    this.cleanup();
    this.recordedChunks = [];
    useRecordingStore.getState().cancelRecording();
  }

  private startTimer() {
    this.stopTimer(); // Clear any existing timer
    this.intervalRef = window.setInterval(() => {
      useRecordingStore.getState().updateRecordingTime();
    }, 1000);
  }

  private stopTimer() {
    if (this.intervalRef) {
      clearInterval(this.intervalRef);
      this.intervalRef = null;
    }
  }

  private cleanup() {
    this.stopTimer();
    
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
      this.audioStream = null;
    }
    
    this.mediaRecorder = null;
    useRecordingStore.getState().setAudioStream(null);
    useRecordingStore.getState().setMediaRecorder(null);
  }

  private async handleRecordingStop() {
    const recordingState = useRecordingStore.getState();
    
    if (recordingState.isCancelled) {
      console.log('🎙️ RecordingService: Recording was cancelled, cleaning up');
      this.recordedChunks = [];
      return;
    }
    
    console.log('🎙️ RecordingService: Recording stopped, creating note');
    await this.createNoteFromRecording();
  }

  private async createNoteFromRecording() {
    if (this.recordedChunks.length === 0) {
      console.log('❌ RecordingService: No chunks to process');
      return;
    }

    try {
      const now = Date.now();
      const noteId = now.toString();
      
      // Create audio blob
      const audioBlob = new Blob(this.recordedChunks, { type: 'audio/webm' });
      
      // Calculate duration
      const recordingState = useRecordingStore.getState();
      const actualDuration = recordingState.calculateFinalDuration();
      
      // Save audio
      const audioFileName = `recording_${noteId}.webm`;
      const audioUrl = await audioStorage.saveAudio(audioBlob, audioFileName);
      
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
      
      // Add to store and navigate
      useNotesStore.getState().addNote(newNote);
      useRoutingStore.getState().navigateToNote(noteId);
      
      // Start transcription
      await this.startTranscription(audioBlob, noteId);
      
    } catch (error) {
      console.error('❌ RecordingService: Error creating note:', error);
      useRecordingStore.getState().setIsProcessing(false);
      useRecordingStore.getState().setProcessingStatus('Error creating note');
    }
  }

  private async startTranscription(audioBlob: Blob, noteId: string) {
    try {
      useRecordingStore.getState().setIsProcessing(true);
      useRecordingStore.getState().setProcessingStatus('Transcribing audio...');
      
      const audioBuffer = await audioBlob.arrayBuffer();
      const audioContext = new AudioContext({ sampleRate: 16000 });
      const audioData = await audioContext.decodeAudioData(audioBuffer);
      
      // Use transcription service
      const transcriptionService = TranscriptionService.getInstance();
      transcriptionService.startTranscription(audioData, noteId);
      
    } catch (error) {
      console.error('❌ RecordingService: Error starting transcription:', error);
      useRecordingStore.getState().setIsProcessing(false);
      useRecordingStore.getState().setProcessingStatus('Error starting transcription');
    }
  }
}

export const recordingService = new RecordingService();