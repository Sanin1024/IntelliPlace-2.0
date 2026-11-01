import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';

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

  const styles: Record<string, React.CSSProperties> = {
    container: {
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      maxWidth: '380px',
      width: 'calc(100% - 40px)',
      pointerEvents: 'none',
    },
    toast: {
      padding: '12px 20px',
      borderRadius: 'var(--radius-md)',
      color: '#fff',
      fontWeight: 600,
      fontSize: '14px',
      boxShadow: 'var(--shadow-lg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      pointerEvents: 'auto',
      wordBreak: 'break-word',
    },
    success: { background: 'var(--color-success)' },
    error: { background: 'var(--color-danger)' },
    info: { background: 'var(--color-info)' },
    warning: { background: 'var(--color-warning)' },
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, showToast, removeToast }}>
      {children}
      <div style={styles.container} aria-live="assertive" aria-atomic="true">
        {toasts.map((item) => (
          <div
            key={item.id}
            className="slide-in-right"
            style={{
              ...styles.toast,
              background: styles[item.type]?.background || 'var(--color-primary)',
            }}
          >
            <span>{item.message}</span>
            <button
              onClick={() => removeToast(item.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '16px',
                padding: '0 4px',
                lineHeight: 1,
                opacity: 0.8,
              }}
              aria-label="Dismiss toast"
            >
              &times;
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
