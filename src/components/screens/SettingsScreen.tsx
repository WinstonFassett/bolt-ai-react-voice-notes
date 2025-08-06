import React, { useCallback, useMemo, useState } from 'react';
import { 
  CpuChipIcon,
  DocumentArrowDownIcon,
  InformationCircleIcon,
  CpuChipIcon as RobotIcon,
  TrashIcon,
  SunIcon,
  MoonIcon
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
import { deleteDownloadedModels } from '@/utils/settingsExporter';
import { useTheme } from '../../hooks/useTheme';
import { cn } from '@/lib/utils';

export const SettingsScreen: React.FC = () => {
  // Get theme settings
  const { theme, setTheme } = useTheme();
  
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

  const [clearModelsStatus, setClearModelsStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [clearModelsMessage, setClearModelsMessage] = useState('');
  
  const handleClearModels = useCallback(async () => {
    setClearModelsStatus('loading');
    setClearModelsMessage('Deleting downloaded models...');
    
    try {
      const result = await deleteDownloadedModels();
      
      if (result.success) {
        setClearModelsStatus('success');
        setClearModelsMessage(result.message);
      } else {
        setClearModelsStatus('error');
        setClearModelsMessage(result.message);
      }
      
      setTimeout(() => { 
        setClearModelsStatus('idle'); 
        setClearModelsMessage(''); 
      }, 4000);
    } catch (error: any) {
      console.error('Error clearing models:', error);
      setClearModelsStatus('error');
      setClearModelsMessage('Error clearing models');
      setTimeout(() => { 
        setClearModelsStatus('idle'); 
        setClearModelsMessage(''); 
      }, 4000);
    }
  }, []);

  const settingsGroups = useMemo(() => [
    {
      title: 'Appearance',
      icon: SunIcon,
      items: [
        {
          label: 'Theme',
          
          component: (
            <div className="flex flex-col space-y-4">
              <div className="w-full">
                <p className="text-sm text-muted-foreground">Choose your preferred color scheme</p>
              </div>
              <div className="w-full grid grid-cols-3 gap-2">
                <button
                  onClick={() => setTheme('system')}
                  className={cn(
                    'p-2 rounded-lg flex items-center justify-center gap-2',
                    theme === 'system' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80',
                  )}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <line x1="8" x2="16" y1="21" y2="21" />
                    <line x1="12" x2="12" y1="17" y2="21" />
                  </svg>
                  System
                </button>
                <button
                  onClick={() => setTheme('light')}
                  className={cn(
                    'p-2 rounded-lg flex items-center justify-center gap-2',
                    theme === 'light' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80',
                  )}
                >
                  <SunIcon className="w-5 h-5" />
                  Light
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={cn(
                    'p-2 rounded-lg flex items-center justify-center gap-2',
                    theme === 'dark' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80',
                  )}
                >
                  <MoonIcon className="w-5 h-5" />
                  Dark
                </button>
              </div>
            </div>
          )
        }
      ]
    },
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
                  <label className="text-sm font-medium">Use OpenAI for STT whenever possible</label>
                  <input
                    type="checkbox"
                    checked={useOpenAIForSTT}
                    onChange={e => useSettingsStore.getState().setUseOpenAIForSTT(e.target.checked)}
                    className="w-5 h-5 text-primary bg-background border-border rounded focus:ring-primary"
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
          label: 'My Data',
          description: 'Export, import, and manage your data',
          component: (
            <div className="space-y-6 w-full">
              {/* Settings Management UI */}
              {memoizedSettingsManagement}
              
              {/* Notes Management UI */}
              {memoizedNotesManagement}
              
              {/* Audio Management UI */}
              {memoizedAudioManagement}
              
              
            </div>
          )
        },
        {
          label: 'Cache',
          description: 'Manage cached data',
          component: (
          <div>
            <h4 className="text-sm text-gray-400 mb-2">Downloaded Models</h4>
            <button
              onClick={handleClearModels}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 w-full"
              disabled={clearModelsStatus === 'loading'}
            >
              <TrashIcon className="w-5 h-5" />
              Delete Downloaded Models
            </button>
            
            {clearModelsMessage && (
              <div className={`text-sm mt-2 ${clearModelsStatus === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                {clearModelsMessage}
              </div>
            )}
          </div>
          )
        }, {
          label: <span className="text-red-500">Danger Zone</span>,
          description: 'Be careful!',
          component: (
            memoizedDangerZone
          )
        }
      ]
    },
    // Not useful yet
    // {
    //   title: 'About',
    //   icon: InformationCircleIcon,
    //   items: [
    //     {
    //       label: 'Debug Info',
    //       description: 'View technical information about the app',
    //       component: (
    //         <div className="w-full">
    //           {debugInfoComponent}
    //         </div>
    //       )
    //     }
    //   ]
    // }
  ], [hasOpenAIProvider, useOpenAIForSTT]);

  return (
    <div className="flex flex-col h-full bg-background relative">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="safe-area-top py-4 px-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold">Settings</h1>
          </div>
        </div>
      </header>
      
      {/* Content */}
      <main className="flex-1 overflow-y-auto px-4 pb-24 pt-20">
        <div className="max-w-4xl mx-auto">
        {settingsGroups.map((group, index) => (
          <div key={index} className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <group.icon className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-lg font-semibold">{group.title}</h2>
            </div>
            
            <div className="space-y-6">
              {group.items.map((item, itemIndex) => (
                <div key={itemIndex} className="bg-card rounded-lg border border-border p-4">
                  <h3 className="text-sm font-medium mb-2">{item.label}</h3>
                  {item.description && (
                    <p className="text-sm text-muted-foreground mb-4">{item.description}</p>
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