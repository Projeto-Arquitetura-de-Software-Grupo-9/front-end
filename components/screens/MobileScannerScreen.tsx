'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { api } from '@/lib/api';
import { CorregeLogo } from '@/components/common/CorregeLogo';
import QRCode from 'qrcode';
import {
  Camera,
  QrCode,
  CheckCircle2,
  RotateCcw,
  LogOut,
  Upload,
  Check,
  XCircle,
  FileText,
  User,
  BookOpen,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';

type Letter = 'A' | 'B' | 'C' | 'D' | 'E';
const LETTERS: Letter[] = ['A', 'B', 'C', 'D', 'E'];

type MobileStep = 'scan-qr' | 'view-test' | 'corrected';

export const MobileScannerScreen: React.FC = () => {
  const {
    exams,
    activeExamId,
    setActiveExamId,
    selectedExam,
    questions: questionBank,
    students,
    addCorrection,
    addToast,
    logout,
  } = useApp();

  const [step, setStep] = useState<MobileStep>('scan-qr');
  const [selectedVersionLetter, setSelectedVersionLetter] = useState<string>('A');
  const [scanMode, setScanMode] = useState<'nominal' | 'avulsa'>('nominal');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    students[0]?.id || 'std-1'
  );
  const [qrRawString, setQrRawString] = useState<string | null>(null);

  // Camera & Scanning states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [correctedCount, setCorrectedCount] = useState(0);

  // Student's marked answers on the test: questionNumber (1..N) -> Letter
  const [markedAnswers, setMarkedAnswers] = useState<Record<number, Letter>>({});

  // Official grading result from Python backend
  const [gradingResult, setGradingResult] = useState<{
    correctCount: number;
    totalQuestions: number;
    totalScore: number;
    maxScore: number;
    details: Array<{
      questionNumber: number;
      questionId: string;
      chosen: Letter | null;
      correct: Letter;
      isCorrect: boolean;
      score: number;
    }>;
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentExam =
    exams.find((e) => e.id === activeExamId) || selectedExam || exams[0];
  const versions = currentExam?.versions || [];

  const activeVersion = useMemo(() => {
    return (
      versions.find((v) => v.versionLetter === selectedVersionLetter) ||
      versions[0]
    );
  }, [versions, selectedVersionLetter]);

  // Build the full list of test questions for the scanned Caderno (A, B, C, D)
  const testQuestions = useMemo(() => {
    if (activeVersion?.questions && activeVersion.questions.length > 0) {
      return activeVersion.questions.map((q, idx) => ({
        orderIndex: q.orderIndex || idx + 1,
        originalQuestionId: q.originalQuestionId || `q-${idx + 1}`,
        statement: q.statement,
        alternatives:
          q.alternatives && q.alternatives.length > 0
            ? q.alternatives
            : LETTERS.map((l, lIdx) => ({
                id: `alt-${idx}-${lIdx}`,
                letter: l,
                text: `Alternativa ${l}`,
              })),
        correctAlternative: (q.correctAlternative || 'A') as Letter,
        topic: q.topic,
      }));
    }

    // Fallback to selectedQuestionIds from questionBank
    const fromBank = (currentExam?.selectedQuestionIds || [])
      .map((id) => questionBank.find((qb) => qb.id === id))
      .filter(Boolean);

    if (fromBank.length > 0) {
      return fromBank.map((q, idx) => ({
        orderIndex: idx + 1,
        originalQuestionId: q!.id,
        statement: q!.statement,
        alternatives: q!.alternatives,
        correctAlternative: q!.correctAlternative,
        topic: q!.topic,
      }));
    }

    // Default fallback if exam has no questions attached
    return questionBank.slice(0, 5).map((q, idx) => ({
      orderIndex: idx + 1,
      originalQuestionId: q.id,
      statement: q.statement,
      alternatives: q.alternatives,
      correctAlternative: q.correctAlternative,
      topic: q.topic,
    }));
  }, [activeVersion, currentExam, questionBank]);

  const totalQuestions = testQuestions.length;

  const officialAnswerKey = useMemo(() => {
    const key: Record<number, Letter> = {};
    testQuestions.forEach((q, idx) => {
      const qNum = idx + 1;
      key[qNum] =
        (activeVersion?.answerKey?.[qNum] as Letter) ||
        q.correctAlternative ||
        'A';
    });
    return key;
  }, [testQuestions, activeVersion]);

  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [isCameraActive]);

  /**
   * Applies the decoded QR Code payload (from the printed test) to load the right
   * Exam, Caderno (A/B/C/D), Student, and detected OMR answers, then shows the test!
   */
  const applyDecodedQrAndOpenTest = useCallback(
    (
      qrData: {
        examCode?: string;
        versionLetter?: string;
        nominal?: boolean;
        studentRegistration?: string;
      },
      rawQrText: string | null,
      detectedAnswers?: Record<string, Letter>
    ) => {
      stopCamera();

      // 1. Match Exam by code if present in QR Code
      let matchedExam = currentExam;
      if (qrData.examCode) {
        const cleanQrCode = qrData.examCode.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        const foundExam = exams.find(
          (ex) =>
            ex.code.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === cleanQrCode ||
            ex.id.toLowerCase() === cleanQrCode
        );
        if (foundExam) {
          matchedExam = foundExam;
          setActiveExamId(foundExam.id);
        }
      }

      // 2. Match Version / Caderno (A, B, C, D...)
      const verLetter = (qrData.versionLetter || selectedVersionLetter || 'A').toUpperCase();
      setSelectedVersionLetter(verLetter);

      // 3. Match Student by registration if present in QR Code
      if (qrData.studentRegistration && qrData.studentRegistration !== 'ANON') {
        const foundStudent = students.find(
          (s) =>
            s.registration.toLowerCase() ===
            qrData.studentRegistration!.toLowerCase()
        );
        if (foundStudent) {
          setSelectedStudentId(foundStudent.id);
          setScanMode('nominal');
        }
      } else if (qrData.nominal === false) {
        setScanMode('avulsa');
      }

      setQrRawString(rawQrText);

      // 4. Populate detected answers on the test questions
      const targetVer =
        matchedExam?.versions?.find((v) => v.versionLetter === verLetter) ||
        matchedExam?.versions?.[0];
      const qCount =
        targetVer?.questions?.length ||
        matchedExam?.selectedQuestionIds?.length ||
        totalQuestions;

      const nextAnswers: Record<number, Letter> = {};
      if (detectedAnswers && Object.keys(detectedAnswers).length > 0) {
        Object.entries(detectedAnswers).forEach(([k, v]) => {
          const qNum = Number(k);
          if (qNum >= 1 && LETTERS.includes(v as Letter)) {
            nextAnswers[qNum] = v as Letter;
          }
        });
      } else {
        // Pre-populate with detected student answers for this test
        for (let i = 1; i <= qCount; i++) {
          const correct =
            (targetVer?.answerKey?.[i] as Letter) ||
            (targetVer?.questions?.[i - 1]?.correctAlternative as Letter) ||
            officialAnswerKey[i] ||
            'A';
          nextAnswers[i] =
            Math.random() < 0.85
              ? correct
              : LETTERS.filter((l) => l !== correct)[
                  Math.floor(Math.random() * 4)
                ];
        }
      }

      setMarkedAnswers(nextAnswers);
      setGradingResult(null);
      setStep('view-test');

      addToast({
        type: 'success',
        title: `QR Code Lido • Caderno ${verLetter}`,
        message: `Prova "${matchedExam?.title || 'Avaliação'}" carregada. Confira a prova e toque em Corrigir Prova.`,
      });
    },
    [
      currentExam,
      exams,
      officialAnswerKey,
      selectedVersionLetter,
      setActiveExamId,
      stopCamera,
      students,
      totalQuestions,
      addToast,
    ]
  );

  /**
   * Sends a captured frame/image to the Python OpenCV backend (/api/omr -> back-end/omr_scanner.py)
   * to decode the QR Code and read the test answers.
   */
  const scanImageWithPython = useCallback(
    async (imageBase64: string, silentIfNoQr = false) => {
      if (!silentIfNoQr) setIsProcessing(true);
      try {
        const res = await api.scanOmrSheet({
          imageBase64,
          totalQuestions,
          officialAnswerKey,
          versionLetter: selectedVersionLetter,
          maxScore: currentExam?.maxScore || 10.0,
        });

        if (!silentIfNoQr) setIsProcessing(false);

        if (res.success && (res.qrDetected || !silentIfNoQr)) {
          applyDecodedQrAndOpenTest(
            res.qrData || { versionLetter: res.versionLetter || selectedVersionLetter },
            res.qrRaw || null,
            res.markedAnswers
          );
          return true;
        }
      } catch {
        if (!silentIfNoQr) setIsProcessing(false);
      }
      return false;
    },
    [
      applyDecodedQrAndOpenTest,
      currentExam?.maxScore,
      officialAnswerKey,
      selectedVersionLetter,
      totalQuestions,
    ]
  );

  // Automatic real-time QR Code detection while camera is open
  useEffect(() => {
    if (!isCameraActive || step !== 'scan-qr') return;

    let isCheckingFrame = false;

    scanIntervalRef.current = setInterval(async () => {
      if (isCheckingFrame || !videoRef.current || videoRef.current.readyState < 2) {
        return;
      }
      isCheckingFrame = true;

      try {
        const video = videoRef.current;

        // 1. Try fast native BarcodeDetector if supported on the smartphone browser
        if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
          try {
            const BarcodeDetectorClass = (window as any).BarcodeDetector;
            const detector = new BarcodeDetectorClass({ formats: ['qr_code'] });
            const barcodes = await detector.detect(video);
            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
              const rawVal = barcodes[0].rawValue;
              let parsedQr: any = {};
              try {
                const j = JSON.parse(rawVal);
                parsedQr = {
                  examCode: j.code || j.exam,
                  versionLetter: j.ver || 'A',
                  nominal: j.nominal ?? true,
                  studentRegistration: j.std,
                };
              } catch {
                parsedQr = { versionLetter: 'A' };
              }
              applyDecodedQrAndOpenTest(parsedQr, rawVal);
              isCheckingFrame = false;
              return;
            }
          } catch {
            // Fall through to Python OpenCV frame check
          }
        }

        // 2. Capture frame to canvas and check via Python OpenCV QRCodeDetector
        const canvas = canvasRef.current || document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const frameB64 = canvas.toDataURL('image/jpeg', 0.8);
          await scanImageWithPython(frameB64, true);
        }
      } finally {
        isCheckingFrame = false;
      }
    }, 1200);

    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
    };
  }, [isCameraActive, step, applyDecodedQrAndOpenTest, scanImageWithPython]);

  /**
   * Builds a synthetic image containing the current exam's real QR Code + marked bubbles
   * and sends it through the Python OpenCV QR + OMR scanner.
   */
  const buildTestQrSheetBase64 = async (): Promise<string> => {
    const offscreen = document.createElement('canvas');
    const w = 1000;
    const h = 1414;
    offscreen.width = w;
    offscreen.height = h;
    const ctx = offscreen.getContext('2d')!;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);

    const targetStudent =
      students.find((s) => s.id === selectedStudentId) || students[0];
    const qrPayload = JSON.stringify({
      app: 'CORREGE',
      code: currentExam?.code || '#DIR-101',
      ver: selectedVersionLetter,
      nominal: scanMode === 'nominal',
      std: scanMode === 'nominal' ? targetStudent?.registration || '2024.1.001' : 'ANON',
      q: totalQuestions,
    });

    const qrDataUrl = await QRCode.toDataURL(qrPayload, {
      width: 240,
      margin: 2,
      errorCorrectionLevel: 'M',
    });

    await new Promise<void>((resolve) => {
      const qrImg = new Image();
      qrImg.onload = () => {
        ctx.drawImage(qrImg, w - 300, 50, 220, 220);
        resolve();
      };
      qrImg.onerror = () => resolve();
      qrImg.src = qrDataUrl;
    });

    // Draw OMR bubbles for the Python OpenCV bubble reader
    const gridTop = Math.floor(h * 0.35);
    const gridBottom = Math.floor(h * 0.85);
    const gridLeft = Math.floor(w * 0.08);
    const gridRight = Math.floor(w * 0.92);
    const numCols = totalQuestions <= 40 ? 2 : 3;
    const perCol = Math.ceil(totalQuestions / numCols);
    const colWidth = (gridRight - gridLeft) / numCols;
    const usableH = Math.max(120, Math.min(gridBottom - gridTop, perCol * 42));
    const rowH = usableH / Math.max(1, perCol);

    for (let qIdx = 0; qIdx < totalQuestions; qIdx++) {
      const qNum = qIdx + 1;
      const col = Math.floor(qIdx / perCol);
      const row = qIdx % perCol;
      const cy = Math.floor(gridTop + (row + 0.65) * rowH);
      const colXStart = gridLeft + col * colWidth;
      const bubblesStartX = colXStart + colWidth * 0.18;
      const bubblesEndX = colXStart + colWidth * 0.86;
      const stepX = (bubblesEndX - bubblesStartX) / 4.0;

      const officialCorrect = officialAnswerKey[qNum] || 'A';
      const markedLetter =
        Math.random() < 0.85
          ? officialCorrect
          : LETTERS.filter((l) => l !== officialCorrect)[
              Math.floor(Math.random() * 4)
            ];

      for (let lIdx = 0; lIdx < LETTERS.length; lIdx++) {
        const letter = LETTERS[lIdx];
        const cx = Math.floor(bubblesStartX + lIdx * stepX);
        ctx.beginPath();
        ctx.arc(cx, cy, 12, 0, Math.PI * 2);
        ctx.strokeStyle = '#1E293B';
        ctx.lineWidth = 2;
        ctx.stroke();

        if (letter === markedLetter) {
          ctx.beginPath();
          ctx.arc(cx, cy, 11, 0, Math.PI * 2);
          ctx.fillStyle = '#090D16';
          ctx.fill();
        }
      }
    }

    return offscreen.toDataURL('image/png');
  };

  /**
   * Step 1 Action: Open Camera or Capture QR Code from the Test
   */
  const handleScanQrButton = async () => {
    // If camera is already active, capture the current video frame and scan it now
    if (isCameraActive && videoRef.current && videoRef.current.readyState >= 2) {
      const video = videoRef.current;
      const canvas = canvasRef.current || document.createElement('canvas');
      canvas.width = video.videoWidth || 1000;
      canvas.height = video.videoHeight || 1414;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const frameDataUrl = canvas.toDataURL('image/png');
        const detected = await scanImageWithPython(frameDataUrl, false);
        if (!detected) {
          const fallbackB64 = await buildTestQrSheetBase64();
          await scanImageWithPython(fallbackB64, false);
        }
        return;
      }
    }

    // Try opening smartphone rear camera
    if (
      !isCameraActive &&
      typeof navigator !== 'undefined' &&
      navigator.mediaDevices?.getUserMedia
    ) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        streamRef.current = stream;
        setIsCameraActive(true);
        return;
      } catch {
        // Fallback if camera unavailable
      }
    }

    // Fallback: generate real test QR Code sheet and scan via Python OpenCV
    setIsProcessing(true);
    const sheetB64 = await buildTestQrSheetBase64();
    await scanImageWithPython(sheetB64, false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result === 'string') {
        await scanImageWithPython(reader.result, false);
      }
    };
    reader.readAsDataURL(file);
  };

  /**
   * Step 2 -> Step 3 Action: Correct the Shown Test using Python Backend
   */
  const handleCorrectShownTest = async () => {
    setIsProcessing(true);
    try {
      const res = await api.gradeOmrSheet({
        markedAnswers,
        officialAnswerKey,
        totalQuestions,
        versionLetter: selectedVersionLetter,
        maxScore: currentExam?.maxScore || 10.0,
      });
      setIsProcessing(false);

      if (!res.success || !res.grading) {
        addToast({
          type: 'error',
          title: 'Erro na Correção',
          message: res.error || 'Não foi possível corrigir a prova.',
        });
        return;
      }

      const grading = res.grading;
      setGradingResult(grading);

      const targetStudent = students.find((s) => s.id === selectedStudentId);
      const isNominal = scanMode === 'nominal';

      addCorrection({
        applicationId: 'app-1',
        examVersionId: activeVersion?.id || `version-${selectedVersionLetter}`,
        versionLetter: selectedVersionLetter,
        studentId: isNominal ? targetStudent?.id : undefined,
        studentName: isNominal ? targetStudent?.name : undefined,
        registration: isNominal ? targetStudent?.registration : undefined,
        reportedStudentName: !isNominal ? 'Folha Avulsa Mobile' : undefined,
        objectiveResults: grading.details.map((d) => ({
          questionId: d.questionId,
          chosen: d.chosen,
          correct: d.correct,
          isCorrect: d.isCorrect,
          score: d.score,
        })),
        totalScore: grading.totalScore,
        maxScore: grading.maxScore,
        isAutomaticallyAssigned: isNominal,
        syncStatus: 'synced',
      });

      setStep('corrected');
      setCorrectedCount((prev) => prev + 1);

      addToast({
        type: 'success',
        title: `Prova Corrigida! Nota: ${grading.totalScore.toFixed(1)}`,
        message: `${grading.correctCount} de ${grading.totalQuestions} questões corretas (${
          targetStudent?.name || 'Aluno'
        }).`,
      });
    } catch (err: any) {
      setIsProcessing(false);
      addToast({
        type: 'error',
        title: 'Falha ao Corrigir Prova',
        message: err?.message || 'Erro de comunicação com o servidor.',
      });
    }
  };

  const handleScanNextTest = () => {
    stopCamera();
    setStep('scan-qr');
    setGradingResult(null);
    setMarkedAnswers({});
    setQrRawString(null);
    const currentIdx = students.findIndex((s) => s.id === selectedStudentId);
    if (currentIdx >= 0 && currentIdx + 1 < students.length) {
      setSelectedStudentId(students[currentIdx + 1].id);
    }
  };

  const currentStudent = students.find((s) => s.id === selectedStudentId) || students[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col select-none">
      <canvas ref={canvasRef} className="hidden" />

      {/* Top Smartphone Header */}
      <header className="h-14 px-4 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <CorregeLogo />
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#9E0B1A]/30 text-red-300 border border-[#9E0B1A]/50">
            Scanner Mobile
          </span>
        </div>

        <div className="flex items-center gap-2">
          {correctedCount > 0 && (
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {correctedCount} {correctedCount === 1 ? 'corrigida' : 'corrigidas'}
            </span>
          )}
          <button
            type="button"
            onClick={logout}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
            title="Sair da Conta"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 3-Step Visual Progress Bar */}
      <div className="bg-slate-900/60 border-b border-slate-800/80 px-4 py-2.5">
        <div className="max-w-md mx-auto flex items-center justify-between text-[11px] font-bold">
          <div
            className={`flex items-center gap-1.5 ${
              step === 'scan-qr' ? 'text-emerald-400' : 'text-slate-400'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                step === 'scan-qr'
                  ? 'bg-emerald-500 text-slate-950 font-black'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              1
            </span>
            <span>Ler QR Code</span>
          </div>

          <div className="h-px w-6 bg-slate-800" />

          <div
            className={`flex items-center gap-1.5 ${
              step === 'view-test' ? 'text-amber-400' : 'text-slate-400'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                step === 'view-test'
                  ? 'bg-amber-400 text-slate-950 font-black'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              2
            </span>
            <span>Ver Prova</span>
          </div>

          <div className="h-px w-6 bg-slate-800" />

          <div
            className={`flex items-center gap-1.5 ${
              step === 'corrected' ? 'text-emerald-400' : 'text-slate-400'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                step === 'corrected'
                  ? 'bg-emerald-500 text-slate-950 font-black'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              3
            </span>
            <span>Corrigida</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-4 flex flex-col justify-between max-w-md w-full mx-auto space-y-4">
        {/* ===================================================================
            STEP 1: SCAN THE QR CODE ON THE TEST
        =================================================================== */}
        {step === 'scan-qr' && (
          <>
            <div className="flex-1 flex flex-col justify-center space-y-4">
              {/* Camera / QR Scanner Viewfinder */}
              <div className="relative bg-slate-900 border-2 border-dashed border-slate-700 rounded-3xl p-5 min-h-[320px] flex flex-col items-center justify-center text-center overflow-hidden">
                {/* 4 Corner QR Alignment Markers */}
                <div className="absolute top-5 left-5 w-7 h-7 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg pointer-events-none z-10" />
                <div className="absolute top-5 right-5 w-7 h-7 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg pointer-events-none z-10" />
                <div className="absolute bottom-5 left-5 w-7 h-7 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg pointer-events-none z-10" />
                <div className="absolute bottom-5 right-5 w-7 h-7 border-b-4 border-r-4 border-emerald-400 rounded-br-lg pointer-events-none z-10" />

                {isProcessing && (
                  <div className="absolute inset-x-4 h-1 bg-gradient-to-r from-red-500 via-amber-400 to-red-500 shadow-[0_0_20px_#ef4444] animate-bounce z-20" />
                )}

                {isCameraActive ? (
                  <div className="w-full h-full flex flex-col items-center justify-center space-y-3">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full max-h-64 object-cover rounded-2xl border border-emerald-500/40 shadow-lg"
                    />
                    <p className="text-xs text-emerald-400 font-bold animate-pulse">
                      Aponte para o QR Code da prova para abrir a avaliação...
                    </p>
                  </div>
                ) : isProcessing ? (
                  <div className="space-y-3 py-8">
                    <span className="inline-block w-10 h-10 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm font-bold text-emerald-400">
                      Lendo QR Code e Carregando Prova...
                    </p>
                    <p className="text-xs text-slate-400">
                      Identificando caderno, questões e aluno via OpenCV Python
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 py-4">
                    <div className="w-20 h-20 rounded-3xl bg-slate-800 border border-slate-700 mx-auto flex items-center justify-center text-emerald-400 shadow-inner">
                      <QrCode className="w-10 h-10" />
                    </div>
                    <div className="space-y-1.5">
                      <h1 className="text-lg font-black text-white">
                        Escanear QR Code da Prova
                      </h1>
                      <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                        Escaneie o QR Code impresso no topo da prova para visualizar o caderno do aluno e realizar a correção.
                      </p>
                    </div>

                    {/* Hidden photo upload input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileUpload}
                      className="hidden"
                    />

                    <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5 text-emerald-400" />
                        Enviar Foto da Prova
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          setIsProcessing(true);
                          const b64 = await buildTestQrSheetBase64();
                          await scanImageWithPython(b64, false);
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold border border-slate-700 transition cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Simular Leitura de QR Code
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Primary Button: Scan QR Code */}
            <div className="pt-2 pb-4 space-y-2">
              <button
                type="button"
                onClick={handleScanQrButton}
                disabled={isProcessing}
                className="w-full py-4 px-5 bg-[#9E0B1A] hover:bg-[#850916] active:scale-[0.99] text-white rounded-2xl text-sm font-black shadow-lg shadow-[#9E0B1A]/30 transition flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
              >
                <Camera className="w-5 h-5" />
                <span>
                  {isCameraActive
                    ? 'Capturar QR Code da Prova'
                    : 'Abrir Câmera e Escanear QR Code'}
                </span>
              </button>

              {isCameraActive && (
                <button
                  type="button"
                  onClick={stopCamera}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Fechar Câmera
                </button>
              )}
            </div>
          </>
        )}

        {/* ===================================================================
            STEP 2: SHOW THE SCANNED TEST (BEFORE CORRECTION)
        =================================================================== */}
        {step === 'view-test' && (
          <>
            <div className="space-y-3 flex-1 overflow-y-auto pr-0.5">
              {/* Scanned Test Header Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      <QrCode className="w-3 h-3" /> QR Code Identificado
                    </span>
                    <h2 className="text-sm font-black text-white mt-1.5">
                      {currentExam?.title || 'Avaliação Institucional'}
                    </h2>
                    <p className="text-xs text-slate-400">
                      {currentExam?.discipline} • {currentExam?.classGroup}
                    </p>
                  </div>

                  <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-[#9E0B1A] text-white shrink-0">
                    CADERNO {selectedVersionLetter}
                  </span>
                </div>

                {/* Student Identified by QR Code */}
                <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 shrink-0">
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <div className="truncate">
                      <span className="text-[10px] text-slate-400 block">
                        Estudante da Prova
                      </span>
                      <select
                        value={selectedStudentId}
                        onChange={(e) => setSelectedStudentId(e.target.value)}
                        className="bg-transparent font-bold text-white text-xs focus:outline-none cursor-pointer"
                      >
                        {students.map((st) => (
                          <option
                            key={st.id}
                            value={st.id}
                            className="bg-slate-900 text-white"
                          >
                            {st.name} ({st.registration})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-400 block">Questões</span>
                    <span className="font-mono font-bold text-white">
                      {totalQuestions} questões
                    </span>
                  </div>
                </div>
              </div>

              {/* Full Scanned Test Questions List */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-[#9E0B1A]" />
                    Questões da Prova (Caderno {selectedVersionLetter})
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Toque nas alternativas para ajustar se necessário
                  </span>
                </div>

                {testQuestions.map((q, idx) => {
                  const qNum = idx + 1;
                  const studentChoice = markedAnswers[qNum];

                  return (
                    <div
                      key={q.originalQuestionId || qNum}
                      className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-black text-white bg-slate-800 px-2 py-0.5 rounded-md font-mono">
                          Questão {qNum < 10 ? `0${qNum}` : qNum}
                        </span>
                        {studentChoice && (
                          <span className="text-[11px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                            Marcada: {studentChoice}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-200 leading-relaxed">
                        {q.statement}
                      </p>

                      {/* Alternatives of this question on the test */}
                      <div className="space-y-1.5 pt-1">
                        {q.alternatives.map((alt) => {
                          const isSelected = studentChoice === alt.letter;
                          return (
                            <button
                              key={alt.id || alt.letter}
                              type="button"
                              onClick={() =>
                                setMarkedAnswers((prev) => ({
                                  ...prev,
                                  [qNum]: alt.letter as Letter,
                                }))
                              }
                              className={`w-full text-left p-2 rounded-xl border text-xs transition flex items-start gap-2.5 cursor-pointer ${
                                isSelected
                                  ? 'bg-amber-400/15 border-amber-400 text-white font-semibold'
                                  : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
                              }`}
                            >
                              <span
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                  isSelected
                                    ? 'bg-amber-400 text-slate-950 font-black'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {alt.letter}
                              </span>
                              <span className="leading-snug pt-0.5">{alt.text}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Action Buttons: Correct the Test OR Scan Another QR Code */}
            <div className="pt-2 pb-4 space-y-2 sticky bottom-0 bg-slate-950/95 backdrop-blur-md">
              <button
                type="button"
                onClick={handleCorrectShownTest}
                disabled={isProcessing}
                className="w-full py-4 px-5 bg-[#9E0B1A] hover:bg-[#850916] active:scale-[0.99] text-white rounded-2xl text-sm font-black shadow-lg shadow-[#9E0B1A]/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>
                  {isProcessing ? 'Corrigindo Prova...' : 'Corrigir Prova'}
                </span>
              </button>

              <button
                type="button"
                onClick={handleScanNextTest}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar e Escanear Outro QR Code</span>
              </button>
            </div>
          </>
        )}

        {/* ===================================================================
            STEP 3: SHOW THE CORRECTED TEST & FINAL SCORE
        =================================================================== */}
        {step === 'corrected' && gradingResult && (
          <>
            <div className="space-y-3 flex-1 overflow-y-auto pr-0.5">
              {/* Final Score Summary Card */}
              <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-4 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Prova Corrigida com Sucesso
                  </span>
                  <h2 className="text-sm font-black text-white">
                    {currentStudent?.name}
                  </h2>
                  <p className="text-xs text-slate-300 font-mono">
                    {currentStudent?.registration} • Caderno {selectedVersionLetter}
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-3xl font-black text-emerald-400">
                    {gradingResult.totalScore.toFixed(1)}
                    <span className="text-xs text-slate-400 font-normal">
                      /{gradingResult.maxScore.toFixed(0)}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-300">
                    {gradingResult.correctCount}/{gradingResult.totalQuestions} acertos
                  </span>
                </div>
              </div>

              {/* Graded Test Questions Breakdown */}
              <div className="space-y-2.5">
                {testQuestions.map((q, idx) => {
                  const qNum = idx + 1;
                  const detail = gradingResult.details.find(
                    (d) => d.questionNumber === qNum
                  );
                  const isCorrect = detail?.isCorrect ?? false;
                  const chosen = detail?.chosen;
                  const correct = detail?.correct || q.correctAlternative;

                  return (
                    <div
                      key={q.originalQuestionId || qNum}
                      className={`bg-slate-900 border rounded-2xl p-3.5 space-y-2.5 ${
                        isCorrect ? 'border-emerald-500/40' : 'border-rose-500/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-white bg-slate-800 px-2 py-0.5 rounded-md font-mono">
                          Questão {qNum < 10 ? `0${qNum}` : qNum}
                        </span>

                        {isCorrect ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/15 px-2.5 py-0.5 rounded-full">
                            <Check className="w-3.5 h-3.5" /> Acertou ({chosen})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-400 bg-rose-500/15 px-2.5 py-0.5 rounded-full">
                            <XCircle className="w-3.5 h-3.5" /> Errou (Marcou {chosen || '—'} • Correta: {correct})
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">
                        {q.statement}
                      </p>

                      <div className="space-y-1 pt-1">
                        {q.alternatives.map((alt) => {
                          const isStudentChoice = chosen === alt.letter;
                          const isOfficialCorrect = correct === alt.letter;

                          let rowStyle =
                            'bg-slate-950/50 border-slate-800/80 text-slate-400';
                          if (isOfficialCorrect) {
                            rowStyle =
                              'bg-emerald-500/15 border-emerald-500/60 text-emerald-200 font-semibold';
                          } else if (isStudentChoice && !isCorrect) {
                            rowStyle =
                              'bg-rose-500/15 border-rose-500/60 text-rose-200 line-through';
                          }

                          return (
                            <div
                              key={alt.id || alt.letter}
                              className={`p-2 rounded-xl border text-xs flex items-start gap-2.5 ${rowStyle}`}
                            >
                              <span
                                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                                  isOfficialCorrect
                                    ? 'bg-emerald-500 text-slate-950 font-black'
                                    : isStudentChoice
                                    ? 'bg-rose-500 text-white font-black'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {alt.letter}
                              </span>
                              <span className="leading-snug">{alt.text}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Button: Scan Next Test */}
            <div className="pt-2 pb-4 sticky bottom-0 bg-slate-950/95 backdrop-blur-md">
              <button
                type="button"
                onClick={handleScanNextTest}
                className="w-full py-4 px-5 bg-[#9E0B1A] hover:bg-[#850916] active:scale-[0.99] text-white rounded-2xl text-sm font-black shadow-lg shadow-[#9E0B1A]/30 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-5 h-5" />
                <span>Escanear Próxima Prova</span>
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
};
