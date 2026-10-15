'use client';

import React, { useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { PrintPreviewScreen } from '@/components/screens/PrintPreviewScreen';
import { AnswerSheetScreen } from '@/components/screens/AnswerSheetScreen';
import {
  ChevronLeft,
  FileText,
  Eye,
  Edit3,
  TrendingUp,
  Layers,
  Sparkles,
} from 'lucide-react';

function ExamHubContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { exams, activeExamId, setActiveExamId, selectedExam } = useApp();

  const id = (params?.id as string) || activeExamId;
  const p = searchParams.get('p'); // 'folha' | 'caderno'
  const activeTab: 'caderno' | 'folha' = p === 'folha' ? 'folha' : 'caderno';

  useEffect(() => {
    if (id && id !== activeExamId) {
      setActiveExamId(id);
    }
  }, [id, activeExamId, setActiveExamId]);

  const currentExam = exams.find((e) => e.id === id) || selectedExam;

  return (
    <div className="space-y-6">
      {/* Top Hub Navigation Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        {/* Left: Breadcrumbs & Exam Title */}
        <div className="space-y-1">
          <Link
            href="/provas"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-blue-600 transition"
          >
            <ChevronLeft className="w-4 h-4" /> Todas as Provas
          </Link>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              {currentExam?.title || 'Avaliação'}
            </h2>
            <span className="text-[11px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60">
              {currentExam?.code || '#EXAM'}
            </span>
          </div>
        </div>

        {/* Center: Tabs Switcher (Caderno A4 vs Folha OMR) */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <Link
            href={`/provas/${id}?p=caderno`}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'caderno'
                ? 'bg-white text-blue-700 shadow-xs ring-1 ring-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Eye className="w-4 h-4 text-blue-600" />
            <span>Caderno de Prova A4</span>
          </Link>

          <Link
            href={`/provas/${id}?p=folha`}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'folha'
                ? 'bg-white text-emerald-700 shadow-xs ring-1 ring-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4 text-emerald-600" />
            <span>Folha de Respostas OMR</span>
          </Link>
        </div>

        {/* Right: Quick Action to Edit or View Results */}
        <div className="flex items-center gap-2">
          {currentExam?.status === 'Corrigida' && (
            <Link
              href={`/resultados?examId=${id}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition shadow-xs"
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Resultados
            </Link>
          )}

          <Link
            href={`/provas/new?edit=${id}`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition shadow-xs"
          >
            <Edit3 className="w-3.5 h-3.5 text-slate-500" /> Editar
          </Link>
        </div>
      </div>

      {/* Screen Content based on ?p= query param */}
      {activeTab === 'folha' ? <AnswerSheetScreen /> : <PrintPreviewScreen />}
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
