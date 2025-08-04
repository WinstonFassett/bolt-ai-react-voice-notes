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
export async function importSettings(data: ExportedSettings): Promise<{ success: boolean; message: string }> {
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
      // First import or update providers
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
      
      // Validate all providers first to ensure models are available
      await llmProvidersStore.validateAllProviders();
      
      // Set default model after validation to ensure the model exists
      if (data.llmProviders.defaultModelId) {
        // Check if the model exists in any provider
        const allModels = llmProvidersStore.getAvailableModels();
        const modelExists = allModels.some(model => model.id === data.llmProviders.defaultModelId);
        
        if (modelExists) {
          llmProvidersStore.setDefaultModel(data.llmProviders.defaultModelId);
        } else {
          console.warn('Default model from import not found, using first available model');
          // Set to first available model if the imported default doesn't exist
          if (allModels.length > 0) {
            llmProvidersStore.setDefaultModel(allModels[0].id);
          }
        }
      }
    }
    
    // Import agents
    if (data.agents) {
      // Import custom agents
      data.agents.agents.forEach(agent => {
        // Check for existing agent by ID first
        const existingAgentById = agentsStore.agents.find(a => a.id === agent.id);
        
        // Also check by name to avoid duplicates with same name but different IDs
        const existingAgentByName = agentsStore.agents.find(a => 
          a.name === agent.name && a.id !== agent.id
        );
        
        if (existingAgentById) {
          // Update existing agent with same ID
          agentsStore.updateAgent(agent);
        } else if (existingAgentByName) {
          // Update existing agent with same name but different ID
          agentsStore.updateAgent({
            ...agent,
            id: existingAgentByName.id,
            createdAt: existingAgentByName.createdAt,
            updatedAt: Date.now()
          });
        } else {
          // Add as a completely new agent
          agentsStore.addAgent({
            name: agent.name,
            prompt: agent.prompt,
            modelId: agent.modelId,
            avatar: agent.avatar,
            autoRun: agent.autoRun,
            tags: agent.tags,
            outputFormat: agent.outputFormat || 'markdown',
            isBuiltIn: false
          });
        }
      });
      
      // Create a map of built-in agent overrides for quick lookup
      const overrideMap = new Map();
      data.agents.builtInAgentOverrides.forEach(override => {
        overrideMap.set(override.id, override);
      });
      
      // Apply overrides to all built-in agents
      agentsStore.builtInAgents.forEach(builtInAgent => {
        const override = overrideMap.get(builtInAgent.id);
        if (override) {
          // Apply the override from the imported settings
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

/**
 * Resets all settings to default values
 */
export function resetSettings(): { success: boolean; message: string } {
  try {
    const llmProvidersStore = useLLMProvidersStore.getState();
    const agentsStore = useAgentsStore.getState();
    const settingsStore = useSettingsStore.getState();
    
    // Reset LLM providers (clear all custom providers)
    llmProvidersStore.providers.forEach(provider => {
      llmProvidersStore.deleteProvider(provider.id);
    });
    
    // Reset default model - use empty string instead of null
    // We'll let the store handle this empty value appropriately
    llmProvidersStore.setDefaultModel('');
    
    // Reset agents (restore built-in agents to default state)
    agentsStore.builtInAgents.forEach(agent => {
      agentsStore.updateAgent({
        ...agent,
        modelId: '',
        autoRun: true // Default is enabled
      });
    });
    
    // Delete all custom agents
    agentsStore.agents.forEach(agent => {
      if (!agent.isBuiltIn) {
        agentsStore.deleteAgent(agent.id);
      }
    });
    
    // Reset app settings to defaults
    settingsStore.updateModelSettings({
      model: 'tiny-en',
      multilingual: false,
      quantized: true,
      subtask: 'transcribe',
      language: 'en',
      useOpenAIForSTT: false,
      openAIModel: 'whisper-1'
    });
    
    return { success: true, message: 'All settings reset to defaults' };
  } catch (error) {
    console.error('Failed to reset settings:', error);
    return { 
      success: false, 
      message: `Reset failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Clears all app data including notes, audio, settings, providers, and agents
 */
export function clearAllData(): { success: boolean; message: string } {
  try {
    // Clear IndexedDB storage
    window.indexedDB.deleteDatabase('audio-storage');
    
    // Clear localStorage
    localStorage.clear();
    
    return { 
      success: true, 
      message: 'All data cleared. Please refresh the page to complete the process.'
    };
  } catch (error) {
    console.error('Failed to clear all data:', error);
    return { 
      success: false, 
      message: `Clear failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
