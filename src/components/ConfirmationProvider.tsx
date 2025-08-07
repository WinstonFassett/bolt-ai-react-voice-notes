import { createContext, useContext, ReactNode, useEffect } from 'react';
import { useConfirmation } from '@/hooks/use-confirmation';
import { ConfirmationDialog } from './ConfirmationDialog';
import { initializeGlobalConfirmation } from '@/utils/globalConfirmation';

interface ConfirmationContextType {
  confirm: (options: {
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'default' | 'destructive';
  }) => Promise<boolean>;
}

const ConfirmationContext = createContext<ConfirmationContextType | undefined>(undefined);

export const useConfirmationDialog = () => {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error('useConfirmationDialog must be used within a ConfirmationProvider');
  }
  return context;
};

interface ConfirmationProviderProps {
  children: ReactNode;
}

export function ConfirmationProvider({ children }: ConfirmationProviderProps) {
  const {
    isOpen,
    confirmationOptions,
    confirm,
    handleConfirm,
    handleCancel,
  } = useConfirmation();

  // Initialize the global confirmation function
  useEffect(() => {
    initializeGlobalConfirmation(confirm);
  }, [confirm]);

  return (
    <ConfirmationContext.Provider value={{ confirm }}>
      {children}
      <ConfirmationDialog
        isOpen={isOpen}
        onClose={handleCancel}
        onConfirm={handleConfirm}
        title={confirmationOptions.title}
        description={confirmationOptions.description}
        confirmText={confirmationOptions.confirmText}
        cancelText={confirmationOptions.cancelText}
        variant={confirmationOptions.variant}
      />
    </ConfirmationContext.Provider>
  );
}
