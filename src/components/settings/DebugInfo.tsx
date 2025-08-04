import React from 'react';
import { useDebugStore } from '../../stores/debugStore';

const DebugInfo: React.FC = () => {
  const { debugInfo, clearDebugInfo } = useDebugStore();
  
  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-4">
      <div className="flex flex-row items-center justify-between">
        <h3 className="text-sm font-medium text-gray-300">Debug Information</h3>
        <button
          onClick={clearDebugInfo}
          className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
        >
          Clear Log
        </button>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between text-gray-400 border-b border-gray-700 pb-1">
          <span>Time</span>
          <span>Event</span>
        </div>
        
        {debugInfo.length > 0 ? (
          <div className="max-h-60 overflow-y-auto space-y-1">
            {debugInfo.map((item, index) => (
              <div key={index} className="flex justify-between text-gray-300">
                <span className="text-gray-400">{item.timestamp}</span>
                <span>{item.event}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-400 italic">No debug events recorded</div>
        )}
        
        <div className="text-xs text-gray-500 pt-2">
          Debug events are stored in memory and cleared on page refresh
        </div>
      </div>
    </div>
  );
};

export default DebugInfo;
