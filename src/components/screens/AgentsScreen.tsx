import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PlusIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  CogIcon,
  BoltIcon,
  PencilIcon
} from '@heroicons/react/24/outline';

// Zustand stores
import { useAgentsStore } from '../../stores/agentsStore';
import { useLLMProvidersStore } from '../../stores/llmProvidersStore';
import { AgentEditor } from '../ui/AgentEditor';
import { useAppStore } from '../../stores/appStore';

export const AgentsScreen: React.FC = () => {
  const {
    agents,
    builtInAgents,
    isProcessing,
    processingStatus,
    lastProcessingError,
    getAvailableAgents,
    getAutoRunAgents,
    canRunAnyAgents,
    toggleAgentAutoRun,
    validateAgentDependencies,
    initializeBuiltInAgents
  } = useAgentsStore();

  const {
    hasValidProvider,
    getDefaultModel,
    validateAllProviders
  } = useLLMProvidersStore();

  const { setActiveTab } = useAppStore();

  const [dependencyCheck, setDependencyCheck] = useState<{ valid: boolean; issues: string[] }>({ valid: true, issues: [] });
  const [showAgentEditor, setShowAgentEditor] = useState(false);
  const [editingAgent, setEditingAgent] = useState<any>(null);
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');

  // Initialize built-in agents on mount
  useEffect(() => {
    if (builtInAgents.length === 0) {
      initializeBuiltInAgents();
    }
  }, [builtInAgents.length, initializeBuiltInAgents]);

  // Check dependencies on mount and when providers change
  useEffect(() => {
    const checkDependencies = () => {
      const check = validateAgentDependencies();
      setDependencyCheck(check);
    };

    checkDependencies();
    
    // Re-check when providers might have changed
    const interval = setInterval(checkDependencies, 5000);
    return () => clearInterval(interval);
  }, [validateAgentDependencies]);

  const availableAgents = getAvailableAgents();
  const autoRunAgents = getAutoRunAgents();
  const canRun = canRunAnyAgents();
  const defaultModel = getDefaultModel();

  const handleValidateProviders = async () => {
    await validateAllProviders();
  };

  const handleOpenSettings = () => {
    // Use routing store instead of app store
    const { setTab } = useAppStore();
    setTab('settings');
  };
  const handleCreateAgent = () => {
    setEditingAgent(null);
    setEditorMode('create');
    setShowAgentEditor(true);
  };

  const handleEditAgent = (agent: any) => {
    setEditingAgent(agent);
    setEditorMode('edit');
    setShowAgentEditor(true);
  };
  const renderDependencyStatus = () => {
    if (dependencyCheck.valid && canRun) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card bg-green-900/20 border-green-700/30"
        >
          <div className="flex items-center gap-3">
            <CheckCircleIcon className="w-6 h-6 text-green-400" />
            <div>
              <h3 className="font-medium text-green-300">Agents Ready</h3>
              <p className="text-sm text-green-400">
                {availableAgents.length} agents available • {autoRunAgents.length} auto-run enabled
              </p>
            </div>
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card bg-yellow-900/20 border-yellow-700/30"
      >
        <div className="flex items-start gap-3">
          <ExclamationTriangleIcon className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-medium text-yellow-300 mb-2">Setup Required</h3>
            <div className="space-y-2">
              {!hasValidProvider() && (
                <div className="text-sm text-yellow-200">
                  • No valid LLM providers configured
                </div>
              )}
              {!defaultModel && (
                <div className="text-sm text-yellow-200">
                  • No default model selected
                </div>
              )}
              {dependencyCheck.issues.map((issue, index) => (
                <div key={index} className="text-sm text-yellow-200">
                  • {issue}
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleValidateProviders}
                className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-sm transition-colors"
              >
                Retry Connection
              </button>
              <button
                onClick={handleOpenSettings}
                className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm transition-colors"
              >
                Open Settings
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderAgent = (agent: any, index: number) => (
    <motion.div
      key={agent.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`card hover:bg-gray-800/50 transition-all duration-200 ${
        !canRun ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <div className="text-2xl">{agent.avatar || '🤖'}</div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-white">{agent.name}</h3>
              {agent.isBuiltIn && (
                <span className="px-2 py-0.5 bg-indigo-600/20 text-indigo-300 text-xs rounded-full border border-indigo-600/30">
                  Built-in
                </span>
              )}
            </div>
            <p className="text-sm text-gray-400 mb-3 line-clamp-2">
              {agent.prompt.split('\n')[0].replace(/[*#]/g, '').trim()}
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>Tags: {agent.tags.join(', ')}</span>
              {agent.modelId && (
                <span>• Model: {agent.modelId.split('-').pop()}</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {agent.autoRun && (
            <BoltIcon className="w-4 h-4 text-yellow-400" title="Auto-run enabled" />
          )}
          <button
            onClick={() => handleEditAgent(agent)}
            disabled={!canRun}
            className={`p-2 rounded-lg transition-colors ${
              canRun
                ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-300'
                : 'text-gray-600 cursor-not-allowed'
            }`}
            title="Edit agent"
          >
            <PencilIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => toggleAgentAutoRun(agent.id)}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              agent.autoRun
                ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                : 'bg-gray-600 hover:bg-gray-700 text-white'
            }`}
          >
            {agent.autoRun ? 'Auto-Run: ON' : 'Auto-Run: OFF'}
          </button>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-gray-900/95 backdrop-blur-lg border-b border-gray-800">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="safe-area-top py-4 px-4"
        >
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">AI Agents</h1>
            <button
              onClick={handleCreateAgent}
              disabled={!canRun}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                canRun
                  ? 'bg-indigo-600 hover:bg-indigo-700'
                  : 'bg-gray-600 cursor-not-allowed'
              }`}
              title="Create new agent"
            >
              <PlusIcon className="w-6 h-6 text-white" />
            </button>
          </div>
        </motion.div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-4 pb-24 pt-20">
        <div className="max-w-4xl mx-auto">
        <div className="space-y-6 py-4">
          {/* Dependency Status */}
          {renderDependencyStatus()}

          {/* Processing Status */}
          <AnimatePresence>
            {isProcessing && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="card bg-indigo-900/20 border-indigo-700/30"
              >
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full"
                  />
                  <div>
                    <h3 className="font-medium text-indigo-300">Processing</h3>
                    <p className="text-sm text-indigo-400">{processingStatus}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error Status */}
          <AnimatePresence>
            {lastProcessingError && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="card bg-red-900/20 border-red-700/30"
              >
                <div className="flex items-start gap-3">
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-red-300">Processing Error</h3>
                    <p className="text-sm text-red-400">{lastProcessingError}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>



          {/* Custom Agents */}
          {agents.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">👤 Custom Agents</h2>
              <div className="space-y-3">
                {agents.map((agent, index) => renderAgent(agent, index))}
              </div>
            </div>
          )}

          {/* Built-in Agents */}
          {builtInAgents.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">🤖 Built-in Agents</h2>
              <div className="space-y-3">
                {builtInAgents.map((agent, index) => renderAgent(agent, agents.length + index))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {builtInAgents.length === 0 && agents.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
                <span className="text-2xl">🤖</span>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">No Agents Available</h3>
              <p className="text-gray-400 mb-6">
                Configure LLM providers in Settings to enable AI agents
              </p>
            </motion.div>
          )}
        </div>
        </div>
      </main>

      {/* Agent Editor */}
      <AgentEditor
        isOpen={showAgentEditor}
        onClose={() => setShowAgentEditor(false)}
        agent={editingAgent}
        mode={editorMode}
      />
    </div>
  );
};