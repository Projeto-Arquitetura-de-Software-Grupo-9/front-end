'use client';

import React, { useState, useRef, useMemo, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { api, mapBackendExam } from '@/lib/api';
import { CorregeLogo } from '@/components/common/CorregeLogo';
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
  AlertTriangle,
  Eye,
  Upload,
  PenTool,
} from 'lucide-react';
import { Letter, LETTERS, ParsedQrData } from '@/lib/qrCode';
import { Exam } from '@/lib/types';
import {
  decodeQrWithHiResFallback,
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
  normalizeExamCode,
  ResolvedExamQuestionMeta,
  DeterministicGradeOutput,
} from '@/lib/omrScannerFlow';

type MobileStep = 'scan-qr' | 'view-test' | 'corrected';

interface ResolvedMobileExam {
  exam: Exam;
  qr: ParsedQrData;
  versionLetter: string;
  examVersionId: string;
  answerKey: Record<number, Letter>;
  questionLetters: Record<number, Letter[]>;
  objectiveQuestions: ResolvedExamQuestionMeta[];
  discursiveQuestions: ResolvedExamQuestionMeta[];
  maxScore: number;
  questionAlternativesMap: Record<number, Array<{ letter: Letter; text: string }>>;
}

export const MobileScannerScreen: React.FC = () => {
  const {
    exams,
    setActiveExamId,
    questions: questionBank,
    students,
    addCorrection,
    addToast,
    logout,
  } = useApp();

  const [step, setStep] = useState<MobileStep>('scan-qr');
  const [resolved, setResolved] = useState<ResolvedMobileExam | null>(null);
  const [scanMode, setScanMode] = useState<'nominal' | 'avulsa'>('avulsa');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [manualStudentName, setManualStudentName] = useState<string>('');
  const [manualStudentReg, setManualStudentReg] = useState<string>('');
  const [qrRawString, setQrRawString] = useState<string | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [correctedCount, setCorrectedCount] = useState(0);

  // Real answers detected by OMR (`null` = blank/rasura — NEVER guessed)
  const [markedAnswers, setMarkedAnswers] = useState<Record<number, Letter | null>>({});
  const [ambiguousQuestions, setAmbiguousQuestions] = useState<number[]>([]);
  const [discursiveScores, setDiscursiveScores] = useState<Record<string, number>>({});
  const [omrAnalysis, setOmrAnalysis] = useState<OmrAnalysisResult | null>(null);
  const [verificationPreviewUrl, setVerificationPreviewUrl] = useState<string | null>(null);
  const [showPreviewImg, setShowPreviewImg] = useState<boolean>(false);

  const [gradingResult, setGradingResult] = useState<DeterministicGradeOutput | null>(null);

  // Native smartphone camera inputs + gallery fallback
  const qrNativeCameraInputRef = useRef<HTMLInputElement | null>(null);
  const qrGalleryInputRef = useRef<HTMLInputElement | null>(null);
  const correctNativeCameraInputRef = useRef<HTMLInputElement | null>(null);

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

  const buildAlternativesMap = useCallback(
    (
      exam: Exam,
      versionLetter: string,
      objectiveQuestions: ResolvedExamQuestionMeta[]
    ): Record<number, Array<{ letter: Letter; text: string }>> => {
      const map: Record<number, Array<{ letter: Letter; text: string }>> = {};
      const ver = (exam.versions || []).find(
        (v) => v.versionLetter.toUpperCase() === versionLetter.toUpperCase()
      );

      objectiveQuestions.forEach((oq) => {
        const vq = ver?.questions?.find(
          (item) =>
            item.originalQuestionId === oq.questionId || item.orderIndex === oq.questionNumber
        );
        if (vq?.alternatives && vq.alternatives.length > 0) {
          map[oq.questionNumber] = vq.alternatives.map((a) => ({
            letter: a.letter as Letter,
            text: a.text,
          }));
          return;
        }
        const bq = questionBank.find((item) => item.id === oq.questionId);
        if (bq?.alternatives && bq.alternatives.length > 0) {
          map[oq.questionNumber] = bq.alternatives.map((a) => ({
            letter: a.letter as Letter,
            text: a.text,
          }));
          return;
        }
        map[oq.questionNumber] = oq.letters.map((letter) => ({
          letter,
          text: `Alternativa ${letter}`,
        }));
      });

      return map;
    },
    [questionBank]
  );

  const executeGradingAndFinish = useCallback(
    async (
      target: ResolvedMobileExam,
      answersToGrade: Record<number, Letter | null>,
      ambiguousList: number[],
      discScores: Record<string, number>
    ) => {
      setIsProcessing(true);
      try {
        const grading = gradeExamDeterministically({
          objectiveQuestions: target.objectiveQuestions,
          discursiveQuestions: target.discursiveQuestions,
          markedAnswers: answersToGrade,
          ambiguousQuestions: ambiguousList,
          discursiveScores: discScores,
          maxScore: target.maxScore,
        });

        setGradingResult(grading);

        const matchedStudent = selectedStudentId
          ? students.find((s) => s.id === selectedStudentId)
          : undefined;
        const isNominal = scanMode === 'nominal';
        const finalStudentId = matchedStudent?.id;
        const finalName = matchedStudent?.name || manualStudentName.trim() || undefined;
        const finalReg = matchedStudent?.registration || manualStudentReg.trim() || undefined;

        const respostasLidasPayload: Record<string, string> = {};
        Object.entries(answersToGrade).forEach(([qNum, letter]) => {
          if (letter) {
            respostasLidasPayload[String(qNum)] = letter;
          }
        });
        Object.entries(discScores).forEach(([qId, score]) => {
          respostasLidasPayload[`desc_${qId}`] = String(score);
        });

        setCameraError(null);
        const savedRemote = await api.createCorrecao({
          idVersaoProva: target.examVersionId,
          idProva: target.exam.id,
          versaoMarcada: target.versionLetter,
          idAluno: finalStudentId,
          nomeManuscrito: !isNominal && finalName ? finalName : undefined,
          matriculaManuscrita: !isNominal && finalReg ? finalReg : undefined,
          notaTotal: grading.totalScore,
          respostasLidas: respostasLidasPayload,
          atribuicaoAutomatica: Boolean(isNominal && finalStudentId),
        });

        addCorrection({
          id: savedRemote?.id ? String(savedRemote.id) : undefined,
          confirmedAt: savedRemote?.dataConfirmacao
            ? String(savedRemote.dataConfirmacao)
            : undefined,
          applicationId: target.exam.id,
          examVersionId: savedRemote?.idVersaoProva
            ? String(savedRemote.idVersaoProva)
            : target.examVersionId,
          versionLetter: target.versionLetter,
          studentId: finalStudentId,
          studentName: finalName,
          registration: finalReg,
          reportedStudentName: !isNominal && finalName ? finalName : undefined,
          reportedStudentRegistration: !isNominal && finalReg ? finalReg : undefined,
          objectiveResults: grading.objectiveResults.map((d) => ({
            questionId: d.questionId,
            chosen: d.chosen,
            correct: d.correct,
            isCorrect: d.isCorrect,
            score: d.score,
          })),
          discursiveScores: grading.discursiveResults.map((d) => ({
            questionId: d.questionId,
            score: d.score,
          })),
          totalScore: grading.totalScore,
          maxScore: grading.maxScore,
          isAutomaticallyAssigned: Boolean(isNominal && finalStudentId),
          syncStatus: 'synced',
        });

        setStep('corrected');
        setCorrectedCount((prev) => prev + 1);

        addToast({
          type: 'success',
          title: `Correção Salva no Banco! Nota: ${grading.totalScore.toFixed(1)}`,
          message: `${grading.correctCount} de ${grading.totalObjectiveQuestions} acertos objetivos.`,
        });
      } catch (err: any) {
        const msg =
          err?.name === 'AbortError'
            ? 'Tempo limite excedido ao salvar a correção no banco. Tente novamente.'
            : err?.message || 'Não foi possível salvar a correção no banco de dados.';
        setCameraError(msg);
        addToast({
          type: 'error',
          title: 'Erro ao Salvar no Banco',
          message: msg,
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [selectedStudentId, students, scanMode, manualStudentName, manualStudentReg, addCorrection, addToast]
  );

  /**
   * Handles native smartphone camera / gallery photo input:
   * - mode === 'qr' (Step 1): Strictly validates Correge QR + looks up exact exam in DB (NO fallbacks!).
   * - mode === 'correct-test' (Step 2): Runs real pure-TS OMR bubble recognition on the photographed answer sheet.
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
        setCameraError('Não foi possível ler a imagem capturada.');
        return;
      }

      const img = new Image();
      img.onload = async () => {
        try {
          const maxDim = 1600;
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) {
            setCameraError('Erro ao preparar imagem para leitura óptica.');
            return;
          }
          // Redução de alta qualidade: com a suavização padrão a foto de ~4000px fica serrilhada e o OMR perde os cantos e as bolhas
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          if (mode === 'qr') {
            // 1. Decode QR strictly
            const decodedQr = await decodeQrWithHiResFallback(canvas, img);
            if (!decodedQr) {
              setCameraError(
                'Nenhum QR Code foi encontrado na foto. Aproxime a câmera do QR Code oficial no topo da prova ou do cartão-resposta.'
              );
              return;
            }

            // 2. Validate Correge institutional QR format
            const qrCheck = validateCorregeQrRaw(decodedQr.raw);
            if (!qrCheck.ok || !qrCheck.parsed) {
              setCameraError(qrCheck.error || 'QR Code inválido.');
              return;
            }

            // 3. Strictly resolve exam from local state or backend DB (ZERO fallback to another exam!)
            const examRes = await resolveExamStrictly(
              qrCheck.parsed,
              exams,
              async () => (await api.getExams()).map(mapBackendExam)
            );
            if (!examRes.ok || !examRes.exam) {
              setCameraError(examRes.error || 'Prova não encontrada no sistema.');
              return;
            }

            // 4. Strictly resolve Caderno version & official answer key (ZERO guessed/default keys!)
            const keyRes = await resolveVersionAndKeyStrictly(
              examRes.exam,
              qrCheck.parsed.versionLetter,
              questionBank,
              fetchBackendExamLayout
            );
            if (
              !keyRes.ok ||
              !keyRes.answerKey ||
              !keyRes.objectiveQuestions ||
              !keyRes.questionLetters
            ) {
              setCameraError(keyRes.error || 'Gabarito oficial não encontrado.');
              return;
            }

            const altMap = buildAlternativesMap(
              examRes.exam,
              keyRes.versionLetter!,
              keyRes.objectiveQuestions
            );

            const resolvedData: ResolvedMobileExam = {
              exam: examRes.exam,
              qr: qrCheck.parsed,
              versionLetter: keyRes.versionLetter!,
              examVersionId: keyRes.examVersionId!,
              answerKey: keyRes.answerKey,
              questionLetters: keyRes.questionLetters,
              objectiveQuestions: keyRes.objectiveQuestions,
              discursiveQuestions: keyRes.discursiveQuestions || [],
              maxScore: keyRes.maxScore || examRes.exam.maxScore || 10,
              questionAlternativesMap: altMap,
            };

            setResolved(resolvedData);
            setActiveExamId(examRes.exam.id);
            setQrRawString(decodedQr.raw);
            setGradingResult(null);
            setDiscursiveScores({});

            // Match student strictly (never force students[0] on avulsa!)
            const matchedStudent = resolveStudentFromQr(qrCheck.parsed, students);
            if (qrCheck.parsed.nominal) {
              setScanMode('nominal');
              setSelectedStudentId(matchedStudent?.id || '');
              setManualStudentName(matchedStudent?.name || qrCheck.parsed.studentName || '');
              setManualStudentReg(
                matchedStudent?.registration || qrCheck.parsed.studentRegistration || ''
              );
            } else {
              setScanMode('avulsa');
              setSelectedStudentId('');
              setManualStudentName('');
              setManualStudentReg('');
            }

            // Check if the Step 1 photo ALSO contains a readable answer sheet bubble grid
            const { analysis, orientedCanvas } = analyzeAnswerSheetCanvas(canvas, {
              totalQuestions: resolvedData.objectiveQuestions.length,
              questionLetters: resolvedData.questionLetters,
              qrLocation: decodedQr.location,
              rotationQuarterTurns: decodedQr.rotationQuarterTurns,
            });

            if (analysis.sheetDetected) {
              setOmrAnalysis(analysis);
              setMarkedAnswers(analysis.markedAnswers);
              setAmbiguousQuestions(analysis.ambiguousQuestions);
              setVerificationPreviewUrl(renderOmrVerificationDataUrl(orientedCanvas, analysis));
            } else {
              setOmrAnalysis(null);
              setMarkedAnswers({});
              setAmbiguousQuestions([]);
              setVerificationPreviewUrl(null);
            }

            setStep('view-test');

            addToast({
              type: 'success',
              title: `QR Code Lido: Caderno ${resolvedData.versionLetter}`,
              message: analysis.sheetDetected
                ? `Prova "${resolvedData.exam.title}" aberta com leitura óptica do gabarito.`
                : `Prova "${resolvedData.exam.title}" aberta. Agora fotografe o cartão-resposta.`,
            });
          } else {
            // mode === 'correct-test': Read answer bubbles strictly from photographed answer sheet
            if (!resolved) {
              setCameraError('Nenhuma prova identificada. Leia o QR Code primeiro.');
              return;
            }

            // If this photo also contains a QR code, verify it belongs to the SAME exam & Caderno!
            const decodedQr = await decodeQrWithHiResFallback(canvas, img);
            if (decodedQr) {
              const qrCheck = validateCorregeQrRaw(decodedQr.raw);
              if (qrCheck.ok && qrCheck.parsed) {
                const sameId =
                  qrCheck.parsed.examId && qrCheck.parsed.examId === resolved.exam.id;
                const sameCode =
                  normalizeExamCode(qrCheck.parsed.examCode) &&
                  normalizeExamCode(qrCheck.parsed.examCode) ===
                    normalizeExamCode(resolved.exam.code);
                if (!sameId && !sameCode) {
                  setCameraError(
                    `O QR Code desta folha (${qrCheck.parsed.examCode || qrCheck.parsed.examId}) pertence a OUTRA prova diferente de "${resolved.exam.title}". Volte ao Passo 1 para escanear esta prova.`
                  );
                  return;
                }
                if (
                  qrCheck.parsed.versionLetter &&
                  qrCheck.parsed.versionLetter.toUpperCase() !==
                    resolved.versionLetter.toUpperCase()
                ) {
                  setCameraError(
                    `Caderno divergente: o cartão-resposta fotografado é do Caderno ${qrCheck.parsed.versionLetter}, mas a prova aberta é do Caderno ${resolved.versionLetter}.`
                  );
                  return;
                }
              }
            }

            const { analysis, orientedCanvas } = analyzeAnswerSheetCanvas(canvas, {
              totalQuestions: resolved.objectiveQuestions.length,
              questionLetters: resolved.questionLetters,
              qrLocation: decodedQr?.location || null,
              rotationQuarterTurns: decodedQr?.rotationQuarterTurns || 0,
            });

            if (!analysis.sheetDetected) {
              setCameraError(
                analysis.error ||
                  'Não foi possível ler as bolhas do cartão-resposta na foto. Enquadre toda a grade de respostas em local bem iluminado e tente novamente.'
              );
              return;
            }

            setOmrAnalysis(analysis);
            setMarkedAnswers(analysis.markedAnswers);
            setAmbiguousQuestions(analysis.ambiguousQuestions);
            setVerificationPreviewUrl(renderOmrVerificationDataUrl(orientedCanvas, analysis));

            // If rasura/ambiguous or discursive questions exist, let teacher confirm on Step 2 before finalizing
            if (
              analysis.ambiguousQuestions.length > 0 ||
              resolved.discursiveQuestions.length > 0
            ) {
              setShowPreviewImg(true);
              addToast({
                type: 'warning',
                title: 'Conferência Necessária Antes de Finalizar',
                message:
                  analysis.ambiguousQuestions.length > 0
                    ? `Rasura/dupla marcação detectada nas questões ${analysis.ambiguousQuestions
                        .map((q) => `Q${q}`)
                        .join(', ')}. Revise e toque em Concluir Correção.`
                    : 'Gabarito objetivo lido! Informe as notas das questões discursivas abaixo e toque em Concluir Correção.',
              });
              return;
            }

            await executeGradingAndFinish(
              resolved,
              analysis.markedAnswers,
              analysis.ambiguousQuestions,
              discursiveScores
            );
          }
        } finally {
          setIsProcessing(false);
        }
      };

      img.onerror = () => {
        setIsProcessing(false);
        setCameraError('Erro ao carregar a foto capturada.');
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleScanNextTest = () => {
    setStep('scan-qr');
    setResolved(null);
    setGradingResult(null);
    setMarkedAnswers({});
    setAmbiguousQuestions([]);
    setDiscursiveScores({});
    setOmrAnalysis(null);
    setVerificationPreviewUrl(null);
    setShowPreviewImg(false);
    setQrRawString(null);
    setCameraError(null);
    setSelectedStudentId('');
    setManualStudentName('');
    setManualStudentReg('');
  };

  const currentStudent = useMemo(
    () => (selectedStudentId ? students.find((s) => s.id === selectedStudentId) : null),
    [students, selectedStudentId]
  );

  const answeredCount = useMemo(
    () => Object.values(markedAnswers).filter((v) => v !== null && v !== undefined).length,
    [markedAnswers]
  );

  const totalObjective = resolved?.objectiveQuestions.length || 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col select-none">
      {/* Hidden Native Smartphone Camera Inputs + Gallery Picker */}
      <input
        ref={qrNativeCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => handleNativeCameraPhoto(e, 'qr')}
        className="hidden"
      />
      <input
        ref={qrGalleryInputRef}
        type="file"
        accept="image/*"
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
            <span>Ler Gabarito</span>
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
        {/* STEP 1: SCAN QR CODE */}
        {step === 'scan-qr' && (
          <>
            <div className="flex-1 flex flex-col justify-center space-y-4">
              {cameraError && (
                <div className="p-3.5 bg-rose-950/70 border border-rose-500/50 rounded-2xl flex items-start gap-2.5 text-xs text-rose-200">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{cameraError}</span>
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
                      Validando QR Code no Sistema...
                    </p>
                    <p className="text-xs text-slate-400">
                      Verificando prova cadastrada e gabarito oficial
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
                        Fotografe o cartão-resposta oficial do Correge. O sistema valida a prova no
                        banco de dados antes de realizar a leitura óptica das bolhas.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 pb-4 space-y-2">
              <button
                type="button"
                onClick={() => qrNativeCameraInputRef.current?.click()}
                disabled={isProcessing}
                className="w-full py-4 px-5 bg-[#9E0B1A] hover:bg-[#850916] active:scale-[0.99] text-white rounded-2xl text-sm font-black shadow-lg shadow-[#9E0B1A]/30 transition flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
              >
                <Camera className="w-5 h-5" />
                <span>Abrir Câmera e Ler QR Code</span>
              </button>

              <button
                type="button"
                onClick={() => qrGalleryInputRef.current?.click()}
                disabled={isProcessing}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                <span>Selecionar Foto da Galeria</span>
              </button>
            </div>
          </>
        )}

        {/* STEP 2: VIEW MATCHED EXAM & SCAN/REVIEW ANSWER SHEET */}
        {step === 'view-test' && resolved && (
          <>
            <div className="space-y-3 flex-1 overflow-y-auto pr-0.5">
              {cameraError && (
                <div className="p-3.5 bg-rose-950/70 border border-rose-500/50 rounded-2xl flex items-start gap-2.5 text-xs text-rose-200">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{cameraError}</span>
                </div>
              )}

              {/* Scanned Test Header Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      <QrCode className="w-3 h-3" /> Prova Confirmada
                    </span>
                    <h2 className="text-sm font-black text-white mt-1.5 truncate">
                      {resolved.exam.title}
                    </h2>
                    <p className="text-xs text-slate-400">
                      {resolved.exam.discipline} • {resolved.exam.code}
                    </p>
                    {qrRawString && (
                      <p className="text-[10px] font-mono text-slate-500 mt-1 truncate max-w-[220px]">
                        QR: {qrRawString}
                      </p>
                    )}
                  </div>

                  <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-[#9E0B1A] text-white shrink-0">
                    CADERNO {resolved.versionLetter}
                  </span>
                </div>

                {/* Student identification */}
                <div className="pt-2.5 border-t border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 shrink-0">
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] text-slate-400 block">
                          {scanMode === 'nominal' ? 'Estudante (Nominal)' : 'Estudante (Folha Avulsa)'}
                        </span>
                        <select
                          value={selectedStudentId}
                          onChange={(e) => {
                            const id = e.target.value;
                            setSelectedStudentId(id);
                            const st = students.find((s) => s.id === id);
                            if (st) {
                              setManualStudentName(st.name);
                              setManualStudentReg(st.registration);
                            }
                          }}
                          className="w-full bg-transparent font-bold text-white text-xs focus:outline-none cursor-pointer truncate"
                        >
                          <option value="" className="bg-slate-900 text-slate-300">
                            Pendente de atribuição (Folha Avulsa)
                          </option>
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
                      <span className="text-[10px] text-slate-400 block">Marcadas</span>
                      <span className="font-mono font-bold text-emerald-400">
                        {answeredCount}/{totalObjective}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* OMR Detection Summary & Visual Overlay */}
              {omrAnalysis && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5" />
                      OMR Lido ({Math.round(omrAnalysis.overallConfidence * 100)}% conf.)
                    </span>
                    {verificationPreviewUrl && (
                      <button
                        type="button"
                        onClick={() => setShowPreviewImg((v) => !v)}
                        className="text-[11px] font-bold text-amber-300 hover:underline cursor-pointer"
                      >
                        {showPreviewImg ? 'Ocultar Foto' : 'Ver Marcações'}
                      </button>
                    )}
                  </div>
                  {showPreviewImg && verificationPreviewUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={verificationPreviewUrl}
                      alt="Verificação óptica das bolhas"
                      className="w-full max-h-60 object-contain rounded-xl border border-slate-800 bg-black"
                    />
                  )}
                </div>
              )}

              {/* Ambiguous / Rasura alert */}
              {ambiguousQuestions.length > 0 && (
                <div className="p-3 bg-amber-950/60 border border-amber-500/50 rounded-2xl flex items-start gap-2 text-xs text-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    Possível rasura/dupla marcação em:{' '}
                    <strong>{ambiguousQuestions.map((q) => `Q${q}`).join(', ')}</strong>. Deixadas
                    sem marcação automática — ajuste abaixo se necessário.
                  </span>
                </div>
              )}

              {/* Objective Questions List */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-[#9E0B1A]" />
                    Questões Objetivas ({totalObjective})
                  </span>
                </div>

                {resolved.objectiveQuestions.map((q) => {
                  const qNum = q.questionNumber;
                  const studentChoice = markedAnswers[qNum] ?? null;
                  const isAmbiguous = ambiguousQuestions.includes(qNum) && studentChoice === null;
                  const alts = resolved.questionAlternativesMap[qNum] || [];

                  return (
                    <div
                      key={q.questionId || qNum}
                      className={`bg-slate-900 border rounded-2xl p-3.5 space-y-2.5 ${
                        isAmbiguous ? 'border-amber-500/70' : 'border-slate-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-black text-white bg-slate-800 px-2 py-0.5 rounded-md font-mono">
                          Questão {qNum < 10 ? `0${qNum}` : qNum}
                        </span>
                        {isAmbiguous ? (
                          <span className="text-[11px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/40 px-2 py-0.5 rounded-md">
                            Rasura / Dupla Marcação
                          </span>
                        ) : studentChoice ? (
                          <span className="text-[11px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                            Lida: {studentChoice}
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-slate-400 bg-slate-800/70 px-2 py-0.5 rounded-md">
                            Em branco
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-200 leading-relaxed">{q.statement}</p>

                      <div className="space-y-1.5 pt-1">
                        {alts.map((alt) => {
                          const isSelected = studentChoice === alt.letter;
                          return (
                            <button
                              key={alt.letter}
                              type="button"
                              onClick={() => {
                                setMarkedAnswers((prev) => ({
                                  ...prev,
                                  [qNum]: isSelected ? null : alt.letter,
                                }));
                                if (isAmbiguous) {
                                  setAmbiguousQuestions((prev) =>
                                    prev.filter((item) => item !== qNum)
                                  );
                                }
                              }}
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

              {/* Discursive Questions (if any) */}
              {resolved.discursiveQuestions.length > 0 && (
                <div className="space-y-2.5 pt-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5 px-1">
                    <PenTool className="w-3.5 h-3.5" />
                    Questões Discursivas ({resolved.discursiveQuestions.length})
                  </span>
                  {resolved.discursiveQuestions.map((dq) => {
                    const maxPts = Number(dq.maxScore.toFixed(2)) || 1;
                    const assigned = discursiveScores[dq.questionId] ?? 0;
                    return (
                      <div
                        key={dq.questionId}
                        className="bg-slate-900 border border-amber-500/40 rounded-2xl p-3.5 space-y-2"
                      >
                        <p className="text-xs font-bold text-white">
                          Questão {dq.questionNumber} (máx {maxPts} pts)
                        </p>
                        <p className="text-xs text-slate-300">{dq.statement}</p>
                        <input
                          type="number"
                          min={0}
                          max={maxPts}
                          step={0.1}
                          value={assigned}
                          onChange={(e) => {
                            const v = Math.max(0, Math.min(maxPts, Number(e.target.value) || 0));
                            setDiscursiveScores((prev) => ({ ...prev, [dq.questionId]: v }));
                          }}
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono font-bold"
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Action Buttons */}
            <div className="pt-2 pb-4 space-y-2 sticky bottom-0 bg-slate-950/95 backdrop-blur-md">
              <button
                type="button"
                onClick={() => correctNativeCameraInputRef.current?.click()}
                disabled={isProcessing}
                className="w-full py-4 px-5 bg-[#9E0B1A] hover:bg-[#850916] active:scale-[0.99] text-white rounded-2xl text-sm font-black shadow-lg shadow-[#9E0B1A]/30 transition flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
              >
                <Camera className="w-5 h-5" />
                <span>
                  {isProcessing ? 'Lendo Gabarito (OMR)...' : 'Abrir Câmera e Ler Gabarito'}
                </span>
              </button>

              {(omrAnalysis || answeredCount > 0) && (
                <button
                  type="button"
                  onClick={() =>
                    executeGradingAndFinish(
                      resolved,
                      markedAnswers,
                      ambiguousQuestions,
                      discursiveScores
                    )
                  }
                  disabled={isProcessing}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white rounded-xl text-xs font-black shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    Confirmar e Salvar Correção ({answeredCount}/{totalObjective} respondidas)
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

        {/* STEP 3: CORRECTED SUMMARY */}
        {step === 'corrected' && resolved && gradingResult && (
          <>
            <div className="space-y-3 flex-1 overflow-y-auto pr-0.5">
              <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-4 flex items-center justify-between">
                <div className="space-y-0.5 min-w-0">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Prova Corrigida
                  </span>
                  <h2 className="text-sm font-black text-white truncate">
                    {currentStudent?.name || manualStudentName || 'Folha Avulsa (Pendente)'}
                  </h2>
                  <p className="text-xs text-slate-300 font-mono">
                    {currentStudent?.registration || manualStudentReg || 'Sem matrícula'} • Caderno{' '}
                    {resolved.versionLetter}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-3xl font-black text-emerald-400">
                    {gradingResult.totalScore.toFixed(1)}
                    <span className="text-xs text-slate-400 font-normal">
                      /{gradingResult.maxScore.toFixed(0)}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-300">
                    {gradingResult.correctCount}/{gradingResult.totalObjectiveQuestions} acertos
                  </span>
                </div>
              </div>

              <div className="space-y-2.5">
                {resolved.objectiveQuestions.map((q) => {
                  const detail = gradingResult.objectiveResults.find(
                    (d) => d.questionNumber === q.questionNumber
                  );
                  const isCorrect = detail?.isCorrect ?? false;
                  const chosen = detail?.chosen ?? null;
                  const correct = detail?.correct || q.correctLetter!;
                  const alts = resolved.questionAlternativesMap[q.questionNumber] || [];

                  return (
                    <div
                      key={q.questionId || q.questionNumber}
                      className={`bg-slate-900 border rounded-2xl p-3.5 space-y-2.5 ${
                        isCorrect
                          ? 'border-emerald-500/40'
                          : chosen === null
                          ? 'border-slate-700'
                          : 'border-rose-500/40'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-black text-white bg-slate-800 px-2 py-0.5 rounded-md font-mono">
                          Questão {q.questionNumber < 10 ? `0${q.questionNumber}` : q.questionNumber}
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

                      <p className="text-xs text-slate-300 leading-relaxed">{q.statement}</p>

                      <div className="space-y-1 pt-1">
                        {alts.map((alt) => {
                          const isStudentChoice = chosen === alt.letter;
                          const isOfficialCorrect = correct === alt.letter;

                          let rowStyle = 'bg-slate-950/50 border-slate-800/80 text-slate-400';
                          if (isOfficialCorrect) {
                            rowStyle =
                              'bg-emerald-500/15 border-emerald-500/60 text-emerald-200 font-semibold';
                          } else if (isStudentChoice && !isCorrect) {
                            rowStyle =
                              'bg-rose-500/15 border-rose-500/60 text-rose-200 line-through';
                          }

                          return (
                            <div
                              key={alt.letter}
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
