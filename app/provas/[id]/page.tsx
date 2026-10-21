'use client';

import React, { useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { PrintPreviewScreen } from '@/components/screens/PrintPreviewScreen';
import { AnswerSheetScreen } from '@/components/screens/AnswerSheetScreen';
import { LancamentoManualScreen } from '@/components/screens/LancamentoManualScreen';
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
    setIsScannerModalOpen,
  } = useApp();

  const id = (params?.id as string) || activeExamId;
  const p = searchParams.get('p'); // 'folha' | 'caderno' | 'lancamento'
  const activeTab: 'caderno' | 'folha' | 'lancamento' =
    p === 'folha' ? 'folha' : p === 'lancamento' ? 'lancamento' : 'caderno';

  useEffect(() => {
    if (id && id !== activeExamId) {
      setActiveExamId(id);
    }
  }, [id, activeExamId, setActiveExamId]);

  const currentExam = exams.find((e) => e.id === id) || selectedExam;

  return (
    <div className="space-y-5">
      {/* Seamless Integrated Page Header with Underline Tabs */}
      <div className="print:hidden border-b border-slate-200 pb-0">
        {/* Top Info & Actions Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
          <div className="space-y-1">
            <Link
              href="/provas"
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Todas as Provas
            </Link>
            <div className="flex items-center gap-2.5 pt-0.5">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                {currentExam?.title || 'Avaliação'}
              </h1>
              <span className="font-mono text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                {currentExam?.code || '#EXAM'}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {currentExam?.discipline} • {currentExam?.classGroup} • {currentExam?.date}
            </p>
          </div>

          {/* Right Action buttons: Clean & Direct */}
          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              type="button"
              onClick={() => setIsScannerModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer shadow-2xs"
              title="Simular leitura do QR Code e correção automática"
            >
              <QrCode className="w-3.5 h-3.5 text-[#9E0B1A]" /> Ler QR / Corrigir
            </button>

            <Link
              href={`/resultados?examId=${id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition shadow-2xs"
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> Resultados
            </Link>

            <Link
              href={`/provas/new?edit=${id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition shadow-2xs"
            >
              <Edit3 className="w-3.5 h-3.5 text-slate-400" /> Editar Questões
            </Link>
          </div>
        </div>

        {/* Clean Underline Tabs */}
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
            <span>Impressão & Caderno A4</span>
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
            <span>Só Folha de Respostas (OMR)</span>
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
            <span>Vincular Provas Avulsas / Manual</span>
          </Link>
        </div>
      </div>

      {/* Screen Content based on ?p= query param */}
      {activeTab === 'folha' ? (
        <AnswerSheetScreen />
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
