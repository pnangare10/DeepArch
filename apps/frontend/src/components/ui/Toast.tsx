import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const toast = useCallback((message: string, type: ToastType = 'error') => {
    const id = ++counter.current;
    setItems((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = (id: number) => setItems((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {items.map((item) => (
          <div
            key={item.id}
            className={`flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg border pointer-events-auto animate-in slide-in-from-bottom-2 duration-200 ${
              item.type === 'error'
                ? 'bg-red-950 border-red-700 text-red-200'
                : item.type === 'warning'
                ? 'bg-yellow-950 border-yellow-700 text-yellow-200'
                : 'bg-green-950 border-green-700 text-green-200'
            }`}
          >
            {item.type === 'error' ? (
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
            ) : item.type === 'warning' ? (
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-yellow-400" />
            ) : (
              <CheckCircle className="w-4 h-4 mt-0.5 shrink-0 text-green-400" />
            )}
            <span className="text-sm flex-1">{item.message}</span>
            <button
              onClick={() => dismiss(item.id)}
              className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
            >
              <X className="w-3.5 h-3.5" />
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
  return ctx.toast;
}
