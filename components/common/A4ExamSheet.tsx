'use client';

import React from 'react';
import { QrCodeGraphic } from '@/components/common/QrCodeGraphic';

export interface A4ExamQuestion {
  id: string;
  orderIndex: number;
  statement: string;
  alternatives: {
    id: string;
    letter: 'A' | 'B' | 'C' | 'D' | 'E';
    text: string;
  }[];
  correctAlternative: 'A' | 'B' | 'C' | 'D' | 'E';
}

export interface A4ExamSheetProps {
  exam: {
    title: string;
    discipline: string;
    course: string;
    classGroup: string;
    semester: string;
    institution: string;
    department?: string;
    code?: string;
    date?: string;
    duration?: string;
    instructions?: string;
  };
  questions: A4ExamQuestion[];
  pageNumber: number;
  totalPages: number;
  versionLetter: 'A' | 'B' | 'C' | 'D';
  showAnswerKey?: boolean;
  showQrCode?: boolean;
  includeBoxNota?: boolean;
  student?: {
    name?: string;
    registration?: string;
  };
  scale?: number;
  className?: string;
}

export const A4ExamSheet: React.FC<A4ExamSheetProps> = ({
  exam,
  questions,
  pageNumber,
  totalPages,
  versionLetter,
  showAnswerKey = false,
  showQrCode = true,
  includeBoxNota = true,
  student,
  scale = 1,
  className = '',
}) => {
  const isFirstPage = pageNumber === 1;

  return (
    <div
      style={{
        transform: scale !== 1 ? `scale(${scale})` : undefined,
        transformOrigin: 'top center',
      }}
      className={`relative bg-white text-slate-900 w-[210mm] min-h-[297mm] p-[16mm] shadow-[0_12px_40px_-8px_rgba(0,0,0,0.18),0_2px_8px_rgba(0,0,0,0.06)] border border-slate-200/90 rounded-[2px] transition-transform duration-150 flex flex-col justify-between select-text print:shadow-none print:border-none print:p-[12mm] print:m-0 print:w-full print:min-h-screen print:break-after-page ${className}`}
    >
      {/* OMR Fiducial Corner Alignment Markers (Authentic scanning markers seen in prova.jpg) */}
      <div className="absolute top-3 left-3 w-3 h-3 bg-slate-950 pointer-events-none" />
      <div className="absolute top-3 right-3 w-3 h-3 bg-slate-950 pointer-events-none" />
      <div className="absolute bottom-3 left-3 w-3 h-3 bg-slate-950 pointer-events-none" />
      <div className="absolute bottom-3 right-3 w-3 h-3 bg-slate-950 pointer-events-none" />

      {/* Main Content Area */}
      <div className="space-y-5">
        {/* FIRST PAGE HEADER */}
        {isFirstPage ? (
          <header className="space-y-4">
            {/* Top row: Institutional metadata + Box NOTA + QR Code */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 bg-blue-700 rounded-xs" />
                  <h2 className="text-sm font-extrabold tracking-wide uppercase text-slate-950 leading-tight">
                    {exam.institution || 'Católica SC Centro Universitário'}
                  </h2>
                </div>

                <p className="text-[11px] font-semibold text-slate-700 leading-snug">
                  {exam.department || 'Escola de Direito | Departamento de Ciências Jurídicas'}
                </p>

                <div className="text-[11px] text-slate-600 font-medium pt-0.5 leading-snug flex flex-wrap gap-x-2">
                  <span><strong>Curso:</strong> {exam.course}</span>
                  <span>•</span>
                  <span><strong>Disciplina:</strong> {exam.discipline}</span>
                  <span>•</span>
                  <span><strong>Turma:</strong> {exam.classGroup}</span>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <h3 className="text-xs font-bold text-slate-900 uppercase">
                    {exam.title} — {exam.semester}
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
                    CADERNO {versionLetter}
                  </span>
                </div>
              </div>

              {/* Right side block: Box NOTA & QR Code */}
              <div className="flex items-start gap-3 shrink-0">
                {/* Box NOTA (Authentic format from prova.jpg) */}
                {includeBoxNota && (
                  <div className="w-24 border-2 border-slate-900 rounded-xs overflow-hidden text-center bg-white shadow-xs">
                    <div className="bg-slate-100 border-b border-slate-900 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-900">
                      NOTA
                    </div>
                    <div className="h-10 flex items-center justify-center text-sm font-bold text-slate-400">
                      <span className="font-mono text-xs text-slate-300">___/10</span>
                    </div>
                  </div>
                )}

                {/* QR Code with quiet zone and version identifier */}
                {showQrCode && (
                  <div className="flex flex-col items-center">
                    <QrCodeGraphic
                      value={JSON.stringify({
                        app: 'CORREGE',
                        code: exam.code || '#EXAM-2024',
                        ver: versionLetter,
                        pg: pageNumber,
                      })}
                      versionLetter={versionLetter}
                      examCode={exam.code}
                      size={76}
                      showBadge={false}
                    />
                    <span className="text-[8px] font-mono text-slate-500 mt-1 uppercase font-bold tracking-tight">
                      Caderno {versionLetter}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Solid separator line */}
            <div className="border-t-2 border-slate-900" />

            {/* Student Identification Fill Block */}
            <div className="space-y-2 text-xs font-medium text-slate-800 bg-slate-50/50 p-2.5 rounded-sm border border-slate-200/60">
              <div className="flex items-end">
                <span className="font-bold text-slate-900 uppercase whitespace-nowrap mr-2 text-[11px]">
                  ESTUDANTE:
                </span>
                {student?.name ? (
                  <span className="flex-1 font-bold text-slate-950 border-b border-slate-900 pb-0.5 text-xs">
                    {student.name}
                  </span>
                ) : (
                  <div className="flex-1 border-b border-dashed border-slate-500 pb-0.5" />
                )}
              </div>

              <div className="flex items-center justify-between gap-4 pt-0.5">
                <div className="flex items-end flex-1">
                  <span className="font-bold text-slate-900 uppercase whitespace-nowrap mr-2 text-[11px]">
                    MATRÍCULA:
                  </span>
                  {student?.registration ? (
                    <span className="font-mono font-bold text-slate-950 border-b border-slate-900 pb-0.5 text-xs">
                      {student.registration}
                    </span>
                  ) : (
                    <div className="flex-1 border-b border-dashed border-slate-500 pb-0.5" />
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 uppercase whitespace-nowrap text-[11px]">
                    DATA:
                  </span>
                  <span className="font-mono text-xs text-slate-800">
                    {exam.date || '____/____/________'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 uppercase whitespace-nowrap text-[11px]">
                    TURMA:
                  </span>
                  <span className="font-semibold text-xs text-slate-800">
                    {exam.classGroup || 'Turma A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Official Exam Instructions Box (matching prova.jpg) */}
            <div className="border border-slate-300 bg-slate-50/80 p-2.5 rounded-xs text-[10px] text-slate-700 leading-relaxed space-y-1">
              <span className="font-bold uppercase tracking-wider text-slate-900 block text-[9.5px]">
                Orientações para a Realização da Avaliação:
              </span>
              <p className="italic">
                {exam.instructions ||
                  '1. Preencha completamente as respostas no gabarito oficial com caneta esferográfica preta ou azul. 2. Celulares e relógios inteligentes devem ser mantidos desligados e guardados. 3. Rasuras na folha de respostas anularão a questão. 4. A interpretação das questões faz parte integrante da avaliação.'}
              </p>
            </div>
          </header>
        ) : (
          /* CONTINUATION PAGE HEADER */
          <header className="border-b border-slate-300 pb-2.5 flex items-center justify-between text-xs text-slate-600">
            <div>
              <span className="font-bold text-slate-900 uppercase text-[11px]">
                {exam.institution || 'Católica SC Centro Universitário'}
              </span>{' '}
              — <span className="font-semibold">{exam.title}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded">
                Caderno {versionLetter}
              </span>
              <span className="font-mono text-[10px] text-slate-500">
                Pág. {pageNumber}/{totalPages}
              </span>
            </div>
          </header>
        )}

        {/* QUESTIONS LIST */}
        <main className="space-y-5 pt-1">
          {questions.map((q) => (
            <article
              key={q.id}
              className="space-y-2 text-xs text-slate-900 break-inside-avoid print:break-inside-avoid"
            >
              {/* Question Statement */}
              <div className="flex items-start gap-2">
                <span className="font-bold text-slate-950 shrink-0 text-xs">
                  {q.orderIndex}.
                </span>
                <p className="font-medium text-slate-900 leading-relaxed text-justify">
                  {q.statement}
                </p>
              </div>

              {/* Alternatives */}
              <div className="space-y-1 pl-5">
                {q.alternatives.map((alt) => {
                  const isCorrect = alt.letter === q.correctAlternative;
                  const showHighlight = showAnswerKey && isCorrect;

                  return (
                    <div
                      key={alt.id}
                      className={`flex items-start justify-between py-0.5 px-2 rounded-xs transition-colors ${
                        showHighlight
                          ? 'bg-blue-50/80 border border-blue-200 text-blue-900 font-semibold'
                          : 'text-slate-800 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="font-bold shrink-0">({alt.letter})</span>
                        <span className="leading-snug">{alt.text}</span>
                      </div>

                      {showHighlight && (
                        <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 shrink-0 ml-3 border border-emerald-300">
                          GABARITO
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </main>
      </div>

      {/* FOOTER */}
      <footer className="pt-4 mt-6 border-t border-slate-300 flex items-center justify-between text-[10px] text-slate-500 font-mono">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">Correge</span>
          <span>•</span>
          <span>{exam.code || '#EXAM-2024'}</span>
        </div>

        <div className="flex items-center gap-3">
          <span>Caderno {versionLetter}</span>
          <span>•</span>
          <span className="font-bold text-slate-800">
            Folha {pageNumber} de {totalPages}
          </span>
        </div>
      </footer>
    </div>
  );
};
