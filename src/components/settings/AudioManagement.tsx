import React, { useState } from 'react';
import { ArrowDownTrayIcon, ArrowUpTrayIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useRecordingStore } from '../../stores/recordingStore';

export const AudioManagement: React.FC = () => {
  const { exportAllAudio, importAudio, clearAllRecordings } = useRecordingStore();
  
  // UI state
  const [exportAudioStatus, setExportAudioStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [importAudioStatus, setImportAudioStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [clearAudioStatus, setClearAudioStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  
  const [importAudioMessage, setImportAudioMessage] = useState('');
  const [clearAudioMessage, setClearAudioMessage] = useState('');

  // Handlers
  const handleExportAllAudio = () => {
    setExportAudioStatus('loading');
    try {
      exportAllAudio();
      setExportAudioStatus('success');
      setTimeout(() => setExportAudioStatus('idle'), 2000);
    } catch (error) {
      console.error('Error exporting audio:', error);
      setExportAudioStatus('error');
      setTimeout(() => setExportAudioStatus('idle'), 4000);
    }
  };

  const handleImportAudio = (event: React.ChangeEvent<HTMLInputElement>) => {
    setImportAudioStatus('loading');
    setImportAudioMessage('Importing audio...');
    
    const file = event.target.files?.[0];
    if (!file) {
      setImportAudioStatus('error');
      setImportAudioMessage('No file selected');
      setTimeout(() => { 
        setImportAudioStatus('idle'); 
        setImportAudioMessage(''); 
      }, 4000);
      return;
    }
    
    try {
      importAudio(file);
      setImportAudioStatus('success');
      setImportAudioMessage('Audio imported successfully!');
    } catch (error: any) {
      setImportAudioStatus('error');
      setImportAudioMessage('Error importing audio: ' + (error?.message || 'Unknown error'));
    }
    
    setTimeout(() => { 
      setImportAudioStatus('idle'); 
      setImportAudioMessage(''); 
    }, 4000);
  };

  const handleClearAllRecordings = () => {
    setClearAudioStatus('loading');
    setClearAudioMessage('Clearing recordings...');
    
    try {
      clearAllRecordings();
      setClearAudioStatus('success');
      setClearAudioMessage('Recordings cleared successfully');
    } catch (error: any) {
      setClearAudioStatus('error');
      setClearAudioMessage('Error clearing recordings: ' + (error?.message || 'Unknown error'));
    }
    
    setTimeout(() => { 
      setClearAudioStatus('idle'); 
      setClearAudioMessage(''); 
    }, 4000);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-4">
      <div className="flex flex-row items-center justify-between">
        <h3 className="text-sm font-medium text-gray-300">Audio Management</h3>
        <div className="flex flex-row gap-2">
          <button
            onClick={handleExportAllAudio}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            disabled={exportAudioStatus === 'loading'}
          >
            <ArrowDownTrayIcon className="w-5 h-5" />
            Export All
          </button>
          
          <div className="relative">
            <input
              type="file"
              id="import-audio"
              accept=".zip"
              onChange={handleImportAudio}
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
            onClick={handleClearAllRecordings}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            disabled={clearAudioStatus === 'loading'}
          >
            <TrashIcon className="w-5 h-5" />
            Clear All
          </button>
        </div>
      </div>
      
      {importAudioMessage && (
        <div className={`text-sm ${importAudioStatus === 'success' ? 'text-green-400' : 'text-red-400'}`}>
          {importAudioMessage}
        </div>
      )}
      
      {clearAudioMessage && (
        <div className={`text-sm ${clearAudioStatus === 'success' ? 'text-green-400' : 'text-red-400'}`}>
          {clearAudioMessage}
        </div>
      )}
    </div>
  );
};

export default AudioManagement;
