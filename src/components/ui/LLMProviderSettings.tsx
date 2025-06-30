import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PlusIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';
import { useLLMProvidersStore } from '../../stores/llmProvidersStore';
import { useAgentsStore } from '../../stores/agentsStore';

interface AddProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddProviderModal: React.FC<AddProviderModalProps> = ({ isOpen, onClose }) => {
  const [selectedProvider, setSelectedProvider] = useState('openai');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const { addProvider } = useLLMProvidersStore();

  const providers = [
    { id: 'openai', name: 'OpenAI', description: 'GPT-4o, GPT-4o Mini, GPT-3.5 Turbo' },
    { id: 'anthropic', name: 'Anthropic', description: 'Claude 3.5 Sonnet, Claude 3 Haiku' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) return;

    addProvider({
      name: selectedProvider,
      apiKey: apiKey.trim(),
      baseUrl: baseUrl.trim() || undefined
    });

    // Reset form
    setApiKey('');
    setBaseUrl('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-gray-700"
      >
        <h3 className="text-lg font-semibold text-white mb-4">Add LLM Provider</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Provider Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Provider
            </label>
            <div className="space-y-2">
              {providers.map((provider) => (
                <label key={provider.id} className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="provider"
                    value={provider.id}
                    checked={selectedProvider === provider.id}
                    onChange={(e) => setSelectedProvider(e.target.value)}
                    className="mt-1 w-4 h-4 text-indigo-600 bg-gray-700 border-gray-600 focus:ring-indigo-500"
                  />
                  <div>
                    <div className="text-white font-medium">{provider.name}</div>
                    <div className="text-sm text-gray-400">{provider.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              API Key
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full px-3 py-2 pr-10 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
              >
                {showApiKey ? (
                  <EyeSlashIcon className="w-4 h-4" />
                ) : (
                  <EyeIcon className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Base URL (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Base URL (Optional)
            </label>
            <input
              type="url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.openai.com/v1"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-1">
              Leave empty to use default endpoint
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!apiKey.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              Add Provider
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export const LLMProviderSettings: React.FC = () => {
  const {
    providers,
    defaultModelId,
    isValidating,
    getAvailableModels,
    getValidProviders,
    hasValidProvider,
    deleteProvider,
    setDefaultModel,
    validateProvider,
    validateAllProviders
  } = useLLMProvidersStore();

  const { initializeBuiltInAgents } = useAgentsStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [validatingProvider, setValidatingProvider] = useState<string | null>(null);

  const availableModels = getAvailableModels();
  const validProviders = getValidProviders();

  // Initialize built-in agents when we get our first valid provider
  useEffect(() => {
    if (hasValidProvider() && availableModels.length > 0) {
      initializeBuiltInAgents();
    }
  }, [hasValidProvider, availableModels.length, initializeBuiltInAgents]);

  const handleValidateProvider = async (providerId: string) => {
    setValidatingProvider(providerId);
    await validateProvider(providerId);
    setValidatingProvider(null);
  };

  const handleValidateAll = async () => {
    await validateAllProviders();
  };

  const formatLastValidated = (timestamp: number) => {
    if (timestamp === 0) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">LLM Providers</h3>
          <p className="text-sm text-gray-400">
            Configure AI providers to enable agents
          </p>
        </div>
      </div>

      {/* Status Summary */}
      {providers.length > 0 && (
        <div className={`p-4 rounded-lg border ${
          hasValidProvider() 
            ? 'bg-green-900/20 border-green-700/30' 
            : 'bg-yellow-900/20 border-yellow-700/30'
        }`}>
          <div className="flex items-center gap-3">
            {hasValidProvider() ? (
              <CheckCircleIcon className="w-5 h-5 text-green-400" />
            ) : (
              <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400" />
            )}
            <div>
              <div className={`font-medium ${
                hasValidProvider() ? 'text-green-300' : 'text-yellow-300'
              }`}>
                {hasValidProvider() 
                  ? `${validProviders.length} provider(s) connected`
                  : 'No valid providers'
                }
              </div>
              <div className={`text-sm ${
                hasValidProvider() ? 'text-green-400' : 'text-yellow-400'
              }`}>
                {hasValidProvider()
                  ? `${availableModels.length} models available`
                  : 'Add an API key to enable AI agents'
                }
              </div>
            </div>
          </div>
          {providers.length > 1 && (
            <button
              onClick={handleValidateAll}
              disabled={isValidating}
              className="mt-3 px-3 py-1 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-700 text-white rounded text-sm transition-colors"
            >
              {isValidating ? 'Validating...' : 'Validate All'}
            </button>
          )}
        </div>
      )}

      {/* Warning when no default model is set */}
      {hasValidProvider() && !defaultModelId && (
        <div className="p-4 rounded-lg border bg-yellow-900/20 border-yellow-700/30">
          <div className="flex items-center gap-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400" />
            <div>
              <div className="font-medium text-yellow-300">No Default Model Selected</div>
              <div className="text-sm text-yellow-400">
                Please select a default model below to enable AI agents
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Default Model Selection */}
      {availableModels.length > 0 && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            Default Model for Agents
          </label>
          <select
            value={defaultModelId || ''}
            onChange={(e) => setDefaultModel(e.target.value)}
            className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
              !defaultModelId ? 'border-yellow-500' : 'border-gray-600'
            }`}
          >
            <option value="">Select a default model...</option>
            {availableModels.map((model) => (
              <option key={`${model.providerId}-${model.id}`} value={`${model.providerId}-${model.id}`}>
                {model.name} ({model.providerId})
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-400">
            This model will be used by agents unless they specify a different one
          </p>
        </div>
      )}

      {/* Providers List */}
      {providers.length > 0 ? (
        <div className="space-y-3">
          {/* Add Provider Button at top of list */}
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            Add Provider
          </button>
          
          {providers.map((provider) => (
            <motion.div
              key={provider.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-gray-800 border border-gray-700 rounded-lg"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-medium text-white">{provider.name}</h4>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                      provider.isValid
                        ? 'bg-green-900/30 text-green-300 border border-green-700/30'
                        : 'bg-red-900/30 text-red-300 border border-red-700/30'
                    }`}>
                      {provider.isValid ? (
                        <>
                          <CheckCircleIcon className="w-3 h-3" />
                          Connected
                        </>
                      ) : (
                        <>
                          <ExclamationTriangleIcon className="w-3 h-3" />
                          {provider.lastError || 'Not connected'}
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-400 space-y-1">
                    <div>API Key: {provider.apiKey.substring(0, 8)}...</div>
                    <div>Models: {provider.models.length} available</div>
                    <div>Last validated: {formatLastValidated(provider.lastValidated)}</div>
                    {provider.lastError && (
                      <div className="text-red-400">Error: {provider.lastError}</div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleValidateProvider(provider.id)}
                    disabled={validatingProvider === provider.id}
                    className="px-3 py-1 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-700 text-white rounded text-sm transition-colors"
                  >
                    {validatingProvider === provider.id ? 'Testing...' : 'Test'}
                  </button>
                  <button
                    onClick={() => deleteProvider(provider.id)}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <h3 className="text-lg font-medium text-white mb-2">No providers configured</h3>
          <p className="text-gray-400 mb-4">
            Add an LLM provider to enable AI agents
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            Add Provider
          </button>
        </div>
      )}

      {/* Add Provider Modal */}
      <AnimatePresence>
        {showAddModal && (
          <AddProviderModal
            isOpen={showAddModal}
            onClose={() => setShowAddModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};