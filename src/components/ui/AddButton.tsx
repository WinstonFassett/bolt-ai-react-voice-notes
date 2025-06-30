import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PlusIcon,
  MicrophoneIcon,
  DocumentArrowUpIcon,
  LinkIcon
} from '@heroicons/react/24/outline';

interface AddButtonProps {
  onStartRecording: () => void;
  onUploadFile: () => void;
  onFromUrl: () => void;
  onCreateNote: () => void;
}

export const AddButton: React.FC<AddButtonProps> = ({
  onStartRecording,
  onUploadFile,
  onFromUrl,
  onCreateNote
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const options = [
    {
      icon: MicrophoneIcon,
      label: 'Record Audio',
      action: () => {
        onStartRecording();
        setIsOpen(false);
      },
      color: 'text-red-400'
    },
    {
      icon: DocumentArrowUpIcon,
      label: 'Upload File',
      action: () => {
        onUploadFile();
        setIsOpen(false);
      },
      color: 'text-green-400'
    },
    {
      icon: LinkIcon,
      label: 'From URL',
      action: () => {
        onFromUrl();
        setIsOpen(false);
      },
      color: 'text-blue-400'
    },
    {
      icon: PlusIcon,
      label: 'New Note',
      action: () => {
        onCreateNote();
        setIsOpen(false);
      },
      color: 'text-purple-400'
    }
  ];

  return (
    <div className="relative">
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/20 z-40"
          />
        )}
      </AnimatePresence>

      {/* Options Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            className="absolute top-full right-0 mt-4 bg-gray-800 rounded-2xl border border-gray-700 shadow-2xl z-50 min-w-[200px] overflow-hidden"
          >
            {options.map((option, index) => (
              <motion.button
                key={option.label}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={option.action}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-700 transition-colors text-left"
              >
                <option.icon className={`w-5 h-5 ${option.color}`} />
                <span className="text-white font-medium">{option.label}</span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-indigo-600 hover:bg-indigo-700 rounded-full flex items-center justify-center shadow-lg transition-colors"
      >
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <PlusIcon className="w-6 h-6 text-white" />
        </motion.div>
      </motion.button>
    </div>
  );
};