import { useState, useEffect, useRef } from 'react'
import { Play, Pause, X, Volume2, VolumeX } from 'lucide-react'
import { useAudioStore } from '../../stores/audioStore'
import { formatTime } from '../../utils/formatTime'

export function PersistentAudioPlayer() {
  const { 
    currentPlayingAudioUrl, 
    globalIsPlaying, 
    togglePlayPause, 
    closePlayer,
    seekAudio,
    setGlobalAudioCurrentTime,
    setGlobalAudioDuration,
    globalAudioCurrentTime,
    globalAudioDuration
  } = useAudioStore()
  
  const [isMuted, setIsMuted] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  
  useEffect(() => {
    if (!audioRef.current) return
    
    if (globalIsPlaying) {
      audioRef.current.play().catch(err => {
        console.error('Error playing audio:', err)
        togglePlayPause()
      })
    } else {
      audioRef.current.pause()
    }
  }, [globalIsPlaying, togglePlayPause])
  
  useEffect(() => {
    if (!audioRef.current) return
    audioRef.current.muted = isMuted
  }, [isMuted])
  
  const handleTimeUpdate = () => {
    if (!audioRef.current) return
    setGlobalAudioCurrentTime(audioRef.current.currentTime)
  }
  
  const handleLoadedMetadata = () => {
    if (!audioRef.current) return
    setGlobalAudioDuration(audioRef.current.duration)
  }
  
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value)
    seekAudio(newTime)
  }
  
  const handleEnded = () => {
    closePlayer()
  }
  
  if (!currentPlayingAudioUrl) return null
  
  return (
    <div className="fixed bottom-16 left-0 right-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t border-border p-3">
      <audio
        ref={audioRef}
        src={currentPlayingAudioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        hidden
      />
      
      <div className="flex items-center gap-3">
        <button
          onClick={togglePlayPause}
          className="flex-shrink-0 h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
        >
          {globalIsPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5 ml-0.5" />
          )}
        </button>
        
        <div className="flex-1">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>{formatTime(globalAudioCurrentTime)}</span>
            <span>{formatTime(globalAudioDuration)}</span>
          </div>
          
          <input
            type="range"
            min="0"
            max={globalAudioDuration || 0}
            value={globalAudioCurrentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-secondary rounded-full appearance-none cursor-pointer"
            style={{
              backgroundImage: `linear-gradient(to right, var(--primary) ${(globalAudioCurrentTime / (globalAudioDuration || 1)) * 100}%, var(--secondary) ${(globalAudioCurrentTime / (globalAudioDuration || 1)) * 100}%)`,
            }}
          />
        </div>
        
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        >
          {isMuted ? (
            <VolumeX className="h-5 w-5" />
          ) : (
            <Volume2 className="h-5 w-5" />
          )}
        </button>
        
        <button
          onClick={closePlayer}
          className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
