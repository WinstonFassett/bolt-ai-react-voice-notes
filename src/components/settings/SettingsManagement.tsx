import React, { useState } from 'react';
import { ArrowDownTrayIcon, ArrowUpTrayIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useSettingsStore } from '../../stores/settingsStore';
import { AnimatePresence, motion } from 'framer-motion';

export const SettingsManagement: React.FC = () => {
  const { exportSettings, importSettings, resetSettings } = useSettingsStore();
  
  // UI state
  const [exportSettingsStatus, setExportSettingsStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [importSettingsStatus, setImportSettingsStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [resetSettingsStatus, setResetSettingsStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  
  const [importSettingsMessage, setImportSettingsMessage] = useState('');
  const [resetSettingsMessage, setResetSettingsMessage] = useState('');
  
  const [showResetSettingsConfirm, setShowResetSettingsConfirm] = useState(false);

  // Handlers
  const handleExportSettings = () => {
    setExportSettingsStatus('loading');
    try {
      exportSettings();
      setExportSettingsStatus('success');
      setTimeout(() => setExportSettingsStatus('idle'), 2000);
    } catch (error) {
      console.error('Error exporting settings:', error);
      setExportSettingsStatus('error');
      setTimeout(() => setExportSettingsStatus('idle'), 4000);
    }
  };

  const handleImportSettings = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setImportSettingsStatus('loading');
    setImportSettingsMessage('Importing settings...');
    
    const file = event.target.files?.[0];
    if (!file) {
      setImportSettingsStatus('error');
      setImportSettingsMessage('No file selected');
      setTimeout(() => { 
        setImportSettingsStatus('idle'); 
        setImportSettingsMessage(''); 
      }, 4000);
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
      setTimeout(() => { 
        setImportSettingsStatus('idle'); 
        setImportSettingsMessage(''); 
      }, 4000);
    };
    reader.readAsText(file);
  };

  const handleResetSettings = () => {
    setResetSettingsStatus('loading');
    setResetSettingsMessage('Resetting settings...');
    
    try {
      const result = resetSettings();
      
      if (result.success) {
        setResetSettingsStatus('success');
        setResetSettingsMessage(result.message);
      } else {
        setResetSettingsStatus('error');
        setResetSettingsMessage(result.message);
      }
      
      setShowResetSettingsConfirm(false);
    } catch (error: any) {
      setResetSettingsStatus('error');
      setResetSettingsMessage('Error resetting settings: ' + (error?.message || 'Unknown error'));
    }
    
    setTimeout(() => { 
      setResetSettingsStatus('idle'); 
      setResetSettingsMessage(''); 
    }, 4000);
  };

  return (
    <>
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
                id="import-settings"
                accept=".json"
                onChange={handleImportSettings}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <label
                htmlFor="import-settings"
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <ArrowUpTrayIcon className="w-5 h-5" />
                Import
              </label>
            </div>
            
            <button
              onClick={() => setShowResetSettingsConfirm(true)}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
              disabled={resetSettingsStatus === 'loading'}
            >
              <ArrowPathIcon className="w-5 h-5" />
              Reset
            </button>
          </div>
        </div>
        
        {importSettingsMessage && (
          <div className={`text-sm ${importSettingsStatus === 'success' ? 'text-green-400' : 'text-red-400'}`}>
            {importSettingsMessage}
          </div>
        )}
        
        {resetSettingsMessage && (
          <div className={`text-sm ${resetSettingsStatus === 'success' ? 'text-green-400' : 'text-red-400'}`}>
            {resetSettingsMessage}
          </div>
        )}
      </div>

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
    </>
  );
};

export default SettingsManagement;
