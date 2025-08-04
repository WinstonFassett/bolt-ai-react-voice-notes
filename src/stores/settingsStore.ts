import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import Constants from '../utils/Constants';
import { downloadSettings as exportSettingsUtil, importSettings as importSettingsUtil, resetSettings as resetSettingsUtil, clearAllData as clearAllDataUtil } from '../utils/settingsExporter';

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
  
  // Settings management actions
  exportSettings: () => void;
  importSettings: (settingsData: any) => Promise<{success: boolean; message: string}>;
  resetSettings: () => {success: boolean; message: string};
  clearAllData: () => {success: boolean; message: string};
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
      })),
      
      // Settings management actions
      exportSettings: () => {
        exportSettingsUtil();
        return { success: true, message: 'Settings exported successfully' };
      },
      
      importSettings: async (settingsData) => {
        try {
          const result = await importSettingsUtil(settingsData);
          return result;
        } catch (error) {
          console.error('Error importing settings:', error);
          return { success: false, message: 'Error importing settings' };
        }
      },
      
      resetSettings: () => {
        try {
          resetSettingsUtil();
          return { success: true, message: 'Settings reset successfully' };
        } catch (error) {
          console.error('Error resetting settings:', error);
          return { success: false, message: 'Error resetting settings' };
        }
      },
      
      clearAllData: () => {
        try {
          clearAllDataUtil();
          return { success: true, message: 'All data cleared successfully' };
        } catch (error) {
          console.error('Error clearing all data:', error);
          return { success: false, message: 'Error clearing all data' };
        }
      }
    }),
    {
      name: 'settings-store',
      version: 0,
      migrate: (persistedState: any) => persistedState
    }
  )
);