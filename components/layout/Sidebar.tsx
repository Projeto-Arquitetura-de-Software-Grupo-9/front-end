'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { ScreenType } from '@/lib/types';
import {
  LayoutGrid,
  Folder,
  Plus,
  FileText,
  TrendingUp,
  Users,
  Settings,
} from 'lucide-react';

interface NavItem {
  id: ScreenType;
  label: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Painel de Controle', icon: LayoutGrid },
  { id: 'banco-questoes', label: 'Banco de Questões', icon: Folder },
  { id: 'criar-prova', label: 'Criar Prova', icon: Plus },
  { id: 'folha-respostas', label: 'Folha de Respostas', icon: FileText },
  { id: 'resultados', label: 'Resultados', icon: TrendingUp },
  { id: 'alunos', label: 'Alunos', icon: Users },
  { id: 'configuracoes', label: 'Configurações', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const { currentScreen, setCurrentScreen } = useApp();

  return (
    <aside className="w-56 bg-white border-r border-slate-200 flex flex-col select-none print:hidden flex-shrink-0 min-h-[calc(100vh-4rem)]">
      {/* Navigation Links */}
      <nav className="p-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = currentScreen === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => setCurrentScreen(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 text-left cursor-pointer ${
                isActive
                  ? 'bg-blue-50 text-blue-600 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon
                className={`w-4 h-4 transition-colors ${
                  isActive ? 'text-blue-600' : 'text-slate-500 group-hover:text-slate-700'
                }`}
              />
              <span className="flex-1 text-xs sm:text-sm">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
};
