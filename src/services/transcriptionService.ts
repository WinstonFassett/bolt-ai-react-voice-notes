import { useSettingsStore } from '../stores/settingsStore';
import { useNotesStore } from '../stores/notesStore';
import { useRecordingStore } from '../stores/recordingStore';
import { useAgentsStore } from '../stores/agentsStore';
import { generateSmartTitle } from '../utils/titleGenerator';

class TranscriptionService {
  private static instance: TranscriptionService;
  private worker: Worker | null = null;
  private currentNoteId: string | null = null;
  private lastTranscription: string | null = null;

  static getInstance(): TranscriptionService {
    if (!TranscriptionService.instance) {
      TranscriptionService.instance = new TranscriptionService();
    }
    return TranscriptionService.instance;
  }

  private constructor() {
    this.initializeWorker();
  }

  private initializeWorker() {
    if (this.worker) return;

    this.worker = new Worker(new URL("../worker.js", import.meta.url), {
      type: "module",
    });

    this.worker.addEventListener("message", (event) => {
      this.handleWorkerMessage(event);
    });
  }

  private handleWorkerMessage(event: MessageEvent) {
    const message = event.data;

    switch (message.status) {
      case "update":
        // Partial transcription update
        if (message.data && message.data[0]) {
          this.updateTranscription(message.data[0]);
        }
        break;

      case "complete":
        // Final transcription
        if (message.data && message.data.text) {
          this.completeTranscription(message.data.text);
        }
        break;

      case "error":
        console.error('❌ TranscriptionService: Worker error:', message.data);
        useRecordingStore.getState().setIsProcessing(false);
        useRecordingStore.getState().setProcessingStatus('Transcription failed');
        break;
    }
  }

  startTranscription(audioData: AudioBuffer, noteId: string) {
    if (!this.worker) {
      console.error('❌ TranscriptionService: Worker not initialized');
      return;
    }

    console.log('🎯 TranscriptionService: Starting transcription for note:', noteId);
    
    this.currentNoteId = noteId;
    this.lastTranscription = null;

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
    this.worker.postMessage({
      audio,
      model: settings.model,
      multilingual: settings.multilingual,
      quantized: settings.quantized,
      subtask: settings.multilingual ? settings.subtask : null,
      language: settings.multilingual && settings.language !== "auto" ? settings.language : null,
    });
  }

  private updateTranscription(text: string) {
    if (!this.currentNoteId || !text) return;

    // Update note content progressively
    const notesStore = useNotesStore.getState();
    const note = notesStore.getNoteById(this.currentNoteId);
    
    if (note) {
      const updatedNote = {
        ...note,
        content: text,
        updatedAt: Date.now(),
        lastEdited: Date.now()
      };
      notesStore.updateNote(updatedNote);
    }
  }

  private completeTranscription(text: string) {
    if (!this.currentNoteId || !text || text === this.lastTranscription) return;

    console.log('✅ TranscriptionService: Transcription complete');
    this.lastTranscription = text;

    const notesStore = useNotesStore.getState();
    const note = notesStore.getNoteById(this.currentNoteId);

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
        console.log('🤖 TranscriptionService: Running auto-agents');
        agentsStore.processNoteWithAllAutoAgents(this.currentNoteId);
      }
    }

    // Clear processing state
    useRecordingStore.getState().setIsProcessing(false);
    useRecordingStore.getState().setProcessingStatus('');
    this.currentNoteId = null;
  }

  cleanup() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.currentNoteId = null;
    this.lastTranscription = null;
  }
}

export const transcriptionService = TranscriptionService.getInstance();