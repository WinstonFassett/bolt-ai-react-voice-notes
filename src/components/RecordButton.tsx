import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MicrophoneIcon, StopIcon, PauseIcon, PlayIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { WaveformVisualizer } from './WaveformVisualizer';
import { useAudioStore } from '../stores/audioStore';
import { useRecordingStore } from '../stores/recordingStore';
import { useRoutingStore } from '../stores/routingStore';

export const RecordButton: React.FC = () => {
  // Get everything from stores
  const { setIsUserInteracting, currentPlayingAudioUrl } = useAudioStore();
  const { 
    isRecording, 
    isPaused, 
    recordingTime, 
    audioStream,
    startRecordingFlow,
    pauseRecordingFlow,
    resumeRecordingFlow,
    stopRecordingFlow,
    cancelRecordingFlow
  } = useRecordingStore();
  const { currentRoute } = useRoutingStore();

  const isGloballyPlaying = currentPlayingAudioUrl !== null;
  const activeTab = currentRoute.tab;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // SEPARATE HANDLERS - NO REUSE
  const handleStartRecord = () => {
    setIsUserInteracting(true);
    console.log('Starting recording');
    startRecordingFlow();
  };

  const handlePauseResume = () => {
    setIsUserInteracting(true);
    console.log('Pause/Resume clicked, isPaused:', isPaused);
    if (isPaused) {
      resumeRecordingFlow();
    } else {
      pauseRecordingFlow();
    }
  };

  const handleStop = () => {
    setIsUserInteracting(true);
    console.log('Stop clicked');
    stopRecordingFlow();
  };

  const handleCancel = () => {
    setIsUserInteracting(true);
    console.log('Cancel clicked');
    cancelRecordingFlow();
  };

  // Global Record Button Logic:

  // Show when:
  // 1. Currently recording (any tab)
  // 2. On record tab and not playing audio (default state)
  // 3. On agents/settings tab if recording
  // Hide when:
  // 4. On library tab unless actively recording
  // 5. When audio is playing (replaced by playback controls)
  const shouldShowButton = 
    (activeTab === 'library' && isRecording) ||
    (activeTab === 'record' && !isGloballyPlaying) ||
    ((activeTab === 'agents' || activeTab === 'settings') && isRecording);
  if (!shouldShowButton) {
    return null;
  }
  return (
    <div className="fixed bottom-24 left-0 right-0 z-40 pointer-events-none">
      <div className="flex justify-center px-4">
        <div className="w-full max-w-2xl">
        {/* Single Recording Toolbar */}
        <motion.div
          layout="position"
          className="bg-gray-900/60 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl overflow-hidden pointer-events-auto"
          animate={{ 
            width: isRecording ? '100%' : 'auto'
          }}
          transition={{ 
            duration: 0.3, 
            ease: [0.4, 0, 0.2, 1]
          }}
        >
          <motion.div 
            className="p-6"
            layout="position"
          >
            {/* Recording State Content */}
            <AnimatePresence mode="wait">
              {isRecording ? (
                <motion.div
                  key="recording"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  {/* Recording Header */}
                  <div className="text-center">
                    <div className="text-2xl font-mono font-semibold text-white">
                      {formatTime(recordingTime)}
                    </div>
                    <div className="text-sm text-gray-400 flex items-center justify-center gap-2">
                      {!isPaused ? (
                        <>
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                          Recording
                        </>
                      ) : (
                        <>
                          <div className="w-2 h-2 bg-gray-400 rounded-full" />
                          Paused
                        </>
                      )}
                    </div>
                  </div>

                  {/* Waveform Visualization */}
                  <div className="h-20 rounded-lg overflow-hidden">
                    <WaveformVisualizer
                      isRecording={isRecording && !isPaused}
                      audioStream={audioStream}
                      className="w-full h-full"
                    />
                  </div>

                  {/* Recording Controls - SEPARATE HANDLERS */}
                  <div className="flex items-center justify-center gap-3">
                    {/* Cancel Button - GRAY - SEPARATE HANDLER */}
                    {typeof cancelRecordingFlow === 'function' && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleCancel}
                        className="w-10 h-10 rounded-full bg-gray-600 hover:bg-gray-500 flex items-center justify-center transition-colors"
                        title="Cancel recording"
                      >
                        <XMarkIcon className="w-5 h-5 text-white" />
                      </motion.button>
                    )}

                    {/* Pause/Resume Button - GRAY - SEPARATE HANDLER */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handlePauseResume}
                      className="w-12 h-12 rounded-full bg-gray-600 hover:bg-gray-500 flex items-center justify-center transition-colors"
                    >
                      {isPaused ? (
                        <PlayIcon className="w-6 h-6 text-white" />
                      ) : (
                        <PauseIcon className="w-6 h-6 text-white" />
                      )}
                    </motion.button>

                    {/* Stop Button - RED - SEPARATE HANDLER */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleStop}
                      className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center transition-colors shadow-xl"
                    >
                      <StopIcon className="w-8 h-8 text-white" />
                    </motion.button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col items-center gap-4"
                >
                  {/* Main Record Button - RED - SEPARATE HANDLER */}
                  <motion.button
                    onClick={handleStartRecord}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative w-20 h-20 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center transition-all duration-300 shadow-xl"
                  >
                    <MicrophoneIcon className="w-8 h-8 text-white" />
                  </motion.button>

                  {/* Hint Text */}
                  <p className="text-sm text-gray-400 text-center">
                    Tap to start recording
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
        </div>
      </div>
    </div>
  );
};