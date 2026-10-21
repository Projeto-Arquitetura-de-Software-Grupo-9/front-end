'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { getVersionLetters } from '@/lib/mock-data';
import {
  X,
  QrCode,
  CheckCircle2,
  Sparkles,
  RotateCcw,
  TrendingUp,
  UserCheck,
  UserX,
  Smartphone,
  WifiOff,
  Shuffle,
} from 'lucide-react';

export const ScannerModal: React.FC = () => {
  const {
    isScannerModalOpen,
    setIsScannerModalOpen,
    selectedExam,
    students,
    addCorrection,
    navigateToResults,
    addToast,
  } = useApp();

  const isExamNominal = selectedExam?.withStudentIdentification !== false;
  const numVersions = selectedExam?.numberOfVersions || 4;
  const versionLetters = useMemo(() => getVersionLetters(numVersions), [numVersions]);

  const [scanMode, setScanMode] = useState<'com-identificacao' | 'sem-identificacao'>(
    isExamNominal ? 'com-identificacao' : 'sem-identificacao'
  );
  const [selectedStudentIdx, setSelectedStudentIdx] = useState<number>(0);
  const [selectedAnonVersion, setSelectedAnonVersion] = useState<string>('A');
  const [isScanning, setIsScanning] = useState(false);
  const [reportedName, setReportedName] = useState('Lucas Ferreira Mendes');
  const [reportedReg, setReportedReg] = useState('2024.1.077');

  // Synchronize default mode with the exam's print configuration when modal opens
  useEffect(() => {
    if (isScannerModalOpen && selectedExam) {
      setScanMode(
        selectedExam.withStudentIdentification === false
          ? 'sem-identificacao'
          : 'com-identificacao'
      );
      setSelectedStudentIdx(0);
      setSelectedAnonVersion('A');
      setScanResult(null);
    }
  }, [isScannerModalOpen, selectedExam]);

  const studentAssignments = useMemo(() => {
    if (selectedExam?.studentAssignments && selectedExam.studentAssignments.length > 0) {
      return selectedExam.studentAssignments;
    }
    return students.map((s, idx) => ({
      studentId: s.id,
      studentName: s.name,
      registration: s.registration,
      assignedVersion: versionLetters[idx % versionLetters.length] || 'A',
    }));
  }, [selectedExam?.studentAssignments, students, versionLetters]);

  const [scanResult, setScanResult] = useState<{
    studentName: string;
    registration: string;
    version: string;
    qrPayload: string;
    score: number;
    correctAnswers: number;
    totalQuestions: number;
    isAutoAssigned: boolean;
    answersList: Array<{
      q: number;
      marked: 'A' | 'B' | 'C' | 'D' | 'E';
      correct: 'A' | 'B' | 'C' | 'D' | 'E';
      isCorrect: boolean;
    }>;
  } | null>(null);

  if (!isScannerModalOpen) return null;

  const currentTargetAssignment =
    studentAssignments[selectedStudentIdx] || studentAssignments[0];
  const activeVersionLetter =
    scanMode === 'com-identificacao'
      ? currentTargetAssignment?.assignedVersion || 'A'
      : selectedAnonVersion;

  const activeQrPayload = JSON.stringify({
    examId: selectedExam?.code || '#DIR-2026',
    ver: activeVersionLetter,
    nominal: scanMode === 'com-identificacao',
    std:
      scanMode === 'com-identificacao'
        ? currentTargetAssignment?.registration || '2024.1.001'
        : 'ANON',
  });

  const handleStartScan = () => {
    setIsScanning(true);
    setScanResult(null);

    setTimeout(() => {
      setIsScanning(false);
      const isAuto = scanMode === 'com-identificacao';
      const versionObj =
        selectedExam?.versions?.find((v) => v.versionLetter === activeVersionLetter) ||
        selectedExam?.versions?.[0];

      const totalQ =
        versionObj?.questions?.length ||
        selectedExam?.selectedQuestionIds?.length ||
        10;

      const allLetters: ('A' | 'B' | 'C' | 'D' | 'E')[] = ['A', 'B', 'C', 'D', 'E'];
      const answersList: Array<{
        q: number;
        marked: 'A' | 'B' | 'C' | 'D' | 'E';
        correct: 'A' | 'B' | 'C' | 'D' | 'E';
        isCorrect: boolean;
      }> = [];

      let correctCount = 0;
      for (let i = 1; i <= totalQ; i++) {
        const officialCorrect: 'A' | 'B' | 'C' | 'D' | 'E' =
          versionObj?.answerKey?.[i] ||
          versionObj?.questions?.[i - 1]?.correctAlternative ||
          'A';

        // Simulate realistic student accuracy (~85% correct)
        const hit = i !== 4 && i !== 9;
        const wrongLetters = allLetters.filter((l) => l !== officialCorrect);
        const markedLetter = hit
          ? officialCorrect
          : wrongLetters[i % wrongLetters.length];

        if (markedLetter === officialCorrect) correctCount++;

        answersList.push({
          q: i,
          marked: markedLetter,
          correct: officialCorrect,
          isCorrect: markedLetter === officialCorrect,
        });
      }

      const maxScore = selectedExam?.maxScore || 10;
      const calculatedScore = Number(((correctCount / Math.max(1, totalQ)) * maxScore).toFixed(1));

      const targetName = isAuto
        ? currentTargetAssignment?.studentName || 'Amanda Dolores'
        : reportedName;
      const targetReg = isAuto
        ? currentTargetAssignment?.registration || '2024.1.001'
        : reportedReg;

      setScanResult({
        studentName: targetName,
        registration: targetReg,
        version: `Caderno ${activeVersionLetter}`,
        qrPayload: activeQrPayload,
        score: calculatedScore,
        correctAnswers: correctCount,
        totalQuestions: totalQ,
        isAutoAssigned: isAuto,
        answersList,
      });

      addCorrection({
        applicationId: selectedExam?.id || 'app-1',
        examVersionId: versionObj?.id || `version-${activeVersionLetter}`,
        versionLetter: activeVersionLetter,
        studentId: isAuto ? currentTargetAssignment?.studentId : undefined,
        studentName: isAuto ? targetName : undefined,
        registration: isAuto ? targetReg : undefined,
        reportedStudentName: !isAuto ? targetName : undefined,
        reportedStudentRegistration: !isAuto ? targetReg : undefined,
        objectiveResults: answersList.map((a) => ({
          questionId: `q-${a.q}`,
          chosen: a.marked,
          correct: a.correct,
          isCorrect: a.isCorrect,
          score: a.isCorrect ? maxScore / Math.max(1, totalQ) : 0,
        })),
        totalScore: calculatedScore,
        maxScore,
        isAutomaticallyAssigned: isAuto,
      });

      if (isAuto) {
        addToast({
          type: 'success',
          title: `QR Lido: Caderno ${activeVersionLetter} (${targetName})`,
          message: `Corrigido pelo gabarito específico do Caderno ${activeVersionLetter}. Nota ${calculatedScore.toFixed(1)} atribuída automaticamente.`,
        });
      } else {
        addToast({
          type: 'warning',
          title: `QR Lido: Caderno ${activeVersionLetter} (Prova Avulsa)`,
          message: `Corrigido pelo gabarito do Caderno ${activeVersionLetter} (Nota ${calculatedScore.toFixed(1)}). Disponível para vinculação em Resultados.`,
        });
      }
    }, 900);
  };

  const handleSaveToReport = () => {
    setIsScannerModalOpen(false);
    navigateToResults(selectedExam?.id);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-4 my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-[#9E0B1A] flex items-center justify-center font-bold">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Leitor QR Code & Scanner OMR
                </h2>
                <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                  {selectedExam?.code || '#EXAM'} • {numVersions} Caderno(s)
                </span>
              </div>
              <p className="text-xs text-slate-500">
                O QR Code impresso informa automaticamente a variante (Caderno A–{versionLetters[versionLetters.length - 1]}), a ordem embaralhada e se a prova é nominal ou avulsa.
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

        {/* Configuration Synchronized with Print Preview */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">
              Folha Impressa a Escanear:
            </span>
            <div className="inline-flex items-center bg-white border border-slate-200 p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => {
                  setScanMode('com-identificacao');
                  setScanResult(null);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                  scanMode === 'com-identificacao'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" /> Nominal
              </button>
              <button
                type="button"
                onClick={() => {
                  setScanMode('sem-identificacao');
                  setScanResult(null);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                  scanMode === 'sem-identificacao'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserX className="w-3.5 h-3.5" /> Avulsa
              </button>
            </div>
          </div>

          {scanMode === 'com-identificacao' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Aluno e Caderno Sorteado na Impressão:
                </label>
                <select
                  value={selectedStudentIdx}
                  onChange={(e) => {
                    setSelectedStudentIdx(Number(e.target.value));
                    setScanResult(null);
                  }}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 cursor-pointer focus:outline-none"
                >
                  {studentAssignments.map((st, idx) => (
                    <option key={st.studentId} value={idx}>
                      {st.studentName} — Caderno {st.assignedVersion} ({st.registration})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Payload no QR Code da Folha:
                </label>
                <div className="px-2.5 py-1.5 bg-slate-900 text-emerald-400 font-mono text-[10px] rounded-lg truncate">
                  {activeQrPayload}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Caderno Lido no QR Code:
                </label>
                <select
                  value={selectedAnonVersion}
                  onChange={(e) => {
                    setSelectedAnonVersion(e.target.value);
                    setScanResult(null);
                  }}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 cursor-pointer"
                >
                  {versionLetters.map((letter) => (
                    <option key={letter} value={letter}>
                      Caderno {letter}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Nome escrito à mão (opcional):
                </label>
                <input
                  type="text"
                  value={reportedName}
                  onChange={(e) => setReportedName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
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
        <div className="relative bg-slate-900 rounded-2xl p-6 text-white overflow-hidden flex flex-col items-center justify-center min-h-[210px]">
          {isScanning && (
            <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-red-400 via-amber-400 to-red-400 shadow-[0_0_15px_#ef4444] animate-bounce duration-700 top-0 bottom-0 m-auto"></div>
          )}

          {!scanResult && !isScanning && (
            <div className="text-center space-y-3 z-10">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 mx-auto flex items-center justify-center text-emerald-400">
                <QrCode className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold">
                  Pronto para Ler Folha — Caderno {activeVersionLetter}
                </h3>
                <p className="text-xs text-slate-400 max-w-md mt-0.5">
                  O leitor identifica o QR Code, carrega a permutação de questões/alternativas do{' '}
                  <strong className="text-slate-200">Caderno {activeVersionLetter}</strong> e corrige os alvéolos.
                </p>
              </div>

              <div className="pt-1 flex justify-center">
                <button
                  type="button"
                  onClick={handleStartScan}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#9E0B1A] hover:bg-[#850916] text-white rounded-xl text-xs font-bold shadow-lg transition cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" /> Ler QR Code e Corrigir Gabarito
                </button>
              </div>
            </div>
          )}

          {isScanning && (
            <div className="text-center space-y-2 z-10">
              <span className="inline-block w-8 h-8 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin"></span>
              <p className="text-xs font-bold text-emerald-400">
                Decodificando QR Code e confrontando com Gabarito do Caderno {activeVersionLetter}...
              </p>
            </div>
          )}

          {scanResult && (
            <div className="w-full space-y-3 z-10 text-left">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      {scanResult.studentName} ({scanResult.registration})
                    </h4>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span className="text-amber-300 font-bold">{scanResult.version}</span>
                      <span>•</span>
                      <span>
                        {scanResult.correctAnswers}/{scanResult.totalQuestions} acertos
                      </span>
                      <span>•</span>
                      <span>
                        {scanResult.isAutoAssigned
                          ? 'Atribuição Automática (Nominal)'
                          : 'Salva como Avulsa'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-black text-emerald-400">
                    {scanResult.score.toFixed(1)}
                  </div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    Nota Final
                  </span>
                </div>
              </div>

              {/* Bubbles detected preview */}
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 pt-1">
                {scanResult.answersList.map((a) => (
                  <div
                    key={a.q}
                    className={`p-1.5 rounded-lg text-center text-xs font-bold border ${
                      a.isCorrect
                        ? 'bg-emerald-950/60 border-emerald-600 text-emerald-300'
                        : 'bg-rose-950/60 border-rose-600 text-rose-300'
                    }`}
                    title={`Q${a.q}: Marcado ${a.marked} | Gabarito (${scanResult.version}): ${a.correct}`}
                  >
                    <span className="text-[9px] text-slate-400 block">Q{a.q}</span>
                    <span>{a.marked}</span>
                    {!a.isCorrect && (
                      <span className="block text-[9px] text-emerald-400 font-normal">
                        ({a.correct})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between pt-1">
          {scanResult ? (
            <button
              onClick={() => {
                if (scanMode === 'com-identificacao') {
                  setSelectedStudentIdx((prev) => (prev + 1) % studentAssignments.length);
                }
                setScanResult(null);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Ler Próxima Folha
            </button>
          ) : (
            <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <WifiOff className="w-3.5 h-3.5" /> Sincronizado com o gabarito impresso
            </span>
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

            <button
              onClick={handleSaveToReport}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#9E0B1A] hover:bg-[#850916] text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <TrendingUp className="w-3.5 h-3.5" /> Ver Resultados da Turma
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
