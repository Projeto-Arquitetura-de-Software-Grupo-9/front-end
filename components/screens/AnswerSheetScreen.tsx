'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { QrCodeGraphic } from '@/components/common/QrCodeGraphic';
import { getVersionLetters } from '@/lib/mock-data';
import {
  Download,
  Printer,
  ChevronDown,
  Camera,
  RotateCcw,
  Sparkles,
  BookOpen,
} from 'lucide-react';

interface OmrQuestionItem {
  orderIndex: number;
  letters: string[];
}

interface OmrSheetProps {
  examTitle: string;
  examCode: string;
  versionLetter: string;
  questions: OmrQuestionItem[];
  student?: {
    name?: string;
    registration?: string;
    discipline?: string;
    classGroup?: string;
  } | null;
  markedAnswers: Record<number, string>;
  onBubbleClick: (qNum: number, letter: string) => void;
  className?: string;
}

const OmrSheet: React.FC<OmrSheetProps> = ({
  examTitle,
  examCode,
  versionLetter,
  questions,
  student,
  markedAnswers,
  onBubbleClick,
  className = '',
}) => {
  const totalQuestions = questions.length;

  // Adaptive column layout based on the exam's real question count
  let numCols = 2;
  if (totalQuestions > 75) {
    numCols = 4;
  } else if (totalQuestions > 40) {
    numCols = 3;
  } else {
    numCols = 2;
  }

  const perCol = Math.ceil(totalQuestions / numCols);

  // Column styling
  const bubbleSizeClass =
    numCols === 4
      ? 'w-5 h-5 text-[10px]'
      : numCols === 3
      ? 'w-5.5 h-5.5 text-[10px]'
      : 'w-6 h-6 text-[11px]';

  const bubbleGapClass = numCols === 4 ? 'gap-1' : 'gap-1.5 sm:gap-2';
  const rowSpacingClass =
    numCols === 4 ? 'space-y-1' : numCols === 3 ? 'space-y-1.5' : 'space-y-2';

  // Responsive max width depending on number of columns to fit standard A4 printable area
  const containerMaxWidth =
    numCols === 4 ? 'max-w-[720px]' : numCols === 3 ? 'max-w-[660px]' : 'max-w-[620px]';

  return (
    <div
      className={`relative w-full ${containerMaxWidth} bg-white text-slate-900 p-7 sm:p-9 rounded-sm shadow-xl space-y-5 select-none print:shadow-none print:p-6 print:m-0 print:w-full print:max-w-none print:break-after-page ${className}`}
    >
      {/* OMR Fiducial Corner Alignment Markers (4 solid black squares for OpenCV Perspective Transform) */}
      <div className="absolute top-3 left-3 w-3.5 h-3.5 bg-slate-950 pointer-events-none" />
      <div className="absolute top-3 right-3 w-3.5 h-3.5 bg-slate-950 pointer-events-none" />
      <div className="absolute bottom-3 left-3 w-3.5 h-3.5 bg-slate-950 pointer-events-none" />
      <div className="absolute bottom-3 right-3 w-3.5 h-3.5 bg-slate-950 pointer-events-none" />

      {/* Header with Title and QR Code */}
      <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3.5">
        <div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
            {examTitle} - Folha de Respostas OMR
          </h2>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <span className="text-xs font-semibold text-slate-600">
              ID da Prova: {examCode}
            </span>
            <span className="text-xs font-bold px-2 py-0.5 bg-slate-100 rounded text-slate-900 border border-slate-300">
              Caderno {versionLetter}
            </span>
            <span className="text-xs font-bold px-2 py-0.5 bg-red-50 text-[#9E0B1A] rounded border border-red-200">
              {totalQuestions} Questões
            </span>
          </div>
        </div>

        {/* Dynamic High-Contrast QR Code for Optical Machine Scanning */}
        <QrCodeGraphic
          value={JSON.stringify({
            appId: examCode.replace(/[^a-zA-Z0-9]/g, ''),
            ver: versionLetter,
            code: examCode,
            totalQ: totalQuestions,
            std: student?.registration || 'ANON',
          })}
          versionLetter={versionLetter}
          examCode={examCode}
          size={84}
          showBadge={true}
        />
      </div>

      {/* Student ID Fillable Form Lines */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-3.5 text-xs font-medium">
        <div>
          <span className="text-slate-600 font-semibold block mb-0.5 text-[11px]">
            Nome Completo do Aluno
          </span>
          {student?.name ? (
            <div className="font-bold text-slate-900 border-b border-slate-900 h-6 flex items-center">
              {student.name}
            </div>
          ) : (
            <div className="border-b border-slate-400 h-6"></div>
          )}
        </div>

        <div>
          <span className="text-slate-600 font-semibold block mb-0.5 text-[11px]">
            Disciplina / Turma
          </span>
          {student ? (
            <div className="font-semibold text-slate-800 border-b border-slate-900 h-6 flex items-center">
              {student.discipline || examTitle} {student.classGroup ? `• ${student.classGroup}` : ''}
            </div>
          ) : (
            <div className="border-b border-slate-400 h-6"></div>
          )}
        </div>

        <div>
          <span className="text-slate-600 font-semibold block mb-0.5 text-[11px]">
            Número de Matrícula
          </span>
          {student?.registration ? (
            <div className="font-mono font-bold text-slate-900 border-b border-slate-900 h-6 flex items-center">
              {student.registration}
            </div>
          ) : (
            <div className="border-b border-slate-400 h-6"></div>
          )}
        </div>

        <div>
          <span className="text-slate-600 font-semibold block mb-0.5 text-[11px]">
            Data de Aplicação
          </span>
          <div className="border-b border-slate-400 h-6"></div>
        </div>
      </div>

      {/* Fill Instructions Bar */}
      <div className="p-2 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-600 flex items-center justify-between">
        <span>
          Preencha totalmente a bolha: <b className="text-slate-900">● Certo</b> | ✗ Errado
        </span>
        <span className="font-semibold text-slate-800">
          Caneta Preta ou Azul
        </span>
      </div>

      {/* Bubble Grid: Partitioned automatically according to the exam questions */}
      <div className="pt-1">
        <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-1.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            GRADE DE RESPOSTAS (QUESTÕES 01 A {totalQuestions < 10 ? `0${totalQuestions}` : totalQuestions})
          </h3>
          <span className="text-[10px] text-slate-500 font-mono">
            {numCols} Colunas • {perCol} Linhas / Coluna
          </span>
        </div>

        <div
          className={`grid gap-x-4 gap-y-3 ${
            numCols === 4
              ? 'grid-cols-4'
              : numCols === 3
              ? 'grid-cols-3'
              : 'grid-cols-2'
          }`}
        >
          {Array.from({ length: numCols }).map((_, colIdx) => {
            const startIdx = colIdx * perCol;
            const endIdx = Math.min((colIdx + 1) * perCol, totalQuestions);

            if (startIdx >= totalQuestions) return null;

            const colQuestions = questions.slice(startIdx, endIdx);

            return (
              <div key={colIdx} className="space-y-1.5">
                {/* Column Calibration Guide Header for Machine OMR Alignment */}
                <div className="flex items-center gap-1.5 pb-1 border-b border-slate-300 text-[10px] font-bold text-slate-500 font-mono">
                  <span className="w-5 text-center">Nº</span>
                  <div className={`flex items-center ${bubbleGapClass}`}>
                    {['A', 'B', 'C', 'D', 'E'].map((l) => (
                      <span
                        key={l}
                        className={`${bubbleSizeClass} text-center flex items-center justify-center font-bold text-slate-600`}
                      >
                        {l}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Questions in this Column */}
                <div className={rowSpacingClass}>
                  {colQuestions.map((q) => {
                    const qNum = q.orderIndex;
                    const qStr = qNum < 10 ? `0${qNum}` : `${qNum}`;
                    const currentMark = markedAnswers[qNum];

                    return (
                      <div
                        key={qNum}
                        className="flex items-center gap-1.5 text-xs font-semibold"
                      >
                        <span className="w-5 text-slate-700 font-mono text-right text-[11px] font-bold">
                          {qStr}
                        </span>
                        <div className={`flex items-center ${bubbleGapClass}`}>
                          {q.letters.map((letter) => {
                            const isMarked = currentMark === letter;
                            return (
                              <button
                                key={letter}
                                type="button"
                                onClick={() => onBubbleClick(qNum, letter)}
                                className={`${bubbleSizeClass} rounded-full border border-slate-900 flex items-center justify-center font-bold transition-all cursor-pointer select-none ${
                                  isMarked
                                    ? 'bg-slate-950 text-white shadow-xs print:bg-white print:text-slate-900'
                                    : 'bg-white hover:bg-slate-100 text-slate-800'
                                }`}
                                title={`Questão ${qNum} - Alternativa ${letter}`}
                              >
                                {letter}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Optical Markers (Registration crosshairs & timing track) */}
      <div className="pt-4 flex items-center justify-between text-[10px] text-slate-500 font-mono border-t-2 border-slate-900">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 bg-slate-950 inline-block"></span>
          <span className="font-bold">OMR-ALIGN-L1</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Optical Timing Track Bar (Alternating black and white calibration blocks) */}
          <div className="hidden sm:flex items-center gap-0.5">
            {Array.from({ length: 16 }).map((_, i) => (
              <span
                key={i}
                className={`w-2 h-1.5 ${i % 2 === 0 ? 'bg-slate-950' : 'bg-slate-300'}`}
              />
            ))}
          </div>
          <span className="text-[9px] font-semibold text-slate-600 tracking-wider">
            CORREGE OPTICAL OMR ENGINE • {totalQuestions}Q
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-bold">OMR-ALIGN-R1</span>
          <span className="w-3 h-3 bg-slate-950 inline-block"></span>
        </div>
      </div>
    </div>
  );
};

export const AnswerSheetScreen: React.FC = () => {
  const {
    exams,
    activeExamId,
    setActiveExamId,
    selectedExam,
    setIsScannerModalOpen,
    students,
    addToast,
  } = useApp();

  const [copyCount, setCopyCount] = useState<number>(35);
  const [selectedVersion, setSelectedVersion] = useState<string>('A');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('none');

  const availableVersionLetters = getVersionLetters(selectedExam?.numberOfVersions || 4);

  const getStudentAssignedVersion = (stdId: string, fallbackIdx: number): string => {
    const found = selectedExam?.studentAssignments?.find((a) => a.studentId === stdId);
    if (found?.assignedVersion) return found.assignedVersion;
    return availableVersionLetters[(fallbackIdx * 3 + 1) % availableVersionLetters.length];
  };

  // Starts COMPLETELY BLANK by default so printing produces clean sheets for students!
  const [markedAnswers, setMarkedAnswers] = useState<Record<number, string>>({});

  // Reset marked answers if the active exam changes
  useEffect(() => {
    setMarkedAnswers({});
  }, [selectedExam?.id]);

  const isBatchMode = selectedStudentId === 'all_students';

  const currentStudent =
    selectedStudentId !== 'none' && selectedStudentId !== 'all_students'
      ? students.find((s) => s.id === selectedStudentId) || null
      : null;

  // Extract the questions directly from the selected exam version
  const currentVersionObj =
    selectedExam?.versions?.find((v) => v.versionLetter === selectedVersion) ||
    selectedExam?.versions?.[0];

  const questionsList: OmrQuestionItem[] = React.useMemo(() => {
    if (currentVersionObj?.questions && currentVersionObj.questions.length > 0) {
      return currentVersionObj.questions.map((q, idx) => ({
        orderIndex: q.orderIndex || idx + 1,
        letters:
          q.alternatives && q.alternatives.length > 0
            ? q.alternatives.map((a) => a.letter)
            : ['A', 'B', 'C', 'D', 'E'],
      }));
    }

    // Fallback: derive from selectedQuestionIds or default
    const count = selectedExam?.selectedQuestionIds?.length || 12;
    return Array.from({ length: count }, (_, i) => ({
      orderIndex: i + 1,
      letters: ['A', 'B', 'C', 'D', 'E'],
    }));
  }, [currentVersionObj, selectedExam]);

  const totalQuestions = questionsList.length;

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

  // Simulation tool to fill answers randomly for testing the scanner without manual work
  const handleSimulateFill = () => {
    const simulated: Record<number, string> = {};
    questionsList.forEach((q) => {
      if (Math.random() > 0.05) {
        const lts = q.letters;
        simulated[q.orderIndex] = lts[Math.floor(Math.random() * lts.length)];
      }
    });
    setMarkedAnswers(simulated);
    addToast({
      type: 'info',
      title: 'Respostas Simuladas Preenchidas!',
      message: `Preenchimento simulado para as ${totalQuestions} questões da prova. Você pode testar o leitor OMR agora.`,
    });
  };

  const handleClear = () => {
    setMarkedAnswers({});
    addToast({
      type: 'info',
      title: 'Folha de Respostas Limpa',
      message: 'Todas as marcações foram removidas. A folha está 100% em branco para impressão.',
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPdf = () => {
    addToast({
      type: 'success',
      title: 'PDF de Folha de Respostas Gerado!',
      message: isBatchMode
        ? `Lote completo com ${students.length} folhas nominais de ${totalQuestions} questões pronto para download.`
        : `Arquivo OMR com ${copyCount} cópias da ${selectedExam?.title || 'prova'} (${totalQuestions} questões) pronto para download.`,
    });
  };

  const examTitle = selectedExam ? (selectedExam.title || selectedExam.discipline) : 'Direito Constitucional';
  const examCode = selectedExam ? selectedExam.code : '#DIR-CONST-2024.2';

  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-xs bg-white animate-in fade-in duration-200 print:border-none print:shadow-none print:rounded-none">
      {/* Integrated Workbench Toolbar */}
      <div className="bg-white px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 print:hidden">
        {/* Left Controls: Seletor de Prova, Caderno & Destinatário */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Exam Selector Dropdown */}
          <div className="relative flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg">
            <BookOpen className="w-3.5 h-3.5 text-[#9E0B1A]" />
            <select
              value={selectedExam?.id || activeExamId}
              onChange={(e) => setActiveExamId(e.target.value)}
              className="text-xs font-bold text-slate-900 bg-transparent appearance-none pr-6 cursor-pointer focus:outline-none max-w-[200px] truncate"
            >
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.title}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Version Caderno Selector */}
          {!isBatchMode && (
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg flex-wrap">
              {availableVersionLetters.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setSelectedVersion(v)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                    selectedVersion === v
                      ? 'bg-[#9E0B1A] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Caderno {v}
                </button>
              ))}
            </div>
          )}

          {/* Destinatário Selector */}
          <div className="relative">
            <select
              value={selectedStudentId}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedStudentId(val);
                if (val !== 'none' && val !== 'all_students') {
                  const sIdx = students.findIndex((s) => s.id === val);
                  const assigned = getStudentAssignedVersion(val, Math.max(0, sIdx));
                  setSelectedVersion(assigned);
                }
              }}
              className={`text-xs font-bold rounded-lg px-2.5 py-1.5 pr-7 appearance-none cursor-pointer focus:outline-none border ${
                isBatchMode
                  ? 'bg-red-50 border-red-300 text-red-950'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <option value="none">Folha Padrão (Sem Nome)</option>
              <option value="all_students">
                🖨️ Turma Completa ({students.length} Folhas em Lote)
              </option>
              <optgroup label="Aluno Individual (Sorteio Aleatório):">
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

          {/* Question Count Badge (Derived from exam, read-only) */}
          <span className="text-xs font-bold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg border border-slate-200">
            {totalQuestions} Questões da Prova
          </span>

          {/* Copies count when blank single sheet */}
          {!isBatchMode && selectedStudentId === 'none' && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg text-xs">
              <span className="font-semibold text-slate-500 text-[11px]">Cópias:</span>
              <input
                type="number"
                min="1"
                max="500"
                value={copyCount}
                onChange={(e) => setCopyCount(parseInt(e.target.value) || 1)}
                className="w-12 text-xs font-bold text-slate-800 bg-transparent focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Right Controls: Scanner, Simular, Limpar, PDF, Print */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Scanner Testing */}
          <button
            type="button"
            onClick={() => setIsScannerModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5 text-[#9E0B1A]" />
            <span>Testar Leitor</span>
          </button>

          {/* Simular Marcações (apenas para teste de leitura) */}
          <button
            type="button"
            onClick={handleSimulateFill}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-xs font-semibold hover:bg-amber-100 transition cursor-pointer"
            title="Preencher bolhas aleatórias para simular escaneamento da prova"
          >
            <Sparkles className="w-3 h-3 text-amber-600" />
            <span>Simular Marcações</span>
          </button>

          {/* Limpar Preenchimento */}
          {Object.keys(markedAnswers).length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
              title="Deixar a folha 100% em branco"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Limpar ({Object.keys(markedAnswers).length})</span>
            </button>
          )}

          <div className="flex items-center gap-2 border-l border-slate-200 pl-2">
            <button
              type="button"
              onClick={handleExportPdf}
              className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isBatchMode ? 'Lote PDF' : 'PDF'}</span>
            </button>

            <button
              type="button"
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

      {/* Realistic Virtual Drafting Desk Environment for OMR sheets */}
      <div className="bg-slate-200/80 p-6 sm:p-10 shadow-inner overflow-x-auto min-h-[750px] flex flex-col items-center justify-start print:bg-white print:p-0 print:shadow-none print:min-h-0">
        <div className="w-full flex flex-col items-center gap-10 print:gap-0 print:w-full">
          {isBatchMode && (
            <div className="w-full max-w-[720px] bg-red-50 border border-red-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs print:hidden">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#9E0B1A] text-white flex items-center justify-center flex-shrink-0">
                  <Printer className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-red-950 flex items-center gap-2">
                    <span>Lote de Folhas OMR: Turma Completa</span>
                    <span className="px-2 py-0.2 rounded bg-red-200/70 text-[#9E0B1A] text-[10px] font-bold">
                      {students.length} Folhas ({totalQuestions} Questões)
                    </span>
                  </div>
                  <p className="text-[11px] text-red-800">
                    Folhas nominais em branco com distribuição de Cadernos A, B, C e D e QR Code individual escaneável.
                  </p>
                </div>
              </div>
              <button
                onClick={handlePrint}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#9E0B1A] hover:bg-[#850916] text-white rounded-lg text-xs font-bold transition cursor-pointer flex-shrink-0"
              >
                <Printer className="w-3.5 h-3.5" /> Imprimir Todas as Folhas
              </button>
            </div>
          )}

          {isBatchMode ? (
            /* Batch Mode: Render an OMR sheet for each student */
            <div className="w-full flex flex-col items-center gap-8 print:gap-0 print:w-full">
              {students.map((std, sIdx) => {
                const v = getStudentAssignedVersion(std.id, sIdx);

                // Get the student's assigned version questions
                const stdVersionObj =
                  selectedExam?.versions?.find((ver) => ver.versionLetter === v) ||
                  currentVersionObj;

                const stdQuestionsList =
                  stdVersionObj?.questions && stdVersionObj.questions.length > 0
                    ? stdVersionObj.questions.map((q, idx) => ({
                        orderIndex: q.orderIndex || idx + 1,
                        letters:
                          q.alternatives && q.alternatives.length > 0
                            ? q.alternatives.map((a) => a.letter)
                            : ['A', 'B', 'C', 'D', 'E'],
                      }))
                    : questionsList;

                return (
                  <div key={std.id} className="w-full flex flex-col items-center gap-3 print:gap-0 print:w-full">
                    {/* Student Section Header in Preview Screen */}
                    <div className="w-full max-w-[720px] flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs print:hidden">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                          {sIdx + 1}
                        </span>
                        <span>{std.name}</span>
                        <span className="text-slate-400 font-mono text-[11px]">
                          ({std.registration})
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-red-50 text-[#9E0B1A] border border-red-200 text-[11px] font-bold">
                        Caderno {v}
                      </span>
                    </div>

                    <OmrSheet
                      examTitle={examTitle}
                      examCode={examCode}
                      versionLetter={v}
                      questions={stdQuestionsList}
                      student={{
                        name: std.name,
                        registration: std.registration,
                        discipline: std.discipline,
                        classGroup: std.classGroup,
                      }}
                      markedAnswers={markedAnswers}
                      onBubbleClick={handleBubbleClick}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            /* Single Sheet View */
            <div className="flex flex-col items-center">
              <div className="text-[11px] font-semibold text-slate-500 mb-2 print:hidden">
                Folha de Respostas OMR • Caderno {selectedVersion} • {totalQuestions} Questões da Prova
                {currentStudent && ` • Aluno: ${currentStudent.name}`}
              </div>
              <OmrSheet
                examTitle={examTitle}
                examCode={examCode}
                versionLetter={selectedVersion}
                questions={questionsList}
                student={
                  currentStudent
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
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
