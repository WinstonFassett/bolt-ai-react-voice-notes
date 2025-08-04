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
  const customAgents = agentsState.agents.map(agent => ({
    ...agent,
    modelId: agent.modelId || null // Ensure modelId is included
  }));
  
  // Get ALL built-in agents to preserve their state
  const builtInAgentOverrides = agentsState.builtInAgents.map(agent => ({
    id: agent.id,
    autoRun: agent.autoRun,
    modelId: agent.modelId || null // Ensure modelId is included and null if not set
  }));
  
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
  
  // With stable provider IDs, we can use the original format
  return {
    version: 1,
    timestamp: Date.now(),
    llmProviders: {
      providers: llmProvidersState.providers,
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
        const importedModelId = data.llmProviders.defaultModelId;
        
        // With stable provider IDs, exact matching should work better
        // But we'll still extract the base model ID as a fallback
        let baseModelId = '';
        if (typeof importedModelId === 'string') {
          const parts = importedModelId.split('-');
          if (parts.length >= 3) {
            // Skip the first two segments (provider name and timestamp)
            baseModelId = parts.slice(2).join('-');
          } else {
            // Fallback to the last segment if format is different
            baseModelId = parts[parts.length - 1];
          }
        }
        
        if (import.meta.env.DEV) {
          console.log('Importing model ID:', {
            fullId: importedModelId,
            extractedBaseId: baseModelId
          });
        }
        
        // First try exact match
        const allModels = llmProvidersStore.getAvailableModels();
        let matchedModel = allModels.find(model => {
          const fullModelId = `${model.providerId}-${model.id}`;
          return fullModelId === importedModelId;
        });
        
        // If no exact match, try matching by the base model ID
        if (!matchedModel && baseModelId) {
          matchedModel = allModels.find(model => {
            return model.id === baseModelId;
          });
          
          if (matchedModel && import.meta.env.DEV) {
            console.log(`Found model match by base ID: ${baseModelId}`);
          }
        }
        
        if (matchedModel) {
          const matchedModelId = `${matchedModel.providerId}-${matchedModel.id}`;
          llmProvidersStore.setDefaultModel(matchedModelId);
          
          if (import.meta.env.DEV) {
            console.log('Set default model:', {
              matchedId: matchedModelId,
              originalId: importedModelId,
              modelName: matchedModel.name
            });
          }
        } else {
          console.warn('Default model from import not found, using first available model');
          // Set to first available model if the imported default doesn't exist
          if (allModels.length > 0) {
            const firstModel = allModels[0];
            const firstModelId = `${firstModel.providerId}-${firstModel.id}`;
            llmProvidersStore.setDefaultModel(firstModelId);
          }
        }
      }
    }
    
    // Import custom agents
    if (data.agents && data.agents.agents) {
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
      if (data.agents.builtInAgentOverrides) {
        data.agents.builtInAgentOverrides.forEach(override => {
          overrideMap.set(override.id, override);
        });
      }
      
      // Apply overrides to ALL built-in agents
      agentsStore.builtInAgents.forEach(builtInAgent => {
        // Get the override or use default values if not found
        const override = overrideMap.get(builtInAgent.id);
        
        // Get model ID from override, validate it exists in available models
        // If no override model ID, use the default model ID from LLM providers
        let modelId = builtInAgent.modelId;
        
        if (override && override.modelId) {
          // Use the override model if specified
          const overrideModelId = override.modelId;
          // Extract the base model ID (e.g., "gpt-4o-mini") from the full ID
          // The model ID could be in various formats depending on provider
          let overrideBaseModelId: string | null = null;
          if (overrideModelId && typeof overrideModelId === 'string') {
            // For OpenAI models like "openai-1234567890-gpt-4o-mini", we want "gpt-4o-mini"
            // For Anthropic models like "anthropic-1234567890-claude-3-opus", we want "claude-3-opus"
            // Extract everything after the second hyphen as the base model ID
            const parts = overrideModelId.split('-');
            if (parts.length >= 3) {
              // Skip the first two segments (provider name and timestamp)
              overrideBaseModelId = parts.slice(2).join('-');
            } else {
              // Fallback to the last segment if format is different
              overrideBaseModelId = parts[parts.length - 1];
            }
            
            if (import.meta.env.DEV) {
              console.log(`Extracted base model ID: ${overrideBaseModelId} from ${overrideModelId}`);
            }
          }
          
          const allModels = llmProvidersStore.getAvailableModels();
          
          // First try exact match
          let matchedModel = allModels.find(model => {
            const fullModelId = `${model.providerId}-${model.id}`;
            return fullModelId === overrideModelId;
          });
          
          // If no exact match, try matching by base model ID
          if (!matchedModel && overrideBaseModelId) {
            matchedModel = allModels.find(model => model.id === overrideBaseModelId);
            
            if (matchedModel) {
              if (import.meta.env.DEV) {
                console.log(`Agent ${builtInAgent.name}: Found model match by base ID: ${overrideBaseModelId}`);
              }
            }
          }
          
          if (matchedModel) {
            modelId = `${matchedModel.providerId}-${matchedModel.id}`;
            
            if (import.meta.env.DEV) {
              console.log(`Agent ${builtInAgent.name}: Using model:`, {
                originalId: overrideModelId,
                matchedId: modelId,
                modelName: matchedModel.name
              });
            }
          } else {
            console.warn(`Model ${overrideModelId} not found for built-in agent ${builtInAgent.name}, using default`);
          }
        } else if (data.llmProviders && data.llmProviders.defaultModelId) {
          // If no specific model override but we have a default model, use that
          const defaultModelId = data.llmProviders.defaultModelId;
          
          // Extract the base model ID using the same improved logic
          let defaultBaseModelId: string | null = null;
          if (defaultModelId && typeof defaultModelId === 'string') {
            const parts = defaultModelId.split('-');
            if (parts.length >= 3) {
              // Skip the first two segments (provider name and timestamp)
              defaultBaseModelId = parts.slice(2).join('-');
            } else {
              // Fallback to the last segment if format is different
              defaultBaseModelId = parts[parts.length - 1];
            }
            
            if (import.meta.env.DEV) {
              console.log(`Extracted default base model ID: ${defaultBaseModelId} from ${defaultModelId}`);
            }
          }
          
          const allModels = llmProvidersStore.getAvailableModels();
          
          // First try exact match
          let matchedModel = allModels.find(model => {
            const fullModelId = `${model.providerId}-${model.id}`;
            return fullModelId === defaultModelId;
          });
          
          // If no exact match, try matching by base model ID
          if (!matchedModel) {
            matchedModel = allModels.find(model => model.id === defaultBaseModelId);
          }
          
          if (matchedModel) {
            modelId = `${matchedModel.providerId}-${matchedModel.id}`;
            
            if (import.meta.env.DEV) {
              console.log(`Agent ${builtInAgent.name}: Using default model:`, {
                originalId: defaultModelId,
                matchedId: modelId,
                modelName: matchedModel.name
              });
            }
          }
        }
        
        // Always update each built-in agent to ensure state is preserved
        // Create an updated agent with the override values
        const updatedAgent = {
          ...builtInAgent,
          // CRITICAL: For autoRun, explicitly check if it's defined in the override to handle false values correctly
          autoRun: override && override.hasOwnProperty('autoRun') ? override.autoRun : builtInAgent.autoRun,
          modelId
        };
        
        // Use the updateAgent method which handles both regular and built-in agents
        agentsStore.updateAgent(updatedAgent);
        
        if (import.meta.env.DEV) {
          console.log(`Updated built-in agent ${builtInAgent.name}:`, {
            id: builtInAgent.id,
            modelId,
            autoRun: override && override.hasOwnProperty('autoRun') ? override.autoRun : builtInAgent.autoRun,
            hasOverride: !!override
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
 * Deletes downloaded Whisper models from the cache
 */
export async function deleteDownloadedModels(): Promise<{ success: boolean; message: string }> {
  try {
    // Clear the Cache Storage (where transformer models are stored)
    const cacheKeys = await caches.keys();
    await Promise.all(
      cacheKeys
        .filter(key => key.includes('transformers'))
        .map(key => caches.delete(key))
    );

    return {
      success: true,
      message: 'All downloaded models cleared successfully'
    };
  } catch (error) {
    console.error('Failed to clear downloaded models:', error);
    return {
      success: false,
      message: `Failed to clear models: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Clears all app data including notes, audio, settings, providers, agents, and cached models
 */
export async function clearAllData(): Promise<{ success: boolean; message: string }> {
  try {
    // Get all IndexedDB databases and delete them
    const databases = await window.indexedDB.databases();
    await Promise.all(
      databases.map(db => 
        new Promise<void>((resolve, reject) => {
          if (!db.name) {
            resolve();
            return;
          }
          const request = window.indexedDB.deleteDatabase(db.name);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        })
      )
    );

    // Clear Cache Storage (transformers models and other cached data)
    const cacheKeys = await caches.keys();
    await Promise.all(cacheKeys.map(key => caches.delete(key)));
    
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
