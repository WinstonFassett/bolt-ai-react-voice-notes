import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Play, Pause, Edit3, Save, X, Trash2, ChevronLeft, ChevronRight, Plus, FileText, Bot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AppHeader } from '@/components/Layout/AppHeader'
import { MarkdownEditor } from '@/components/Notes/MarkdownEditor'
import { TranscriptionProgress } from '@/components/Recording/TranscriptionProgress'
import { useAppStore } from '@/store/appStore'

export function NoteDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { 
    notes, 
    updateNote, 
    showDeleteConfirmation,
    playAudio,
    pauseAudio,
    currentPlayingAudioUrl,
    isPlaying,
    findNoteById,
    getNextNote,
    getPreviousNote,
    addChildNote
  } = useAppStore()
  
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  
  const note = findNoteById(id!)
  const nextNote = getNextNote(id!)
  const previousNote = getPreviousNote(id!)
  
  useEffect(() => {
    if (note) {
      setEditTitle(note.title)
      setEditContent(note.content)
    }
  }, [note])
  
  if (!note) {
    return (
      <div className="h-full flex flex-col">
        <AppHeader title="Note Not Found" showBack />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Note not found</h2>
            <p className="text-muted-foreground mb-4">
              The note you're looking for doesn't exist.
            </p>
            <Button onClick={() => navigate('/library')}>
              Back to Library
            </Button>
          </div>
        </div>
      </div>
    )
  }
  
  const isCurrentlyPlaying = currentPlayingAudioUrl === note.audioUrl && isPlaying
  
  const handleSave = () => {
    updateNote(note.id, {
      title: editTitle,
      content: editContent
    })
    setIsEditing(false)
  }
  
  const handleCancel = () => {
    setEditTitle(note.title)
    setEditContent(note.content)
    setIsEditing(false)
  }
  
  const handleAudioToggle = () => {
    if (note.audioUrl) {
      if (isCurrentlyPlaying) {
        pauseAudio()
      } else {
        playAudio(note.audioUrl)
      }
    }
  }
  
  const handleCreateChildNote = () => {
    if (!note) return
    
    const childId = addChildNote(note.id, {
      title: 'New Child Note',
      content: '',
      tags: [],
      agentOutputs: []
    })
    
    navigate(`/note/${childId}`)
  }
  
  const handleNavigateNext = () => {
    if (nextNote) {
      navigate(`/note/${nextNote.id}`)
    }
  }
  
  const handleNavigatePrevious = () => {
    if (previousNote) {
      navigate(`/note/${previousNote.id}`)
    }
  }
  
  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto">
      <AppHeader 
        title={isEditing ? "Edit Note" : "Note Details"}
        showBack
        actions={
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button size="sm" variant="ghost" onClick={handleCancel}>
                  <X className="h-4 w-4" />
                </Button>
                <Button size="sm" onClick={handleSave}>
                  <Save className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                {previousNote && (
                  <Button size="sm" variant="ghost" onClick={handleNavigatePrevious}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                )}
                {nextNote && (
                  <Button size="sm" variant="ghost" onClick={handleNavigateNext}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
                {note.audioUrl && (
                  <Button size="sm" variant="ghost" onClick={handleAudioToggle}>
                    {isCurrentlyPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={handleCreateChildNote}>
                  <Plus className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>
                  <Edit3 className="h-4 w-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => showDeleteConfirmation(note.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        }
      />
      
      <div className="flex-1 overflow-auto">
        <div className="p-4 space-y-6">
          {/* Breadcrumb */}
          {note.parentId && (
            <div className="text-sm text-muted-foreground">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate(`/note/${note.parentId}`)}
                className="h-auto p-0 text-muted-foreground hover:text-foreground"
              >
                ← Back to parent note
              </Button>
            </div>
          )}
          
          {isEditing ? (
            <div className="space-y-4">
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Note title..."
                className="text-lg font-semibold"
              />
              <MarkdownEditor
                value={editContent}
                onChange={setEditContent}
                placeholder="Start typing your note content..."
              />
            </div>
          ) : (
            <div className="space-y-4">
              <h1 className="text-2xl font-bold">{note.title}</h1>
              {note.content && (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {note.content}
                </div>
              )}
            </div>
          )}
          
          {/* Child Notes - All sub-notes including AI outputs */}
          {note.childNotes.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Notes</h2>
              <div className="grid gap-3">
                {note.childNotes
                  .slice()
                  .sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime())
                  .map((childNote) => (
                  <Card 
                    key={childNote.id}
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => navigate(`/note/${childNote.id}`)}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        {childNote.isAgentOutput ? (
                          <Bot className="h-4 w-4 text-primary" />
                        ) : (
                          <FileText className="h-4 w-4" />
                        )}
                        {childNote.title}
                        {childNote.isAgentOutput && (
                          <span className="text-xs text-muted-foreground ml-auto">
                            by {childNote.agentName}
                          </span>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {childNote.content.replace(/[#*`]/g, '').trim().slice(0, 120)}...
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
          
          <TranscriptionProgress />
        </div>
      </div>
    </div>
  )
}