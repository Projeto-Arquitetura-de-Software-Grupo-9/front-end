'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { CorregeLogo } from '@/components/common/CorregeLogo';
import { User } from 'lucide-react';

export const Header: React.FC = () => {
  const { setCurrentScreen } = useApp();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 flex items-center justify-between px-6 select-none print:hidden">
      {/* Brand Logo on the left */}
      <div className="flex items-center">
        <CorregeLogo />
      </div>

      {/* Right Controls: Profile */}
      <div className="flex items-center gap-4 sm:gap-6">
        {/* User Profile */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-3 text-left hover:opacity-90 transition cursor-pointer"
          >
            <div className="flex flex-col text-right">
              <span className="text-xs font-bold text-slate-900 leading-tight">
                Professor(a)
              </span>
              <span className="text-[11px] text-slate-400 leading-tight">
                Universidade
              </span>
            </div>
            <div className="relative w-9 h-9 rounded-full overflow-hidden ring-1 ring-slate-200 bg-slate-100 flex items-center justify-center flex-shrink-0">
              <img
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"
                alt="Professor(a)"
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback to initials if image doesn't load
                  const target = e.currentTarget;
                  target.style.display = 'none';
                  if (target.parentElement) {
                    target.parentElement.innerHTML =
                      '<span class="text-xs font-bold text-slate-700">PR</span>';
                  }
                }}
              />
            </div>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-60 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-40 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-800">Professor(a)</p>
                <p className="text-[11px] text-slate-400">docente@universidade.edu.br</p>
                <span className="inline-block mt-2 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-red-50 text-[#9E0B1A]">
                  Docente Titular
                </span>
              </div>
              <div className="p-1">
                <button
                  onClick={() => {
                    setCurrentScreen('configuracoes');
                    setShowProfileMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-lg transition text-left"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  Perfil
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
