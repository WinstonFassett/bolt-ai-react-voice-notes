import { useParams, useNavigate } from 'react-router-dom';
import { useNotesStore } from '../../stores/notesStore';
import { NoteDetailScreen } from './NoteDetailScreen';

export function NoteDetailScreenWrapper() {
  const { id } = useParams<{ id: string }>();
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
        <button 
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
          onClick={() => navigate('/library')}
        >
          Back to Library
        </button>
      </div>
    );
  }
  
  // Handle back navigation
  const handleBack = () => {
    navigate('/library');
  };
  
  // Handle tab change (not actually used in the redesign)
  const handleTabChange = () => {
    // No-op in the redesign
  };
  
  return (
    <NoteDetailScreen 
      note={note}
      onBack={handleBack}
      activeTab="library"
      onTabChange={handleTabChange}
    />
  );
}
