import React, { useState, useCallback, useMemo } from 'react';
import { ArrowDownTrayIcon, ArrowUpTrayIcon, TrashIcon, ShareIcon } from '@heroicons/react/24/outline';
import { useNotesStore } from '../../stores/notesStore';
import { Button } from '../ui/button';

export const AudioManagement: React.FC = () => {
  const { downloadAllAudio, downloadSingleAudio, importAudio, clearAllRecordings, notes } = useNotesStore();
  
  // UI state
  const [exportAudioStatus, setExportAudioStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [importAudioStatus, setImportAudioStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [clearAudioStatus, setClearAudioStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [showSingleExport, setShowSingleExport] = useState(false);
  
  const [importAudioMessage, setImportAudioMessage] = useState('');
  const [clearAudioMessage, setClearAudioMessage] = useState('');
  
  // Get notes with audio for single export (iOS optimization)
  const notesWithAudio = useMemo(() => {
    return notes.filter(note => note.audioUrl).sort((a, b) => b.created - a.created);
  }, [notes]);

  // Detect iOS device for optimized audio handling
  const isIOS = useMemo(() => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  }, []);

  // Handlers
  const handleExportAllAudio = useCallback(() => {
    setExportAudioStatus('loading');
    try {
      downloadAllAudio();
      setExportAudioStatus('success');
      setTimeout(() => setExportAudioStatus('idle'), 2000);
    } catch (error) {
      console.error('Error exporting audio:', error);
      setExportAudioStatus('error');
      setTimeout(() => setExportAudioStatus('idle'), 4000);
    }
  }, [downloadAllAudio]);
  
  // Handler for single audio export (iOS optimization)
  const handleExportSingleAudio = useCallback((noteId: string) => {
    try {
      downloadSingleAudio(noteId);
    } catch (error) {
      console.error('Error exporting single audio:', error);
    }
  }, [downloadSingleAudio]);

  const handleImportAudio = (event: React.ChangeEvent<HTMLInputElement>) => {
    setImportAudioStatus('loading');
    setImportAudioMessage('Importing audio...');
    
    if (!event.target.files?.length) {
      setImportAudioStatus('error');
      setImportAudioMessage('No file selected');
      setTimeout(() => { 
        setImportAudioStatus('idle'); 
        setImportAudioMessage(''); 
      }, 4000);
      return;
    }
    
    try {
      importAudio(event);
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
    <div className="bg-card rounded-lg space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-medium mb-2">Audio Management</h3>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          <Button
            onClick={() => isIOS ? setShowSingleExport(!showSingleExport) : handleExportAllAudio()}
            variant="default"
            className="flex items-center justify-center gap-2"
            disabled={exportAudioStatus === 'loading'}
          >
            <ArrowDownTrayIcon className="w-5 h-5" />
            {isIOS ? 'Export Options' : 'Export All'}
          </Button>
          
          <div className="relative">
            <input
              type="file"
              id="import-audio"
              accept=".zip"
              onChange={handleImportAudio}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <Button
              asChild
              variant="secondary"
              className="flex items-center justify-center gap-2"
            >
              <label
                htmlFor="import-audio"
                className="cursor-pointer"
              >
                <ArrowUpTrayIcon className="w-5 h-5" />
                Import
              </label>
            </Button>
          </div>
          
          <Button
            onClick={handleClearAllRecordings}
            variant="destructive"
            className="flex items-center justify-center gap-2"
            disabled={clearAudioStatus === 'loading'}
          >
            <TrashIcon className="w-5 h-5" />
            Clear All
          </Button>
        </div>
      </div>
      
      {/* iOS-optimized single file export UI */}
      {showSingleExport && isIOS && notesWithAudio.length > 0 && (
        <div className="mt-4 bg-card/50 rounded-lg p-3">
          <h4 className="text-sm font-medium text-gray-300 mb-2">Export Individual Audio Files</h4>
          <p className="text-xs text-gray-400 mb-3">For iOS devices, export files individually to avoid memory issues</p>
          
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {notesWithAudio.map(note => (
              <div key={note.id} className="flex items-center justify-between bg-gray-800/50 p-2 rounded">
                <div className="truncate flex-1">
                  <p className="text-sm text-gray-300 truncate">{note.title || 'Untitled Recording'}</p>
                  <p className="text-xs text-gray-500">{new Date(note.created).toLocaleDateString()}</p>
                </div>
                <Button
                  onClick={() => handleExportSingleAudio(note.id)}
                  variant="secondary"
                  size="icon"
                  className="ml-2"
                >
                  <ShareIcon className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
      
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
