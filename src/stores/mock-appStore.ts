import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { Note, Agent, LLMProvider } from './mock-types'
import { builtInAgents, defaultLLMProviders, sampleNotes } from './mock-staticData'

export interface AppState {
  // Recording state
  isRecording: boolean
  isPaused: boolean
  recordingTime: number
  mediaRecorder: MediaRecorder | null
  audioChunks: Blob[]
  
  // Transcription state
  isTranscribing: boolean
  transcriptionProgress: number
  transcriptionStatus: string
  
  // Agent processing state
  isProcessingAgents: boolean
  agentProcessingStatus: string
  currentProcessingAgents: string[]
  completedAgents: string[]
  
  // Audio playback state
  currentPlayingAudioUrl?: string
  isPlaying: boolean
  audioDuration: number
  audioCurrentTime: number
  audioElement: HTMLAudioElement | null
  
  // Data
  notes: Note[]
  agents: Agent[]
  builtInAgents: Agent[]
  llmProviders: LLMProvider[]
  
  // UI state
  searchQuery: string
  filteredNotes: Note[]
  streamingNotes: Set<string>
  theme: 'light' | 'dark' | 'system'
  showDeleteConfirmationNoteId?: string
  showAgentEditorAgent?: Agent
  
  // Actions
  startRecording: () => void
  pauseRecording: () => void
  resumeRecording: () => void
  stopRecording: () => void
  cancelRecording: () => void
  
  // Transcription actions
  startTranscription: (audioBlob: Blob, noteId: string) => void
  updateTranscriptionProgress: (progress: number, status: string) => void
  completeTranscription: (noteId: string, transcription: string) => void
  
  // Agent actions
  processAgents: (noteId: string, transcription: string) => void
  updateAgentOutput: (noteId: string, agentId: string, content: string, isStreaming: boolean) => void
  completeAgentOutput: (noteId: string, agentId: string, content: string) => void
  
  // Audio actions
  playAudio: (url: string) => void
  pauseAudio: () => void
  seekAudio: (time: number) => void
  
  // Note actions
  addNote: (note: Omit<Note, 'id' | 'created' | 'updated'>) => string
  updateNote: (id: string, updates: Partial<Note>) => void
  deleteNote: (id: string) => void
  searchNotes: (query: string) => void
  addChildNote: (parentId: string, note: Omit<Note, 'id' | 'created' | 'updated' | 'parentId' | 'childNotes'>) => string
  findNoteById: (id: string) => Note | undefined
  getNextNote: (currentId: string) => Note | undefined
  getPreviousNote: (currentId: string) => Note | undefined
  
  // Agent management
  addAgent: (agent: Omit<Agent, 'id'>) => void
  updateAgent: (id: string, updates: Partial<Agent>) => void
  deleteAgent: (id: string) => void
  showAgentEditor: (agent?: Agent) => void
  hideAgentEditor: () => void
  
  // UI actions
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  showDeleteConfirmation: (noteId: string) => void
  hideDeleteConfirmation: () => void
  
  // Initialization
  initializeSampleData: () => void
}

