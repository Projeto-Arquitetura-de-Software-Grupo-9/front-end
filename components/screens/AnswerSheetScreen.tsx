'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { A4AnswerSheet, A4AnswerSheetQuestion } from '@/components/common/A4AnswerSheet';
import { getVersionLetters } from '@/lib/exam-utils';
import { downloadFile } from '@/lib/results';
import {
  Printer,
  Download,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Camera,
  RotateCcw,
  Sparkles,
  UserCheck,
  UserX,
  Shuffle,
  SlidersHorizontal,
  Eye,
  AlertCircle,
  ZoomIn,
  ZoomOut,
  QrCode,
} from 'lucide-react';

export const AnswerSheetScreen: React.FC = () => {
  const {
    selectedExam,
    previewZoom,
    setPreviewZoom,
    setIsScannerModalOpen,
    students,
    updateExamPrintConfig,
    reshuffleExamStudents,
    addToast,
  } = useApp();

  // Synchronized print configuration with Exam
  const isNominal = selectedExam?.withStudentIdentification !== false;
  const numVersions = selectedExam?.numberOfVersions || 4;
  const isRandomOrder =
    selectedExam?.shuffleQuestions !== false && numVersions > 1;

  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    isNominal ? 'all_students' : 'version:A'
  );
  const [isDuplexMode, setIsDuplexMode] = useState<boolean>(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [markedAnswers, setMarkedAnswers] = useState<Record<number, string>>({});
  const [isExporting, setIsExporting] = useState(false);

  // Performance virtualization & Scale calibration
  const [isPrintingBatch, setIsPrintingBatch] = useState(false);
  const [batchPageIndex, setBatchPageIndex] = useState(0);
  const [showAllBatchOnScreen, setShowAllBatchOnScreen] = useState(false);

  useEffect(() => {
    setMarkedAnswers({});
    setSelectedStudentId(
      selectedExam?.withStudentIdentification === false ? 'version:A' : 'all_students'
    );
    setBatchPageIndex(0);
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

  if (!selectedExam) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
        <p className="text-sm text-slate-500">Nenhuma prova selecionada.</p>
      </div>
    );
  }

  const availableVersionLetters = getVersionLetters(numVersions);

  const handleToggleNominal = (nominal: boolean) => {
    updateExamPrintConfig(selectedExam.id, {
      withStudentIdentification: nominal,
    });
    setSelectedStudentId(nominal ? 'all_students' : 'version:A');
    setBatchPageIndex(0);
  };

  const handleToggleRandom = (random: boolean) => {
    if (!random) {
      updateExamPrintConfig(selectedExam.id, {
        shuffleQuestions: false,
        shuffleAlternatives: false,
        numberOfVersions: 1,
      });
      if (selectedStudentId.startsWith('version:')) {
        setSelectedStudentId('version:A');
      }
    } else {
      const nextCount = numVersions > 1 ? numVersions : 4;
      updateExamPrintConfig(selectedExam.id, {
        shuffleQuestions: true,
        shuffleAlternatives: true,
        numberOfVersions: nextCount,
      });
    }
  };

  const handleChangeNumVersions = (val: number) => {
    const clamped = Math.max(1, Math.min(26, val));
    updateExamPrintConfig(selectedExam.id, {
      numberOfVersions: clamped,
      shuffleQuestions: clamped > 1,
      shuffleAlternatives: clamped > 1,
    });
  };

  const getStudentAssignedVersion = (stdId: string, fallbackIdx: number): string => {
    const found = selectedExam.studentAssignments?.find((a) => a.studentId === stdId);
    if (found?.assignedVersion && availableVersionLetters.includes(found.assignedVersion)) {
      return found.assignedVersion;
    }
    return availableVersionLetters[(fallbackIdx * 3 + 1) % availableVersionLetters.length] || 'A';
  };

  const isBatchMode = selectedStudentId === 'all_students';
  const isVersionView = selectedStudentId.startsWith('version:');
  const activeVersionLetter = isVersionView
    ? selectedStudentId.replace('version:', '')
    : 'A';

  const currentStudent =
    !isBatchMode && !isVersionView
      ? students.find((s) => s.id === selectedStudentId) || null
      : null;

  const resolvedVersionLetter = currentStudent
    ? getStudentAssignedVersion(
        currentStudent.id,
        Math.max(0, students.findIndex((s) => s.id === currentStudent.id))
      )
    : activeVersionLetter;

  const getAnswerSheetQuestionsForVersion = (verLetter: string): A4AnswerSheetQuestion[] => {
    const vObj =
      selectedExam.versions?.find((v) => v.versionLetter === verLetter) ||
      selectedExam.versions?.[0];
    if (vObj?.questions && vObj.questions.length > 0) {
      return vObj.questions.map((q, idx) => ({
        orderIndex: q.orderIndex || idx + 1,
        letters:
          q.alternatives && q.alternatives.length > 0
            ? q.alternatives.map((a) => a.letter)
            : ['A', 'B', 'C', 'D', 'E'],
      }));
    }
    const count = selectedExam.selectedQuestionIds?.length || 10;
    return Array.from({ length: count }, (_, i) => ({
      orderIndex: i + 1,
      letters: ['A', 'B', 'C', 'D', 'E'],
    }));
  };

  const activeQuestionsList = getAnswerSheetQuestionsForVersion(resolvedVersionLetter);
  const totalQuestions = activeQuestionsList.length;

  const handleBubbleClick = (qNum: number, letter: string) => {
    setMarkedAnswers((prev) => {
      if (prev[qNum] === letter) {
        const copy = { ...prev };
        delete copy[qNum];
        return copy;
      }
      return { ...prev, [qNum]: letter };
    });
  };

  const handleClear = () => {
    setMarkedAnswers({});
    addToast({
      type: 'info',
      title: 'Folha Limpa',
      message: 'A folha de respostas voltou a ficar 100% em branco.',
    });
  };

  const scaleFactor = previewZoom / 100;

  const handlePrint = () => {
    setIsPrintingBatch(true);
    addToast({
      type: 'info',
      title: 'Calibração OMR para Impressão',
      message: 'Mantenha a escala em 100% (Tamanho Real) e desmarque cabeçalhos/rodapés nas opções do navegador.',
    });
    setTimeout(() => {
      window.print();
    }, 80);
  };

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      const targets = isBatchMode ? students : [currentStudent];
      if (!targets.length) throw new Error('Nenhum aluno disponível para o lote.');
      const sheets = targets.map((student, index) => {
        const letter = student ? getStudentAssignedVersion(student.id, index) : resolvedVersionLetter;
        const version = selectedExam.versions.find(v => v.versionLetter === letter);
        if (!version?.questions.length) throw new Error(`Caderno ${letter} sem questões. Gere a versão antes de exportar.`);
        return {
          title: selectedExam.title, code: selectedExam.code, versionLetter: letter,
          qrCodePayload: JSON.stringify({ app: 'CORREGE', exam: selectedExam.code.replace(/[^a-zA-Z0-9]/g, ''), ver: letter,
            nominal: Boolean(student?.registration), std: student?.registration || 'ANON', q: version.questions.length }),
          questions: version.questions.map((q, i) => ({ orderIndex: q.orderIndex || i + 1, letters: q.alternatives.map(a => a.letter) })),
          student: student ? { name: student.name, registration: student.registration } : null,
        };
      });
      await downloadFile('/answer-sheets/pdf', 'folhas-de-respostas.pdf', { ...sheets[0], sheets, isDuplex: isDuplexMode });
      addToast({ type: 'success', title: 'PDF da folha de respostas baixado.' });
    } catch (error) {
      addToast({ type: 'error', title: 'Falha ao exportar PDF', message: error instanceof Error ? error.message : 'Tente novamente.' });
    } finally { setIsExporting(false); }
  };

  return (
    <div className="rounded-2xl border border-slate-200 overflow-visible shadow-xs bg-white animate-in fade-in duration-200 print:border-none print:shadow-none print:rounded-none">
      {/* Top Command Bar Limpa com Apenas o Essencial */}
      <div className="bg-white px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 rounded-t-2xl print:hidden">
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
            <span>Opções da Folha</span>
          </button>

          <div className="h-4 w-px bg-slate-200 hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 hidden md:inline">Visualizando:</span>
            <div className="relative flex items-center">
              <Eye className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
              <select
                value={selectedStudentId}
                onChange={(e) => {
                  setSelectedStudentId(e.target.value);
                  setBatchPageIndex(0);
                }}
                className="text-xs font-semibold rounded-xl pl-7 pr-7 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 appearance-none cursor-pointer focus:outline-none max-w-[220px] truncate"
              >
                {isNominal && (
                  <option value="all_students">
                    Lote da Turma ({students.length} folhas)
                  </option>
                )}
                <optgroup label="Folha por Caderno (Avulsa):">
                  {availableVersionLetters.map((v) => (
                    <option key={v} value={`version:${v}`}>
                      Caderno {v} {!isNominal ? '(Avulsa)' : '(Sem Nome)'}
                    </option>
                  ))}
                </optgroup>
                {isNominal && (
                  <optgroup label="Aluno Específico:">
                    {students.map((s, sIdx) => {
                      const v = getStudentAssignedVersion(s.id, sIdx);
                      return (
                        <option key={s.id} value={s.id}>
                          {s.name} (Cad. {v})
                        </option>
                      );
                    })}
                  </optgroup>
                )}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 pointer-events-none" />
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
            title="Abrir Câmera e Leitor QR / OMR"
          >
            <Camera className="w-3.5 h-3.5 text-[#9E0B1A]" />
            <span className="hidden sm:inline">Leitor QR / Gabarito</span>
          </button>

          <button
            type="button"
            disabled={isExporting}
            onClick={handleExportPdf}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? '...' : 'PDF'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#9E0B1A] hover:bg-[#850916] text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>
              {isNominal && isBatchMode
                ? `Imprimir Lote (${students.length})`
                : 'Imprimir Folha'}
            </span>
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row items-stretch min-h-[750px] relative print:block">
        {/* =====================================================================
            SIDEBAR VERTICAL DE OPÇÕES DA FOLHA OMR (AO LADO DA FOLHA)
           ===================================================================== */}
        {isSidebarOpen && (
          <aside className="w-full lg:w-80 shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 p-5 flex flex-col gap-5 print:hidden overflow-y-auto max-h-[calc(100vh-180px)]">
            {/* 1. Tipo de Folha (Nominal vs Avulsa) */}
            <div>
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Identificação da Folha
              </span>
              <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => handleToggleNominal(true)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                    isNominal
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5 text-[#9E0B1A]" />
                  <span>Nominal</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleNominal(false)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                    !isNominal
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <UserX className="w-3.5 h-3.5 text-slate-500" />
                  <span>Avulsa</span>
                </button>
              </div>
            </div>

            {/* 2. Cadernos & Variações */}
            <div>
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Cadernos & Variações
              </span>
              <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80 mb-2">
                <button
                  type="button"
                  onClick={() => handleToggleRandom(false)}
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
                  onClick={() => handleToggleRandom(true)}
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
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                    <span className="text-slate-600 font-medium">Cadernos Diferentes (A..Z):</span>
                    <input
                      type="number"
                      min={2}
                      max={26}
                      value={numVersions}
                      onChange={(e) => handleChangeNumVersions(parseInt(e.target.value, 10) || 2)}
                      className="w-12 py-1 text-center font-bold bg-white border border-slate-300 rounded-lg text-[#9E0B1A] text-xs focus:outline-none"
                    />
                  </div>
                  {isNominal && (
                    <button
                      type="button"
                      onClick={() => reshuffleExamStudents(selectedExam.id)}
                      className="w-full py-1.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-[#9E0B1A]" />
                      <span>Sortear Distribuição</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 3. Formato Físico */}
            <div>
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Layout Físico
              </span>
              <div className="bg-slate-50/70 p-3.5 border border-slate-200/90 rounded-2xl text-xs">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-slate-700 font-medium block">Frente e Verso (Duplex)</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Verso 100% em branco de segurança</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isDuplexMode}
                    onChange={(e) => setIsDuplexMode(e.target.checked)}
                    className="rounded accent-[#9E0B1A] w-4 h-4 cursor-pointer"
                  />
                </label>
              </div>
            </div>

            {/* 4. Limpeza de Marcações em Tela */}
            {Object.keys(markedAnswers).length > 0 && (
              <div>
                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Marcações em Tela
                </span>
                <div className="space-y-2 bg-slate-50/70 p-3.5 border border-slate-200/90 rounded-2xl text-xs">
                  <button
                    type="button"
                    onClick={handleClear}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-semibold transition cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Limpar Bolhas ({Object.keys(markedAnswers).length})</span>
                  </button>
                </div>
              </div>
            )}

            {/* 5. Zoom & Escala */}
            <div>
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Zoom em Tela
              </span>
              <div className="flex items-center justify-between bg-slate-50/70 p-3 border border-slate-200/90 rounded-2xl text-xs">
                <span className="text-slate-600 font-medium">Escala de Inspeção:</span>
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

            {/* 6. Calibração OMR */}
            <div className="p-3 bg-amber-50/90 border border-amber-200/90 rounded-2xl text-[11px] text-amber-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-950">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Calibração OMR</span>
              </div>
              <p className="text-amber-800/90 leading-relaxed">
                Ao imprimir, marque <strong>Escala 100% (Tamanho Real)</strong> e desmarque Cabeçalhos/Rodapés para manter o alinhamento micrométrico dos marcadores ópticos.
              </p>
            </div>
          </aside>
        )}

        {/* Clean A4 Desk Environment with Virtualized Screen Preview */}
        <div className="flex-1 bg-slate-100/90 p-4 sm:p-8 overflow-x-auto min-h-[750px] flex flex-col items-center justify-start print:bg-white print:p-0 print:min-h-0 print:w-full">
        {isNominal && isBatchMode ? (
          <div className="w-full flex flex-col items-center gap-8 print:gap-0 print:w-full">
            {/* Virtualized Student Navigator on Screen */}
            {!isPrintingBatch && !showAllBatchOnScreen && (
              <div className="w-full max-w-[210mm] bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-2xs flex flex-wrap items-center justify-between gap-2 text-xs print:hidden">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800">
                    Lote da Turma: {students.length} folhas OMR
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-600 font-medium">
                    Aluno <strong>#{batchPageIndex + 1}</strong>: {students[batchPageIndex]?.name} (Caderno {getStudentAssignedVersion(students[batchPageIndex]?.id, batchPageIndex)})
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setBatchPageIndex(Math.max(0, batchPageIndex - 1))}
                    disabled={batchPageIndex === 0}
                    className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-mono text-xs text-slate-500 px-1">
                    {batchPageIndex + 1} / {students.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setBatchPageIndex(Math.min(students.length - 1, batchPageIndex + 1))}
                    disabled={batchPageIndex >= students.length - 1}
                    className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAllBatchOnScreen(true)}
                    className="ml-2 text-[11px] font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 px-2 py-0.5 rounded-lg cursor-pointer"
                  >
                    Expandir Todas na Tela
                  </button>
                </div>
              </div>
            )}

            {showAllBatchOnScreen && !isPrintingBatch && (
              <div className="w-full max-w-[210mm] flex items-center justify-between px-2 text-xs text-slate-500 print:hidden">
                <span>Exibindo todas as {students.length} folhas na tela.</span>
                <button
                  type="button"
                  onClick={() => setShowAllBatchOnScreen(false)}
                  className="text-xs font-semibold text-[#9E0B1A] hover:underline cursor-pointer"
                >
                  Voltar ao Modo Rápido (1 Aluno)
                </button>
              </div>
            )}

            {/* Students Render: single on interactive screen, all when printing */}
            {(isPrintingBatch || showAllBatchOnScreen
              ? students
              : [students[batchPageIndex] || students[0]]
            ).map((std, sIdx) => {
              const actualIdx = isPrintingBatch || showAllBatchOnScreen ? sIdx : batchPageIndex;
              const v = getStudentAssignedVersion(std.id, actualIdx);
              const stdQuestions = getAnswerSheetQuestionsForVersion(v);
              const totalStudentSheets = isDuplexMode ? 2 : 1;

              return (
                <div
                  key={std.id}
                  className="w-full flex flex-col items-center gap-6 print:gap-0 print:w-full"
                >
                  <A4AnswerSheet
                    examId={selectedExam.id}
                    examTitle={selectedExam.title}
                    examCode={selectedExam.code}
                    discipline={selectedExam.discipline}
                    classGroup={selectedExam.classGroup}
                    institution={selectedExam.institution}
                    versionLetter={v}
                    questions={stdQuestions}
                    student={{
                      name: std.name,
                      registration: std.registration,
                      discipline: std.discipline,
                      classGroup: std.classGroup,
                    }}
                    markedAnswers={markedAnswers}
                    onBubbleClick={handleBubbleClick}
                    pageNumber={1}
                    totalPages={totalStudentSheets}
                    isDuplex={isDuplexMode}
                    scale={scaleFactor}
                  />

                  {/* Blank Back Page in Duplex Mode */}
                  {isDuplexMode && (
                    <div
                      style={{
                        transform: scaleFactor !== 1 ? `scale(${scaleFactor})` : undefined,
                        transformOrigin: 'top center',
                      }}
                      className="a4-print-sheet relative bg-white text-slate-900 w-[210mm] min-h-[297mm] p-[18mm] shadow-[0_12px_40px_-8px_rgba(0,0,0,0.18),0_2px_8px_rgba(0,0,0,0.06)] border border-slate-200/90 rounded-[2px] flex flex-col justify-between select-none print:shadow-none print:border-none print:p-[12mm] print:m-0 print:w-full print:min-h-screen print:break-after-page print:duplex-verso"
                    >
                      <div className="text-[10px] font-mono text-slate-300 uppercase tracking-widest border-b border-slate-100 pb-2 flex justify-between">
                        <span>{selectedExam.institution}</span>
                        <span>Verso do Cartão-Resposta (Em Branco)</span>
                      </div>
                      <div className="my-auto text-center space-y-2 border-2 border-dashed border-slate-200 rounded-2xl p-10 max-w-md mx-auto print:border-slate-100">
                        <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">
                          Verso do Cartão-Resposta em Branco
                        </p>
                      </div>
                      <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span>{selectedExam.code}</span>
                        <span>Folha 2 de 2</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="w-full flex flex-col items-center gap-6 print:gap-0 print:w-full">
            <A4AnswerSheet
              examId={selectedExam.id}
              examTitle={selectedExam.title}
              examCode={selectedExam.code}
              discipline={selectedExam.discipline}
              classGroup={selectedExam.classGroup}
              institution={selectedExam.institution}
              versionLetter={resolvedVersionLetter}
              questions={activeQuestionsList}
              student={
                isNominal && currentStudent
                  ? {
                      name: currentStudent.name,
                      registration: currentStudent.registration,
                      discipline: currentStudent.discipline,
                      classGroup: currentStudent.classGroup,
                    }
                  : null
              }
              markedAnswers={markedAnswers}
              onBubbleClick={handleBubbleClick}
              pageNumber={1}
              totalPages={1}
              isDuplex={isDuplexMode}
              scale={scaleFactor}
            />
          </div>
        )}
      </div>
    </div>
  </div>
);
};
