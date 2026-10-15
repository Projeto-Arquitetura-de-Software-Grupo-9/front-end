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
  UserCheck,
  UserX,
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

  const [withIdentification, setWithIdentification] = useState(true);

  const exam = selectedExam || {
    title: 'P1 - Direito Constitucional I - 2026.1',
    discipline: 'Direito Constitucional',
    course: 'Direito',
    classGroup: 'Turma A',
    semester: '2026.1',
    institution: 'CATÓLICA DE SANTA CATARINA',
    department: 'Curso de Direito | Departamento de Ciências Jurídicas',
    code: '#CAT-DIR-2026.1',
    date: '15 Mar, 2026',
    duration: '2 horas',
    instructions:
      'Marque apenas uma alternativa por questão objetiva no cartão-resposta. Preencha completamente a bolha com caneta preta ou azul. Rasuras anularão a questão. Duração máxima: 2 horas. Permitida consulta apenas a textos de lei seca sem anotações.',
    selectedQuestionIds: ['q-disc-1', 'q-1024', 'q-1024-2', 'q-1024-3'],
  };

  // Get selected questions objects
  const examQuestions = exam.selectedQuestionIds
    ?.map((id) => questions.find((q) => q.id === id))
    .filter((q): q is NonNullable<typeof q> => q !== undefined) || questions.slice(0, 5);

  const handlePrint = () => {
    window.print();
  };

  const handleExportConsolidatedPdf = () => {
    addToast({
      type: 'success',
      title: 'PDF Único Consolidado Gerado!',
      message: `Arquivo consolidado contendo todas as provas da turma (${withIdentification ? 'Com identificação do aluno' : 'Sem identificação'}) pronto para download.`,
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header with Title and Main Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#9E0B1A] uppercase tracking-wider">
            <Layers className="w-4 h-4" />
            <span>Feature 6 – Geração de PDF e Versões (Católica SC)</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">
            Pré-visualização da Avaliação
          </h1>
          <p className="text-xs text-slate-500">
            {exam.title} • {exam.institution || 'CATÓLICA DE SANTA CATARINA'}
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
            onClick={handleExportConsolidatedPdf}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#9E0B1A] hover:bg-[#850916] text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Baixar PDF Consolidado
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" /> Imprimir
          </button>
        </div>
      </div>

      {/* Toolbar Controls Card */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex flex-wrap items-center gap-4">
          {/* Mode Selector (Feature 6: Com ou Sem Identificação) */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setWithIdentification(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                withIdentification
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Com Identificação</span>
            </button>

            <button
              onClick={() => setWithIdentification(false)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                !withIdentification
                  ? 'bg-white text-amber-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserX className="w-3.5 h-3.5 text-amber-600" />
              <span>Sem Identificação (Anônima)</span>
            </button>
          </div>

          {/* Caderno Version Selector */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            {(['A', 'B', 'C', 'D'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setPreviewVersion(v)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                  previewVersion === v
                    ? 'bg-[#9E0B1A] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Caderno {v}
              </button>
            ))}
          </div>

          {/* Zoom Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Zoom:</span>
            <div className="relative">
              <select
                value={previewZoom}
                onChange={(e) => setPreviewZoom(parseInt(e.target.value))}
                className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 pr-7 appearance-none cursor-pointer focus:outline-none"
              >
                <option value={75}>75%</option>
                <option value={100}>100%</option>
                <option value={125}>125%</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Toggles: Gabarito & QR Code */}
        <div className="flex items-center gap-5">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className="text-xs font-semibold text-slate-700">
              Gabarito Visual
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

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className="text-xs font-semibold text-slate-700">
              QR Code
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

      {/* Realistic A4 Paper Container */}
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
                {exam.institution || 'CATÓLICA DE SANTA CATARINA'}
              </h2>
              <p className="text-xs font-semibold text-slate-700">
                {exam.department || 'Curso de Direito | Departamento de Ciências Jurídicas'}
              </p>
              <p className="text-xs font-medium text-slate-600">
                Disciplina: {exam.discipline} | Turma: {exam.classGroup || 'Turma A'} (Caderno {previewVersion})
              </p>
              <h3 className="text-xs font-bold text-slate-900 pt-1">
                {exam.title}
              </h3>
            </div>

            {/* QR Code (Feature 6: version + student if withIdentification, or version only) */}
            {showQrCodeInPreview && (
              <div className="text-center ml-4">
                <QrCodeGraphic
                  value={
                    withIdentification
                      ? `CATOLICA-OMR:V=${previewVersion}:STD=2024.1.001`
                      : `CATOLICA-OMR:V=${previewVersion}`
                  }
                  size={72}
                  className="shadow-xs"
                />
                <span className="text-[9px] font-mono font-bold text-slate-500 block mt-1">
                  CADERNO {previewVersion}
                </span>
              </div>
            )}
          </div>

          <div className="border-t-2 border-slate-900 pt-2"></div>

          {/* Student Header (Feature 6) */}
          {withIdentification ? (
            /* Mode COM Identificação: Pré-impresso */
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-slate-500">Aluno(a): </span>
                <span className="font-bold text-slate-950 text-sm">Amanda Dolores</span>
                <span className="ml-4 font-semibold text-slate-500">Matrícula: </span>
                <span className="font-mono font-bold text-slate-800">2024.1.001</span>
              </div>
              <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                Identificação Pré-impressa
              </span>
            </div>
          ) : (
            /* Mode SEM Identificação: Linhas em branco para preenchimento manual */
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
          )}

          {/* Official Instructions */}
          <div className="border-t border-b border-slate-300 py-2.5 my-3 text-[11px] italic text-slate-600 leading-snug">
            {exam.instructions}
          </div>

          {/* Questions Section */}
          <div className="space-y-6 pt-2">
            {examQuestions.map((q, index) => {
              const isDiscursive = q.type === 'discursiva';

              return (
                <div key={q.id} className="space-y-2.5 text-xs text-slate-900">
                  {/* Statement */}
                  <div className="flex items-start justify-between gap-2 font-bold leading-relaxed">
                    <p>
                      {index + 1}. {q.statement}
                    </p>
                    <span className="text-[10px] font-mono text-slate-500 whitespace-nowrap bg-slate-100 px-1.5 py-0.5 rounded">
                      ({q.type === 'discursiva' ? `${q.maxScore || 2.5} pts` : `${q.points || 1.0} pt`})
                    </span>
                  </div>

                  {/* Objective Alternatives */}
                  {!isDiscursive ? (
                    <div className="space-y-1.5 pl-3">
                      {q.alternatives.map((alt) => {
                        const isCorrect = alt.letter === q.correctAlternative;
                        const showHighlight = showAnswerKeyInPreview && isCorrect;

                        return (
                          <div
                            key={alt.id}
                            className={`flex items-start gap-2 p-1 rounded transition ${
                              showHighlight ? 'bg-emerald-100/70 font-semibold' : ''
                            }`}
                          >
                            <span
                              className={`w-4 h-4 rounded-full border border-slate-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5 ${
                                showHighlight ? 'bg-emerald-600 text-white border-emerald-600' : ''
                              }`}
                            >
                              {alt.letter}
                            </span>
                            <span className="leading-normal">{alt.text}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Discursive Writing Lines */
                    <div className="space-y-3.5 pl-2 pt-2">
                      <div className="border-b border-slate-300 h-5"></div>
                      <div className="border-b border-slate-300 h-5"></div>
                      <div className="border-b border-slate-300 h-5"></div>
                      <div className="border-b border-slate-300 h-5"></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="pt-8 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>SGP Católica SC • Caderno {previewVersion}</span>
            <span>Página 1 de 1</span>
          </div>
        </div>
      </div>
    </div>
  );
};
