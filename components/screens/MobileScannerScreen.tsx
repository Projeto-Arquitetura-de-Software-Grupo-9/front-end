'use client';

import React, { useState, useRef, useMemo } from 'react';
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
  Check,
  XCircle,
  User,
  BookOpen,
  ArrowLeft,
  AlertCircle,
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

export interface ParsedQrPayload {
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
}

/**
 * Parses any QR Code payload (old or new, JSON or plain string):
 * 1. A4ExamSheet.tsx: {"app":"CORREGE","code":"#CAT-DIR-2026.1","ver":"A","nominal":true,"std":"2024.1.001","pg":1}
 * 2. A4AnswerSheet.tsx: {"app":"CORREGE","exam":"CATDIR20261","ver":"A","nominal":true,"std":"2024.1.001","q":10}
 * 3. QrCodeGraphic.tsx: {"appId":"app-cal-1","vId":"ver-a","ver":"A","code":"#CAL-1-2024.2"}
 * 4. Back-end QrCodeService.ts: {"appId":"CORREGE-V1","vId":"...","ver":"A","code":"#DIR-101","stdId":"...","reg":"2024.1.001","ts":...,"chk":"..."}
 * 5. Back-end ExamPdfService.ts: {"app":"CORREGE","exam":"#DIR-101","ver":"A","pg":1} or {"app":"CORREGE_OMR","code":"#DIR-101","ver":"A","pages":2}
 * 6. Legacy string: "CATOLICA-OMR:V=A:APP=APP1"
 */
