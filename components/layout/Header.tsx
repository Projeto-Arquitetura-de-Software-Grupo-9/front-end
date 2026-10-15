'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { CorregeLogo } from '@/components/common/CorregeLogo';
import { Search, Bell, User, BookOpen, FileCheck } from 'lucide-react';

export const Header: React.FC = () => {
  const router = useRouter();
  const { searchQuery, setSearchQuery, setCurrentScreen, setActiveExamId } = useApp();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

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
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 flex items-center justify-between px-6 select-none print:hidden">
      {/* Brand Logo on the left */}
      <Link href="/provas" className="flex items-center hover:opacity-90 transition cursor-pointer">
        <CorregeLogo />
      </Link>

      {/* Right Controls: Search, Notifications, Profile */}
      <div className="flex items-center gap-4 sm:gap-6">
        {/* Global Search Input */}
        <div className="relative w-64 sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar provas, alunos ou questões..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-600 font-semibold cursor-pointer"
            >
              Limpar
            </button>
          )}
        </div>

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
                <span className="text-[10px] font-semibold text-blue-600 cursor-pointer hover:underline">
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
                    <div className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 flex-shrink-0"></div>
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
                Professor(a)
              </span>
              <span className="text-[11px] font-medium text-slate-400">
                Católica SC
              </span>
            </div>
            <div className="relative w-9 h-9 rounded-full overflow-hidden ring-1 ring-slate-200 bg-slate-100 flex items-center justify-center flex-shrink-0">
              <img
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"
                alt="Professor(a)"
                className="w-full h-full object-cover"
                onError={(e) => {
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
                    router.push('/configuracoes');
                    setShowProfileMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-lg transition text-left cursor-pointer"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  Perfil & Configurações
                </button>
                <button
                  onClick={() => {
                    router.push('/provas');
                    setShowProfileMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-lg transition text-left cursor-pointer"
                >
                  <BookOpen className="w-4 h-4 text-slate-400" />
                  Minhas Provas
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
