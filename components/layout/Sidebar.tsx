'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { ScreenType } from '@/lib/types';
import {
  Folder,
  Plus,
  FileText,
  TrendingUp,
  GraduationCap,
  Layers,
  Settings,
  UserCheck,
  Award,
  LogOut,
  HelpCircle,
  ClipboardCheck,
} from 'lucide-react';

interface NavItem {
  id: ScreenType;
  label: string;
  icon: React.ElementType;
  badge?: string;
}

const TEACHER_NAV_ITEMS: NavItem[] = [
  { id: 'banco-questoes', label: 'Banco de Questões', icon: Folder },
  { id: 'turmas', label: 'Minhas Turmas', icon: GraduationCap },
  { id: 'criar-prova', label: 'Criar Prova (Template)', icon: Plus },
  { id: 'aplicacoes', label: 'Aplicações & PDFs', icon: Layers },
  { id: 'folha-respostas', label: 'Folha de Respostas', icon: FileText },
  { id: 'lancamento-manual', label: 'Lançamento Manual', icon: ClipboardCheck, badge: '2 pend.' },
  { id: 'resultados', label: 'Resultados & Relatórios', icon: TrendingUp },
  { id: 'configuracoes', label: 'Configurações & LGPD', icon: Settings },
];

const STUDENT_NAV_ITEMS: NavItem[] = [
  { id: 'portal-aluno', label: 'Minhas Notas e Provas', icon: Award },
];

export const Sidebar: React.FC = () => {
  const { currentScreen, setCurrentScreen, currentUser, logout } = useApp();

  const isStudent = currentUser.role === 'estudante';
  const navItems = isStudent ? STUDENT_NAV_ITEMS : TEACHER_NAV_ITEMS;

  return (
    <aside className="w-60 bg-white border-r border-slate-200 flex flex-col select-none print:hidden flex-shrink-0 sticky top-16 self-start h-[calc(100vh-4rem)] overflow-y-auto z-20">
      {/* Institutional Header tag */}
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
        <span>Católica SC</span>
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
          isStudent ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-[#9E0B1A]'
        }`}>
          {isStudent ? 'Visão Aluno' : 'Visão Docente'}
        </span>
      </div>

      {/* Navigation Links */}
      <nav className="p-3 space-y-1 flex-1">
        {navItems.map((item) => {
          const isActive = currentScreen === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => setCurrentScreen(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 text-left cursor-pointer ${
                isActive
                  ? isStudent
                    ? 'bg-blue-50 text-blue-700 font-bold'
                    : 'bg-red-50 text-[#9E0B1A] font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`w-4 h-4 flex-shrink-0 transition-colors ${
                    isActive
                      ? isStudent ? 'text-blue-600' : 'text-[#9E0B1A]'
                      : 'text-slate-500 group-hover:text-slate-700'
                  }`}
                />
                <span className="truncate text-xs sm:text-sm">{item.label}</span>
              </div>
              {item.badge && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-700 rounded-full flex-shrink-0">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Student notice or teacher footer */}
      {isStudent && (
        <div className="p-3 m-3 bg-blue-50/70 border border-blue-200/60 rounded-2xl text-[11px] text-blue-900 space-y-1">
          <div className="font-bold flex items-center gap-1 text-blue-950">
            <UserCheck className="w-3.5 h-3.5 text-blue-600" />
            Isolamento Total (LGPD)
          </div>
          <p className="text-[10px] text-blue-800 leading-tight">
            Você visualiza exclusivamente suas próprias notas e os gabaritos oficiais que já foram liberados pelo professor.
          </p>
        </div>
      )}

      {/* Bottom Logout button */}
      <div className="p-3 border-t border-slate-100">
        <button
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sair da Conta</span>
        </button>
      </div>
    </aside>
  );
};
