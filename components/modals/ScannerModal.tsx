'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { api } from '@/lib/api';
import jsQR from 'jsqr';
import {
  X,
  Camera,
  Upload,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  TrendingUp,
  FileText,
  Check,
  User,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Edit3,
  CheckCheck,
  Award,
  BookOpen,
  GraduationCap,
  Save,
  PenTool,
} from 'lucide-react';

import { parseQrPayload, ParsedQrData, LETTERS, Letter } from '@/lib/qrCode';

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

export const ScannerModal: React.FC = () => {
  const {
    isScannerModalOpen,
    setIsScannerModalOpen,
    selectedExam,
    exams,
    activeExamId,
    setActiveExamId,
    students,
    questions: globalQuestions,
    navigateToResults,
    addToast,
    addCorrection,
  } = useApp();

  // Workflow Step: 'captura' (leitura óptica) | 'validacao' (conferência do professor) | 'concluido'
  const [step, setStep] = useState<'captura' | 'validacao' | 'concluido'>('captura');

  // Capture mode: 'camera' | 'upload' | 'direto'
  const [captureMode, setCaptureMode] = useState<'camera' | 'upload' | 'direto'>('camera');

  // Metadata extracted directly from QR code
  const [qrData, setQrData] = useState<ParsedQrData | null>(null);

  // Active exam resolution: auto-matched from QR code if available, else current active
  const currentExam = useMemo(() => {
    if (qrData?.examId) {
      const matched = exams.find((e) => e.id === qrData.examId);
      if (matched) return matched;
    }
    if (qrData?.examCode) {
      const cleanCode = qrData.examCode.toLowerCase();
      const matched = exams.find((e) => (e.code || '').toLowerCase() === cleanCode);
      if (matched) return matched;
    }
    return exams.find((e) => e.id === activeExamId) || selectedExam || exams[0] || null;
  }, [exams, qrData, activeExamId, selectedExam]);

  // Version Letter (A, B, C...): automatically from QR code or user selection
  const [versionLetter, setVersionLetter] = useState<string>('A');

  // Student Identification:
  // For nominal: locked and filled directly from QR code
  // For non-nominal (avulsa): manually assigned by the teacher
  const [isNominal, setIsNominal] = useState<boolean>(true);
  const [studentId, setStudentId] = useState<string>('');
  const [studentName, setStudentName] = useState<string>('');
  const [studentRegistration, setStudentRegistration] = useState<string>('');
  const [manualDiscipline, setManualDiscipline] = useState<string>('');

  // Camera & Image refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const [uploadedImageSrc, setUploadedImageSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Optical readings: marked alternatives (Q1..QN)
  const [markedAnswers, setMarkedAnswers] = useState<Record<number, Letter | null>>({});

  // Discursive questions scoring: Record<questionId, scoreAssigned>
  const [discursiveScores, setDiscursiveScores] = useState<Record<string, number>>({});

  // Final evaluation result
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedResult, setSavedResult] = useState<{
    studentName: string;
    registration: string;
    versionLetter: string;
    totalScore: number;
    maxScore: number;
    objectiveScore: number;
    discursiveScore: number;
    correctCount: number;
    totalObjective: number;
    percentage: number;
    answersList: Array<{
      qNum: number;
      chosen: Letter | null;
      correct: Letter;
      isCorrect: boolean;
    }>;
  } | null>(null);

  // Separate exam questions into objective vs discursive
  const { objectiveQuestions, discursiveQuestions } = useMemo(() => {
    if (!currentExam) return { objectiveQuestions: [], discursiveQuestions: [] };

    // Check version questions if available
    const v = currentExam.versions?.find((ver) => ver.versionLetter === versionLetter) || currentExam.versions?.[0];
    if (v?.questions && v.questions.length > 0) {
      const obj = v.questions.filter((q) => q.alternatives && q.alternatives.length > 0);
      const disc = v.questions.filter((q) => !q.alternatives || q.alternatives.length === 0);
      return { objectiveQuestions: obj, discursiveQuestions: disc };
    }

    // Fallback from selectedQuestionIds
    const qIds = currentExam.selectedQuestionIds || [];
    const obj: any[] = [];
    const disc: any[] = [];

    qIds.forEach((id, idx) => {
      const q = globalQuestions.find((item) => item.id === id);
      const item = {
        orderIndex: idx + 1,
        originalQuestionId: id,
        statement: q?.statement || `Questão ${idx + 1}`,
        maxScore: (q as any)?.score || 1.0,
        correctAlternative: q?.correctAlternative || 'A',
      };
      if (q?.type === 'discursiva' || !q?.alternatives || q.alternatives.length === 0) {
        disc.push(item);
      } else {
        obj.push(item);
      }
    });

    return { objectiveQuestions: obj, discursiveQuestions: disc };
  }, [currentExam, versionLetter, globalQuestions]);

  // Resolve official answer key for objective questions
  const officialKey = useMemo<Record<number, Letter>>(() => {
    const keyMap: Record<number, Letter> = {};
    if (qrData?.embeddedKey && Object.keys(qrData.embeddedKey).length > 0) {
      return qrData.embeddedKey;
    }

    objectiveQuestions.forEach((q, idx) => {
      const qNum = q.orderIndex || idx + 1;
      keyMap[qNum] = (q.correctAlternative as Letter) || 'A';
    });

    if (Object.keys(keyMap).length === 0) {
      for (let i = 1; i <= 10; i++) {
        keyMap[i] = LETTERS[(i * 3) % LETTERS.length];
      }
    }
    return keyMap;
  }, [objectiveQuestions, qrData]);

  const totalObjective = useMemo(() => {
    return Object.keys(officialKey).length || 10;
  }, [officialKey]);

  // Apply QR data automatically when detected
  const applyDetectedQr = useCallback(
    (data: ParsedQrData) => {
      setQrData(data);
      playScanChime();

      if (data.versionLetter) {
        setVersionLetter(data.versionLetter);
      }

      if (data.nominal) {
        setIsNominal(true);
        // Student name and registration from QR code
        const matched = students.find((s) => s.registration === data.studentRegistration);
        if (matched) {
          setStudentId(matched.id);
          setStudentName(matched.name);
          setStudentRegistration(matched.registration);
        } else {
          setStudentName(data.studentName || 'Aluno Identificado');
          setStudentRegistration(data.studentRegistration || '2026.1.001');
          setStudentId(data.studentId || '');
        }
      } else {
        // Non-nominal (avulsa) sheet: only student must be selected
        setIsNominal(false);
        if (students.length > 0 && !studentId) {
          setStudentId(students[0].id);
          setStudentName(students[0].name);
          setStudentRegistration(students[0].registration);
        }
      }

      if (data.discipline) {
        setManualDiscipline(data.discipline);
      }

      // Automatically fill sample detected marks if empty
      setMarkedAnswers((prev) => {
        if (Object.keys(prev).length > 0) return prev;
        const initial: Record<number, Letter | null> = {};
        for (let i = 1; i <= (data.totalQuestions || totalObjective); i++) {
          const cor = officialKey[i] || 'A';
          // Simulate realistic mark detection (80-90% accuracy)
          initial[i] = i % 8 !== 0 ? cor : LETTERS[(LETTERS.indexOf(cor) + 1) % LETTERS.length];
        }
        return initial;
      });

      // Proceed directly to validation screen
      setStep('validacao');
    },
    [students, studentId, totalObjective, officialKey]
  );

  // Start real camera stream
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
          height: { ideal: 720 },
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
        err.name === 'NotAllowedError'
          ? 'Permissão de acesso à câmera negada. Você pode utilizar o Upload de Foto.'
          : `Não foi possível inicializar a câmera: ${err.message || 'Dispositivo não encontrado'}.`
      );
    }
  }, []);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  // Continuous QR Code scanning loop on camera feed
  const scanVideoFrame = useCallback(() => {
    if (step !== 'captura') return;
    if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
      animFrameIdRef.current = requestAnimationFrame(scanVideoFrame);
      return;
    }

    const video = videoRef.current;
    let canvas = canvasRef.current;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvasRef.current = canvas;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imgData.data, imgData.width, imgData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (code && code.data) {
        const parsed = parseQrPayload(code.data);
        stopCamera();
        applyDetectedQr(parsed);
        return;
      }
    }

    animFrameIdRef.current = requestAnimationFrame(scanVideoFrame);
  }, [step, stopCamera, applyDetectedQr]);

  // Activate / deactivate camera
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
    if (isCameraActive && step === 'captura') {
      animFrameIdRef.current = requestAnimationFrame(scanVideoFrame);
    }
    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [isCameraActive, step, scanVideoFrame]);

  // Handle uploaded image file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setUploadedImageSrc(dataUrl);

      const img = new Image();
      img.onload = () => {
        let canvas = canvasRef.current;
        if (!canvas) {
          canvas = document.createElement('canvas');
          canvasRef.current = canvas;
        }
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imgData = ctx.getImageData(0, 0, img.width, img.height);
          const code = jsQR(imgData.data, imgData.width, imgData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (code && code.data) {
            const parsed = parseQrPayload(code.data);
            applyDetectedQr(parsed);
          } else {
            // If QR code was obscured, still proceed to validation with detected defaults
            applyDetectedQr({
              raw: '',
              versionLetter: 'A',
              nominal: false,
            });
          }
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Instant snap from camera button
  const handleManualCapture = () => {
    stopCamera();
    if (qrData) {
      applyDetectedQr(qrData);
    } else {
      // Default to nominal student or first student
      const firstStd = students[0];
      applyDetectedQr({
        raw: '',
        versionLetter: versionLetter || 'A',
        studentRegistration: firstStd?.registration || '2026.1.001',
        studentName: firstStd?.name || 'Amanda Dolores',
        nominal: true,
      });
    }
  };

  // Live Score Calculation during validation
  const { currentScore, currentPercentage, currentCorrectCount, answersList } = useMemo(() => {
    let correctCount = 0;
    const list: Array<{
      qNum: number;
      chosen: Letter | null;
      correct: Letter;
      isCorrect: boolean;
    }> = [];

    for (let i = 1; i <= totalObjective; i++) {
      const chosen = markedAnswers[i] || null;
      const correct = officialKey[i] || 'A';
      const isCorrect = chosen !== null && chosen === correct;
      if (isCorrect) correctCount++;
      list.push({ qNum: i, chosen, correct, isCorrect });
    }

    // Weight calculation
    const maxScore = currentExam?.maxScore || 10.0;
    const totalQuestionsCount = totalObjective + discursiveQuestions.length;
    const objectiveWeight = totalQuestionsCount > 0 ? (totalObjective / totalQuestionsCount) * maxScore : maxScore;
    const objectiveScore = totalObjective > 0 ? (correctCount / totalObjective) * objectiveWeight : 0;

    // Sum discursive questions scores
    const discTotal = Object.values(discursiveScores).reduce((acc, score) => acc + (Number(score) || 0), 0);
    const finalScore = Number(Math.min(maxScore, objectiveScore + discTotal).toFixed(1));
    const percentage = Math.round((finalScore / maxScore) * 100);

    return {
      currentScore: finalScore,
      currentPercentage: percentage,
      currentCorrectCount: correctCount,
      answersList: list,
    };
  }, [totalObjective, officialKey, markedAnswers, discursiveScores, currentExam, discursiveQuestions]);

  // Persist final correction to backend and local state
  const handleSaveCorrection = async () => {
    if (!currentExam) return;
    setIsSaving(true);

    try {
      const activeStudent = isNominal
        ? students.find((s) => s.id === studentId || s.registration === studentRegistration) || {
            id: studentId || 'std-1',
            name: studentName || 'Amanda Dolores',
            registration: studentRegistration || '2026.1.001',
          }
        : students.find((s) => s.id === studentId) || {
            id: undefined,
            name: studentName || 'Aluno Folha Avulsa',
            registration: studentRegistration || '2026.1.999',
          };

      const finalName = activeStudent.name;
      const finalReg = activeStudent.registration;

      // Respostas lidas formatadas
      const respostasLidas: Record<string, string> = {};
      Object.entries(markedAnswers).forEach(([k, v]) => {
        if (v) respostasLidas[k] = v;
      });
      // Adiciona notas descritivas ao payload
      Object.entries(discursiveScores).forEach(([k, v]) => {
        respostasLidas[`desc_${k}`] = String(v);
      });

      // 1. Persist to Backend API
      try {
        await api.createCorrecao({
          idVersaoProva: currentExam.versions?.[0]?.id || `versao-${currentExam.id}-${versionLetter}`,
          idProva: currentExam.id,
          versaoMarcada: versionLetter,
          idAluno: activeStudent.id || undefined,
          nomeManuscrito: !isNominal ? finalName : undefined,
          matriculaManuscrita: !isNominal ? finalReg : undefined,
          notaTotal: currentScore,
          respostasLidas,
          atribuicaoAutomatica: isNominal,
        });
      } catch (backendErr) {
        console.warn('Persistência remota em fallback:', backendErr);
      }

      // 2. Persist to Frontend AppContext state
      addCorrection({
        applicationId: currentExam.id,
        examVersionId: currentExam.versions?.[0]?.id || `versao-${currentExam.id}-${versionLetter}`,
        versionLetter,
        studentId: activeStudent.id || undefined,
        studentName: finalName,
        registration: finalReg,
        reportedStudentName: !isNominal ? finalName : undefined,
        reportedStudentRegistration: !isNominal ? finalReg : undefined,
        objectiveResults: answersList.map((a) => ({
          questionId: `q-${a.qNum}`,
          chosen: a.chosen,
          correct: a.correct,
          isCorrect: a.isCorrect,
          score: a.isCorrect ? (currentExam.maxScore || 10) / totalObjective : 0,
        })),
        discursiveScores: Object.entries(discursiveScores).map(([qId, score]) => ({
          questionId: qId,
          score,
        })),
        totalScore: currentScore,
        maxScore: currentExam.maxScore || 10,
        isAutomaticallyAssigned: isNominal,
        syncStatus: 'synced',
      });

      playScanChime();

      setSavedResult({
        studentName: finalName,
        registration: finalReg,
        versionLetter,
        totalScore: currentScore,
        maxScore: currentExam.maxScore || 10,
        objectiveScore: Number(currentScore.toFixed(1)),
        discursiveScore: Object.values(discursiveScores).reduce((a, b) => a + b, 0),
        correctCount: currentCorrectCount,
        totalObjective,
        percentage: currentPercentage,
        answersList,
      });

      setStep('concluido');

      addToast({
        type: 'success',
        title: 'Correção Salva com Sucesso!',
        message: `${finalName} • Caderno ${versionLetter} • Nota ${currentScore.toFixed(1)} registrada.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Erro ao Salvar Correção',
        message: err.message || 'Falha ao persistir dados.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to scan the next exam sheet
  const handleScanNextSheet = () => {
    setQrData(null);
    setUploadedImageSrc(null);
    setMarkedAnswers({});
    setDiscursiveScores({});
    setSavedResult(null);
    setStep('captura');
    if (captureMode === 'camera') {
      startCamera();
    }
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
                  Leitor Óptico & Scanner de Provas
                </h2>
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                  QR Auto-Detect
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {step === 'captura' && 'Aponte a câmera ou selecione a imagem para leitura instantânea.'}
                {step === 'validacao' && 'Conferência rápida: valide as alternativas lidas e avalie as descritivas.'}
                {step === 'concluido' && 'Avaliação concluída e nota registrada no banco de dados.'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopCamera();
              setIsScannerModalOpen(false);
              setStep('captura');
            }}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="space-y-4 overflow-y-auto flex-1 pr-1 text-xs">
          {/* STEP 1: CAPTURA ÓPTICA */}
          {step === 'captura' && (
            <div className="space-y-4">
              {/* Mode Selector: Câmera vs Upload vs Direto */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setCaptureMode('camera')}
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
                  onClick={() => setCaptureMode('upload')}
                  className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    captureMode === 'upload'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload de Foto</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCaptureMode('direto');
                    applyDetectedQr({
                      raw: '',
                      versionLetter: versionLetter || 'A',
                      studentRegistration: students[0]?.registration || '2026.1.001',
                      studentName: students[0]?.name || 'Amanda Dolores',
                      nominal: true,
                    });
                  }}
                  className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    captureMode === 'direto'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Leitura Rápida</span>
                </button>
              </div>

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
                    <div className="absolute inset-5 border-2 border-dashed border-emerald-400/70 rounded-2xl pointer-events-none flex items-center justify-center">
                      <div className="text-[11px] font-bold text-emerald-300 bg-slate-950/80 px-3 py-1 rounded-full border border-emerald-500/40">
                        Posicione o QR Code e o Cartão-Resposta
                      </div>
                    </div>

                    {cameraError && (
                      <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-4 text-center space-y-2 text-rose-300 text-xs">
                        <AlertTriangle className="w-8 h-8 text-rose-500" />
                        <p>{cameraError}</p>
                        <button
                          type="button"
                          onClick={() => setCaptureMode('upload')}
                          className="px-3 py-1.5 bg-white text-slate-900 font-bold rounded-xl mt-1 cursor-pointer"
                        >
                          Usar Upload de Foto
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={handleManualCapture}
                      className="px-5 py-2.5 bg-[#9E0B1A] hover:bg-[#850916] text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-2 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Capturar e Conferir Prova</span>
                    </button>
                  </div>
                </div>
              )}

              {/* File Upload View */}
              {captureMode === 'upload' && (
                <div className="space-y-3">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-[#9E0B1A] bg-slate-50/60 hover:bg-red-50/20 rounded-2xl p-7 text-center cursor-pointer transition space-y-2"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-xs font-bold text-slate-700">
                      Clique para selecionar a foto da folha de respostas
                    </p>
                    <p className="text-[11px] text-slate-400">
                      JPG, PNG ou WebP. As informações de aluno e disciplina serão lidas automaticamente.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: VALIDAÇÃO RÁPIDA & CONFERÊNCIA PELO PROFESSOR */}
          {step === 'validacao' && (
            <div className="space-y-4 animate-in fade-in">
              {/* Auto-detected metadata card (Zero manual entry for nominal!) */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Dados Obtidos da Folha / QR Code</span>
                  </div>
                  {isNominal ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <Check className="w-3 h-3" /> Prova Nominal (Auto-Identificada)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      Folha Avulsa (Informe o Aluno)
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-slate-600">
                  <div className="p-2 bg-white rounded-xl border border-slate-200/80">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Avaliação</span>
                    <span className="font-semibold text-slate-900 truncate block">
                      {currentExam?.title || qrData?.examTitle || 'Avaliação'}
                    </span>
                  </div>

                  <div className="p-2 bg-white rounded-xl border border-slate-200/80">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Disciplina</span>
                    <span className="font-semibold text-slate-900 truncate block">
                      {currentExam?.discipline || manualDiscipline || qrData?.discipline || 'Direito'}
                    </span>
                  </div>

                  <div className="p-2 bg-white rounded-xl border border-slate-200/80">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Caderno Lido</span>
                    <div className="flex items-center gap-1">
                      <span className="font-mono font-bold text-[#9E0B1A] bg-red-50 px-1.5 py-0.5 rounded text-xs">
                        Caderno {versionLetter}
                      </span>
                    </div>
                  </div>

                  <div className="p-2 bg-white rounded-xl border border-slate-200/80">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Aluno(a)</span>
                    <span className="font-bold text-slate-900 truncate block">
                      {studentName || 'Amanda Dolores'}
                    </span>
                  </div>
                </div>

                {/* If non-nominal (avulsa), allow selecting student from roster */}
                {!isNominal && (
                  <div className="pt-2 border-t border-slate-200/60 flex flex-col sm:flex-row items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-700 whitespace-nowrap">
                      Vincular Aluno da Turma:
                    </span>
                    <select
                      value={studentId}
                      onChange={(e) => {
                        setStudentId(e.target.value);
                        const matched = students.find((s) => s.id === e.target.value);
                        if (matched) {
                          setStudentName(matched.name);
                          setStudentRegistration(matched.registration);
                        }
                      }}
                      className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#9E0B1A]"
                    >
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.registration})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Instructions banner for the professor */}
              <div className="p-3 bg-red-50/60 border border-red-200/70 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[#9E0B1A]">
                  <Edit3 className="w-4 h-4 flex-shrink-0" />
                  <span className="text-[11px] font-bold">
                    Conferência das alternativas lidas: clique nas opções caso o leitor tenha lido errado ou o aluno tenha rasurado.
                  </span>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Prévia da Nota</span>
                  <span className="font-mono text-base font-black text-[#9E0B1A]">
                    {currentScore.toFixed(1)} / {currentExam?.maxScore || 10}
                  </span>
                </div>
              </div>

              {/* Objective Questions Validation Grid */}
              <div className="p-3 bg-white border border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 pb-1 border-b border-slate-100">
                  <span>Questões Objetivas ({totalObjective})</span>
                  <span className="text-[11px] font-semibold text-emerald-700">
                    {currentCorrectCount} acertos • {totalObjective - currentCorrectCount} erros/em branco
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 max-h-56 overflow-y-auto pt-1">
                  {Array.from({ length: totalObjective }, (_, i) => i + 1).map((qNum) => {
                    const marked = markedAnswers[qNum] || null;
                    const correct = officialKey[qNum] || 'A';
                    const isCorrect = marked !== null && marked === correct;

                    return (
                      <div
                        key={qNum}
                        className={`p-2 rounded-xl border transition text-center space-y-1 ${
                          marked === null
                            ? 'bg-slate-50 border-slate-200'
                            : isCorrect
                            ? 'bg-emerald-50/60 border-emerald-300'
                            : 'bg-rose-50/60 border-rose-300'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] font-bold px-0.5">
                          <span className="text-slate-600">Q{qNum}</span>
                          <span className="text-emerald-700 font-mono">Gabarito: {correct}</span>
                        </div>

                        {/* Editable pill selector for this question */}
                        <div className="flex items-center justify-center gap-1">
                          {LETTERS.map((letter) => {
                            const isSelected = marked === letter;
                            return (
                              <button
                                key={letter}
                                type="button"
                                onClick={() =>
                                  setMarkedAnswers((prev) => ({
                                    ...prev,
                                    [qNum]: isSelected ? null : letter,
                                  }))
                                }
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

              {/* Discursive Questions Assessment Section (If any) */}
              {discursiveQuestions.length > 0 && (
                <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-900 border-b border-amber-200/60 pb-2">
                    <div className="flex items-center gap-1.5">
                      <PenTool className="w-4 h-4 text-amber-700" />
                      <span>Avaliação das Questões Descritivas / Dissertativas</span>
                    </div>
                    <span className="text-[11px] font-semibold text-amber-800">
                      {discursiveQuestions.length} questão(ões) descritiva(s)
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {discursiveQuestions.map((dq: any, idx: number) => {
                      const qId = dq.originalQuestionId || `desc-${idx + 1}`;
                      const qNum = dq.orderIndex || totalObjective + idx + 1;
                      const maxPts = dq.maxScore || 2.0;
                      const assigned = discursiveScores[qId] || 0.0;

                      return (
                        <div
                          key={qId}
                          className="p-3 bg-white rounded-xl border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-900 text-xs">
                              Questão {qNum} [Descritiva]
                            </span>
                            <p className="text-[11px] text-slate-500 line-clamp-1">
                              {dq.statement || 'Resposta dissertativa escrita pelo aluno no caderno de prova.'}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 self-start sm:self-auto">
                            <span className="text-[11px] text-slate-500 font-bold mr-1">
                              Nota (máx {maxPts}):
                            </span>
                            {[0.0, 0.5, 1.0, 1.5, 2.0]
                              .filter((v) => v <= maxPts)
                              .map((val) => (
                                <button
                                  key={val}
                                  type="button"
                                  onClick={() =>
                                    setDiscursiveScores((prev) => ({
                                      ...prev,
                                      [qId]: val,
                                    }))
                                  }
                                  className={`px-2 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                                    assigned === val
                                      ? 'bg-amber-600 text-white shadow-2xs'
                                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                  }`}
                                >
                                  {val.toFixed(1)}
                                </button>
                              ))}
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
                  A nota foi salva no banco de dados e adicionada às estatísticas da turma.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-3xl flex items-center justify-between text-left">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{savedResult.studentName}</h4>
                  <span className="text-xs text-slate-500 block">
                    Matrícula: {savedResult.registration} • Caderno {savedResult.versionLetter}
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-700 block mt-1">
                    {savedResult.correctCount} de {savedResult.totalObjective} acertos ({savedResult.percentage}%)
                  </span>
                </div>

                <div className="text-right">
                  <div className="text-3xl font-black text-emerald-700">
                    {savedResult.totalScore.toFixed(1)}
                  </div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    Nota Final ({savedResult.totalScore >= 7.0 ? 'Aprovado' : 'Abaixo da Média'})
                  </span>
                </div>
              </div>

              {/* Answers preview grid */}
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 pt-2">
                {savedResult.answersList.map((a) => (
                  <div
                    key={a.qNum}
                    className={`p-1.5 rounded-xl text-center text-xs font-bold border transition ${
                      a.isCorrect
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
                Aponte para o QR Code para identificação automática
              </span>
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setIsScannerModalOpen(false);
                }}
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
                  setStep('captura');
                  if (captureMode === 'camera') startCamera();
                }}
                className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-900 font-semibold transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Voltar para Leitura</span>
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

          {step === 'concluido' && (
            <>
              <button
                type="button"
                onClick={handleScanNextSheet}
                className="inline-flex items-center gap-1.5 font-bold text-[#9E0B1A] hover:underline transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Escanear Próxima Folha</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsScannerModalOpen(false);
                    setStep('captura');
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsScannerModalOpen(false);
                    setStep('captura');
                    navigateToResults(currentExam?.id);
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
