import { initializeDevTools } from '../stores/rootDebugStore';

/**
 * Initialize debug tools
 */
export const initializeDebugTools = () => {
  initializeDevTools();  
  if (process.env.NODE_ENV === 'development') {
    console.log('Initialized Zustand DevTools');
  }
};
