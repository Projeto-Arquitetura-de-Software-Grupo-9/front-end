'use client';

import React, { useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { PrintPreviewScreen } from '@/components/screens/PrintPreviewScreen';
import { AnswerSheetScreen } from '@/components/screens/AnswerSheetScreen';
import { LancamentoManualScreen } from '@/components/screens/LancamentoManualScreen';
import { ResultsScreen } from '@/components/screens/ResultsScreen';
import {
  ChevronLeft,
  FileText,
  Printer,
  Edit3,
  TrendingUp,
  ClipboardCheck,
  QrCode,
} from 'lucide-react';

function ExamHubContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const {
    exams,
    activeExamId,
    setActiveExamId,
    selectedExam,
    corrections,
    setIsScannerModalOpen,
  } = useApp();

  const id = (params?.id as string) || activeExamId;
  const p = searchParams.get('p'); // 'caderno' | 'folha' | 'resultados' | 'lancamento'
  const activeTab: 'caderno' | 'folha' | 'resultados' | 'lancamento' =
    p === 'folha'
      ? 'folha'
      : p === 'resultados'
      ? 'resultados'
      : p === 'lancamento'
      ? 'lancamento'
      : 'caderno';

  useEffect(() => {
    if (id && id !== activeExamId) {
      setActiveExamId(id);
    }
  }, [id, activeExamId, setActiveExamId]);

  const currentExam = exams.find((e) => e.id === id) || selectedExam;
  const pendingCount = corrections.filter((c) => !c.studentId).length;
  const questionCount =
    currentExam?.selectedQuestionIds?.length ||
    currentExam?.versions?.[0]?.questions?.length ||
    0;

  return (
    <div className="space-y-4">
      {/* Seamless Integrated Page Header with Underline Tabs */}
      <div className="print:hidden border-b border-slate-200 pb-0">
        {/* Top Info & Actions Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
          <div className="space-y-0.5">
            <Link
              href="/provas"
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-800 transition"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Provas
            </Link>
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                {currentExam?.title || 'Avaliação'}
              </h1>
              <span className="font-mono text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                {currentExam?.code || '#EXAM'}
              </span>
              <span className="text-xs text-slate-400 hidden sm:inline">•</span>
              <span className="text-xs text-slate-500">
                {currentExam?.discipline} • {currentExam?.classGroup} • {questionCount} questões
              </span>
            </div>
          </div>

          {/* Right Action buttons: Minimalist & Focused */}
          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              type="button"
              onClick={() => setIsScannerModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer shadow-2xs"
              title="Ler QR Code e corrigir folha de respostas"
            >
              <QrCode className="w-3.5 h-3.5 text-[#9E0B1A]" /> Ler QR / Corrigir
            </button>

            <Link
              href={`/provas/new?edit=${id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition shadow-2xs"
            >
              <Edit3 className="w-3.5 h-3.5 text-slate-400" /> Editar Questões
            </Link>
          </div>
        </div>

        {/* Clean Underline Tabs for All Exam Views */}
        <div className="flex items-center gap-6 -mb-px overflow-x-auto">
          <Link
            href={`/provas/${id}?p=caderno`}
            className={`pb-2.5 text-xs font-semibold transition flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
              activeTab === 'caderno'
                ? 'border-[#9E0B1A] text-[#9E0B1A] font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Caderno & Impressão</span>
          </Link>

          <Link
            href={`/provas/${id}?p=folha`}
            className={`pb-2.5 text-xs font-semibold transition flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
              activeTab === 'folha'
                ? 'border-[#9E0B1A] text-[#9E0B1A] font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Folha de Respostas OMR</span>
          </Link>

          <Link
            href={`/provas/${id}?p=resultados`}
            className={`pb-2.5 text-xs font-semibold transition flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
              activeTab === 'resultados'
                ? 'border-[#9E0B1A] text-[#9E0B1A] font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Resultados & Notas</span>
          </Link>

          <Link
            href={`/provas/${id}?p=lancamento`}
            className={`pb-2.5 text-xs font-semibold transition flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
              activeTab === 'lancamento'
                ? 'border-[#9E0B1A] text-[#9E0B1A] font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>Vincular Avulsas</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                {pendingCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Screen Content based on ?p= query param */}
      {activeTab === 'folha' ? (
        <AnswerSheetScreen />
      ) : activeTab === 'resultados' ? (
        <ResultsScreen embedded />
      ) : activeTab === 'lancamento' ? (
        <LancamentoManualScreen />
      ) : (
        <PrintPreviewScreen />
      )}
    </div>
  );
}

export default function ExamHubPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-xs font-semibold text-slate-500">
          Carregando avaliação...
        </div>
      }
    >
      <ExamHubContent />
    </Suspense>
  );
}
