import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useAudioStore } from './audioStore';
import { useDebugStore } from './debugStore';
import { useNotesStore } from './notesStore';
import { useRecordingStore } from './recordingStore';
import { useSettingsStore } from './settingsStore';
import { useTranscriptionStore } from './transcriptionStore';
import { useLLMProvidersStore } from './llmProvidersStore';
import { useAgentsStore } from './agentsStore';
import { useRoutingStore } from './routingStore';
import { useAppStore } from './appStore';

// Type for the root debug store
interface RootDebugState {
  // This store doesn't need its own state, it's just for debugging
  // We'll add a method to get the current state of all stores
  getAllStores: () => Record<string, any>;
}

// Create the root debug store with devtools middleware
export const useRootDebugStore = create<RootDebugState>()(
  devtools(
    (set, get) => ({
      getAllStores: () => ({
        audio: useAudioStore.getState(),
        debug: useDebugStore.getState(),
        notes: useNotesStore.getState(),
        recording: useRecordingStore.getState(),
        settings: useSettingsStore.getState(),
        transcription: useTranscriptionStore.getState(),
        llmProviders: useLLMProvidersStore.getState(),
        agents: useAgentsStore.getState(),
        routing: useRoutingStore.getState(),
        app: useAppStore.getState(),
      }),
    }),
    {
      name: 'Bolt-Voice-Notes',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

// Function to initialize devtools for all stores
export const initializeDevTools = () => {
  if (process.env.NODE_ENV !== 'development') {
    return; // Only run in development
  }

  // Subscribe to all stores to update the devtools when any store changes
  const subscribeToStore = (store: any, name: string) => {
    store.subscribe((state: any) => {
      // Update the devtools with the new state
      useRootDebugStore.setState(
        { [name]: state },
        false, // replace: false to merge with existing state
        `${name}/updated` // action name for devtools
      );
    });
  };

  // Subscribe to all stores
  subscribeToStore(useAudioStore, 'audio');
  subscribeToStore(useDebugStore, 'debug');
  subscribeToStore(useNotesStore, 'notes');
  subscribeToStore(useRecordingStore, 'recording');
  subscribeToStore(useSettingsStore, 'settings');
  subscribeToStore(useTranscriptionStore, 'transcription');
  subscribeToStore(useLLMProvidersStore, 'llmProviders');
  subscribeToStore(useAgentsStore, 'agents');
  subscribeToStore(useRoutingStore, 'routing');
  subscribeToStore(useAppStore, 'app');

  // Initialize with current state
  useRootDebugStore.setState(useRootDebugStore.getState().getAllStores());
};
