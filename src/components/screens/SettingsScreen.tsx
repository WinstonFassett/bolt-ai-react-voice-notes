import React, { useMemo } from 'react';
import { 
  CpuChipIcon,
  DocumentArrowDownIcon,
  InformationCircleIcon,
  CpuChipIcon as RobotIcon
} from '@heroicons/react/24/outline';

// Import components
import { ModelSelector } from '../ModelSelector';
import { LLMProviderSettings } from '../LLMProviderSettings';
import { 
  NotesManagement, 
  AudioManagement, 
  SettingsManagement, 
  DangerZone,
  DebugInfo
} from '../settings';

// Import stores
import { useSettingsStore } from '../../stores/settingsStore';
import { useLLMProvidersStore } from '../../stores/llmProvidersStore';

export const SettingsScreen: React.FC = () => {
  // Get only what we need from stores using primitive selectors to avoid unnecessary re-renders
  const useOpenAIForSTT = useSettingsStore(state => state.useOpenAIForSTT);
  
  // Check if we have a valid OpenAI provider for STT option
  const hasOpenAIProvider = useLLMProvidersStore(state => 
    state.providers.some(p => p.name.toLowerCase() === 'openai' && p.isValid)
  );

  // Define the settings groups structure with their components
  // Using stable references to prevent infinite loops
  const modelSelectorComponent = useMemo(() => <ModelSelector className="w-full" />, []);
  const llmProviderSettingsComponent = useMemo(() => <LLMProviderSettings />, []);
  const debugInfoComponent = useMemo(() => <DebugInfo />, []);

  const memoizedAudioManagement = useMemo(() => <AudioManagement />, []);
  const memoizedNotesManagement = useMemo(() => <NotesManagement />, []);
  const memoizedSettingsManagement = useMemo(() => <SettingsManagement />, []);
  const memoizedDangerZone = useMemo(() => <DangerZone />, []);

  const settingsGroups = useMemo(() => [
    {
      title: 'AI Agents',
      icon: RobotIcon,
      items: [
        {
          label: 'LLM Providers',
          description: 'Configure AI providers for intelligent agents',
          component: (
            <div className="w-full">
              {llmProviderSettingsComponent}
            </div>
          )
        }
      ]
    },
    {
      title: 'Transcription',
      icon: CpuChipIcon,
      items: [
        {
          label: 'Transcription Settings',
          description: 'Choose the AI model and language settings for speech recognition',
          component: (
            <div className="w-full space-y-6">
              {hasOpenAIProvider && (
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-300">Use OpenAI for STT whenever possible</label>
                  <input
                    type="checkbox"
                    checked={useOpenAIForSTT}
                    onChange={e => useSettingsStore.getState().setUseOpenAIForSTT(e.target.checked)}
                    className="w-5 h-5 text-indigo-600 bg-gray-700 border-gray-600 rounded focus:ring-indigo-500"
                  />
                </div>
              )}
              {modelSelectorComponent}
            </div>
          )
        }
      ]
    },
    {
      title: 'Data Management',
      icon: DocumentArrowDownIcon,
      items: [
        {
          label: 'Data Management',
          description: 'Export, import, and manage your data',
          component: (
            <div className="space-y-6 w-full">
              {/* Settings Management UI */}
              {memoizedSettingsManagement}
              
              {/* Notes Management UI */}
              {memoizedNotesManagement}
              
              {/* Audio Management UI */}
              {memoizedAudioManagement}
              
              {/* Danger Zone */}
              {memoizedDangerZone}
            </div>
          )
        }
      ]
    },
    {
      title: 'About',
      icon: InformationCircleIcon,
      items: [
        {
          label: 'Debug Info',
          description: 'View technical information about the app',
          component: (
            <div className="w-full">
              {debugInfoComponent}
            </div>
          )
        }
      ]
    }
  ], [hasOpenAIProvider, useOpenAIForSTT]);

  return (
    <div className="flex flex-col h-full bg-gray-900 relative">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-gray-900/95 backdrop-blur-lg border-b border-gray-800">
        <div className="safe-area-top py-4 px-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-white">Settings</h1>
          </div>
        </div>
      </header>
      
      {/* Content */}
      <main className="flex-1 overflow-y-auto px-4 pb-24 pt-20">
        <div className="max-w-4xl mx-auto">
        {settingsGroups.map((group, index) => (
          <div key={index} className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/20 flex items-center justify-center">
                <group.icon className="w-5 h-5 text-indigo-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">{group.title}</h2>
            </div>
            
            <div className="space-y-6">
              {group.items.map((item, itemIndex) => (
                <div key={itemIndex} className="bg-gray-900/50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-300 mb-2">{item.label}</h3>
                  {item.description && (
                    <p className="text-sm text-gray-400 mb-4">{item.description}</p>
                  )}
                  {item.component}
                </div>
              ))}
            </div>
          </div>
        ))}
        </div>
      </main>
    </div>
  );
};