import React from 'react';
import { motion } from 'framer-motion';
import { 
  MicrophoneIcon, 
  DocumentTextIcon, 
  Cog6ToothIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import {
  MicrophoneIcon as MicrophoneIconSolid,
  DocumentTextIcon as DocumentTextIconSolid,
  Cog6ToothIcon as Cog6ToothIconSolid,
  SparklesIcon as SparklesIconSolid
} from '@heroicons/react/24/solid';

interface BottomNavigationProps {
  activeTab: 'record' | 'library' | 'agents' | 'settings';
  onTabChange: (tab: 'record' | 'library' | 'agents' | 'settings') => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onTabChange
}) => {
  const tabs = [
    {
      id: 'library' as const,
      label: 'Library',
      icon: DocumentTextIcon,
      iconSolid: DocumentTextIconSolid,
    },
    {
      id: 'record' as const,
      label: 'Record',
      icon: MicrophoneIcon,
      iconSolid: MicrophoneIconSolid,
    },
    {
      id: 'agents' as const,
      label: 'Agents',
      icon: SparklesIcon,
      iconSolid: SparklesIconSolid,
    },
    {
      id: 'settings' as const,
      label: 'Settings',
      icon: Cog6ToothIcon,
      iconSolid: Cog6ToothIconSolid,
    },
  ];

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="fixed bottom-0 left-0 right-0 z-30 bg-gray-900/60 backdrop-blur-xl border-t border-gray-700/50"
    >
      <div className="h-20 safe-area-bottom">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-around px-4 py-2 h-full">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = isActive ? tab.iconSolid : tab.icon;

            return (
              <motion.button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className="flex flex-col items-center justify-center p-3 min-w-[60px] relative h-full"
                whileTap={{ scale: 0.95 }}
              >
                {/* Active indicator background */}
                {isActive && (
                  <motion.div
                    layoutId="activeTabBg"
                    className="absolute inset-0 bg-indigo-600/10 rounded-lg"
                    transition={{ duration: 0.2 }}
                  />
                )}
                
                <motion.div
                  animate={{
                    scale: isActive ? 1.1 : 1,
                    color: isActive ? '#6366f1' : '#9ca3af',
                  }}
                  transition={{ duration: 0.2 }}
                >
                  <Icon className="w-6 h-6" />
                </motion.div>
                
                <motion.span
                  animate={{
                    color: isActive ? '#6366f1' : '#9ca3af',
                    fontWeight: isActive ? 600 : 400,
                  }}
                  className="text-xs mt-1"
                >
                  {tab.label}
                </motion.span>
              </motion.button>
            );
          })}
          </div>
        </div>
      </div>
    </motion.nav>
  );
};