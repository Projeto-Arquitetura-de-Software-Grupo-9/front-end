'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { QrCodeGraphic } from '@/components/common/QrCodeGraphic';
import {
  Download,
  Printer,
  Info,
  ChevronDown,
  Camera,
  RotateCcw,
} from 'lucide-react';

interface OmrSheetProps {
  examTitle: string;
  examCode: string;
  versionLetter: 'A' | 'B' | 'C' | 'D';
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
  student,
  markedAnswers,
  onBubbleClick,
  className = '',
}) => {
  return (
    <div
      className={`relative w-full max-w-[620px] bg-white text-slate-900 p-8 sm:p-10 rounded-sm shadow-xl space-y-6 select-none print:shadow-none print:p-6 print:m-0 print:w-full print:break-after-page ${className}`}
    >
      {/* OMR Fiducial Corner Alignment Markers */}
      <div className="absolute top-3 left-3 w-3 h-3 bg-slate-950 pointer-events-none" />
      <div className="absolute top-3 right-3 w-3 h-3 bg-slate-950 pointer-events-none" />
      <div className="absolute bottom-3 left-3 w-3 h-3 bg-slate-950 pointer-events-none" />
      <div className="absolute bottom-3 right-3 w-3 h-3 bg-slate-950 pointer-events-none" />

      {/* Header with Title and QR Code */}
      <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            {examTitle} - Folha de Respostas
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-semibold text-slate-600">
              ID da Prova: {examCode}
            </span>
            <span className="text-xs font-bold px-2 py-0.5 bg-slate-100 rounded text-slate-800 border border-slate-300">
              Caderno {versionLetter}
            </span>
          </div>
        </div>

        {/* QR Code graphic */}
        <QrCodeGraphic
          value={JSON.stringify({
            appId: examCode.replace(/[^a-zA-Z0-9]/g, ''),
            ver: versionLetter,
            code: examCode,
          })}
          versionLetter={versionLetter}
          examCode={examCode}
          size={84}
          showBadge={true}
        />
      </div>

      {/* Student ID Fillable Form Lines */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-xs font-medium">
        <div>
          <span className="text-slate-600 font-semibold block mb-1">
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
          <span className="text-slate-600 font-semibold block mb-1">
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
          <span className="text-slate-600 font-semibold block mb-1">
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
          <span className="text-slate-600 font-semibold block mb-1">
            Data de Aplicação
          </span>
          <div className="border-b border-slate-400 h-6"></div>
        </div>
      </div>

      {/* Fill Instructions Bar */}
      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-600 flex items-center justify-between">
        <span>
          Preencha totalmente a bolha: <b className="text-slate-900">● Certo</b> | ✗ Errado
        </span>
        <span className="font-semibold text-slate-800">
          Caneta Preta ou Azul
        </span>
      </div>

      {/* Bubble Grid: Questões 1 a 20 (2 columns of 10) */}
      <div className="pt-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-4">
          QUESTÕES 1 A 20
        </h3>

        <div className="grid grid-cols-2 gap-x-8 gap-y-3">
          {/* Left Column: 1 to 10 */}
          <div className="space-y-2.5">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((qNum) => {
              const qStr = qNum < 10 ? `0${qNum}` : `${qNum}`;
              const currentMark = markedAnswers[qNum];

              return (
                <div
                  key={qNum}
                  className="flex items-center gap-3 text-xs font-semibold"
                >
                  <span className="w-5 text-slate-700 font-mono text-right">
                    {qStr}
                  </span>
                  <div className="flex items-center gap-2">
                    {['A', 'B', 'C', 'D', 'E'].map((letter) => {
                      const isMarked = currentMark === letter;
                      return (
                        <button
                          key={letter}
                          type="button"
                          onClick={() => onBubbleClick(qNum, letter)}
                          className={`w-6 h-6 rounded-full border border-slate-800 flex items-center justify-center text-[11px] font-bold transition-all cursor-pointer ${
                            isMarked
                              ? 'bg-slate-900 text-white shadow-xs'
                              : 'hover:bg-slate-100 text-slate-900'
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

          {/* Right Column: 11 to 20 */}
          <div className="space-y-2.5">
            {Array.from({ length: 10 }, (_, i) => i + 11).map((qNum) => {
              const currentMark = markedAnswers[qNum];

              return (
                <div
                  key={qNum}
                  className="flex items-center gap-3 text-xs font-semibold"
                >
                  <span className="w-5 text-slate-700 font-mono text-right">
                    {qNum}
                  </span>
                  <div className="flex items-center gap-2">
                    {['A', 'B', 'C', 'D', 'E'].map((letter) => {
                      const isMarked = currentMark === letter;
                      return (
                        <button
                          key={letter}
                          type="button"
                          onClick={() => onBubbleClick(qNum, letter)}
                          className={`w-6 h-6 rounded-full border border-slate-800 flex items-center justify-center text-[11px] font-bold transition-all cursor-pointer ${
                            isMarked
                              ? 'bg-slate-900 text-white shadow-xs'
                              : 'hover:bg-slate-100 text-slate-900'
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
      </div>

      {/* Bottom Optical Markers (Registration crosshairs) */}
      <div className="pt-8 flex items-center justify-between text-[10px] text-slate-400 font-mono border-t border-slate-200">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 bg-slate-900 inline-block"></span>
          <span>OMR-ALIGN-L1</span>
        </div>
        <span>CORREGE V4.2 OPTICAL SHEET ENGINE</span>
        <div className="flex items-center gap-1">
          <span>OMR-ALIGN-R1</span>
          <span className="w-2 h-2 bg-slate-900 inline-block"></span>
        </div>
      </div>
    </div>
  );
};

export const AnswerSheetScreen: React.FC = () => {
  const {
    selectedExam,
    setIsScannerModalOpen,
    students,
    addToast,
  } = useApp();

  const [copyCount, setCopyCount] = useState<number>(35);
  const [selectedVersion, setSelectedVersion] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('none');

  const isBatchMode = selectedStudentId === 'all_students';

  const currentStudent =
    selectedStudentId !== 'none' && selectedStudentId !== 'all_students'
      ? students.find((s) => s.id === selectedStudentId) || null
      : null;

  const [markedAnswers, setMarkedAnswers] = useState<Record<number, string>>({
    1: 'A',
    2: 'B',
    3: 'C',
    6: 'E',
    7: 'C',
    8: 'C',
    9: 'A',
    10: 'E',
    12: 'D',
    14: 'A',
    15: 'B',
  });

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

  const handlePrint = () => {
    window.print();
  };

  const handleExportPdf = () => {
    addToast({
      type: 'success',
      title: 'PDF de Folha de Respostas Gerado!',
      message: isBatchMode
        ? `Lote completo com ${students.length} folhas nominais pronto para download.`
        : `Arquivo OMR com ${copyCount} cópias da ${selectedExam?.title || 'prova'} pronto para download.`,
    });
  };

  const examTitle = selectedExam ? (selectedExam.title || selectedExam.discipline) : 'Direito Constitucional';
  const examCode = selectedExam ? selectedExam.code : '#DIR-CONST-2024.2';

  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-xs bg-white animate-in fade-in duration-200 print:border-none print:shadow-none print:rounded-none">
      {/* Integrated Workbench Toolbar (Identical structure to Caderno A4) */}
      <div className="bg-white px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 print:hidden">
        {/* Left Controls: Caderno & Destinatário */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Version Caderno Selector */}
          {!isBatchMode && (
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              {(['A', 'B', 'C', 'D'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setSelectedVersion(v)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                    selectedVersion === v
                      ? 'bg-blue-600 text-white shadow-xs'
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
                  const numV = selectedExam?.numberOfVersions || 4;
                  const assigned = (['A', 'B', 'C', 'D'] as const)[sIdx % numV];
                  setSelectedVersion(assigned);
                }
              }}
              className={`text-xs font-bold rounded-lg px-2.5 py-1.5 pr-7 appearance-none cursor-pointer focus:outline-none border ${
                isBatchMode
                  ? 'bg-blue-50 border-blue-300 text-blue-900'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <option value="none">Folha Padrão (Sem Nome)</option>
              <option value="all_students">
                🖨️ Turma Completa ({students.length} Folhas em Lote)
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

        {/* Right Controls: Scanner, Limpar, PDF, Print */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsScannerModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5 text-blue-600" />
            <span>Testar Leitor</span>
          </button>

          <button
            type="button"
            onClick={() => setMarkedAnswers({})}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
            title="Limpar respostas preenchidas na simulação"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Limpar</span>
          </button>

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
                isBatchMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-900 hover:bg-black'
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
            <div className="w-full max-w-[620px] bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs print:hidden">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
                  <Printer className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-blue-950 flex items-center gap-2">
                    <span>Lote de Folhas OMR: Turma Completa</span>
                    <span className="px-2 py-0.2 rounded bg-blue-200/70 text-blue-800 text-[10px] font-bold">
                      {students.length} Folhas
                    </span>
                  </div>
                  <p className="text-[11px] text-blue-700">
                    Folhas nominais com distribuição de Cadernos A, B, C e D e QR Code individual.
                  </p>
                </div>
              </div>
              <button
                onClick={handlePrint}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition cursor-pointer flex-shrink-0"
              >
                <Printer className="w-3.5 h-3.5" /> Imprimir Todas as Folhas
              </button>
            </div>
          )}

          {isBatchMode ? (
            /* Batch Mode: Render an OMR sheet for each student */
            <div className="w-full flex flex-col items-center gap-8 print:gap-0 print:w-full">
              {students.map((std, sIdx) => {
                const numV = selectedExam?.numberOfVersions || 4;
                const v = (['A', 'B', 'C', 'D'] as const)[sIdx % numV];
                return (
                  <div key={std.id} className="w-full flex flex-col items-center gap-3 print:gap-0 print:w-full">
                    {/* Student Section Header in Preview Screen */}
                    <div className="w-full max-w-[620px] flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs print:hidden">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                          {sIdx + 1}
                        </span>
                        <span>{std.name}</span>
                        <span className="text-slate-400 font-mono text-[11px]">
                          ({std.registration})
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[11px] font-bold">
                        Caderno {v}
                      </span>
                    </div>

                    <OmrSheet
                      examTitle={examTitle}
                      examCode={examCode}
                      versionLetter={v}
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
                Folha de Respostas OMR • Caderno {selectedVersion}
                {currentStudent && ` • Aluno: ${currentStudent.name}`}
              </div>
              <OmrSheet
                examTitle={examTitle}
                examCode={examCode}
                versionLetter={selectedVersion}
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
