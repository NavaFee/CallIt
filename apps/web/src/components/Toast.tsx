'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

export interface Toast {
  id: number;
  kind: 'tx' | 'money' | 'error';
  text: string;
}

const ToastContext = createContext<{ push: (kind: Toast['kind'], text: string) => void }>({
  push: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const push = useCallback((kind: Toast['kind'], text: string) => {
    const id = nextId.current++;
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 bottom-24 z-[80] flex flex-col gap-2 sm:left-auto sm:right-6 sm:w-[360px]">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-2 rounded-2xl border px-4 py-3 text-[13px] font-extrabold"
            style={{
              animation: 'ci-pop 0.35s cubic-bezier(0.2, 1.4, 0.4, 1)',
              background: 'rgba(20,25,39,0.96)',
              borderColor:
                t.kind === 'error'
                  ? 'rgba(255,61,94,0.5)'
                  : t.kind === 'money'
                    ? 'rgba(255,197,61,0.5)'
                    : 'var(--line)',
              color: t.kind === 'money' ? 'var(--gold)' : t.kind === 'error' ? 'var(--down)' : 'var(--text)',
            }}
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{
                background:
                  t.kind === 'error' ? 'var(--down)' : t.kind === 'money' ? 'var(--gold)' : 'var(--sui)',
              }}
            />
            <span className="truncate">{t.text}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
