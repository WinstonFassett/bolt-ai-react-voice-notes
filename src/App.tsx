import React, { useEffect, useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RecordScreen } from './components/screens/RecordScreen';
import { LibraryScreen } from './components/screens/LibraryScreen';
import { SettingsScreen } from './components/screens/SettingsScreen';
import { AgentsScreen } from './components/screens/AgentsScreen';
import { NoteDetailScreen } from './components/screens/NoteDetailScreen';
import { BottomNavigation } from './components/ui/BottomNavigation';
import { RecordButton } from './components/ui/RecordButton';
import { useTranscriber } from "./hooks/useTranscriber";
import { generateSmartTitle } from './utils/titleGenerator';
import { GlobalAudioPlayer } from './components/ui/GlobalAudioPlayer';
import { audioStorage, isStorageUrl, resolveStorageUrl } from './utils/audioStorage';
import Modal from './components/modal/Modal';
import { UrlInput } from './components/modal/UrlInput';
import { AudioDebugPanel } from './components/ui/AudioDebugPanel';
import { MobileAudioDebugger } from './components/ui/MobileAudioDebugger';
import Constants from './utils/Constants';
import axios from 'axios';
import { useRoutingStore } from './stores/routingStore';

// Zustand stores
import { useAppStore } from './stores/appStore';
import { useRecordingStore } from './stores/recordingStore';
import { useNotesStore } from './stores/notesStore';
import { useAudioStore } from './stores/audioStore';
import { useSettingsStore } from './stores/settingsStore';
import { useDebugStore } from './stores/debugStore';
import { useAgentsStore } from './stores/agentsStore';
import { useLLMProvidersStore } from './stores/llmProvidersStore';

import './styles/globals.css';

