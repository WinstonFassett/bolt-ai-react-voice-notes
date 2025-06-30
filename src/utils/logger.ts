// Production-safe logging utility
const isDevelopment = import.meta.env.DEV;
const isDebugMode = () => {
  if (typeof window !== 'undefined') {
    return window.location.search.includes('debug=true') || 
           window.location.hash.includes('debug') ||
           localStorage.getItem('debug') === 'true';
  }
  return false;
};

const shouldLog = isDevelopment || isDebugMode();

export const logger = {
  log: (...args: any[]) => {
    if (shouldLog) {
      console.log(...args);
    }
  },
  
  error: (...args: any[]) => {
    // Always log errors
    console.error(...args);
  },
  
  warn: (...args: any[]) => {
    if (shouldLog) {
      console.warn(...args);
    }
  },
  
  info: (...args: any[]) => {
    if (shouldLog) {
      console.info(...args);
    }
  },
  
  debug: (...args: any[]) => {
    if (shouldLog) {
      console.debug(...args);
    }
  }
};

// Helper to enable debug mode
export const enableDebugMode = () => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('debug', 'true');
    console.log('Debug mode enabled. Refresh the page to see debug logs.');
  }
};

// Helper to disable debug mode
export const disableDebugMode = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('debug');
    console.log('Debug mode disabled. Refresh the page to hide debug logs.');
  }
};