import React, { useState, useCallback } from 'react';
import { ArrowDownTrayIcon, ArrowUpTrayIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useNotesStore } from '../../stores/notesStore';

export const NotesManagement: React.FC = () => {
  // Use primitive selectors to avoid unnecessary re-renders
  const exportNotes = useNotesStore(state => state.exportNotes);
  const importNotes = useNotesStore(state => state.importNotes);
  const clearAllNotes = useNotesStore(state => state.clearAllNotes);
  
  // UI state
  const [exportStatus, setExportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [clearStatus, setClearStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  
  const [importMessage, setImportMessage] = useState('');
  const [clearMessage, setClearMessage] = useState('');

  // Handlers - memoized to prevent unnecessary re-renders
  const handleExportNotes = useCallback(() => {
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
  }, [exportNotes]);

  const handleImportNotes = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
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
  }, [importNotes]);

  const handleClearNotes = useCallback(() => {
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
  }, [clearAllNotes]);

  return (
    <div className="bg-card  rounded-lg space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-medium mb-2">Notes Management</h3>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          <button
            onClick={handleExportNotes}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors flex items-center justify-center gap-2"
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
              className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
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
