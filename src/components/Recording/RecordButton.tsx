import { useState, useEffect } from 'react'
import { Mic, Square, Pause, Play, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/appStore'

export function RecordButton() {
  const { 
    isRecording, 
    isPaused, 
    recordingTime, 
    startRecording, 
    pauseRecording, 
    resumeRecording, 
    stopRecording,
    cancelRecording 
  } = useAppStore()

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handlePress = () => {
    if (!isRecording) {
      startRecording()
    }
  }

  const handlePause = () => {
    if (isPaused) {
      resumeRecording()
    } else {
      pauseRecording()
    }
  }

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Timer */}
      {isRecording && (
        <div className="text-3xl font-mono font-bold text-emerald-400 animate-pulse">
          {formatTime(recordingTime)}
        </div>
      )}

      {/* Record Button */}
      <div className="relative">
        <Button
          size="icon"
          onClick={handlePress}
          className={cn(
            "h-24 w-24 rounded-full transition-all duration-300 active:scale-90 shadow-2xl",
            !isRecording
              ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30"
              : "bg-red-500 hover:bg-red-600 shadow-red-500/30"
          )}
        >
          <Mic className="h-10 w-10" />
        </Button>

        {/* Recording indicator ring */}
        {isRecording && !isPaused && (
          <>
            <div className="absolute inset-0 rounded-full border-2 border-red-400 animate-ping opacity-75" />
            <div className="absolute inset-0 rounded-full border border-red-300 animate-pulse" />
          </>
        )}
      </div>

      {/* Action Buttons */}
      {isRecording && (
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePause}
            className={cn(
              "flex items-center gap-2",
              isPaused 
                ? "border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950"
                : "border-amber-200 text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950"
            )}
          >
            {isPaused ? (
              <>
                <Play className="h-4 w-4" />
                Resume
              </>
            ) : (
              <>
                <Pause className="h-4 w-4" />
                Pause
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={cancelRecording}
            className="flex items-center gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
          >
            <X className="h-4 w-4" />
            Cancel
          </Button>
          
          <Button
            size="sm"
            onClick={stopRecording}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/25"
          >
            <Square className="h-4 w-4" />
            Save Note
          </Button>
        </div>
      )}
    </div>
  )
}