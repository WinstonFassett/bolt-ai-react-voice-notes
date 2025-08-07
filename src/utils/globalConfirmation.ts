// Define the type for the confirmation options
export interface ConfirmationOptions {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
}

// Extend the Window interface to include our confirmAction function
declare global {
  interface Window {
    confirmAction?: (options: ConfirmationOptions) => Promise<boolean>;
  }
}

// Initialize the global confirmation function
export function initializeGlobalConfirmation(
  confirmFn: (options: ConfirmationOptions) => Promise<boolean>
) {
  window.confirmAction = confirmFn;
}
