import { initializeDevTools } from '../stores/rootDebugStore';

/**
 * Initialize debug tools for development environment
 * This is a no-op in production
 */
export const initializeDebugTools = () => {
  if (process.env.NODE_ENV === 'development') {
    console.log('Initializing Zustand DevTools');
    initializeDevTools();
  }
};
