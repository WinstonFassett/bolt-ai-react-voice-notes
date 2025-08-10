import { createFileRoute } from '@tanstack/react-router'
import { RecordScreen } from '../components/screens/RecordScreen'

export const Route = createFileRoute('/')({
  component: RecordScreen,
})
