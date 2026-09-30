import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

interface Toast {
  id: number;
  message: string;
  kind: 'error' | 'success' | 'info';
}

const ToastContext = createContext<{
  toasts: Toast[];
  push: (message: string, kind?: Toast['kind']) => void;
  dismiss: (id: number) => void;
  notifyError: (e: unknown) => void;
}>({
  toasts: [],
  push: () => {},
  dismiss: () => {},
  notifyError: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

let seq = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback(
    (message: string, kind: Toast['kind'] = 'info') => {
      const id = seq++;
      setToasts((t) => [...t, { id, message, kind }]);
      setTimeout(() => dismiss(id), 6000);
    },
    [dismiss],
  );

  const notifyError = useCallback(
    (e: unknown) => {
      const msg =
        e instanceof Error ? e.message : typeof e === 'string' ? e : 'Ocorreu um erro inesperado.';
      push(msg, 'error');
    },
    [push],
  );

  return (
    <ToastContext.Provider value={{ toasts, push, dismiss, notifyError }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="alert"
            className={`rounded-lg border px-4 py-3 shadow-lg text-sm bg-white ${
              t.kind === 'error'
                ? 'border-red-300 text-red-800'
                : t.kind === 'success'
                  ? 'border-green-300 text-green-800'
                  : 'border-slate-300 text-slate-800'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <span>{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                className="text-slate-400 hover:text-slate-700 font-bold"
                aria-label="Fechar aviso"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
