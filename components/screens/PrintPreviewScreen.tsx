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
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  // New features: Virtualized Batch, Scale calibration alert
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
          type: origQ?.type || qv.type || (qv.alternatives && qv.alternatives.length > 0 ? 'objetiva' : 'discursiva'),
          alternatives: qv.alternatives || [],
          correctAlternative: qv.correctAlternative || 'A',
          explanation: qv.explanation || origQ?.explanation,
          topic: qv.topic || origQ?.topic,
          maxScore: origQ?.maxScore || qv.maxScore,
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
      type: q.type || (q.alternatives && q.alternatives.length > 0 ? 'objetiva' : 'discursiva'),
      alternatives: q.alternatives || [],
      correctAlternative: q.correctAlternative,
      explanation: q.explanation,
      topic: q.topic,
      maxScore: q.maxScore,
    }));
  };

  const showConceptExplanations = printPurpose === 'post_exam_concepts';
  const effectiveIncludeAnswerSheet =
    printPurpose === 'post_exam_concepts' ? false : includeAnswerSheet;

  const paginateQuestions = (vQuestions: A4ExamQuestion[]) => {
    const pagesData: { pageNumber: number; questions: A4ExamQuestion[] }[] = [];
    let currentPageIndex = 1;
    let currentQuestions: A4ExamQuestion[] = [];
    let currentWeight = 0;

    // Page 1 has lower capacity (2.5) due to header, student box and instructions
    // Page 2+ has full capacity (4.0)
    const getPageCapacity = (pageIdx: number) => {
      if (showConceptExplanations) {
        return pageIdx === 1 ? 2.0 : 3.0;
      }
      return pageIdx === 1 ? 2.5 : 4.0;
    };

    const getQuestionWeight = (q: A4ExamQuestion) => {
      const isDiscursive = q.type === 'discursiva' || !q.alternatives || q.alternatives.length === 0;
      let w = isDiscursive ? 2.0 : 1.0;
      if (showConceptExplanations) {
        w += 0.4;
      }
      return w;
    };

    for (const q of vQuestions) {
      const qWeight = getQuestionWeight(q);
      const capacity = getPageCapacity(currentPageIndex);

      if (currentQuestions.length > 0 && currentWeight + qWeight > capacity) {
        pagesData.push({ pageNumber: currentPageIndex, questions: currentQuestions });
        currentPageIndex++;
        currentQuestions = [q];
        currentWeight = qWeight;
      } else {
        currentQuestions.push(q);
        currentWeight += qWeight;
      }
    }

    if (currentQuestions.length > 0 || pagesData.length === 0) {
      pagesData.push({ pageNumber: currentPageIndex, questions: currentQuestions });
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

  // Helper to render sheets in clean vertical continuous sequence
  const renderSheetsGrouped = (
    sheets: SheetItem[],
    totalPages: number,
    vLetter: string,
    studentObj?: { name: string; registration: string },
    keyPrefix: string = 'single'
  ) => {
    return (
      <div className="w-full flex flex-col items-center gap-6 print:gap-0 print:w-full">
        {sheets.map((sheet) => (
          <div key={`${keyPrefix}-${sheet.pageNumber}`} className="flex flex-col items-center print:w-full">
            <div className="w-full max-w-[210mm] flex items-center justify-between px-1 mb-1.5 text-[11px] text-slate-400 print:hidden">
              <span className="font-semibold text-slate-600">
                Folha {sheet.pageNumber} de {totalPages}
                {isDuplexMode && ` (${sheet.pageNumber % 2 === 0 ? 'Verso' : 'Frente'})`}
              </span>
              <span className="font-mono text-slate-500">
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
          BARRA SUPERIOR LIMPA COM APENAS O ESSENCIAL
         ===================================================================== */}
      <div className="px-4 py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 print:hidden">
        {/* Left: Título & Botão de Toggle da Sidebar */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
              isSidebarOpen
                ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
            title={isSidebarOpen ? 'Recolher painel de opções' : 'Expandir painel de opções laterais'}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Opções da Prova</span>
          </button>

          <div className="h-4 w-px bg-slate-200 hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 hidden md:inline">Visualizando:</span>
            <div className="relative">
              <select
                value={viewFilter}
                onChange={(e) => handleViewFilterChange(e.target.value)}
                className="text-xs font-semibold text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5 pr-7 appearance-none cursor-pointer focus:outline-none transition max-w-[220px] truncate"
              >
                {printPurpose === 'application' && (
                  <option value="batch">
                    {isNominalMode
                      ? `Lote da Turma (${students.length})`
                      : `Lote Avulso (${nonNominalTotalCopies})`}
                  </option>
                )}
                <optgroup label="Caderno Específico:">
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
          </div>
        </div>

        {/* Right: Apenas o Essencial (Caller do Leitor QR, Baixar PDF e Imprimir) */}
        <div className="flex items-center gap-2">
          {/* Caller Essencial do Leitor de QR Code / OMR */}
          <button
            type="button"
            onClick={() => setIsScannerModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
            title="Abrir Simulação de Câmera e Leitor QR / OMR"
          >
            <QrCode className="w-3.5 h-3.5 text-[#9E0B1A]" />
            <span className="hidden sm:inline">Simular Leitor QR</span>
          </button>

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
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs ${
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

      <div className="flex flex-col lg:flex-row items-stretch min-h-[750px] relative print:block">
        {/* =====================================================================
            SIDEBAR VERTICAL DE OPÇÕES (AO LADO DA FOLHA)
           ===================================================================== */}
        {isSidebarOpen && (
          <aside className="w-full lg:w-80 shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 p-5 flex flex-col gap-5 print:hidden overflow-y-auto max-h-[calc(100vh-180px)]">
            {/* 1. Finalidade do Caderno */}
            <div>
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Finalidade
              </span>
              <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => handleSwitchPurpose('application')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition cursor-pointer text-center ${
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
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition cursor-pointer text-center ${
                    printPurpose === 'post_exam_concepts'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Caderno com gabarito e explicação de conceitos"
                >
                  Gabarito Comentado
                </button>
              </div>
            </div>

            {/* 2. Identificação da Folha */}
            {printPurpose === 'application' && (
              <div>
                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Identificação do Aluno
                </span>
                <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80 mb-2">
                  <button
                    type="button"
                    onClick={() => handleToggleNominal(true)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition cursor-pointer text-center ${
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
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition cursor-pointer text-center ${
                      !isNominalMode
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Avulsa
                  </button>
                </div>

                {isNominalMode ? (
                  <button
                    type="button"
                    onClick={() => selectedExam && reshuffleExamStudents(selectedExam.id)}
                    className="w-full py-1.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Shuffle className="w-3.5 h-3.5 text-[#9E0B1A]" />
                    <span>Redistribuir Cadernos</span>
                  </button>
                ) : (
                  <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                    <span className="text-slate-600 font-medium">Quantidade de Cópias:</span>
                    <input
                      type="number"
                      min={1}
                      max={200}
                      value={nonNominalTotalCopies}
                      onChange={(e) =>
                        setNonNominalTotalCopies(Math.max(1, parseInt(e.target.value) || 1))
                      }
                      className="w-14 py-1 text-center font-bold bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none"
                    />
                  </div>
                )}
              </div>
            )}

            {/* 3. Cadernos & Randomização */}
            {printPurpose === 'application' && (
              <div>
                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Cadernos & Variações
                </span>
                <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80 mb-2">
                  <button
                    type="button"
                    onClick={() => handleToggleRandomQuestions(false)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition cursor-pointer text-center ${
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
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition cursor-pointer text-center ${
                      isRandomOrder
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Aleatória
                  </button>
                </div>

                {isRandomOrder && (
                  <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                    <span className="text-slate-600 font-medium">Cadernos Diferentes (A..Z):</span>
                    <input
                      type="number"
                      min={2}
                      max={26}
                      value={numVersions}
                      onChange={(e) => handleChangeNumVersions(parseInt(e.target.value) || 2)}
                      className="w-12 py-1 text-center font-bold bg-white border border-slate-300 rounded-lg text-[#9E0B1A] text-xs focus:outline-none"
                    />
                  </div>
                )}
              </div>
            )}

            {/* 4. Estrutura Física & Impressão */}
            <div>
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Layout Físico da Prova
              </span>
              <div className="space-y-2.5 bg-slate-50/70 p-3.5 border border-slate-200/90 rounded-2xl text-xs">
                {printPurpose === 'application' && (
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-slate-700 font-medium">Com Folha de Respostas OMR</span>
                    <input
                      type="checkbox"
                      checked={includeAnswerSheet}
                      onChange={(e) => setIncludeAnswerSheet(e.target.checked)}
                      className="rounded accent-[#9E0B1A] w-4 h-4 cursor-pointer"
                    />
                  </label>
                )}

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-700 font-medium">Frente e Verso (Duplex)</span>
                  <input
                    type="checkbox"
                    checked={isDuplexMode}
                    onChange={(e) => setIsDuplexMode(e.target.checked)}
                    className="rounded accent-[#9E0B1A] w-4 h-4 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-700 font-medium">Box de Nota no Cabeçalho</span>
                  <input
                    type="checkbox"
                    checked={includeBoxNota}
                    onChange={(e) => setIncludeBoxNota(e.target.checked)}
                    className="rounded accent-[#9E0B1A] w-4 h-4 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-700 font-medium">Destacar Gabarito</span>
                  <input
                    type="checkbox"
                    checked={showAnswerKeyInPreview}
                    onChange={(e) => setShowAnswerKeyInPreview(e.target.checked)}
                    className="rounded accent-[#9E0B1A] w-4 h-4 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-700 font-medium">QR Code Institucional</span>
                  <input
                    type="checkbox"
                    checked={showQrCodeInPreview}
                    onChange={(e) => setShowQrCodeInPreview(e.target.checked)}
                    className="rounded accent-[#9E0B1A] w-4 h-4 cursor-pointer"
                  />
                </label>
              </div>
            </div>

            {/* 5. Visualização & Zoom */}
            <div>
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Visualização em Tela
              </span>
              <div className="space-y-3 bg-slate-50/70 p-3.5 border border-slate-200/90 rounded-2xl text-xs">
                {!isBatchMode && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-medium">Paginação:</span>
                    <div className="inline-flex bg-slate-200/80 p-0.5 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setViewMode('all')}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                          viewMode === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                        }`}
                      >
                        Contínua
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('single')}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                          viewMode === 'single' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                        }`}
                      >
                        1 Folha
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Zoom:</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPreviewZoom(Math.max(50, previewZoom - 15))}
                      className="p-1 rounded bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer"
                      title="Diminuir zoom"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <select
                      value={previewZoom}
                      onChange={(e) => setPreviewZoom(parseInt(e.target.value))}
                      className="bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-xs font-semibold text-slate-800"
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
                      className="p-1 rounded bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer"
                      title="Aumentar zoom"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 6. Dica de Calibração */}
            <div className="p-3 bg-amber-50/90 border border-amber-200/90 rounded-2xl text-[11px] text-amber-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-950">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Calibração OMR</span>
              </div>
              <p className="text-amber-800/90 leading-relaxed">
                Ao imprimir, marque <strong>Escala 100% (Tamanho Real)</strong> e desmarque Cabeçalhos/Rodapés para garantir alinhamento micrométrico dos marcadores.
              </p>
            </div>
          </aside>
        )}

        {/* =====================================================================
            MESA DE VISUALIZAÇÃO EXATA A4 (COM VIRTUALIZAÇÃO EM TELA)
           ===================================================================== */}
        <div className="flex-1 bg-slate-100/90 p-6 sm:p-10 overflow-x-auto min-h-[750px] flex flex-col items-center justify-start print:bg-white print:p-0 print:min-h-0 print:w-full">
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
  </div>
);
};
