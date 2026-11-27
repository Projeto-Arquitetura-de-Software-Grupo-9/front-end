'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { api, mapBackendExam } from '@/lib/api';
import {
  X,
  Camera,
  Upload,
  AlertTriangle,
  RotateCcw,
  TrendingUp,
  Check,
  ShieldCheck,
  Edit3,
  CheckCheck,
  Save,
  PenTool,
  Eye,
  ScanLine,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { ParsedQrData, LETTERS, Letter } from '@/lib/qrCode';
import { Exam } from '@/lib/types';
import {
  decodeQrFromCanvas,
  analyzeAnswerSheetCanvas,
  renderOmrVerificationDataUrl,
  OmrAnalysisResult,
} from '@/lib/omrEngine';
import {
  validateCorregeQrRaw,
  resolveExamStrictly,
  resolveVersionAndKeyStrictly,
  resolveStudentFromQr,
  gradeExamDeterministically,
  ResolvedExamQuestionMeta,
} from '@/lib/omrScannerFlow';

function playScanChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);
  } catch {
    // Ignore audio restrictions
  }
}

interface PendingIdentifiedExam {
  exam: Exam;
  qr: ParsedQrData;
  versionLetter: string;
  examVersionId: string;
  answerKey: Record<number, Letter>;
  questionLetters: Record<number, Letter[]>;
  objectiveQuestions: ResolvedExamQuestionMeta[];
  discursiveQuestions: ResolvedExamQuestionMeta[];
  maxScore: number;
}

