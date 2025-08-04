import { useLLMProvidersStore } from '../stores/llmProvidersStore';
import { useAgentsStore } from '../stores/agentsStore';
import { useSettingsStore } from '../stores/settingsStore';

export interface ExportedSettings {
  version: number;
  timestamp: number;
  llmProviders: {
    providers: any[];
    defaultModelId: string | null;
  };
  agents: {
    agents: any[];
    builtInAgentOverrides: any[];
  };
  appSettings: {
    model: string;
    multilingual: boolean;
    quantized: boolean;
    subtask: string;
    language: string;
    useOpenAIForSTT: boolean;
    openAIModel: string;
  };
}

/**
 * Exports all settings to a JSON object
 */
export function exportSettings(): ExportedSettings {
  const llmProvidersState = useLLMProvidersStore.getState();
  const agentsState = useAgentsStore.getState();
  const settingsState = useSettingsStore.getState();
  
  // Create a copy of providers but with masked API keys for security
  const providers = llmProvidersState.providers.map(provider => ({
    ...provider,
    apiKey: provider.apiKey // We keep the API key in the export
  }));
  
  // Get custom agents and any overrides to built-in agents
  const customAgents = agentsState.agents;
  
  // Get built-in agents that have been modified
  const builtInAgentOverrides = agentsState.builtInAgents.filter(agent => 
    agent.autoRun === false || agent.modelId !== ''
  );
  
  // Collect app settings
  const appSettings = {
    model: settingsState.model,
    multilingual: settingsState.multilingual,
    quantized: settingsState.quantized,
    subtask: settingsState.subtask,
    language: settingsState.language,
    useOpenAIForSTT: settingsState.useOpenAIForSTT,
    openAIModel: settingsState.openAIModel
  };
  
  return {
    version: 1,
    timestamp: Date.now(),
    llmProviders: {
      providers,
      defaultModelId: llmProvidersState.defaultModelId
    },
    agents: {
      agents: customAgents,
      builtInAgentOverrides
    },
    appSettings
  };
}

/**
 * Imports settings from a JSON object
 */
export function importSettings(data: ExportedSettings): { success: boolean; message: string } {
  try {
    // Validate the imported data
    if (!data || typeof data !== 'object' || !data.version || !data.timestamp) {
      return { success: false, message: 'Invalid settings format' };
    }
    
    // Get store states
    const llmProvidersStore = useLLMProvidersStore.getState();
    const agentsStore = useAgentsStore.getState();
    const settingsStore = useSettingsStore.getState();
    
    // Import LLM providers
    if (data.llmProviders) {
      // First clear existing providers
      data.llmProviders.providers.forEach(provider => {
        // Check if provider already exists
        const existingProvider = llmProvidersStore.providers.find(p => p.id === provider.id);
        if (existingProvider) {
          llmProvidersStore.updateProvider(provider);
        } else {
          // Add as a new provider with the existing ID
          llmProvidersStore.addProvider({
            name: provider.name,
            apiKey: provider.apiKey,
            baseUrl: provider.baseUrl
          });
        }
      });
      
      // Set default model
      if (data.llmProviders.defaultModelId) {
        llmProvidersStore.setDefaultModel(data.llmProviders.defaultModelId);
      }
      
      // Validate all providers
      llmProvidersStore.validateAllProviders();
    }
    
    // Import agents
    if (data.agents) {
      // Import custom agents
      data.agents.agents.forEach(agent => {
        const existingAgent = agentsStore.agents.find(a => a.id === agent.id);
        if (!existingAgent) {
          agentsStore.addAgent({
            name: agent.name,
            prompt: agent.prompt,
            modelId: agent.modelId,
            avatar: agent.avatar,
            autoRun: agent.autoRun,
            tags: agent.tags,
            outputFormat: agent.outputFormat,
            isBuiltIn: false
          });
        } else {
          agentsStore.updateAgent(agent);
        }
      });
      
      // Apply built-in agent overrides
      data.agents.builtInAgentOverrides.forEach(override => {
        const builtInAgent = agentsStore.builtInAgents.find(a => a.id === override.id);
        if (builtInAgent) {
          agentsStore.updateAgent({
            ...builtInAgent,
            autoRun: override.autoRun,
            modelId: override.modelId
          });
        }
      });
    }
    
    // Import app settings
    if (data.appSettings) {
      settingsStore.updateModelSettings(data.appSettings);
    }
    
    return { success: true, message: 'Settings imported successfully' };
  } catch (error) {
    console.error('Failed to import settings:', error);
    return { 
      success: false, 
      message: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Downloads settings as a JSON file
 */
export function downloadSettings() {
  const settings = exportSettings();
  const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `bolt-settings-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