export const useAppStore = create<AppState>()(
  immer((set, get) => ({
    // Initial state
    isRecording: false,
    isPaused: false,
    recordingTime: 0,
    mediaRecorder: null,
    audioChunks: [],
    
    isTranscribing: false,
    transcriptionProgress: 0,
    transcriptionStatus: 'Preparing transcription...',
    
    isProcessingAgents: false,
    agentProcessingStatus: 'Processing with AI agents...',
    currentProcessingAgents: [],
    completedAgents: [],
    
    currentPlayingAudioUrl: undefined,
    isPlaying: false,
    audioDuration: 0,
    audioCurrentTime: 0,
    audioElement: null,
    
    notes: [],
    agents: [],
    builtInAgents,
    llmProviders: defaultLLMProviders,
    
    searchQuery: '',
    filteredNotes: [],
    streamingNotes: new Set(),
    theme: 'system',
    showDeleteConfirmationNoteId: undefined,
    showAgentEditorAgent: undefined,
    
    // Recording actions
    startRecording: () => {
      // Stop any playing audio when starting to record
      const { audioElement } = get()
      if (audioElement) {
        audioElement.pause()
        audioElement.currentTime = 0
      }
      
      set((state) => {
        state.isRecording = true
        state.isPaused = false
        state.recordingTime = 0
        state.audioChunks = []
        state.currentPlayingAudioUrl = undefined
        state.isPlaying = false
        state.audioElement = null
      })
      
      // Start recording timer
      const timer = setInterval(() => {
        const { isRecording, isPaused } = get()
        if (!isRecording) {
          clearInterval(timer)
          return
        }
        if (!isPaused) {
          set((state) => {
            state.recordingTime += 1
          })
        }
      }, 1000)
      
      // Start media recording
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then((stream) => {
          const mediaRecorder = new MediaRecorder(stream)
          const audioChunks: Blob[] = []
          
          mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data)
          }
          
          mediaRecorder.start()
          
          set((state) => {
            state.mediaRecorder = mediaRecorder
            state.audioChunks = audioChunks
          })
        })
        .catch((error) => {
          console.error('Error accessing microphone:', error)
          set((state) => {
            state.isRecording = false
          })
        })
    },
    
    pauseRecording: () => {
      set((state) => {
        state.isPaused = true
      })
      
      const { mediaRecorder } = get()
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.pause()
      }
    },
    
    resumeRecording: () => {
      set((state) => {
        state.isPaused = false
      })
      
      const { mediaRecorder } = get()
      if (mediaRecorder && mediaRecorder.state === 'paused') {
        mediaRecorder.resume()
      }
    },
    
    stopRecording: () => {
      const { mediaRecorder, audioChunks, recordingTime } = get()
      
      if (mediaRecorder) {
        mediaRecorder.stop()
        mediaRecorder.stream.getTracks().forEach(track => track.stop())
        
        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/wav' })
          const audioUrl = URL.createObjectURL(audioBlob)
          
          // Create new note immediately
          const noteId = get().addNote({
            title: 'New Voice Note',
            content: '',
            audioUrl,
            duration: recordingTime,
            tags: [],
            agentOutputs: []
          })
          
          // Navigate immediately to note editor
          if ((window as any).navigate) {
            (window as any).navigate(`/note/${noteId}`)
          }
          
          // Start transcription after navigation
          setTimeout(() => {
            get().startTranscription(audioBlob, noteId)
          }, 100)
        }
      }
      
      set((state) => {
        state.isRecording = false
        state.isPaused = false
        state.recordingTime = 0
        state.mediaRecorder = null
        state.audioChunks = []
      })
    },
    
    cancelRecording: () => {
      const { mediaRecorder } = get()
      
      if (mediaRecorder) {
        mediaRecorder.stop()
        mediaRecorder.stream.getTracks().forEach(track => track.stop())
      }
      
      set((state) => {
        state.isRecording = false
        state.isPaused = false
        state.recordingTime = 0
        state.mediaRecorder = null
        state.audioChunks.length = 0
      })
    },
    
    // Transcription actions
    startTranscription: (audioBlob: Blob, noteId: string) => {
      set((state) => {
        state.isTranscribing = true
        state.transcriptionProgress = 0
        state.transcriptionStatus = 'Preparing transcription...'
      })
      
      // Simulate transcription progress
      const progressInterval = setInterval(() => {
        const { transcriptionProgress } = get()
        if (transcriptionProgress >= 100) {
          const mockTranscription = "This is a mock transcription of your voice note. In a real implementation, this would be the actual transcribed text from your audio recording using a service like OpenAI Whisper or similar speech-to-text API."
          get().completeTranscription(noteId, mockTranscription)
        }
        
        set((state) => {
          state.transcriptionProgress = Math.min(100, state.transcriptionProgress + Math.random() * 15)
          if (state.transcriptionProgress < 30) {
            state.transcriptionStatus = 'Processing audio...'
          } else if (state.transcriptionProgress < 70) {
            state.transcriptionStatus = 'Converting speech to text...'
          } else {
            state.transcriptionStatus = 'Finalizing transcription...'
          }
        })
      }, 500)
      
      // Simulate transcription completion
      setTimeout(() => {
        clearInterval(progressInterval)
        const mockTranscription = "This is a mock transcription of your voice note. In a real implementation, this would be the actual transcribed text from your audio recording using a service like OpenAI Whisper or similar speech-to-text API."
        get().completeTranscription(noteId, mockTranscription)
      }, 3000)
    },
    
    updateTranscriptionProgress: (progress: number, status: string) => {
      set((state) => {
        state.transcriptionProgress = progress
        state.transcriptionStatus = status
      })
    },
    
    completeTranscription: (noteId: string, transcription: string) => {
      // Generate title from transcription
      const title = transcription.split(' ').slice(0, 6).join(' ') + '...'
      
      set((state) => {
        state.isTranscribing = false
        state.transcriptionProgress = 100
        state.transcriptionStatus = 'Transcription complete'
        
        const note = state.notes.find(n => n.id === noteId)
        if (note) {
          note.content = transcription
          note.title = title
          note.updated = new Date().toISOString()
        }
      })
      
      // Start agent processing
      get().processAgents(noteId, transcription)
    },
    
    // Agent processing actions
    processAgents: (noteId: string, transcription: string) => {
      const { builtInAgents } = get()
      const autoRunAgents = builtInAgents.filter(agent => agent.autoRun)
      
      if (autoRunAgents.length === 0) return
      
      set((state) => {
        state.isProcessingAgents = true
        state.agentProcessingStatus = 'Processing with AI agents...'
        state.currentProcessingAgents = []
        state.completedAgents = []
      })
      
      // Process agents sequentially
      const processNextAgent = (index: number) => {
        if (index >= autoRunAgents.length) {
          set((state) => {
            state.isProcessingAgents = false
            state.agentProcessingStatus = 'Agent processing complete'
            state.currentProcessingAgents = []
          })
          return
        }
        
        const agent = autoRunAgents[index]
        
        set((state) => {
          state.currentProcessingAgents = [agent.id]
          state.agentProcessingStatus = `Processing with ${agent.name}...`
        })
        
        // Create child note for agent output
        const childNoteId = get().addChildNote(noteId, {
          title: `${agent.name} Analysis`,
          content: '',
          tags: ['ai-generated', agent.id],
          isAgentOutput: true,
          agentId: agent.id,
          agentName: agent.name
        })
        
        // Mark as streaming
        set((state) => {
          state.streamingNotes.add(childNoteId)
        })
        
        // Simulate streaming response
        const mockResponse = `## ${agent.name} Output\n\nThis is a mock response from the ${agent.name} agent. In a real implementation, this would be the actual AI-generated content based on the transcription.\n\n- Key point 1\n- Key point 2\n- Key point 3`
        
        let currentContent = ''
        const words = mockResponse.split(' ')
        let wordIndex = 0
        
        const streamInterval = setInterval(() => {
          if (wordIndex >= words.length) {
            clearInterval(streamInterval)
            get().completeAgentOutput(childNoteId, agent.id, mockResponse)
            
            set((state) => {
              state.completedAgents.push(agent.id)
              state.currentProcessingAgents = []
            })
            
            // Process next agent
            setTimeout(() => processNextAgent(index + 1), 500)
            return
          }
          
          currentContent += (wordIndex === 0 ? '' : ' ') + words[wordIndex]
          wordIndex++
          
          get().updateAgentOutput(childNoteId, agent.id, currentContent, true)
        }, 100)
      }
      
      processNextAgent(0)
    },
    
    updateAgentOutput: (childNoteId: string, agentId: string, content: string, isStreaming: boolean) => {
      set((state) => {
        // Find the child note and update its content
        const findAndUpdateNote = (notes: Note[]): boolean => {
          for (const note of notes) {
            if (note.id === childNoteId) {
              note.content = content
              note.updated = new Date().toISOString()
              return true
            }
            if (findAndUpdateNote(note.childNotes)) {
              return true
            }
          }
          return false
        }
        
        findAndUpdateNote(state.notes)
      })
    },
    
    completeAgentOutput: (childNoteId: string, agentId: string, content: string) => {
      set((state) => {
        // Find the child note and mark it as complete
        const findAndUpdateNote = (notes: Note[]): boolean => {
          for (const note of notes) {
            if (note.id === childNoteId) {
              note.content = content
              note.updated = new Date().toISOString()
              state.streamingNotes.delete(childNoteId)
              return true
            }
            if (findAndUpdateNote(note.childNotes)) {
              return true
            }
          }
          return false
        }
        
        findAndUpdateNote(state.notes)
      })
    },
    
    // Audio playback actions
    playAudio: (url: string) => {
      const { isRecording } = get()
      
      // Don't allow playback while recording
      if (isRecording) return
      
      const { audioElement, currentPlayingAudioUrl } = get()
      
      if (currentPlayingAudioUrl === url && audioElement) {
        audioElement.play()
        set((state) => {
          state.isPlaying = true
        })
        return
      }
      
      // Stop current audio if playing
      if (audioElement) {
        audioElement.pause()
        audioElement.currentTime = 0
      }
      
      const audio = new Audio(url)
      
      audio.addEventListener('loadedmetadata', () => {
        set((state) => {
          state.audioDuration = audio.duration
        })
      })
      
      audio.addEventListener('timeupdate', () => {
        set((state) => {
          state.audioCurrentTime = audio.currentTime
        })
      })
      
      audio.addEventListener('ended', () => {
        set((state) => {
          state.isPlaying = false
          state.audioCurrentTime = 0
        })
      })
      
      audio.play()
      
      set((state) => {
        state.audioElement = audio
        state.currentPlayingAudioUrl = url
        state.isPlaying = true
        state.audioCurrentTime = 0
      })
    },
    
    pauseAudio: () => {
      const { audioElement } = get()
      if (audioElement) {
        audioElement.pause()
      }
      set((state) => {
        state.isPlaying = false
      })
    },
    
    seekAudio: (time: number) => {
      const { audioElement } = get()
      if (audioElement) {
        audioElement.currentTime = time
        set((state) => {
          state.audioCurrentTime = time
        })
      }
    },
    
    // Note actions
    addNote: (noteData: Omit<Note, 'id' | 'created' | 'updated'>) => {
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 9)
      const now = new Date().toISOString()
      
      const note: Note = {
        ...noteData,
        id,
        created: now,
        updated: now,
        childNotes: []
      }
      
      set((state) => {
        state.notes.unshift(note)
        state.filteredNotes = state.notes
      })
      
      return id
    },
    
    updateNote: (id: string, updates: Partial<Note>) => {
      set((state) => {
        const note = state.notes.find(n => n.id === id)
        if (note) {
          Object.assign(note, updates, { updated: new Date().toISOString() })
        }
        state.filteredNotes = state.notes.filter(note =>
          note.title.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
          note.content.toLowerCase().includes(state.searchQuery.toLowerCase())
        )
      })
    },
    
    deleteNote: (id: string) => {
      set((state) => {
        state.notes = state.notes.filter(n => n.id !== id)
        state.filteredNotes = state.notes.filter(note =>
          note.title.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
          note.content.toLowerCase().includes(state.searchQuery.toLowerCase())
        )
        state.showDeleteConfirmationNoteId = undefined
      })
    },
    
    addChildNote: (parentId: string, noteData: Omit<Note, 'id' | 'created' | 'updated' | 'parentId' | 'childNotes'>) => {
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 9)
      const now = new Date().toISOString()
      
      const childNote: Note = {
        ...noteData,
        id,
        parentId,
        created: now,
        updated: now,
        childNotes: []
      }
      
      set((state) => {
        // Find parent note recursively
        const findAndAddChild = (notes: Note[]): boolean => {
          for (const note of notes) {
            if (note.id === parentId) {
              note.childNotes.push(childNote)
              return true
            }
            if (findAndAddChild(note.childNotes)) {
              return true
            }
          }
          return false
        }
        
        findAndAddChild(state.notes)
      })
      
      return id
    },
    
    findNoteById: (id: string) => {
      const findNote = (notes: Note[]): Note | undefined => {
        for (const note of notes) {
          if (note.id === id) return note
          const found = findNote(note.childNotes)
          if (found) return found
        }
        return undefined
      }
      
      return findNote(get().notes)
    },
    
    getNextNote: (currentId: string) => {
      const { notes } = get()
      const flattenNotes = (noteList: Note[]): Note[] => {
        const result: Note[] = []
        for (const note of noteList) {
          result.push(note)
          result.push(...flattenNotes(note.childNotes))
        }
        return result
      }
      
      const allNotes = flattenNotes(notes)
      const currentIndex = allNotes.findIndex(note => note.id === currentId)
      return currentIndex >= 0 && currentIndex < allNotes.length - 1 
        ? allNotes[currentIndex + 1] 
        : undefined
    },
    
    getPreviousNote: (currentId: string) => {
      const { notes } = get()
      const flattenNotes = (noteList: Note[]): Note[] => {
        const result: Note[] = []
        for (const note of noteList) {
          result.push(note)
          result.push(...flattenNotes(note.childNotes))
        }
        return result
      }
      
      const allNotes = flattenNotes(notes)
      const currentIndex = allNotes.findIndex(note => note.id === currentId)
      return currentIndex > 0 ? allNotes[currentIndex - 1] : undefined
    },
    
    searchNotes: (query: string) => {
      set((state) => {
        state.searchQuery = query
        state.filteredNotes = state.notes.filter(note =>
          note.title.toLowerCase().includes(query.toLowerCase()) ||
          note.content.toLowerCase().includes(query.toLowerCase())
        )
      })
    },
    
    // Agent management
    addAgent: (agentData: Omit<Agent, 'id'>) => {
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 9)
      const agent: Agent = { ...agentData, id }
      
      set((state) => {
        state.agents.push(agent)
      })
    },
    
    updateAgent: (id: string, updates: Partial<Agent>) => {
      set((state) => {
        const agent = state.agents.find(a => a.id === id) || state.builtInAgents.find(a => a.id === id)
        if (agent) {
          Object.assign(agent, updates)
        }
      })
    },
    
    deleteAgent: (id: string) => {
      set((state) => {
        state.agents = state.agents.filter(a => a.id !== id)
      })
    },
    
    showAgentEditor: (agent?: Agent) => {
      set((state) => {
        state.showAgentEditorAgent = agent
      })
    },
    
    hideAgentEditor: () => {
      set((state) => {
        state.showAgentEditorAgent = undefined
      })
    },
    
    // UI actions
    setTheme: (theme: 'light' | 'dark' | 'system') => {
      set((state) => {
        state.theme = theme
      })
    },
    
    showDeleteConfirmation: (noteId: string) => {
      set((state) => {
        state.showDeleteConfirmationNoteId = noteId
      })
    },
    
    hideDeleteConfirmation: () => {
      set((state) => {
        state.showDeleteConfirmationNoteId = undefined
      })
    },
    
    // Initialize sample data
    initializeSampleData: () => {
      const { notes } = get()
      if (notes.length > 0) return // Don't add if data already exists
      
      set((state) => {
        state.notes = sampleNotes
        state.filteredNotes = sampleNotes
      })
      
      // Add some child notes to create a deep hierarchy
      setTimeout(() => {
        const { addChildNote } = get()
        
        // Add child to first note (sample-1)
        const child1Id = addChildNote('sample-1', {
          title: 'Budget Analysis Deep Dive',
          content: `# Budget Analysis Deep Dive

## Q1 Budget Breakdown
- Engineering: 40% ($200k)
- Marketing: 30% ($150k) 
- Operations: 20% ($100k)
- Contingency: 10% ($50k)

## Key Insights
Engineering budget increase needed for new hires.
Marketing spend should focus on digital channels.`,
          tags: ['budget', 'analysis', 'finance'],
        })
        
        // Add child to the child (creating 0.1.1 level)
        setTimeout(() => {
          addChildNote(child1Id, {
            title: 'Engineering Budget Justification',
            content: `# Engineering Budget Justification

## Why We Need More Engineering Budget

### Current Team Capacity
- 5 senior engineers at 100% capacity
- 2 junior engineers ramping up
- Backlog growing faster than delivery

### Proposed Additions
- 2 senior full-stack engineers
- 1 DevOps specialist
- 1 QA engineer

### ROI Analysis
Additional $120k investment could increase delivery by 60%.`,
            tags: ['engineering', 'budget', 'hiring'],
          })
        }, 100)
        
        // Add another child to first note
        setTimeout(() => {
          addChildNote('sample-1', {
            title: 'Marketing Strategy Details',
            content: `# Marketing Strategy Details

## Digital Marketing Focus
- SEO optimization: $30k
- Paid advertising: $80k
- Content creation: $40k

## Expected Outcomes
- 50% increase in qualified leads
- 25% improvement in conversion rate
- Brand awareness growth of 40%`,
            tags: ['marketing', 'strategy', 'digital'],
          })
        }, 200)
        
        // Add some AI-generated child notes to demonstrate the structure
        setTimeout(() => {
          const summaryId = addChildNote('sample-1', {
            title: 'Summarizer Analysis',
            content: '## Summary\n\nQ1 planning meeting focused on budget allocation, team expansion, and marketing strategy. Key deliverables include finalizing budget, scheduling interviews, and reviewing marketing metrics.',
            tags: ['ai-generated', 'summarizer'],
            isAgentOutput: true,
            agentId: 'summarizer',
            agentName: 'Summarizer'
          })
          
          addChildNote('sample-1', {
            title: 'Action Items Analysis',
            content: '## Action Items\n\n1. **Finalize budget** - Due: End of week\n2. **Schedule interviews** - For new team positions\n3. **Review marketing metrics** - Analyze current performance\n4. **Follow up with stakeholders** - Get budget approval',
            tags: ['ai-generated', 'action-items'],
            isAgentOutput: true,
            agentId: 'action-items',
            agentName: 'Action Items'
          })
        }, 300)
      }, 300)
    }
  }))
)