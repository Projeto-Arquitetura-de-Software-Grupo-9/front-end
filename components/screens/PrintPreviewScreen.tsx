'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { A4ExamSheet, A4BlankVersoSheet, A4ExamQuestion } from '@/components/common/A4ExamSheet';
import { A4AnswerSheet, A4AnswerSheetQuestion } from '@/components/common/A4AnswerSheet';
import { getVersionLetters } from '@/lib/exam-utils';
import { downloadFile } from '@/lib/results';
import {
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Shuffle,
  SlidersHorizontal,
  Check,
  QrCode,
  BookOpen,
  AlertCircle,
  ZoomIn,
  ZoomOut,
  Maximize2,
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
    setIsScannerModalOpen,
    addToast,
  } = useApp();

  // Default states:
  // - Sem Box de Nota (includeBoxNota = false)
  // - Sem Gabarito (showAnswerKeyInPreview = false)
  // - Com Frente e Verso (isDuplexMode = true)
  // - Formato exato de impressão visível de imediato (viewMode = 'all')
  const [viewMode, setViewMode] = useState<'single' | 'all'>('all');
  const [includeBoxNota, setIncludeBoxNota] = useState<boolean>(false);
  const [isDuplexMode, setIsDuplexMode] = useState<boolean>(true);
  const [includeAnswerSheet, setIncludeAnswerSheet] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [showSecondaryPopover, setShowSecondaryPopover] = useState<boolean>(false);

  // New features: Duplex Spread (Book mode), Virtualized Batch, Scale calibration alert
  const [duplexSpreadMode, setDuplexSpreadMode] = useState<'vertical' | 'book'>('vertical');
  const [isPrintingBatch, setIsPrintingBatch] = useState<boolean>(false);
  const [batchPageIndex, setBatchPageIndex] = useState<number>(0);
  const [showAllBatchOnScreen, setShowAllBatchOnScreen] = useState<boolean>(false);
  const [showCalibrationAlert, setShowCalibrationAlert] = useState<boolean>(true);

  // 'application' = Prova para aplicação | 'post_exam_concepts' = Gabarito comentado pós-prova
  const [printPurpose, setPrintPurpose] = useState<'application' | 'post_exam_concepts'>('application');

  // Nominal vs Avulsa (Não Nominal)
  const [isNominalMode, setIsNominalMode] = useState<boolean>(
    selectedExam?.withStudentIdentification ?? true
  );
  // Target filter: 'batch' (todos os alunos ou todas as cópias avulsas), 'version:A', or 'student:std-1'
  const [viewFilter, setViewFilter] = useState<string>('batch');

  const [nonNominalTotalCopies, setNonNominalTotalCopies] = useState<number>(
    selectedExam?.numberOfVersions || 4
  );

  useEffect(() => {
    if (selectedExam) {
      setIsNominalMode(selectedExam.withStudentIdentification ?? true);
      setNonNominalTotalCopies(selectedExam.numberOfVersions || 4);
      setShowAnswerKeyInPreview(false);
      setIncludeBoxNota(false);
      setIsDuplexMode(true);
      setViewFilter('batch');
      setBatchPageIndex(0);
    }
  }, [selectedExam?.id]);

  useEffect(() => {
    const handleBeforePrint = () => {
      setIsPrintingBatch(true);
    };
    const handleAfterPrint = () => {
      setIsPrintingBatch(false);
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  const numVersions = Math.max(1, Math.min(26, selectedExam?.numberOfVersions || 4));
  const versionLetters = getVersionLetters(numVersions);
  const isRandomOrder = ((selectedExam?.shuffleQuestions ?? true) && numVersions > 1);

  useEffect(() => {
    if (selectedExam && !versionLetters.includes(previewVersion)) {
      setPreviewVersion(versionLetters[0] || 'A');
    }
  }, [selectedExam, numVersions, previewVersion, setPreviewVersion, versionLetters]);

  if (!selectedExam) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
          <Printer className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-slate-900 text-base">Nenhuma avaliação selecionada</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Selecione ou crie uma prova no menu de Provas para visualizar a pré-impressão e os cadernos de prova.
        </p>
      </div>
    );
  }

  const exam = selectedExam;

  const getStudentAssignedVersion = (stdId: string, fallbackIndex: number): string => {
    const assignment = (exam as any).studentAssignments?.find(
      (a: any) => a.studentId === stdId
    );
    if (assignment?.assignedVersion && versionLetters.includes(assignment.assignedVersion)) {
      return assignment.assignedVersion;
    }
    const nonSeqIdx = (fallbackIndex * 7 + 2) % versionLetters.length;
    return versionLetters[nonSeqIdx];
  };

  const handleToggleNominal = (nominal: boolean) => {
    setIsNominalMode(nominal);
    setViewFilter('batch');
    setBatchPageIndex(0);
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
        shuffleQuestions: safeN > 1,
        shuffleAlternatives: safeN > 1,
      });
    }
    setNonNominalTotalCopies((prev) => Math.max(safeN, prev));
  };

  const handleSwitchPurpose = (purpose: 'application' | 'post_exam_concepts') => {
    setPrintPurpose(purpose);
    if (purpose === 'post_exam_concepts') {
      setShowAnswerKeyInPreview(true);
      setViewFilter(`version:${previewVersion}`);
    } else {
      setShowAnswerKeyInPreview(false);
      setViewFilter('batch');
    }
  };

  const handleViewFilterChange = (val: string) => {
    setViewFilter(val);
    setBatchPageIndex(0);
    if (val.startsWith('version:')) {
      setPreviewVersion(val.replace('version:', ''));
    } else if (val.startsWith('student:')) {
      const stdId = val.replace('student:', '');
      const sIdx = students.findIndex((s) => s.id === stdId);
      setPreviewVersion(getStudentAssignedVersion(stdId, Math.max(0, sIdx)));
    }
  };

  const currentStudent =
    viewFilter.startsWith('student:')
      ? students.find((s) => s.id === viewFilter.replace('student:', '')) || null
      : null;

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

  const showConceptExplanations = printPurpose === 'post_exam_concepts';
  const effectiveIncludeAnswerSheet =
    printPurpose === 'post_exam_concepts' ? false : includeAnswerSheet;

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

    pagesData.forEach((p) => {
      sheets.push({
        type: 'question',
        pageNumber: curPage++,
        questions: p.questions,
      });
    });

    if (effectiveIncludeAnswerSheet) {
      if (isDuplexMode && numQPages % 2 !== 0) {
        sheets.push({
          type: 'booklet_blank_verso',
          pageNumber: curPage++,
        });
      }

      const ansQuestions = getAnswerSheetQuestionsForVersion(assignedLetter);
      sheets.push({
        type: 'answer_sheet',
        pageNumber: curPage++,
        questions: ansQuestions,
      });

      if (isDuplexMode) {
        sheets.push({
          type: 'answer_sheet_blank_verso',
          pageNumber: curPage++,
        });
      }
    } else if (isDuplexMode && numQPages % 2 !== 0) {
      sheets.push({
        type: 'booklet_blank_verso',
        pageNumber: curPage++,
      });
    }

    return { sheets, totalPagesCount: sheets.length };
  };

  const singleVersionSheets = buildBookletSheets(previewVersion);
  const effectiveTotalPages = singleVersionSheets.totalPagesCount;

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

  const nonNominalBatch = Array.from(
    { length: Math.max(1, Math.min(200, nonNominalTotalCopies)) },
    (_, copyIdx) => {
      const assignedLetter = versionLetters[copyIdx % versionLetters.length];
      const { sheets, totalPagesCount } = buildBookletSheets(assignedLetter);
      return {
        key: `avulsa-${copyIdx + 1}`,
        label: `Prova Avulsa #${copyIdx + 1}`,
        subLabel: 'Sem Nome',
        student: undefined,
        index: copyIdx,
        assignedLetter,
        sheets,
        totalPages: totalPagesCount,
      };
    }
  );

  const isBatchMode = printPurpose === 'application' && viewFilter === 'batch';
  const activeBatchItems = isNominalMode ? nominalStudentsBatch : nonNominalBatch;

  const handlePrint = () => {
    setIsPrintingBatch(true);
    addToast({
      type: 'info',
      title: 'Calibração de Impressão OMR',
      message: 'Certifique-se de manter Escala em 100% e desmarcar Cabeçalhos/Rodapés no diálogo do navegador.',
    });
    // Garante que o React monte todos os nós do lote completo antes do diálogo nativo
    setTimeout(() => {
      window.print();
    }, 80);
  };

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      const versionQuestions = getQuestionsForVersion(previewVersion);
      if (!versionQuestions.length) throw new Error('Selecione questões antes de exportar.');
      const { pagesData } = paginateQuestions(versionQuestions);
      await downloadFile('/exam-exports/pdf', `Prova-Caderno-${previewVersion}.pdf`, {
        examId: exam.id, versionLetter: previewVersion,
        header: {
          institution: exam.institution, department: exam.department, course: exam.course,
          discipline: exam.discipline, classGroup: exam.classGroup, semester: exam.semester,
          title: exam.title, code: exam.code, date: exam.date, duration: exam.duration,
          instructions: exam.instructions.split('\n').filter(Boolean), includeBoxNota,
        },
        pages: pagesData.map(page => ({ questions: page.questions.map(q => ({
          ...q, originalQuestionId: q.id, discipline: exam.discipline,
          pointValue: questions.find(original => original.id === q.id)?.points,
        })) })),
        showAnswerKey: showAnswerKeyInPreview || showConceptExplanations,
        showQrCode: showQrCodeInPreview, includeBoxNota, isDuplex: isDuplexMode,
        includeAnswerSheet: effectiveIncludeAnswerSheet,
      });
      addToast({ type: 'success', title: 'PDF baixado', message: `Caderno ${previewVersion} exportado com as questões da prévia. O download contém um caderno; use Imprimir para o lote da turma.` });
    } catch (error) {
      addToast({ type: 'error', title: 'Falha ao baixar PDF', message: error instanceof Error ? error.message : 'Tente novamente.' });
    } finally { setIsExporting(false); }
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

  // Helper to render sheets grouped in Duplex Book spreads (Pair of Frente + Verso)
  const renderSheetsGrouped = (
    sheets: SheetItem[],
    totalPages: number,
    vLetter: string,
    studentObj?: { name: string; registration: string },
    keyPrefix: string = 'single'
  ) => {
    if (duplexSpreadMode === 'book') {
      const pairs: SheetItem[][] = [];
      for (let i = 0; i < sheets.length; i += 2) {
        pairs.push(sheets.slice(i, i + 2));
      }

      return (
        <div className="w-full flex flex-col items-center gap-8 print:gap-0 print:w-full">
          {pairs.map((pair, pIdx) => (
            <div key={`${keyPrefix}-spread-${pIdx}`} className="w-full flex flex-col items-center print:w-full">
              <div className="w-full max-w-[430mm] flex items-center justify-between px-2 mb-2 text-xs font-bold text-slate-500 uppercase tracking-wide print:hidden">
                <span>Folha Física {pIdx + 1} de {Math.ceil(totalPages / 2)}</span>
                <span className="text-slate-400 font-mono text-[11px]">Par Frente e Verso (Duplex)</span>
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 print:flex print:flex-col print:gap-0 items-start justify-center print:w-full">
                {pair[0] && (
                  <div className="flex flex-col items-center print:w-full">
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full mb-1.5 print:hidden">
                      Frente (Folha {pair[0].pageNumber})
                    </span>
                    {renderSheetComponent(pair[0], totalPages, vLetter, studentObj, `${keyPrefix}-p${pIdx}-frente`)}
                  </div>
                )}
                {pair[1] && (
                  <div className="flex flex-col items-center print:w-full">
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full mb-1.5 print:hidden">
                      Verso (Folha {pair[1].pageNumber})
                    </span>
                    {renderSheetComponent(pair[1], totalPages, vLetter, studentObj, `${keyPrefix}-p${pIdx}-verso`)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      );
    }

    // Default Vertical Scroll Layout
    return (
      <div className="w-full flex flex-col items-center gap-6 print:gap-0 print:w-full">
        {sheets.map((sheet) => (
          <div key={sheet.pageNumber} className="flex flex-col items-center print:w-full">
            <div className="w-full max-w-[210mm] flex items-center justify-between px-1 mb-1.5 text-[11px] text-slate-400 print:hidden">
              <span>
                Folha {sheet.pageNumber} de {totalPages}
                {isDuplexMode && ` (${sheet.pageNumber % 2 === 0 ? 'Verso' : 'Frente'})`}
              </span>
              <span>
                Caderno {vLetter}
                {studentObj && ` • ${studentObj.name}`}
              </span>
            </div>
            {renderSheetComponent(sheet, totalPages, vLetter, studentObj, keyPrefix)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs bg-white animate-in fade-in duration-200 print:border-none print:shadow-none print:rounded-none">
      {/* =====================================================================
          BARRA ÚNICA MINIMALISTA DE CONFIGURAÇÃO E IMPRESSÃO
         ===================================================================== */}
      <div className="px-4 py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5 print:hidden">
        {/* Left: Core Print Decisions (Segmented Controls) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 1. Finalidade: Prova vs. Gabarito Comentado (Pós-Prova) */}
          <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/70">
            <button
              type="button"
              onClick={() => handleSwitchPurpose('application')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                printPurpose === 'application'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Prova
            </button>
            <button
              type="button"
              onClick={() => handleSwitchPurpose('post_exam_concepts')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                printPurpose === 'post_exam_concepts'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Caderno de perguntas com as respostas marcadas e explicação dos conceitos para correção pós-prova"
            >
              Gabarito Comentado
            </button>
          </div>

          {printPurpose === 'application' && (
            <>
              <div className="h-4 w-px bg-slate-200 hidden sm:block" />

              {/* 2. Identificação: Nominal vs. Avulsa */}
              <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/70">
                <button
                  type="button"
                  onClick={() => handleToggleNominal(true)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    isNominalMode
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Nominal ({students.length})
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleNominal(false)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    !isNominalMode
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Avulsa
                </button>

                {isNominalMode ? (
                  <button
                    type="button"
                    onClick={() => selectedExam && reshuffleExamStudents(selectedExam.id)}
                    title="Redistribuir cadernos aleatoriamente entre os alunos"
                    className="px-2 py-1 text-slate-500 hover:text-[#9E0B1A] transition cursor-pointer"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <div className="flex items-center gap-1 px-2 text-xs">
                    <span className="text-[11px] text-slate-500">Qtd:</span>
                    <input
                      type="number"
                      min={1}
                      max={200}
                      value={nonNominalTotalCopies}
                      onChange={(e) =>
                        setNonNominalTotalCopies(Math.max(1, parseInt(e.target.value) || 1))
                      }
                      className="w-11 py-0.5 text-center font-bold bg-white border border-slate-200 rounded-md text-slate-900 text-xs focus:outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="h-4 w-px bg-slate-200 hidden sm:block" />

              {/* 3. Questões & N Cadernos: Fixa vs. Aleatória (N) */}
              <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/70">
                <button
                  type="button"
                  onClick={() => handleToggleRandomQuestions(false)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    !isRandomOrder
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Ordem Fixa
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleRandomQuestions(true)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    isRandomOrder
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Aleatória
                </button>

                {isRandomOrder && (
                  <div
                    className="flex items-center gap-1 px-2 text-xs"
                    title="Quantidade de cadernos diferentes (A, B, C...)"
                  >
                    <span className="text-[11px] text-slate-500">Cadernos:</span>
                    <input
                      type="number"
                      min={2}
                      max={26}
                      value={numVersions}
                      onChange={(e) => handleChangeNumVersions(parseInt(e.target.value) || 2)}
                      className="w-10 py-0.5 text-center font-bold bg-white border border-slate-200 rounded-md text-[#9E0B1A] text-xs focus:outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="h-4 w-px bg-slate-200 hidden sm:block" />

              {/* 4. Folha de Resposta OMR Junto */}
              <button
                type="button"
                onClick={() => setIncludeAnswerSheet(!includeAnswerSheet)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                  includeAnswerSheet
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
                title="Incluir Folha de Respostas OMR em página separada (verso 100% em branco)"
              >
                <span
                  className={`w-3.5 h-3.5 rounded flex items-center justify-center ${
                    includeAnswerSheet ? 'bg-white text-slate-900' : 'border border-slate-300'
                  }`}
                >
                  {includeAnswerSheet && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </span>
                <span>Com Folha OMR</span>
              </button>
            </>
          )}

          {/* 5. Toggle Visual Duplex (Modo Livro / Lado a Lado) */}
          {isDuplexMode && (
            <button
              type="button"
              onClick={() => setDuplexSpreadMode(duplexSpreadMode === 'book' ? 'vertical' : 'book')}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                duplexSpreadMode === 'book'
                  ? 'bg-blue-50 text-blue-800 border-blue-200 shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
              title="Simulador Duplex: Exibir páginas lado a lado (Frente & Verso) para validar paridade física"
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden md:inline">{duplexSpreadMode === 'book' ? 'Modo Livro (Duplex)' : 'Lado a Lado'}</span>
            </button>
          )}
        </div>

        {/* Right: Scale Alert, View Selector, Settings Popover, PDF & Print Actions */}
        <div className="flex items-center gap-2">
          {/* Calibração de Escala: Aviso Compacto na Toolbar */}
          <div
            className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 bg-amber-50/90 border border-amber-200/90 rounded-xl text-amber-900 text-[11px] font-medium"
            title="Dica de Calibração OMR: No diálogo de impressão, defina Escala em 100% (Tamanho Real) e desmarque Cabeçalhos/Rodapés para manter o alinhamento óptico exato dos marcadores fiduciais."
          >
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="font-bold text-amber-800">100% Escala</span>
            <span className="text-amber-700/80">• Sem Cabeçalhos</span>
          </div>

          {/* Unified View Selector (Lote, Caderno A..N, or Student) */}
          <div className="relative">
            <select
              value={viewFilter}
              onChange={(e) => handleViewFilterChange(e.target.value)}
              className="text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5 pr-7 appearance-none cursor-pointer focus:outline-none transition"
            >
              {printPurpose === 'application' && (
                <option value="batch">
                  {isNominalMode
                    ? `Ver Lote da Turma (${students.length})`
                    : `Ver Lote Avulso (${nonNominalTotalCopies})`}
                </option>
              )}
              <optgroup label="Inspecionar Caderno:">
                {versionLetters.map((v) => (
                  <option key={v} value={`version:${v}`}>
                    Caderno {v}
                  </option>
                ))}
              </optgroup>
              {printPurpose === 'application' && isNominalMode && (
                <optgroup label="Aluno Específico:">
                  {students.map((s, sIdx) => {
                    const v = getStudentAssignedVersion(s.id, sIdx);
                    return (
                      <option key={s.id} value={`student:${s.id}`}>
                        {s.name} (Cad. {v})
                      </option>
                    );
                  })}
                </optgroup>
              )}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Secondary Settings Popover Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSecondaryPopover(!showSecondaryPopover)}
              className={`p-2 rounded-xl border transition cursor-pointer ${
                showSecondaryPopover
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
              title="Opções secundárias (Frente e Verso, Box de Nota, QR Code, Zoom)"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>

            {showSecondaryPopover && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 z-40 space-y-3 text-xs animate-in fade-in zoom-in-95 duration-150">
                <div className="font-bold text-slate-900 pb-2 border-b border-slate-100">
                  Ajustes de Página
                </div>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-700">Frente e Verso (Duplex)</span>
                  <input
                    type="checkbox"
                    checked={isDuplexMode}
                    onChange={(e) => setIsDuplexMode(e.target.checked)}
                    className="rounded accent-[#9E0B1A] w-4 h-4 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-700">Box de Nota no Cabeçalho</span>
                  <input
                    type="checkbox"
                    checked={includeBoxNota}
                    onChange={(e) => setIncludeBoxNota(e.target.checked)}
                    className="rounded accent-[#9E0B1A] w-4 h-4 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-700">Destacar Gabarito</span>
                  <input
                    type="checkbox"
                    checked={showAnswerKeyInPreview}
                    onChange={(e) => setShowAnswerKeyInPreview(e.target.checked)}
                    className="rounded accent-[#9E0B1A] w-4 h-4 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-700">QR Code de Correção</span>
                  <input
                    type="checkbox"
                    checked={showQrCodeInPreview}
                    onChange={(e) => setShowQrCodeInPreview(e.target.checked)}
                    className="rounded accent-[#9E0B1A] w-4 h-4 cursor-pointer"
                  />
                </label>

                {/* Duplex Book View in Popover */}
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-700">Modo Livro (Frente/Verso)</span>
                  <input
                    type="checkbox"
                    checked={duplexSpreadMode === 'book'}
                    onChange={(e) => setDuplexSpreadMode(e.target.checked ? 'book' : 'vertical')}
                    className="rounded accent-blue-600 w-4 h-4 cursor-pointer"
                  />
                </label>

                {!isBatchMode && (
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-slate-600">Paginação</span>
                    <div className="inline-flex bg-slate-100 p-0.5 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setViewMode('all')}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                          viewMode === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                        }`}
                      >
                         Contínua
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('single')}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                          viewMode === 'single' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                        }`}
                      >
                        1 Folha
                      </button>
                    </div>
                  </div>
                )}

                {/* Expanded Inspection Zoom */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-slate-600">Zoom</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPreviewZoom(Math.max(50, previewZoom - 15))}
                      className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
                    >
                      <ZoomOut className="w-3 h-3" />
                    </button>
                    <select
                      value={previewZoom}
                      onChange={(e) => setPreviewZoom(parseInt(e.target.value))}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-0.5 text-xs font-semibold"
                    >
                      <option value={50}>50%</option>
                      <option value={65}>Ajustar</option>
                      <option value={75}>75%</option>
                      <option value={100}>100%</option>
                      <option value={125}>125%</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => setPreviewZoom(Math.min(130, previewZoom + 15))}
                      className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
                    >
                      <ZoomIn className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSecondaryPopover(false);
                      setIsScannerModalOpen(true);
                    }}
                    className="w-full py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5 text-[#9E0B1A]" />
                    <span>Simular Leitor QR / OMR</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
            title={`Baixar PDF do caderno ${previewVersion}`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? '...' : 'PDF'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-2xs ${
              printPurpose === 'post_exam_concepts'
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-[#9E0B1A] hover:bg-[#850916]'
            }`}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{isBatchMode ? `Imprimir Lote (${activeBatchItems.length})` : 'Imprimir'}</span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          MESA DE VISUALIZAÇÃO EXATA A4 (COM VIRTUALIZAÇÃO EM TELA)
         ===================================================================== */}
      <div
        onClick={() => showSecondaryPopover && setShowSecondaryPopover(false)}
        className="bg-slate-100/90 p-6 sm:p-10 overflow-x-auto min-h-[750px] flex flex-col items-center justify-start print:bg-white print:p-0 print:min-h-0"
      >
        <div className="w-full flex flex-col items-center gap-8 print:gap-0 print:w-full">
          {isBatchMode ? (
            /* BATCH PRINT MODE: VIRTUALIZED SCREEN PREVIEW + FULL DOM MOUNT IN PRINT */
            <div className="w-full flex flex-col items-center gap-8 print:gap-0 print:w-full">
              {/* Virtualized Batch Navigator on Screen (Super fast, prevents thread lag with 50+ students) */}
              {!isPrintingBatch && !showAllBatchOnScreen && (
                <div className="w-full max-w-[210mm] bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-2xs flex flex-wrap items-center justify-between gap-2 text-xs print:hidden">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">
                      Lote: {activeBatchItems.length} {isNominalMode ? 'alunos' : 'cópias'}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-600 font-medium">
                      Exibindo <strong>#{batchPageIndex + 1}</strong>: {activeBatchItems[batchPageIndex]?.label} (Caderno {activeBatchItems[batchPageIndex]?.assignedLetter})
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setBatchPageIndex(Math.max(0, batchPageIndex - 1))}
                      disabled={batchPageIndex === 0}
                      className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 cursor-pointer"
                      title="Aluno anterior"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono text-xs text-slate-500 px-1">
                      {batchPageIndex + 1} / {activeBatchItems.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => setBatchPageIndex(Math.min(activeBatchItems.length - 1, batchPageIndex + 1))}
                      disabled={batchPageIndex >= activeBatchItems.length - 1}
                      className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 cursor-pointer"
                      title="Próximo aluno"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAllBatchOnScreen(true)}
                      className="ml-2 text-[11px] font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 px-2 py-0.5 rounded-lg cursor-pointer"
                      title="Renderiza todos os alunos simultaneamente na tela"
                    >
                      Expandir Todos na Tela
                    </button>
                  </div>
                </div>
              )}

              {showAllBatchOnScreen && !isPrintingBatch && (
                <div className="w-full max-w-[210mm] flex items-center justify-between px-2 text-xs text-slate-500 print:hidden">
                  <span>Exibindo todos os {activeBatchItems.length} cadernos na tela.</span>
                  <button
                    type="button"
                    onClick={() => setShowAllBatchOnScreen(false)}
                    className="text-xs font-semibold text-[#9E0B1A] hover:underline cursor-pointer"
                  >
                    Voltar ao Modo Rápido (1 Aluno)
                  </button>
                </div>
              )}

              {/* Items Render:
                  - During interactive screen mode (default): renders activeBatchItems[batchPageIndex]
                  - During print (isPrintingBatch) or expanded mode: renders all activeBatchItems */}
              {(isPrintingBatch || showAllBatchOnScreen
                ? activeBatchItems
                : [activeBatchItems[batchPageIndex] || activeBatchItems[0]]
              ).map((batchItem) => (
                <div
                  key={batchItem.key}
                  className="w-full flex flex-col items-center gap-3 print:gap-0 print:w-full"
                >
                  {/* Divider Above Each Student/Copy in Batch */}
                  <div className="w-full max-w-[210mm] flex items-center justify-between px-1 text-xs text-slate-500 print:hidden">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-700">
                        {batchItem.index + 1}. {batchItem.label}
                      </span>
                      {batchItem.subLabel && (
                        <span className="text-slate-400 font-mono text-[11px]">
                          • {batchItem.subLabel}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-bold text-[#9E0B1A]">
                      Caderno {batchItem.assignedLetter} ({batchItem.totalPages} pág.)
                    </span>
                  </div>

                  {renderSheetsGrouped(
                    batchItem.sheets,
                    batchItem.totalPages,
                    batchItem.assignedLetter,
                    batchItem.student,
                    batchItem.key
                  )}
                </div>
              ))}
            </div>
          ) : viewMode === 'single' ? (
            /* Single Sheet View on Screen — renders all sheets in @media print */
            <div className="w-full flex flex-col items-center">
              <div className="flex items-center gap-2 mb-3 print:hidden">
                <button
                  type="button"
                  onClick={() => setPreviewPage(Math.max(1, previewPage - 1))}
                  disabled={previewPage === 1}
                  className="p-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-30 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-medium text-slate-600 px-2">
                  Folha {previewPage} de {effectiveTotalPages} • Caderno {previewVersion}
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewPage(Math.min(effectiveTotalPages, previewPage + 1))}
                  disabled={previewPage === effectiveTotalPages}
                  className="p-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-30 cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
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
            /* All Sheets View (Default Exact Print Format with Duplex Book option) */
            renderSheetsGrouped(
              singleVersionSheets.sheets,
              effectiveTotalPages,
              previewVersion,
              currentStudent
                ? { name: currentStudent.name, registration: currentStudent.registration }
                : undefined,
              `all-ver-${previewVersion}`
            )
          )}
        </div>
      </div>
    </div>
  );
};
