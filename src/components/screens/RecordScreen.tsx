import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MicrophoneIcon } from '@heroicons/react/24/solid';
import { useRecordingStore } from '../../stores/recordingStore';
import { useTranscriptionStore } from '../../stores/transcriptionStore';
import { useAudioStore } from '../../stores/audioStore';
import { ModelLoadingProgress } from '../ui/ModelLoadingProgress';

export const RecordScreen: React.FC = () => {
  // Get everything from stores
  const { isRecording, startRecordingFlow } = useRecordingStore();
  const { currentPlayingAudioUrl } = useAudioStore();

  const showBigRecordButton = currentPlayingAudioUrl !== null;
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: 0 }}
        animate={{ opacity: 1, y: 0 }}
        className="safe-area-top py-4 px-4"
      >
        <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gradient">AI Voice Recorder</h1>         
        </div>
        </div>
      </motion.header>

      {/* Main Content - Vertically Centered */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 pb-40 min-h-0">
        <div className="w-full max-w-2xl flex flex-col items-center">
          <div className="w-full max-w-md space-y-8 text-center">
          <AnimatePresence mode="wait">
            {!isRecording ? (
              <motion.div
                key="ready"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="w-20 h-20 mx-auto rounded-full bg-gray-700/20 flex items-center justify-center mb-6">
                  <span className="text-3xl">🎙️</span>
                </div>
                <h2 className="text-4xl font-bold text-white mb-4"> Record</h2>
                <p className="text-xl text-gray-400 mb-8">
                  Tap the record button to start
                </p>
                
                {/* Big Record Button for Record Screen - Only show when global button is hidden */}
                {showBigRecordButton && (
                  <motion.button
                    onClick={startRecordingFlow}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-24 h-24 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center transition-all duration-300 shadow-xl mx-auto"
                  >
                    <MicrophoneIcon className="w-10 h-10 text-white" />
                  </motion.button>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="recording"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                <div className="w-16 h-16 mx-auto rounded-full bg-red-600/20 flex items-center justify-center mb-4">
                  <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse" />
                </div>
                <h2 className="text-3xl font-bold text-white">Recording...</h2>
                <p className="text-gray-400">
                  Speaking... Use the controls below to pause or stop
                </p>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
        </div>
      </main>
    </div>
  );
};