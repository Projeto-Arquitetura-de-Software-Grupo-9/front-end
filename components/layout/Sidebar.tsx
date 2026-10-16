'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
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
  ClipboardCheck,
  Users,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
}

const TEACHER_NAV_ITEMS: NavItem[] = [
  { href: '/provas', label: 'Provas', icon: FileText },
  { href: '/provas/new', label: 'Criar Prova', icon: Plus },
  { href: '/banco-questoes', label: 'Banco de Questões', icon: Folder },
  { href: '/turmas', label: 'Minhas Turmas', icon: GraduationCap },
  { href: '/resultados', label: 'Resultados', icon: TrendingUp },
  { href: '/alunos', label: 'Alunos', icon: Users },
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { logout } = useApp();

  return (
    <aside className="w-60 bg-white border-r border-slate-200 flex flex-col select-none print:hidden flex-shrink-0 sticky top-16 self-start h-[calc(100vh-4rem)] overflow-y-auto z-20">
      {/* Navigation Links */}
      <nav className="p-3 space-y-1 flex-1">
        {TEACHER_NAV_ITEMS.map((item) => {
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
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 text-left cursor-pointer ${
                isActive
                  ? 'bg-red-50 text-[#9E0B1A] font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`w-4 h-4 flex-shrink-0 transition-colors ${
                    isActive ? 'text-[#9E0B1A]' : 'text-slate-500 group-hover:text-slate-700'
                  }`}
                />
                <span className="truncate text-xs sm:text-sm">{item.label}</span>
              </div>
              {item.badge && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-700 rounded-full flex-shrink-0">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

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