function parseAnyQrString(rawText: string): ParsedQrPayload {
  const clean = (rawText || '').trim();
  const embeddedKey: Record<number, Letter> = {};

  try {
    const parsed = JSON.parse(clean);
    if (parsed && typeof parsed === 'object') {
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

      const rawVer = String(
        parsed.ver || parsed.versionLetter || parsed.version || parsed.vId || 'A'
      )
        .toUpperCase()
        .replace('VERSION-', '')
        .replace('VER-', '')
        .replace('CADERNO', '')
        .trim();
      const verLetter = /^[A-Z]$/.test(rawVer) ? rawVer : 'A';

      const reg =
        parsed.reg ||
        parsed.std ||
        parsed.registration ||
        parsed.studentRegistration ||
        parsed.matricula;
      const stdId = parsed.stdId || parsed.studentId || parsed.idAluno;

      return {
        examId: parsed.examId || parsed.idProva || parsed.appId,
        examCode:
          parsed.code ||
          parsed.exam ||
          parsed.examCode ||
          parsed.codigoProva,
        versionId: parsed.vId || parsed.idVersaoProva || parsed.versionId,
        versionLetter: verLetter,
        nominal:
          parsed.nominal !== undefined
            ? Boolean(parsed.nominal)
            : Boolean(reg && String(reg).toUpperCase() !== 'ANON'),
        studentId:
          stdId && String(stdId).toUpperCase() !== 'ANON'
            ? String(stdId)
            : undefined,
        studentRegistration:
          reg && String(reg).toUpperCase() !== 'ANON'
            ? String(reg)
            : undefined,
        totalQuestions: Number(
          parsed.q || parsed.totalQuestions || parsed.pages || 0
        ),
        checksum: parsed.chk,
        embeddedKey,
      };
    }
  } catch {
    // Plain text format below
  }

  const verMatch =
    clean.match(/(?:V|VER|VERSION|CADERNO)\s*[=:-]?\s*([A-E])\b/i) ||
    clean.match(/\b([A-D])\b/);
  const codeMatch = clean.match(/(#[A-Z0-9._-]+|exam-[a-z0-9-]+)/i);

  return {
    examCode: codeMatch ? codeMatch[1] : clean,
    versionLetter: verMatch ? verMatch[1].toUpperCase() : 'A',
    nominal: true,
    embeddedKey,
  };
}

/**
 * Multi-region + Hardware-accelerated QR Code decoder for a photo drawn onto <canvas>.
 */
async function decodeQrFromCanvas(sourceCanvas: HTMLCanvasElement): Promise<string | null> {
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  if (!w || !h) return null;

  // 1. Hardware BarcodeDetector (Android Chrome / iOS WebKit)
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try {
      const Detector = (window as any).BarcodeDetector;
      const detector = new Detector({ formats: ['qr_code'] });
      const barcodes = await detector.detect(sourceCanvas);
      if (Array.isArray(barcodes) && barcodes.length > 0 && barcodes[0]?.rawValue) {
        return String(barcodes[0].rawValue).trim();
      }
    } catch {
      // Fallback to jsQR below
    }
  }

  const tryJsQrRegion = (
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    targetMaxDim = 850
  ): string | null => {
    if (sw < 20 || sh < 20) return null;
    const scale = Math.min(1.5, targetMaxDim / Math.max(sw, sh));
    const dw = Math.max(120, Math.round(sw * scale));
    const dh = Math.max(120, Math.round(sh * scale));

    const tmp = document.createElement('canvas');
    tmp.width = dw;
    tmp.height = dh;
    const tCtx = tmp.getContext('2d', { willReadFrequently: true });
    if (!tCtx) return null;

    tCtx.imageSmoothingEnabled = false;
    tCtx.drawImage(sourceCanvas, sx, sy, sw, sh, 0, 0, dw, dh);
    const imgData = tCtx.getImageData(0, 0, dw, dh);
    const res = jsQR(imgData.data, imgData.width, imgData.height, {
      inversionAttempts: 'attemptBoth',
    });
    return res?.data?.trim() || null;
  };

  // Full photo, center crop, tight center crop, and top-right A4 header crop
  return (
    tryJsQrRegion(0, 0, w, h, 900) ||
    tryJsQrRegion(w * 0.15, h * 0.15, w * 0.7, h * 0.7, 750) ||
    tryJsQrRegion(w * 0.25, h * 0.25, w * 0.5, h * 0.5, 650) ||
    tryJsQrRegion(w * 0.45, 0, w * 0.55, h * 0.5, 750) ||
    tryJsQrRegion(0, 0, w, h * 0.45, 750)
  );
}

/**
 * Pure optical pixel-density analyzer on <canvas> (no mocked data!).
 * Measures actual ink darkness inside the answer sheet grid on the captured photo
 * as a fast client-side fallback when Python OpenCV is unreachable or returns empty.
 */
function detectBubblesOnCanvasClient(
  canvas: HTMLCanvasElement,
  totalQuestions: number
): Record<number, Letter> {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return {};

  const w = canvas.width;
  const h = canvas.height;
  const imgData = ctx.getImageData(0, 0, w, h).data;

  // Build grayscale & local background estimate to cancel camera shadows
  const gray = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const idx = i * 4;
    gray[i] = 0.299 * imgData[idx] + 0.587 * imgData[idx + 1] + 0.114 * imgData[idx + 2];
  }

  const sampleCircleInk = (cx: number, cy: number, radius: number): number => {
    const r = Math.max(4, Math.round(radius));
    const outerR = Math.round(r * 2.2);
    let innerSum = 0;
    let innerCount = 0;
    let ringSum = 0;
    let ringCount = 0;

    const yStart = Math.max(0, Math.floor(cy - outerR));
    const yEnd = Math.min(h - 1, Math.ceil(cy + outerR));
    const xStart = Math.max(0, Math.floor(cx - outerR));
    const xEnd = Math.min(w - 1, Math.ceil(cx + outerR));

    for (let y = yStart; y <= yEnd; y++) {
      const dy = y - cy;
      for (let x = xStart; x <= xEnd; x++) {
        const dx = x - cx;
        const d2 = dx * dx + dy * dy;
        const lum = gray[y * w + x];
        if (d2 <= r * r) {
          innerSum += lum;
          innerCount++;
        } else if (d2 > (r * 1.35) ** 2 && d2 <= outerR * outerR) {
          ringSum += lum;
          ringCount++;
        }
      }
    }

    if (innerCount === 0 || ringCount === 0) return 0;
    const innerAvg = innerSum / innerCount;
    const paperBgAvg = ringSum / ringCount;
    // Relative ink darkness compared to the surrounding paper ring (0..1)
    return Math.max(0, (paperBgAvg - innerAvg) / Math.max(80, paperBgAvg));
  };

  const numCols = totalQuestions <= 40 ? 2 : totalQuestions <= 75 ? 3 : 4;
  const perCol = Math.max(1, Math.ceil(totalQuestions / numCols));

  let bestDetected: Record<number, Letter> = {};

  // Check both A4AnswerSheet.tsx layout and close-up grid framing
  const candidateLayouts = [
    { top: 0.335, rowH: 0.029, left: 0.075, right: 0.925, bStart: 0.10, bEnd: 0.54 },
    { top: 0.365, rowH: 0.032, left: 0.075, right: 0.925, bStart: 0.16, bEnd: 0.82 },
    { top: 0.14, rowH: 0.72 / Math.max(2, perCol), left: 0.05, right: 0.95, bStart: 0.12, bEnd: 0.85 },
  ];

  for (const layout of candidateLayouts) {
    const colWidth = ((layout.right - layout.left) * w) / numCols;
    const rowHeight = Math.max(20, layout.rowH * h);
    const trial: Record<number, Letter> = {};

    for (let qIdx = 0; qIdx < totalQuestions; qIdx++) {
      const qNum = qIdx + 1;
      const col = Math.floor(qIdx / perCol);
      const row = qIdx % perCol;

      const cy = layout.top * h + (row + 0.55) * rowHeight;
      const colX = layout.left * w + col * colWidth;
      const bStartX = colX + colWidth * layout.bStart;
      const bEndX = colX + colWidth * layout.bEnd;
      const stepX = (bEndX - bStartX) / 4;
      const radius = Math.max(6, Math.min(rowHeight * 0.34, stepX * 0.34));

      const scores = LETTERS.map((letter, lIdx) => ({
        letter,
        score: sampleCircleInk(bStartX + lIdx * stepX, cy, radius),
      }));

      scores.sort((a, b) => b.score - a.score);
      const best = scores[0];
      const second = scores[1];
      const medianOther = (scores[1].score + scores[2].score + scores[3].score) / 3;

      if (best.score >= 0.14 && best.score - medianOther >= 0.055 && best.score - second.score >= 0.035) {
        trial[qNum] = best.letter;
      }
    }

    if (Object.keys(trial).length > Object.keys(bestDetected).length) {
      bestDetected = trial;
    }
  }

  return bestDetected;
}

