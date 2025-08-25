import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useLLMProvidersStore } from './llmProvidersStore';
import { useNotesStore } from './notesStore';
import { generateSmartTitle } from '../utils/titleGenerator';

interface Agent {
  id: string;
  name: string;
  prompt: string;
  modelId: string; // Format: "providerId-modelId"
  avatar?: string;
  autoRun: boolean;
  tags: string[];
  outputFormat: 'markdown' | 'text' | 'json';
  isBuiltIn: boolean;
  createdAt: number;
  updatedAt: number;
}

interface AgentProcessingResult {
  success: boolean;
  agentDocumentId?: string;
  error?: string;
}

interface AgentsState {
  agents: Agent[];
  builtInAgents: Agent[];
  isProcessing: boolean;
  processingStatus: string;
  lastProcessingError: string | null;
  
  // Core CRUD
  addAgent: (agent: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateAgent: (agent: Agent) => void;
  deleteAgent: (id: string) => void;
  toggleAgentAutoRun: (id: string) => void;
  
  // Smart getters with defensive checks
  getAvailableAgents: () => Agent[];
  getAutoRunAgents: () => Agent[];
  canRunAgent: (agentId: string) => { canRun: boolean; reason?: string };
  canRunAnyAgents: () => boolean;
  
  // Processing workflow
  processNoteWithAgent: (noteId: string, agentId: string) => Promise<AgentProcessingResult>;
  processNoteWithAllAutoAgents: (noteId: string) => Promise<void>;
  
  // Initialization
  initializeBuiltInAgents: () => void;
  
  // Health checks
  validateAgentDependencies: () => { valid: boolean; issues: string[] };
}

// Built-in agent definitions
const BUILT_IN_AGENTS: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Meeting Summarizer',
    prompt: `Analyze this meeting transcript and create a concise summary including:

- **Main Topics Discussed**: Key subjects covered
- **Key Decisions Made**: Important decisions and outcomes
- **Action Items**: Tasks assigned with owners (if mentioned)
- **Next Steps**: Follow-up actions identified

Format as clear markdown with sections. Be concise but comprehensive.`,
    modelId: '', // Will be set to default model
    avatar: '📝',
    autoRun: true,
    tags: ['summary', 'meeting'],
    outputFormat: 'markdown',
    isBuiltIn: true
  },
  {
    name: "Action item Extractor",
    prompt: `You are a task extraction bot. Your ONLY job is to find tasks and format them as markdown checkboxes.
CRITICAL: You MUST use this EXACT format for EVERY task:
- Task description
3. Keep tasks short and actionable
RULES:
1. Start each line with "- " (dash, space, square brackets, space)
2. One task per line
3. Keep tasks short and actionable
4. Add *(deadline)* at the end if mentioned
5. Add **[URGENT]** at the end if urgent
3. Keep tasks short and actionable
EXAMPLE OUTPUT:
- Call John about the project *(by Friday)*
- Finish quarterly report **[URGENT]**
- Schedule team meeting`,
    modelId: '',
    avatar: '📋',

    autoRun: true,
    tags: ['tasks', 'action-items'],
    outputFormat: 'markdown',
    isBuiltIn: true
  },
  {
    name: 'Key Insights Generator',
    prompt: `# Key Insights & Ideas

Identify the most important insights, ideas, and concepts from this content.

Focus on:
- **Novel Ideas**: New or creative thoughts
- **Important Realizations**: Key understanding or breakthroughs
- **Strategic Insights**: High-level observations
- **Patterns**: Recurring themes or connections

Present as bullet points with brief explanations. Aim for 3-5 key insights.`,
    modelId: '',
    avatar: '💡',
    autoRun: true,
    tags: ['insights', 'analysis'],
    outputFormat: 'markdown',
    isBuiltIn: true
  },
  {
    name: 'Reframing Helper',
    prompt: `# Positive Reframing & Opportunities

Help reframe any problems, challenges, or negative thoughts mentioned in this content.

Provide:
- **Alternative Perspectives**: Different ways to view the situation
- **Potential Opportunities**: Hidden benefits or growth possibilities
- **Constructive Approaches**: Solution-focused strategies
- **Positive Reframes**: Encouraging ways to think about challenges

Use an encouraging and solution-focused tone. If no challenges are mentioned, focus on growth opportunities.`,
    modelId: '',
    avatar: '🎯',
    autoRun: true,
    tags: ['reframing', 'mindset'],
    outputFormat: 'markdown',
    isBuiltIn: true
  }
];

