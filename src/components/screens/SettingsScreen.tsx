import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ModelSelector } from '../ModelSelector';
import { LLMProviderSettings } from '../ui/LLMProviderSettings';
import { 
  CpuChipIcon,
  DocumentArrowDownIcon,
  InformationCircleIcon,
  CpuChipIcon as RobotIcon
} from '@heroicons/react/24/outline';
import { useDebugStore } from '../../stores/debugStore';

interface SettingsScreenProps {
  onExportNotes: () => void;
  onImportNotes: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClearAllNotes?: () => void;
  onClearAllRecordings?: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onExportNotes,
  onImportNotes,
  onClearAllNotes,
  onClearAllRecordings
}) => {
  const { setDebugVisible } = useDebugStore();
  const [showClearNotesConfirm, setShowClearNotesConfirm] = useState(false);
  const [showClearRecordingsConfirm, setShowClearRecordingsConfirm] = useState(false);

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
            <div className="w-full">
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
          label: 'Export All Notes',
          description: 'Download all your transcripts as JSON',
          component: (
            <button
              onClick={onExportNotes}
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
                onChange={onImportNotes}
                className="hidden"
              />
            </label>
          )
        },
        ...(onClearAllNotes ? [{
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
        }] : []),
        ...(onClearAllRecordings ? [{
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
        }] : [])
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
                    onClearAllNotes?.();
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
                    onClearAllRecordings?.();
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
    </div>
  );
};