/**
 * Pure deterministic grading function comparing `markedAnswers` against `officialAnswerKey`.
 */
function computeDeterministicGrading(
  markedAnswers: Record<number, Letter>,
  officialAnswerKey: Record<number, Letter>,
  totalQuestions: number,
  maxScore: number
): {
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
} {
  const totalQ = Math.max(1, totalQuestions);
  const pointsPerQuestion = maxScore / totalQ;
  let correctCount = 0;

  const details = Array.from({ length: totalQ }, (_, idx) => {
    const qNum = idx + 1;
    const chosen: Letter | null = markedAnswers[qNum] || null;
    const correct: Letter = officialAnswerKey[qNum] || 'A';
    const isCorrect = Boolean(chosen && chosen === correct);
    if (isCorrect) correctCount++;

    return {
      questionNumber: qNum,
      questionId: `q-${qNum}`,
      chosen,
      correct,
      isCorrect,
      score: isCorrect ? Number(pointsPerQuestion.toFixed(2)) : 0,
    };
  });

  const totalScore = Number(((correctCount / totalQ) * maxScore).toFixed(1));

  return {
    correctCount,
    totalQuestions: totalQ,
    totalScore,
    maxScore,
    details,
  };
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

  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [correctedCount, setCorrectedCount] = useState(0);

  // Real answers detected from the photo (`respostasLidas`)
  const [markedAnswers, setMarkedAnswers] = useState<Record<number, Letter>>({});

  // Official grading result
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

  // Native smartphone camera inputs (`capture="environment"` opens the OS camera directly, not inside the webpage)
  const qrNativeCameraInputRef = useRef<HTMLInputElement | null>(null);
  const correctNativeCameraInputRef = useRef<HTMLInputElement | null>(null);

  const currentExam =
    exams.find((e) => e.id === activeExamId) || selectedExam || exams[0];
  const versions = currentExam?.versions || [];

  const activeVersion = useMemo(() => {
    return (
      versions.find((v) => v.versionLetter === selectedVersionLetter) ||
      versions[0]
    );
  }, [versions, selectedVersionLetter]);

  // Build the real list of test questions for the scanned Caderno
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

  /**
   * Grades and persists the test correction (`POST /api/v1/correcoes` + AppContext)
   * and transitions to Step 3 (`corrected`).
   */
  const executeGradingAndFinish = async (answersToGrade: Record<number, Letter>) => {
    setIsProcessing(true);
    try {
      const maxScoreVal = currentExam?.maxScore || 10.0;
      let grading = computeDeterministicGrading(
        answersToGrade,
        officialAnswerKey,
        totalQuestions,
        maxScoreVal
      );

      // Also run Python grading endpoint if reachable
      try {
        const pyRes = await api.gradeOmrSheet({
          markedAnswers: answersToGrade,
          officialAnswerKey,
          totalQuestions,
          versionLetter: selectedVersionLetter,
          maxScore: maxScoreVal,
        });
        if (pyRes.success && pyRes.grading) {
          grading = pyRes.grading;
        }
      } catch {
        // Use deterministic grading computed above
      }

      setGradingResult(grading);

      const targetStudent = students.find((s) => s.id === selectedStudentId);
      const isNominal = scanMode === 'nominal';
      const versionIdToSave =
        resolvedVersionId ||
        activeVersion?.id ||
        `version-${selectedVersionLetter}`;
      const examIdToSave = resolvedExamId || currentExam?.id;

      const respostasLidasPayload: Record<string, string> = {};
      Object.entries(answersToGrade).forEach(([qNum, letter]) => {
        if (letter) {
          respostasLidasPayload[String(qNum)] = letter;
        }
      });

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
        // Saved locally in AppContext below
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
        message: err?.message || 'Erro ao processar correção.',
      });
    }
  };

  /**
   * Opens the test immediately after a QR Code is decoded from the native camera photo.
   */
  const handleQrDecoded = async (
    rawQrText: string,
    optimizedDataUrl: string,
    photoCanvas: HTMLCanvasElement
  ) => {
    setCameraError(null);

    let parsedQr = parseAnyQrString(rawQrText);
    const verLetter = parsedQr.versionLetter || 'A';

    // Match Exam locally right away so Step 2 (`view-test`) opens immediately
    let matchedExam = currentExam;
    const normalizeCode = (val?: string) =>
      String(val || '')
        .replace(/[^a-zA-Z0-9]/g, '')
        .toLowerCase();

    if (parsedQr.examId || parsedQr.examCode) {
      const targetId = String(parsedQr.examId || '').toLowerCase();
      const targetCode = normalizeCode(parsedQr.examCode);

      const foundLocal = exams.find(
        (ex) =>
          (targetId && ex.id.toLowerCase() === targetId) ||
          (targetCode && normalizeCode(ex.code) === targetCode) ||
          (targetCode && normalizeCode(ex.id) === targetCode) ||
          (targetCode && normalizeCode(ex.code).includes(targetCode)) ||
          (targetCode && targetCode.includes(normalizeCode(ex.code)))
      );
      if (foundLocal) {
        matchedExam = foundLocal;
        setActiveExamId(foundLocal.id);
      }
    }

    // Match Student by ID or Registration from QR Code
    if (parsedQr.studentId || parsedQr.studentRegistration) {
      const foundStudent = students.find(
        (s) =>
          (parsedQr.studentId && s.id === parsedQr.studentId) ||
          (parsedQr.studentRegistration &&
            s.registration.toLowerCase() ===
              String(parsedQr.studentRegistration).toLowerCase())
      );
      if (foundStudent) {
        setSelectedStudentId(foundStudent.id);
        setScanMode('nominal');
      }
    } else if (parsedQr.nominal === false) {
      setScanMode('avulsa');
    }

    const localVer =
      matchedExam?.versions?.find((v) => v.versionLetter === verLetter) ||
      matchedExam?.versions?.[0];

    const qCount =
      parsedQr.totalQuestions ||
      localVer?.questions?.length ||
      matchedExam?.selectedQuestionIds?.length ||
      totalQuestions;

    // Also check if the QR photo already captured the answer bubbles
    const clientBubbles = detectBubblesOnCanvasClient(photoCanvas, qCount);

    setSelectedVersionLetter(verLetter);
    setQrRawString(rawQrText);
    setBackendQuestions([]);
    setBackendAnswerKey({});
    setEmbeddedKeyFromQr(parsedQr.embeddedKey || {});
    setResolvedExamId(parsedQr.examId || matchedExam?.id || '');
    setResolvedVersionId(parsedQr.versionId || localVer?.id || `version-${verLetter}`);
    setResolvedExamTitle(matchedExam?.title || '');
    setResolvedExamDiscipline(matchedExam?.discipline || '');
    setMarkedAnswers(clientBubbles);
    setGradingResult(null);

    // Transition immediately to Step 2 so the user sees the test!
    setStep('view-test');

    addToast({
      type: 'success',
      title: `QR Code Lido: Caderno ${verLetter}`,
      message: `Prova "${matchedExam?.title || 'Avaliação'}" aberta.`,
    });

    // Enrich with Python OpenCV bubble detection + backend exam layout in background
    setIsProcessing(true);
    try {
      const loadedAnswerKey: Record<number, Letter> = {
        ...(localVer?.answerKey as Record<number, Letter>),
        ...(parsedQr.embeddedKey || {}),
      };

      try {
        const omrRes = await api.scanOmrSheet({
          imageBase64: optimizedDataUrl,
          totalQuestions: qCount,
          officialAnswerKey: loadedAnswerKey,
          versionLetter: verLetter,
          maxScore: matchedExam?.maxScore || 10.0,
        });

        const rawDetected = omrRes.respostasLidas || omrRes.markedAnswers;
        if (omrRes.success && rawDetected && Object.keys(rawDetected).length > 0) {
          const realDetected: Record<number, Letter> = {};
          Object.entries(rawDetected).forEach(([k, v]) => {
            const qNum = Number(k);
            if (qNum >= 1 && LETTERS.includes(v as Letter)) {
              realDetected[qNum] = v as Letter;
            }
          });
          if (Object.keys(realDetected).length > 0) {
            setMarkedAnswers(realDetected);
          }
        }
      } catch {
        // Keep clientBubbles if Python endpoint is offline
      }

      const targetExamId = parsedQr.examId || matchedExam?.id;
      if (targetExamId) {
        const layoutDto = await api.getExamLayout(targetExamId, verLetter).catch(() => null);
        if (layoutDto) {
          setResolvedExamTitle(layoutDto.title || matchedExam?.title || '');
          setResolvedExamDiscipline(
            layoutDto.header?.discipline || matchedExam?.discipline || ''
          );
          if (layoutDto.answerKey) {
            const nextKey: Record<number, Letter> = {};
            Object.entries(layoutDto.answerKey).forEach(([k, v]) => {
              const up = String(v).toUpperCase() as Letter;
              if (LETTERS.includes(up)) {
                nextKey[Number(k)] = up;
              }
            });
            if (Object.keys(nextKey).length > 0) {
              setBackendAnswerKey(nextKey);
            }
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
                (layoutDto.answerKey?.[fq.orderIndex || idx + 1] as Letter) ||
                fq.correctAlternative ||
                'A',
            }));
            setBackendQuestions(mappedFromLayout);
          }
        }
      }
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Handles native smartphone camera photo input:
   * - mode === 'qr' (Step 1): Reads the QR Code from the photo taken by the phone camera and opens the test (Step 2).
   * - mode === 'correct-test' (Step 2): Reads the marked answers from the photo taken by the phone camera and IMMEDIATELY corrects the test (Step 3).
   */
  const handleNativeCameraPhoto = (
    e: React.ChangeEvent<HTMLInputElement>,
    mode: 'qr' | 'correct-test'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCameraError(null);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = () => {
      const rawDataUrl = reader.result;
      if (typeof rawDataUrl !== 'string') {
        setIsProcessing(false);
        return;
      }

      const img = new Image();
      img.onload = async () => {
        const maxDim = 1400;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
        const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.85);

        if (mode === 'qr') {
          const qrText = await decodeQrFromCanvas(canvas);
          if (qrText) {
            setIsProcessing(false);
            await handleQrDecoded(qrText, optimizedDataUrl, canvas);
            return;
          }

          try {
            const res = await api.scanOmrSheet({
              imageBase64: optimizedDataUrl,
              totalQuestions,
              officialAnswerKey,
              versionLetter: selectedVersionLetter,
              maxScore: currentExam?.maxScore || 10.0,
            });
            setIsProcessing(false);
            if (res.success && res.qrDetected && res.qrRaw) {
              await handleQrDecoded(res.qrRaw, optimizedDataUrl, canvas);
            } else {
              setCameraError(
                'Nenhum QR Code foi encontrado na foto. Aponte a câmera para o QR Code no canto superior direito da prova.'
              );
            }
          } catch {
            setIsProcessing(false);
            setCameraError(
              'Não foi possível ler o QR Code na foto. Aproxime a câmera do QR Code da prova e tente novamente.'
            );
          }
        } else {
          // mode === 'correct-test': Scan the marked answers from the photo and immediately correct the test!
          let detectedFromPhoto: Record<number, Letter> = {
            ...markedAnswers,
          };

          // 1. Client-side optical bubble analysis on the photo canvas
          const clientDetected = detectBubblesOnCanvasClient(canvas, totalQuestions);
          Object.entries(clientDetected).forEach(([k, v]) => {
            const qNum = Number(k);
            if (qNum >= 1 && LETTERS.includes(v as Letter)) {
              detectedFromPhoto[qNum] = v as Letter;
            }
          });

          // 2. Python OpenCV optical bubble analysis (/api/omr)
          try {
            const res = await api.scanOmrSheet({
              imageBase64: optimizedDataUrl,
              totalQuestions,
              officialAnswerKey,
              versionLetter: selectedVersionLetter,
              maxScore: currentExam?.maxScore || 10.0,
            });
            const pyAnswers = res.respostasLidas || res.markedAnswers || {};
            Object.entries(pyAnswers).forEach(([k, v]) => {
              const qNum = Number(k);
              if (qNum >= 1 && LETTERS.includes(v as Letter)) {
                detectedFromPhoto[qNum] = v as Letter;
              }
            });
          } catch {
            // Proceed with client-side optical detection + any answers selected on screen
          }

          setMarkedAnswers(detectedFromPhoto);

          // Immediately grade & correct the test with the answers found!
          await executeGradingAndFinish(detectedFromPhoto);
        }
      };
      img.onerror = () => {
        setIsProcessing(false);
        setCameraError('Erro ao carregar a foto da câmera.');
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleScanNextTest = () => {
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
      {/* Hidden Native Smartphone Camera Inputs (Opens OS Camera directly, never inside the webpage) */}
      <input
        ref={qrNativeCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => handleNativeCameraPhoto(e, 'qr')}
        className="hidden"
      />
      <input
        ref={correctNativeCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => handleNativeCameraPhoto(e, 'correct-test')}
        className="hidden"
      />

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
            STEP 1: OPEN NATIVE PHONE CAMERA TO SCAN THE QR CODE
        =================================================================== */}
        {step === 'scan-qr' && (
          <>
            <div className="flex-1 flex flex-col justify-center space-y-4">
              {cameraError && (
                <div className="p-3.5 bg-rose-950/70 border border-rose-500/50 rounded-2xl flex items-start gap-2.5 text-xs text-rose-200">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{cameraError}</span>
                </div>
              )}

              <div className="relative bg-slate-900 border-2 border-dashed border-slate-700 rounded-3xl p-6 min-h-[300px] flex flex-col items-center justify-center text-center overflow-hidden">
                <div className="absolute top-4 left-4 w-7 h-7 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg pointer-events-none" />
                <div className="absolute top-4 right-4 w-7 h-7 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg pointer-events-none" />
                <div className="absolute bottom-4 left-4 w-7 h-7 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg pointer-events-none" />
                <div className="absolute bottom-4 right-4 w-7 h-7 border-b-4 border-r-4 border-emerald-400 rounded-br-lg pointer-events-none" />

                {isProcessing ? (
                  <div className="space-y-3 py-8">
                    <span className="inline-block w-10 h-10 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm font-bold text-emerald-400">
                      Lendo QR Code da Foto...
                    </p>
                    <p className="text-xs text-slate-400">
                      Identificando prova e caderno
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
                        Toque no botão abaixo para abrir a câmera do celular e fotografar o QR Code impresso na prova ou no cartão-resposta.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Primary Button: Opens Native Phone Camera directly */}
            <div className="pt-2 pb-4">
              <button
                type="button"
                onClick={() => qrNativeCameraInputRef.current?.click()}
                disabled={isProcessing}
                className="w-full py-4 px-5 bg-[#9E0B1A] hover:bg-[#850916] active:scale-[0.99] text-white rounded-2xl text-sm font-black shadow-lg shadow-[#9E0B1A]/30 transition flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
              >
                <Camera className="w-5 h-5" />
                <span>Abrir Câmera e Ler QR Code</span>
              </button>
            </div>
          </>
        )}

        {/* ===================================================================
            STEP 2: SHOW THE SCANNED TEST & OPEN NATIVE CAMERA TO CORRECT IT
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
                            Aguardando leitura
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

            {/* Bottom Action Buttons: Opens Native Phone Camera to Scan & Correct the Test */}
            <div className="pt-2 pb-4 space-y-2 sticky bottom-0 bg-slate-950/95 backdrop-blur-md">
              <button
                type="button"
                onClick={() => correctNativeCameraInputRef.current?.click()}
                disabled={isProcessing}
                className="w-full py-4 px-5 bg-[#9E0B1A] hover:bg-[#850916] active:scale-[0.99] text-white rounded-2xl text-sm font-black shadow-lg shadow-[#9E0B1A]/30 transition flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
              >
                <Camera className="w-5 h-5" />
                <span>
                  {isProcessing
                    ? 'Lendo e Corrigindo Prova...'
                    : 'Abrir Câmera e Corrigir Prova'}
                </span>
              </button>

              {answeredCount > 0 && (
                <button
                  type="button"
                  onClick={() => executeGradingAndFinish(markedAnswers)}
                  disabled={isProcessing}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white rounded-xl text-xs font-black shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    Concluir Correção com Respostas Lidas ({answeredCount}/{totalQuestions})
                  </span>
                </button>
              )}

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
