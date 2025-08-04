import React, { useState } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useSettingsStore } from '../../stores/settingsStore';
import { AnimatePresence, motion } from 'framer-motion';

export const DangerZone: React.FC = () => {
  const { clearAllData } = useSettingsStore();
  
  // UI state
  const [clearDataStatus, setClearDataStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [clearDataMessage, setClearDataMessage] = useState('');
  const [showClearAllDataConfirm, setShowClearAllDataConfirm] = useState(false);

  // Handler
  const handleClearAllData = () => {
    setClearDataStatus('loading');
    setClearDataMessage('Clearing all data...');
    
    try {
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
  };

  return (
    <>
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
    </>
  );
};

export default DangerZone;
