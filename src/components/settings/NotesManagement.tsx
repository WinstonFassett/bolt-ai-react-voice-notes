import React, { useState } from 'react';
import { ArrowDownTrayIcon, ArrowUpTrayIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useNotesStore } from '../../stores/notesStore';

export const NotesManagement: React.FC = () => {
  const { exportNotes, importNotes, clearAllNotes } = useNotesStore();
  
  // UI state
  const [exportStatus, setExportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [clearStatus, setClearStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  
  const [importMessage, setImportMessage] = useState('');
  const [clearMessage, setClearMessage] = useState('');

  // Handlers
  const handleExportNotes = () => {
    setExportStatus('loading');
    try {
      exportNotes();
      setExportStatus('success');
      setTimeout(() => setExportStatus('idle'), 2000);
    } catch (error) {
      console.error('Error exporting notes:', error);
      setExportStatus('error');
      setTimeout(() => setExportStatus('idle'), 4000);
    }
  };

  const handleImportNotes = (event: React.ChangeEvent<HTMLInputElement>) => {
    setImportStatus('loading');
    setImportMessage('Importing notes...');
    
    const file = event.target.files?.[0];
    if (!file) {
      setImportStatus('error');
      setImportMessage('No file selected');
      setTimeout(() => { 
        setImportStatus('idle'); 
        setImportMessage(''); 
      }, 4000);
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
      setTimeout(() => { 
        setImportStatus('idle'); 
        setImportMessage(''); 
      }, 4000);
    };
    reader.readAsText(file);
  };

  const handleClearNotes = () => {
    setClearStatus('loading');
    setClearMessage('Clearing notes...');
    
    try {
      clearAllNotes();
      setClearStatus('success');
      setClearMessage('Notes cleared successfully');
    } catch (error: any) {
      setClearStatus('error');
      setClearMessage('Error clearing notes: ' + (error?.message || 'Unknown error'));
    }
    
    setTimeout(() => { 
      setClearStatus('idle'); 
      setClearMessage(''); 
    }, 4000);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-4">
      <div className="flex flex-row items-center justify-between">
        <h3 className="text-sm font-medium text-gray-300">Notes Management</h3>
        <div className="flex flex-row gap-2">
          <button
            onClick={handleExportNotes}
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
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowUpTrayIcon className="w-5 h-5" />
              Import
            </label>
          </div>
          
          <button
            onClick={handleClearNotes}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            disabled={clearStatus === 'loading'}
          >
            <TrashIcon className="w-5 h-5" />
            Clear
          </button>
        </div>
      </div>
      
      {importMessage && (
        <div className={`text-sm ${importStatus === 'success' ? 'text-green-400' : 'text-red-400'}`}>
          {importMessage}
        </div>
      )}
      
      {clearMessage && (
        <div className={`text-sm ${clearStatus === 'success' ? 'text-green-400' : 'text-red-400'}`}>
          {clearMessage}
        </div>
      )}
    </div>
  );
};

export default NotesManagement;
