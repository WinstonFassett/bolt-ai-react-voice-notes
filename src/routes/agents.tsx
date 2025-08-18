import { createFileRoute } from '@tanstack/react-router'
import { AgentsScreen } from '../components/screens/AgentsScreen'

export const Route = createFileRoute('/agents')({
  component: AgentsScreen,
})
