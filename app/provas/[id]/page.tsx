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
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {currentExam?.title || 'Avaliação'}
              </h1>
              <span className="font-mono text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                {currentExam?.code || '#EXAM'}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {currentExam?.course} • {currentExam?.discipline} • {currentExam?.classGroup}
            </p>
          </div>

          {/* Right Action buttons */}
          <div className="flex items-center gap-2 self-start sm:self-center">
            {currentExam?.status === 'Corrigida' && (
              <Link
                href={`/resultados?examId=${id}`}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition"
              >
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> Resultados
              </Link>
            )}

            <Link
              href={`/provas/new?edit=${id}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition shadow-xs"
            >
              <Edit3 className="w-3.5 h-3.5 text-slate-500" /> Editar Prova
            </Link>
          </div>
        </div>

        {/* Clean Underline Tabs (Directly on the baseline, no floating box) */}
        <div className="flex items-center gap-8 -mb-px">
          <Link
            href={`/provas/${id}?p=caderno`}
            className={`pb-3 text-sm font-semibold transition flex items-center gap-2 border-b-2 ${
              activeTab === 'caderno'
                ? 'border-[#9E0B1A] text-[#9E0B1A] font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>Caderno de Prova A4</span>
          </Link>

          <Link
            href={`/provas/${id}?p=folha`}
            className={`pb-3 text-sm font-semibold transition flex items-center gap-2 border-b-2 ${
              activeTab === 'folha'
                ? 'border-[#9E0B1A] text-[#9E0B1A] font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Folha de Respostas (OMR)</span>
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
