import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  PlusIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  BoltIcon,
  PencilIcon
} from '@heroicons/react/24/outline';

// Zustand stores
import { useAgentsStore } from '../../stores/agentsStore';
import { useLLMProvidersStore } from '../../stores/llmProvidersStore';
import { AgentEditor } from '../AgentEditor';
import { Button } from '../ui/button';

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

  const navigate = useNavigate();

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
    navigate('/settings');
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
          className="p-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10"
        >
          <div className="flex items-center gap-3">
            <CheckCircleIcon className="w-6 h-6 text-emerald-500" />
            <div>
              <h3 className="font-medium">Agents Ready</h3>
              <p className="text-sm text-muted-foreground">
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
        className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/10"
      >
        <div className="flex items-start gap-3">
          <ExclamationTriangleIcon className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-medium mb-2">Setup Required</h3>
            <div className="space-y-2">
              {!hasValidProvider() && (
                <div className="text-sm text-muted-foreground">
                  • No valid LLM providers configured
                </div>
              )}
              {!defaultModel && (
                <div className="text-sm text-muted-foreground">
                  • No default model selected
                </div>
              )}
              {dependencyCheck.issues.map((issue, index) => (
                <div key={index} className="text-sm text-muted-foreground">
                  • {issue}
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <Button
                onClick={handleValidateProviders}
                variant="default"
                className="text-sm"
              >
                Retry Connection
              </Button>
              <Button
                onClick={handleOpenSettings}
                variant="outline"
                className="text-sm"
              >
                Open Settings
              </Button>
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
      className={`p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-all duration-200 ${
        !canRun ? 'opacity-50' : ''
      }`}
      onClick={() => handleEditAgent(agent)}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <div className="text-2xl">{agent.avatar || '🤖'}</div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 
                className="font-semibold cursor-pointer hover:text-primary transition-colors" 
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditAgent(agent);
                }}
                title="Click to edit agent"
              >
                {agent.name}
              </h3>
              {agent.isBuiltIn && (
                <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs rounded-full border border-primary/30">
                  Built-in
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {agent.prompt.split('\n')[0].replace(/[*#]/g, '').trim()}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Tags: {agent.tags.join(', ')}</span>
              {agent.modelId && (
                <span>• Model: {agent.modelId.split('-').pop()}</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {agent.autoRun && (
            <BoltIcon className="w-4 h-4 text-amber-500" title="Auto-run enabled" />
          )}
          <Button
            onClick={(e) => {
              e.stopPropagation();
              handleEditAgent(agent);
            }}
            disabled={!canRun}
            variant="ghost"
            size="icon"
            className={canRun ? "" : "cursor-not-allowed"}
            title="Edit agent"
          >
            <PencilIcon className="w-4 h-4" />
          </Button>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              toggleAgentAutoRun(agent.id);
            }}
            variant={agent.autoRun ? "default" : "secondary"}
            className="text-sm px-3 py-1 h-auto"
          >
            {agent.autoRun ? 'Auto-Run: ON' : 'Auto-Run: OFF'}
          </Button>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="safe-area-top py-4 px-4"
        >
          <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">AI Agents</h1>
            <Button
              onClick={handleCreateAgent}
              disabled={!canRun}
              variant="default"
              size="icon"
              className="rounded-full"
              title="Create new agent"
            >
              <PlusIcon className="w-5 h-5" />
            </Button>
          </div>
          </div>
        </motion.div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-4 pb-24 pt-20 bg-background">
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
                className="p-4 rounded-lg border border-primary/30 bg-primary/10"
              >
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full"
                  />
                  <div>
                    <h3 className="font-medium">Processing</h3>
                    <p className="text-sm text-muted-foreground">{processingStatus}</p>
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
                className="p-4 rounded-lg border border-destructive/30 bg-destructive/10"
              >
                <div className="flex items-start gap-3">
                  <ExclamationTriangleIcon className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium">Processing Error</h3>
                    <p className="text-sm text-muted-foreground">{lastProcessingError}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>



          {/* Custom Agents */}
          {agents.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4">👤 Custom Agents</h2>
              <div className="space-y-3">
                {agents.map((agent, index) => renderAgent(agent, index))}
              </div>
            </div>
          )}

          {/* Built-in Agents */}
          {builtInAgents.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4">🤖 Built-in Agents</h2>
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
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <span className="text-2xl">🤖</span>
              </div>
              <h3 className="text-lg font-medium mb-2">No Agents Available</h3>
              <p className="text-muted-foreground mb-6">
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