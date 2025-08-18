import type { Agent, LLMProvider, Note } from './types'

export const builtInAgents: Agent[] = [
  {
    id: 'summarizer',
    name: 'Summarizer',
    description: 'Creates concise summaries of your voice notes',
    prompt: 'Please provide a concise summary of the following transcription, highlighting the key points and main ideas:',
    model: 'gpt-4',
    provider: 'openai',
    autoRun: true,
    isBuiltIn: true
  },
  {
    id: 'action-items',
    name: 'Action Items',
    description: 'Extracts actionable tasks and to-dos from your notes',
    prompt: 'Please identify and list any action items, tasks, or to-dos mentioned in the following transcription. Format them as a clear, actionable list:',
    model: 'gpt-4',
    provider: 'openai',
    autoRun: true,
    isBuiltIn: true
  },
  {
    id: 'key-insights',
    name: 'Key Insights',
    description: 'Identifies important insights and takeaways',
    prompt: 'Please identify the key insights, important points, and main takeaways from the following transcription:',
    model: 'gpt-4',
    provider: 'openai',
    autoRun: false,
    isBuiltIn: true
  }
]

export const defaultLLMProviders: LLMProvider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo']
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku']
  }
]

export const sampleNotes: Note[] = [
  {
    id: 'sample-1',
    title: 'Meeting Notes - Q1 Planning',
    content: `# Q1 Planning Meeting Notes

## Key Discussion Points
- Budget allocation for new projects
- Team expansion plans
- Marketing strategy review

## Action Items
- [ ] Finalize budget by end of week
- [ ] Schedule interviews for new positions
- [ ] Review marketing metrics

## Next Steps
Follow up with stakeholders on budget approval.`,
    audioUrl: undefined,
    duration: 180,
    created: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updated: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ['meeting', 'planning', 'work'],
    childNotes: []
  },
  {
    id: 'sample-2',
    title: 'Project Ideas Brainstorm',
    content: `# Project Ideas Brainstorm Session

## Mobile App Ideas
- Voice note taking app with AI transcription
- Habit tracking with social features
- Local business discovery platform

## Web Platform Ideas
- Collaborative workspace for remote teams
- Learning management system
- E-commerce analytics dashboard

## Thoughts
The voice note app seems most promising - there's a real need for better mobile note-taking experiences.`,
    audioUrl: undefined,
    duration: 240,
    created: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ['brainstorm', 'ideas', 'projects'],
    childNotes: []
  },
  {
    id: 'sample-3',
    title: 'Daily Reflection',
    content: `# Daily Reflection - Today's Wins

## What Went Well
- Completed the user interface mockups
- Had a productive team standup
- Made progress on the authentication system

## Challenges
- Database migration took longer than expected
- Need to refactor the API endpoints

## Tomorrow's Focus
- Finish the authentication flow
- Review pull requests
- Plan the next sprint`,
    audioUrl: undefined,
    duration: 120,
    created: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updated: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ['reflection', 'daily', 'personal'],
    childNotes: []
  }
]