export interface Note {
  id: string
  title: string
  content: string
  audioUrl?: string
  duration?: number
  created: string
  updated: string
  tags: string[]
  parentId?: string
  childNotes: Note[]
  isAgentOutput?: boolean
  agentId?: string
  agentName?: string
}

export interface Agent {
  id: string
  name: string
  description: string
  prompt: string
  model: string
  provider: string
  autoRun: boolean
  isBuiltIn?: boolean
}

export interface LLMProvider {
  id: string
  name: string
  models: string[]
  apiKey?: string
  baseUrl?: string
}