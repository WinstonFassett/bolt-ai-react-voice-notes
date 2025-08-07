import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  XMarkIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { useAgentsStore } from '../stores/agentsStore';
import { useLLMProvidersStore } from '../stores/llmProvidersStore';

interface AgentFormData {
  name: string;
  prompt: string;
  modelId: string;
  avatar: string;
  autoRun: boolean;
  tags: string[];
  outputFormat: 'markdown' | 'text' | 'json';
}

interface Agent {
  id: string;
  name: string;
  prompt: string;
  modelId: string;
  avatar?: string;
  autoRun: boolean;
  tags: string[];
  outputFormat: 'markdown' | 'text' | 'json';
  isBuiltIn: boolean;
  createdAt: number;
  updatedAt: number;
}

interface AgentEditorProps {
  isOpen: boolean;
  onClose: () => void;
  agent?: Agent | null;
  mode: 'create' | 'edit';
}

export const AgentEditor: React.FC<AgentEditorProps> = ({
  isOpen,
  onClose,
  agent,
  mode
}) => {
  const { addAgent, updateAgent, deleteAgent } = useAgentsStore();
  const { getAvailableModels, getDefaultModel } = useLLMProvidersStore();

  const [formData, setFormData] = useState<AgentFormData>({
    name: '',
    prompt: '',
    modelId: '',
    avatar: '🤖',
    autoRun: false,
    tags: [] as string[],
    outputFormat: 'markdown'
  });

  const [tagInput, setTagInput] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const availableModels = getAvailableModels();
  const defaultModel = getDefaultModel();

  useEffect(() => {
    if (agent && mode === 'edit') {
      setFormData({
        name: agent.name,
        prompt: agent.prompt,
        modelId: agent.modelId || '',
        avatar: agent.avatar || '🤖',
        autoRun: agent.autoRun,
        tags: [...agent.tags],
        outputFormat: agent.outputFormat
      });
    } else {
      // Reset for create mode
      setFormData({
        name: '',
        prompt: '',
        modelId: defaultModel ? `${defaultModel.providerId}-${defaultModel.id}` : '',
        avatar: '🤖',
        autoRun: false,
        tags: [],
        outputFormat: 'markdown'
      });
    }
  }, [agent, mode, defaultModel]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.prompt.trim()) {
      return;
    }

    if (mode === 'create') {
      addAgent({
        ...formData,
        isBuiltIn: false
      });
    } else if (agent) {
      updateAgent({
        ...agent,
        ...formData,
        updatedAt: Date.now()
      });
    }

    onClose();
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase();
      if (!formData.tags.includes(newTag)) {
        setFormData(prev => ({
          ...prev,
          tags: [...prev.tags, newTag]
        }));
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleDelete = () => {
    if (agent) {
      deleteAgent(agent.id);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-background rounded-xl p-6 max-w-2xl w-full border border-border max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">
              {mode === 'create' ? 'Create Agent' : 'Edit Agent'}
            </h3>
            <div className="flex items-center gap-2">
              {mode === 'edit' && !agent?.isBuiltIn && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2 rounded-lg hover:bg-destructive/20 text-destructive hover:text-destructive/80 transition-colors"
                  title="Delete agent"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                title="Close"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Name & Avatar */}
            <div className="flex gap-4 mb-4">
              <div className="w-16 h-16 flex items-center justify-center text-3xl bg-muted rounded-lg border border-border">
                {formData.avatar}
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                  placeholder="Agent name"
                  required
                />
              </div>
            </div>

            {/* Avatar */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Avatar
              </label>
              <input
                type="text"
                value={formData.avatar}
                onChange={(e) => setFormData(prev => ({ ...prev, avatar: e.target.value }))}
                className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                placeholder="🤖"
              />
            </div>

            {/* Model Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Model (optional - uses default if not specified)
              </label>
              <select
                value={formData.modelId}
                onChange={(e) => setFormData(prev => ({ ...prev, modelId: e.target.value }))}
                className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              >
                <option value="">Use default model</option>
                {availableModels.map((model) => (
                  <option key={`${model.providerId}-${model.id}`} value={`${model.providerId}-${model.id}`}>
                    {model.name} ({model.providerId})
                  </option>
                ))}
              </select>
            </div>

            {/* Prompt */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                System Prompt
              </label>
              <textarea
                value={formData.prompt}
                onChange={(e) => setFormData(prev => ({ ...prev, prompt: e.target.value }))}
                rows={8}
                className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-none"
                placeholder="Enter the system prompt that defines how this agent should process content..."
                required
              />
            </div>

            {/* Tags */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Tags
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-primary/20 text-primary rounded-full text-sm border border-primary/30"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="text-primary hover:text-primary/80"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                placeholder="Add tags (press Enter)"
              />
            </div>

            {/* Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Output Format
                </label>
                <select
                  value={formData.outputFormat}
                  onChange={(e) => setFormData(prev => ({ ...prev, outputFormat: e.target.value as AgentFormData['outputFormat'] }))}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                >
                  <option value="markdown">Markdown</option>
                  <option value="text">Plain Text</option>
                  <option value="json">JSON</option>
                </select>
              </div>

              <div className="flex items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.autoRun}
                    onChange={(e) => setFormData(prev => ({ ...prev, autoRun: e.target.checked }))}
                    className="w-4 h-4 bg-background border-input text-primary focus:ring-ring rounded"
                  />
                  <span className="text-sm">Auto-run on new transcripts</span>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!formData.name.trim() || !formData.prompt.trim()}
                className="px-4 py-2 bg-primary hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                {mode === 'create' ? 'Create Agent' : 'Save Changes'}
              </button>
            </div>
          </form>

          {/* Delete Confirmation */}
          <AnimatePresence>
            {showDeleteConfirm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-60"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-background rounded-xl p-6 max-w-md w-full border border-border"
                >
                  <h4 className="text-lg font-semibold mb-4">Delete Agent</h4>
                  <p className="text-muted-foreground mb-6">
                    Are you sure you want to delete "{agent?.name}"? This action cannot be undone.
                  </p>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDelete}
                      className="px-4 py-2 bg-destructive hover:bg-destructive/90 rounded-lg transition-colors"
                    >
                      Delete Agent
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};