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
      className={`w-full max-w-[620px] bg-white text-slate-900 p-8 sm:p-10 rounded-sm shadow-2xl space-y-6 select-none print:shadow-none print:p-6 print:m-0 print:w-full print:break-after-page ${className}`}
    >
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

  const examTitle = selectedExam ? selectedExam.discipline : 'Direito Constitucional';
  const examCode = selectedExam ? selectedExam.code : '#DIR-CONST-2024.2';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-in fade-in duration-200">
      {/* Left Options Card (4 cols) */}
      <div className="lg:col-span-4 space-y-4 print:hidden">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">
              Configurações de Exportação
            </h2>
            <button
              onClick={() => setIsScannerModalOpen(true)}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" /> Testar Leitor
            </button>
          </div>

          {/* Student Selector / Turma Completa */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Destinatário da Folha
            </label>
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
                className={`w-full text-xs font-semibold rounded-lg px-3 py-2 pr-7 appearance-none cursor-pointer focus:outline-none border ${
                  isBatchMode
                    ? 'bg-blue-50 border-blue-300 text-blue-900'
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <option value="none">Folha Padrão (Sem Nome do Aluno)</option>
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
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Version Caderno Selector (active when not in batch mode) */}
          {!isBatchMode && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Versão do Caderno
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['A', 'B', 'C', 'D'] as const).map((ver) => (
                  <button
                    key={ver}
                    type="button"
                    onClick={() => setSelectedVersion(ver)}
                    className={`py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                      selectedVersion === ver
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {ver}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Copies Count (when in blank single sheet mode) */}
          {!isBatchMode && selectedStudentId === 'none' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Quantidade de Cópias
              </label>
              <input
                type="number"
                min="1"
                max="200"
                value={copyCount}
                onChange={(e) => setCopyCount(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none"
              />
            </div>
          )}

          {/* Primary Actions: Clean Side by Side */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={handleExportPdf}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isBatchMode ? 'Lote PDF' : 'Exportar PDF'}</span>
            </button>

            <button
              onClick={handlePrint}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 text-white text-xs font-bold rounded-lg transition cursor-pointer shadow-xs ${
                isBatchMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-900 hover:bg-black'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isBatchMode ? `Lote (${students.length})` : 'Imprimir'}</span>
            </button>
          </div>

          {/* Tip Box & Simulation Reset */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1 text-[11px]">
              <Info className="w-3.5 h-3.5 text-blue-500" />
              Impressão em alta definição
            </span>
            <button
              onClick={() => setMarkedAnswers({})}
              className="text-[11px] text-rose-600 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> Limpar
            </button>
          </div>
        </div>
      </div>

      {/* Right Dark Canvas with Printable Sheet (8 cols) */}
      <div className="lg:col-span-8 bg-[#2d3436] p-6 sm:p-10 rounded-2xl flex flex-col items-center justify-center shadow-xl overflow-x-auto print:bg-white print:p-0 print:shadow-none">
        {isBatchMode ? (
          /* Batch Mode: Render an OMR sheet for each student */
          <div className="w-full flex flex-col items-center gap-8 print:gap-0 print:w-full">
            <div className="w-full max-w-[620px] bg-white/10 text-white border border-white/20 p-2.5 rounded-lg text-xs font-bold flex items-center justify-between print:hidden">
              <span className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-emerald-400" />
                Lote de Folhas de Resposta ({students.length} alunos)
              </span>
              <span className="text-[11px] font-normal text-slate-300">
                Impressão unificada com quebra de página
              </span>
            </div>

            {students.map((std, sIdx) => {
              const numV = selectedExam?.numberOfVersions || 4;
              const v = (['A', 'B', 'C', 'D'] as const)[sIdx % numV];
              return (
                <div key={std.id} className="w-full flex flex-col items-center gap-2 print:gap-0 print:w-full">
                  <div className="w-full max-w-[620px] text-[11px] font-semibold text-slate-300 print:hidden text-left pl-1">
                    #{sIdx + 1} — {std.name} • Caderno {v}
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
        )}
      </div>
    </div>
  );
};
