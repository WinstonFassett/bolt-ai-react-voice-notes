import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  XMarkIcon,
  PlayIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { useAgentsStore } from '../stores/agentsStore';
import { Button } from './ui/button';

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
          className="bg-background rounded-xl p-6 max-w-md w-full border border-border max-h-[80vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Run AI Agents</h3>
            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="rounded-lg"
            >
              <XMarkIcon className="w-5 h-5 text-muted-foreground" />
            </Button>
          </div>

          {/* Agent Selection */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Select agents to run ({selectedAgents.size} of {availableAgents.length})
              </span>
              <Button
                onClick={handleSelectAll}
                variant="link"
                className="text-sm"
              >
                {selectedAgents.size === availableAgents.length ? 'Deselect All' : 'Select All'}
              </Button>
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
                        ? 'bg-primary/10 border-primary/30' 
                        : 'bg-muted/50 border-border hover:bg-muted'
                    }`}
                    onClick={() => handleAgentToggle(agent.id)}
                  >
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleAgentToggle(agent.id)}
                        className="w-4 h-4 text-primary bg-background border-input rounded focus:ring-ring"
                      />
                      
                      {/* Status indicator */}
                      {status === 'processing' && (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="absolute -top-1 -right-1 w-3 h-3 border border-primary border-t-transparent rounded-full"
                        />
                      )}
                      {status === 'completed' && (
                        <CheckIcon className="absolute -top-1 -right-1 w-3 h-3 text-success" />
                      )}
                      {status === 'failed' && (
                        <XMarkIcon className="absolute -top-1 -right-1 w-3 h-3 text-destructive" />
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-lg">{agent.avatar}</span>
                      <div>
                        <div className="font-medium">{agent.name}</div>
                        <div className="text-xs text-muted-foreground">
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
            <div className="mb-4 p-3 bg-primary/10 border border-primary/30 rounded-lg">
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full"
                />
                <span className="text-sm text-primary">
                  {processingStatus || 'Processing...'}
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              onClick={onClose}
              variant="outline"
            >
              {completedAgents.size > 0 || failedAgents.size > 0 ? 'Done' : 'Cancel'}
            </Button>
            <Button
              onClick={handleRunSelected}
              disabled={selectedAgents.size === 0 || isProcessing}
              className="flex items-center gap-2"
            >
              <PlayIcon className="w-4 h-4" />
              Run Selected ({selectedAgents.size})
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};