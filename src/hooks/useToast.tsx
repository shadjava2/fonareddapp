import { Toast } from '@/components/ui/Toast';
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useState,
} from 'react';

interface ToastContextType {
  toasts: Toast[];
  showToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration || 5000, // 5 secondes par défaut
    };

    setToasts((prev) => [...prev, newToast]);
  }, []);

  const showSuccess = useCallback(
    (title: string, message?: string) => {
      showToast({ type: 'success', title, message });
    },
    [showToast]
  );

  const showError = useCallback(
    (title: string, message?: string) => {
      showToast({ type: 'error', title, message, duration: 7000 }); // Plus long pour les erreurs
    },
    [showToast]
  );

  const showWarning = useCallback(
    (title: string, message?: string) => {
      showToast({ type: 'warning', title, message });
    },
    [showToast]
  );

  const showInfo = useCallback(
    (title: string, message?: string) => {
      showToast({ type: 'info', title, message });
    },
    [showToast]
  );

  const value: ToastContextType = {
    toasts,
    showToast,
    removeToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };

  return (
    <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
  );
};
