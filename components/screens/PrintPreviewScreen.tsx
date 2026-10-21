'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { A4ExamSheet, A4BlankVersoSheet, A4ExamQuestion } from '@/components/common/A4ExamSheet';
import { A4AnswerSheet, A4AnswerSheetQuestion } from '@/components/common/A4AnswerSheet';
import { getVersionLetters } from '@/lib/mock-data';
import { api } from '@/lib/api';
import {
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  FileText,
  Layers,
  Shuffle,
  SlidersHorizontal,
  BookOpenCheck,
  Users,
  UserX,
  CheckSquare,
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
    updateExamPrintConfig,
    reshuffleExamStudents,
    addToast,
  } = useApp();

  // Default states requested by user:
  // - Sem Box de Nota (includeBoxNota = false)
  // - Sem Gabarito (showAnswerKeyInPreview = false)
  // - Com Frente e Verso (isDuplexMode = true)
  // - Formato de impressão exato visível de imediato (viewMode = 'all')
  const [viewMode, setViewMode] = useState<'single' | 'all'>('all');
  const [includeBoxNota, setIncludeBoxNota] = useState<boolean>(false);
  const [isDuplexMode, setIsDuplexMode] = useState<boolean>(true);
  const [includeAnswerSheet, setIncludeAnswerSheet] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [showSecondaryOptions, setShowSecondaryOptions] = useState<boolean>(false);

  // Primary printing purpose:
  // 'application' = Prova para aplicação (Nominal ou Não Nominal)
  // 'post_exam_concepts' = Caderno de Correção Pós-Prova com Respostas e Conceitos Explicados
  const [printPurpose, setPrintPurpose] = useState<'application' | 'post_exam_concepts'>('application');

  // Nominal vs Não Nominal mode
  const [isNominalMode, setIsNominalMode] = useState<boolean>(
    selectedExam?.withStudentIdentification ?? true
  );
  // Specific student filter (secondary option when in Nominal mode: 'all_students' or a specific student ID)
  const [selectedStudentId, setSelectedStudentId] = useState<string>('all_students');

  // When in Não Nominal mode: print 'single_version' (just the selected Caderno) or 'all_versions' (1 of each N cadernos or X copies)
  const [nonNominalScope, setNonNominalScope] = useState<'single_version' | 'all_versions'>('all_versions');
  const [nonNominalTotalCopies, setNonNominalTotalCopies] = useState<number>(
    selectedExam?.numberOfVersions || 4
  );

  // Sync nominal mode when exam changes
  useEffect(() => {
    if (selectedExam) {
      const ident = selectedExam.withStudentIdentification ?? true;
      setIsNominalMode(ident);
      setNonNominalTotalCopies(selectedExam.numberOfVersions || 4);
      // Ensure defaults on load: no answer key, no box nota, duplex on
      setShowAnswerKeyInPreview(false);
      setIncludeBoxNota(false);
      setIsDuplexMode(true);
    }
  }, [selectedExam?.id]);

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
    shuffleQuestions: true,
    shuffleAlternatives: true,
    numberOfVersions: 4,
    withStudentIdentification: true,
  };

  const numVersions = Math.max(1, Math.min(26, exam.numberOfVersions || 4));
  const versionLetters = getVersionLetters(numVersions);
  const isRandomOrder = (exam.shuffleQuestions ?? true) || numVersions > 1;

  // Keep previewVersion valid if numVersions decreases
  useEffect(() => {
    if (!versionLetters.includes(previewVersion)) {
      setPreviewVersion(versionLetters[0] || 'A');
    }
  }, [numVersions, previewVersion]);

  // Helper to get a student's randomly assigned version (never sequential A, B, C, D)
  const getStudentAssignedVersion = (stdId: string, fallbackIndex: number): string => {
    const assignment = (exam as any).studentAssignments?.find(
      (a: any) => a.studentId === stdId
    );
    if (assignment?.assignedVersion && versionLetters.includes(assignment.assignedVersion)) {
      return assignment.assignedVersion;
    }
    // Non-sequential fallback if not yet in studentAssignments
    const nonSeqIdx = (fallbackIndex * 7 + 2) % versionLetters.length;
    return versionLetters[nonSeqIdx];
  };

  const handleToggleNominal = (nominal: boolean) => {
    setIsNominalMode(nominal);
    if (nominal) {
      setSelectedStudentId('all_students');
    } else {
      setSelectedStudentId('none');
    }
    if (selectedExam) {
      updateExamPrintConfig(selectedExam.id, { withStudentIdentification: nominal });
    }
  };

  const handleToggleRandomQuestions = (random: boolean) => {
    if (!selectedExam) return;
    if (random) {
      const targetN = selectedExam.numberOfVersions > 1 ? selectedExam.numberOfVersions : 4;
      updateExamPrintConfig(selectedExam.id, {
        shuffleQuestions: true,
        shuffleAlternatives: true,
        numberOfVersions: targetN,
      });
      setNonNominalTotalCopies(targetN);
    } else {
      updateExamPrintConfig(selectedExam.id, {
        shuffleQuestions: false,
        shuffleAlternatives: false,
        numberOfVersions: 1,
      });
      setPreviewVersion('A');
      setNonNominalTotalCopies(1);
    }
  };

  const handleChangeNumVersions = (n: number) => {
    const safeN = Math.max(1, Math.min(26, n || 1));
    if (selectedExam) {
      updateExamPrintConfig(selectedExam.id, {
        numberOfVersions: safeN,
        shuffleQuestions: safeN > 1 ? true : selectedExam.shuffleQuestions,
      });
    }
    setNonNominalTotalCopies((prev) => Math.max(safeN, prev));
  };

  const handleSwitchPurpose = (purpose: 'application' | 'post_exam_concepts') => {
    setPrintPurpose(purpose);
    if (purpose === 'post_exam_concepts') {
      // Post-exam correction booklet shows answers + conceptual explanations on the question booklet
      setShowAnswerKeyInPreview(true);
    } else {
      setShowAnswerKeyInPreview(false);
    }
  };

  const handleSelectIndividualStudent = (stdId: string) => {
    if (stdId === 'all_students') {
      setIsNominalMode(true);
      setSelectedStudentId('all_students');
    } else if (stdId === 'none') {
      setIsNominalMode(false);
      setSelectedStudentId('none');
    } else {
      setIsNominalMode(true);
      setSelectedStudentId(stdId);
      const sIdx = students.findIndex((s) => s.id === stdId);
      const assigned = getStudentAssignedVersion(stdId, Math.max(0, sIdx));
      setPreviewVersion(assigned);
    }
  };

  const currentStudent =
    isNominalMode && selectedStudentId !== 'none' && selectedStudentId !== 'all_students'
      ? students.find((s) => s.id === selectedStudentId) || null
      : null;

  // Helper to resolve questions for any Caderno version (A..Z) including conceptual explanation
  const getQuestionsForVersion = (vLetter: string): A4ExamQuestion[] => {
    const vData = (exam as any).versions?.find(
      (v: any) => v.versionLetter === vLetter
    );

    if (vData?.questions && vData.questions.length > 0) {
      return vData.questions.map((qv: any, idx: number) => {
        const origQ = questions.find((q) => q.id === qv.originalQuestionId);
        return {
          id: qv.originalQuestionId || `q-${idx}`,
          orderIndex: idx + 1,
          statement: qv.statement,
          alternatives: qv.alternatives,
          correctAlternative: qv.correctAlternative,
          explanation: qv.explanation || origQ?.explanation,
          topic: qv.topic || origQ?.topic,
        };
      });
    }

    const baseQuestions =
      exam.selectedQuestionIds
        ?.map((id) => questions.find((q) => q.id === id))
        .filter((q): q is NonNullable<typeof q> => q !== undefined) || questions.slice(0, 5);

    const vIdx = Math.max(0, versionLetters.indexOf(vLetter));
    let reordered = [...baseQuestions];
    if (vIdx > 0 && reordered.length > 1 && (exam.shuffleQuestions ?? true)) {
      const shift = (vIdx * 2 - 1) % reordered.length;
      reordered = [...reordered.slice(shift), ...reordered.slice(0, shift)];
    }

    return reordered.map((q, idx) => ({
      id: q.id,
      orderIndex: idx + 1,
      statement: q.statement,
      alternatives: q.alternatives,
      correctAlternative: q.correctAlternative,
      explanation: q.explanation,
      topic: q.topic,
    }));
  };

  const paginateQuestions = (vQuestions: A4ExamQuestion[]) => {
    const QUESTIONS_PAGE_1 = showConceptExplanations ? 2 : 3;
    const QUESTIONS_SUBSEQUENT_PAGES = showConceptExplanations ? 2 : 3;

    const page1Questions = vQuestions.slice(0, QUESTIONS_PAGE_1);
    const remainingQuestions = vQuestions.slice(QUESTIONS_PAGE_1);

    const additionalPagesCount =
      remainingQuestions.length > 0
        ? Math.ceil(remainingQuestions.length / QUESTIONS_SUBSEQUENT_PAGES)
        : 0;

    const totalPages = 1 + additionalPagesCount;

    const pagesData: { pageNumber: number; questions: A4ExamQuestion[] }[] = [
      { pageNumber: 1, questions: page1Questions },
    ];

    for (let p = 2; p <= totalPages; p++) {
      const startIndex = (p - 2) * QUESTIONS_SUBSEQUENT_PAGES;
      const pQuestions = remainingQuestions.slice(startIndex, startIndex + QUESTIONS_SUBSEQUENT_PAGES);
      if (pQuestions.length > 0) {
        pagesData.push({
          pageNumber: p,
          questions: pQuestions,
        });
      }
    }

    return { totalPages: pagesData.length, pagesData };
  };

  const showConceptExplanations = printPurpose === 'post_exam_concepts';
  const effectiveIncludeAnswerSheet =
    printPurpose === 'post_exam_concepts' ? false : includeAnswerSheet;

  const getAnswerSheetQuestionsForVersion = (vLetter: string): A4AnswerSheetQuestion[] => {
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

  const buildBookletSheets = (
    assignedLetter: string
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

    if (effectiveIncludeAnswerSheet) {
      // If duplex and question booklet ends on an odd page, insert blank verso
      // so the answer sheet starts cleanly on its own fresh physical sheet
      if (isDuplexMode && numQPages % 2 !== 0) {
        sheets.push({
          type: 'booklet_blank_verso',
          pageNumber: curPage++,
        });
      }

      // 2. Official OMR Answer Sheet (separate physical sheet)
      const ansQuestions = getAnswerSheetQuestionsForVersion(assignedLetter);
      sheets.push({
        type: 'answer_sheet',
        pageNumber: curPage++,
        questions: ansQuestions,
      });

      // 3. Verso of Answer Sheet (100% blank in print so answer sheet can be returned separately)
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

  const singleVersionSheets = buildBookletSheets(previewVersion);
  const effectiveTotalPages = singleVersionSheets.totalPagesCount;

  // Nominal Batch: All students with their randomly assigned versions
  const nominalStudentsBatch = students.map((std, stdIdx) => {
    const assignedLetter = getStudentAssignedVersion(std.id, stdIdx);
    const { sheets, totalPagesCount } = buildBookletSheets(assignedLetter);
    return {
      key: std.id,
      label: std.name,
      subLabel: std.registration,
      student: { name: std.name, registration: std.registration },
      index: stdIdx,
      assignedLetter,
      sheets,
      totalPages: totalPagesCount,
    };
  });

  // Non-Nominal Batch: N copies distributed across the N cadernos without student names
  const nonNominalBatch = Array.from(
    { length: Math.max(1, Math.min(200, nonNominalTotalCopies)) },
    (_, copyIdx) => {
      const assignedLetter = versionLetters[copyIdx % versionLetters.length];
      const { sheets, totalPagesCount } = buildBookletSheets(assignedLetter);
      return {
        key: `avulsa-${copyIdx + 1}`,
        label: `Prova Avulsa #${copyIdx + 1} (Sem Identificação Nominal)`,
        subLabel: `Caderno ${assignedLetter}`,
        student: undefined,
        index: copyIdx,
        assignedLetter,
        sheets,
        totalPages: totalPagesCount,
      };
    }
  );

  // Determine if we are rendering a multi-exam batch or a single exam booklet
  const isNominalBatch =
    printPurpose === 'application' && isNominalMode && selectedStudentId === 'all_students';
  const isNonNominalBatch =
    printPurpose === 'application' && !isNominalMode && nonNominalScope === 'all_versions';
  const isBatchMode = isNominalBatch || isNonNominalBatch;
  const activeBatchItems = isNominalBatch ? nominalStudentsBatch : nonNominalBatch;

  const handlePrint = () => {
    window.print();
  };

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      const examId = exam.id || 'exam-catolica-01';
      const backendUrl = api.getExamPdfUrl(examId, {
        versionLetter: previewVersion,
        showAnswerKey: showAnswerKeyInPreview || showConceptExplanations,
        showQrCode: showQrCodeInPreview,
        includeBoxNota,
        isDuplex: isDuplexMode,
        includeAnswerSheet: effectiveIncludeAnswerSheet,
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

  const renderSheetComponent = (
    sheet: SheetItem,
    totalPages: number,
    vLetter: string,
    studentObj?: { name: string; registration: string },
    keyPrefix: string = 'single'
  ) => {
    if (sheet.type === 'question') {
      return (
        <A4ExamSheet
          key={`${keyPrefix}-q-${sheet.pageNumber}`}
          exam={exam}
          questions={sheet.questions}
          pageNumber={sheet.pageNumber}
          totalPages={totalPages}
          versionLetter={vLetter}
          showAnswerKey={showAnswerKeyInPreview || showConceptExplanations}
          showConceptExplanations={showConceptExplanations}
          showQrCode={showQrCodeInPreview}
          includeBoxNota={includeBoxNota}
          isDuplex={isDuplexMode}
          student={studentObj}
          scale={previewZoom / 100}
        />
      );
    }
    if (sheet.type === 'booklet_blank_verso') {
      return (
        <A4BlankVersoSheet
          key={`${keyPrefix}-bverso-${sheet.pageNumber}`}
          versionLetter={vLetter}
          examCode={exam.code || '#CAT-DIR-2026.1'}
          pageNumber={sheet.pageNumber}
          totalPages={totalPages}
          studentName={studentObj?.name}
          scale={previewZoom / 100}
        />
      );
    }
    if (sheet.type === 'answer_sheet') {
      return (
        <A4AnswerSheet
          key={`${keyPrefix}-ans-${sheet.pageNumber}`}
          examTitle={exam.title}
          examCode={exam.code || '#CAT-DIR-2026.1'}
          discipline={exam.discipline}
          classGroup={exam.classGroup}
          institution={exam.institution}
          versionLetter={vLetter}
          questions={sheet.questions}
          pageNumber={sheet.pageNumber}
          totalPages={totalPages}
          isDuplex={isDuplexMode}
          student={
            studentObj
              ? {
                  name: studentObj.name,
                  registration: studentObj.registration,
                  discipline: exam.discipline,
                  classGroup: exam.classGroup,
                }
              : undefined
          }
          scale={previewZoom / 100}
        />
      );
    }
    if (sheet.type === 'answer_sheet_blank_verso') {
      return (
        <A4BlankVersoSheet
          key={`${keyPrefix}-ansverso-${sheet.pageNumber}`}
          versionLetter={vLetter}
          examCode={exam.code || '#CAT-DIR-2026.1'}
          pageNumber={sheet.pageNumber}
          totalPages={totalPages}
          studentName={studentObj?.name}
          badgeLabel="Verso 100% em Branco"
          noticeTitle="Verso Totalmente em Branco (0% de Tinta)"
          noticeDescription="Esta folha física não receberá nenhuma impressão no verso, garantindo que o Cartão-Resposta venha separado e totalmente limpo para devolução ao professor."
          pureBlankInPrint={true}
          scale={previewZoom / 100}
        />
      );
    }
    return null;
  };

  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-xs bg-white animate-in fade-in duration-200 print:border-none print:shadow-none print:rounded-none">
      {/* =====================================================================
          PAINEL DE PRIMEIRO PLANO: CAMINHOS DIRETOS DE IMPRESSÃO
         ===================================================================== */}
      <div className="bg-white border-b border-slate-200 print:hidden">
        {/* Top Row: Finalidade da Impressão (Aplicação vs. Caderno Comentado Pós-Prova) + Ação Principal */}
        <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleSwitchPurpose('application')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                printPurpose === 'application'
                  ? 'bg-[#9E0B1A] text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>1. Imprimir Prova para Aplicação</span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchPurpose('post_exam_concepts')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                printPurpose === 'post_exam_concepts'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-900 hover:border-emerald-200'
              }`}
              title="Gera o caderno de perguntas com as respostas corretas e a explicação dos conceitos de cada questão para correção pós-prova"
            >
              <BookOpenCheck className="w-3.5 h-3.5" />
              <span>2. Caderno com Respostas e Conceitos (Pós-Prova)</span>
            </button>
          </div>

          {/* Primary Print & PDF Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSecondaryOptions(!showSecondaryOptions)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                showSecondaryOptions
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
              title="Box de nota, impressão de aluno específico, gabarito simples, QR Code e zoom"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Mais Opções</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${
                  showSecondaryOptions ? 'rotate-180' : ''
                }`}
              />
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
              title="Baixar em formato PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Baixando...' : 'PDF'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className={`inline-flex items-center gap-2 px-4 py-2 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-sm ${
                printPurpose === 'post_exam_concepts'
                  ? 'bg-emerald-700 hover:bg-emerald-800'
                  : 'bg-[#9E0B1A] hover:bg-[#850916]'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>
                {printPurpose === 'post_exam_concepts'
                  ? `Imprimir Gabarito Comentado (Caderno ${previewVersion})`
                  : isNominalBatch
                  ? `Imprimir Turma Nominal (${students.length} Provas)`
                  : isNonNominalBatch
                  ? `Imprimir Lote Avulso (${nonNominalTotalCopies} Cópias)`
                  : `Imprimir Caderno ${previewVersion}`}
              </span>
            </button>
          </div>
        </div>

        {/* Main 3 Direct Decisions Bar (when in Application Mode) */}
        {printPurpose === 'application' ? (
          <div className="px-4 py-3 grid grid-cols-1 lg:grid-cols-3 gap-3 bg-white">
            {/* CAMINHO 1: Nominal vs. Não Nominal */}
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/90 flex flex-col justify-between gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  1. Identificação do Aluno
                </span>
                {isNominalMode && (
                  <button
                    type="button"
                    onClick={() => selectedExam && reshuffleExamStudents(selectedExam.id)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#9E0B1A] hover:underline cursor-pointer"
                    title="Redistribuir aleatoriamente os cadernos entre os alunos da chamada"
                  >
                    <Shuffle className="w-3 h-3" /> Sortear Alunos
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleToggleNominal(true)}
                  className={`py-1.5 px-2.5 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    isNominalMode
                      ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Nominal ({students.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleNominal(false)}
                  className={`py-1.5 px-2.5 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    !isNominalMode
                      ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <UserX className="w-3.5 h-3.5" />
                  <span>Não Nominal</span>
                </button>
              </div>

              {/* Sub-control when Não Nominal is active */}
              {!isNominalMode ? (
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/70 text-[11px]">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setNonNominalScope('all_versions')}
                      className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                        nonNominalScope === 'all_versions'
                          ? 'bg-red-100 text-[#9E0B1A]'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Lote Avulso
                    </button>
                    <button
                      type="button"
                      onClick={() => setNonNominalScope('single_version')}
                      className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                        nonNominalScope === 'single_version'
                          ? 'bg-red-100 text-[#9E0B1A]'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      1 Caderno
                    </button>
                  </div>

                  {nonNominalScope === 'all_versions' && (
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500 font-semibold">Qtd:</span>
                      <input
                        type="number"
                        min={1}
                        max={200}
                        value={nonNominalTotalCopies}
                        onChange={(e) =>
                          setNonNominalTotalCopies(Math.max(1, parseInt(e.target.value) || 1))
                        }
                        className="w-12 px-1.5 py-0.5 text-center font-bold bg-white border border-slate-300 rounded text-slate-900"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-[10px] text-slate-500 font-medium pt-0.5 truncate">
                  Sorteio aleatório ativo (o 1º da chamada não recebe sempre A).
                </div>
              )}
            </div>

            {/* CAMINHO 2: Questões Aleatórias & N Cadernos vs. Ordem Fixa */}
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/90 flex flex-col justify-between gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  2. Questões e N Cadernos
                </span>
                <span className="text-[10px] font-bold text-[#9E0B1A] bg-red-50 px-2 py-0.2 rounded border border-red-200">
                  {numVersions === 1
                    ? 'Caderno Único (A)'
                    : `${numVersions} Cadernos (A–${versionLetters[versionLetters.length - 1]})`}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleToggleRandomQuestions(true)}
                  className={`py-1.5 px-2.5 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    isRandomOrder
                      ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>Aleatórias (N Cadernos)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleRandomQuestions(false)}
                  className={`py-1.5 px-2.5 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    !isRandomOrder
                      ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Ordem Fixa (1 Caderno)</span>
                </button>
              </div>

              {isRandomOrder ? (
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/70 text-[11px]">
                  <span className="text-slate-600 font-semibold">Nº de Cadernos (N):</span>
                  <div className="flex items-center gap-1">
                    {[2, 3, 4, 5, 6].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => handleChangeNumVersions(n)}
                        className={`w-6 h-6 rounded text-xs font-bold border transition cursor-pointer ${
                          numVersions === n
                            ? 'bg-[#9E0B1A] text-white border-[#9E0B1A]'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                    <input
                      type="number"
                      min={1}
                      max={26}
                      value={numVersions}
                      onChange={(e) => handleChangeNumVersions(parseInt(e.target.value) || 1)}
                      title="Digite qualquer quantidade de cadernos diferentes (1 a 26)"
                      className="w-12 h-6 px-1 text-center font-bold bg-white border border-slate-300 rounded text-slate-900 text-xs"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-[10px] text-slate-500 font-medium pt-0.5 truncate">
                  Todas as provas terão a mesma ordem de questões (Caderno A).
                </div>
              )}
            </div>

            {/* CAMINHO 3: Folha de Resposta Junto vs. Só Caderno */}
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/90 flex flex-col justify-between gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  3. Folha de Resposta OMR
                </span>
                <span className="text-[10px] font-semibold text-emerald-700">
                  {includeAnswerSheet ? 'Separada (Verso Limpo)' : 'Sem Cartão OMR'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setIncludeAnswerSheet(true)}
                  className={`py-1.5 px-2.5 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    includeAnswerSheet
                      ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Com Folha Junto</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIncludeAnswerSheet(false)}
                  className={`py-1.5 px-2.5 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    !includeAnswerSheet
                      ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Só Perguntas</span>
                </button>
              </div>

              <div className="text-[10px] text-slate-500 font-medium pt-0.5 truncate">
                {includeAnswerSheet
                  ? 'Sai em folha separada com verso 100% em branco para devolver.'
                  : 'Imprime apenas o caderno de questões da avaliação.'}
              </div>
            </div>
          </div>
        ) : (
          /* Banner when in Post-Exam Correction Booklet with Conceptual Explanations */
          <div className="px-4 py-3 bg-emerald-50/70 border-b border-emerald-200/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0">
                <BookOpenCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-emerald-950">
                  Caderno de Correção Pós-Prova — Gabarito Oficial e Explicação dos Conceitos
                </div>
                <p className="text-[11px] text-emerald-800">
                  Exibe a alternativa correta marcada em cada questão junto com a fundamentação teórica e explicação dos conceitos avaliados.
                </p>
              </div>
            </div>

            {/* Version Selector for Post-Exam Booklet */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-emerald-200 flex-wrap">
              {versionLetters.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setPreviewVersion(v)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                    previewVersion === v
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Caderno {v}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick Version / Student Bar when viewing a single booklet */}
        {!isBatchMode && printPurpose === 'application' && (
          <div className="px-4 py-2 bg-slate-50 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-slate-500 mr-1">
                Visualizando Caderno:
              </span>
              {versionLetters.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => {
                    setSelectedStudentId('none');
                    setPreviewVersion(v);
                  }}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                    previewVersion === v
                      ? 'bg-[#9E0B1A] text-white shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Caderno {v}
                </button>
              ))}
            </div>

            {currentStudent && (
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-slate-600">
                  Aluno selecionado: <strong>{currentStudent.name}</strong> (Caderno {previewVersion})
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedStudentId('all_students')}
                  className="text-[#9E0B1A] font-bold hover:underline cursor-pointer"
                >
                  Voltar para Turma Completa
                </button>
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            BARRA DE SEGUNDO PLANO: OPÇÕES SECUNDÁRIAS (Box Nota, Aluno Individual, Gabarito, Duplex, QR Code, Zoom)
           ===================================================================== */}
        {showSecondaryOptions && (
          <div className="px-4 py-3 bg-slate-100/90 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 animate-in fade-in duration-150">
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-700 font-medium">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                Opções em Segundo Plano:
              </span>

              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isDuplexMode}
                  onChange={(e) => setIsDuplexMode(e.target.checked)}
                  className="rounded accent-[#9E0B1A] w-3.5 h-3.5 cursor-pointer"
                />
                <span>Frente e Verso (Duplex)</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeBoxNota}
                  onChange={(e) => setIncludeBoxNota(e.target.checked)}
                  className="rounded accent-[#9E0B1A] w-3.5 h-3.5 cursor-pointer"
                />
                <span>Box de NOTA</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showAnswerKeyInPreview}
                  onChange={(e) => setShowAnswerKeyInPreview(e.target.checked)}
                  className="rounded accent-[#9E0B1A] w-3.5 h-3.5 cursor-pointer"
                />
                <span>Marcar Gabarito</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showQrCodeInPreview}
                  onChange={(e) => setShowQrCodeInPreview(e.target.checked)}
                  className="rounded accent-[#9E0B1A] w-3.5 h-3.5 cursor-pointer"
                />
                <span>QR Code OMR</span>
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Individual student selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-slate-500">
                  Filtrar Aluno:
                </span>
                <div className="relative">
                  <select
                    value={isNominalMode ? selectedStudentId : 'none'}
                    onChange={(e) => handleSelectIndividualStudent(e.target.value)}
                    className="text-xs font-semibold rounded-lg px-2.5 py-1 pr-7 bg-white border border-slate-300 text-slate-800 appearance-none cursor-pointer focus:outline-none"
                  >
                    <option value="all_students">Todos os Alunos ({students.length})</option>
                    <option value="none">Sem Aluno (Avulsa)</option>
                    <optgroup label="Imprimir Aluno Específico:">
                      {students.map((s, sIdx) => {
                        const v = getStudentAssignedVersion(s.id, sIdx);
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
              </div>

              {/* View Mode (All sheets vs Single sheet on screen) */}
              {!isBatchMode && (
                <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-300 text-xs">
                  <button
                    type="button"
                    onClick={() => setViewMode('all')}
                    className={`px-2 py-1 rounded font-semibold transition cursor-pointer flex items-center gap-1 ${
                      viewMode === 'all'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Layers className="w-3 h-3" /> Todas as Páginas
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('single')}
                    className={`px-2 py-1 rounded font-semibold transition cursor-pointer flex items-center gap-1 ${
                      viewMode === 'single'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <FileText className="w-3 h-3" /> Página Única
                  </button>
                </div>
              )}

              {/* Zoom */}
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-semibold text-slate-500">Zoom:</span>
                <select
                  value={previewZoom}
                  onChange={(e) => setPreviewZoom(parseInt(e.target.value))}
                  className="text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg px-2 py-1 cursor-pointer focus:outline-none"
                >
                  <option value={50}>50%</option>
                  <option value={75}>75%</option>
                  <option value={100}>100%</option>
                  <option value={125}>125%</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =====================================================================
          MESA DE VISUALIZAÇÃO EXATA A4 (SIMULADOR FÍSICO E IMPRESSÃO)
         ===================================================================== */}
      <div className="bg-slate-200/80 p-6 sm:p-10 shadow-inner overflow-x-auto min-h-[750px] flex flex-col items-center justify-start print:bg-white print:p-0 print:shadow-none print:min-h-0">
        <div className="w-full flex flex-col items-center gap-10 print:gap-0 print:w-full">
          {/* Batch Print Summary Banner */}
          {isBatchMode && (
            <div className="w-full max-w-[210mm] bg-white border border-slate-200/90 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs print:hidden">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#9E0B1A] text-white flex items-center justify-center shrink-0">
                  <Printer className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 flex flex-wrap items-center gap-1.5">
                    <span>
                      {isNominalBatch
                        ? `Formato Exato de Impressão Nominal (${students.length} Alunos)`
                        : `Formato Exato de Impressão Não Nominal (${nonNominalTotalCopies} Cópias Avulsas)`}
                    </span>
                    <span className="px-2 py-0.2 rounded bg-red-50 text-[#9E0B1A] border border-red-200 text-[10px] font-bold">
                      {numVersions === 1
                        ? '1 Caderno (A)'
                        : `${numVersions} Cadernos (A–${versionLetters[versionLetters.length - 1]})`}
                    </span>
                    <span className="px-2 py-0.2 rounded bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-bold">
                      {isDuplexMode ? 'Frente e Verso' : 'Simplex'}
                    </span>
                    {effectiveIncludeAnswerSheet && (
                      <span className="px-2 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                        + Folha de Resposta Separada
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {isNominalBatch
                      ? 'Distribuição aleatória ativa: os cadernos foram sorteados aleatoriamente entre os alunos da chamada.'
                      : 'Provas avulsas com linhas em branco no cabeçalho para o estudante preencher nome e matrícula.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {isNominalBatch && (
                  <button
                    type="button"
                    onClick={() => selectedExam && reshuffleExamStudents(selectedExam.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    <Shuffle className="w-3.5 h-3.5 text-[#9E0B1A]" />
                    <span>Sortear Novamente</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#9E0B1A] hover:bg-[#850916] text-white rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Imprimir Agora
                </button>
              </div>
            </div>
          )}

          {isBatchMode ? (
            /* BATCH PRINT MODE: Render all exams in the batch (Nominal students or Non-Nominal copies) */
            <div className="w-full flex flex-col items-center gap-8 print:gap-0 print:w-full">
              {activeBatchItems.map((batchItem) => (
                <div
                  key={batchItem.key}
                  className="w-full flex flex-col items-center gap-4 print:gap-0 print:w-full"
                >
                  {/* Item Header in Preview Screen (Hidden in physical print) */}
                  <div className="w-full max-w-[210mm] flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs print:hidden">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                        {batchItem.index + 1}
                      </span>
                      <span>{batchItem.label}</span>
                      {batchItem.subLabel && (
                        <span className="text-slate-400 font-mono text-[11px]">
                          ({batchItem.subLabel})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {isDuplexMode && (
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                          Frente e Verso ({batchItem.totalPages} pág{batchItem.totalPages > 1 ? 's' : ''})
                        </span>
                      )}
                      {effectiveIncludeAnswerSheet && (
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                          + Folha OMR
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded bg-red-50 text-[#9E0B1A] border border-red-200 text-[11px] font-bold">
                        Caderno {batchItem.assignedLetter}
                      </span>
                    </div>
                  </div>

                  {/* Render all sheets for this exam in exact print order */}
                  {batchItem.sheets.map((sheet) =>
                    renderSheetComponent(
                      sheet,
                      batchItem.totalPages,
                      batchItem.assignedLetter,
                      batchItem.student,
                      batchItem.key
                    )
                  )}
                </div>
              ))}
            </div>
          ) : viewMode === 'single' ? (
            /* Single Sheet View on Screen — but renders all sheets in @media print so header/pages are never lost! */
            <div className="w-full flex flex-col items-center">
              <div className="flex items-center gap-3 mb-3 print:hidden">
                <div className="flex items-center gap-1 text-xs font-semibold text-slate-700 bg-white border border-slate-200 px-2 py-1 rounded-lg shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setPreviewPage(Math.max(1, previewPage - 1))}
                    disabled={previewPage === 1}
                    className="p-0.5 rounded hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-2">
                    Folha {previewPage} de {effectiveTotalPages} • Caderno {previewVersion}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPreviewPage(Math.min(effectiveTotalPages, previewPage + 1))}
                    disabled={previewPage === effectiveTotalPages}
                    className="p-0.5 rounded hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {singleVersionSheets.sheets.map((sheet, idx) => {
                const isCurrentOnScreen = idx + 1 === previewPage;
                return (
                  <div
                    key={sheet.pageNumber}
                    className={
                      isCurrentOnScreen
                        ? 'flex flex-col items-center print:w-full'
                        : 'hidden print:flex print:flex-col print:items-center print:w-full'
                    }
                  >
                    {renderSheetComponent(
                      sheet,
                      effectiveTotalPages,
                      previewVersion,
                      currentStudent
                        ? { name: currentStudent.name, registration: currentStudent.registration }
                        : undefined,
                      `single-ver-${previewVersion}`
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* All Sheets View (Default Exact Print Format) */
            <div className="w-full flex flex-col items-center gap-6 print:gap-0 print:w-full">
              {singleVersionSheets.sheets.map((sheet) => (
                <div key={sheet.pageNumber} className="flex flex-col items-center print:w-full">
                  <div className="text-[11px] font-semibold text-slate-500 mb-2 print:hidden">
                    Folha {sheet.pageNumber} de {effectiveTotalPages} • Caderno {previewVersion}
                    {isDuplexMode && (
                      <span className="ml-2 font-bold text-slate-700">
                        [{sheet.pageNumber % 2 === 0 ? 'Verso' : 'Frente'}]
                      </span>
                    )}
                    {sheet.type === 'answer_sheet' && ' • Cartão-Resposta Separado'}
                    {sheet.type === 'booklet_blank_verso' && ' • Verso do Caderno em Branco'}
                    {sheet.type === 'answer_sheet_blank_verso' && ' • Verso 100% em Branco'}
                    {currentStudent && ` • Aluno: ${currentStudent.name}`}
                  </div>
                  {renderSheetComponent(
                    sheet,
                    effectiveTotalPages,
                    previewVersion,
                    currentStudent
                      ? { name: currentStudent.name, registration: currentStudent.registration }
                      : undefined,
                    `all-ver-${previewVersion}`
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
