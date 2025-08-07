import React, { useState, useCallback } from 'react';
import { ArrowDownTrayIcon, ArrowUpTrayIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useSettingsStore } from '../../stores/settingsStore';
import { AnimatePresence, motion } from 'framer-motion';
import {Button} from '@/components/ui/button';

export const SettingsManagement: React.FC = () => {
  // Use primitive selectors to avoid unnecessary re-renders
  const exportSettings = useSettingsStore(state => state.exportSettings);
  const importSettings = useSettingsStore(state => state.importSettings);
  const resetSettings = useSettingsStore(state => state.resetSettings);
  
  // UI state
  const [exportSettingsStatus, setExportSettingsStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [importSettingsStatus, setImportSettingsStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [resetSettingsStatus, setResetSettingsStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  
  const [importSettingsMessage, setImportSettingsMessage] = useState('');
  const [resetSettingsMessage, setResetSettingsMessage] = useState('');
  
  const [showResetSettingsConfirm, setShowResetSettingsConfirm] = useState(false);

  // Handlers - memoized to prevent unnecessary re-renders
  const handleExportSettings = useCallback(() => {
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
  }, [exportSettings]);

  const handleImportSettings = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
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
  }, [importSettings]);

  const handleResetSettings = useCallback(() => {
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
  }, [resetSettings, setShowResetSettingsConfirm]);

  return (
    <>
      <div className="bg-card rounded-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-medium mb-2">Settings Management</h3>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <Button
              onClick={handleExportSettings}
              variant="default"
              className="flex items-center justify-center gap-2"
              disabled={exportSettingsStatus === 'loading'}
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
              Export
            </Button>
            
            <div className="relative">
              <input
                type="file"
                id="import-settings"
                accept=".json"
                onChange={handleImportSettings}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Button
                asChild
                variant="secondary"
              >
                <label
                  htmlFor="import-settings"
                  className="flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ArrowUpTrayIcon className="w-5 h-5" />
                  Import
                </label>
              </Button>
            </div>
            
            <Button
              onClick={() => setShowResetSettingsConfirm(true)}
              variant="destructive"
              className="flex items-center justify-center gap-2"
              disabled={resetSettingsStatus === 'loading'}
            >
              <ArrowPathIcon className="w-5 h-5" />
              Reset
            </Button>
          </div>
        </div>
        
        {importSettingsMessage && (
          <div className={`text-sm ${importSettingsStatus === 'success' ? 'text-success' : 'text-destructive'} sm:mt-2`}>
            {importSettingsMessage}
          </div>
        )}
        
        {resetSettingsMessage && (
          <div className={`text-sm ${resetSettingsStatus === 'success' ? 'text-success' : 'text-destructive'} sm:mt-2`}>
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
              className="bg-background rounded-xl p-6 max-w-md w-full border border-border"
            >
              <h3 className="text-lg font-semibold mb-4">Reset Settings</h3>
              <p className="text-muted-foreground mb-6">
                Are you sure you want to reset all settings to default values? This will reset your AI providers, agents, and app preferences.
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  onClick={() => setShowResetSettingsConfirm(false)}
                  variant="default"
                  className="px-4 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleResetSettings}
                  variant="destructive"
                  className="px-4 py-2 rounded-lg transition-colors"
                >
                  Reset Settings
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SettingsManagement;
