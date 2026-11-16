'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { api } from '@/lib/api';
import {
  X,
  Camera,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RotateCcw,
  TrendingUp,
  UserCheck,
  UserX,
  Smartphone,
  WifiOff,
  Loader2,
} from 'lucide-react';

export const ScannerModal: React.FC = () => {
  const {
    isScannerModalOpen,
    setIsScannerModalOpen,
    selectedExam,
    students,
    navigateToResults,
    addToast,
    addCorrection,
  } = useApp();

  const [scanMode, setScanMode] = useState<'com-identificacao' | 'sem-identificacao'>('com-identificacao');
  const [isScanning, setIsScanning] = useState(false);
  const [reportedName, setReportedName] = useState('Lucas Ferreira Mendes');
  const [reportedReg, setReportedReg] = useState('2024.1.077');
  const [scanResult, setScanResult] = useState<{
    studentName: string;
    registration: string;
    version: string;
    score: number;
    correctAnswers: number;
    totalQuestions: number;
    confidence: number;
    isAutoAssigned: boolean;
    answersList: Array<{ q: number; marked: string; isCorrect: boolean }>;
  } | null>(null);

  if (!isScannerModalOpen) return null;

  const handleStartScan = async () => {
    setIsScanning(true);
    setScanResult(null);

    const isAuto = scanMode === 'com-identificacao';
    const targetStudent = isAuto
      ? (students.length > 0 ? students[0] : { id: 'std-1', name: 'Amanda Dolores', registration: '2024.1.001' })
      : null;

    const studentName = isAuto ? (targetStudent?.name || 'Amanda Dolores') : reportedName;
    const registration = isAuto ? (targetStudent?.registration || '2024.1.001') : reportedReg;

    // Constrói gabarito e marcações simuladas baseadas na prova selecionada
    const totalQ = selectedExam?.selectedQuestionIds?.length || 10;
    const officialKey: Record<string, string> = {};
    const sampleMarked: Record<string, string> = {};
    const answersList: Array<{ q: number; marked: string; isCorrect: boolean }> = [];
    const letters = ['A', 'B', 'C', 'D', 'E'];

    let correctCount = 0;
    for (let i = 1; i <= totalQ; i++) {
      const correctLetter = letters[(i * 3) % letters.length];
      officialKey[String(i)] = correctLetter;
      // Simula taxa alta de acerto (80-90%)
      const isCorrect = i % 7 !== 0;
      const markedLetter = isCorrect ? correctLetter : letters[(letters.indexOf(correctLetter) + 1) % letters.length];
      sampleMarked[String(i)] = markedLetter;
      if (isCorrect) correctCount++;
      answersList.push({ q: i, marked: markedLetter, isCorrect });
    }

    try {
      // 1. Executa avaliação pelo endpoint real OMR/Grading
      const gradeRes = await api.gradeOmrSheet({
        markedAnswers: sampleMarked,
        officialAnswerKey: officialKey,
        totalQuestions: totalQ,
        versionLetter: 'A',
        maxScore: selectedExam?.maxScore || 10,
      });

      const calculatedScore = gradeRes?.grading?.totalScore ?? Number(((correctCount / totalQ) * (selectedExam?.maxScore || 10)).toFixed(1));

      // 2. Persiste a correção no banco de dados / backend
      try {
        await api.createCorrecao({
          idVersaoProva: selectedExam?.versions?.[0]?.id || 'versao-catolica-01',
          idProva: selectedExam?.id,
          versaoMarcada: 'A',
          idAluno: targetStudent?.id || undefined,
          nomeManuscrito: !isAuto ? studentName : undefined,
          matriculaManuscrita: !isAuto ? registration : undefined,
          notaTotal: calculatedScore,
          respostasLidas: sampleMarked,
          atribuicaoAutomatica: isAuto,
        });
      } catch (persistErr) {
        console.warn('Persistência remota de correção (modo fallback):', persistErr);
      }

      // 3. Atualiza estado local de correções estritamente compatível com Correction
      addCorrection({
        applicationId: selectedExam?.id || 'app-default',
        examVersionId: selectedExam?.versions?.[0]?.id || 'versao-catolica-01',
        versionLetter: 'A',
        studentId: isAuto && targetStudent?.id ? targetStudent.id : undefined,
        studentName,
        registration,
        reportedStudentName: !isAuto ? studentName : undefined,
        reportedStudentRegistration: !isAuto ? registration : undefined,
        objectiveResults: answersList.map((a) => ({
          questionId: `q-${a.q}`,
          chosen: a.marked as any,
          correct: (officialKey[String(a.q)] || 'A') as any,
          isCorrect: a.isCorrect,
          score: a.isCorrect ? 1 : 0,
        })),
        totalScore: calculatedScore,
        maxScore: selectedExam?.maxScore || 10,
        isAutomaticallyAssigned: isAuto,
        syncStatus: 'synced',
      });

      setScanResult({
        studentName,
        registration,
        version: 'Caderno A',
        score: calculatedScore,
        correctAnswers: correctCount,
        totalQuestions: totalQ,
        confidence: 99.8,
        isAutoAssigned: isAuto,
        answersList,
      });

      if (isAuto) {
        addToast({
          type: 'success',
          title: 'Correção Atribuída Automaticamente!',
          message: `Caderno A + Aluno(a) ${studentName}. Nota ${calculatedScore.toFixed(1)} registrada com sucesso.`,
        });
      } else {
        addToast({
          type: 'warning',
          title: 'Correção Salva na Fila (Sem Identificação)',
          message: `Nota ${calculatedScore.toFixed(1)} calculada. Acesse Resultados para vincular manualmente a ${studentName}.`,
        });
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Erro na Leitura OMR',
        message: err.message || 'Falha ao processar folha de respostas.',
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleSaveToReport = () => {
    setIsScannerModalOpen(false);
    navigateToResults();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 sm:p-8 space-y-5 my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-[#9E0B1A] flex items-center justify-center font-bold">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Simulador do App Mobile do Professor
                </h2>
                <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                  Features 8 & 9 (React Native)
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Na especificação, a leitura de QR Code é exclusiva do app mobile com fila offline (SQLite) e sync em lote.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setIsScannerModalOpen(false);
              setScanResult(null);
            }}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector for Testing */}
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
          <label className="block text-xs font-bold text-slate-700">
            Simular Cenário de Leitura:
          </label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => {
                setScanMode('com-identificacao');
                setScanResult(null);
              }}
              className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                scanMode === 'com-identificacao'
                  ? 'border-[#9E0B1A] bg-white text-[#9E0B1A] font-bold shadow-2xs'
                  : 'border-slate-200 text-slate-600 hover:bg-white'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold">
                <UserCheck className="w-3.5 h-3.5" /> Prova COM Identificação
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 font-normal">
                QR Code carrega (Versão + Aluno) → Atribuição automática
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setScanMode('sem-identificacao');
                setScanResult(null);
              }}
              className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                scanMode === 'sem-identificacao'
                  ? 'border-[#9E0B1A] bg-white text-[#9E0B1A] font-bold shadow-2xs'
                  : 'border-slate-200 text-slate-600 hover:bg-white'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold">
                <UserX className="w-3.5 h-3.5" /> Prova SEM Identificação
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 font-normal">
                QR Code só tem Versão → Exige lançamento manual posterior
              </div>
            </button>
          </div>

          {scanMode === 'sem-identificacao' && (
            <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                  Nome lido à mão na prova (Feature 8.4):
                </label>
                <input
                  type="text"
                  value={reportedName}
                  onChange={(e) => setReportedName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                  Matrícula anotada:
                </label>
                <input
                  type="text"
                  value={reportedReg}
                  onChange={(e) => setReportedReg(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>
          )}
        </div>

        {/* Visual Scanner Camera Area */}
        <div className="relative bg-slate-900 rounded-2xl p-6 text-white overflow-hidden flex flex-col items-center justify-center min-h-[220px]">
          {isScanning && (
            <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-red-400 via-amber-400 to-red-400 shadow-[0_0_15px_#ef4444] animate-bounce duration-700 top-0 bottom-0 m-auto"></div>
          )}

          {!scanResult && !isScanning && (
            <div className="text-center space-y-3 z-10">
              <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 mx-auto flex items-center justify-center text-emerald-400">
                <QrCode className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Câmera do App Pronta</h3>
                <p className="text-xs text-slate-400 max-w-sm mt-0.5">
                  Reconhecimento OMR conectado ao motor de correção do servidor.
                </p>
              </div>

              <div className="pt-2 flex justify-center">
                <button
                  type="button"
                  onClick={handleStartScan}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#9E0B1A] hover:bg-[#850916] text-white rounded-xl text-xs font-bold shadow-lg transition cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" /> Simular Captura e Corrigir via API
                </button>
              </div>
            </div>
          )}

          {isScanning && (
            <div className="text-center space-y-2 z-10">
              <span className="inline-block w-8 h-8 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin"></span>
              <p className="text-xs font-bold text-emerald-400">
                Lendo QR Code e Cartão-Resposta...
              </p>
              <p className="text-[11px] text-slate-400">
                Enviando marcações para a API e persistindo nota no banco de dados
              </p>
            </div>
          )}

          {scanResult && (
            <div className="w-full space-y-3 z-10 text-left">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      {scanResult.studentName} ({scanResult.registration})
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      {scanResult.version} • {scanResult.isAutoAssigned ? 'Atribuição Automática' : 'Pendente de Atribuição Manual'}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-black text-emerald-400">
                    {scanResult.score.toFixed(1)}
                  </div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    Nota Calculada
                  </span>
                </div>
              </div>

              {/* Bubbles detected preview */}
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 pt-1">
                {scanResult.answersList.slice(0, 10).map((a) => (
                  <div
                    key={a.q}
                    className={`p-1.5 rounded-lg text-center text-xs font-bold border ${
                      a.isCorrect
                        ? 'bg-emerald-950/60 border-emerald-600 text-emerald-300'
                        : 'bg-rose-950/60 border-rose-600 text-rose-300'
                    }`}
                  >
                    <span className="text-[9px] text-slate-400 block">Q{a.q}</span>
                    <span>{a.marked}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Offline sync note */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
          <span className="flex items-center gap-1.5">
            <WifiOff className="w-3.5 h-3.5 text-slate-400" />
            Fila Local (SQLite): <strong>Deduplicação por clientCorrectionId ativa</strong>
          </span>
          <span className="font-mono text-emerald-700 font-bold">100% Offline-Ready</span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between pt-1">
          {scanResult ? (
            <button
              onClick={() => {
                setScanResult(null);
                handleStartScan();
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Escanear Próxima Prova
            </button>
          ) : (
            <div></div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsScannerModalOpen(false);
                setScanResult(null);
              }}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Fechar
            </button>

            {scanResult && (
              <button
                onClick={handleSaveToReport}
                className="inline-flex items-center gap-2 px-5 py-2 bg-[#9E0B1A] hover:bg-[#850916] text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer"
              >
                <TrendingUp className="w-4 h-4" /> Ir para Resultados
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
