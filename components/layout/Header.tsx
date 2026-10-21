'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { CorregeLogo } from '@/components/common/CorregeLogo';
import { User, LogOut, ArrowLeftRight, GraduationCap, BookOpen, Settings, Bell } from 'lucide-react';

export const Header: React.FC = () => {
  const { currentUser, login, logout, setCurrentScreen, setActiveExamId, isBackendOnline, backendUrl } = useApp();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const router = useRouter();

  const isStudent = currentUser.role === 'estudante';

  const notifications = [
    {
      id: 1,
      title: 'Lote de 34 provas corrigido',
      desc: 'P1 - Direito Constitucional I foi processada com 100% de precisão OMR.',
      time: 'Há 12 min',
      read: false,
      action: () => {
        setActiveExamId('exam-1');
        router.push('/resultados?examId=exam-1');
        setShowNotifications(false);
      },
    },
    {
      id: 2,
      title: 'Novo aluno importado',
      desc: 'Matrícula 2024.1.150 associada à Turma D - Direito Tributário.',
      time: 'Há 1 hora',
      read: true,
      action: () => {
        router.push('/alunos');
        setShowNotifications(false);
      },
    },
    {
      id: 3,
      title: 'Banco de Questões sincronizado',
      desc: '15 novas questões de Direito Constitucional, Penal e Civil adicionadas.',
      time: 'Há 3 horas',
      read: true,
      action: () => {
        router.push('/banco-questoes');
        setShowNotifications(false);
      },
    },
  ];

  return (
    <header className="app-shell-header h-16 bg-white border-b border-slate-200 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 select-none print:hidden">
      {/* Brand Logo on the left */}
      <div className="flex items-center gap-3">
        <CorregeLogo />
        <span className="hidden sm:inline-block text-[11px] font-semibold text-slate-400 border-l border-slate-200 pl-3">
          Católica SC • SGP
        </span>

        {/* Backend QAS Status Badge */}
        <div
          title={isBackendOnline ? `Conectado ao Backend QAS (${backendUrl})` : `Backend Offline (Modo Local)`}
          className={`hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold transition ${
            isBackendOnline
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isBackendOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          {isBackendOnline ? 'QAS Conectado' : 'Modo Local'}
        </div>
      </div>

      {/* Right Controls: Notifications + User Profile */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Notifications Button */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfileMenu(false);
            }}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition relative cursor-pointer"
            title="Notificações"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl py-3 z-40 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 pb-2.5 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Notificações</span>
                <span className="text-[10px] font-semibold text-[#9E0B1A] cursor-pointer hover:underline">
                  Marcar lidas
                </span>
              </div>
              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={n.action}
                    className="w-full p-3 text-left hover:bg-slate-50/80 transition flex items-start gap-2.5 cursor-pointer"
                  >
                    <div className="w-2 h-2 rounded-full bg-[#9E0B1A] mt-1.5 flex-shrink-0"></div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800">{n.title}</p>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{n.desc}</p>
                      <span className="text-[10px] text-slate-400 mt-1 block">{n.time}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Profile Avatar / Menu */}
        <div className="relative">
          <button
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-3 pl-2 cursor-pointer focus:outline-none"
          >
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-900 leading-tight">
                {currentUser.fullName}
              </span>
              <span className="text-[10px] text-slate-400 leading-tight font-mono">
                {currentUser.email}
              </span>
            </div>

            <div className="relative w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 bg-red-100 text-[#9E0B1A]">
              <BookOpen className="w-4 h-4" />
            </div>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-40 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-800">{currentUser.fullName}</p>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">{currentUser.email}</p>
                <span className="inline-block mt-2 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-red-50 text-[#9E0B1A]">
                  Docente Titular (@catolicasc.org.br)
                </span>
              </div>

              <div className="p-1 space-y-0.5">
                <button
                  onClick={() => {
                    setCurrentScreen('configuracoes');
                    router.push('/configuracoes');
                    setShowProfileMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-lg transition text-left cursor-pointer"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  Configurações
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
