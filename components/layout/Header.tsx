'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { CorregeLogo } from '@/components/common/CorregeLogo';
import { User, LogOut, BookOpen, Bell, Camera } from 'lucide-react';

export const Header: React.FC = () => {
  const {
    currentUser,
    logout,
    setCurrentScreen,
    setActiveExamId,
    isBackendOnline,
    backendUrl,
    setIsScannerModalOpen,
    exams,
    corrections,
    students,
    questions,
  } = useApp();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationsCleared, setNotificationsCleared] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const router = useRouter();

  // Dynamic real notifications derived strictly from live database state (zero mocks!)
  const notifications = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      desc: string;
      time: string;
      action: () => void;
    }> = [];

    const pendingCount = corrections.filter((c) => !c.studentId).length;
    if (pendingCount > 0) {
      items.push({
        id: 'pending-corrections',
        title: `${pendingCount} folha(s) avulsa(s) aguardando atribuição`,
        desc: 'Vincule as correções sem identificação nominal aos respectivos estudantes.',
        time: 'Pendente',
        action: () => {
          router.push('/resultados');
          setShowNotifications(false);
        },
      });
    }

    if (corrections.length > 0) {
      const latest = corrections[0];
      const exam = exams.find((e) => e.id === latest.applicationId);
      items.push({
        id: `corr-${latest.id}`,
        title: `${corrections.length} correção(ões) registrada(s)`,
        desc: exam
          ? `Última leitura em "${exam.title}" (Caderno ${latest.versionLetter} • Nota ${latest.totalScore.toFixed(1)}).`
          : `Última nota registrada: ${latest.totalScore.toFixed(1)} (Caderno ${latest.versionLetter}).`,
        time: new Date(latest.confirmedAt).toLocaleDateString('pt-BR'),
        action: () => {
          if (exam) setActiveExamId(exam.id);
          router.push(exam ? `/resultados?examId=${exam.id}` : '/resultados');
          setShowNotifications(false);
        },
      });
    }

    if (exams.length > 0) {
      items.push({
        id: 'exams-summary',
        title: `${exams.length} avaliação(ões) sincronizada(s)`,
        desc: `${questions.length} questão(ões) no banco e ${students.length} aluno(s) cadastrado(s).`,
        time: isBackendOnline ? 'Banco online' : 'Offline',
        action: () => {
          router.push('/provas');
          setShowNotifications(false);
        },
      });
    }

    return items;
  }, [corrections, exams, questions.length, students.length, isBackendOnline, router, setActiveExamId]);

  const hasUnread = !notificationsCleared && notifications.length > 0;

  return (
    <header className="app-shell-header h-16 bg-white border-b border-slate-200 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 select-none print:hidden">
      {/* Brand Logo on the left */}
      <div className="flex items-center gap-3">
        <CorregeLogo />
        <span className="hidden sm:inline-block text-[11px] font-semibold text-slate-400 border-l border-slate-200 pl-3">
          Católica SC • SGP
        </span>

        {/* Backend Status Badge */}
        <div
          title={
            isBackendOnline
              ? `Conectado ao Banco de Dados (${backendUrl})`
              : 'Servidor indisponível no momento'
          }
          className={`hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold transition ${
            isBackendOnline
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isBackendOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
            }`}
          />
          {isBackendOnline ? 'Banco Conectado' : 'Sem Conexão'}
        </div>
      </div>

      {/* Right Controls: Scanner + Notifications + User Profile */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Leitor OMR Caller */}
        <button
          type="button"
          onClick={() => setIsScannerModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-[#9E0B1A] border border-red-200/60 rounded-xl text-xs font-bold transition cursor-pointer"
          title="Abrir Leitor Óptico / Scanner de Provas"
        >
          <Camera className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Corrigir com Leitor</span>
        </button>

        {/* Notifications Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfileMenu(false);
            }}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition relative cursor-pointer"
            title="Atividades e Avisos"
          >
            <Bell className="w-4 h-4" />
            {hasUnread && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl py-3 z-40 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 pb-2.5 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Atividades do Sistema</span>
                {hasUnread && (
                  <button
                    type="button"
                    onClick={() => setNotificationsCleared(true)}
                    className="text-[10px] font-semibold text-[#9E0B1A] cursor-pointer hover:underline"
                  >
                    Marcar lidas
                  </button>
                )}
              </div>
              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    Nenhuma atividade recente registrada.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={n.action}
                      className="w-full p-3 text-left hover:bg-slate-50/80 transition flex items-start gap-2.5 cursor-pointer"
                    >
                      <div className="w-2 h-2 rounded-full bg-[#9E0B1A] mt-1.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-slate-800">{n.title}</p>
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{n.desc}</p>
                        <span className="text-[10px] text-slate-400 mt-1 block">{n.time}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Avatar / Menu */}
        <div className="relative">
          <button
            type="button"
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
                  Docente Autenticado
                </span>
              </div>

              <div className="p-1 space-y-0.5">
                <button
                  type="button"
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
                  type="button"
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
