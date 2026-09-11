'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  X,
  Camera,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Upload,
  RotateCcw,
  TrendingUp,
  FileCheck,
} from 'lucide-react';
import { QrCodeGraphic } from '@/components/common/QrCodeGraphic';

export const ScannerModal: React.FC = () => {
  const {
    isScannerModalOpen,
    setIsScannerModalOpen,
    selectedExam,
    navigateToResults,
    addToast,
  } = useApp();

  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{
    studentName: string;
    registration: string;
    version: string;
    score: number;
    correctAnswers: number;
    totalQuestions: number;
    confidence: number;
    answersList: Array<{ q: number; marked: string; isCorrect: boolean }>;
  } | null>(null);

  if (!isScannerModalOpen) return null;

  const handleStartScan = () => {
    setIsScanning(true);
    setScanResult(null);

    setTimeout(() => {
      setIsScanning(false);
      setScanResult({
        studentName: 'Dolores',
        registration: '2024.1.001',
        version: 'Caderno A',
        score: 9.2,
        correctAnswers: 14,
        totalQuestions: 15,
        confidence: 99.8,
        answersList: [
          { q: 1, marked: 'A', isCorrect: true },
          { q: 2, marked: 'B', isCorrect: true },
          { q: 3, marked: 'C', isCorrect: true },
          { q: 4, marked: 'D', isCorrect: false },
          { q: 5, marked: 'E', isCorrect: true },
          { q: 6, marked: 'E', isCorrect: true },
          { q: 7, marked: 'C', isCorrect: true },
          { q: 8, marked: 'C', isCorrect: true },
          { q: 9, marked: 'A', isCorrect: true },
          { q: 10, marked: 'E', isCorrect: true },
          { q: 11, marked: 'C', isCorrect: true },
          { q: 12, marked: 'D', isCorrect: true },
          { q: 13, marked: 'C', isCorrect: true },
          { q: 14, marked: 'A', isCorrect: true },
          { q: 15, marked: 'B', isCorrect: true },
        ],
      });
      addToast({
        type: 'success',
        title: 'Folha Processada com Sucesso!',
        message: 'Nota 9.2 calculada automaticamente para a aluna Dolores.',
      });
    }, 1800);
  };

  const handleSaveToReport = () => {
    setIsScannerModalOpen(false);
    navigateToResults();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Leitor & Escaneamento Inteligente OMR
              </h2>
              <p className="text-xs text-slate-500">
                Alinhamento por QR Code e detecção neural de bolhas preenchidas.
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

        {/* Visual Scanner Area */}
        <div className="relative bg-slate-900 rounded-2xl p-6 sm:p-8 text-white overflow-hidden flex flex-col items-center justify-center min-h-[260px]">
          {/* Laser scanning bar animation */}
          {isScanning && (
            <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-emerald-400 via-blue-400 to-emerald-400 shadow-[0_0_15px_#10b981] animate-bounce duration-700 top-0 bottom-0 m-auto"></div>
          )}

          {!scanResult && !isScanning && (
            <div className="text-center space-y-3 z-10">
              <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 mx-auto flex items-center justify-center text-emerald-400">
                <QrCode className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Posicione o Gabarito na Câmera</h3>
                <p className="text-xs text-slate-400 max-w-sm mt-1">
                  O scanner identificará o QR Code e corrigirá distorções de ângulo automaticamente.
                </p>
              </div>

              <div className="pt-2 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={handleStartScan}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30 transition cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" /> Simular Escaneamento de Folha
                </button>
              </div>
            </div>
          )}

          {isScanning && (
            <div className="text-center space-y-2 z-10">
              <span className="inline-block w-8 h-8 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin"></span>
              <p className="text-xs font-bold text-emerald-400">
                Processando QR Code e Matriz de Bolhas...
              </p>
              <p className="text-[11px] text-slate-400">
                Reconhecendo coordenadas dos 4 marcadores angulares
              </p>
            </div>
          )}

          {scanResult && (
            <div className="w-full space-y-4 z-10 text-left">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      {scanResult.studentName} ({scanResult.registration})
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      {scanResult.version} • Confiança OMR {scanResult.confidence}%
                    </span>
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
              <div className="grid grid-cols-5 gap-2 pt-1">
                {scanResult.answersList.slice(0, 10).map((a) => (
                  <div
                    key={a.q}
                    className={`p-2 rounded-lg text-center text-xs font-bold border ${
                      a.isCorrect
                        ? 'bg-emerald-950/60 border-emerald-600 text-emerald-300'
                        : 'bg-rose-950/60 border-rose-600 text-rose-300'
                    }`}
                  >
                    <span className="text-[10px] text-slate-400 block">Q{a.q}</span>
                    <span>{a.marked}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between pt-2">
          {scanResult ? (
            <button
              onClick={() => {
                setScanResult(null);
                handleStartScan();
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Escanear Próxima Folha
            </button>
          ) : (
            <div></div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setIsScannerModalOpen(false);
                setScanResult(null);
              }}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Fechar
            </button>

            {scanResult && (
              <button
                onClick={handleSaveToReport}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer"
              >
                <TrendingUp className="w-4 h-4" /> Ver na Matriz de Resultados
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
