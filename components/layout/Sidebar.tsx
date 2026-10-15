'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FileText,
  Plus,
  Folder,
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
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/provas', label: 'Provas', icon: FileText },
  { href: '/provas/new', label: 'Criar Prova', icon: Plus },
  { href: '/banco-questoes', label: 'Banco de Questões', icon: Folder },
  { href: '/resultados', label: 'Resultados', icon: TrendingUp },
  { href: '/alunos', label: 'Alunos', icon: Users },
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();

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
      <nav className="p-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          let isActive = false;
          if (item.href === '/provas') {
            isActive = pathname === '/provas' || (pathname.startsWith('/provas/') && pathname !== '/provas/new');
          } else if (item.href === '/provas/new') {
            isActive = pathname === '/provas/new';
          } else {
            isActive = pathname.startsWith(item.href);
          }

          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 text-left cursor-pointer ${
                isActive
                  ? 'bg-blue-50 text-blue-600 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon
                className={`w-4 h-4 transition-colors ${
                  isActive ? 'text-blue-600' : 'text-slate-500 group-hover:text-slate-700'
                }`}
              />
              <span className="flex-1 text-xs sm:text-sm">{item.label}</span>
            </Link>
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
