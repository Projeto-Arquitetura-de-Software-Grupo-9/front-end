'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { api, BackendExamLayoutQuestionDTO } from '@/lib/api';
import { CorregeLogo } from '@/components/common/CorregeLogo';
import jsQR from 'jsqr';
import {
  Camera,
  QrCode,
  CheckCircle2,
  RotateCcw,
  LogOut,
  Upload,
  Check,
  XCircle,
  User,
  BookOpen,
  ArrowLeft,
  AlertCircle,
  ScanLine,
} from 'lucide-react';

type Letter = 'A' | 'B' | 'C' | 'D' | 'E';
const LETTERS: Letter[] = ['A', 'B', 'C', 'D', 'E'];

type MobileStep = 'scan-qr' | 'view-test' | 'corrected';

interface ScannedQuestionItem {
  orderIndex: number;
  originalQuestionId: string;
  statement: string;
  alternatives: Array<{
    id?: string;
    letter: Letter;
    text: string;
  }>;
  correctAlternative: Letter;
  topic?: string;
}

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
  const [resolvedVersionId, setResolvedVersionId] = useState<string>('');
  const [resolvedExamId, setResolvedExamId] = useState<string>('');
  const [resolvedExamTitle, setResolvedExamTitle] = useState<string>('');
  const [resolvedExamDiscipline, setResolvedExamDiscipline] = useState<string>('');
  const [scanMode, setScanMode] = useState<'nominal' | 'avulsa'>('nominal');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    students[0]?.id || ''
  );
  const [qrRawString, setQrRawString] = useState<string | null>(null);
  const [embeddedKeyFromQr, setEmbeddedKeyFromQr] = useState<Record<number, Letter>>({});
  const [backendQuestions, setBackendQuestions] = useState<ScannedQuestionItem[]>([]);
  const [backendAnswerKey, setBackendAnswerKey] = useState<Record<number, Letter>>({});

  // Camera & Scanning states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isScanningAnswersCamera, setIsScanningAnswersCamera] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [correctedCount, setCorrectedCount] = useState(0);

  // Real answers detected by OpenCV (`respostasLidas`)
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
  const answersFileInputRef = useRef<HTMLInputElement | null>(null);
  const scanTimerRef = useRef<NodeJS.Timeout | null>(null);

  const currentExam =
    exams.find((e) => e.id === activeExamId) || selectedExam || exams[0];
  const versions = currentExam?.versions || [];

  const activeVersion = useMemo(() => {
    return (
      versions.find((v) => v.versionLetter === selectedVersionLetter) ||
      versions[0]
    );
  }, [versions, selectedVersionLetter]);

  // Build the real list of test questions for the scanned Caderno (preferring backend layout if loaded)
  const testQuestions: ScannedQuestionItem[] = useMemo(() => {
    if (backendQuestions.length > 0) {
      return backendQuestions;
    }

    if (activeVersion?.questions && activeVersion.questions.length > 0) {
      return activeVersion.questions.map((q, idx) => ({
        orderIndex: q.orderIndex || idx + 1,
        originalQuestionId: q.originalQuestionId || `q-${idx + 1}`,
        statement: q.statement,
        alternatives: (q.alternatives || []).map((a) => ({
          id: a.id,
          letter: a.letter as Letter,
          text: a.text,
        })),
        correctAlternative: (q.correctAlternative || 'A') as Letter,
        topic: q.topic,
      }));
    }

    const fromBank = (currentExam?.selectedQuestionIds || [])
      .map((id) => questionBank.find((qb) => qb.id === id))
      .filter(Boolean);

    return fromBank.map((q, idx) => ({
      orderIndex: idx + 1,
      originalQuestionId: q!.id,
      statement: q!.statement,
      alternatives: (q!.alternatives || []).map((a) => ({
        id: a.id,
        letter: a.letter as Letter,
        text: a.text,
      })),
      correctAlternative: q!.correctAlternative as Letter,
      topic: q!.topic,
    }));
  }, [backendQuestions, activeVersion, currentExam, questionBank]);

  const totalQuestions = Math.max(
    1,
    testQuestions.length ||
      Object.keys(backendAnswerKey).length ||
      Object.keys(embeddedKeyFromQr).length ||
      1
  );

  const officialAnswerKey = useMemo(() => {
    const key: Record<number, Letter> = {};
    for (let i = 1; i <= totalQuestions; i++) {
      key[i] =
        backendAnswerKey[i] ||
        embeddedKeyFromQr[i] ||
        (activeVersion?.answerKey?.[i] as Letter) ||
        testQuestions[i - 1]?.correctAlternative ||
        'A';
    }
    return key;
  }, [totalQuestions, backendAnswerKey, embeddedKeyFromQr, activeVersion, testQuestions]);

  const stopCamera = useCallback(() => {
    if (scanTimerRef.current) {
      clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
    setIsScanningAnswersCamera(false);
  }, []);

  /**
   * Opens the real smartphone rear camera
   */
  const openCamera = useCallback(async (forAnswers = false) => {
    setCameraError(null);
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setCameraError(
        'O navegador não permitiu acesso direto ao stream de vídeo. Use o botão "Abrir Câmera Nativa / Tirar Foto" abaixo.'
      );
      return;
    }

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (forAnswers) {
        setIsScanningAnswersCamera(true);
      } else {
        setIsCameraActive(true);
      }
    } catch {
      setCameraError(
        'Permissão da câmera pendente ou bloqueada pelo navegador. Toque em "Abrir Câmera" ou use a Câmera Nativa.'
      );
    }
  }, []);

  // Automatically open the smartphone rear camera when entering Step 1 (scan-qr)
  useEffect(() => {
    if (step === 'scan-qr') {
      openCamera(false);
    }
    return () => {
      stopCamera();
    };
  }, [step, openCamera, stopCamera]);

  useEffect(() => {
    if ((isCameraActive || isScanningAnswersCamera) && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [isCameraActive, isScanningAnswersCamera]);

  /**
   * Parses all QR Code formats from `C:\Users\davi3\back-end` and the front-end:
   * - QrCodeService.ts: { appId, vId, ver, code, stdId, reg, ts, chk }
   * - ExamPdfService.ts header: { app: 'CORREGE', exam, ver, pg }
   * - ExamPdfService.ts OMR sheet: { app: 'CORREGE_OMR', code, ver, pages }
   * - MockExamRepository.ts: { appId: 'CORREGE', examCode, ver, pages }
   * - A4AnswerSheet.tsx / A4ExamPage.tsx: { app: 'CORREGE', examId, code, vId, ver, nominal, std, q, k }
   */
  const parseRealQrString = (
    rawText: string
  ): {
    examId?: string;
    examCode?: string;
    versionId?: string;
    versionLetter: string;
    nominal: boolean;
    studentId?: string;
    studentRegistration?: string;
    totalQuestions?: number;
    checksum?: string;
    embeddedKey: Record<number, Letter>;
  } | null => {
    const clean = rawText.trim();
    try {
      const parsed = JSON.parse(clean);
      if (parsed && typeof parsed === 'object') {
        const embeddedKey: Record<number, Letter> = {};
        if (typeof parsed.k === 'string') {
          parsed.k
            .toUpperCase()
            .split('')
            .forEach((ch: string, idx: number) => {
              if (LETTERS.includes(ch as Letter)) {
                embeddedKey[idx + 1] = ch as Letter;
              }
            });
        }
        if (parsed.answerKey && typeof parsed.answerKey === 'object') {
          Object.entries(parsed.answerKey).forEach(([qNum, letter]) => {
            const up = String(letter).toUpperCase() as Letter;
            if (LETTERS.includes(up)) {
              embeddedKey[Number(qNum)] = up;
            }
          });
        }

        const rawVer = String(parsed.ver || parsed.versionLetter || parsed.vId || 'A')
          .toUpperCase()
          .replace('VERSION-', '')
          .replace('VER-', '')
          .trim();
        const verLetter = /^[A-Z]$/.test(rawVer) ? rawVer : 'A';

        const reg =
          parsed.reg ||
          parsed.std ||
          parsed.registration ||
          parsed.studentRegistration;
        const stdId = parsed.stdId || parsed.studentId;

        return {
          examId: parsed.examId || parsed.idProva,
          examCode: parsed.code || parsed.exam || parsed.examCode,
          versionId: parsed.vId || parsed.idVersaoProva,
          versionLetter: verLetter,
          nominal:
            parsed.nominal !== undefined
              ? Boolean(parsed.nominal)
              : Boolean(reg && reg !== 'ANON'),
          studentId: stdId && stdId !== 'ANON' ? String(stdId) : undefined,
          studentRegistration: reg && reg !== 'ANON' ? String(reg) : undefined,
          totalQuestions: Number(parsed.q || parsed.totalQuestions || 0),
          checksum: parsed.chk,
          embeddedKey,
        };
      }
    } catch {
      const match = clean.match(/V=([A-Z])/i);
      if (match) {
        return {
          versionLetter: match[1].toUpperCase(),
          nominal: true,
          embeddedKey: {},
        };
      }
    }
    return null;
  };

  /**
   * Applies the real decoded QR Code data, fetches the test & answerKey from `C:\Users\davi3\back-end`
   * (or matches in AppContext), and runs OpenCV on the captured frame to find marked answers.
   */
  const handleQrDecoded = useCallback(
    async (rawQrText: string, frameDataUrl?: string) => {
      stopCamera();
      setCameraError(null);

      let parsedQr = parseRealQrString(rawQrText);

      // If QR payload has a cryptographic checksum (`chk` from QrCodeService.ts), validate with backend
      if (parsedQr?.checksum) {
        try {
          const validation = await api.validateQrCode(rawQrText);
          if (validation.valid && validation.decoded) {
            parsedQr = {
              ...parsedQr,
              examCode: validation.decoded.code || parsedQr.examCode,
              versionId: validation.decoded.vId || parsedQr.versionId,
              versionLetter: validation.decoded.ver || parsedQr.versionLetter,
              studentId: validation.decoded.stdId || parsedQr.studentId,
              studentRegistration: validation.decoded.reg || parsedQr.studentRegistration,
            };
          }
        } catch {
          // Proceed with local parsed QR if backend validation endpoint is unreachable
        }
      }

      const verLetter = parsedQr?.versionLetter || 'A';
      setSelectedVersionLetter(verLetter);
      setQrRawString(rawQrText);
      setBackendQuestions([]);
      setBackendAnswerKey({});

      if (parsedQr?.embeddedKey && Object.keys(parsedQr.embeddedKey).length > 0) {
        setEmbeddedKeyFromQr(parsedQr.embeddedKey);
      } else {
        setEmbeddedKeyFromQr({});
      }

      // 1. Match Exam locally in AppContext by id or code
      let matchedExam = currentExam;
      const normalizeCode = (val?: string) =>
        String(val || '')
          .replace(/[^a-zA-Z0-9]/g, '')
          .toLowerCase();

      if (parsedQr?.examId || parsedQr?.examCode) {
        const targetId = String(parsedQr.examId || '').toLowerCase();
        const targetCode = normalizeCode(parsedQr.examCode);

        const foundLocal = exams.find(
          (ex) =>
            (targetId && ex.id.toLowerCase() === targetId) ||
            (targetCode && normalizeCode(ex.code) === targetCode) ||
            (targetCode && normalizeCode(ex.id) === targetCode)
        );
        if (foundLocal) {
          matchedExam = foundLocal;
          setActiveExamId(foundLocal.id);
        }
      }

      let targetExamId = parsedQr?.examId || matchedExam?.id || '';
      let targetVersionId =
        parsedQr?.versionId ||
        matchedExam?.versions?.find((v) => v.versionLetter === verLetter)?.id ||
        `version-${verLetter}`;
      let loadedAnswerKey: Record<number, Letter> = {
        ...(parsedQr?.embeddedKey || {}),
      };
      let loadedQuestionsCount =
        parsedQr?.totalQuestions ||
        matchedExam?.versions?.find((v) => v.versionLetter === verLetter)?.questions
          ?.length ||
        matchedExam?.selectedQuestionIds?.length ||
        totalQuestions;

      // 2. Query `C:\Users\davi3\back-end` (`GET /api/v1/exams` and `GET /api/v1/exams/:id/layout`) for real backend exam data
      try {
        const remoteExams = await api.getExams().catch(() => []);
        if (Array.isArray(remoteExams) && remoteExams.length > 0) {
          const targetCode = normalizeCode(parsedQr?.examCode);
          const remoteMatch = remoteExams.find(
            (re: any) =>
              (parsedQr?.examId && re.id === parsedQr.examId) ||
              (targetCode && normalizeCode(re.code) === targetCode) ||
              (parsedQr?.versionId &&
                Array.isArray(re.versions) &&
                re.versions.some((rv: any) => rv.id === parsedQr?.versionId))
          );

          if (remoteMatch) {
            targetExamId = remoteMatch.id;
            setResolvedExamTitle(remoteMatch.title || '');
            setResolvedExamDiscipline(remoteMatch.discipline || '');

            const remoteVer = Array.isArray(remoteMatch.versions)
              ? remoteMatch.versions.find(
                  (rv: any) =>
                    rv.id === parsedQr?.versionId ||
                    String(rv.versionLetter).toUpperCase() === verLetter
                )
              : null;

            if (remoteVer) {
              targetVersionId = remoteVer.id;
              if (remoteVer.answerKey && typeof remoteVer.answerKey === 'object') {
                Object.entries(remoteVer.answerKey).forEach(([k, v]) => {
                  const up = String(v).toUpperCase() as Letter;
                  if (LETTERS.includes(up)) {
                    loadedAnswerKey[Number(k)] = up;
                  }
                });
              }
              if (Array.isArray(remoteVer.questionsLayout) && remoteVer.questionsLayout.length > 0) {
                const mappedQs: ScannedQuestionItem[] = remoteVer.questionsLayout.map(
                  (ql: any, idx: number) => ({
                    orderIndex: ql.orderIndex || idx + 1,
                    originalQuestionId: ql.questionId || ql.originalQuestionId || `q-${idx + 1}`,
                    statement: ql.statement || '',
                    alternatives: (ql.alternatives || []).map((a: any) => ({
                      id: a.id,
                      letter: String(a.letter).toUpperCase() as Letter,
                      text: a.text,
                    })),
                    correctAlternative:
                      loadedAnswerKey[idx + 1] ||
                      (String(ql.correctAlternative || 'A').toUpperCase() as Letter),
                    topic: ql.topic,
                  })
                );
                setBackendQuestions(mappedQs);
                loadedQuestionsCount = mappedQs.length;
              }
            }
          }
        }

        // Also fetch `GET /api/v1/exams/:id/layout?versionLetter=X` if we have a targetExamId
        if (targetExamId) {
          const layoutDto = await api.getExamLayout(targetExamId, verLetter).catch(() => null);
          if (layoutDto) {
            setResolvedExamTitle(layoutDto.title || '');
            setResolvedExamDiscipline(layoutDto.header?.discipline || '');
            if (layoutDto.answerKey) {
              Object.entries(layoutDto.answerKey).forEach(([k, v]) => {
                const up = String(v).toUpperCase() as Letter;
                if (LETTERS.includes(up)) {
                  loadedAnswerKey[Number(k)] = up;
                }
              });
            }
            const flatQuestions: BackendExamLayoutQuestionDTO[] = (
              layoutDto.pages || []
            ).flatMap((p) => p.questions || []);
            if (flatQuestions.length > 0) {
              const mappedFromLayout: ScannedQuestionItem[] = flatQuestions.map((fq, idx) => ({
                orderIndex: fq.orderIndex || idx + 1,
                originalQuestionId: fq.questionId || `q-${idx + 1}`,
                statement: fq.statement,
                alternatives: (fq.alternatives || []).map((a) => ({
                  letter: a.letter,
                  text: a.text,
                })),
                correctAlternative:
                  loadedAnswerKey[fq.orderIndex || idx + 1] ||
                  fq.correctAlternative ||
                  'A',
              }));
              setBackendQuestions(mappedFromLayout);
              loadedQuestionsCount = mappedFromLayout.length;
            }
          }
        }
      } catch {
        // Fallback cleanly to local AppContext exam version data
      }

      if (Object.keys(loadedAnswerKey).length > 0) {
        setBackendAnswerKey(loadedAnswerKey);
      }
      setResolvedExamId(targetExamId || matchedExam?.id || '');
      setResolvedVersionId(targetVersionId);

      // 3. Match Student by ID or Registration from QR Code
      if (parsedQr?.studentId || parsedQr?.studentRegistration) {
        const foundStudent = students.find(
          (s) =>
            (parsedQr?.studentId && s.id === parsedQr.studentId) ||
            (parsedQr?.studentRegistration &&
              s.registration.toLowerCase() ===
                String(parsedQr.studentRegistration).toLowerCase())
        );
        if (foundStudent) {
          setSelectedStudentId(foundStudent.id);
          setScanMode('nominal');
        }
      } else if (parsedQr?.nominal === false) {
        setScanMode('avulsa');
      }

      // 4. Start with empty answers (no mocked data!) and run Python OpenCV on the frame to search for marked bubbles
      setMarkedAnswers({});
      setGradingResult(null);
      setStep('view-test');

      if (frameDataUrl) {
        setIsProcessing(true);
        try {
          const effectiveKey =
            Object.keys(loadedAnswerKey).length > 0
              ? loadedAnswerKey
              : officialAnswerKey;

          const omrRes = await api.scanOmrSheet({
            imageBase64: frameDataUrl,
            totalQuestions: loadedQuestionsCount,
            officialAnswerKey: effectiveKey,
            versionLetter: verLetter,
            maxScore: matchedExam?.maxScore || 10.0,
          });

          const rawDetected = omrRes.respostasLidas || omrRes.markedAnswers;
          if (omrRes.success && rawDetected) {
            const realDetected: Record<number, Letter> = {};
            Object.entries(rawDetected).forEach(([k, v]) => {
              const qNum = Number(k);
              if (qNum >= 1 && LETTERS.includes(v as Letter)) {
                realDetected[qNum] = v as Letter;
              }
            });
            setMarkedAnswers(realDetected);
          }
          if (omrRes.versaoMarcada && /^[A-Z]$/.test(omrRes.versaoMarcada)) {
            setSelectedVersionLetter(omrRes.versaoMarcada);
          }
        } catch {
          // Keep markedAnswers empty if no bubbles were visible in the close-up QR frame
        } finally {
          setIsProcessing(false);
        }
      }

      addToast({
        type: 'success',
        title: `QR Code Lido: Caderno ${verLetter}`,
        message: `Prova "${resolvedExamTitle || matchedExam?.title || 'Avaliação'}" carregada.`,
      });
    },
    [
      currentExam,
      exams,
      officialAnswerKey,
      resolvedExamTitle,
      setActiveExamId,
      stopCamera,
      students,
      totalQuestions,
      addToast,
    ]
  );

  /**
   * Real-time 250ms loop using jsQR on the live <video> feed to detect QR Codes immediately
   */
  useEffect(() => {
    if (!isCameraActive || step !== 'scan-qr') return;

    scanTimerRef.current = setInterval(() => {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || !video.videoWidth) return;

      const canvas = canvasRef.current || document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (qrCode && qrCode.data && qrCode.data.trim()) {
        const frameDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        handleQrDecoded(qrCode.data.trim(), frameDataUrl);
      }
    }, 250);

    return () => {
      if (scanTimerRef.current) {
        clearInterval(scanTimerRef.current);
        scanTimerRef.current = null;
      }
    };
  }, [isCameraActive, step, handleQrDecoded]);

  /**
   * Captures the current <video> frame and sends it to Python OpenCV (/api/omr)
   * to search for the QR Code (Step 1) or Answer Bubbles (Step 2).
   */
  const captureFrameAndProcess = async (mode: 'qr' | 'answers') => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;

    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const frameDataUrl = canvas.toDataURL('image/png');

    if (mode === 'qr') {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const qr = jsQR(imgData.data, imgData.width, imgData.height);
      if (qr && qr.data && qr.data.trim()) {
        await handleQrDecoded(qr.data.trim(), frameDataUrl);
        return;
      }

      setIsProcessing(true);
      try {
        const res = await api.scanOmrSheet({
          imageBase64: frameDataUrl,
          totalQuestions,
          officialAnswerKey,
          versionLetter: selectedVersionLetter,
          maxScore: currentExam?.maxScore || 10.0,
        });
        setIsProcessing(false);

        if (res.success && res.qrDetected && res.qrRaw) {
          await handleQrDecoded(res.qrRaw, frameDataUrl);
        } else {
          setCameraError(
            'Nenhum QR Code foi detectado no enquadramento atual. Aproxime a câmera do QR Code no topo da prova ou folha de respostas.'
          );
        }
      } catch (err: any) {
        setIsProcessing(false);
        setCameraError(err?.message || 'Erro ao analisar imagem na câmera.');
      }
    } else {
      // Mode === 'answers': Search for marked answer bubbles via Python OpenCV
      setIsProcessing(true);
      try {
        const res = await api.scanOmrSheet({
          imageBase64: frameDataUrl,
          totalQuestions,
          officialAnswerKey,
          versionLetter: selectedVersionLetter,
          maxScore: currentExam?.maxScore || 10.0,
        });
        stopCamera();
        setIsProcessing(false);

        const foundAnswers = res.respostasLidas || res.markedAnswers || {};
        const countFound = Object.keys(foundAnswers).length;

        if (countFound > 0) {
          setMarkedAnswers((prev) => {
            const next = { ...prev };
            Object.entries(foundAnswers).forEach(([k, v]) => {
              const qNum = Number(k);
              if (qNum >= 1 && LETTERS.includes(v as Letter)) {
                next[qNum] = v as Letter;
              }
            });
            return next;
          });
          addToast({
            type: 'success',
            title: `${countFound} Resposta(s) Detectada(s)!`,
            message: 'Marcações lidas via OpenCV Python e preenchidas na prova.',
          });
        } else {
          addToast({
            type: 'warning',
            title: 'Nenhuma Bolha Escura Detectada',
            message:
              'Enquadre a grade de respostas com boa iluminação ou toque nas alternativas marcadas pelo aluno.',
          });
        }
      } catch (err: any) {
        setIsProcessing(false);
        addToast({
          type: 'error',
          title: 'Erro na Leitura Óptica',
          message: err?.message || 'Não foi possível processar a imagem.',
        });
      }
    }
  };

  /**
   * Handles native smartphone camera photo input (<input capture="environment">)
   */
  const handlePhotoInput = (
    e: React.ChangeEvent<HTMLInputElement>,
    mode: 'qr' | 'answers'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCameraError(null);

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result;
      if (typeof dataUrl !== 'string') return;

      if (mode === 'qr') {
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const qr = jsQR(imgData.data, imgData.width, imgData.height);
            if (qr && qr.data && qr.data.trim()) {
              await handleQrDecoded(qr.data.trim(), dataUrl);
              return;
            }
          }

          setIsProcessing(true);
          try {
            const res = await api.scanOmrSheet({
              imageBase64: dataUrl,
              totalQuestions,
              officialAnswerKey,
              versionLetter: selectedVersionLetter,
              maxScore: currentExam?.maxScore || 10.0,
            });
            setIsProcessing(false);
            if (res.success && res.qrDetected && res.qrRaw) {
              await handleQrDecoded(res.qrRaw, dataUrl);
            } else {
              setCameraError(
                'Nenhum QR Code foi encontrado na foto enviada. Certifique-se de que o QR Code da prova esteja visível e nítido.'
              );
            }
          } catch {
            setIsProcessing(false);
            setCameraError('Falha ao processar a foto no servidor Python OpenCV.');
          }
        };
        img.src = dataUrl;
      } else {
        setIsProcessing(true);
        try {
          const res = await api.scanOmrSheet({
            imageBase64: dataUrl,
            totalQuestions,
            officialAnswerKey,
            versionLetter: selectedVersionLetter,
            maxScore: currentExam?.maxScore || 10.0,
          });
          setIsProcessing(false);

          const foundAnswers = res.respostasLidas || res.markedAnswers || {};
          const countFound = Object.keys(foundAnswers).length;
          if (countFound > 0) {
            setMarkedAnswers((prev) => {
              const next = { ...prev };
              Object.entries(foundAnswers).forEach(([k, v]) => {
                const qNum = Number(k);
                if (qNum >= 1 && LETTERS.includes(v as Letter)) {
                  next[qNum] = v as Letter;
                }
              });
              return next;
            });
            addToast({
              type: 'success',
              title: `${countFound} Marcações Encontradas!`,
              message: 'As respostas detectadas na foto foram aplicadas à prova.',
            });
          } else {
            addToast({
              type: 'warning',
              title: 'Nenhuma Marcação Detectada na Foto',
              message: 'Verifique o foco/iluminação das bolhas ou selecione as respostas manualmente.',
            });
          }
        } catch {
          setIsProcessing(false);
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  /**
   * Step 2 -> Step 3: Correct the Test using Python OpenCV grading engine
   * and persist the Correction to `C:\Users\davi3\back-end` (`POST /api/v1/correcoes`).
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

      if (!res.success || !res.grading) {
        setIsProcessing(false);
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
      const versionIdToSave =
        resolvedVersionId ||
        activeVersion?.id ||
        `version-${selectedVersionLetter}`;
      const examIdToSave = resolvedExamId || currentExam?.id;

      // Format `respostasLidas` exactly as expected by `C:\Users\davi3\back-end\src\controllers\CorrecaoController.ts`
      const respostasLidasPayload: Record<string, string> = {};
      Object.entries(markedAnswers).forEach(([qNum, letter]) => {
        if (letter) {
          respostasLidasPayload[String(qNum)] = letter;
        }
      });

      // Persist to backend (`POST /api/v1/correcoes`)
      let syncedWithBackend = false;
      try {
        await api.createCorrecao({
          idVersaoProva: versionIdToSave,
          idProva: examIdToSave,
          versaoMarcada: selectedVersionLetter,
          idAluno: isNominal ? targetStudent?.id : undefined,
          nomeManuscrito: isNominal ? targetStudent?.name : 'Folha Avulsa Mobile',
          matriculaManuscrita: isNominal ? targetStudent?.registration : undefined,
          notaTotal: grading.totalScore,
          respostasLidas: respostasLidasPayload,
          atribuicaoAutomatica: isNominal,
        });
        syncedWithBackend = true;
      } catch {
        // Backend offline or version ID only local; still saved in AppContext below
      }

      addCorrection({
        applicationId: 'app-1',
        examVersionId: versionIdToSave,
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
        syncStatus: syncedWithBackend ? 'synced' : 'pending',
      });

      setIsProcessing(false);
      setStep('corrected');
      setCorrectedCount((prev) => prev + 1);

      addToast({
        type: 'success',
        title: `Prova Corrigida! Nota: ${grading.totalScore.toFixed(1)}`,
        message: `${grading.correctCount} de ${grading.totalQuestions} questões corretas.`,
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
    setEmbeddedKeyFromQr({});
    setBackendQuestions([]);
    setBackendAnswerKey({});
    setQrRawString(null);
    setCameraError(null);
  };

  const currentStudent =
    students.find((s) => s.id === selectedStudentId) || students[0];
  const answeredCount = Object.keys(markedAnswers).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col select-none">
      <canvas ref={canvasRef} className="hidden" />

      {/* Top Smartphone Header */}
      <header className="h-14 px-4 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <CorregeLogo />
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#9E0B1A]/30 text-red-300 border border-[#9E0B1A]/50">
            Leitor OMR
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
            STEP 1: SCAN THE REAL QR CODE ON THE TEST
        =================================================================== */}
        {step === 'scan-qr' && (
          <>
            <div className="flex-1 flex flex-col justify-center space-y-4">
              {cameraError && (
                <div className="p-3 bg-rose-950/70 border border-rose-500/50 rounded-2xl flex items-start gap-2.5 text-xs text-rose-200">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{cameraError}</span>
                </div>
              )}

              {/* Native camera photo capture input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => handlePhotoInput(e, 'qr')}
                className="hidden"
              />

              {/* Camera / QR Scanner Viewfinder */}
              <div className="relative bg-slate-900 border-2 border-dashed border-slate-700 rounded-3xl p-4 min-h-[340px] flex flex-col items-center justify-center text-center overflow-hidden">
                {/* 4 Corner QR Alignment Markers */}
                <div className="absolute top-4 left-4 w-7 h-7 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg pointer-events-none z-10" />
                <div className="absolute top-4 right-4 w-7 h-7 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg pointer-events-none z-10" />
                <div className="absolute bottom-4 left-4 w-7 h-7 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg pointer-events-none z-10" />
                <div className="absolute bottom-4 right-4 w-7 h-7 border-b-4 border-r-4 border-emerald-400 rounded-br-lg pointer-events-none z-10" />

                {isCameraActive ? (
                  <div className="w-full h-full flex flex-col items-center justify-center space-y-3">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full max-h-72 object-cover rounded-2xl border border-emerald-500/40 shadow-lg"
                    />
                    <p className="text-xs text-emerald-400 font-bold animate-pulse">
                      Câmera ativa — aponte para o QR Code da prova...
                    </p>
                  </div>
                ) : isProcessing ? (
                  <div className="space-y-3 py-8">
                    <span className="inline-block w-10 h-10 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm font-bold text-emerald-400">
                      Processando Imagem no OpenCV Python...
                    </p>
                    <p className="text-xs text-slate-400">
                      Decodificando QR Code e procurando respostas marcadas
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 py-4 px-2">
                    <div className="w-20 h-20 rounded-3xl bg-slate-800 border border-slate-700 mx-auto flex items-center justify-center text-emerald-400 shadow-inner">
                      <QrCode className="w-10 h-10" />
                    </div>
                    <div className="space-y-1.5">
                      <h1 className="text-lg font-black text-white">
                        Escanear QR Code da Prova
                      </h1>
                      <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                        Aponte a câmera do celular para o QR Code impresso no topo da prova ou do cartão-resposta OMR.
                      </p>
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition cursor-pointer"
                      >
                        <Upload className="w-4 h-4 text-emerald-400" />
                        Abrir Câmera Nativa / Tirar Foto
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Primary Button: Open Camera or Capture Frame */}
            <div className="pt-2 pb-4 space-y-2">
              {!isCameraActive ? (
                <button
                  type="button"
                  onClick={() => openCamera(false)}
                  disabled={isProcessing}
                  className="w-full py-4 px-5 bg-[#9E0B1A] hover:bg-[#850916] active:scale-[0.99] text-white rounded-2xl text-sm font-black shadow-lg shadow-[#9E0B1A]/30 transition flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
                >
                  <Camera className="w-5 h-5" />
                  <span>Abrir Câmera e Ler QR Code</span>
                </button>
              ) : (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => captureFrameAndProcess('qr')}
                    disabled={isProcessing}
                    className="w-full py-4 px-5 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white rounded-2xl text-sm font-black shadow-lg transition flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
                  >
                    <ScanLine className="w-5 h-5" />
                    <span>Capturar e Ler QR Code Agora</span>
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Câmera Nativa</span>
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      Fechar Câmera
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ===================================================================
            STEP 2: SHOW THE SCANNED TEST & SEARCH FOR ANSWERS
        =================================================================== */}
        {step === 'view-test' && (
          <>
            <div className="space-y-3 flex-1 overflow-y-auto pr-0.5">
              {/* Scanned Test Header Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      <QrCode className="w-3 h-3" /> QR Code Lido da Câmera
                    </span>
                    <h2 className="text-sm font-black text-white mt-1.5">
                      {resolvedExamTitle || currentExam?.title || 'Avaliação Institucional'}
                    </h2>
                    <p className="text-xs text-slate-400">
                      {resolvedExamDiscipline || currentExam?.discipline} •{' '}
                      {currentExam?.classGroup}
                    </p>
                    {qrRawString && (
                      <p className="text-[10px] font-mono text-slate-500 mt-1 truncate max-w-[230px]">
                        Payload: {qrRawString}
                      </p>
                    )}
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
                        Estudante
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
                    <span className="text-[10px] text-slate-400 block">
                      Respostas Lidas
                    </span>
                    <span className="font-mono font-bold text-emerald-400">
                      {answeredCount}/{totalQuestions}
                    </span>
                  </div>
                </div>

                {/* Camera Answer Bubble Scanner inside Step 2 */}
                <div className="pt-2 border-t border-slate-800">
                  {isScanningAnswersCamera ? (
                    <div className="space-y-2">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full max-h-56 object-cover rounded-xl border border-emerald-500/40"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => captureFrameAndProcess('answers')}
                          disabled={isProcessing}
                          className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <ScanLine className="w-4 h-4" />
                          <span>Ler Marcações Agora</span>
                        </button>
                        <button
                          type="button"
                          onClick={stopCamera}
                          className="py-2.5 px-3 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                        >
                          Fechar Câmera
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openCamera(true)}
                        disabled={isProcessing}
                        className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Escanear Respostas pela Câmera (OpenCV)</span>
                      </button>

                      <input
                        ref={answersFileInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => handlePhotoInput(e, 'answers')}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => answersFileInputRef.current?.click()}
                        disabled={isProcessing}
                        className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                        title="Tirar foto das respostas"
                      >
                        <Upload className="w-4 h-4 text-emerald-400" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Full Scanned Test Questions List */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-[#9E0B1A]" />
                    Questões da Prova (Caderno {selectedVersionLetter})
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
                        {studentChoice ? (
                          <span className="text-[11px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                            Resposta Lida: {studentChoice}
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-slate-500 bg-slate-800/70 px-2 py-0.5 rounded-md">
                            Sem marcação detectada
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
                    <CheckCircle2 className="w-3.5 h-3.5" /> Prova Corrigida
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
                            <XCircle className="w-3.5 h-3.5" />{' '}
                            {chosen
                              ? `Errou (Marcou ${chosen} • Correta: ${correct})`
                              : `Em Branco (Correta: ${correct})`}
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
