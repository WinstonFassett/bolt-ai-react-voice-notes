import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { callAi } from 'call-ai';

interface LLMModel {
  id: string;
  name: string;
  providerId: string;
  contextLength: number;
  costPer1kTokens: number;
  capabilities: readonly ('text' | 'vision' | 'function-calling')[];
}

interface LLMProvider {
  id: string;
  name: string;
  apiKey: string;
  baseUrl?: string;
  models: LLMModel[];
  isValid: boolean;
  lastValidated: number;
  lastError?: string;
}

interface LLMProvidersState {
  providers: LLMProvider[];
  defaultModelId: string | null;
  isValidating: boolean;
  
  // Core actions
  addProvider: (provider: Omit<LLMProvider, 'id' | 'models' | 'isValid' | 'lastValidated'>) => void;
  updateProvider: (provider: LLMProvider) => void;
  deleteProvider: (id: string) => void;
  setDefaultModel: (modelId: string) => void;
  
  // Validation and health checks
  validateProvider: (id: string) => Promise<boolean>;
  validateAllProviders: () => Promise<void>;
  
  // Smart getters with defensive checks
  getAvailableModels: () => LLMModel[];
  getValidProviders: () => LLMProvider[];
  hasValidProvider: () => boolean;
  getDefaultModel: () => LLMModel | null;
  canRunAgents: () => boolean;
  
  // LLM client management
  createClient: (providerId: string) => any | null;
  testConnection: (providerId: string) => Promise<{ success: boolean; error?: string }>;
}

// Built-in model configurations for common providers
const PROVIDER_CONFIGS = {
  openai: {
    name: 'OpenAI',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', contextLength: 128000, costPer1kTokens: 0.005, capabilities: ['text'] as const },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', contextLength: 128000, costPer1kTokens: 0.00015, capabilities: ['text'] as const },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', contextLength: 16385, costPer1kTokens: 0.0005, capabilities: ['text'] as const }
    ]
  },
  anthropic: {
    name: 'Anthropic',
    models: [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', contextLength: 200000, costPer1kTokens: 0.003, capabilities: ['text'] as const },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', contextLength: 200000, costPer1kTokens: 0.00025, capabilities: ['text'] as const }
    ]
  }
};

// Map provider names to call-ai endpoints
const PROVIDER_ENDPOINTS = {
  openai: 'https://api.openai.com/v1/chat/completions',
  anthropic: 'https://api.anthropic.com/v1/messages'
};

