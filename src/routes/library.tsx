import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { LibraryScreen } from '../components/screens/LibraryScreen'

export const Route = createFileRoute('/library')({
  validateSearch: z.object({
    q: z.string().optional(),
  }),
  component: () => <LibraryScreen 
    onUploadFile={() => console.log('Upload file')} 
    onFromUrl={() => console.log('From URL')} 
  />,
});
