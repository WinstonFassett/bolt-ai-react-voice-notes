import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import Constants from '../utils/Constants';

interface SettingsState {
  // Transcriber settings
  model: string;
  multilingual: boolean;
  quantized: boolean;
  subtask: string;
  language: string;
  
  // OpenAI STT settings
  useOpenAIForSTT: boolean;
  openAIModel: string;
  
  // Actions
  setModel: (model: string) => void;
  setMultilingual: (multilingual: boolean) => void;
  setQuantized: (quantized: boolean) => void;
  setSubtask: (subtask: string) => void;
  setLanguage: (language: string) => void;
  setUseOpenAIForSTT: (useOpenAI: boolean) => void;
  setOpenAIModel: (model: string) => void;
  
  // Complex actions
  updateModelSettings: (settings: Partial<SettingsState>) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // Initial state from Constants
      model: Constants.DEFAULT_MODEL,
      multilingual: Constants.DEFAULT_MULTILINGUAL,
      quantized: Constants.DEFAULT_QUANTIZED,
      subtask: Constants.DEFAULT_SUBTASK,
      language: Constants.DEFAULT_LANGUAGE,
      useOpenAIForSTT: true, // default to true
      openAIModel: 'whisper-1', // default OpenAI STT model
      
      // Simple setters
      setModel: (model) => {
        set({ model });
        // Auto-update multilingual based on model
        const isEnglishOnly = model.endsWith('.en');
        set({ multilingual: !isEnglishOnly });
      },
      
      setMultilingual: (multilingual) => set({ multilingual }),
      setQuantized: (quantized) => set({ quantized }),
      setSubtask: (subtask) => set({ subtask }),
      setLanguage: (language) => set({ language }),
      setUseOpenAIForSTT: (useOpenAIForSTT) => set({ useOpenAIForSTT }),
      setOpenAIModel: (openAIModel) => set({ openAIModel }),
      
      // Complex actions
      updateModelSettings: (settings) => set((state) => ({
        ...state,
        ...settings
      }))
    }),
    {
      name: 'settings-store',
      version: 0,
      migrate: (persistedState: any) => persistedState
    }
  )
);