export const useLLMProvidersStore = create<LLMProvidersState>()(
  persist(
    (set, get) => ({
      providers: [],
      defaultModelId: null,
      isValidating: false,
      
      addProvider: (providerData) => {
        // Use a stable ID based on provider name without timestamps
        // If there are multiple providers with the same name, append a number
        const baseName = providerData.name.toLowerCase();
        const existingCount = get().providers.filter(p => p.id.startsWith(baseName)).length;
        const id = existingCount > 0 ? `${baseName}-${existingCount + 1}` : baseName;
        
        const config = PROVIDER_CONFIGS[baseName as keyof typeof PROVIDER_CONFIGS];
        
        const newProvider: LLMProvider = {
          ...providerData,
          id,
          models: config ? config.models.map(m => ({ ...m, providerId: id })) : [],
          isValid: false,
          lastValidated: 0
        };
        
        set((state) => ({
          providers: [...state.providers, newProvider]
        }));
        
        // Auto-validate the new provider
        get().validateProvider(id);
      },
      
      updateProvider: (provider) => set((state) => ({
        providers: state.providers.map(p => p.id === provider.id ? provider : p)
      })),
      
      deleteProvider: (id) => set((state) => ({
        providers: state.providers.filter(p => p.id !== id),
        defaultModelId: state.defaultModelId?.startsWith(id) ? null : state.defaultModelId
      })),
      
      setDefaultModel: (modelId) => set({ defaultModelId: modelId }),
      
      validateProvider: async (id) => {
        const { providers } = get();
        const provider = providers.find(p => p.id === id);
        if (!provider) return false;
        
        set({ isValidating: true });
        
        try {
          const result = await get().testConnection(id);
          
          const updatedProvider = {
            ...provider,
            isValid: result.success,
            lastValidated: Date.now(),
            lastError: result.error
          };
          
          get().updateProvider(updatedProvider);
          return result.success;
        } catch (error) {
          console.error('Provider validation failed:', error);
          
          const updatedProvider = {
            ...provider,
            isValid: false,
            lastValidated: Date.now(),
            lastError: error instanceof Error ? error.message : 'Unknown error'
          };
          
          get().updateProvider(updatedProvider);
          return false;
        } finally {
          set({ isValidating: false });
        }
      },
      
      validateAllProviders: async () => {
        const { providers } = get();
        const validationPromises = providers.map(p => get().validateProvider(p.id));
        await Promise.allSettled(validationPromises);
      },
      
      // Smart defensive getters
      getAvailableModels: () => {
        const { providers } = get();
        return providers
          .filter(p => p.isValid)
          .flatMap(p => p.models);
      },
      
      getValidProviders: () => {
        const { providers } = get();
        return providers.filter(p => p.isValid);
      },
      
      hasValidProvider: () => {
        return get().getValidProviders().length > 0;
      },
      
      getDefaultModel: () => {
        const { defaultModelId } = get();
        if (!defaultModelId) return null;
        
        const availableModels = get().getAvailableModels();
        return availableModels.find(m => `${m.providerId}-${m.id}` === defaultModelId) || null;
      },
      
      canRunAgents: () => {
        return get().hasValidProvider() && get().getDefaultModel() !== null;
      },
      
      createClient: (providerId) => {
        const { providers } = get();
        const provider = providers.find(p => p.id === providerId && p.isValid);
        if (!provider) {
          console.warn(`Cannot create client for invalid provider: ${providerId}`);
          return null;
        }
        
        try {
          // Return a client object that wraps call-ai with the provider's settings
          return {
            chat: {
              completions: {
                create: async (options: any) => {
                  const endpoint = PROVIDER_ENDPOINTS[provider.name.toLowerCase() as keyof typeof PROVIDER_ENDPOINTS];
                  
                  // Convert OpenAI-style messages to call-ai format
                  const messages = options.messages || [];
                  
                  const callAiOptions = {
                    apiKey: provider.apiKey,
                    model: options.model,
                    endpoint: endpoint || provider.baseUrl,
                    temperature: options.temperature,
                    max_tokens: options.max_tokens,
                    stream: false // We'll handle streaming separately if needed
                  };
                  
                  try {
                    const response = await callAi(messages, callAiOptions);
                    
                    // Return in OpenAI-compatible format
                    return {
                      choices: [{
                        message: {
                          content: response,
                          role: 'assistant'
                        }
                      }]
                    };
                  } catch (error) {
                    console.error('call-ai error:', error);
                    throw error;
                  }
                }
              }
            }
          };
        } catch (error) {
          console.error(`Failed to create client for provider ${providerId}:`, error);
          return null;
        }
      },
      
      testConnection: async (providerId) => {
        const { providers } = get();
        const provider = providers.find(p => p.id === providerId);
        if (!provider) {
          return { success: false, error: 'Provider not found' };
        }
        
        try {
          const endpoint = PROVIDER_ENDPOINTS[provider.name.toLowerCase() as keyof typeof PROVIDER_ENDPOINTS];
          
          const testOptions = {
            apiKey: provider.apiKey,
            model: provider.models[0]?.id || 'gpt-3.5-turbo',
            endpoint: endpoint || provider.baseUrl,
            max_tokens: 5
          };
          
          // Test with a minimal request
          const response = await callAi('Hello', testOptions);
          
          if (response && typeof response === 'string') {
            return { success: true };
          } else {
            return { success: false, error: 'Invalid response format' };
          }
        } catch (error) {
          let errorMessage = 'Connection failed';
          
          if (error instanceof Error) {
            if (error.message.includes('401') || error.message.includes('unauthorized')) {
              errorMessage = 'Invalid API key';
            } else if (error.message.includes('403') || error.message.includes('forbidden')) {
              errorMessage = 'API access denied';
            } else if (error.message.includes('429')) {
              errorMessage = 'Rate limit exceeded';
            } else if (error.message.includes('network') || error.message.includes('fetch')) {
              errorMessage = 'Network error';
            } else {
              errorMessage = error.message;
            }
          }
          
          return { success: false, error: errorMessage };
        }
      }
    }),
    {
      name: 'llm-providers-store',
      version: 2, // Increment version number
      migrate: (persistedState: any, version: number) => {
        // If migrating from version 1 (timestamp-based IDs)
        if (version === 1) {
          const providers = persistedState.providers.map((provider: any) => {
            // Check if this is a timestamp-based ID
            if (provider.id && provider.id.includes('-') && !isNaN(parseInt(provider.id.split('-')[1]))) {
              // Extract the base name (e.g., 'openai' from 'openai-1234567890')
              const baseName = provider.id.split('-')[0];
              
              // Create a stable ID based on provider name
              // If there are multiple providers with the same name, append a number
              const existingCount = persistedState.providers
                .filter((p: any) => p.id !== provider.id && p.id.startsWith(baseName))
                .length;
              
              const newId = existingCount > 0 ? `${baseName}-${existingCount + 1}` : baseName;
              
              // Update provider ID and all model references
              const updatedProvider = {
                ...provider,
                id: newId,
                models: provider.models.map((model: any) => ({
                  ...model,
                  providerId: newId
                }))
              };
              
              return updatedProvider;
            }
            return provider;
          });
          
          // Update defaultModelId if it references a changed provider ID
          let defaultModelId = persistedState.defaultModelId;
          if (defaultModelId) {
            const parts = defaultModelId.split('-');
            if (parts.length >= 2) {
              const oldProviderId = parts[0];
              const oldProvider = persistedState.providers.find((p: any) => p.id === oldProviderId);
              
              if (oldProvider) {
                // Find the corresponding updated provider
                const updatedProvider = providers.find((p: any) => 
                  p.name.toLowerCase() === oldProvider.name.toLowerCase() && p.id !== oldProviderId
                );
                
                if (updatedProvider) {
                  // Extract model name (last part or everything after timestamp)
                  const modelName = parts.length >= 3 ? parts.slice(2).join('-') : parts[1];
                  defaultModelId = `${updatedProvider.id}-${modelName}`;
                }
              }
            }
          }
          
          return {
            ...persistedState,
            providers,
            defaultModelId
          };
        }
        
        return persistedState;
      }
    }
  )
);