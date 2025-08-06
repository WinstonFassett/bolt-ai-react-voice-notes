import { Mic, Square, Pause, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAppStore } from '@/store/appStore'
import { cn } from '@/lib/utils'

export function PersistentRecordingWidget() {
  const { 
    isRecording, 
    isPaused, 
    recordingTime, 
    pauseRecording, 
    resumeRecording, 
    stopRecording 
  } = useAppStore()

  if (!isRecording) return null

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleToggle = () => {
    if (isPaused) {
      resumeRecording()
    } else {
      pauseRecording()
    }
  }

  return (
    <Card className="fixed bottom-20 left-4 right-4 z-40 shadow-2xl border-emerald-500/30 bg-slate-900/95 backdrop-blur-md">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-3 w-3 rounded-full",
              isPaused ? "bg-amber-500 animate-pulse" : "bg-red-500 animate-pulse"
            )} />
            <span className="text-sm font-medium text-white">
              {isPaused ? 'Recording Paused' : 'Recording'}
            </span>
          </div>
          
          <div className="flex-1 text-center">
            <div className="text-lg font-mono font-bold text-emerald-400">
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