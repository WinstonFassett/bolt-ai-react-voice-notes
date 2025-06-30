import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface AudioDebugInfo {
  timestamp: string;
  event: string;
  details: any;
}

interface AudioDebugPanelProps {
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

export const AudioDebugPanel: React.FC<AudioDebugPanelProps> = ({
  isVisible,
  onClose,
  debugInfo,
  currentAudioState
}) => {
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
        className="fixed inset-0 bg-black/80 z-50 flex items-start justify-center p-4 overflow-y-auto"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-gray-900 border border-gray-700 rounded-xl p-4 max-w-lg w-full mt-8"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Audio Debug Panel</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Current State */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-300 mb-2">Current Audio State</h4>
            <div className="bg-gray-800 rounded-lg p-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Playing URL:</span>
                <span className="text-white font-mono text-right max-w-48 truncate">
                  {currentAudioState.currentPlayingAudioUrl || 'None'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Resolved URL:</span>
                <span className="text-white font-mono text-right max-w-48 truncate">
                  {currentAudioState.resolvedPlayingAudioUrl ? 
                    currentAudioState.resolvedPlayingAudioUrl.substring(0, 30) + '...' : 'None'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Is Playing:</span>
                <span className={`font-medium ${currentAudioState.globalIsPlaying ? 'text-green-400' : 'text-red-400'}`}>
                  {currentAudioState.globalIsPlaying ? 'YES' : 'NO'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">User Interacting:</span>
                <span className={`font-medium ${currentAudioState.isUserInteracting ? 'text-green-400' : 'text-red-400'}`}>
                  {currentAudioState.isUserInteracting ? 'YES' : 'NO'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Pending Request:</span>
                <span className="text-white font-mono text-right max-w-48 truncate">
                  {currentAudioState.pendingPlayRequest || 'None'}
                </span>
              </div>
              
              {/* Audio Element State */}
              {currentAudioState.audioElementState && (
                <>
                  <div className="border-t border-gray-700 pt-2 mt-2">
                    <div className="text-gray-300 font-medium mb-1">Audio Element:</div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Ready State:</span>
                    <span className="text-white">
                      {getReadyStateText(currentAudioState.audioElementState.readyState)} 
                      ({currentAudioState.audioElementState.readyState})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Network State:</span>
                    <span className="text-white">
                      {getNetworkStateText(currentAudioState.audioElementState.networkState)}
                      ({currentAudioState.audioElementState.networkState})
                    </span>
                  </div>
                  {currentAudioState.audioElementState.error && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Error:</span>
                      <span className="text-red-400 text-right max-w-48 truncate">
                        {currentAudioState.audioElementState.error}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Debug Log */}
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-2">Debug Log (Last 20 events)</h4>
            <div className="bg-gray-800 rounded-lg p-3 max-h-64 overflow-y-auto">
              {debugInfo.length === 0 ? (
                <div className="text-gray-500 text-sm">No debug events yet</div>
              ) : (
                <div className="space-y-1">
                  {debugInfo.slice(-20).reverse().map((info, index) => (
                    <div key={index} className="text-xs">
                      <div className="flex items-start gap-2">
                        <span className="text-gray-500 font-mono text-xs whitespace-nowrap">
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
                            : JSON.stringify(info.details, null, 2).substring(0, 100)
                          }
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};