import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  XMarkIcon,
  PlayIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { useAgentsStore } from '../../stores/agentsStore';

interface RunAgentsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  noteId: string;
  onComplete?: () => void;
}

export const RunAgentsDialog: React.FC<RunAgentsDialogProps> = ({
  isOpen,
  onClose,
  noteId,
  onComplete
}) => {
  const {
    getAvailableAgents,
    processNoteWithAgent,
    isProcessing,
    processingStatus
  } = useAgentsStore();

  const availableAgents = getAvailableAgents();
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set());
  const [completedAgents, setCompletedAgents] = useState<Set<string>>(new Set());
  const [failedAgents, setFailedAgents] = useState<Set<string>>(new Set());
  const [currentlyProcessing, setCurrentlyProcessing] = useState<string | null>(null);

  const handleAgentToggle = (agentId: string) => {
    const newSelected = new Set(selectedAgents);
    if (newSelected.has(agentId)) {
      newSelected.delete(agentId);
    } else {
      newSelected.add(agentId);
    }
    setSelectedAgents(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedAgents.size === availableAgents.length) {
      setSelectedAgents(new Set());
    } else {
      setSelectedAgents(new Set(availableAgents.map(a => a.id)));
    }
  };

  const handleRunSelected = async () => {
    if (selectedAgents.size === 0) return;

    const agentsToRun = Array.from(selectedAgents);
    setCompletedAgents(new Set());
    setFailedAgents(new Set());

    for (const agentId of agentsToRun) {
      setCurrentlyProcessing(agentId);
      
      try {
        const result = await processNoteWithAgent(noteId, agentId);
        if (result.success) {
          setCompletedAgents(prev => new Set([...prev, agentId]));
        } else {
          setFailedAgents(prev => new Set([...prev, agentId]));
        }
      } catch (error) {
        setFailedAgents(prev => new Set([...prev, agentId]));
      }
    }

    setCurrentlyProcessing(null);
    onComplete?.();
  };

  const getAgentStatus = (agentId: string) => {
    if (currentlyProcessing === agentId) return 'processing';
    if (completedAgents.has(agentId)) return 'completed';
    if (failedAgents.has(agentId)) return 'failed';
    return 'pending';
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
          className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-gray-700 max-h-[80vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">Run AI Agents</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Agent Selection */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">
                Select agents to run ({selectedAgents.size} of {availableAgents.length})
              </span>
              <button
                onClick={handleSelectAll}
                className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                {selectedAgents.size === availableAgents.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {availableAgents.map((agent) => {
                const status = getAgentStatus(agent.id);
                const isSelected = selectedAgents.has(agent.id);

                return (
                  <div
                    key={agent.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                      isSelected 
                        ? 'bg-indigo-900/20 border-indigo-700/30' 
                        : 'bg-gray-700/30 border-gray-600/30 hover:bg-gray-700/50'
                    }`}
                    onClick={() => handleAgentToggle(agent.id)}
                  >
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleAgentToggle(agent.id)}
                        className="w-4 h-4 text-indigo-600 bg-gray-700 border-gray-600 rounded focus:ring-indigo-500"
                      />
                      
                      {/* Status indicator */}
                      {status === 'processing' && (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="absolute -top-1 -right-1 w-3 h-3 border border-indigo-500 border-t-transparent rounded-full"
                        />
                      )}
                      {status === 'completed' && (
                        <CheckIcon className="absolute -top-1 -right-1 w-3 h-3 text-green-400" />
                      )}
                      {status === 'failed' && (
                        <XMarkIcon className="absolute -top-1 -right-1 w-3 h-3 text-red-400" />
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-lg">{agent.avatar}</span>
                      <div>
                        <div className="font-medium text-white">{agent.name}</div>
                        <div className="text-xs text-gray-400">
                          {agent.tags.join(', ')}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Processing Status */}
          {currentlyProcessing && (
            <div className="mb-4 p-3 bg-indigo-900/20 border border-indigo-700/30 rounded-lg">
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full"
                />
                <span className="text-sm text-indigo-300">
                  {processingStatus || 'Processing...'}
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              {completedAgents.size > 0 || failedAgents.size > 0 ? 'Done' : 'Cancel'}
            </button>
            <button
              onClick={handleRunSelected}
              disabled={selectedAgents.size === 0 || isProcessing}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <PlayIcon className="w-4 h-4" />
              Run Selected ({selectedAgents.size})
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};