import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ModelSelector } from '../ModelSelector';
import { LLMProviderSettings } from '../ui/LLMProviderSettings';
import { useNotesStore } from '../../stores/notesStore';
import { shallow } from 'zustand/shallow';
import { 
  CpuChipIcon,
  DocumentArrowDownIcon,
  InformationCircleIcon,
  CpuChipIcon as RobotIcon,
  Cog6ToothIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  TrashIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useDebugStore } from '../../stores/debugStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useLLMProvidersStore } from '../../stores/llmProvidersStore';
import { useAgentsStore } from '../../stores/agentsStore';
import { downloadSettings, importSettings, resetSettings, clearAllData } from '../../utils/settingsExporter';

export const SettingsScreen: React.FC = () => {
  // Get everything from stores
  const { 
    exportNotes, 
    clearAllNotes, 
    clearAllRecordings, 
    importNotes, 
    downloadAllAudio, 
    importAudio, 
    resetExportState,
    downloadSingleAudio,
    notes
  } = useNotesStore();
  
  // Reset export state on component mount to fix persisted state issues
  useEffect(() => {
    resetExportState();
  }, [resetExportState]);
  
  const { isExportingAudio, exportProgress } = useNotesStore(
    (state) => ({
      isExportingAudio: state.isExportingAudio,
      exportProgress: state.exportProgress
    }),
    shallow
  );
  
  const { setDebugVisible } = useDebugStore();
  const { useOpenAIForSTT, setUseOpenAIForSTT } = useSettingsStore();
  const { getValidProviders } = useLLMProvidersStore();
  const hasOpenAIProvider = getValidProviders().some(p => p.name.toLowerCase() === 'openai');

  // Notes with audio for individual export
  const notesWithAudio = useMemo(() => {
    return notes.filter(note => note.audioUrl);
  }, [notes]);

  const [showClearNotesConfirm, setShowClearNotesConfirm] = useState(false);
  const [showClearRecordingsConfirm, setShowClearRecordingsConfirm] = useState(false);
  const [showResetSettingsConfirm, setShowResetSettingsConfirm] = useState(false);
  const [showClearAllDataConfirm, setShowClearAllDataConfirm] = useState(false);

  // Import status state for feedback
  const [exportStatus, setExportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [exportMessage, setExportMessage] = useState('');
  const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState('');
  const [exportSettingsStatus, setExportSettingsStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [exportSettingsMessage, setExportSettingsMessage] = useState('');
  const [importSettingsStatus, setImportSettingsStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [importSettingsMessage, setImportSettingsMessage] = useState('');
  const [resetSettingsStatus, setResetSettingsStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [resetSettingsMessage, setResetSettingsMessage] = useState('');
  const [clearDataStatus, setClearDataStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [clearDataMessage, setClearDataMessage] = useState('');

  // Import settings handler
  const handleImportSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    setImportSettingsStatus('loading');
    setImportSettingsMessage('Importing settings...');
    const file = event.target.files?.[0];
    if (!file) {
      setImportSettingsStatus('error');
      setImportSettingsMessage('No file selected');
      setTimeout(() => { setImportSettingsStatus('idle'); setImportSettingsMessage(''); }, 4000);
      return;
    }
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const settingsData = JSON.parse(e.target?.result as string);
        const result = await importSettings(settingsData);
        
        if (result.success) {
          setImportSettingsStatus('success');
          setImportSettingsMessage(result.message);
        } else {
          setImportSettingsStatus('error');
          setImportSettingsMessage(result.message);
        }
      } catch (error: any) {
        setImportSettingsStatus('error');
        setImportSettingsMessage('Error importing settings: ' + (error?.message || 'Unknown error'));
      }
      setTimeout(() => { setImportSettingsStatus('idle'); setImportSettingsMessage(''); }, 4000);
    };
    reader.readAsText(file);
  };
  
  // Handle settings export
  const handleExportSettings = () => {
    setExportSettingsStatus('loading');
    setExportSettingsMessage('Exporting settings...');
    try {
      downloadSettings();
      setExportSettingsStatus('success');
      setExportSettingsMessage('Settings exported successfully');
      setTimeout(() => { setExportSettingsStatus('idle'); setExportSettingsMessage(''); }, 4000);
    } catch (error) {
      console.error('Error exporting settings:', error);
      setExportSettingsStatus('error');
      setExportSettingsMessage('Error exporting settings');
      setTimeout(() => { setExportSettingsStatus('idle'); setExportSettingsMessage(''); }, 4000);
    }
  };

  // Reset settings handler
  const handleResetSettings = () => {
    setResetSettingsStatus('loading');
    setResetSettingsMessage('Resetting settings...');
    
    try {
      resetSettings();
      setResetSettingsStatus('success');
      setResetSettingsMessage('Settings reset successfully');
      setTimeout(() => { 
        setResetSettingsStatus('idle'); 
        setResetSettingsMessage(''); 
        setShowResetSettingsConfirm(false);
      }, 4000);
    } catch (error) {
      console.error('Error resetting settings:', error);
      setResetSettingsStatus('error');
      setResetSettingsMessage('Error resetting settings');
      setTimeout(() => { 
        setResetSettingsStatus('idle'); 
        setResetSettingsMessage(''); 
      }, 4000);
    }
  };

  // Clear all data handler
  const handleClearAllData = () => {
    setClearDataStatus('loading');
    setClearDataMessage('Clearing all data...');
    
    try {
      clearAllData();
      // Note: The app will reload after this, so no need to set success state
      setClearDataStatus('success');
      setClearDataMessage('All data cleared successfully');
    } catch (error) {
      console.error('Error clearing all data:', error);
      setClearDataStatus('error');
      setClearDataMessage('Error clearing all data');
      setTimeout(() => { 
        setClearDataStatus('idle'); 
        setClearDataMessage(''); 
      }, 4000);
    }
  };

  const handleImportNotes = (event: React.ChangeEvent<HTMLInputElement>) => {
    setImportStatus('loading');
    setImportMessage('Importing notes...');
    const file = event.target.files?.[0];
    if (!file) {
      setImportStatus('error');
      setImportMessage('No file selected');
      setTimeout(() => { setImportStatus('idle'); setImportMessage(''); }, 4000);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const notesData = JSON.parse(e.target?.result as string);
        if (Array.isArray(notesData) && notesData.every(note => typeof note === 'object' && 'id' in note && 'title' in note && 'content' in note)) {
          importNotes(notesData);
          setImportStatus('success');
          setImportMessage('Notes imported successfully!');
        } else {
          setImportStatus('error');
          setImportMessage('Invalid notes format');
        }
      } catch (error: any) {
        setImportStatus('error');
        setImportMessage('Error importing notes: ' + (error?.message || 'Unknown error'));
      }
      setTimeout(() => { setImportStatus('idle'); setImportMessage(''); }, 4000);
    };
    reader.readAsText(file);
  };
  const settingsGroups = [
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
                    onChange={e => setUseOpenAIForSTT(e.target.checked)}
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
            {/* Settings Management UI - New organized version */}
            <div className="bg-gray-800 rounded-lg p-4 space-y-4">
              <div className="flex flex-row items-center justify-between">
                <h3 className="text-sm font-medium text-gray-300">Settings Management</h3>
                <div className="flex flex-row gap-2">
                  <button
                    onClick={handleExportSettings}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                    disabled={exportSettingsStatus === 'loading'}
                  >
                    <ArrowDownTrayIcon className="w-5 h-5" />
                    Export
                  </button>
                  
                  <div className="relative">
                    <input
                      type="file"
                      id="import-settings-file"
                      accept=".json"
                      onChange={handleImportSettings}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <label
                      htmlFor="import-settings-file"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ArrowUpTrayIcon className="w-5 h-5" />
                      Import
                    </label>
                  </div>
                  
                  <button
                    onClick={() => setShowResetSettingsConfirm(true)}
                    className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <ArrowPathIcon className="w-5 h-5" />
                    Reset
                  </button>
                </div>
              </div>
              
              {resetSettingsMessage && (
                <div className={`text-sm ${resetSettingsStatus === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                  {resetSettingsMessage}
                </div>
              )}
              
              {importSettingsMessage && (
                <div className={`text-sm ${importSettingsStatus === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                  {importSettingsMessage}
                </div>
              )}
            </div>
            
            {/* Notes Management UI */}
            <div className="bg-gray-800 rounded-lg p-4 space-y-4">
              <div className="flex flex-row items-center justify-between">
                <h3 className="text-sm font-medium text-gray-300">Notes Management</h3>
                <div className="flex flex-row gap-2">
                  <button
                    onClick={exportNotes}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                    disabled={exportStatus === 'loading'}
                  >
                    <ArrowDownTrayIcon className="w-5 h-5" />
                    Export
                  </button>
                  
                  <div className="relative">
                    <input
                      type="file"
                      id="import-notes"
                      accept=".json"
                      onChange={handleImportNotes}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <label
                      htmlFor="import-notes"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ArrowUpTrayIcon className="w-5 h-5" />
                      Import
                    </label>
                  </div>
                  
                  <button
                    onClick={() => setShowClearNotesConfirm(true)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <TrashIcon className="w-5 h-5" />
                    Clear
                  </button>
                </div>
                {importMessage && (
                  <div className={`text-sm ${importStatus === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                    {importMessage}
                  </div>
                )}
              </div>
              
              {/* Audio Management */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-300">Audio Management</h3>
                <div className="flex flex-row gap-2">
                  <button
                    onClick={downloadAllAudio}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                    disabled={isExportingAudio}
                  >
                    <ArrowDownTrayIcon className="w-5 h-5" />
                    Export All
                  </button>
                  
                  <div className="relative">
                    <input
                      type="file"
                      id="import-audio"
                      accept=".zip"
                      onChange={importAudio}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <label
                      htmlFor="import-audio"
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ArrowUpTrayIcon className="w-5 h-5" />
                      Import
                    </label>
                  </div>
                  
                  <button
                    onClick={() => setShowClearRecordingsConfirm(true)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <TrashIcon className="w-5 h-5" />
                    Clear
                  </button>
                </div>
                {exportMessage && (
                  <div className={`text-sm ${exportStatus === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                    {exportMessage}
                  </div>
                )}
              </div>
              

              
              {/* Danger Zone */}
              <div className="mt-8 pt-4 border-t border-gray-700">
                <h3 className="text-sm font-medium text-red-500">Danger Zone</h3>
                <div className="mt-2">
                  <button
                    onClick={() => setShowClearAllDataConfirm(true)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 w-full"
                    disabled={clearDataStatus === 'loading'}
                  >
                    <ExclamationTriangleIcon className="w-5 h-5" />
                    Clear All Data on Device
                  </button>
                  {clearDataMessage && (
                    <div className={`text-sm mt-2 ${clearDataStatus === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                      {clearDataMessage}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="text-xs text-gray-400 pt-2 border-t border-gray-700">
                Settings export includes AI providers (with API keys), agent definitions, and application preferences.
              </div>
            </div>
          )
        }
      ]
    },
    ...(import.meta.env.DEV ? [{
      title: 'Developer Tools',
      icon: InformationCircleIcon,
      items: [
        {
          label: 'Audio Debug Panel',
          description: 'Show audio debugging information',
          component: (
            <button
              onClick={() => setDebugVisible(true)}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Open Debug
            </button>
          )
        }
      ]
    }] : []),
    
    // Show debug tools if debug mode is enabled
    ...(typeof window !== 'undefined' && 
        (window.location.search.includes('debug=true') || 
         window.location.hash.includes('debug') ||
         localStorage.getItem('debug') === 'true') ? [{
      title: 'Debug Tools',
      icon: InformationCircleIcon,
      items: [
        {
          label: 'Audio Debug Panel',
          description: 'Show audio debugging information',
          component: (
            <button
              onClick={() => setDebugVisible(true)}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Open Debug
            </button>
          )
        },
        {
          label: 'Disable Debug Mode',
          description: 'Hide debug information',
          component: (
            <button
              onClick={() => {
                localStorage.removeItem('debug');
                window.location.reload();
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Disable Debug
            </button>
          )
        }
      ]
    }] : [])
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-gray-900/95 backdrop-blur-lg border-b border-gray-800">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="safe-area-top py-4 px-4"
        >
          <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          </div>
        </motion.div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-4 pb-24 pt-20">
        <div className="max-w-4xl mx-auto">
        <div className="space-y-6 py-4">
          {settingsGroups.map((group, groupIndex) => (
            <motion.div
              key={group.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: groupIndex * 0.1 }}
              className="card"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-indigo-600/20 flex items-center justify-center">
                  <group.icon className="w-5 h-5 text-indigo-400" />
                </div>
                <h2 className="text-lg font-semibold text-white">{group.title}</h2>
              </div>

              <div className="space-y-4">
                {group.items.map((item, itemIndex) => (
                  <div key={itemIndex} className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-white">{item.label}</h3>
                      <p className="text-sm text-gray-400 mt-1">{item.description}</p>
                    </div>
                    <div className="flex-shrink-0 w-full sm:w-auto">
                      {item.component}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}

          {/* About Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gray-600/20 flex items-center justify-center">
                <InformationCircleIcon className="w-5 h-5 text-gray-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">About</h2>
            </div>

            <div className="space-y-3 text-sm text-gray-300">
              <div className="flex justify-between">
                <span>Version</span>
                <span className="text-white">2.0.0</span>
              </div>
              <div className="flex justify-between">
                <span>AI Models</span>
                <span className="text-white">Whisper + T5</span>
              </div>
              <div className="flex justify-between">
                <span>Privacy</span>
                <span className="text-green-400">Local Processing</span>
              </div>
              <p className="text-xs text-gray-400 pt-2 border-t border-gray-700">
                All transcription happens locally on your device. Your audio never leaves your browser.
              </p>
            </div>
          </motion.div>
        </div>
        </div>
      </main>

      {/* Clear Notes Confirmation Modal */}
      <AnimatePresence>
        {showClearNotesConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-gray-700"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Clear All Notes</h3>
              <p className="text-gray-300 mb-6">
                Are you sure you want to delete all notes and transcripts? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowClearNotesConfirm(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    clearAllNotes();
                    setShowClearNotesConfirm(false);
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  Delete All Notes
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clear Recordings Confirmation Modal */}
      <AnimatePresence>
        {showClearRecordingsConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-gray-700"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Clear All Recordings</h3>
              <p className="text-gray-300 mb-6">
                Are you sure you want to delete all audio recordings? The text content will be preserved.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowClearRecordingsConfirm(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    clearAllRecordings();
                    setShowClearRecordingsConfirm(false);
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  Delete All Audio
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Import status feedback */}
      {importStatus !== 'idle' && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg text-white font-semibold transition-all
          ${importStatus === 'success' ? 'bg-green-600' : importStatus === 'error' ? 'bg-red-600' : 'bg-indigo-600'}`}
        >
          {importMessage}
        </div>
      )}
      
      {/* Settings import status feedback */}
      {importSettingsStatus !== 'idle' && (
        <div className={`fixed top-16 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg text-white font-semibold transition-all
          ${importSettingsStatus === 'success' ? 'bg-green-600' : importSettingsStatus === 'error' ? 'bg-red-600' : 'bg-indigo-600'}`}
        >
          {importSettingsMessage}
        </div>
      )}

      {/* Reset Settings Confirmation Modal */}
      <AnimatePresence>
        {showResetSettingsConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-gray-700"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Reset Settings</h3>
              <p className="text-gray-300 mb-6">
                Are you sure you want to reset all settings to default values? This will reset your AI providers, agents, and app preferences.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowResetSettingsConfirm(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetSettings}
                  className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
                >
                  Reset Settings
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clear All Data Confirmation Modal */}
      <AnimatePresence>
        {showClearAllDataConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-gray-700"
            >
              <h3 className="text-lg font-semibold text-red-500 mb-4">Clear All Data</h3>
              <p className="text-gray-300 mb-6">
                Are you sure you want to delete ALL data from this device? This includes notes, recordings, settings, and AI providers. This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowClearAllDataConfirm(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearAllData}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  Clear All Data
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};