'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { QrCodeGraphic } from '@/context/../components/common/QrCodeGraphic';
import {
  Download,
  Printer,
  Info,
  ChevronDown,
  Camera,
  CheckCircle2,
  Sparkles,
  RotateCcw,
} from 'lucide-react';

export const AnswerSheetScreen: React.FC = () => {
  const {
    exams,
    activeExamId,
    setActiveExamId,
    selectedExam,
    setIsScannerModalOpen,
    addToast,
  } = useApp();

  const [copyCount, setCopyCount] = useState<number>(35);
  const [selectedVersion, setSelectedVersion] = useState<'A' | 'B' | 'C' | 'D'>('A');

  // Interactive bubbles state for simulation / testing
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
      message: `Arquivo OMR com ${copyCount} cópias da ${selectedExam?.title || 'prova'} pronto para download.`,
    });
  };

  const examTitle = selectedExam ? selectedExam.discipline : 'Direito Constitucional';
  const examCode = selectedExam ? selectedExam.code : '#DIR-CONST-2024.2';

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Folha de Respostas (Gabarito OMR)
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Exporte folhas padronizadas com marcadores ópticos e QR Code para correção automatizada.
          </p>
        </div>

        <button
          onClick={() => setIsScannerModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition cursor-pointer"
        >
          <Camera className="w-4 h-4" /> Escanear / Testar Leitor OMR
        </button>
      </div>

      {/* Main Container: Left controls & Right Dark Preview Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Options Card (4 cols) */}
        <div className="lg:col-span-4 space-y-5 print:hidden">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <h2 className="text-base font-bold text-slate-900">
              Exportar Folha de Respostas
            </h2>

            {/* Exam Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Selecionar Prova
              </label>
              <div className="relative">
                <select
                  value={activeExamId}
                  onChange={(e) => setActiveExamId(e.target.value)}
                  className="w-full text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 pr-8 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {exams.map((exam) => (
                    <option key={exam.id} value={exam.id}>
                      {exam.title}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Version Caderno Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Caderno / Versão
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['A', 'B', 'C', 'D'] as const).map((ver) => (
                  <button
                    key={ver}
                    type="button"
                    onClick={() => setSelectedVersion(ver)}
                    className={`py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      selectedVersion === ver
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Versão {ver}
                  </button>
                ))}
              </div>
            </div>

            {/* Copies Count */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Quantidade de Cópias
              </label>
              <input
                type="number"
                min="1"
                max="200"
                value={copyCount}
                onChange={(e) => setCopyCount(parseInt(e.target.value) || 1)}
                className="w-full px-3.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Primary Action Buttons */}
            <div className="space-y-3 pt-2">
              <button
                onClick={handleExportPdf}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-3 rounded-xl shadow-sm hover:shadow transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Gerar & Exportar PDF
              </button>

              <button
                onClick={handlePrint}
                className="w-full flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold py-3 rounded-xl transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Imprimir Diretamente
              </button>
            </div>

            {/* Scanning Tip Box */}
            <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-100 text-xs text-blue-900 space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-blue-800">
                <Info className="w-4 h-4 text-blue-600" />
                Dica de Escaneamento:
              </span>
              <p className="text-[11px] text-blue-700 leading-relaxed">
                Nosso motor de IA usa o QR Code do canto superior para alinhar as imagens de forma confiável. Imprima em folhas claras de alta qualidade.
              </p>
            </div>

            {/* Simulation Helper */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Simulação de Marcação:</span>
              <button
                onClick={() => setMarkedAnswers({})}
                className="text-xs text-rose-600 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Limpar bolhas
              </button>
            </div>
          </div>
        </div>

        {/* Right Dark Canvas with Printable Sheet (8 cols) matching folha-de-respostas.png */}
        <div className="lg:col-span-8 bg-[#2d3436] p-6 sm:p-10 rounded-3xl flex justify-center shadow-xl overflow-x-auto">
          {/* Authentic White OMR Sheet */}
          <div className="w-full max-w-[620px] bg-white text-slate-900 p-8 sm:p-10 rounded-sm shadow-2xl space-y-6 select-none">
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
                    Caderno {selectedVersion}
                  </span>
                </div>
              </div>

              {/* QR Code graphic */}
              <QrCodeGraphic
                value={`${examCode}-V${selectedVersion}`}
                size={70}
                className="shadow-xs"
              />
            </div>

            {/* Student ID Fillable Form Lines */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-xs font-medium">
              <div>
                <span className="text-slate-600 font-semibold block mb-1">
                  Nome Completo do Aluno
                </span>
                <div className="border-b border-slate-400 h-6"></div>
              </div>

              <div>
                <span className="text-slate-600 font-semibold block mb-1">
                  Disciplina / Turma
                </span>
                <div className="border-b border-slate-400 h-6"></div>
              </div>

              <div>
                <span className="text-slate-600 font-semibold block mb-1">
                  Número de Matrícula
                </span>
                <div className="border-b border-slate-400 h-6"></div>
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
                                onClick={() => handleBubbleClick(qNum, letter)}
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
                                onClick={() => handleBubbleClick(qNum, letter)}
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
              <span>PROVAFACIL V4.2 OPTICAL SHEET ENGINE</span>
              <div className="flex items-center gap-1">
                <span>OMR-ALIGN-R1</span>
                <span className="w-2 h-2 bg-slate-900 inline-block"></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
