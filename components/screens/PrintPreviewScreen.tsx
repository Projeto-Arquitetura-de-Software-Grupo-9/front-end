'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { A4ExamSheet, A4BlankVersoSheet, A4ExamQuestion } from '@/components/common/A4ExamSheet';
import { A4AnswerSheet, A4AnswerSheetQuestion } from '@/components/common/A4AnswerSheet';
import { api } from '@/lib/api';
import {
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  FileText,
  Layers,
  UserCheck,
} from 'lucide-react';

export const PrintPreviewScreen: React.FC = () => {
  const {
    selectedExam,
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
    students,
    addToast,
  } = useApp();

  const [viewMode, setViewMode] = useState<'single' | 'all'>('single');
  const [includeBoxNota, setIncludeBoxNota] = useState(true);
  const [isDuplexMode, setIsDuplexMode] = useState<boolean>(true);
  const [includeAnswerSheet, setIncludeAnswerSheet] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('all_students');

  const isBatchMode = selectedStudentId === 'all_students';

  const currentStudent =
    selectedStudentId !== 'none' && selectedStudentId !== 'all_students'
      ? students.find((s) => s.id === selectedStudentId) || null
      : null;

  const handleSelectStudent = (stdId: string) => {
    setSelectedStudentId(stdId);
    if (stdId !== 'none' && stdId !== 'all_students') {
      const stdIdx = students.findIndex((s) => s.id === stdId);
      const numV = selectedExam?.numberOfVersions || 4;
      const assignedLetter = (['A', 'B', 'C', 'D'] as const)[stdIdx % numV];
      setPreviewVersion(assignedLetter);
    }
  };

  const exam = selectedExam || {
    id: 'exam-default',
    title: 'P1 - Direito Constitucional I - 2024.2',
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

  // Helper to resolve questions for a specific Caderno version (A, B, C, D)
  const getQuestionsForVersion = (vLetter: 'A' | 'B' | 'C' | 'D'): A4ExamQuestion[] => {
    const vData = (exam as any).versions?.find(
      (v: any) => v.versionLetter === vLetter
    );

    if (vData?.questions && vData.questions.length > 0) {
      return vData.questions.map((qv: any, idx: number) => ({
        id: qv.originalQuestionId || `q-${idx}`,
        orderIndex: idx + 1,
        statement: qv.statement,
        alternatives: qv.alternatives,
        correctAlternative: qv.correctAlternative,
      }));
    }

    const baseQuestions = (exam.selectedQuestionIds
      ?.map((id) => questions.find((q) => q.id === id))
      .filter((q): q is NonNullable<typeof q> => q !== undefined) || questions.slice(0, 5));

    let reordered = [...baseQuestions];
    if (vLetter === 'B' && reordered.length >= 2) {
      reordered = [reordered[1], ...reordered.slice(2), reordered[0]];
    } else if (vLetter === 'C' && reordered.length >= 3) {
      reordered = [reordered[2], reordered[0], ...reordered.slice(3), reordered[1]];
    } else if (vLetter === 'D' && reordered.length >= 4) {
      reordered = [reordered[3], ...reordered.slice(0, 3), ...reordered.slice(4)];
    }

    return reordered.map((q, idx) => ({
      id: q.id,
      orderIndex: idx + 1,
      statement: q.statement,
      alternatives: q.alternatives,
      correctAlternative: q.correctAlternative,
    }));
  };

  const paginateQuestions = (vQuestions: A4ExamQuestion[]) => {
    const QUESTIONS_PAGE_1 = 3;
    const QUESTIONS_SUBSEQUENT_PAGES = 3;

    const page1Questions = vQuestions.slice(0, QUESTIONS_PAGE_1);
    const remainingQuestions = vQuestions.slice(QUESTIONS_PAGE_1);

    const additionalPagesCount = Math.max(
      remainingQuestions.length > 0 ? Math.ceil(remainingQuestions.length / QUESTIONS_SUBSEQUENT_PAGES) : 0,
      1
    );

    const totalPages = 1 + additionalPagesCount;

    const pagesData: { pageNumber: number; questions: A4ExamQuestion[] }[] = [
      { pageNumber: 1, questions: page1Questions },
    ];

    for (let p = 2; p <= totalPages; p++) {
      const startIndex = (p - 2) * QUESTIONS_SUBSEQUENT_PAGES;
      const pQuestions = remainingQuestions.slice(startIndex, startIndex + QUESTIONS_SUBSEQUENT_PAGES);
      pagesData.push({
        pageNumber: p,
        questions: pQuestions.length > 0 ? pQuestions : vQuestions.slice(3, 5),
      });
    }

    return { totalPages, pagesData };
  };

  const getAnswerSheetQuestionsForVersion = (vLetter: 'A' | 'B' | 'C' | 'D'): A4AnswerSheetQuestion[] => {
    const vQuestions = getQuestionsForVersion(vLetter);
    return vQuestions.map((q) => ({
      orderIndex: q.orderIndex,
      letters:
        q.alternatives && q.alternatives.length > 0
          ? q.alternatives.map((a) => a.letter)
          : ['A', 'B', 'C', 'D', 'E'],
    }));
  };

  type SheetItem =
    | { type: 'question'; pageNumber: number; questions: A4ExamQuestion[] }
    | { type: 'booklet_blank_verso'; pageNumber: number }
    | { type: 'answer_sheet'; pageNumber: number; questions: A4AnswerSheetQuestion[] }
    | { type: 'answer_sheet_blank_verso'; pageNumber: number };

  const buildStudentSheets = (
    assignedLetter: 'A' | 'B' | 'C' | 'D'
  ): { sheets: SheetItem[]; totalPagesCount: number } => {
    const vQuestions = getQuestionsForVersion(assignedLetter);
    const { pagesData } = paginateQuestions(vQuestions);
    const numQPages = pagesData.length;

    const sheets: SheetItem[] = [];
    let curPage = 1;

    // 1. Regular Question Pages
    pagesData.forEach((p) => {
      sheets.push({
        type: 'question',
        pageNumber: curPage++,
        questions: p.questions,
      });
    });

    if (includeAnswerSheet) {
      // If duplex and question booklet ends on an odd page, insert blank verso
      // so the answer sheet starts cleanly on its own fresh physical sheet
      if (isDuplexMode && numQPages % 2 !== 0) {
        sheets.push({
          type: 'booklet_blank_verso',
          pageNumber: curPage++,
        });
      }

      // 2. Official OMR Answer Sheet
      const ansQuestions = getAnswerSheetQuestionsForVersion(assignedLetter);
      sheets.push({
        type: 'answer_sheet',
        pageNumber: curPage++,
        questions: ansQuestions,
      });

      // 3. Verso of Answer Sheet (if duplex mode, to prevent bleeding into next student and provide draft space)
      if (isDuplexMode) {
        sheets.push({
          type: 'answer_sheet_blank_verso',
          pageNumber: curPage++,
        });
      }
    } else {
      // Only Question Booklet
      if (isDuplexMode && numQPages % 2 !== 0) {
        sheets.push({
          type: 'booklet_blank_verso',
          pageNumber: curPage++,
        });
      }
    }

    return { sheets, totalPagesCount: sheets.length };
  };

  const singleStudentSheets = buildStudentSheets(previewVersion);
  const effectiveTotalPages = singleStudentSheets.totalPagesCount;

  const allStudentsBatch = students.map((std, stdIdx) => {
    const numV = selectedExam?.numberOfVersions || 4;
    const assignedLetter = (['A', 'B', 'C', 'D'] as const)[stdIdx % numV];
    const { sheets, totalPagesCount } = buildStudentSheets(assignedLetter);
    return {
      student: std,
      studentIndex: stdIdx,
      assignedLetter,
      sheets,
      totalPages: totalPagesCount,
    };
  });

  const handlePrint = () => {
    window.print();
  };

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      const examId = exam.id || 'exam-catolica-01';
      const backendUrl = api.getExamPdfUrl(examId, {
        versionLetter: previewVersion,
        showAnswerKey: showAnswerKeyInPreview,
        showQrCode: showQrCodeInPreview,
        includeBoxNota,
        isDuplex: isDuplexMode,
        includeAnswerSheet,
      });

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
        window.print();
      }
    } catch {
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-xs bg-white animate-in fade-in duration-200 print:border-none print:shadow-none print:rounded-none">
      {/* Integrated Workbench Toolbar */}
      <div className="bg-white px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 print:hidden">
        {/* Left Controls: Caderno, Aluno & Visualização */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Caderno Version Selector */}
          {!isBatchMode && (
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              {(['A', 'B', 'C', 'D'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => {
                    setSelectedStudentId('none');
                    setPreviewVersion(v);
                  }}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                    previewVersion === v
                      ? 'bg-[#9E0B1A] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Caderno {v}
                </button>
              ))}
            </div>
          )}

          {/* Student Selector */}
          <div className="relative">
            <select
              value={selectedStudentId}
              onChange={(e) => handleSelectStudent(e.target.value)}
              className={`text-xs font-bold rounded-lg px-2.5 py-1.5 pr-7 appearance-none cursor-pointer focus:outline-none border ${
                isBatchMode
                  ? 'bg-red-50 border-red-300 text-red-950'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <option value="none">Caderno Geral (Sem Nome)</option>
              <option value="all_students">
                🖨️ Turma Completa ({students.length} Provas em Lote)
              </option>
              <optgroup label="Aluno Individual:">
                {students.map((s, sIdx) => {
                  const numV = selectedExam?.numberOfVersions || 4;
                  const v = (['A', 'B', 'C', 'D'] as const)[sIdx % numV];
                  return (
                    <option key={s.id} value={s.id}>
                      {s.name} — Caderno {v}
                    </option>
                  );
                })}
              </optgroup>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* View Mode Toggle: Single vs All Pages (when not in batch mode) */}
          {!isBatchMode && (
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs">
              <button
                onClick={() => setViewMode('single')}
                className={`px-2 py-1 rounded font-semibold transition cursor-pointer flex items-center gap-1 ${
                  viewMode === 'single' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Visualizar uma folha por vez"
              >
                <FileText className="w-3.5 h-3.5" /> Folha Única
              </button>
              <button
                onClick={() => setViewMode('all')}
                className={`px-2 py-1 rounded font-semibold transition cursor-pointer flex items-center gap-1 ${
                  viewMode === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Visualizar todas as folhas lado a lado"
              >
                <Layers className="w-3.5 h-3.5" /> Todas as Folhas
              </button>
            </div>
          )}

          {/* Pagination (if single mode) */}
          {!isBatchMode && viewMode === 'single' && (
            <div className="flex items-center gap-1 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded-lg">
              <button
                onClick={() => setPreviewPage(Math.max(1, previewPage - 1))}
                disabled={previewPage === 1}
                className="p-0.5 rounded hover:bg-slate-200 disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-1">{previewPage} / {effectiveTotalPages}</span>
              <button
                onClick={() => setPreviewPage(Math.min(effectiveTotalPages, previewPage + 1))}
                disabled={previewPage === effectiveTotalPages}
                className="p-0.5 rounded hover:bg-slate-200 disabled:opacity-30 cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Right Controls: Zoom, Toggles & Primary Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Zoom */}
          <div className="relative">
            <select
              value={previewZoom}
              onChange={(e) => setPreviewZoom(parseInt(e.target.value))}
              className="text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 pr-6 appearance-none cursor-pointer focus:outline-none"
            >
              <option value={50}>50%</option>
              <option value={75}>75%</option>
              <option value={100}>100%</option>
              <option value={125}>125%</option>
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Compact Toggles */}
          <div className="flex items-center gap-3 text-xs text-slate-600 font-medium border-l border-slate-200 pl-3">
            <label
              className="flex items-center gap-1.5 cursor-pointer select-none"
              title="Anexar a Folha de Respostas OMR ao caderno de prova em uma única impressão"
            >
              <input
                type="checkbox"
                checked={includeAnswerSheet}
                onChange={(e) => setIncludeAnswerSheet(e.target.checked)}
                className="rounded accent-[#9E0B1A] text-[#9E0B1A] focus:ring-[#9E0B1A] w-3.5 h-3.5 cursor-pointer"
              />
              <span className={`font-semibold ${includeAnswerSheet ? 'text-slate-900 font-bold' : 'text-slate-600'}`}>
                Cartão-Resposta
              </span>
            </label>

            <label
              className="flex items-center gap-1.5 cursor-pointer select-none"
              title="Imprimir em frente e verso (duplex) com margens espelhadas e compensação de verso em branco"
            >
              <input
                type="checkbox"
                checked={isDuplexMode}
                onChange={(e) => setIsDuplexMode(e.target.checked)}
                className="rounded accent-[#9E0B1A] text-[#9E0B1A] focus:ring-[#9E0B1A] w-3.5 h-3.5 cursor-pointer"
              />
              <span className={`font-semibold ${isDuplexMode ? 'text-slate-900 font-bold' : 'text-slate-600'}`}>
                Frente e Verso
              </span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeBoxNota}
                onChange={(e) => setIncludeBoxNota(e.target.checked)}
                className="rounded accent-[#9E0B1A] text-[#9E0B1A] focus:ring-[#9E0B1A] w-3.5 h-3.5 cursor-pointer"
              />
              <span>Box NOTA</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showAnswerKeyInPreview}
                onChange={(e) => setShowAnswerKeyInPreview(e.target.checked)}
                className="rounded accent-[#9E0B1A] text-[#9E0B1A] focus:ring-[#9E0B1A] w-3.5 h-3.5 cursor-pointer"
              />
              <span>Gabarito</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showQrCodeInPreview}
                onChange={(e) => setShowQrCodeInPreview(e.target.checked)}
                className="rounded accent-[#9E0B1A] text-[#9E0B1A] focus:ring-[#9E0B1A] w-3.5 h-3.5 cursor-pointer"
              />
              <span>QR Code</span>
            </label>
          </div>

          {/* Action Buttons: Export PDF & Print */}
          <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
            <button
              onClick={handleExportPdf}
              disabled={isExporting}
              className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
              title="Baixar em formato PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Baixando...' : 'PDF'}</span>
            </button>

            <button
              onClick={handlePrint}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-xs ${
                isBatchMode ? 'bg-[#9E0B1A] hover:bg-[#850916]' : 'bg-slate-900 hover:bg-black'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isBatchMode ? `Imprimir Lote (${students.length})` : 'Imprimir'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Realistic Virtual Drafting Desk Environment simulating physical A4 paper sheets */}
      <div className="bg-slate-200/80 p-6 sm:p-10 shadow-inner overflow-x-auto min-h-[750px] flex flex-col items-center justify-start print:bg-white print:p-0 print:shadow-none print:min-h-0">
        <div className="w-full flex flex-col items-center gap-10 print:gap-0 print:w-full">
          {/* Batch Print Mode Banner */}
          {isBatchMode && (
            <div className="w-full max-w-[210mm] bg-red-50 border border-red-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs print:hidden">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#9E0B1A] text-white flex items-center justify-center flex-shrink-0">
                  <Printer className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-red-950 flex flex-wrap items-center gap-2">
                    <span>Lote de Impressão Nominal: Turma Completa</span>
                    <span className="px-2 py-0.2 rounded bg-red-200/70 text-[#9E0B1A] text-[10px] font-bold">
                      {students.length} Provas
                    </span>
                    <span className="px-2 py-0.2 rounded bg-blue-100 text-blue-900 text-[10px] font-bold">
                      {isDuplexMode ? 'Frente e Verso (Duplex Ativo)' : 'Modo Simplex'}
                    </span>
                    {includeAnswerSheet && (
                      <span className="px-2 py-0.2 rounded bg-emerald-100 text-emerald-900 text-[10px] font-bold">
                        Com Cartão-Resposta OMR
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-red-800">
                    Provas nominais com distribuição de Cadernos A, B, C e D {includeAnswerSheet ? '+ Cartão-Resposta OMR individual' : ''} {isDuplexMode ? 'e compensação automática de verso em branco.' : 'e quebras de página automáticas.'}
                  </p>
                </div>
              </div>
              <button
                onClick={handlePrint}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#9E0B1A] hover:bg-[#850916] text-white rounded-lg text-xs font-bold transition cursor-pointer flex-shrink-0"
              >
                <Printer className="w-3.5 h-3.5" /> Imprimir Todas as Provas
              </button>
            </div>
          )}

          {isBatchMode ? (
            /* BATCH PRINT MODE: Render all students' full exams */
            <div className="w-full flex flex-col items-center gap-8 print:gap-0 print:w-full">
              {allStudentsBatch.map((batchItem) => (
                <div
                  key={batchItem.student.id}
                  className="w-full flex flex-col items-center gap-4 print:gap-0 print:w-full"
                >
                  {/* Student Section Header in Preview Screen */}
                  <div className="w-full max-w-[210mm] flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs print:hidden">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                        {batchItem.studentIndex + 1}
                      </span>
                      <span>{batchItem.student.name}</span>
                      <span className="text-slate-400 font-mono text-[11px]">
                        ({batchItem.student.registration})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isDuplexMode && (
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                          Duplex ({batchItem.totalPages} pág{batchItem.totalPages > 1 ? 's' : ''})
                        </span>
                      )}
                      {includeAnswerSheet && (
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                          + Cartão OMR
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded bg-red-50 text-[#9E0B1A] border border-red-200 text-[11px] font-bold">
                        Caderno {batchItem.assignedLetter}
                      </span>
                    </div>
                  </div>

                  {/* Render sheets in order */}
                  {batchItem.sheets.map((sheet) => {
                    if (sheet.type === 'question') {
                      return (
                        <A4ExamSheet
                          key={`${batchItem.student.id}-p${sheet.pageNumber}`}
                          exam={exam}
                          questions={sheet.questions}
                          pageNumber={sheet.pageNumber}
                          totalPages={batchItem.totalPages}
                          versionLetter={batchItem.assignedLetter}
                          showAnswerKey={showAnswerKeyInPreview}
                          showQrCode={showQrCodeInPreview}
                          includeBoxNota={includeBoxNota}
                          isDuplex={isDuplexMode}
                          student={{
                            name: batchItem.student.name,
                            registration: batchItem.student.registration,
                          }}
                          scale={previewZoom / 100}
                        />
                      );
                    }
                    if (sheet.type === 'booklet_blank_verso') {
                      return (
                        <A4BlankVersoSheet
                          key={`${batchItem.student.id}-booklet-blank-verso`}
                          versionLetter={batchItem.assignedLetter}
                          examCode={exam.code || '#CAT-DIR-2026.1'}
                          pageNumber={sheet.pageNumber}
                          totalPages={batchItem.totalPages}
                          studentName={batchItem.student.name}
                          scale={previewZoom / 100}
                        />
                      );
                    }
                    if (sheet.type === 'answer_sheet') {
                      return (
                        <A4AnswerSheet
                          key={`${batchItem.student.id}-answer-sheet`}
                          examTitle={exam.title}
                          examCode={exam.code || '#CAT-DIR-2026.1'}
                          discipline={exam.discipline}
                          classGroup={exam.classGroup}
                          institution={exam.institution}
                          versionLetter={batchItem.assignedLetter}
                          questions={sheet.questions}
                          pageNumber={sheet.pageNumber}
                          totalPages={batchItem.totalPages}
                          isDuplex={isDuplexMode}
                          student={{
                            name: batchItem.student.name,
                            registration: batchItem.student.registration,
                            discipline: exam.discipline,
                            classGroup: exam.classGroup,
                          }}
                          scale={previewZoom / 100}
                        />
                      );
                    }
                    if (sheet.type === 'answer_sheet_blank_verso') {
                      return (
                        <A4BlankVersoSheet
                          key={`${batchItem.student.id}-ans-blank-verso`}
                          versionLetter={batchItem.assignedLetter}
                          examCode={exam.code || '#CAT-DIR-2026.1'}
                          pageNumber={sheet.pageNumber}
                          totalPages={batchItem.totalPages}
                          studentName={batchItem.student.name}
                          badgeLabel="Verso 100% em Branco"
                          noticeTitle="Verso Totalmente em Branco (0% de Tinta)"
                          noticeDescription="Esta folha física não receberá nenhuma impressão no verso, garantindo que o Cartão-Resposta venha separado e totalmente limpo para devolução ao professor."
                          pureBlankInPrint={true}
                          scale={previewZoom / 100}
                        />
                      );
                    }
                    return null;
                  })}
                </div>
              ))}
            </div>
          ) : viewMode === 'single' ? (
            /* Single Sheet View */
            <div className="flex flex-col items-center">
              <div className="text-[11px] font-semibold text-slate-500 mb-2 print:hidden">
                Folha {previewPage} de {effectiveTotalPages} • Caderno {previewVersion}
                {isDuplexMode && (
                  <span className="ml-2 font-bold text-amber-700">
                    [{previewPage % 2 === 0 ? 'Verso' : 'Frente'}]
                  </span>
                )}
                {currentStudent && ` • Aluno: ${currentStudent.name}`}
              </div>

              {(() => {
                const activeSheet =
                  singleStudentSheets.sheets[previewPage - 1] || singleStudentSheets.sheets[0];
                if (!activeSheet) return null;

                if (activeSheet.type === 'question') {
                  return (
                    <A4ExamSheet
                      exam={exam}
                      questions={activeSheet.questions}
                      pageNumber={activeSheet.pageNumber}
                      totalPages={effectiveTotalPages}
                      versionLetter={previewVersion}
                      showAnswerKey={showAnswerKeyInPreview}
                      showQrCode={showQrCodeInPreview}
                      includeBoxNota={includeBoxNota}
                      isDuplex={isDuplexMode}
                      student={
                        currentStudent
                          ? { name: currentStudent.name, registration: currentStudent.registration }
                          : undefined
                      }
                      scale={previewZoom / 100}
                    />
                  );
                }
                if (activeSheet.type === 'booklet_blank_verso') {
                  return (
                    <A4BlankVersoSheet
                      versionLetter={previewVersion}
                      examCode={exam.code || '#CAT-DIR-2026.1'}
                      pageNumber={activeSheet.pageNumber}
                      totalPages={effectiveTotalPages}
                      studentName={currentStudent?.name}
                      scale={previewZoom / 100}
                    />
                  );
                }
                if (activeSheet.type === 'answer_sheet') {
                  return (
                    <A4AnswerSheet
                      examTitle={exam.title}
                      examCode={exam.code || '#CAT-DIR-2026.1'}
                      discipline={exam.discipline}
                      classGroup={exam.classGroup}
                      institution={exam.institution}
                      versionLetter={previewVersion}
                      questions={activeSheet.questions}
                      pageNumber={activeSheet.pageNumber}
                      totalPages={effectiveTotalPages}
                      isDuplex={isDuplexMode}
                      student={
                        currentStudent
                          ? {
                              name: currentStudent.name,
                              registration: currentStudent.registration,
                              discipline: exam.discipline,
                              classGroup: exam.classGroup,
                            }
                          : undefined
                      }
                      scale={previewZoom / 100}
                    />
                  );
                }
                if (activeSheet.type === 'answer_sheet_blank_verso') {
                  return (
                    <A4BlankVersoSheet
                      versionLetter={previewVersion}
                      examCode={exam.code || '#CAT-DIR-2026.1'}
                      pageNumber={activeSheet.pageNumber}
                      totalPages={effectiveTotalPages}
                      studentName={currentStudent?.name}
                      badgeLabel="Verso 100% em Branco"
                      noticeTitle="Verso Totalmente em Branco (0% de Tinta)"
                      noticeDescription="Esta folha física não receberá nenhuma impressão no verso, garantindo que o Cartão-Resposta venha separado e totalmente limpo para devolução ao professor."
                      pureBlankInPrint={true}
                      scale={previewZoom / 100}
                    />
                  );
                }
                return null;
              })()}
            </div>
          ) : (
            /* All Sheets View for Selected Version */
            <div className="w-full flex flex-col items-center gap-6 print:gap-0 print:w-full">
              {singleStudentSheets.sheets.map((sheet) => {
                if (sheet.type === 'question') {
                  return (
                    <div key={sheet.pageNumber} className="flex flex-col items-center print:w-full">
                      <div className="text-[11px] font-semibold text-slate-500 mb-2 print:hidden">
                        Folha {sheet.pageNumber} de {effectiveTotalPages} • Caderno {previewVersion}
                        {isDuplexMode && (
                          <span className="ml-2 font-bold text-slate-700">
                            [{sheet.pageNumber % 2 === 0 ? 'Verso' : 'Frente'}]
                          </span>
                        )}
                        {currentStudent && ` • Aluno: ${currentStudent.name}`}
                      </div>
                      <A4ExamSheet
                        exam={exam}
                        questions={sheet.questions}
                        pageNumber={sheet.pageNumber}
                        totalPages={effectiveTotalPages}
                        versionLetter={previewVersion}
                        showAnswerKey={showAnswerKeyInPreview}
                        showQrCode={showQrCodeInPreview}
                        includeBoxNota={includeBoxNota}
                        isDuplex={isDuplexMode}
                        student={
                          currentStudent
                            ? { name: currentStudent.name, registration: currentStudent.registration }
                            : undefined
                        }
                        scale={previewZoom / 100}
                      />
                    </div>
                  );
                }
                if (sheet.type === 'booklet_blank_verso') {
                  return (
                    <div key={sheet.pageNumber} className="flex flex-col items-center print:w-full">
                      <div className="text-[11px] font-semibold text-slate-500 mb-2 print:hidden">
                        Folha {sheet.pageNumber} de {effectiveTotalPages} (Verso do Caderno) • Caderno {previewVersion}
                      </div>
                      <A4BlankVersoSheet
                        versionLetter={previewVersion}
                        examCode={exam.code || '#CAT-DIR-2026.1'}
                        pageNumber={sheet.pageNumber}
                        totalPages={effectiveTotalPages}
                        studentName={currentStudent?.name}
                        scale={previewZoom / 100}
                      />
                    </div>
                  );
                }
                if (sheet.type === 'answer_sheet') {
                  return (
                    <div key={sheet.pageNumber} className="flex flex-col items-center print:w-full">
                      <div className="text-[11px] font-semibold text-slate-500 mb-2 print:hidden">
                        Folha {sheet.pageNumber} de {effectiveTotalPages} (Cartão-Resposta OMR) • Caderno {previewVersion}
                      </div>
                      <A4AnswerSheet
                        examTitle={exam.title}
                        examCode={exam.code || '#CAT-DIR-2026.1'}
                        discipline={exam.discipline}
                        classGroup={exam.classGroup}
                        institution={exam.institution}
                        versionLetter={previewVersion}
                        questions={sheet.questions}
                        pageNumber={sheet.pageNumber}
                        totalPages={effectiveTotalPages}
                        isDuplex={isDuplexMode}
                        student={
                          currentStudent
                            ? {
                                name: currentStudent.name,
                                registration: currentStudent.registration,
                                discipline: exam.discipline,
                                classGroup: exam.classGroup,
                              }
                            : undefined
                        }
                        scale={previewZoom / 100}
                      />
                    </div>
                  );
                }
                if (sheet.type === 'answer_sheet_blank_verso') {
                  return (
                    <div key={sheet.pageNumber} className="flex flex-col items-center print:w-full">
                      <div className="text-[11px] font-semibold text-slate-500 mb-2 print:hidden">
                        Folha {sheet.pageNumber} de {effectiveTotalPages} (Verso 100% em Branco) • Caderno {previewVersion}
                      </div>
                      <A4BlankVersoSheet
                        versionLetter={previewVersion}
                        examCode={exam.code || '#CAT-DIR-2026.1'}
                        pageNumber={sheet.pageNumber}
                        totalPages={effectiveTotalPages}
                        studentName={currentStudent?.name}
                        badgeLabel="Verso 100% em Branco"
                        noticeTitle="Verso Totalmente em Branco (0% de Tinta)"
                        noticeDescription="Esta folha física não receberá nenhuma impressão no verso, garantindo que o Cartão-Resposta venha separado e totalmente limpo para devolução ao professor."
                        pureBlankInPrint={true}
                        scale={previewZoom / 100}
                      />
                    </div>
                  );
                }
                return null;
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
