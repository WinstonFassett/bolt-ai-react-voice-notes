import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';
import { toast } from '../hooks/use-toast';

interface AudioDebugInfo {
  timestamp: string;
  event: string;
  details: any;
}

interface MobileAudioDebuggerProps {
  isVisible: boolean;
  onClose: () => void;
  debugInfo: AudioDebugInfo[];
  currentAudioState: {
    currentPlayingAudioUrl: string | null;
    resolvedPlayingAudioUrl: string | null;
    globalIsPlaying: boolean;
    isUserInteracting: boolean;
    pendingPlayRequest: string | null;
    audioElementState?: {
      readyState?: number;
      networkState?: number;
      error?: string;
      src?: string;
    };
  };
}

export const MobileAudioDebugger: React.FC<MobileAudioDebuggerProps> = ({
  isVisible,
  onClose,
  debugInfo,
  currentAudioState
}) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [testResults, setTestResults] = useState<any>({});

  // Capture console logs
  useEffect(() => {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args) => {
      setLogs(prev => [...prev.slice(-20), `LOG: ${args.join(' ')}`]);
      originalLog(...args);
    };

    console.error = (...args) => {
      setLogs(prev => [...prev.slice(-20), `ERROR: ${args.join(' ')}`]);
      originalError(...args);
    };

    console.warn = (...args) => {
      setLogs(prev => [...prev.slice(-20), `WARN: ${args.join(' ')}`]);
      originalWarn(...args);
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  const runAudioTests = async () => {
    const results: any = {};
    
    try {
      // Test 1: Basic audio element creation
      results.audioElementCreation = 'TESTING...';
      const audio = new Audio();
      results.audioElementCreation = 'SUCCESS';
      
      // Test 2: Audio context
      results.audioContext = 'TESTING...';
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        results.audioContext = `SUCCESS - State: ${ctx.state}`;
        ctx.close();
      } catch (e) {
        results.audioContext = `FAILED: ${e}`;
      }
      
      // Test 3: Media capabilities
      results.mediaCapabilities = 'TESTING...';
      if ('mediaCapabilities' in navigator) {
        try {
          const webmInfo = await (navigator as any).mediaCapabilities.decodingInfo({
            type: 'file',
            audio: {
              contentType: 'audio/webm',
              channels: 1,
              bitrate: 128000,
              samplerate: 16000
            }
          });
          
          const wavInfo = await (navigator as any).mediaCapabilities.decodingInfo({
            type: 'file',
            audio: {
              contentType: 'audio/wav',
              channels: 1,
              bitrate: 128000,
              samplerate: 16000
            }
          });
          
          const mp4Info = await (navigator as any).mediaCapabilities.decodingInfo({
            type: 'file',
            audio: {
              contentType: 'audio/mp4',
              channels: 1,
              bitrate: 128000,
              samplerate: 16000
            }
          });
          
          results.mediaCapabilities = `WebM: ${webmInfo.supported ? 'YES' : 'NO'}, WAV: ${wavInfo.supported ? 'YES' : 'NO'}, MP4: ${mp4Info.supported ? 'YES' : 'NO'}`;
        } catch (e) {
          results.mediaCapabilities = `FAILED: ${e}`;
        }
      } else {
        results.mediaCapabilities = 'API NOT AVAILABLE';
      }
      
      // Test 4: MediaRecorder format support
      results.mediaRecorderSupport = 'TESTING...';
      const formats = [
        'audio/webm',
        'audio/webm;codecs=opus',
        'audio/mp4',
        'audio/aac',
        'audio/wav',
        'audio/ogg'
      ];
      
      const supportedFormats = formats.filter(format => {
        try {
          return MediaRecorder.isTypeSupported(format);
        } catch (e) {
          return false;
        }
      });
      
      results.mediaRecorderSupport = supportedFormats.length > 0 ? 
        `Supported: ${supportedFormats.join(', ')}` : 
        'No formats supported';
      
      // Test 4: Blob URL creation
      results.blobUrl = 'TESTING...';
      try {
        const testBlob = new Blob(['test'], { type: 'audio/webm' });
        const url = URL.createObjectURL(testBlob);
        results.blobUrl = 'SUCCESS';
        URL.revokeObjectURL(url);
      } catch (e) {
        results.blobUrl = `FAILED: ${e}`;
      }
      
      // Test 5: IndexedDB
      results.indexedDB = 'TESTING...';
      try {
        const request = indexedDB.open('test-db', 1);
        request.onsuccess = () => {
          results.indexedDB = 'SUCCESS';
          request.result.close();
          indexedDB.deleteDatabase('test-db');
          setTestResults({...results});
        };
        request.onerror = () => {
          results.indexedDB = `FAILED: ${request.error}`;
          setTestResults({...results});
        };
      } catch (e) {
        results.indexedDB = `FAILED: ${e}`;
      }
      
      // Test 6: User agent and device info
      results.deviceInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine
      };
      
      setTestResults(results);
    } catch (e) {
      results.generalError = `FAILED: ${e}`;
      setTestResults(results);
    }
  };

  const copyDebugInfo = () => {
    const debugReport = {
      timestamp: new Date().toISOString(),
      currentState: currentAudioState,
      testResults,
      recentLogs: logs.slice(-10),
      debugEvents: debugInfo.slice(-10),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    const reportText = JSON.stringify(debugReport, null, 2);
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(reportText).then(() => {
        toast({
          title: 'Debug Report',
          description: 'Debug report copied to clipboard!',
          variant: 'default'
        });
      }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = reportText;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        toast({
          title: 'Debug Report',
          description: 'Debug report copied to clipboard!',
          variant: 'default'
        });
      });
    }
  };

  const getReadyStateText = (state?: number) => {
    switch (state) {
      case 0: return 'HAVE_NOTHING';
      case 1: return 'HAVE_METADATA';
      case 2: return 'HAVE_CURRENT_DATA';
      case 3: return 'HAVE_FUTURE_DATA';
      case 4: return 'HAVE_ENOUGH_DATA';
      default: return 'UNKNOWN';
    }
  };

  const getNetworkStateText = (state?: number) => {
    switch (state) {
      case 0: return 'NETWORK_EMPTY';
      case 1: return 'NETWORK_IDLE';
      case 2: return 'NETWORK_LOADING';
      case 3: return 'NETWORK_NO_SOURCE';
      default: return 'UNKNOWN';
    }
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/90 z-50 overflow-y-auto"
      >
        <div className="min-h-full p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-gray-900 border border-gray-700 rounded-xl p-4 max-w-4xl mx-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">🔧 Mobile Audio Debugger</h2>
              <div className="flex gap-2">
                <button
                  onClick={copyDebugInfo}
                  className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  title="Copy debug report"
                >
                  <ClipboardDocumentIcon className="w-5 h-5 text-white" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Quick Status */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-300 mb-2">Audio Status</h3>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>Playing:</span>
                    <span className={currentAudioState.globalIsPlaying ? 'text-green-400' : 'text-red-400'}>
                      {currentAudioState.globalIsPlaying ? 'YES' : 'NO'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>User Interaction:</span>
                    <span className={currentAudioState.isUserInteracting ? 'text-green-400' : 'text-red-400'}>
                      {currentAudioState.isUserInteracting ? 'YES' : 'NO'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Has Audio URL:</span>
                    <span className={currentAudioState.currentPlayingAudioUrl ? 'text-green-400' : 'text-red-400'}>
                      {currentAudioState.currentPlayingAudioUrl ? 'YES' : 'NO'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-300 mb-2">Element State</h3>
                <div className="space-y-1 text-xs">
                  {currentAudioState.audioElementState ? (
                    <>
                      <div className="flex justify-between">
                        <span>Ready:</span>
                        <span className="text-white">
                          {getReadyStateText(currentAudioState.audioElementState.readyState)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Network:</span>
                        <span className="text-white">
                          {getNetworkStateText(currentAudioState.audioElementState.networkState)}
                        </span>
                      </div>
                      {currentAudioState.audioElementState.error && (
                        <div className="text-red-400 text-xs">
                          Error: {currentAudioState.audioElementState.error}
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="text-gray-400">No audio element</span>
                  )}
                </div>
              </div>
            </div>

            {/* Test Runner */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Audio Capability Tests</h3>
                <button
                  onClick={runAudioTests}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                >
                  Run Tests
                </button>
              </div>
              
              {Object.keys(testResults).length > 0 && (
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="space-y-2 text-sm">
                    {Object.entries(testResults).map(([test, result]) => (
                      <div key={test} className="flex justify-between">
                        <span className="text-gray-300">{test}:</span>
                        <span className={
                          typeof result === 'string' && result.includes('SUCCESS') ? 'text-green-400' :
                          typeof result === 'string' && result.includes('FAILED') ? 'text-red-400' :
                          'text-white'
                        }>
                          {typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Console Logs */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-4">Recent Console Output</h3>
              <div className="bg-black rounded-lg p-4 max-h-64 overflow-y-auto">
                {logs.length === 0 ? (
                  <div className="text-gray-500 text-sm">No logs captured yet</div>
                ) : (
                  <div className="space-y-1">
                    {logs.map((log, index) => (
                      <div key={index} className="text-xs font-mono">
                        <span className={
                          log.startsWith('ERROR:') ? 'text-red-400' :
                          log.startsWith('WARN:') ? 'text-yellow-400' :
                          'text-green-400'
                        }>
                          {log}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Debug Events */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Debug Events</h3>
              <div className="bg-gray-800 rounded-lg p-4 max-h-64 overflow-y-auto">
                {debugInfo.length === 0 ? (
                  <div className="text-gray-500 text-sm">No debug events yet</div>
                ) : (
                  <div className="space-y-2">
                    {debugInfo.slice(-10).reverse().map((info, index) => (
                      <div key={index} className="text-xs">
                        <div className="flex items-start gap-2">
                          <span className="text-gray-500 font-mono whitespace-nowrap">
                            {info.timestamp}
                          </span>
                          <span className="text-white font-medium">
                            {info.event}
                          </span>
                        </div>
                        {info.details && (
                          <div className="ml-16 text-gray-400 font-mono text-xs">
                            {typeof info.details === 'string' 
                              ? info.details 
                              : JSON.stringify(info.details, null, 2).substring(0, 200)
                            }
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Instructions */}
            <div className="mt-6 p-4 bg-blue-900/20 border border-blue-700/30 rounded-lg">
              <h4 className="text-sm font-medium text-blue-300 mb-2">How to use this debugger:</h4>
              <ol className="text-xs text-blue-200 space-y-1 list-decimal list-inside">
                <li>Run the audio capability tests first</li>
                <li>Try to play an audio file and watch the logs</li>
                <li>Copy the debug report and send it for analysis</li>
                <li>Check if any tests fail - this shows what's not working</li>
              </ol>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};