import { useNavigate } from '@tanstack/react-router';
import { Route } from '../../routes/note.$id';
import { useNotesStore } from '../../stores/notesStore';
import { NoteDetailScreen } from './NoteDetailScreen';
import { Button } from '../../components/ui/button';

export function NoteDetailScreenWrapper() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { notes } = useNotesStore();
  
  // Find the note by id
  const note = notes.find(n => n.id === id);
  
  // If note is not found, redirect to library
  if (!note) {
    // We could redirect here, but it's better to render a fallback UI
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <h2 className="text-xl font-bold mb-4">Note not found</h2>
        <Button 
          variant="default"
          onClick={() => navigate({ to: '/library' })}
        >
          Back to Library
        </Button>
      </div>
    );
  }
  
  // Handle back navigation
  const handleBack = () => {
    navigate({ to: '/library' });
  };
  
  // Handle tab change (not actually used in the redesign)
  const handleTabChange = () => {
    // No-op in the redesign
  };
  
  return (
    <NoteDetailScreen 
      key={note.id}
      note={note}
      onBack={handleBack}
      activeTab="library"
      onTabChange={handleTabChange}
    />
  );
}

