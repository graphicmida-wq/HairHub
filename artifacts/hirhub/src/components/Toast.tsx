import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '../lib/utils';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

type Listener = (toasts: ToastMessage[]) => void;

class ToastStore {
  private toasts: ToastMessage[] = [];
  private listeners: Listener[] = [];

  show(message: string, type: ToastType = 'success') {
    const id = Math.random().toString(36).slice(2);
    this.toasts = [...this.toasts, { id, message, type }];
    this.emit();
    setTimeout(() => this.dismiss(id), 4000);
  }

  dismiss(id: string) {
    this.toasts = this.toasts.filter(t => t.id !== id);
    this.emit();
  }

  subscribe(listener: Listener) {
    this.listeners.push(listener);
    listener(this.toasts);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private emit() {
    this.listeners.forEach(l => l(this.toasts));
  }
}

export const toast = new ToastStore();

export const useToasts = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  useEffect(() => toast.subscribe(setToasts), []);
  return toasts;
};

export const Toaster = () => {
  const toasts = useToasts();
  const dismiss = useCallback((id: string) => toast.dismiss(id), []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-28 md:bottom-8 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 items-center pointer-events-none w-[calc(100vw-2rem)] max-w-sm">
      {toasts.map(t => (
        <div
          key={t.id}
          className={cn(
            "w-full pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl text-sm font-medium",
            t.type === 'success' ? "bg-stone-900 text-white" : "bg-red-600 text-white"
          )}
        >
          {t.type === 'success'
            ? <CheckCircle2 className="w-4 h-4 shrink-0 opacity-80" />
            : <AlertCircle className="w-4 h-4 shrink-0 opacity-80" />
          }
          <span className="flex-1">{t.message}</span>
          <button onClick={() => dismiss(t.id)} className="opacity-60 hover:opacity-100 transition-opacity">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
