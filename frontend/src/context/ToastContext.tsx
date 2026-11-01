import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

export type Toast = ToastMessage;

interface ToastContextType {
  toasts: ToastMessage[];
  addToast: (message: string, type?: ToastType) => void;
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

type ToastListener = (
  message: string,
  type: ToastType,
  duration: number
) => void;

let globalToastListener: ToastListener | null = null;

export const toast = {
  success: (message: string, duration = 4000) =>
    globalToastListener?.(message, 'success', duration),

  error: (message: string, duration = 5000) =>
    globalToastListener?.(message, 'error', duration),

  info: (message: string, duration = 4000) =>
    globalToastListener?.(message, 'info', duration),

  warning: (message: string, duration = 4000) =>
    globalToastListener?.(message, 'warning', duration),
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', duration = 4000) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, message, type }]);

      if (duration > 0) {
        window.setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const addToast = useCallback(
    (message: string, type: ToastType = 'info') => {
      showToast(message, type, type === 'error' ? 5000 : 4000);
    },
    [showToast]
  );

  useEffect(() => {
    globalToastListener = showToast;
    return () => {
      if (globalToastListener === showToast) {
        globalToastListener = null;
      }
    };
  }, [showToast]);

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={18} style={{ color: 'var(--success-text)', flexShrink: 0 }} />;
      case 'error':
        return <XCircle size={18} style={{ color: 'var(--error-text)', flexShrink: 0 }} />;
      case 'warning':
        return <AlertTriangle size={18} style={{ color: 'var(--warning-text)', flexShrink: 0 }} />;
      default:
        return <Info size={18} style={{ color: 'var(--info-text)', flexShrink: 0 }} />;
    }
  };

  const getBorderColor = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'var(--success-border)';
      case 'error':
        return 'var(--error-border)';
      case 'warning':
        return 'var(--warning-border)';
      default:
        return 'var(--info-border)';
    }
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, showToast, removeToast }}>
      {children}
      <div
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          maxWidth: '400px',
          width: 'calc(100% - 40px)',
          pointerEvents: 'none',
        }}
        aria-live="assertive"
        aria-atomic="true"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            className="slide-in-right"
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--surface)',
              border: `1px solid ${getBorderColor(item.type)}`,
              color: 'var(--text-primary)',
              fontSize: '14px',
              fontWeight: 500,
              boxShadow: 'var(--shadow-dropdown)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              pointerEvents: 'auto',
              wordBreak: 'break-word',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {getIcon(item.type)}
              <span>{item.message}</span>
            </div>
            <button
              onClick={() => removeToast(item.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2px',
                borderRadius: 'var(--radius-none)',
                transition: 'color var(--transition-fast)',
              }}
              aria-label="Dismiss toast"
            >
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
