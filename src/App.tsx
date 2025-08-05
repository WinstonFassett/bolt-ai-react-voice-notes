import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RecordScreen } from './components/screens/RecordScreen';
import { LibraryScreen } from './components/screens/LibraryScreen';
import { SettingsScreen } from './components/screens/SettingsScreen';
import { AgentsScreen } from './components/screens/AgentsScreen';
import { NoteDetailScreen } from './components/screens/NoteDetailScreen';
import { BottomNavigation } from './components/layout/BottomNavigation';
import { RecordButton } from './components/ui/RecordButton';
import { PersistentAudioPlayer } from './components/layout/PersistentAudioPlayer';
import { PersistentRecordingWidget } from './components/layout/PersistentRecordingWidget';
import Modal from './components/modal/Modal';
import { UrlInput } from './components/modal/UrlInput';
import axios from 'axios';
import Constants from './utils/Constants';

// Zustand stores
import { useAppStore } from './stores/appStore';
import { useRoutingStore } from './stores/routingStore';
import { useNotesStore } from './stores/notesStore';
import { useAudioStore } from './stores/audioStore';
import { useTranscriptionStore } from './stores/transcriptionStore';
import { useAgentsStore } from './stores/agentsStore';
import { useLLMProvidersStore } from './stores/llmProvidersStore';

import './styles/globals.css';

function App() {
  const { isLoaded, setIsLoaded } = useAppStore();
  const { currentRoute, navigateBack, navigateToMain, setTab, canGoBack } = useRoutingStore();
  const { getNoteById, resetExportState } = useNotesStore();
  const { initializeAudio, handleUserInteraction, currentPlayingAudioUrl, showUrlModal, showErrorModal, lastError, setShowUrlModal, audioDownloadUrl, setAudioDownloadUrl, clearError, playAudio } = useAudioStore();
  const { initializeWorker } = useTranscriptionStore();
  const { initializeBuiltInAgents, canRunAnyAgents } = useAgentsStore();
  const { hasValidProvider, getDefaultModel } = useLLMProvidersStore();

  // Initialize app
  useEffect(() => {
    const initializeApp = async () => {
      initializeAudio();
      initializeWorker();
      setIsLoaded(true);
    };
    initializeApp();
  }, [setIsLoaded, initializeAudio, initializeWorker]);

  // Initialize built-in agents when we have valid LLM providers
  useEffect(() => {
    if (hasValidProvider() && getDefaultModel()) {
      initializeBuiltInAgents();
    }
  }, [hasValidProvider, getDefaultModel, initializeBuiltInAgents]);

  // Handle user interaction for mobile
  useEffect(() => {
    document.addEventListener('touchstart', handleUserInteraction, { passive: true });
    document.addEventListener('click', handleUserInteraction, { passive: true });
    document.addEventListener('keydown', handleUserInteraction, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, [handleUserInteraction]);

  // Restore: Upload audio file and transcribe
  const handleUploadFile = () => {
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
        // Use the transcription store
        useTranscriptionStore.getState().startTranscription(decoded, Date.now().toString());
      };
      reader.readAsArrayBuffer(file);
    };
    input.click();
  };

  // Restore: Download audio from URL and transcribe
  const downloadAudioFromUrl = async () => {
    if (!audioDownloadUrl) return;
    try {
      const { data } = await axios.get(audioDownloadUrl, { responseType: 'arraybuffer' });
      const audioCTX = new AudioContext({ sampleRate: 16000 });
      const decoded = await audioCTX.decodeAudioData(data);
      useTranscriptionStore.getState().startTranscription(decoded, Date.now().toString());
      setShowUrlModal(false);
      setAudioDownloadUrl('');
    } catch (error) {
      console.error('Failed to download audio', error);
    }
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

  // Show note detail screen
  if (currentRoute.screen === 'note-detail' && currentRoute.noteId && currentRoute.tab === 'library') {
    const selectedNote = getNoteById(currentRoute.noteId);
    if (selectedNote) {
      return (
        <div className="flex flex-col min-h-screen bg-gray-900 text-white">
          <NoteDetailScreen
            key={selectedNote.id}
            note={selectedNote}
            onBack={() => canGoBack() ? navigateBack() : navigateToMain('library')}
            activeTab={currentRoute.tab}
            onTabChange={setTab}
          />
          <PersistentAudioPlayer />
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
            <RecordScreen />
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
              onUploadFile={handleUploadFile}
              onFromUrl={() => setShowUrlModal(true)}
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
            <SettingsScreen />
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

      <RecordButton />
      <PersistentAudioPlayer />
      <PersistentRecordingWidget />
      <BottomNavigation />

      {/* URL Modal */}
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
            playAudio(currentPlayingAudioUrl);
          }
        }}
      />
    </div>
  );
}

export default App;