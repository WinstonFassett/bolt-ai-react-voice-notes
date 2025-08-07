import { formatDistanceToNow } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { Play, Pause, Trash2, Bot } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/store/appStore'
import type { Note } from '@/stores/notesStore'

interface NoteCardProps {
  note: Note
  level?: number
}

export function NoteCard({ note, level = 0 }: NoteCardProps) {
  const { playAudio, pauseAudio, showDeleteConfirmation, currentPlayingAudioUrl, isPlaying, streamingNotes } = useAppStore()
  const navigate = useNavigate()

  const isCurrentlyPlaying = currentPlayingAudioUrl === note.audioUrl && isPlaying
  const isStreaming = streamingNotes.has(note.id)

  const handleAudioToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    
    // Don't allow audio playback while recording
    const { isRecording } = useAppStore.getState()
    if (isRecording) return
    
    if (note.audioUrl) {
      if (isCurrentlyPlaying) {
        pauseAudio()
      } else {
        playAudio(note.audioUrl)
      }
    }
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    showDeleteConfirmation(note.id)
  }

  const truncateContent = (content: string, maxLength: number = 120) => {
    const plainText = content.replace(/[#*`]/g, '').trim()
    return plainText.length > maxLength ? plainText.slice(0, maxLength) + '...' : plainText
  }

  return (
    <Card 
      className={`cursor-pointer hover:bg-accent/50 transition-all duration-200 hover:shadow-md hover:scale-[1.01] 
                 border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm
                 ${note.isAgentOutput ? 'border-l-4 border-l-primary/50' : ''}
                 ${isStreaming ? 'border-primary/50 shadow-sm' : ''}`}
      onClick={() => navigate(`/note/${note.id}`)}
      style={{ marginLeft: `${level * 16}px` }}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {level > 0 && (
              <div className="text-xs text-muted-foreground mb-1">
                {'└─ '.repeat(level)}{note.isAgentOutput ? 'AI Analysis' : 'Child Note'}
              </div>
            )}
            <h3 className="font-medium truncate mb-1 flex items-center gap-2">
              {note.isAgentOutput && <Bot className="h-4 w-4 text-primary" />}
              {note.title}
              {isStreaming && <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />}
            </h3>
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {truncateContent(note.content)}
            </p>
            
            {note.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {note.tags.slice(0, 3).map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {note.tags.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{note.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(note.created), { addSuffix: true })}
              </span>
              
              {note.duration && (
                <span className="text-xs text-muted-foreground">
                  {Math.floor(note.duration / 60)}:{(note.duration % 60).toString().padStart(2, '0')}
                </span>
              )}
              
              {note.childNotes.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {note.childNotes.length} child note{note.childNotes.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            {note.audioUrl && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAudioToggle}
                className={`h-8 w-8 p-0 ${useAppStore.getState().isRecording ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={useAppStore.getState().isRecording}
              >
                {isCurrentlyPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}