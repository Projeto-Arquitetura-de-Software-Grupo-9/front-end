'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { A4AnswerSheet, A4AnswerSheetQuestion } from '@/components/common/A4AnswerSheet';
import { getVersionLetters } from '@/lib/mock-data';
import {
  Printer,
  ChevronDown,
  Camera,
  RotateCcw,
  Sparkles,
  UserCheck,
  UserX,
  Shuffle,
  SlidersHorizontal,
  Eye,
  BookOpen,
  ZoomIn,
  ZoomOut,
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
  const [showAdvancedPopover, setShowAdvancedPopover] = useState<boolean>(false);
  const [markedAnswers, setMarkedAnswers] = useState<Record<number, string>>({});

  useEffect(() => {
    setMarkedAnswers({});
    setSelectedStudentId(
      selectedExam?.withStudentIdentification === false ? 'version:A' : 'all_students'
    );
  }, [selectedExam?.id]);

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

  const handleSimulateFill = () => {
    const simulated: Record<number, string> = {};
    activeQuestionsList.forEach((q) => {
      const lts = q.letters;
      simulated[q.orderIndex] = lts[Math.floor(Math.random() * lts.length)];
    });
    setMarkedAnswers(simulated);
    addToast({
      type: 'info',
      title: 'Marcações de Teste Preenchidas',
      message: `${totalQuestions} questões marcadas para simular leitura óptica.`,
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

  return (
    <div className="rounded-2xl border border-slate-200 overflow-visible shadow-xs bg-white animate-in fade-in duration-200 print:border-none print:shadow-none print:rounded-none">
      {/* Single Minimalist Command Bar (Consistent with PrintPreviewScreen) */}
      <div className="bg-white px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5 rounded-t-2xl print:hidden">
        {/* Left: Primary Print Configuration Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 1. Nominal vs Avulsa */}
          <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-lg">
            <button
              type="button"
              onClick={() => handleToggleNominal(true)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                isNominal
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Folhas identificadas por aluno da turma"
            >
              <UserCheck className="w-3.5 h-3.5 text-[#9E0B1A]" />
              <span>Nominal</span>
            </button>
            <button
              type="button"
              onClick={() => handleToggleNominal(false)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                !isNominal
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Folha avulsa sem nome pré-impresso"
            >
              <UserX className="w-3.5 h-3.5" />
              <span>Avulsa</span>
            </button>
          </div>

          <div className="h-4 w-px bg-slate-200 hidden sm:block" />

          {/* 2. Ordem Fixa vs Aleatória + N Cadernos */}
          <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-lg">
            <button
              type="button"
              onClick={() => handleToggleRandom(false)}
              className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                !isRandomOrder
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Ordem Fixa
            </button>
            <button
              type="button"
              onClick={() => handleToggleRandom(true)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                isRandomOrder
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Shuffle className="w-3 h-3 text-[#9E0B1A]" />
              <span>Aleatória</span>
            </button>

            {isRandomOrder && (
              <div className="flex items-center gap-1 pl-1.5 pr-1 border-l border-slate-200 ml-1">
                <input
                  type="number"
                  min={2}
                  max={26}
                  value={numVersions}
                  onChange={(e) => handleChangeNumVersions( parseInt(e.target.value, 10) || 2 )}
                  className="w-9 px-1 py-0.5 bg-white border border-slate-200 rounded text-center text-xs font-bold text-slate-900 focus:outline-none"
                  title="Quantidade de cadernos diferentes (A..Z)"
                />
                <span className="text-[10px] font-semibold text-slate-500 hidden md:inline">
                  cadernos
                </span>
                {isNominal && (
                  <button
                    type="button"
                    onClick={() => reshuffleExamStudents(selectedExam.id)}
                    className="p-1 text-slate-500 hover:text-[#9E0B1A] rounded transition cursor-pointer"
                    title="Sortear novamente qual aluno recebe cada caderno"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Unified View Selector, Secondary Options Popover & Print Button */}
        <div className="flex items-center gap-2">
          {/* Unified View Selector */}
          <div className="relative flex items-center">
            <Eye className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="text-xs font-semibold rounded-lg pl-7 pr-7 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 appearance-none cursor-pointer focus:outline-none max-w-[230px] truncate"
            >
              {isNominal && (
                <option value="all_students">
                  Lote da Turma ({students.length} folhas)
                </option>
              )}
              <optgroup label="Folha por Caderno (Avulsa):">
                {availableVersionLetters.map((v) => (
                  <option key={v} value={`version:${v}`}>
                    Folha Caderno {v} {!isNominal ? '(Avulsa)' : '(Sem Nome)'}
                  </option>
                ))}
              </optgroup>
              {isNominal && (
                <optgroup label="Ver Folha de Aluno Específico:">
                  {students.map((s, sIdx) => {
                    const v = getStudentAssignedVersion(s.id, sIdx);
                    return (
                      <option key={s.id} value={s.id}>
                        {s.name} (Caderno {v})
                      </option>
                    );
                  })}
                </optgroup>
              )}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 pointer-events-none" />
          </div>

          {/* Secondary Settings Popover */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowAdvancedPopover((prev) => !prev)}
              className={`p-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                showAdvancedPopover
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
              title="Opções de simulação, frente e verso e zoom"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>

            {showAdvancedPopover && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl border border-slate-200 shadow-xl p-3.5 z-40 space-y-3 text-xs animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="font-bold text-slate-800">Opções da Folha OMR</span>
                  <button
                    type="button"
                    onClick={() => setShowAdvancedPopover(false)}
                    className="text-slate-400 hover:text-slate-600 text-[11px] font-semibold cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center justify-between cursor-pointer py-1">
                    <span className="text-slate-700 font-medium flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                      Frente e Verso (Verso Limpo)
                    </span>
                    <input
                      type="checkbox"
                      checked={isDuplexMode}
                      onChange={(e) => setIsDuplexMode(e.target.checked)}
                      className="rounded border-slate-300 text-[#9E0B1A] focus:ring-[#9E0B1A]"
                    />
                  </label>
                </div>

                {/* Zoom Control */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Zoom na Tela</span>
                  <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() => setPreviewZoom(Math.max(85, previewZoom - 15))}
                      className="p-1 text-slate-600 hover:text-slate-900 cursor-pointer"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[11px] font-mono font-bold px-1.5 text-slate-800">
                      {previewZoom}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreviewZoom(Math.min(115, previewZoom + 15))}
                      className="p-1 text-slate-600 hover:text-slate-900 cursor-pointer"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Simulation & Scanner Tools */}
                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      handleSimulateFill();
                      setShowAdvancedPopover(false);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Simular Bolhas Marcadas</span>
                  </button>

                  {Object.keys(markedAnswers).length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        handleClear();
                        setShowAdvancedPopover(false);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold transition cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Limpar Bolhas ({Object.keys(markedAnswers).length})</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setShowAdvancedPopover(false);
                      setIsScannerModalOpen(true);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5 text-[#9E0B1A]" />
                    <span>Abrir Leitor QR / OMR</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Primary Print Action Button */}
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#9E0B1A] hover:bg-[#850916] text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-xs"
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

      {/* Clean A4 Desk Environment (Identical to PrintPreviewScreen) */}
      <div className="bg-slate-100/90 p-4 sm:p-8 overflow-x-auto min-h-[750px] flex flex-col items-center justify-start print:bg-white print:p-0 print:min-h-0">
        {isNominal && isBatchMode ? (
          <div className="w-full flex flex-col items-center gap-8 print:gap-0 print:w-full">
            {students.map((std, sIdx) => {
              const v = getStudentAssignedVersion(std.id, sIdx);
              const stdQuestions = getAnswerSheetQuestionsForVersion(v);
              const totalStudentSheets = isDuplexMode ? 2 : 1;

              return (
                <div
                  key={std.id}
                  className="w-full flex flex-col items-center gap-6 print:gap-0 print:w-full"
                >
                  <A4AnswerSheet
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

                  {/* Blank Back Page in Duplex Mode so sheets stay separated */}
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
  );
};
