import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrashIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { renderMarkdown } from '../../utils/markdownRenderer';

interface TakeawayCardProps {
  takeaway: {
    id: string;
    title: string;
    content: string;
    createdAt?: number;
    created?: number;
  };
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export const TakeawayCard: React.FC<TakeawayCardProps> = ({
  takeaway,
  onSelect,
  onDelete
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    onDelete(takeaway.id);
    setShowDeleteConfirm(false);
  };

  return (
    <>
      <div 
        className="card bg-indigo-900/10 border-indigo-700/30 hover:bg-indigo-900/20 transition-colors cursor-pointer group ml-6 relative"
        onClick={() => onSelect(takeaway.id)}
      >
        {/* Visual nesting indicator */}
        <div className="absolute -left-6 top-0 bottom-0 w-0.5 bg-indigo-500/30"></div>
        <div className="absolute -left-4 top-6 w-3 h-0.5 bg-indigo-500/30"></div>
        
        <div className="flex items-start justify-between mb-2">
          <h4 className="font-medium text-indigo-300 flex-1 pr-2">{takeaway.title}</h4>
          <button
            onClick={handleDeleteClick}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-600/20 rounded transition-all"
            title="Delete takeaway"
          >
            <TrashIcon className="w-4 h-4 text-red-400" />
          </button>
        </div>
        <div className="text-sm text-gray-300 prose prose-invert prose-sm max-w-none max-h-32 overflow-hidden">
          <div 
            dangerouslySetInnerHTML={{ 
              __html: renderMarkdown(takeaway.content.substring(0, 400)) + 
                     (takeaway.content.length > 400 ? '...' : '')
            }}
          />
        </div>
        <div className="mt-2 text-xs text-gray-500">
          Click to view full • {formatDate(takeaway.createdAt || takeaway.created || 0)}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-white mb-4">Delete AI Takeaway</h3>
              <p className="text-gray-300 mb-2">
                Are you sure you want to delete "{takeaway.title}"?
              </p>
              <p className="text-gray-400 text-sm mb-6">
                This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  Delete Takeaway
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};