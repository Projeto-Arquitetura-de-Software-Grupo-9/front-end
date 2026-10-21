'use client';

import React from 'react';
import { QrCodeGraphic } from '@/components/common/QrCodeGraphic';

export interface A4AnswerSheetQuestion {
  orderIndex: number;
  letters: string[];
}

export interface A4AnswerSheetProps {
  examTitle: string;
  examCode: string;
  discipline?: string;
  classGroup?: string;
  institution?: string;
  versionLetter: string;
  questions: A4AnswerSheetQuestion[];
  student?: {
    name?: string;
    registration?: string;
    discipline?: string;
    classGroup?: string;
  } | null;
  markedAnswers?: Record<number, string>;
  onBubbleClick?: (qNum: number, letter: string) => void;
  pageNumber?: number;
  totalPages?: number;
  isDuplex?: boolean;
  scale?: number;
  className?: string;
}

export const A4AnswerSheet: React.FC<A4AnswerSheetProps> = ({
  examTitle,
  examCode,
  discipline,
  classGroup,
  institution = 'CATÓLICA DE SANTA CATARINA',
  versionLetter,
  questions,
  student,
  markedAnswers = {},
  onBubbleClick,
  pageNumber = 1,
  totalPages = 1,
  isDuplex = false,
  scale = 1,
  className = '',
}) => {
  const totalQuestions = questions.length;

  // Adaptive column layout based on number of questions
  let numCols = 2;
  if (totalQuestions > 75) {
    numCols = 4;
  } else if (totalQuestions > 40) {
    numCols = 3;
  } else {
    numCols = 2;
  }

  const perCol = Math.ceil(totalQuestions / numCols);

  const bubbleSizeClass =
    numCols === 4
      ? 'w-5 h-5 text-[10px]'
      : numCols === 3
      ? 'w-5.5 h-5.5 text-[10px]'
      : 'w-6 h-6 text-[11px]';

  const bubbleGapClass = numCols === 4 ? 'gap-1' : 'gap-1.5 sm:gap-2';
  const rowSpacingClass =
    numCols === 4 ? 'space-y-1' : numCols === 3 ? 'space-y-1.5' : 'space-y-2';

  const isVerso = isDuplex && pageNumber % 2 === 0;

  return (
    <div
      style={{
        transform: scale !== 1 ? `scale(${scale})` : undefined,
        transformOrigin: 'top center',
      }}
      className={`a4-print-sheet relative bg-white text-slate-900 w-[210mm] min-h-[297mm] p-[16mm] shadow-[0_12px_40px_-8px_rgba(0,0,0,0.18),0_2px_8px_rgba(0,0,0,0.06)] border border-slate-200/90 rounded-[2px] transition-transform duration-150 flex flex-col justify-between select-text print:shadow-none print:border-none print:p-[12mm] print:m-0 print:w-full print:min-h-screen print:break-after-page ${
        isDuplex
          ? isVerso
            ? 'print:duplex-verso'
            : 'print:duplex-recto'
          : ''
      } ${className}`}
    >
      {/* OMR Fiducial Corner Alignment Markers (4 solid black squares for OpenCV Perspective Transform) */}
      <div className="absolute top-3 left-3 w-3 h-3 bg-slate-950 pointer-events-none" />
      <div className="absolute top-3 right-3 w-3 h-3 bg-slate-950 pointer-events-none" />
      <div className="absolute bottom-3 left-3 w-3 h-3 bg-slate-950 pointer-events-none" />
      <div className="absolute bottom-3 right-3 w-3 h-3 bg-slate-950 pointer-events-none" />

      {/* Top Header & Institutional Identification */}
      <div>
        <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3">
          <div>
            <div className="text-[10px] font-black text-[#9E0B1A] tracking-wider uppercase mb-0.5">
              {institution}
            </div>
            <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-950 uppercase">
              Cartão-Resposta Oficial (OMR)
            </h2>
            <div className="text-xs font-semibold text-slate-700 mt-0.5">
              {examTitle}
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="text-[11px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                {examCode}
              </span>
              <span className="text-[11px] font-extrabold px-2.5 py-0.5 bg-red-50 text-[#9E0B1A] rounded border border-red-200">
                CADERNO {versionLetter}
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 bg-slate-100 text-slate-800 rounded border border-slate-200">
                {totalQuestions} Questões
              </span>
              {isDuplex && (
                <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-800 rounded border border-blue-200 print:hidden">
                  Folha Separada para Entrega (Verso em Branco)
                </span>
              )}
            </div>
          </div>

          {/* High-Contrast Dynamic QR Code for Machine Optical Grading */}
          <div className="flex flex-col items-center flex-shrink-0">
            <QrCodeGraphic
              value={JSON.stringify({
                app: 'CORREGE',
                exam: examCode.replace(/[^a-zA-Z0-9]/g, ''),
                ver: versionLetter,
                nominal: Boolean(student?.registration),
                std: student?.registration || 'ANON',
                q: totalQuestions,
              })}
              versionLetter={versionLetter}
              examCode={examCode}
              size={76}
              showBadge={false}
            />
            <span className="font-mono text-[9px] font-bold text-slate-500 mt-1">
              SCAN-OMR
            </span>
          </div>
        </div>

        {/* Student Identification Form Block */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-medium my-3.5 p-3 rounded bg-slate-50 border border-slate-200">
          <div className="col-span-2">
            <span className="text-slate-500 font-bold block mb-0.5 text-[10px] uppercase">
              Nome do Estudante:
            </span>
            <div className="font-bold text-slate-900 border-b border-slate-400 h-5 flex items-center text-xs truncate">
              {student?.name || '_____________________________________________'}
            </div>
          </div>

          <div>
            <span className="text-slate-500 font-bold block mb-0.5 text-[10px] uppercase">
              Matrícula:
            </span>
            <div className="font-mono font-bold text-slate-900 border-b border-slate-400 h-5 flex items-center text-xs">
              {student?.registration || '_______________'}
            </div>
          </div>

          <div>
            <span className="text-slate-500 font-bold block mb-0.5 text-[10px] uppercase">
              Turma / Data:
            </span>
            <div className="font-medium text-slate-800 border-b border-slate-400 h-5 flex items-center text-xs">
              {classGroup || student?.classGroup || 'Turma A'} • {new Date().toLocaleDateString('pt-BR')}
            </div>
          </div>
        </div>

        {/* Fill Instructions Bar */}
        <div className="px-3 py-1.5 bg-slate-100 border border-slate-300 rounded text-[10px] text-slate-700 flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="font-bold uppercase tracking-wider text-slate-900">Instruções:</span>
            <span>Preencha completamente a bolha com caneta <strong>preta ou azul</strong>.</span>
          </div>
          <div className="flex items-center gap-2 font-mono font-bold">
            <span className="text-emerald-700">● CERTO</span>
            <span className="text-slate-400">|</span>
            <span className="text-rose-700">✕ ERRADO</span>
          </div>
        </div>

        {/* Answer Bubbles Grid */}
        <div className="pt-1">
          <div className="flex items-center justify-between mb-2.5 border-b border-slate-300 pb-1">
            <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-900">
              GRADE DE RESPOSTAS (QUESTÕES 01 A {totalQuestions < 10 ? `0${totalQuestions}` : totalQuestions})
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">
              Caderno {versionLetter} • {numCols} Colunas
            </span>
          </div>

          <div
            className={`grid gap-x-6 gap-y-3 ${
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
                <div key={colIdx} className="space-y-1">
                  {/* Column Header Guide */}
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

                  {/* Questions in Column */}
                  <div className={rowSpacingClass}>
                    {colQuestions.map((q) => {
                      const qNum = q.orderIndex;
                      const qStr = qNum < 10 ? `0${qNum}` : `${qNum}`;
                      const currentMark = markedAnswers[qNum];

                      return (
                        <div
                          key={qNum}
                          className="flex items-center gap-1.5 text-xs font-semibold py-0.5 hover:bg-slate-50 rounded"
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
                                  onClick={() => onBubbleClick && onBubbleClick(qNum, letter)}
                                  className={`${bubbleSizeClass} rounded-full border border-slate-900 flex items-center justify-center font-bold transition-all ${
                                    onBubbleClick ? 'cursor-pointer' : 'cursor-default'
                                  } select-none ${
                                    isMarked
                                      ? 'bg-slate-950 text-white shadow-xs print:bg-slate-950 print:text-white'
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
      </div>

      {/* Optical Timing Track & Bottom Calibration Guide */}
      <div className="pt-3 border-t-2 border-slate-900 mt-6 flex flex-col gap-2">
        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-slate-950 inline-block"></span>
            <span className="font-bold text-slate-800">OMR-ALIGN-L1</span>
          </div>

          {/* Optical Calibration Bar: 20 alternating high-contrast timing blocks */}
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 20 }).map((_, i) => (
              <span
                key={i}
                className={`w-2 h-2 ${i % 2 === 0 ? 'bg-slate-950' : 'bg-slate-300'}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-800">OMR-ALIGN-R1</span>
            <span className="w-3 h-3 bg-slate-950 inline-block"></span>
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-200">
          <div>
            Correge • <span className="font-bold text-slate-700">{examCode}</span>
          </div>
          <div>
            Caderno {versionLetter} • Folha {pageNumber} de {totalPages} (Cartão-Resposta)
          </div>
        </div>
      </div>
    </div>
  );
};
