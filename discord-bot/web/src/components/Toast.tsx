import React from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { ToastMessage } from '../types';

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full">
      {toasts.map((toast) => {
        let Icon = CheckCircle2;
        let borderClass = 'border-emerald-500/30 text-emerald-400';
        let bgClass = 'bg-[#0E1612]/90';

        if (toast.type === 'error') {
          Icon = XCircle;
          borderClass = 'border-rose-500/30 text-rose-400';
          bgClass = 'bg-[#180F12]/90';
        } else if (toast.type === 'info') {
          Icon = Info;
          borderClass = 'border-indigo-500/30 text-indigo-400';
          bgClass = 'bg-[#0F131E]/90';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-2xl transition-all animate-in slide-in-from-bottom-2 ${bgClass} ${borderClass}`}
          >
            <div className="flex items-center gap-2.5">
              <Icon className="w-5 h-5 shrink-0" />
              <p className="text-sm font-medium text-white">{toast.message}</p>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