// Helper function to extract title from agent response
function extractTitleFromAgentResponse(agentName: string, content: string): string {
  const lines = content.split('\n').filter(line => line.trim());
  
  // Look for markdown headers first
  const headerLine = lines.find(line => line.match(/^#+\s+(.+)/));
  if (headerLine) {
    const title = headerLine.replace(/^#+\s+/, '').trim();
    // Remove common prefixes and clean up
    const cleanTitle = title
      .replace(/^(Action Items?|Tasks?|Key Insights?|Ideas?|Reframing|Summary|Meeting|Notes?)\s*[:\-]?\s*/i, '')
      .trim();
    
    if (cleanTitle.length > 5 && cleanTitle.length < 80) {
      return cleanTitle;
    } else if (title.length > 5 && title.length < 80) {
      return title;
    }
  }
  
  // Look for first meaningful line that's not a header or list item
  const firstMeaningfulLine = lines.find(line => {
    const cleaned = line.replace(/^[#*\-\d\.\s\*]+/, '').trim();
    return cleaned.length > 10 && 
           cleaned.length < 80 && 
           !cleaned.includes('**') && 
           !line.match(/^#+/) &&
           !line.match(/^\d+\./) &&
           !line.match(/^[-*]/);
  });
  
  if (firstMeaningfulLine) {
    const title = firstMeaningfulLine.replace(/^[#*\-\d\.\s\*]+/, '').trim();
    if (title.length > 5 && title.length < 80) {
      return title;
    }
  }
  
  // Fallback to agent name
  return agentName;
}
export const useAgentsStore = create<AgentsState>()(
  persist(
    (set, get) => ({
      agents: [],
      builtInAgents: [],
      isProcessing: false,
      processingStatus: '',
      lastProcessingError: null,
      
      addAgent: (agentData) => {
        const now = Date.now();
        const newAgent: Agent = {
          ...agentData,
          id: `agent-${now}`,
          createdAt: now,
          updatedAt: now
        };
        
        set((state) => ({
          agents: [...state.agents, newAgent]
        }));
      },
      
      updateAgent: (agent) => set((state) => ({
        agents: state.agents.map(a => 
          a.id === agent.id 
            ? { ...agent, updatedAt: Date.now() }
            : a
        ),
        builtInAgents: state.builtInAgents.map(a =>
          a.id === agent.id
            ? { ...agent, updatedAt: Date.now() }
            : a
        )
      })),
      
      deleteAgent: (id) => {
        const agent = [...get().agents, ...get().builtInAgents].find(a => a.id === id);
        if (agent?.isBuiltIn) {
          console.warn('Cannot delete built-in agent:', id);
          return;
        }
        
        set((state) => ({
          agents: state.agents.filter(a => a.id !== id)
        }));
      },
      
      toggleAgentAutoRun: (id) => {
        const { agents, builtInAgents } = get();
        const allAgents = [...agents, ...builtInAgents];
        const agent = allAgents.find(a => a.id === id);
        
        if (!agent) return;
        
        const updatedAgent = { ...agent, autoRun: !agent.autoRun };
        
        // Update in the correct array
        if (agent.isBuiltIn) {
          set((state) => ({
            builtInAgents: state.builtInAgents.map(a =>
              a.id === id ? updatedAgent : a
            )
          }));
        } else {
          set((state) => ({
            agents: state.agents.map(a =>
              a.id === id ? updatedAgent : a
            )
          }));
        }
      },
      
      // Smart defensive getters
      getAvailableAgents: () => {
        const { agents, builtInAgents } = get();
        const llmStore = useLLMProvidersStore.getState();
        
        if (!llmStore.canRunAgents()) {
          return []; // No valid LLM providers
        }
        
        const availableModels = llmStore.getAvailableModels();
        const availableModelIds = availableModels.map(m => `${m.providerId}-${m.id}`);
        
        return [...agents, ...builtInAgents].filter(agent => {
          // If agent has no model set, it can use default
          if (!agent.modelId) return true;
          // Check if agent's model is available
          return availableModelIds.includes(agent.modelId);
        });
      },
      
      getAutoRunAgents: () => {
        const autoAgents = get().getAvailableAgents().filter(agent => agent.autoRun);
        return autoAgents;
      },
      
      canRunAgent: (agentId) => {
        const llmStore = useLLMProvidersStore.getState();
        
        // Check if we have any valid LLM providers
        if (!llmStore.hasValidProvider()) {
          return { 
            canRun: false, 
            reason: 'No valid LLM providers configured. Please add an API key in Settings.' 
          };
        }
        
        // Check if we have a default model
        if (!llmStore.getDefaultModel()) {
          return { 
            canRun: false, 
            reason: 'No default model selected. Please choose a default model in Settings.' 
          };
        }
        
        // Find the agent
        const { agents, builtInAgents } = get();
        const agent = [...agents, ...builtInAgents].find(a => a.id === agentId);
        
        if (!agent) {
          return { canRun: false, reason: 'Agent not found.' };
        }
        
        // Check if agent's specific model is available (if set)
        if (agent.modelId) {
          const availableModels = llmStore.getAvailableModels();
          const modelExists = availableModels.some(m => `${m.providerId}-${m.id}` === agent.modelId);
          
          if (!modelExists) {
            return { 
              canRun: false, 
              reason: `Agent's model (${agent.modelId}) is not available. Check provider connection.` 
            };
          }
        }
        
        return { canRun: true };
      },
      
      canRunAnyAgents: () => {
        const llmStore = useLLMProvidersStore.getState();
        return llmStore.canRunAgents();
      },
      
      // Processing workflow with defensive checks
      processNoteWithAgent: async (noteId, agentId) => {
        console.log('🤖 AgentsStore: Processing note with agent', { noteId, agentId });
        
        // Defensive check: Can we run this agent?
        const canRun = get().canRunAgent(agentId);
        if (!canRun.canRun) {
          const error = `Cannot run agent: ${canRun.reason}`;
          console.error('🤖 AgentsStore:', error);
          set({ lastProcessingError: error });
          return { success: false, error };
        }
        
        // Get the note
        const notesStore = useNotesStore.getState();
        const note = notesStore.getNoteById(noteId);
        if (!note) {
          const error = 'Note not found';
          console.error('🤖 AgentsStore:', error);
          return { success: false, error };
        }
        
        // Get the agent
        const { agents, builtInAgents } = get();
        const agent = [...agents, ...builtInAgents].find(a => a.id === agentId);
        if (!agent) {
          const error = 'Agent not found';
          console.error('🤖 AgentsStore:', error);
          return { success: false, error };
        }
        
        set({ 
          isProcessing: true, 
          processingStatus: `Running ${agent.name}...`,
          lastProcessingError: null 
        });
        
        try {
          // Get LLM client and model
          const llmStore = useLLMProvidersStore.getState();
          const model = agent.modelId 
            ? llmStore.getAvailableModels().find(m => `${m.providerId}-${m.id}` === agent.modelId)
            : llmStore.getDefaultModel();
            
          if (!model) {
            throw new Error('No model available for agent');
          }
          
          const client = llmStore.createClient(model.providerId);
          if (!client) {
            throw new Error('Failed to create LLM client');
          }
          
          // Prepare content for processing
          const contentToProcess = note.content.replace(/<[^>]*>/g, ''); // Strip HTML
          if (!contentToProcess.trim()) {
            throw new Error('Note has no content to process');
          }
          
          // Call LLM API
          if (import.meta.env.DEV) {
            console.log('🤖 AgentsStore: Calling LLM API', { model: model.id, contentLength: contentToProcess.length });
          }
          
          set({ processingStatus: `Running ${agent.name}...` });
          
          const response = await client.chat.completions.create({
            model: model.id,
            messages: [
              { role: 'system', content: agent.prompt },
              { role: 'user', content: contentToProcess }
            ],
            temperature: 0.7,
            max_tokens: 2000
          });
          
          set({ processingStatus: `Processing ${agent.name} response...` });
          
          const generatedContent = response.choices[0]?.message?.content;
          
          if (import.meta.env.DEV) {
            console.log('🤖 AgentsStore: Generated content:', generatedContent);
          }
          
          if (!generatedContent) {
            throw new Error('No content generated by agent');
          }
          
          // Create agent document
          // Extract title from agent response (first line) or use agent name
          const agentDocumentTitle = extractTitleFromAgentResponse(agent.name, generatedContent);
          
          const now = Date.now();
          
          const agentDocument = {
            id: `agent-doc-${now}`,
            title: agentDocumentTitle,
            content: generatedContent,
            tags: [...agent.tags, 'ai-generated'],
            versions: [],
            created: now,
            lastEdited: now,
            createdAt: now,
            updatedAt: now,
            type: 'agent' as const,
            sourceNoteIds: [noteId],
            agentId: agent.id,
            generatedBy: {
              agentId: agent.id,
              modelUsed: model.id,
              processedAt: now
            }
          };
          
          // Add to notes store
          notesStore.addNote(agentDocument);
          
          // Link back to source note (add takeaway) - use a separate update to avoid race conditions
          setTimeout(() => {
            const currentNote = notesStore.getNoteById(noteId);
            if (currentNote) {
              const updatedSourceNote = {
                ...currentNote,
                takeaways: [...(currentNote.takeaways || []), agentDocument.id]
              };
              notesStore.updateNote(updatedSourceNote);
            }
          }, 100);
          
          if (import.meta.env.DEV) {
            console.log('✅ AgentsStore: Agent processing complete', { 
              agentId, 
              agentDocumentId: agentDocument.id 
            });
          }
          
          return { 
            success: true, 
            agentDocumentId: agentDocument.id 
          };
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error('❌ AgentsStore: Agent processing failed:', error);
          set({ lastProcessingError: errorMessage });
          return { success: false, error: errorMessage };
        } finally {
          set({ 
            isProcessing: false, 
            processingStatus: '' 
          });
        }
      },
      
      processNoteWithAllAutoAgents: async (noteId) => {
        const autoAgents = get().getAutoRunAgents();
        
        if (autoAgents.length === 0) {
          if (import.meta.env.DEV) {
            console.log('🤖 AgentsStore: No auto-run agents available', {
              totalAgents: [...get().agents, ...get().builtInAgents].length,
              autoAgentsCount: autoAgents.length
            });
          }
          return;
        }
        
        if (import.meta.env.DEV) {
          console.log('🤖 AgentsStore: Processing note with auto agents', { 
            noteId, 
            agentCount: autoAgents.length,
            agentNames: autoAgents.map(a => a.name)
          });
        }
        
        set({ 
          isProcessing: true, 
          processingStatus: `Running ${autoAgents.length} auto-run agents...` 
        });
        
        // Process agents sequentially to avoid race conditions
        const results: Array<
          | { status: 'fulfilled'; value: AgentProcessingResult }
          | { status: 'rejected'; reason: unknown }
        > = [];
        for (const agent of autoAgents) {
          try {
            if (import.meta.env.DEV) {
              console.log(`🤖 Processing agent: ${agent.name}`);
            }
            const result = await get().processNoteWithAgent(noteId, agent.id);
            results.push({ status: 'fulfilled', value: result });
          } catch (error) {
            console.error(`🤖 Agent ${agent.name} failed:`, error);
            results.push({ status: 'rejected', reason: error });
          }
        }
        
        const successful = results.filter(r => r.status === 'fulfilled' && r.value?.success).length;
        const failed = results.length - successful;
        
        // Log detailed results
        if (import.meta.env.DEV) {
          results.forEach((result, index) => {
            const agentName = autoAgents[index].name;
            console.log(`🤖 Agent "${agentName}":`, result.status === 'fulfilled' ? result.value : result.reason);
          });
        }
        
        if (import.meta.env.DEV) {
          console.log('🤖 AgentsStore: Auto agents processing complete', { 
            successful, 
            failed, 
            total: results.length 
          });
        }
        
        set({ 
          isProcessing: false, 
          processingStatus: '' 
        });
      },
      
      initializeBuiltInAgents: () => {
        // Don't re-initialize if we already have built-in agents
        if (get().builtInAgents.length > 0) {
          if (import.meta.env.DEV) {
            console.log('🤖 AgentsStore: Built-in agents already initialized', {
              count: get().builtInAgents.length,
              autoRunCount: get().builtInAgents.filter(a => a.autoRun).length
            });
          }
          return;
        }
        
        const llmStore = useLLMProvidersStore.getState();
        const defaultModel = llmStore.getDefaultModel();
        const defaultModelId = defaultModel ? `${defaultModel.providerId}-${defaultModel.id}` : '';
        
        if (import.meta.env.DEV) {
          console.log('🤖 AgentsStore: Initializing built-in agents', {
            hasDefaultModel: !!defaultModel,
            defaultModelId,
            providersCount: llmStore.getValidProviders().length
          });
        }
        
        const now = Date.now();
        const builtInAgents = BUILT_IN_AGENTS.map((agent, index) => ({
          ...agent,
          id: `builtin-${agent.name.toLowerCase().replace(/\s+/g, '-')}`,
          modelId: defaultModelId,
          createdAt: now,
          updatedAt: now
        }));
        
        set({ builtInAgents });
        if (import.meta.env.DEV) {
          console.log('🤖 AgentsStore: Built-in agents initialized', { count: builtInAgents.length });
        }
        
        // Log the auto-run status
        if (import.meta.env.DEV) {
          const autoRunCount = builtInAgents.filter(a => a.autoRun).length;
          console.log('🤖 AgentsStore: Auto-run agents:', autoRunCount, 'of', builtInAgents.length);
        }
      },
      
      validateAgentDependencies: () => {
        const issues: string[] = [];
        const llmStore = useLLMProvidersStore.getState();
        
        if (!llmStore.hasValidProvider()) {
          issues.push('No valid LLM providers configured');
        } else if (!llmStore.getDefaultModel()) {
          issues.push('No default model selected');
        }
        
        const { agents, builtInAgents } = get();
        const allAgents = [...agents, ...builtInAgents];
        const availableModels = llmStore.getAvailableModels();
        const availableModelIds = availableModels.map(m => `${m.providerId}-${m.id}`);
        
        allAgents.forEach(agent => {
          if (agent.modelId && !availableModelIds.includes(agent.modelId)) {
            issues.push(`Agent "${agent.name}" uses unavailable model: ${agent.modelId}`);
          }
        });
        
        return {
          valid: issues.length === 0,
          issues
        };
      }
    }),
    {
      name: 'agents-store',
      version: 1,
      migrate: (persistedState: any) => persistedState
    }
  )
)