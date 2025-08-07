import { Square, Pause, Play } from 'lucide-react'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import { useRecordingStore } from '../../stores/recordingStore'
import { cn } from '../../lib/utils'
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

  // Using imported formatTime utility

  const handleToggle = () => {
    if (isPaused) {
      resumeRecording()
    } else {
      pauseRecording()
    }
  }

  return (
    <Card className="fixed bottom-20 left-4 right-4 z-40 shadow-2xl border-primary/30 bg-background/95 backdrop-blur-md">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-3 w-3 rounded-full",
              isPaused ? "bg-amber-500 animate-pulse" : "bg-red-500 animate-pulse"
            )} />
            <span className="text-sm font-medium">
              {isPaused ? 'Recording Paused' : 'Recording'}
            </span>
          </div>
          
          <div className="flex-1 text-center">
            <div className="text-lg font-mono font-bold text-primary">
              {formatTime(recordingTime)}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggle}
              className="h-8 w-8 p-0"
            >
              {isPaused ? (
                <Play className="h-4 w-4" />
              ) : (
                <Pause className="h-4 w-4" />
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={stopRecording}
              className="h-8 w-8 p-0"
            >
              <Square className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}