import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ModelSelector } from '../ModelSelector';
import { LLMProviderSettings } from '../ui/LLMProviderSettings';
import { useNotesStore } from '../../stores/notesStore';
import { shallow } from 'zustand/shallow';
import { 
  CpuChipIcon,
  DocumentArrowDownIcon,
  InformationCircleIcon,
  CpuChipIcon as RobotIcon
} from '@heroicons/react/24/outline';
import { useDebugStore } from '../../stores/debugStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { ShieldCheckIcon } from '@heroicons/react/24/outline';
import { useLLMProvidersStore } from '../../stores/llmProvidersStore';
import AudioOptimizationPanel from '../AudioOptimizationPanel';

export const SettingsScreen: React.FC = () => {
  // Get everything from stores
  const { exportNotes, clearAllNotes, clearAllRecordings, importNotes, downloadAllAudio, downloadSingleAudio, importAudio, resetExportState, notes } = useNotesStore();
  
  // Reset export state on component mount to fix persisted state issues
  React.useEffect(() => {
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
  const { 
    useOpenAIForSTT, 
    setUseOpenAIForSTT,
    errorReportingEnabled,
    setErrorReportingEnabled 
  } = useSettingsStore();
  const { getValidProviders } = useLLMProvidersStore();
  const hasOpenAIProvider = getValidProviders().some(p => p.name.toLowerCase() === 'openai');

  const [showClearNotesConfirm, setShowClearNotesConfirm] = useState(false);
  const [showClearRecordingsConfirm, setShowClearRecordingsConfirm] = useState(false);

  // Import status state for feedback
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error' | 'loading'>('idle');
  const [importMessage, setImportMessage] = useState<string>('');
  
  // State for notes with audio
  const [notesWithAudio, setNotesWithAudio] = useState<Array<{id: string, title: string}>>([]);
  
  // Filter notes with audio on component mount
  useEffect(() => {
    const filtered = notes
      .filter(note => note.audioUrl)
      .map(note => ({ id: note.id, title: note.title || 'Untitled Note' }));
    setNotesWithAudio(filtered);
  }, [notes]);

  // Import handler
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
        const importedNotesData = JSON.parse(e.target?.result as string);
        if (Array.isArray(importedNotesData) && importedNotesData.every(note => typeof note === 'object' && 'id' in note && 'title' in note && 'content' in note)) {
          importNotes(importedNotesData);
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
      title: 'Privacy',
      icon: ShieldCheckIcon,
      items: [
        {
          label: 'Error Reporting',
          description: 'Allow anonymous error reports to help improve the app',
          component: (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-400 max-w-md">
                When enabled, technical error information will be sent to help fix bugs.
                No personal data or note content is ever shared.
              </div>
              <div className="flex items-center ml-4">
                <input
                  type="checkbox"
                  checked={errorReportingEnabled}
                  onChange={e => setErrorReportingEnabled(e.target.checked)}
                  className="w-5 h-5 text-indigo-600 bg-gray-700 border-gray-600 rounded focus:ring-indigo-500"
                />
              </div>
            </div>
          )
        }
      ]
    },
    // Error reporting section removed and replaced with Privacy section above
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
          label: 'Audio Optimization',
          description: 'Optimize large audio files to save space and improve performance',
          component: (
            <AudioOptimizationPanel />
          )
        },
        {
          label: 'Export All Notes',
          description: 'Download all your transcripts as JSON',
          component: (
            <button
              onClick={exportNotes}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              Export
            </button>
          )
        },
        {
          label: 'Import Notes',
          description: 'Import transcripts from a backup file',
          component: (
            <label className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer">
              Import
              <input
                type="file"
                accept=".json"
                onChange={handleImportNotes}
                className="hidden"
              />
            </label>
          )
        },
        {
          label: 'Clear All Notes',
          description: 'Delete all transcripts and notes',
          component: (
            <button
              onClick={() => setShowClearNotesConfirm(true)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Clear Notes
            </button>
          )
        },
        {
          label: 'Download All Audio',
          description: 'Download all audio recordings as a zip file',
          component: (
            <div className="flex flex-col gap-2 w-full">
              <button
                onClick={() => downloadAllAudio()}
                disabled={isExportingAudio}
                className={`px-4 py-2 ${isExportingAudio ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'} text-white rounded-lg transition-colors`}
              >
                {isExportingAudio ? 'Exporting...' : 'Download All Audio'}
              </button>
              
              {/* Progress indicator */}
              {isExportingAudio && exportProgress && (
                <div className="mt-2">
                  <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-600 animate-pulse" style={{ width: '100%' }}></div>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{exportProgress}</p>
                </div>
              )}
            </div>
          )
        },
        // {
        //   label: 'Export Individual Audio Files',
        //   description: 'Export audio recordings one by one (better for iOS)',
        //   component: (
        //     <div className="flex flex-col gap-2 w-full">
        //       {notesWithAudio.length > 0 ? (
        //         <div className="max-h-48 overflow-y-auto pr-2 space-y-2 bg-gray-800/50 rounded-lg p-2">
        //           {notesWithAudio.map(note => (
        //             <div key={note.id} className="flex justify-between items-center bg-gray-700/50 p-2 rounded">
        //               <span className="text-sm text-gray-300 truncate mr-2">{note.title}</span>
        //               <button
        //                 onClick={() => downloadSingleAudio(note.id)}
        //                 disabled={isExportingAudio}
        //                 className={`px-2 py-1 text-xs ${isExportingAudio ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded transition-colors`}
        //               >
        //                 Export
        //               </button>
        //             </div>
        //           ))}
        //         </div>
        //       ) : (
        //         <p className="text-sm text-gray-400">No audio recordings found</p>
        //       )}
              
        //       {/* Progress indicator */}
        //       {isExportingAudio && exportProgress && (
        //         <div className="mt-2">
        //           <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
        //             <div className="h-full bg-blue-600 animate-pulse" style={{ width: '100%' }}></div>
        //           </div>
        //           <p className="text-sm text-gray-600 mt-1">{exportProgress}</p>
        //         </div>
        //       )}
        //     </div>
        //   )
        // },
        {
          label: 'Import Audio',
          description: 'Import audio recordings from a zip file',
          component: (
            <button
              onClick={() => {
                // Create a file input element
                const fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.accept = '.zip';
                fileInput.style.display = 'none';
                document.body.appendChild(fileInput);
                
                // Handle file selection
                fileInput.onchange = async (e) => {
                  const target = e.target as HTMLInputElement;
                  if (target.files && target.files.length > 0) {
                    const file = target.files[0];
                    await importAudio(file);
                  }
                  document.body.removeChild(fileInput);
                };
                
                // Trigger file selection dialog
                fileInput.click();
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
            >
              Import Audio
            </button>
          )
        },
        {
          label: 'Clear All Recordings',
          description: 'Delete all audio recordings (keeps text)',
          component: (
            <button
              onClick={() => setShowClearRecordingsConfirm(true)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Clear Audio
            </button>
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
    </div>
  );
};