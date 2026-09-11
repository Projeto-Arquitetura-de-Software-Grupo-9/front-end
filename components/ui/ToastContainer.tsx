'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        let bgColor = 'bg-white border-slate-200 text-slate-800';
        let Icon = Info;
        let iconColor = 'text-blue-500';

        if (toast.type === 'success') {
          bgColor = 'bg-emerald-50 border-emerald-200 text-emerald-950';
          Icon = CheckCircle2;
          iconColor = 'text-emerald-600';
        } else if (toast.type === 'error') {
          bgColor = 'bg-rose-50 border-rose-200 text-rose-950';
          Icon = AlertCircle;
          iconColor = 'text-rose-600';
        } else if (toast.type === 'warning') {
          bgColor = 'bg-amber-50 border-amber-200 text-amber-950';
          Icon = AlertTriangle;
          iconColor = 'text-amber-600';
        } else if (toast.type === 'info') {
          bgColor = 'bg-indigo-50 border-indigo-200 text-indigo-950';
          Icon = Info;
          iconColor = 'text-indigo-600';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg transition-all duration-300 transform translate-y-0 ${bgColor}`}
          >
            <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconColor}`} />
            <div className="flex-1">
              <h4 className="text-sm font-semibold leading-snug">{toast.title}</h4>
              {toast.message && (
                <p className="text-xs mt-0.5 text-slate-600 leading-relaxed">{toast.message}</p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-700 transition p-0.5 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
