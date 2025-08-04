import React, { useMemo } from 'react';
import { shallow } from 'zustand/shallow';
import { 
  CpuChipIcon,
  DocumentArrowDownIcon,
  InformationCircleIcon,
  CpuChipIcon as RobotIcon
} from '@heroicons/react/24/outline';

// Import components
import { ModelSelector } from '../ModelSelector';
import { LLMProviderSettings } from '../ui/LLMProviderSettings';
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
  // Get only what we need from stores using shallow comparison for performance
  const { model, useOpenAIForSTT } = useSettingsStore(state => ({
    model: state.model,
    useOpenAIForSTT: state.useOpenAIForSTT
  }), shallow);
  
  // Check if we have a valid OpenAI provider for STT option
  const hasOpenAIProvider = useLLMProvidersStore(state => 
    state.providers.some(p => p.name.toLowerCase() === 'openai' && p.isValid)
  );

  // Define the settings groups structure with their components
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
              <LLMProviderSettings />
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
              <ModelSelector className="w-full" />
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
              <SettingsManagement />
              
              {/* Notes Management UI */}
              <NotesManagement />
              
              {/* Audio Management UI */}
              <AudioManagement />
              
              {/* Danger Zone */}
              <DangerZone />
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
              <DebugInfo />
            </div>
          )
        }
      ]
    }
  ], [hasOpenAIProvider, useOpenAIForSTT]);

  return (
    <div className="w-full h-full overflow-y-auto p-4">
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
    </div>
  );
};