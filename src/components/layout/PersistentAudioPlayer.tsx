import { Play, Pause, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useAppStore } from '@/stores/mock-appStore'

export function PersistentAudioPlayer() {
  const { 
    currentPlayingAudioUrl,
    isPlaying,
    audioDuration,
    audioCurrentTime,
    pauseAudio,
    playAudio,
    seekAudio,
    notes
  } = useAppStore()

  if (!currentPlayingAudioUrl) return null

  const currentNote = notes.find(note => note.audioUrl === currentPlayingAudioUrl)
  const progress = audioDuration ? (audioCurrentTime / audioDuration) * 100 : 0

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleTogglePlay = () => {
    if (isPlaying) {
      pauseAudio()
    } else {
      playAudio(currentPlayingAudioUrl)
    }
  }

  const handleClose = () => {
    pauseAudio()
    // Clear the current playing audio
    useAppStore.setState({ currentPlayingAudioUrl: undefined })
  }

  return (
    <Card className="fixed bottom-20 left-4 right-4 z-40 shadow-lg">
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleTogglePlay}
            className="h-8 w-8 p-0 flex-shrink-0 active:scale-95 transition-transform"
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
          
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate mb-1">
              {currentNote?.title || 'Audio'}
            </div>
            <div className="flex items-center gap-2">
              <Progress value={progress} className="flex-1 h-1" />
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formatTime(audioCurrentTime)} / {formatTime(audioDuration)}
              </span>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-8 w-8 p-0 flex-shrink-0 active:scale-95 transition-transform"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}