function App() {
  const transcriber = useTranscriber();
  
  // Zustand stores
  const { 
    isLoaded,
    setIsLoaded
  } = useAppStore();
  
  const {
    currentRoute,
    navigateTo,
    navigateBack,
    navigateToNote,
    navigateToMain,
    setTab,
    canGoBack,
    syncWithBrowserHistory
  } = useRoutingStore();
  
  const {
    isRecording,
    isPaused,
    isProcessing,
    processingStatus,
    recordingTime,
    audioStream,
    mediaRecorder,
    currentAudioBlob,
    recordedChunks, 
    setIsRecording,
    setIsPaused,
    setIsProcessing,
    setProcessingStatus,
    setRecordingTime,
    setAudioStream,
    setMediaRecorder,
    setCurrentAudioBlob,
    setRecordedChunks,
    addRecordedChunk,
    startRecording: startRecordingState,
    pauseRecording,
    resumeRecording,
    stopRecording: stopRecordingState,
    cancelRecording,
    resetRecording,
    updateRecordingTime,
    calculateFinalDuration
  } = useRecordingStore();
  
  const {
    notes,
    addNote,
    updateNote,
    deleteNote,
    createNote,
    saveVersion,
    restoreVersion,
    updateTags,
    exportNotes,
    importNotes,
    clearAllNotes,
    clearAllRecordings,
    getNoteById
  } = useNotesStore();
  
  const {
    currentPlayingAudioUrl,
    resolvedPlayingAudioUrl,
    globalIsPlaying,
    globalAudioDuration,
    globalAudioCurrentTime,
    isUserInteracting,
    pendingPlayRequest,
    showUrlModal,
    audioDownloadUrl,
    lastError,
    showErrorModal,
    setCurrentPlayingAudioUrl,
    setResolvedPlayingAudioUrl,
    setGlobalIsPlaying,
    setGlobalAudioDuration,
    setGlobalAudioCurrentTime,
    setShowUrlModal,
    setAudioDownloadUrl,
    setIsUserInteracting,
    setPendingPlayRequest,
    showError,
    clearError,
    playAudio,
    togglePlayPause,
    seekAudio,
    closePlayer
  } = useAudioStore();
  
  // Mobile detection
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
  const {
    model,
    multilingual,
    quantized,
    subtask,
    language,
    setModel,
    setMultilingual,
    updateModelSettings
  } = useSettingsStore();
  
  const {
    isDebugVisible,
    debugInfo,
    setDebugVisible,
    addDebugEvent,
    clearDebugInfo
  } = useDebugStore();
  
  const {
    processNoteWithAllAutoAgents,
    canRunAnyAgents,
    initializeBuiltInAgents
  } = useAgentsStore();
  
  const {
    hasValidProvider,
    getDefaultModel
  } = useLLMProvidersStore();
  
  // Refs for intervals and audio
  const intervalRef = useRef<number>();
  const globalAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastTranscriptionRef = useRef<string | null>(null);
  const localRecordedChunks = useRef<Blob[]>([]);
  const pendingNoteIdRef = useRef<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);
  const debugTimeoutRef = useRef<number>();

  // Enhanced mobile debugging
  const [showMobileDebugger, setShowMobileDebugger] = useState(false);
  const [audioElementState, setAudioElementState] = useState<{
    readyState?: number;
    networkState?: number;
    error?: string;
    src?: string;
  }>({});

  // Initialize audio storage and load notes
  useEffect(() => {
    const initializeApp = async () => {
      await audioStorage.init();
      // Sync with browser URL on app load
      syncWithBrowserHistory();
      setIsLoaded(true);
    };
    initializeApp();
  }, [setIsLoaded, syncWithBrowserHistory]);

  // Initialize built-in agents when we have valid LLM providers
  useEffect(() => {
    const initAgents = () => {
      if (hasValidProvider() && getDefaultModel()) {
        if (import.meta.env.DEV) {
          console.log('🤖 APP: Initializing built-in agents');
        }
        initializeBuiltInAgents();
      }
    };
    
    // Try to initialize immediately
    initAgents();
    
    // Also try after a short delay in case providers are still loading
    const timeout = setTimeout(initAgents, 1000);
    
    return () => clearTimeout(timeout);
  }, [hasValidProvider, getDefaultModel, initializeBuiltInAgents]);
  
  // Debug logging for agent state
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('🤖 APP: Initializing built-in agents');
      console.log('🤖 APP: hasValidProvider:', hasValidProvider());
      console.log('🤖 APP: getDefaultModel:', getDefaultModel());
      console.log('🤖 APP: canRunAnyAgents:', canRunAnyAgents());
    }
  }, [hasValidProvider, getDefaultModel, canRunAnyAgents]);

  // Handle user interaction for mobile audio
  useEffect(() => {
    const handleUserGesture = () => {
      // Immediately try to play any pending audio on user gesture
      if (pendingPlayRequest && globalAudioRef.current && resolvedPlayingAudioUrl) {
        globalAudioRef.current.play().catch(console.error);
      }
      
      setIsUserInteracting(true);
      
      // Initialize AudioContext on first user interaction (required for iOS)
      if (isMobile && !audioContextRef.current) {
        try {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        } catch (error) {
          console.error('Failed to initialize AudioContext:', error);
        }
      }
    };

    // Add event listeners for user gestures
    document.addEventListener('touchstart', handleUserGesture, { passive: true });
    document.addEventListener('click', handleUserGesture, { passive: true });
    document.addEventListener('keydown', handleUserGesture, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleUserGesture);
      document.removeEventListener('click', handleUserGesture);
      document.removeEventListener('keydown', handleUserGesture);
    };
  }, [isMobile, setIsUserInteracting, pendingPlayRequest, resolvedPlayingAudioUrl]);

  // Update transcriber settings from store
  useEffect(() => {
    transcriber.setModel(model);
    transcriber.setMultilingual(multilingual);
    transcriber.setQuantized(quantized);
    transcriber.setSubtask(subtask);
    transcriber.setLanguage(language);
  }, [model, multilingual, quantized, subtask, language, transcriber]);

  // Recording timer
  useEffect(() => {
    if (isRecording && !isPaused) {
      intervalRef.current = window.setInterval(() => {
        updateRecordingTime();
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRecording, isPaused, updateRecordingTime]);

  // Global Audio Player Management
  useEffect(() => {
    if (!resolvedPlayingAudioUrl) {
      // Clean up when no audio URL
      if (globalAudioRef.current) {
        addDebugEvent('AUDIO_CLEANUP', 'Cleaning up audio element');
        globalAudioRef.current.pause();
        globalAudioRef.current.removeAttribute('src');
        globalAudioRef.current.load();
        setGlobalAudioDuration(0);
        setGlobalAudioCurrentTime(0);
      }
      return;
    }

    // At this point, resolvedPlayingAudioUrl is guaranteed to be a string
    const audioUrl = resolvedPlayingAudioUrl;
    
    const setupAudioPlayer = () => {
      if (!globalAudioRef.current) {
        globalAudioRef.current = new Audio();
        
        globalAudioRef.current.addEventListener('loadedmetadata', () => {
          const duration = globalAudioRef.current?.duration || 0;
          setGlobalAudioDuration(duration);
          setAudioElementState((prev) => ({
            ...prev,
            readyState: globalAudioRef.current?.readyState,
            networkState: globalAudioRef.current?.networkState,
            src: globalAudioRef.current?.src
          }));
        });
        
        globalAudioRef.current.addEventListener('timeupdate', () => {
          setGlobalAudioCurrentTime(globalAudioRef.current?.currentTime || 0);
          setAudioElementState((prev) => ({
            ...prev,
            readyState: globalAudioRef.current?.readyState,
            networkState: globalAudioRef.current?.networkState
          }));
        });
        
        globalAudioRef.current.addEventListener('ended', () => {
          setGlobalIsPlaying(false);
          setGlobalAudioCurrentTime(0);
          setPendingPlayRequest(null);
        });
        
        globalAudioRef.current.addEventListener('error', (e) => {
          if (globalAudioRef.current && globalAudioRef.current.error && globalAudioRef.current.src) {
            const errorCode = globalAudioRef.current.error.code;
            const errorMessage = globalAudioRef.current.error.message;
            
            let userFriendlyError = 'Audio playback failed';
            switch (errorCode) {
              case 1: // MEDIA_ERR_ABORTED
                userFriendlyError = 'Audio playback was stopped';
                break;
              case 2: // MEDIA_ERR_NETWORK
                userFriendlyError = 'Network error while loading audio';
                break;
              case 3: // MEDIA_ERR_DECODE
                userFriendlyError = 'Audio file is corrupted or unsupported';
                break;
              case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
                userFriendlyError = 'Audio format not supported on this device';
                break;
              default:
                userFriendlyError = `Audio error: ${errorMessage || 'Unknown error'}`;
            }
            
            showError(userFriendlyError);
            setAudioElementState((prev) => ({
              ...prev,
              error: userFriendlyError,
              readyState: globalAudioRef.current?.readyState,
              networkState: globalAudioRef.current?.networkState
            }));
            setGlobalIsPlaying(false);
            setCurrentPlayingAudioUrl(null);
            setResolvedPlayingAudioUrl(null);
            setPendingPlayRequest(null);
          }
        });
        
        // Set audio properties for better mobile compatibility
        globalAudioRef.current.preload = 'metadata';
        
        // iOS-specific audio setup
        if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
          globalAudioRef.current.setAttribute('webkit-playsinline', 'true');
          globalAudioRef.current.setAttribute('playsinline', 'true');
        }
        
        // Add more event listeners for debugging
        globalAudioRef.current.addEventListener('loadstart', () => {
          addDebugEvent('AUDIO_LOAD_START', 'Audio load started');
          setAudioElementState((prev) => ({
            ...prev,
            readyState: globalAudioRef.current?.readyState,
            networkState: globalAudioRef.current?.networkState
          }));
        });
        
        globalAudioRef.current.addEventListener('canplay', () => {
          addDebugEvent('AUDIO_CAN_PLAY', 'Audio can start playing');
          setAudioElementState((prev) => ({
            ...prev,
            readyState: globalAudioRef.current?.readyState,
            networkState: globalAudioRef.current?.networkState
          }));
        });
        
        globalAudioRef.current.addEventListener('canplaythrough', () => {
          addDebugEvent('AUDIO_CAN_PLAY_THROUGH', 'Audio can play through without buffering');
        });
        
        globalAudioRef.current.addEventListener('stalled', () => {
          addDebugEvent('AUDIO_STALLED', 'Audio loading stalled');
        });
        
        globalAudioRef.current.addEventListener('suspend', () => {
          addDebugEvent('AUDIO_SUSPEND', 'Audio loading suspended');
        });
        
        globalAudioRef.current.addEventListener('waiting', () => {
          addDebugEvent('AUDIO_WAITING', 'Audio waiting for data');
        });
      }
      
      if (globalAudioRef.current.src !== audioUrl) {
        globalAudioRef.current.src = audioUrl;
        globalAudioRef.current.load();
        addDebugEvent('AUDIO_SET_SRC', `Setting new audio source: ${audioUrl.substring(0, 50)}...`);
      }
      
      const handlePlayback = () => {
        // Cancel any existing play promise
        if (playPromiseRef.current) {
          playPromiseRef.current.catch(() => {
            // Ignore errors from cancelled promises
          });
        }
        
        // For mobile, ensure we have user interaction before attempting play
        if (isMobile && !isUserInteracting) {
          addDebugEvent('AUDIO_PENDING', 'Mobile device detected but no user interaction - setting pending request');
          setPendingPlayRequest(currentPlayingAudioUrl);
          setGlobalIsPlaying(false);
          return;
        }
        
        // Attempt to play
        if (globalAudioRef.current) {
          try {
            const playPromise = globalAudioRef.current.play();
            playPromiseRef.current = playPromise;
            
            if (playPromise !== undefined) {
              playPromise.then(() => {
                addDebugEvent('AUDIO_PLAY_SUCCESS', 'Audio playback started successfully');
                setPendingPlayRequest(null);
                playPromiseRef.current = null;
              }).catch(err => {
                addDebugEvent('AUDIO_PLAY_FAILED', `${err.name}: ${err.message}`);
                console.error('Audio play failed:', err.name, err.message);
                
                let userFriendlyError = 'Failed to play audio';
                if (err.name === 'NotAllowedError') {
                  userFriendlyError = 'Audio blocked by browser - try tapping play again';
                  setPendingPlayRequest(currentPlayingAudioUrl);
                } else if (err.name === 'NotSupportedError') {
                  userFriendlyError = 'Audio format not supported on this device. Try recording a new note.';
                } else if (err.name === 'AbortError') {
                  userFriendlyError = 'Audio playback was interrupted';
                } else {
                  userFriendlyError = `Playback failed: ${err.message || err.name}`;
                }
                
                showError(userFriendlyError);
                
                setGlobalIsPlaying(false);
                playPromiseRef.current = null;
              });
            } else {
              addDebugEvent('AUDIO_NO_PROMISE', 'Play method did not return a promise (older browser)');
              setGlobalIsPlaying(false);
            }
          } catch (err) {
            addDebugEvent('AUDIO_SYNC_ERROR', `Synchronous error calling play(): ${err}`);
            console.error('Synchronous error calling play():', err);
            showError(`Audio setup failed: ${err}`);
            setGlobalIsPlaying(false);
          }
        }
      };
      
      if (globalIsPlaying) {
        handlePlayback();
      } else {
        if (globalAudioRef.current) {
          addDebugEvent('AUDIO_PAUSE', 'Pausing audio');
          globalAudioRef.current.pause();
        }
      }
    };

    setupAudioPlayer();
  }, [
    resolvedPlayingAudioUrl, 
    globalIsPlaying, 
    isUserInteracting,
    isMobile,
    setGlobalAudioDuration, 
    setGlobalAudioCurrentTime, 
    setGlobalIsPlaying, 
    setCurrentPlayingAudioUrl, 
    setResolvedPlayingAudioUrl,
    setPendingPlayRequest,
    addDebugEvent,
    showError
  ]);

  // Handle global play audio with URL resolution
  const handleGlobalPlayAudio = useCallback(async (audioUrl: string) => {
    // Mark that this is a user-initiated action
    setIsUserInteracting(true);
    
    if (currentPlayingAudioUrl === audioUrl) {
      // Toggle play/pause for same audio
      setGlobalIsPlaying(!globalIsPlaying);
    } else {
      // Play new audio - resolve URL first if it's a storage URL
      let resolvedUrl = audioUrl;
      if (isStorageUrl(audioUrl)) {
        try {
          const resolved = await resolveStorageUrl(audioUrl);
          if (resolved) {
            resolvedUrl = resolved.url;
          } else {
            return;
          }
        } catch (error) {
          console.error('Failed to resolve storage URL:', error);
          showError(`Failed to load audio: ${error}`);
          return;
        }
      }
      
      setCurrentPlayingAudioUrl(audioUrl);
      setResolvedPlayingAudioUrl(resolvedUrl);
      setGlobalIsPlaying(true);
      setGlobalAudioCurrentTime(0);
    }
  }, [currentPlayingAudioUrl, globalIsPlaying, setCurrentPlayingAudioUrl, setResolvedPlayingAudioUrl, setGlobalIsPlaying, setGlobalAudioCurrentTime, setIsUserInteracting, showError]);

  // Handle audio seeking
  useEffect(() => {
    if (globalAudioRef.current && resolvedPlayingAudioUrl) {
      const audio = globalAudioRef.current;
      const targetTime = globalAudioCurrentTime;
      
      // Only seek if the difference is significant (more than 1 second)
      // This prevents infinite loops from timeupdate events
      if (Math.abs(audio.currentTime - targetTime) > 1) {
        audio.currentTime = targetTime;
      }
    }
  }, [globalAudioCurrentTime, resolvedPlayingAudioUrl]);

  // Recording functionality
  const startRecording = async () => {
    try {
      // Clear local chunks
      localRecordedChunks.current = [];
      pendingNoteIdRef.current = null;
      
      // Use compatible audio format for recording
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      setAudioStream(stream);
      
      // Use compatible format for iOS/Safari
      let options: MediaRecorderOptions = {};
      if (isIOS || isSafari) {
        // Try different formats for iOS compatibility
        if (MediaRecorder.isTypeSupported('audio/mp4')) {
          options.mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/aac')) {
          options.mimeType = 'audio/aac';
        } else if (MediaRecorder.isTypeSupported('audio/wav')) {
          options.mimeType = 'audio/wav';
        }
        console.log('🎙️ Using iOS-compatible recording format:', options.mimeType || 'default');
      } else {
        // Use WebM for other browsers
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          options.mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          options.mimeType = 'audio/webm';
        }
        console.log('🎙️ Using WebM recording format:', options.mimeType || 'default');
      }
      
      const recorder = new MediaRecorder(stream, options);
      
      setRecordedChunks([]);
      recorder.addEventListener('dataavailable', handleDataAvailable);
      recorder.addEventListener('stop', handleRecordingStop);
      recorder.start(1000); // Collect chunks every 1 second
      
      setMediaRecorder(recorder);
      startRecordingState();
      setTab('record');
    } catch (err) {
      console.error('Error accessing microphone:', err);
    }
  };

  const handlePauseResume = () => {
    if (!isRecording) return;
    
    if (isPaused) {
      if (mediaRecorder) {
        mediaRecorder.resume();
        resumeRecording();
      }
    } else {
      if (mediaRecorder) {
        mediaRecorder.pause();
        pauseRecording();
      }
    }
  };

  const handleStop = () => {
    console.log('STOP: handleStop called - this is the DONE button');
    if (mediaRecorder && (isRecording || isPaused)) {
      mediaRecorder.stop();
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
      }
      stopRecordingState();
      setMediaRecorder(null);
      setAudioStream(null);
    }
  };

  // FIXED CANCEL HANDLER - NO NOTE CREATION, NO TRANSCRIPTION
  const handleCancel = () => {
    console.log('CANCEL: Starting cancel process - do NOT create note or process audio');
    
    // 1. Stop MediaRecorder and audio stream immediately
    if (mediaRecorder && (isRecording || isPaused)) {
      mediaRecorder.stop();
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
      }
    }
    
    // 2. Set cancelled state FIRST to prevent note creation
    cancelRecording();
    
    // 3. Clean up all recording data
    localRecordedChunks.current = [];
    pendingNoteIdRef.current = null;
    setRecordedChunks([]);
    setCurrentAudioBlob(null);
    setIsProcessing(false);
    setProcessingStatus('');
    setMediaRecorder(null);
    setAudioStream(null);
    
    console.log('CANCEL: All cleanup complete - no note will be created');
  };

  const handleDataAvailable = (event: BlobEvent) => {
    // console.log('DATA AVAILABLE: Chunk received, size:', event.data.size);
    if (event.data.size > 0) {
      // Store locally AND in store
      localRecordedChunks.current.push(event.data);
      addRecordedChunk(event.data);
      // console.log('DATA AVAILABLE: Chunk added, total local chunks now:', localRecordedChunks.current.length);
    }
  };

  const handleRecordingStop = () => {
    // Get the current state directly from the store to avoid stale closure
    const currentState = useRecordingStore.getState();
    const { isCancelled } = currentState;
    
    console.log('RECORDING STOP: handleRecordingStop called, isCancelled:', isCancelled);
    
    if (isCancelled) {
      console.log('RECORDING STOP: This was a cancellation - cleaning up and doing NOTHING else');
      setRecordedChunks([]);
      setCurrentAudioBlob(null);
      setIsProcessing(false);
      setProcessingStatus('');
      localRecordedChunks.current = [];
      pendingNoteIdRef.current = null;
      return;
    }
    
    console.log('RECORDING STOP: This was a STOP (done) - creating note FIRST, then UI, then transcription');
    createNoteFromRecording();
  };

  const createNoteFromRecording = async () => {
    console.log('CREATE NOTE: Starting createNoteFromRecording');
    
    if (localRecordedChunks.current.length === 0) {
      console.log('CREATE NOTE: No chunks to process');
      return;
    }

    try {
      const now = Date.now();
      const noteId = now.toString();
      pendingNoteIdRef.current = noteId;
      
      // Create audio blob
      const audioBlob = new Blob(localRecordedChunks.current, { type: 'audio/webm' });
      
      // Calculate actual recording duration
      const actualDuration = calculateFinalDuration();
      
      console.log('CREATE NOTE: Saving audio to storage...');
      const audioFileName = `recording_${noteId}.webm`;
      const audioUrl = await audioStorage.saveAudio(audioBlob, audioFileName);
      console.log('CREATE NOTE: Audio saved with URL:', audioUrl);
      
      // Create note with audio and duration - NO transcription yet
      const newNote = {
        id: noteId,
        title: 'Voice Recording',
        content: '', // Empty content - will be filled by transcription
        audioUrl,
        duration: actualDuration,
        createdAt: now,
        updatedAt: now,
        created: now,
        lastEdited: now,
        versions: [],
        tags: []
      };
      
      console.log('CREATE NOTE: Adding note to store...');
      addNote(newNote);
      
      console.log('CREATE NOTE: Navigating to note detail...');
      // Navigate to note detail FIRST
      navigateToNote(noteId);
      
      // THEN start transcription process
      console.log('CREATE NOTE: Starting transcription process...');
      startTranscriptionProcess(audioBlob, noteId);
      
    } catch (error) {
      console.error('CREATE NOTE: Error creating note from recording:', error);
      setIsProcessing(false);
      setProcessingStatus('Error creating note');
    }
  };

  const startTranscriptionProcess = async (audioBlob: Blob, noteId: string) => {
    console.log('TRANSCRIPTION: Starting transcription process for note:', noteId);
    
    try {
      setIsProcessing(true);
      setProcessingStatus('Transcribing audio...');
      
      const audioBuffer = await audioBlob.arrayBuffer();
      const audioContext = new AudioContext({ sampleRate: 16000 });
      const audioData = await audioContext.decodeAudioData(audioBuffer);
      
      transcriber.onInputChange();
      transcriber.start(audioData);
      
    } catch (error) {
      console.error('TRANSCRIPTION: Error starting transcription:', error);
      setIsProcessing(false);
      setProcessingStatus('Error starting transcription');
    }
  };

  // Handle transcription completion
  const handleTranscriptionComplete = useCallback((text: string) => {
    console.log('TRANSCRIPTION: Completion handler called with text length:', text.length);
    
    if (text !== lastTranscriptionRef.current && text.trim()) {
      lastTranscriptionRef.current = text;
      const smartTitle = generateSmartTitle(text);
      
      const noteIdToUpdate = pendingNoteIdRef.current || currentRoute.noteId;
      if (noteIdToUpdate) {
        const existingNote = getNoteById(noteIdToUpdate);
        if (existingNote) {
          console.log('TRANSCRIPTION: Updating note with transcribed content');
          const updatedNote = {
            ...existingNote,
            title: smartTitle,
            content: text,
            updatedAt: Date.now(),
            lastEdited: Date.now()
          };
          updateNote(updatedNote);
          
          // Run auto-agents if available and configured
          if (canRunAnyAgents()) {
            console.log('🤖 TRANSCRIPTION: Running auto-agents for transcribed note');
            processNoteWithAllAutoAgents(noteIdToUpdate).then(() => {
              console.log('🤖 TRANSCRIPTION: Auto-agents completed successfully');
            }).catch(error => {
              console.error('🤖 TRANSCRIPTION: Auto-agents failed:', error);
            });
          } else {
            console.log('🤖 TRANSCRIPTION: Cannot run agents - no valid setup');
          }
          
          console.log('TRANSCRIPTION: Note updated in store, should trigger re-render');
        }
      }
      
      setIsProcessing(false);
      setProcessingStatus('');
      pendingNoteIdRef.current = null;
      console.log('TRANSCRIPTION: Processing complete');
    }
  }, [currentRoute.noteId, getNoteById, updateNote, setIsProcessing, setProcessingStatus, canRunAnyAgents, processNoteWithAllAutoAgents]);

  // Watch for transcription completion
  useEffect(() => {
    // Get current cancellation state to avoid stale closure
    const currentState = useRecordingStore.getState();
    const { isCancelled } = currentState;
    
    if (transcriber.output && !transcriber.isBusy && transcriber.output.text && isProcessing && !isCancelled) {
      console.log('TRANSCRIPTION: Output detected, calling completion handler');
      handleTranscriptionComplete(transcriber.output.text);
    }
  }, [transcriber.output?.text, transcriber.isBusy, handleTranscriptionComplete, isProcessing]);

  // Handle file upload
  const handleUploadFile = useCallback(() => {
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
        transcriber.onInputChange();
        transcriber.start(decoded);
      };
      reader.readAsArrayBuffer(file);
    };
    input.click();
  }, [transcriber]);

  const handleFromUrl = useCallback(() => {
    setShowUrlModal(true);
  }, [setShowUrlModal]);

  const downloadAudioFromUrl = useCallback(async () => {
    if (!audioDownloadUrl) return;

    try {
      const { data } = await axios.get(audioDownloadUrl, {
        responseType: "arraybuffer",
      });

      const audioCTX = new AudioContext({ sampleRate: Constants.SAMPLING_RATE });
      const decoded = await audioCTX.decodeAudioData(data);
      transcriber.onInputChange();
      transcriber.start(decoded);
      setShowUrlModal(false);
      setAudioDownloadUrl('');
    } catch (error) {
      console.error("Failed to download audio", error);
    }
  }, [audioDownloadUrl, transcriber, setShowUrlModal, setAudioDownloadUrl]);

  const handleImportNotes = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
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
            importNotes(importedNotesData);
          } else {
            alert('Invalid notes format');
          }
        } catch (error) {
          console.error('Error importing notes:', error);
          alert('Error importing notes');
        }
      };
      reader.readAsText(file);
    }
  }, [importNotes]);

  const handleStartRecord = () => {
    if (currentPlayingAudioUrl) {
      closePlayer();
    }
    startRecording();
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  // Show note detail screen (only on library tab)
  if (currentRoute.screen === 'note-detail' && currentRoute.noteId && currentRoute.tab === 'library') {
    const selectedNote = getNoteById(currentRoute.noteId);
    if (selectedNote) {
      return (
        <div className="flex flex-col min-h-screen bg-gray-900 text-white">
          <NoteDetailScreen
            key={selectedNote.id}
            note={selectedNote}
            onBack={() => canGoBack() ? navigateBack() : navigateToMain('library')}
            onUpdateNote={updateNote}
            onSaveVersion={saveVersion}
            onRestoreVersion={restoreVersion}
            onUpdateTags={updateTags}
            onPlayAudio={handleGlobalPlayAudio}
            currentPlayingAudioUrl={currentPlayingAudioUrl}
            globalIsPlaying={globalIsPlaying}
            globalAudioDuration={globalAudioDuration}
            globalAudioCurrentTime={globalAudioCurrentTime}
            onDeleteNote={deleteNote}
            isProcessing={isProcessing}
            processingStatus={processingStatus}
            activeTab={currentRoute.tab}
            onTabChange={setTab}
            onSelectNote={navigateToNote}
          />

          {currentPlayingAudioUrl && (
            <GlobalAudioPlayer
              currentPlayingAudioUrl={currentPlayingAudioUrl}
              globalIsPlaying={globalIsPlaying}
              globalAudioDuration={globalAudioDuration}
              globalAudioCurrentTime={globalAudioCurrentTime}
              onPlayPause={togglePlayPause}
              onSeek={seekAudio}
              onClose={closePlayer}
              notes={notes}
              onSelectNote={navigateToNote}
            />
          )}
        </div>
      );
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white">
      <AnimatePresence mode="wait">
        {currentRoute.tab === 'record' && (
          <motion.div
            key="record"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex-1"
          >
            <RecordScreen
              transcriber={transcriber}
              isRecording={isRecording}
              isProcessing={isProcessing}
              processingStatus={processingStatus}
              onStartRecording={handleStartRecord}
              showBigRecordButton={currentPlayingAudioUrl !== null}
            />
          </motion.div>
        )}

        {currentRoute.tab === 'library' && (
          <motion.div
            key="library"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex-1"
          >
            <LibraryScreen
              notes={notes}
              onSelectNote={navigateToNote}
              onDeleteNote={deleteNote}
              onCreateNote={createNote}
              onStartRecording={startRecording}
              onUploadFile={handleUploadFile}
              onFromUrl={handleFromUrl}
              onPlayAudio={handleGlobalPlayAudio}
              currentPlayingAudioUrl={currentPlayingAudioUrl}
              globalIsPlaying={globalIsPlaying}
            />
          </motion.div>
        )}

        {currentRoute.tab === 'settings' && (
          <motion.div
            key="settings"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex-1"
          >
            <SettingsScreen
              transcriber={transcriber}
              onExportNotes={exportNotes}
              onImportNotes={handleImportNotes}
              onClearAllNotes={clearAllNotes}
              onClearAllRecordings={clearAllRecordings}
            />
          </motion.div>
        )}

        {currentRoute.tab === 'agents' && (
          <motion.div
            key="agents"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex-1"
          >
            <AgentsScreen />
          </motion.div>
        )}
      </AnimatePresence>

      {!currentPlayingAudioUrl && (
        <RecordButton
          isRecording={isRecording}
          isPaused={isPaused}
          onStartRecording={handleStartRecord}
          onPauseRecording={handlePauseResume}
          onStopRecording={handleStop}
          onCancelRecording={handleCancel}
          recordingTime={recordingTime}
          audioStream={audioStream}
          activeTab={currentRoute.tab}
          isGloballyPlaying={currentPlayingAudioUrl !== null}
        />
      )}

      {currentPlayingAudioUrl && (
        <GlobalAudioPlayer
          currentPlayingAudioUrl={currentPlayingAudioUrl}
          globalIsPlaying={globalIsPlaying}
          globalAudioDuration={globalAudioDuration}
          globalAudioCurrentTime={globalAudioCurrentTime}
          onPlayPause={togglePlayPause}
          onSeek={seekAudio}
          onClose={closePlayer}
          notes={notes}
          onSelectNote={navigateToNote}
        />
      )}

      <BottomNavigation activeTab={currentRoute.tab} onTabChange={setTab} />

      <Modal
        show={showUrlModal}
        title="Add Audio from URL"
        content={
          <>
            <p className="mb-4 text-gray-300">Enter the URL of the audio file you want to transcribe.</p>
            <UrlInput
              onChange={(e) => setAudioDownloadUrl(e.target.value)}
              value={audioDownloadUrl || Constants.DEFAULT_AUDIO_URL}
            />
          </>
        }
        onClose={() => setShowUrlModal(false)}
        submitText="Load Audio"
        onSubmit={downloadAudioFromUrl}
      />
      
      {/* Audio Error Modal */}
      <Modal
        show={showErrorModal}
        title="Audio Error"
        content={
          <>
            <p className="mb-4 text-gray-300">{lastError}</p>
            <div className="text-sm text-gray-400">
              <p className="mb-2">Common solutions:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Try tapping the play button again</li>
                <li>Check your internet connection</li>
                <li>Try refreshing the page</li>
                <li>Make sure your device volume is up</li>
              </ul>
            </div>
          </>
        }
        onClose={clearError}
        submitText="Try Again"
        onSubmit={() => {
          clearError();
          if (currentPlayingAudioUrl) {
            handleGlobalPlayAudio(currentPlayingAudioUrl);
          }
        }}
      />
      
      {/* Mobile Audio Debugger */}
      <MobileAudioDebugger
        isVisible={showMobileDebugger}
        onClose={() => setShowMobileDebugger(false)}
        debugInfo={debugInfo}
        currentAudioState={{
          currentPlayingAudioUrl,
          resolvedPlayingAudioUrl,
          globalIsPlaying,
          isUserInteracting,
          pendingPlayRequest,
          audioElementState
        }}
      />
      
      {/* Debug Panel */}
      <AudioDebugPanel
        isVisible={isDebugVisible}
        onClose={() => setDebugVisible(false)}
        debugInfo={debugInfo}
        currentAudioState={{
          currentPlayingAudioUrl,
          resolvedPlayingAudioUrl,
          globalIsPlaying,
          isUserInteracting,
          pendingPlayRequest,
          audioElementState: globalAudioRef.current ? {
            readyState: globalAudioRef.current.readyState,
            networkState: globalAudioRef.current.networkState,
            error: globalAudioRef.current.error?.message,
            src: globalAudioRef.current.src
          } : undefined
        }}
      />
      
    </div>
  );
}

export default App;