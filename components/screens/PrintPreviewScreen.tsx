'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { A4ExamSheet, A4ExamQuestion } from '@/components/common/A4ExamSheet';
import {
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  FileText,
  Layers,
  CheckCircle2,
  ZoomIn,
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

  const [viewMode, setViewMode] = useState<'single' | 'all'>('single');
  const [includeBoxNota, setIncludeBoxNota] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const exam = selectedExam || {
    id: 'exam-default',
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

  // Resolve questions for the selected Caderno version
  const currentVersionData = (exam as any).versions?.find(
    (v: any) => v.versionLetter === previewVersion
  );

  let versionQuestions: A4ExamQuestion[] = [];

  if (currentVersionData?.questions && currentVersionData.questions.length > 0) {
    versionQuestions = currentVersionData.questions.map((qv: any, idx: number) => ({
      id: qv.originalQuestionId || `q-${idx}`,
      orderIndex: idx + 1,
      statement: qv.statement,
      alternatives: qv.alternatives,
      correctAlternative: qv.correctAlternative,
    }));
  } else {
    // Fallback: derive questions from selectedQuestionIds or questions pool
    const baseQuestions = (exam.selectedQuestionIds
      ?.map((id) => questions.find((q) => q.id === id))
      .filter((q): q is NonNullable<typeof q> => q !== undefined) || questions.slice(0, 5));

    // Permute order based on Caderno letter if version > A
    let reordered = [...baseQuestions];
    if (previewVersion === 'B' && reordered.length >= 2) {
      reordered = [reordered[1], ...reordered.slice(2), reordered[0]];
    } else if (previewVersion === 'C' && reordered.length >= 3) {
      reordered = [reordered[2], reordered[0], ...reordered.slice(3), reordered[1]];
    } else if (previewVersion === 'D' && reordered.length >= 4) {
      reordered = [reordered[3], ...reordered.slice(0, 3), ...reordered.slice(4)];
    }

    versionQuestions = reordered.map((q, idx) => ({
      id: q.id,
      orderIndex: idx + 1,
      statement: q.statement,
      alternatives: q.alternatives,
      correctAlternative: q.correctAlternative,
    }));
  }

  // Realistic A4 Pagination:
  // Page 1 contains Header + Box NOTA + Student Fill Block + Instructions + First 3 questions
  // Subsequent pages contain 3 questions each
  const QUESTIONS_PAGE_1 = 3;
  const QUESTIONS_SUBSEQUENT_PAGES = 3;

  const page1Questions = versionQuestions.slice(0, QUESTIONS_PAGE_1);
  const remainingQuestions = versionQuestions.slice(QUESTIONS_PAGE_1);
  
  const additionalPagesCount = Math.max(
    remainingQuestions.length > 0 ? Math.ceil(remainingQuestions.length / QUESTIONS_SUBSEQUENT_PAGES) : 0,
    1 // minimum 2 pages to demonstrate multi-sheet continuation
  );

  const totalPages = 1 + additionalPagesCount;

  // Pages array for rendering
  const pagesData: { pageNumber: number; questions: A4ExamQuestion[] }[] = [
    { pageNumber: 1, questions: page1Questions },
  ];

  for (let p = 2; p <= totalPages; p++) {
    const startIndex = (p - 2) * QUESTIONS_SUBSEQUENT_PAGES;
    const pQuestions = remainingQuestions.slice(startIndex, startIndex + QUESTIONS_SUBSEQUENT_PAGES);
    pagesData.push({
      pageNumber: p,
      questions: pQuestions.length > 0 ? pQuestions : versionQuestions.slice(3, 5),
    });
  }

  const handlePrint = () => {
    window.print();
  };

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      const examId = exam.id || 'exam-catolica-01';
      const backendUrl = `http://localhost:3001/api/v1/exams/${examId}/download-pdf?versionLetter=${previewVersion}&showAnswerKey=${showAnswerKeyInPreview}&showQrCode=${showQrCodeInPreview}&includeBoxNota=${includeBoxNota}`;
      
      const response = await fetch(backendUrl);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Prova-${exam.title.replace(/[^a-zA-Z0-9]/g, '_')}-Caderno-${previewVersion}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

        addToast({
          type: 'success',
          title: 'PDF Baixado com Sucesso!',
          message: `Caderno ${previewVersion} gerado em formato A4 institucional.`,
        });
      } else {
        // Fallback to print
        window.print();
      }
    } catch {
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header with Title and Main Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[11px] font-bold">
              Simulador A4 (210 × 297 mm)
            </span>
            <span className="text-xs font-semibold text-slate-500">
              Escala Real 1:1.414
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
            Pré-visualização da Prova
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {exam.title} • {exam.course} • {exam.classGroup}
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
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> {isExporting ? 'Exportando...' : 'Exportar PDF'}
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" /> Imprimir Folha
          </button>
        </div>
      </div>

      {/* Toolbar Controls Card */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex flex-wrap items-center gap-4">
          {/* View Mode Toggle: Single Page vs All Pages */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('single')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'single'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> Folha Única
            </button>
            <button
              onClick={() => setViewMode('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'all'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> Todas as Folhas
            </button>
          </div>

          {/* Pagination (Active in single page mode) */}
          {viewMode === 'single' && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1 rounded-xl">
              <button
                onClick={() => setPreviewPage(Math.max(1, previewPage - 1))}
                disabled={previewPage === 1}
                className="p-1 rounded-lg text-slate-600 hover:bg-white disabled:opacity-30 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold text-slate-800 px-2">
                Folha {previewPage} de {totalPages}
              </span>
              <button
                onClick={() => setPreviewPage(Math.min(totalPages, previewPage + 1))}
                disabled={previewPage === totalPages}
                className="p-1 rounded-lg text-slate-600 hover:bg-white disabled:opacity-30 transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Zoom Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Zoom:</span>
            <div className="relative">
              <select
                value={previewZoom}
                onChange={(e) => setPreviewZoom(parseInt(e.target.value))}
                className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 pr-7 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value={50}>50%</option>
                <option value={75}>75%</option>
                <option value={100}>100% (Real)</option>
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
                className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
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

        {/* Toggles: Gabarito, QR Code & Box NOTA */}
        <div className="flex flex-wrap items-center gap-5">
          {/* Box NOTA Toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className="text-xs font-semibold text-slate-700">Box NOTA</span>
            <button
              type="button"
              onClick={() => setIncludeBoxNota(!includeBoxNota)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                includeBoxNota ? 'bg-blue-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  includeBoxNota ? 'translate-x-4.5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </label>

          {/* Mostrar Gabarito */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className="text-xs font-semibold text-slate-700">Mostrar Gabarito</span>
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
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className="text-xs font-semibold text-slate-700">QR Code</span>
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

      {/* Realistic Virtual Drafting Desk Environment simulating physical A4 paper sheets */}
      <div className="bg-slate-200/80 p-6 sm:p-12 rounded-3xl shadow-inner overflow-x-auto min-h-[800px] flex flex-col items-center justify-start print:bg-white print:p-0 print:shadow-none print:min-h-0">
        {/* Printable/Display Container */}
        <div className="w-full flex flex-col items-center gap-12 print:gap-0 print:w-full">
          {viewMode === 'single' ? (
            /* Single Sheet View */
            <div className="flex flex-col items-center">
              <div className="text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-wider print:hidden">
                Visualizando Folha {previewPage} de {totalPages} • Caderno {previewVersion}
              </div>
              <A4ExamSheet
                exam={exam}
                questions={
                  pagesData.find((p) => p.pageNumber === previewPage)?.questions ||
                  page1Questions
                }
                pageNumber={previewPage}
                totalPages={totalPages}
                versionLetter={previewVersion}
                showAnswerKey={showAnswerKeyInPreview}
                showQrCode={showQrCodeInPreview}
                includeBoxNota={includeBoxNota}
                scale={previewZoom / 100}
              />
            </div>
          ) : (
            /* All Sheets View: Both Page 1 and Page 2 rendered together on drafting desk */
            pagesData.map((page) => (
              <div key={page.pageNumber} className="flex flex-col items-center print:w-full">
                <div className="text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-wider print:hidden">
                  Folha {page.pageNumber} de {totalPages} • Caderno {previewVersion}
                </div>
                <A4ExamSheet
                  exam={exam}
                  questions={page.questions}
                  pageNumber={page.pageNumber}
                  totalPages={totalPages}
                  versionLetter={previewVersion}
                  showAnswerKey={showAnswerKeyInPreview}
                  showQrCode={showQrCodeInPreview}
                  includeBoxNota={includeBoxNota}
                  scale={previewZoom / 100}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
