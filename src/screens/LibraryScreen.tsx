import { useState } from 'react'
import { Plus, Search, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AppHeader } from '@/components/Layout/AppHeader'
import { NoteCard } from '@/components/Notes/NoteCard'
import { useAppStore } from '@/store/appStore'

export function LibraryScreen() {
  const { notes, searchQuery, searchNotes } = useAppStore()
  const [showFilters, setShowFilters] = useState(false)

  // Filter notes to only show top-level notes (no parent)
  const topLevelNotes = notes.filter(note => !note.parentId)
  
  // Apply search filter
  const filteredNotes = searchQuery 
    ? topLevelNotes.filter(note =>
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : topLevelNotes

  const renderNoteWithChildren = (note: any, level = 0) => {
    return (
      <div key={note.id}>
        <NoteCard note={note} level={level} />
        {note.childNotes.map((child: any) => renderNoteWithChildren(child, level + 1))}
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto">
      <AppHeader 
        title="Library" 
        actions={
          <Button size="sm" onClick={() => window.location.href = '/'}>
            <Plus className="h-4 w-4 mr-2" />
            New Note
          </Button>
        }
      />
      
      <div className="flex-1 overflow-auto">
        <div className="p-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => searchNotes(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Notes List */}
          <div className="space-y-3">
            {filteredNotes.length > 0 ? (
              filteredNotes.map(note => renderNoteWithChildren(note))
            ) : (
              <div className="text-center py-12">
                <div className="text-muted-foreground mb-4">
                  {searchQuery ? 'No notes match your search' : 'No notes yet'}
                </div>
                <Button onClick={() => window.location.href = '/'}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create your first note
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}