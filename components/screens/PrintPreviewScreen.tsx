'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { QrCodeGraphic } from '@/components/common/QrCodeGraphic';
import {
  ArrowLeft,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Layers,
  CheckCircle2,
} from 'lucide-react';

export const PrintPreviewScreen: React.FC = () => {
  const {
    selectedExam,
    setExamWizardStep,
    setCurrentScreen,
    previewVersion,
    setPreviewVersion,
    showAnswerKeyInPreview,
    setShowAnswerKeyInPreview,
    showQrCodeInPreview,
    setShowQrCodeInPreview,
    previewZoom,
    setPreviewZoom,
    previewPage,
    setPreviewPage,
    questions,
    addToast,
  } = useApp();

  const exam = selectedExam || {
    title: 'P1 - Direito Constitucional I - 2024.2',
    discipline: 'Direito Constitucional',
    course: 'Direito',
    classGroup: 'Turma A',
    semester: '2024.2',
    institution: 'UNIVERSIDADE FEDERAL DO RIO DE JANEIRO',
    department: 'Faculdade Nacional de Direito | Departamento de Direito Público',
    code: '#DIR-CONST-2024.2',
    date: '12 Mar, 2024',
    duration: '2 horas',
    instructions:
      'Marque apenas uma alternativa por questão. Preencha completamente o campo correspondente. Use apenas caneta preta ou azul. Rasuras anularão a questão. Duração máxima: 2 horas. Permitida consulta apenas a textos de lei seca sem anotações.',
    selectedQuestionIds: ['q-1024', 'q-1025', 'q-1026', 'q-1027', 'q-1028'],
  };

  // Get selected questions objects
  const examQuestions = exam.selectedQuestionIds
    ?.map((id) => questions.find((q) => q.id === id))
    .filter((q): q is NonNullable<typeof q> => q !== undefined) || questions.slice(0, 5);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPdf = () => {
    addToast({
      type: 'success',
      title: 'PDF de Prova Pronto!',
      message: `Caderno ${previewVersion} de "${exam.title}" pronto para impressão e download.`,
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header with Title and Main Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Pré-visualização da Prova
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {exam.title} - {exam.course} - {exam.classGroup}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              setExamWizardStep(2);
              setCurrentScreen('criar-prova');
            }}
            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition cursor-pointer"
          >
            Voltar ao Editor
          </button>

          <button
            onClick={handleExportPdf}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Exportar PDF
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" /> Imprimir
          </button>
        </div>
      </div>

      {/* Toolbar Controls Card */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex flex-wrap items-center gap-4">
          {/* Pagination */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPreviewPage(Math.max(1, previewPage - 1))}
              disabled={previewPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold text-slate-700 px-2">
              Página {previewPage} de 2
            </span>
            <button
              onClick={() => setPreviewPage(Math.min(2, previewPage + 1))}
              disabled={previewPage === 2}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Zoom Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Zoom:</span>
            <div className="relative">
              <select
                value={previewZoom}
                onChange={(e) => setPreviewZoom(parseInt(e.target.value))}
                className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 pr-7 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value={75}>75%</option>
                <option value={100}>100%</option>
                <option value={125}>125%</option>
                <option value={150}>150%</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Caderno Version Selector */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            {(['A', 'B', 'C', 'D'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setPreviewVersion(v)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                  previewVersion === v
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Caderno {v}
              </button>
            ))}
          </div>
        </div>

        {/* Toggles: Gabarito & QR Code */}
        <div className="flex items-center gap-6">
          {/* Mostrar Gabarito */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <span className="text-xs font-semibold text-slate-700">
              Mostrar Gabarito
            </span>
            <button
              type="button"
              onClick={() => setShowAnswerKeyInPreview(!showAnswerKeyInPreview)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                showAnswerKeyInPreview ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  showAnswerKeyInPreview ? 'translate-x-4.5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </label>

          {/* Mostrar QR Code */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <span className="text-xs font-semibold text-slate-700">
              Mostrar QR Code
            </span>
            <button
              type="button"
              onClick={() => setShowQrCodeInPreview(!showQrCodeInPreview)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                showQrCodeInPreview ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  showQrCodeInPreview ? 'translate-x-4.5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </label>
        </div>
      </div>

      {/* Realistic A4 Paper Container matching pre-visualizacao-prova.png */}
      <div className="bg-slate-200/60 p-6 sm:p-10 rounded-3xl flex justify-center shadow-inner overflow-x-auto print:bg-white print:p-0">
        <div
          style={{
            transform: `scale(${previewZoom / 100})`,
            transformOrigin: 'top center',
          }}
          className="w-full max-w-[800px] bg-white text-slate-900 p-10 sm:p-14 rounded-sm shadow-xl space-y-6 transition-transform duration-200 print:shadow-none print:max-w-none print:p-0"
        >
          {/* Institutional Header */}
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h2 className="text-base font-extrabold tracking-wide uppercase text-slate-950">
                {exam.institution}
              </h2>
              <p className="text-xs font-semibold text-slate-700">
                {exam.department}
              </p>
              <p className="text-xs font-medium text-slate-600">
                Curso: {exam.course} | Disciplina: {exam.discipline} | Turma: {exam.classGroup} (Caderno {previewVersion})
              </p>
              <h3 className="text-xs font-bold text-slate-900 pt-1">
                {exam.title} — {exam.semester}
              </h3>
            </div>

            {/* QR Code */}
            {showQrCodeInPreview && (
              <QrCodeGraphic
                value={`${exam.code}-CADERNO-${previewVersion}`}
                size={68}
                className="shadow-xs ml-4"
              />
            )}
          </div>

          <div className="border-t-2 border-slate-900 pt-3"></div>

          {/* Student Fill Lines */}
          <div className="space-y-2 text-xs font-medium text-slate-800">
            <div className="flex items-end">
              <span className="font-semibold whitespace-nowrap mr-2">Nome:</span>
              <div className="flex-1 border-b border-dashed border-slate-500 pb-0.5"></div>
            </div>

            <div className="flex items-center justify-between gap-6 pt-1">
              <div className="flex items-end flex-1">
                <span className="font-semibold whitespace-nowrap mr-2">Matrícula:</span>
                <div className="flex-1 border-b border-dashed border-slate-500 pb-0.5"></div>
              </div>

              <div className="flex items-end w-44">
                <span className="font-semibold whitespace-nowrap mr-2">Data:</span>
                <span className="font-mono text-slate-600">____/____/________</span>
              </div>
            </div>
          </div>

          {/* Official Instructions */}
          <div className="border-t border-b border-slate-300 py-2 my-4 text-[11px] italic text-slate-600 leading-snug">
            {exam.instructions}
          </div>

          {/* Questions Section */}
          <div className="space-y-6 pt-2">
            {examQuestions.map((q, index) => (
              <div key={q.id} className="space-y-2.5 text-xs text-slate-900">
                {/* Question Statement */}
                <p className="font-bold leading-relaxed">
                  {index + 1}. {q.statement}
                </p>

                {/* Alternatives List */}
                <div className="space-y-1.5 pl-3">
                  {q.alternatives.map((alt) => {
                    const isCorrect = alt.letter === q.correctAlternative;
                    const showHighlight = showAnswerKeyInPreview && isCorrect;

                    return (
                      <div
                        key={alt.id}
                        className={`flex items-center justify-between py-0.5 px-1.5 rounded transition ${
                          showHighlight
                            ? 'text-blue-700 font-bold bg-blue-50/50'
                            : 'text-slate-800'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="font-semibold">({alt.letter})</span>
                          <span>{alt.text}</span>
                        </div>

                        {showHighlight && (
                          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 ml-4">
                            GABARITO
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Footer Page indicator */}
          <div className="pt-10 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>Correge • {exam.code}</span>
            <span>Página {previewPage} de 2 — Caderno {previewVersion}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
