import { useState } from 'react';

interface ConfirmationOptions {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
}

interface UseConfirmationReturn {
  isOpen: boolean;
  confirmationOptions: ConfirmationOptions;
  confirm: (options: ConfirmationOptions) => Promise<boolean>;
  handleConfirm: () => void;
  handleCancel: () => void;
}

export function useConfirmation(): UseConfirmationReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmationOptions, setConfirmationOptions] = useState<ConfirmationOptions>({
    title: '',
    description: '',
  });
  const [resolver, setResolver] = useState<(value: boolean) => void>(() => () => {});

  const confirm = (options: ConfirmationOptions): Promise<boolean> => {
    setConfirmationOptions(options);
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      setResolver(() => resolve);
    });
  };

  const handleConfirm = () => {
    setIsOpen(false);
    resolver(true);
  };

  const handleCancel = () => {
    setIsOpen(false);
    resolver(false);
  };

  return {
    isOpen,
    confirmationOptions,
    confirm,
    handleConfirm,
    handleCancel,
  };
}
