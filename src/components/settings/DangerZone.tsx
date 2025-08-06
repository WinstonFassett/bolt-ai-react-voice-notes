import React, { useState, useCallback } from 'react';
import { ExclamationTriangleIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useSettingsStore } from '../../stores/settingsStore';
import { AnimatePresence, motion } from 'framer-motion';
import { deleteDownloadedModels } from '../../utils/settingsExporter';

export const DangerZone: React.FC = () => {
  // Use primitive selector to avoid unnecessary re-renders
  const clearAllData = useSettingsStore(state => state.clearAllData);
  
  // UI state
  const [clearDataStatus, setClearDataStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [clearDataMessage, setClearDataMessage] = useState('');
  const [showClearAllDataConfirm, setShowClearAllDataConfirm] = useState(false);


  // Handlers - memoized to prevent unnecessary re-renders
  const handleClearAllData = useCallback(async () => {
    setClearDataStatus('loading');
    setClearDataMessage('Clearing all data...');
    
    try {
      // Delete all downloaded models first
      await deleteDownloadedModels();
      
      // Then clear all other data
      const result = clearAllData();
      
      if (result.success) {
        setClearDataStatus('success');
        setClearDataMessage(result.message);
        // App will reload after this operation completes
      } else {
        setClearDataStatus('error');
        setClearDataMessage(result.message);
        setTimeout(() => { 
          setClearDataStatus('idle'); 
          setClearDataMessage(''); 
        }, 4000);
      }
      
      setShowClearAllDataConfirm(false);
    } catch (error: any) {
      console.error('Error clearing all data:', error);
      setClearDataStatus('error');
      setClearDataMessage('Error clearing all data');
      setTimeout(() => { 
        setClearDataStatus('idle'); 
        setClearDataMessage(''); 
      }, 4000);
    }
  }, [clearAllData, setShowClearAllDataConfirm]);


  return (
    <div>
      <div className="mt-2 space-y-4">
        {/* Clear All Data */}
        <div>
          <h4 className="text-sm font-semibold text-gray-400 mb-2">Clear All App Data</h4>
          <p className="text-sm text-gray-500 mb-2">
            Deletes all app data, including notes, audio, settings, providers, agents, and cached models.
          </p>
          <button
            onClick={() => setShowClearAllDataConfirm(true)}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 w-full"
            disabled={clearDataStatus === 'loading'}
          >
            <ExclamationTriangleIcon className="w-5 h-5" />
            Clear All App Data
          </button>
          
          {clearDataMessage && (
            <div className={`text-sm mt-2 ${clearDataStatus === 'success' ? 'text-green-400' : 'text-red-400'}`}>
              {clearDataMessage}
            </div>
          )}
        </div>
      </div>


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
              className="bg-background rounded-xl p-6 max-w-md w-full border border-border shadow-lg"
            >
              <h3 className="text-lg font-semibold text-destructive mb-4">Clear All Data</h3>
              <p className="text-muted-foreground mb-4">
                Are you sure you want to delete ALL data from this device?
              </p>
              <div className="mb-4">
                <p className="mb-2">This will delete:</p>
                <ul className="list-disc list-inside ml-2 text-muted-foreground space-y-1">
                  <li>All notes and recordings</li>
                  <li>All settings and preferences</li>
                  <li>AI provider configurations</li>
                  <li>All cached data including transformer models</li>
                  <li>IndexedDB storage</li>
                  <li>Local storage</li>
                </ul>
              </div>        
              <p className="text-destructive/80 font-medium mb-6">
                This action cannot be undone.
              </p>      

              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setShowClearAllDataConfirm(false)}
                  className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearAllData}
                  className="px-4 py-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg transition-colors"
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

export default DangerZone;
