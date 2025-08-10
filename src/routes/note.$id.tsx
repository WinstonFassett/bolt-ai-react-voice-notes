import { createFileRoute } from '@tanstack/react-router'
import { NoteDetailScreenWrapper } from '../components/screens/NoteDetailScreenWrapper'

export const Route = createFileRoute('/note/$id')({
  component: NoteDetailScreenWrapper,
})
