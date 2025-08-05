import { Pause, Play, Square, Mic } from 'lucide-react'
import { useRecordingStore } from '../../stores/recordingStore'
// Import formatTime with type declaration
import { formatTime } from '../../utils/formatTime'

export function PersistentRecordingWidget() {
  const { 
    isRecording, 
    isPaused,
    recordingTime, 
    pauseRecording, 
    resumeRecording, 
    stopRecording 
  } = useRecordingStore()
  
  if (!isRecording) return null
  
  return (
    <div className="fixed bottom-16 left-0 right-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t border-border p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-red-500/20 flex items-center justify-center">
            <Mic className="h-5 w-5 text-red-500" />
          </div>
          
          <div>
            <div className="text-sm font-medium flex items-center">
              {isPaused ? (
                <span>Recording paused</span>
              ) : (
                <>
                  <span className="inline-block h-2 w-2 rounded-full bg-red-500 mr-2 animate-pulse" />
                  <span>Recording</span>
                </>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {formatTime(recordingTime)}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isPaused ? (
            <button
              onClick={resumeRecording}
              className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
            >
              <Play className="h-4 w-4 ml-0.5" />
            </button>
          ) : (
            <button
              onClick={pauseRecording}
              className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
            >
              <Pause className="h-4 w-4" />
            </button>
          )}
          
          <button
            onClick={stopRecording}
            className="h-8 w-8 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
          >
            <Square className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