export const ScannerModal: React.FC = () => {
  const {
    isScannerModalOpen,
    setIsScannerModalOpen,
    exams,
    setActiveExamId,
    students,
    questions: globalQuestions,
    navigateToResults,
    addToast,
    addCorrection,
  } = useApp();

  const [step, setStep] = useState<'captura' | 'validacao' | 'concluido'>('captura');
  const [captureMode, setCaptureMode] = useState<'camera' | 'upload'>('camera');

  // Strictly resolved exam & version (NEVER falls back to selectedExam or exams[0])
  const [identified, setIdentified] = useState<PendingIdentifiedExam | null>(null);
  const [omrAnalysis, setOmrAnalysis] = useState<OmrAnalysisResult | null>(null);
  const [verificationPreviewUrl, setVerificationPreviewUrl] = useState<string | null>(null);
  const [showOverlayPreview, setShowOverlayPreview] = useState<boolean>(true);

  // Student Identification
  const [isNominal, setIsNominal] = useState<boolean>(false);
  const [studentId, setStudentId] = useState<string>('');
  const [studentName, setStudentName] = useState<string>('');
  const [studentRegistration, setStudentRegistration] = useState<string>('');

  // Camera & Processing state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isBusyRef = useRef<boolean>(false);

  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanInfo, setScanInfo] = useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState<boolean>(false);
  const [needsSheetRetry, setNeedsSheetRetry] = useState<boolean>(false);

  // Real OMR readings (null = em branco / rasura — NEVER guessed)
  const [markedAnswers, setMarkedAnswers] = useState<Record<number, Letter | null>>({});
  const [ambiguousQuestions, setAmbiguousQuestions] = useState<number[]>([]);
  const [discursiveScores, setDiscursiveScores] = useState<Record<string, number>>({});

  // Save state
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedResult, setSavedResult] = useState<{
    examId: string;
    examTitle: string;
    studentName: string;
    registration: string;
    versionLetter: string;
    totalScore: number;
    maxScore: number;
    objectiveScore: number;
    discursiveScore: number;
    correctCount: number;
    blankCount: number;
    ambiguousCount: number;
    totalObjective: number;
    percentage: number;
    answersList: Array<{
      qNum: number;
      chosen: Letter | null;
      correct: Letter;
      isCorrect: boolean;
    }>;
  } | null>(null);

  const stopCamera = useCallback(() => {
    if (scanTimerRef.current) {
      clearTimeout(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Navegador não suporta acesso direto à câmera.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (err: any) {
      setIsCameraActive(false);
      setCameraError(
        err?.name === 'NotAllowedError'
          ? 'Permissão de acesso à câmera negada. Utilize o Upload de Foto ou libere a permissão no navegador.'
          : `Não foi possível inicializar a câmera: ${err?.message || 'Dispositivo não encontrado'}.`
      );
    }
  }, []);

  const fetchBackendExamLayout = useCallback(async (examId: string, versionLetter: string) => {
    const dto = await api.getExamLayout(examId, versionLetter).catch(() => null);
    if (!dto) return null;
    const flatQuestions = (dto.pages || []).flatMap((p) => p.questions || []);
    return {
      answerKey: dto.answerKey as Record<string, string> | undefined,
      questionsLayout: flatQuestions.map((q) => ({
        orderIndex: q.orderIndex,
        questionId: q.questionId,
        statement: q.statement,
        alternatives: q.alternatives,
        correctAlternative: q.correctAlternative,
      })),
    };
  }, []);

  const applyStudentMetadata = useCallback(
    (qr: ParsedQrData) => {
      if (qr.nominal) {
        setIsNominal(true);
        const matched = resolveStudentFromQr(qr, students);
        if (matched) {
          setStudentId(matched.id);
          setStudentName(matched.name);
          setStudentRegistration(matched.registration);
        } else {
          setStudentId(qr.studentId || '');
          setStudentName(qr.studentName || '');
          setStudentRegistration(qr.studentRegistration || '');
        }
      } else {
        setIsNominal(false);
        setStudentId('');
        setStudentName('');
        setStudentRegistration('');
      }
    },
    [students]
  );

  /**
   * Core strict optical pipeline for ANY captured frame (live camera or uploaded photo).
   * 1. Decodes QR code (unless an exam was already locked in for a retry of the bubble grid).
   * 2. Validates Correge format & resolves exam strictly from local/backend DB (NO fallback exam!).
   * 3. Resolves official Caderno answer key strictly (NO synthetic keys / NO 'A' defaults!).
   * 4. Runs real pure-TS OMR computer vision on the bubble grid (NO guessed answers!).
   */
  const processCapturedCanvas = useCallback(
    async (
      sourceCanvas: HTMLCanvasElement,
      mode: 'live-auto' | 'explicit-capture'
    ): Promise<boolean> => {
      if (isBusyRef.current) return false;
      isBusyRef.current = true;
      if (mode === 'explicit-capture') {
        setIsProcessingImage(true);
        setScanError(null);
        setScanInfo(null);
      }

      try {
        // Step 1: Decode QR Code from image
        const decodedQr = await decodeQrFromCanvas(sourceCanvas);

        let activeIdentified = identified;
        let qrLocation = decodedQr?.location || null;
        const rotationQuarterTurns: 0 | 1 | 2 | 3 = decodedQr?.rotationQuarterTurns ?? 0;

        if (decodedQr) {
          // Validate Correge QR structure
          const qrValidation = validateCorregeQrRaw(decodedQr.raw);
          if (!qrValidation.ok || !qrValidation.parsed) {
            setScanError(qrValidation.error || 'QR Code inválido.');
            setScanInfo(null);
            setNeedsSheetRetry(false);
            return false;
          }

          // Strictly resolve exam (local + remote DB refresh; NEVER falls back to another exam)
          const examRes = await resolveExamStrictly(
            qrValidation.parsed,
            exams,
            async () => (await api.getExams()).map(mapBackendExam)
          );
          if (!examRes.ok || !examRes.exam) {
            setIdentified(null);
            setScanError(examRes.error || 'Prova não encontrada no sistema.');
            setScanInfo(null);
            setNeedsSheetRetry(false);
            return false;
          }

          // Strictly resolve Caderno version & official answer key
          const keyRes = await resolveVersionAndKeyStrictly(
            examRes.exam,
            qrValidation.parsed.versionLetter,
            globalQuestions,
            fetchBackendExamLayout
          );
          if (
            !keyRes.ok ||
            !keyRes.answerKey ||
            !keyRes.objectiveQuestions ||
            !keyRes.questionLetters
          ) {
            setIdentified(null);
            setScanError(keyRes.error || 'Gabarito oficial não encontrado para este caderno.');
            setScanInfo(null);
            setNeedsSheetRetry(false);
            return false;
          }

          activeIdentified = {
            exam: examRes.exam,
            qr: qrValidation.parsed,
            versionLetter: keyRes.versionLetter!,
            examVersionId: keyRes.examVersionId!,
            answerKey: keyRes.answerKey,
            questionLetters: keyRes.questionLetters,
            objectiveQuestions: keyRes.objectiveQuestions,
            discursiveQuestions: keyRes.discursiveQuestions || [],
            maxScore: keyRes.maxScore || examRes.exam.maxScore || 10,
          };

          setIdentified(activeIdentified);
          setActiveExamId(examRes.exam.id);
          applyStudentMetadata(qrValidation.parsed);
          setScanError(null);
        } else if (!activeIdentified) {
          // No QR found in frame AND no previously identified exam
          if (mode === 'explicit-capture') {
            setScanError(
              'Nenhum QR Code de prova foi detectado na imagem. Centralize o QR Code oficial do Correge e tente novamente.'
            );
            setNeedsSheetRetry(false);
          }
          return false;
        }

        // Step 2: Run REAL client-side OMR bubble detection on the captured image
        const { analysis, orientedCanvas } = analyzeAnswerSheetCanvas(sourceCanvas, {
          totalQuestions: activeIdentified.objectiveQuestions.length,
          questionLetters: activeIdentified.questionLetters,
          qrLocation,
          rotationQuarterTurns,
        });

        if (!analysis.sheetDetected) {
          const examTag = `${activeIdentified.exam.title} (Caderno ${activeIdentified.versionLetter})`;
          if (mode === 'live-auto') {
            setScanInfo(
              `Prova identificada: ${examTag}. Enquadre toda a grade de bolhas do cartão-resposta para leitura automática do gabarito.`
            );
            setNeedsSheetRetry(true);
          } else {
            setScanInfo(`Prova identificada: ${examTag}.`);
            setScanError(
              analysis.error ||
                'Não foi possível detectar a grade de bolhas do cartão-resposta. Enquadre a folha inteira com boa iluminação e tente novamente.'
            );
            setNeedsSheetRetry(true);
          }
          return false;
        }

        // Success: BOTH exam (via QR) AND answer bubbles (via OMR) were genuinely read!
        stopCamera();
        playScanChime();

        setOmrAnalysis(analysis);
        setMarkedAnswers(analysis.markedAnswers);
        setAmbiguousQuestions(analysis.ambiguousQuestions);
        setDiscursiveScores({});
        setVerificationPreviewUrl(renderOmrVerificationDataUrl(orientedCanvas, analysis));
        setScanError(null);
        setScanInfo(null);
        setNeedsSheetRetry(false);
        setStep('validacao');

        addToast({
          type: analysis.ambiguousQuestions.length > 0 ? 'warning' : 'success',
          title: `Gabarito Lido: Caderno ${activeIdentified.versionLetter}`,
          message:
            analysis.ambiguousQuestions.length > 0
              ? `${activeIdentified.exam.title} • ${analysis.ambiguousQuestions.length} questão(ões) com possível rasura/dupla marcação para conferência.`
              : `${activeIdentified.exam.title} • Confiança óptica média de ${Math.round(
                  analysis.overallConfidence * 100
                )}%.`,
        });

        return true;
      } finally {
        isBusyRef.current = false;
        if (mode === 'explicit-capture') {
          setIsProcessingImage(false);
        }
      }
    },
    [
      identified,
      exams,
      globalQuestions,
      fetchBackendExamLayout,
      setActiveExamId,
      applyStudentMetadata,
      stopCamera,
      addToast,
    ]
  );

  // Throttled live camera scan loop (runs every 380ms without blocking UI)
  const scheduleLiveScan = useCallback(() => {
    if (step !== 'captura' || captureMode !== 'camera' || !isCameraActive) return;

    scanTimerRef.current = setTimeout(async () => {
      if (step !== 'captura' || captureMode !== 'camera') return;
      const video = videoRef.current;
      if (video && video.readyState >= video.HAVE_CURRENT_DATA && video.videoWidth > 0) {
        let canvas = canvasRef.current;
        if (!canvas) {
          canvas = document.createElement('canvas');
          canvasRef.current = canvas;
        }
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const done = await processCapturedCanvas(canvas, 'live-auto');
          if (done) return;
        }
      }
      scheduleLiveScan();
    }, 380);
  }, [step, captureMode, isCameraActive, processCapturedCanvas]);

  useEffect(() => {
    if (isScannerModalOpen && captureMode === 'camera' && step === 'captura') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isScannerModalOpen, captureMode, step, startCamera, stopCamera]);

  useEffect(() => {
    if (isCameraActive && step === 'captura' && captureMode === 'camera') {
      scheduleLiveScan();
    }
    return () => {
      if (scanTimerRef.current) {
        clearTimeout(scanTimerRef.current);
        scanTimerRef.current = null;
      }
    };
  }, [isCameraActive, step, captureMode, scheduleLiveScan]);

  // Explicit camera snap button -> captures REAL video frame and validates strictly
  const handleManualCameraCapture = async () => {
    const video = videoRef.current;
    if (!video || !isCameraActive || video.videoWidth === 0) {
      setScanError('A câmera ainda não está pronta. Aguarde a imagem aparecer ou use Upload de Foto.');
      return;
    }

    let canvas = canvasRef.current;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvasRef.current = canvas;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      setScanError('Não foi possível capturar o quadro da câmera.');
      return;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    await processCapturedCanvas(canvas, 'explicit-capture');
  };

  // Uploaded photo -> runs the exact same strict QR + OMR pipeline
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanError(null);
    setScanInfo(null);
    setIsProcessingImage(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      if (typeof dataUrl !== 'string') {
        setIsProcessingImage(false);
        setScanError('Não foi possível ler o arquivo de imagem selecionado.');
        return;
      }

      const img = new Image();
      img.onload = async () => {
        let canvas = canvasRef.current;
        if (!canvas) {
          canvas = document.createElement('canvas');
          canvasRef.current = canvas;
        }
        const maxDim = 1600;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          setIsProcessingImage(false);
          setScanError('Falha ao inicializar o leitor de imagem.');
          return;
        }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        await processCapturedCanvas(canvas, 'explicit-capture');
      };
      img.onerror = () => {
        setIsProcessingImage(false);
        setScanError('Arquivo de imagem corrompido ou formato não suportado.');
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Explicit manual entry fallback ONLY AFTER a real exam was verified by QR (starts 100% blank, ZERO guesses!)
  const handleProceedBlankManualReview = () => {
    if (!identified) return;
    stopCamera();
    const blankAnswers: Record<number, Letter | null> = {};
    identified.objectiveQuestions.forEach((q) => {
      blankAnswers[q.questionNumber] = null;
    });
    setOmrAnalysis(null);
    setVerificationPreviewUrl(null);
    setMarkedAnswers(blankAnswers);
    setAmbiguousQuestions([]);
    setDiscursiveScores({});
    setScanError(null);
    setStep('validacao');
  };

  // Deterministic live grading during validation step
  const liveGrade = useMemo(() => {
    if (!identified) return null;
    return gradeExamDeterministically({
      objectiveQuestions: identified.objectiveQuestions,
      discursiveQuestions: identified.discursiveQuestions,
      markedAnswers,
      ambiguousQuestions,
      discursiveScores,
      maxScore: identified.maxScore,
    });
  }, [identified, markedAnswers, ambiguousQuestions, discursiveScores]);

  const handleSaveCorrection = async () => {
    if (!identified || !liveGrade) return;
    setIsSaving(true);

    try {
      const matchedStudent = studentId
        ? students.find((s) => s.id === studentId)
        : undefined;

      const finalStudentId = matchedStudent?.id || (isNominal && studentId ? studentId : undefined);
      const finalStudentName =
        matchedStudent?.name || studentName.trim() || (isNominal ? 'Estudante não localizado' : '');
      const finalRegistration =
        matchedStudent?.registration || studentRegistration.trim() || '';

      const respostasLidas: Record<string, string> = {};
      Object.entries(markedAnswers).forEach(([qNum, letter]) => {
        if (letter) {
          respostasLidas[String(qNum)] = letter;
        }
      });
      Object.entries(discursiveScores).forEach(([qId, score]) => {
        respostasLidas[`desc_${qId}`] = String(score);
      });

      let syncedWithBackend = false;
      let savedRemote: any = null;
      try {
        savedRemote = await api.createCorrecao({
          idVersaoProva: identified.examVersionId,
          idProva: identified.exam.id,
          versaoMarcada: identified.versionLetter,
          idAluno: finalStudentId,
          nomeManuscrito: !isNominal && finalStudentName ? finalStudentName : undefined,
          matriculaManuscrita: !isNominal && finalRegistration ? finalRegistration : undefined,
          notaTotal: liveGrade.totalScore,
          respostasLidas,
          atribuicaoAutomatica: Boolean(isNominal && finalStudentId),
        });
        syncedWithBackend = true;
      } catch (backendErr: any) {
        addToast({
          type: 'warning',
          title: 'Salvo localmente (pendente de sincronização)',
          message: backendErr?.message || 'O servidor não respondeu no momento.',
        });
      }

      addCorrection({
        id: savedRemote?.id ? String(savedRemote.id) : undefined,
        confirmedAt: savedRemote?.dataConfirmacao
          ? String(savedRemote.dataConfirmacao)
          : undefined,
        applicationId: identified.exam.id,
        examVersionId: savedRemote?.idVersaoProva
          ? String(savedRemote.idVersaoProva)
          : identified.examVersionId,
        versionLetter: identified.versionLetter,
        studentId: finalStudentId,
        studentName: finalStudentName || undefined,
        registration: finalRegistration || undefined,
        reportedStudentName: !isNominal && finalStudentName ? finalStudentName : undefined,
        reportedStudentRegistration:
          !isNominal && finalRegistration ? finalRegistration : undefined,
        objectiveResults: liveGrade.objectiveResults.map((r) => ({
          questionId: r.questionId,
          chosen: r.chosen,
          correct: r.correct,
          isCorrect: r.isCorrect,
          score: r.score,
        })),
        discursiveScores: liveGrade.discursiveResults.map((d) => ({
          questionId: d.questionId,
          score: d.score,
        })),
        totalScore: liveGrade.totalScore,
        maxScore: liveGrade.maxScore,
        isAutomaticallyAssigned: Boolean(isNominal && finalStudentId),
        syncStatus: syncedWithBackend ? 'synced' : 'pending',
      });

      playScanChime();

      const percentage =
        liveGrade.maxScore > 0
          ? Math.round((liveGrade.totalScore / liveGrade.maxScore) * 100)
          : 0;

      setSavedResult({
        examId: identified.exam.id,
        examTitle: identified.exam.title,
        studentName: finalStudentName || 'Folha Avulsa (Pendente de Identificação)',
        registration: finalRegistration || 'Pendente',
        versionLetter: identified.versionLetter,
        totalScore: liveGrade.totalScore,
        maxScore: liveGrade.maxScore,
        objectiveScore: liveGrade.objectiveScore,
        discursiveScore: liveGrade.discursiveScore,
        correctCount: liveGrade.correctCount,
        blankCount: liveGrade.blankCount,
        ambiguousCount: liveGrade.ambiguousCount,
        totalObjective: liveGrade.totalObjectiveQuestions,
        percentage,
        answersList: liveGrade.objectiveResults.map((r) => ({
          qNum: r.questionNumber,
          chosen: r.chosen,
          correct: r.correct,
          isCorrect: r.isCorrect,
        })),
      });

      setStep('concluido');

      addToast({
        type: 'success',
        title: 'Correção Salva com Sucesso!',
        message: `${finalStudentName || 'Folha Avulsa'} • Caderno ${identified.versionLetter} • Nota ${liveGrade.totalScore.toFixed(
          1
        )} registrada.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Erro ao Salvar Correção',
        message: err?.message || 'Falha ao persistir dados.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const resetScannerState = useCallback(() => {
    setIdentified(null);
    setOmrAnalysis(null);
    setVerificationPreviewUrl(null);
    setMarkedAnswers({});
    setAmbiguousQuestions([]);
    setDiscursiveScores({});
    setSavedResult(null);
    setScanError(null);
    setScanInfo(null);
    setNeedsSheetRetry(false);
    setStudentId('');
    setStudentName('');
    setStudentRegistration('');
    setIsNominal(false);
    setStep('captura');
  }, []);

  const handleClose = () => {
    stopCamera();
    resetScannerState();
    setIsScannerModalOpen(false);
  };

  if (!isScannerModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-5 sm:p-7 space-y-4 my-6 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-50 text-[#9E0B1A] flex items-center justify-center font-bold shadow-2xs">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-900">
                  Leitor Óptico (OMR) & QR Code
                </h2>
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                  Leitura Real de Gabarito
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {step === 'captura' &&
                  'Aponte a câmera ou envie a foto do cartão-resposta com QR Code e grade de bolhas visíveis.'}
                {step === 'validacao' &&
                  'Conferência óptica: revise as bolhas detectadas pelo leitor OMR antes de salvar.'}
                {step === 'concluido' && 'Avaliação concluída e nota registrada no banco de dados.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="space-y-4 overflow-y-auto flex-1 pr-1 text-xs">
          {/* STEP 1: CAPTURA ÓPTICA REAL */}
          {step === 'captura' && (
            <div className="space-y-4">
              {/* Mode Selector: Câmera ao Vivo vs Upload de Foto */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setCaptureMode('camera');
                    setScanError(null);
                  }}
                  className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    captureMode === 'camera'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Câmera ao Vivo</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCaptureMode('upload');
                    setScanError(null);
                  }}
                  className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    captureMode === 'upload'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload de Foto</span>
                </button>
              </div>

              {/* Identified Exam Status Pill (when QR already matched but waiting for full bubble grid) */}
              {scanInfo && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-start justify-between gap-2 text-blue-900">
                  <div className="flex items-start gap-2">
                    <ScanLine className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span className="font-semibold leading-snug">{scanInfo}</span>
                  </div>
                  {identified && (
                    <button
                      type="button"
                      onClick={resetScannerState}
                      className="text-[11px] font-bold text-blue-700 hover:underline shrink-0 cursor-pointer"
                    >
                      Trocar Prova
                    </button>
                  )}
                </div>
              )}

              {/* Strict Error Banner */}
              {scanError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl space-y-2 text-rose-900">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="font-bold block">Leitura não concluída</span>
                      <p className="text-[11px] text-rose-800 leading-relaxed">{scanError}</p>
                    </div>
                  </div>
                  {needsSheetRetry && identified && (
                    <div className="pt-1 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleProceedBlankManualReview}
                        className="px-3 py-1.5 bg-white border border-rose-300 text-rose-800 hover:bg-rose-100 rounded-xl text-[11px] font-bold transition cursor-pointer"
                      >
                        Preencher Manualmente (Iniciar Tudo em Branco)
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Camera Video View */}
              {captureMode === 'camera' && (
                <div className="space-y-3">
                  <div className="relative bg-slate-950 rounded-2xl overflow-hidden aspect-video flex items-center justify-center border border-slate-800">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />

                    {/* Guide Reticle */}
                    <div className="absolute inset-4 border-2 border-dashed border-emerald-400/70 rounded-2xl pointer-events-none flex flex-col items-center justify-between p-2">
                      <div className="text-[11px] font-bold text-emerald-300 bg-slate-950/80 px-3 py-1 rounded-full border border-emerald-500/40">
                        {identified
                          ? `Enquadre toda a grade de bolhas • ${identified.exam.code} (Caderno ${identified.versionLetter})`
                          : 'Enquadre a folha com QR Code e grade de bolhas visíveis'}
                      </div>
                      {isProcessingImage && (
                        <div className="flex items-center gap-2 text-[11px] font-bold text-white bg-slate-950/85 px-3 py-1 rounded-full">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                          <span>Processando QR Code e bolhas OMR...</span>
                        </div>
                      )}
                    </div>

                    {cameraError && (
                      <div className="absolute inset-0 bg-slate-900/92 flex flex-col items-center justify-center p-4 text-center space-y-2 text-rose-300 text-xs">
                        <AlertTriangle className="w-8 h-8 text-rose-500" />
                        <p className="max-w-sm">{cameraError}</p>
                        <button
                          type="button"
                          onClick={() => setCaptureMode('upload')}
                          className="px-3.5 py-1.5 bg-white text-slate-900 font-bold rounded-xl mt-1 cursor-pointer"
                        >
                          Usar Upload de Foto
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={handleManualCameraCapture}
                      disabled={isProcessingImage || !isCameraActive}
                      className="px-5 py-2.5 bg-[#9E0B1A] hover:bg-[#850916] disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-2 cursor-pointer"
                    >
                      {isProcessingImage ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Camera className="w-4 h-4" />
                      )}
                      <span>
                        {isProcessingImage ? 'Lendo Gabarito...' : 'Capturar e Ler Gabarito'}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* File Upload View */}
              {captureMode === 'upload' && (
                <div className="space-y-3">
                  <div
                    onClick={() => !isProcessingImage && fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-[#9E0B1A] bg-slate-50/60 hover:bg-red-50/20 rounded-2xl p-8 text-center cursor-pointer transition space-y-2"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    {isProcessingImage ? (
                      <>
                        <Loader2 className="w-8 h-8 text-[#9E0B1A] mx-auto animate-spin" />
                        <p className="text-xs font-bold text-slate-800">
                          Analisando QR Code e lendo bolhas do gabarito...
                        </p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                        <p className="text-xs font-bold text-slate-700">
                          Clique para selecionar a foto do cartão-resposta
                        </p>
                        <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                          JPG, PNG ou WebP. A imagem deve conter o QR Code oficial do Correge e a
                          grade de bolhas preenchida pelo estudante.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: VALIDAÇÃO ÓPTICA & CONFERÊNCIA PELO PROFESSOR */}
          {step === 'validacao' && identified && liveGrade && (
            <div className="space-y-4 animate-in fade-in">
              {/* Auto-detected metadata card */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Prova Identificada pelo QR Code</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {omrAnalysis && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        OMR {omrAnalysis.rectified ? 'Retificado A4' : 'Direto'} •{' '}
                        {Math.round(omrAnalysis.overallConfidence * 100)}% conf.
                      </span>
                    )}
                    {isNominal ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Check className="w-3 h-3" /> Prova Nominal
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        Folha Avulsa
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-slate-600">
                  <div className="p-2 bg-white rounded-xl border border-slate-200/80">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">
                      Avaliação
                    </span>
                    <span className="font-semibold text-slate-900 truncate block">
                      {identified.exam.title}
                    </span>
                  </div>

                  <div className="p-2 bg-white rounded-xl border border-slate-200/80">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">
                      Disciplina
                    </span>
                    <span className="font-semibold text-slate-900 truncate block">
                      {identified.exam.discipline || '—'}
                    </span>
                  </div>

                  <div className="p-2 bg-white rounded-xl border border-slate-200/80">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">
                      Caderno Lido
                    </span>
                    <span className="font-mono font-bold text-[#9E0B1A] bg-red-50 px-1.5 py-0.5 rounded text-xs inline-block">
                      Caderno {identified.versionLetter}
                    </span>
                  </div>

                  <div className="p-2 bg-white rounded-xl border border-slate-200/80">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">
                      Aluno(a)
                    </span>
                    <span className="font-bold text-slate-900 truncate block">
                      {studentName || 'Não atribuído'}
                    </span>
                  </div>
                </div>

                {/* Non-nominal (avulsa) student linker */}
                {!isNominal && (
                  <div className="pt-2 border-t border-slate-200/60 space-y-2">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-700 whitespace-nowrap">
                        Vincular Estudante:
                      </span>
                      <select
                        value={studentId}
                        onChange={(e) => {
                          const id = e.target.value;
                          setStudentId(id);
                          const matched = students.find((s) => s.id === id);
                          if (matched) {
                            setStudentName(matched.name);
                            setStudentRegistration(matched.registration);
                          } else {
                            setStudentName('');
                            setStudentRegistration('');
                          }
                        }}
                        className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#9E0B1A]"
                      >
                        <option value="">Pendente de atribuição (ou informar manuscrito)</option>
                        {students.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.registration})
                          </option>
                        ))}
                      </select>
                    </div>
                    {!studentId && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={studentName}
                          onChange={(e) => setStudentName(e.target.value)}
                          placeholder="Nome manuscrito na folha (opcional)"
                          className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#9E0B1A]"
                        />
                        <input
                          type="text"
                          value={studentRegistration}
                          onChange={(e) => setStudentRegistration(e.target.value)}
                          placeholder="Matrícula manuscrita (opcional)"
                          className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#9E0B1A]"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Annotated OMR Visual Verification Preview */}
              {verificationPreviewUrl && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-slate-700 text-[11px]">
                      <Eye className="w-3.5 h-3.5 text-emerald-600" />
                      <span>
                        Prévia da Leitura Óptica (Verde = Marcada • Âmbar = Rasura/Dupla)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowOverlayPreview((v) => !v)}
                      className="text-[11px] font-bold text-[#9E0B1A] hover:underline cursor-pointer"
                    >
                      {showOverlayPreview ? 'Ocultar imagem' : 'Mostrar imagem'}
                    </button>
                  </div>
                  {showOverlayPreview && (
                    <div className="max-h-52 overflow-auto rounded-xl border border-slate-200 bg-slate-900 flex justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={verificationPreviewUrl}
                        alt="Prévia da detecção óptica OMR"
                        className="max-h-52 object-contain"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Rasura / Ambiguous Warning Banner */}
              {ambiguousQuestions.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-2 text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-xs">
                      Possível rasura ou dupla marcação detectada
                    </span>
                    <p className="text-[11px] text-amber-800">
                      Questões marcadas em âmbar ({ambiguousQuestions.map((q) => `Q${q}`).join(', ')})
                      foram deixadas sem resposta automática. Confirme ou deixe em branco abaixo.
                    </p>
                  </div>
                </div>
              )}

              {/* Score preview banner */}
              <div className="p-3 bg-red-50/60 border border-red-200/70 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[#9E0B1A]">
                  <Edit3 className="w-4 h-4 flex-shrink-0" />
                  <span className="text-[11px] font-bold">
                    Conferência das alternativas lidas: clique em uma letra para ajustar ou clique
                    novamente na marcada para deixar em branco.
                  </span>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Prévia da Nota
                  </span>
                  <span className="font-mono text-base font-black text-[#9E0B1A]">
                    {liveGrade.totalScore.toFixed(1)} / {liveGrade.maxScore}
                  </span>
                </div>
              </div>

              {/* Objective Questions Validation Grid */}
              <div className="p-3 bg-white border border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2 text-xs font-bold text-slate-700 pb-1 border-b border-slate-100">
                  <span>Questões Objetivas ({identified.objectiveQuestions.length})</span>
                  <span className="text-[11px] font-semibold text-emerald-700">
                    {liveGrade.correctCount} acertos • {liveGrade.wrongCount} erros •{' '}
                    {liveGrade.blankCount + liveGrade.ambiguousCount} em branco/rasura
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 max-h-56 overflow-y-auto pt-1">
                  {identified.objectiveQuestions.map((q) => {
                    const qNum = q.questionNumber;
                    const marked = markedAnswers[qNum] ?? null;
                    const correct = q.correctLetter!;
                    const isAmbiguous = ambiguousQuestions.includes(qNum) && marked === null;
                    const isCorrect = marked !== null && marked === correct;

                    return (
                      <div
                        key={qNum}
                        className={`p-2 rounded-xl border transition text-center space-y-1 ${
                          isAmbiguous
                            ? 'bg-amber-50 border-amber-400'
                            : marked === null
                            ? 'bg-slate-50 border-slate-200'
                            : isCorrect
                            ? 'bg-emerald-50/60 border-emerald-300'
                            : 'bg-rose-50/60 border-rose-300'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] font-bold px-0.5">
                          <span className="text-slate-600">
                            Q{qNum}
                            {isAmbiguous ? ' !' : ''}
                          </span>
                          <span className="text-emerald-700 font-mono">Gab: {correct}</span>
                        </div>

                        <div className="flex items-center justify-center gap-1">
                          {(q.letters.length >= 2 ? q.letters : LETTERS).map((letter) => {
                            const isSelected = marked === letter;
                            return (
                              <button
                                key={letter}
                                type="button"
                                onClick={() => {
                                  setMarkedAnswers((prev) => ({
                                    ...prev,
                                    [qNum]: isSelected ? null : letter,
                                  }));
                                  if (isAmbiguous) {
                                    setAmbiguousQuestions((prev) =>
                                      prev.filter((item) => item !== qNum)
                                    );
                                  }
                                }}
                                className={`w-5 h-5 rounded-full font-mono text-[10px] font-bold transition flex items-center justify-center cursor-pointer ${
                                  isSelected
                                    ? isCorrect
                                      ? 'bg-emerald-600 text-white shadow-2xs'
                                      : 'bg-rose-600 text-white shadow-2xs'
                                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                                }`}
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

              {/* Discursive Questions Assessment Section */}
              {identified.discursiveQuestions.length > 0 && (
                <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-900 border-b border-amber-200/60 pb-2">
                    <div className="flex items-center gap-1.5">
                      <PenTool className="w-4 h-4 text-amber-700" />
                      <span>Avaliação das Questões Discursivas</span>
                    </div>
                    <span className="text-[11px] font-semibold text-amber-800">
                      {identified.discursiveQuestions.length} questão(ões)
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {identified.discursiveQuestions.map((dq) => {
                      const maxPts = Number(dq.maxScore.toFixed(2)) || 1;
                      const assigned = discursiveScores[dq.questionId] ?? 0;

                      return (
                        <div
                          key={dq.questionId}
                          className="p-3 bg-white rounded-xl border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-0.5 min-w-0">
                            <span className="font-bold text-slate-900 text-xs">
                              Questão {dq.questionNumber} [Discursiva]
                            </span>
                            <p className="text-[11px] text-slate-500 line-clamp-2">
                              {dq.statement}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <label className="text-[11px] text-slate-600 font-bold">
                              Nota (0 a {maxPts}):
                            </label>
                            <input
                              type="number"
                              min={0}
                              max={maxPts}
                              step={0.1}
                              value={assigned}
                              onChange={(e) => {
                                const v = Math.max(
                                  0,
                                  Math.min(maxPts, Number(e.target.value) || 0)
                                );
                                setDiscursiveScores((prev) => ({
                                  ...prev,
                                  [dq.questionId]: v,
                                }));
                              }}
                              className="w-20 px-2.5 py-1.5 border border-amber-300 rounded-lg text-xs font-mono font-bold text-slate-900 text-center focus:outline-none focus:ring-1 focus:ring-amber-600"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: CONCLUÍDO & RESUMO FINAL */}
          {step === 'concluido' && savedResult && (
            <div className="space-y-4 animate-in fade-in text-center p-2">
              <div className="w-14 h-14 rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
                <CheckCheck className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Correção Registrada com Sucesso!
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {savedResult.examTitle} • Nota salva e contabilizada nos relatórios.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-3xl flex items-center justify-between text-left">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{savedResult.studentName}</h4>
                  <span className="text-xs text-slate-500 block">
                    Matrícula: {savedResult.registration} • Caderno {savedResult.versionLetter}
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-700 block mt-1">
                    {savedResult.correctCount} de {savedResult.totalObjective} acertos (
                    {savedResult.percentage}%) • {savedResult.blankCount + savedResult.ambiguousCount}{' '}
                    em branco
                  </span>
                </div>

                <div className="text-right">
                  <div className="text-3xl font-black text-emerald-700">
                    {savedResult.totalScore.toFixed(1)}
                  </div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    de {savedResult.maxScore.toFixed(1)} pontos
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 pt-2">
                {savedResult.answersList.map((a) => (
                  <div
                    key={a.qNum}
                    className={`p-1.5 rounded-xl text-center text-xs font-bold border transition ${
                      a.chosen === null
                        ? 'bg-slate-100 border-slate-200 text-slate-500'
                        : a.isCorrect
                        ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                        : 'bg-rose-100 border-rose-300 text-rose-900'
                    }`}
                  >
                    <span className="text-[9px] text-slate-400 block">Q{a.qNum}</span>
                    <span className="font-mono">{a.chosen || '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 flex-shrink-0 text-xs">
          {step === 'captura' && (
            <>
              <span className="text-slate-400 text-[11px]">
                Leitura estrita: exige QR Code oficial cadastrado e grade de bolhas legível
              </span>
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition cursor-pointer"
              >
                Cancelar
              </button>
            </>
          )}

          {step === 'validacao' && (
            <>
              <button
                type="button"
                onClick={() => {
                  resetScannerState();
                  if (captureMode === 'camera') startCamera();
                }}
                className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-900 font-semibold transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Nova Leitura</span>
              </button>

              <button
                type="button"
                onClick={handleSaveCorrection}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Salvando...' : 'Confirmar e Salvar Correção'}</span>
              </button>
            </>
          )}

          {step === 'concluido' && savedResult && (
            <>
              <button
                type="button"
                onClick={() => {
                  resetScannerState();
                  if (captureMode === 'camera') startCamera();
                }}
                className="inline-flex items-center gap-1.5 font-bold text-[#9E0B1A] hover:underline transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Escanear Próxima Folha</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const targetExamId = savedResult.examId;
                    handleClose();
                    navigateToResults(targetExamId);
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-[#9E0B1A] hover:bg-[#850916] text-white rounded-xl font-bold shadow-xs transition cursor-pointer"
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>Ver no Relatório de Resultados</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
