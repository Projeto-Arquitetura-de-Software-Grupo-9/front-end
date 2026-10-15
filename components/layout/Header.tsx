'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { CorregeLogo } from '@/components/common/CorregeLogo';
import { User, LogOut, ArrowLeftRight, GraduationCap, BookOpen, Settings } from 'lucide-react';

export const Header: React.FC = () => {
  const { currentUser, login, logout, setCurrentScreen } = useApp();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const isStudent = currentUser.role === 'estudante';

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 select-none print:hidden">
      {/* Brand Logo on the left */}
      <div className="flex items-center gap-3">
        <CorregeLogo />
        <span className="hidden sm:inline-block text-[11px] font-semibold text-slate-400 border-l border-slate-200 pl-3">
          Católica SC • SGP
        </span>
      </div>

      {/* Right Controls: Quick Switch Role + User Profile */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Quick Switch Button (Demo helper for easy testing between Teacher and Student) */}
        <button
          onClick={() => {
            if (isStudent) {
              login('professor');
            } else {
              login('estudante');
            }
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition cursor-pointer shadow-2xs"
          title="Alternar rapidamente entre visão do Professor e visão do Aluno"
        >
          <ArrowLeftRight className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden md:inline">Alternar: </span>
          <span className={isStudent ? 'text-[#9E0B1A] font-bold' : 'text-blue-700 font-bold'}>
            {isStudent ? 'Ver como Professor' : 'Ver como Aluno'}
          </span>
        </button>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2.5 text-left hover:opacity-90 transition cursor-pointer p-1 rounded-xl hover:bg-slate-50"
          >
            <div className="flex flex-col text-right">
              <span className="text-xs font-bold text-slate-900 leading-tight">
                {currentUser.fullName}
              </span>
              <span className="text-[10px] text-slate-400 leading-tight font-mono">
                {currentUser.email}
              </span>
            </div>

            <div className={`relative w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
              isStudent ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-[#9E0B1A]'
            }`}>
              {isStudent ? (
                <GraduationCap className="w-4 h-4" />
              ) : (
                <BookOpen className="w-4 h-4" />
              )}
            </div>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-40 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-800">{currentUser.fullName}</p>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">{currentUser.email}</p>
                <span className={`inline-block mt-2 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                  isStudent
                    ? 'bg-blue-50 text-blue-700'
                    : 'bg-red-50 text-[#9E0B1A]'
                }`}>
                  {isStudent ? 'Estudante (@catolicasc.edu.br)' : 'Docente Titular (@catolicasc.org.br)'}
                </span>
              </div>

              <div className="p-1 space-y-0.5">
                <button
                  onClick={() => {
                    setCurrentScreen(isStudent ? 'portal-aluno' : 'configuracoes');
                    setShowProfileMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-lg transition text-left cursor-pointer"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  {isStudent ? 'Meu Portal de Notas' : 'Meu Perfil & LGPD'}
                </button>

                <button
                  onClick={() => {
                    logout();
                    setShowProfileMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-lg transition text-left cursor-pointer font-semibold"
                >
                  <LogOut className="w-4 h-4 text-red-500" />
                  Sair da Conta (Logout)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
