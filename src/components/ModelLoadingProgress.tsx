import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Progress } from './Progress';

import { ProgressItem } from '../stores/transcriptionStore';

interface ModelLoadingProgressProps {
  progressItems: ProgressItem[];
  isVisible: boolean;
  className?: string;
}

export const ModelLoadingProgress: React.FC<ModelLoadingProgressProps> = ({
  progressItems,
  isVisible,
  className = ''
}) => {
  const hasIncompleteItems = progressItems.some(item => item.progress < 100);
  if (!isVisible || progressItems.length === 0 || !hasIncompleteItems) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`card bg-indigo-900/20 border-indigo-700/30 ${className}`}
      >
        <h3 className="text-sm font-medium text-indigo-300 mb-3">
          Loading AI Model...
        </h3>
        <div className="space-y-2">
          <AnimatePresence>
            {progressItems
              .filter(item => item.progress < 100)
              .map((item) => (
                <motion.div 
                  key={item.file}
                  className="space-y-1"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex justify-between text-xs text-indigo-400">
                    <span>{item.file}</span>
                    <span>{Math.round(item.progress)}%</span>
                  </div>
                  <Progress percentage={item.progress} />
                </motion.div>
              ))}
          </AnimatePresence>
        </div>
        <p className="text-xs text-indigo-400 mt-2">
          AI models are loading for the first time. This may take a moment.
        </p>
      </motion.div>
    </AnimatePresence>
  );
};