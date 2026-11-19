import { Exam, Question, Student } from './types';
import { Letter, LETTERS, ParsedQrData, parseQrPayload } from './qrCode';

export interface StrictQrValidationResult {
  ok: boolean;
  parsed?: ParsedQrData;
  error?: string;
  code?: 'EMPTY_QR' | 'INVALID_QR_FORMAT';
}

export interface StrictExamResolutionResult {
  ok: boolean;
  exam?: Exam;
  error?: string;
  code?: 'QR_MISSING_EXAM_IDENTIFIER' | 'EXAM_NOT_FOUND';
}

export interface ResolvedExamQuestionMeta {
  questionNumber: number;
  questionId: string;
  type: 'objetiva' | 'discursiva';
  statement: string;
  letters: Letter[];
  correctLetter?: Letter;
  maxScore: number;
}

export interface StrictVersionKeyResult {
  ok: boolean;
  versionLetter?: string;
  examVersionId?: string;
  totalObjectiveQuestions?: number;
  answerKey?: Record<number, Letter>;
  questionLetters?: Record<number, Letter[]>;
  objectiveQuestions?: ResolvedExamQuestionMeta[];
  discursiveQuestions?: ResolvedExamQuestionMeta[];
  maxScore?: number;
  error?: string;
  code?: 'VERSION_NOT_FOUND' | 'ANSWER_KEY_MISSING';
}

export interface DeterministicGradeOutput {
  correctCount: number;
  wrongCount: number;
  blankCount: number;
  ambiguousCount: number;
  totalObjectiveQuestions: number;
  objectiveScore: number;
  discursiveScore: number;
  totalScore: number;
  maxScore: number;
  objectiveResults: Array<{
    questionNumber: number;
    questionId: string;
    chosen: Letter | null;
    correct: Letter;
    isCorrect: boolean;
    score: number;
  }>;
  discursiveResults: Array<{
    questionId: string;
    score: number;
    maxScore: number;
  }>;
}

export function normalizeExamCode(code?: string | null): string {
  return String(code || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

/**
 * Validates that a scanned QR string belongs strictly to the Correge institutional system.
 * Rejects random URLs, Pix payloads, Wi-Fi QR codes, or arbitrary text.
 */
export function validateCorregeQrRaw(raw: string): StrictQrValidationResult {
  const clean = (raw || '').trim();
  if (!clean) {
    return {
      ok: false,
      code: 'EMPTY_QR',
      error: 'Nenhum QR Code foi lido na imagem.',
    };
  }

  let jsonObj: Record<string, unknown> | null = null;
  try {
    const candidate = JSON.parse(clean);
    if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
      jsonObj = candidate as Record<string, unknown>;
    }
  } catch {
    jsonObj = null;
  }

  if (!jsonObj) {
    return {
      ok: false,
      code: 'INVALID_QR_FORMAT',
      error:
        'O QR Code detectado não pertence a uma prova oficial do Correge. Aponte a câmera para o QR Code impresso no cartão-resposta.',
    };
  }

  const appTag = typeof jsonObj.app === 'string' ? jsonObj.app.toUpperCase() : '';
  const hasCorregeTag = appTag === 'CORREGE' || appTag.startsWith('CORREGE_');
  const hasBackendSignedShape = Boolean(jsonObj.appId && jsonObj.vId && jsonObj.ver);
  const hasExamAndVersionShape = Boolean(
    (jsonObj.examId || jsonObj.idProva || jsonObj.code || jsonObj.exam || jsonObj.examCode) &&
      (jsonObj.ver || jsonObj.versionLetter || jsonObj.version)
  );

  if (!hasCorregeTag && !hasBackendSignedShape && !hasExamAndVersionShape) {
    return {
      ok: false,
      code: 'INVALID_QR_FORMAT',
      error:
        'QR Code incompatível com o formato institucional do Correge (campos de prova e caderno ausentes).',
    };
  }

  const parsed = parseQrPayload(clean);
  if (!parsed.examId && !parsed.examCode) {
    return {
      ok: false,
      code: 'INVALID_QR_FORMAT',
      error: 'QR Code do Correge sem código ou identificador da prova.',
    };
  }

  return { ok: true, parsed };
}

function findMatchingExamInList(parsed: ParsedQrData, exams: Exam[]): Exam | undefined {
  // 1. Exact ID match first (highest precision)
  if (parsed.examId) {
    const byId = exams.find((e) => e.id === parsed.examId);
    if (byId) return byId;
  }

  // 2. Exact normalized exam code match
  const qrNormCode = normalizeExamCode(parsed.examCode);
  if (qrNormCode) {
    const byCode = exams.find((e) => normalizeExamCode(e.code) === qrNormCode);
    if (byCode) return byCode;
  }

  // NEVER fall back to selectedExam, activeExamId, exams[0], or title fuzzy match!
  return undefined;
}

/**
 * Strictly resolves an exam from parsed QR metadata against local state and (if missing) the backend DB.
 * Returns an explicit error when not found — NEVER falls back to another exam!
 */
export async function resolveExamStrictly(
  parsed: ParsedQrData,
  localExams: Exam[],
  refreshRemoteExams?: () => Promise<Exam[]>
): Promise<StrictExamResolutionResult> {
  if (!parsed.examId && !normalizeExamCode(parsed.examCode)) {
    return {
      ok: false,
      code: 'QR_MISSING_EXAM_IDENTIFIER',
      error: 'O QR Code lido não contém identificador ou código de prova.',
    };
  }

  const localMatch = findMatchingExamInList(parsed, localExams);
  if (localMatch) {
    return { ok: true, exam: localMatch };
  }

  if (refreshRemoteExams) {
    try {
      const remoteExams = await refreshRemoteExams();
      if (Array.isArray(remoteExams) && remoteExams.length > 0) {
        const remoteMatch = findMatchingExamInList(parsed, remoteExams);
        if (remoteMatch) {
          return { ok: true, exam: remoteMatch };
        }
      }
    } catch {
      // Backend unreachable -> still return honest EXAM_NOT_FOUND below
    }
  }

  const refLabel = parsed.examCode || parsed.examId || 'desconhecido';
  return {
    ok: false,
    code: 'EXAM_NOT_FOUND',
    error: `Prova não encontrada no sistema para o QR Code lido (${refLabel}). Verifique se a avaliação está cadastrada antes de corrigir.`,
  };
}

/**
 * Strictly resolves the official answer key and question metadata for the matched exam & version.
 * NEVER fabricates synthetic keys or defaults missing keys to 'A'.
 */
export async function resolveVersionAndKeyStrictly(
  exam: Exam,
  versionLetterInput: string,
  questionBank: Question[],
  fetchRemoteLayout?: (
    examId: string,
    versionLetter: string
  ) => Promise<{
    answerKey?: Record<string, string>;
    questionsLayout?: Array<{
      orderIndex: number;
      questionId?: string;
      originalQuestionId?: string;
      statement?: string;
      type?: 'objetiva' | 'discursiva';
      alternatives?: Array<{ letter: string }>;
      correctAlternative?: string;
      maxScore?: number;
    }>;
    examVersionId?: string;
  } | null>
): Promise<StrictVersionKeyResult> {
  const versionLetter = (versionLetterInput || 'A').trim().toUpperCase();
  const maxScore = Number(exam.maxScore) > 0 ? Number(exam.maxScore) : 10;

  // 1. Check exact version inside exam.versions
  const matchedVersion = (exam.versions || []).find(
    (v) => v.versionLetter.trim().toUpperCase() === versionLetter
  );

  if (matchedVersion) {
    const answerKey: Record<number, Letter> = {};
    const questionLetters: Record<number, Letter[]> = {};
    const objectiveQuestions: ResolvedExamQuestionMeta[] = [];
    const discursiveQuestions: ResolvedExamQuestionMeta[] = [];

    const versionQuestions = matchedVersion.questions || [];
    const totalCount = Math.max(
      versionQuestions.length,
      Object.keys(matchedVersion.answerKey || {}).length
    );

    if (versionQuestions.length > 0) {
      let objIdx = 0;
      for (const vq of versionQuestions) {
        const bankQ = questionBank.find((bq) => bq.id === vq.originalQuestionId);
        const qType: 'objetiva' | 'discursiva' = bankQ?.type === 'discursiva' ? 'discursiva' : 'objetiva';

        if (qType === 'discursiva') {
          discursiveQuestions.push({
            questionNumber: vq.orderIndex,
            questionId: vq.originalQuestionId,
            type: 'discursiva',
            statement: vq.statement || bankQ?.statement || `Questão Discursiva ${vq.orderIndex}`,
            letters: [],
            maxScore: bankQ?.maxScore || bankQ?.points || 0,
          });
          continue;
        }

        objIdx++;
        const qNum = objIdx;
        const rawCorrect = (
          vq.correctAlternative ||
          matchedVersion.answerKey?.[vq.orderIndex] ||
          matchedVersion.answerKey?.[qNum] ||
          ''
        )
          .toString()
          .toUpperCase() as Letter;

        if (!LETTERS.includes(rawCorrect)) {
          return {
            ok: false,
            code: 'ANSWER_KEY_MISSING',
            error: `A questão ${qNum} do Caderno ${versionLetter} da prova "${exam.title}" não possui gabarito oficial definido.`,
          };
        }

        const letters: Letter[] =
          vq.alternatives && vq.alternatives.length >= 2
            ? (vq.alternatives
                .map((a) => String(a.letter).toUpperCase())
                .filter((l): l is Letter => LETTERS.includes(l as Letter)))
            : LETTERS;

        answerKey[qNum] = rawCorrect;
        questionLetters[qNum] = letters.length >= 2 ? letters : LETTERS;
        objectiveQuestions.push({
          questionNumber: qNum,
          questionId: vq.originalQuestionId || `q-${qNum}`,
          type: 'objetiva',
          statement: vq.statement || `Questão ${qNum}`,
          letters: questionLetters[qNum],
          correctLetter: rawCorrect,
          maxScore: bankQ?.points || 0,
        });
      }
    } else if (matchedVersion.answerKey && Object.keys(matchedVersion.answerKey).length > 0) {
      const nums = Object.keys(matchedVersion.answerKey)
        .map(Number)
        .filter((n) => Number.isInteger(n) && n >= 1)
        .sort((a, b) => a - b);

      for (const qNum of nums) {
        const rawCorrect = String(matchedVersion.answerKey[qNum] || '').toUpperCase() as Letter;
        if (!LETTERS.includes(rawCorrect)) {
          return {
            ok: false,
            code: 'ANSWER_KEY_MISSING',
            error: `Gabarito oficial inválido na questão ${qNum} do Caderno ${versionLetter}.`,
          };
        }
        answerKey[qNum] = rawCorrect;
        questionLetters[qNum] = LETTERS;
        objectiveQuestions.push({
          questionNumber: qNum,
          questionId: `q-${qNum}`,
          type: 'objetiva',
          statement: `Questão ${qNum}`,
          letters: LETTERS,
          correctLetter: rawCorrect,
          maxScore: 0,
        });
      }
    }

    if (objectiveQuestions.length > 0 && totalCount > 0) {
      normalizeQuestionPointWeights(objectiveQuestions, discursiveQuestions, maxScore);
      return {
        ok: true,
        versionLetter,
        examVersionId: matchedVersion.id || `${exam.id}-${versionLetter}`,
        totalObjectiveQuestions: objectiveQuestions.length,
        answerKey,
        questionLetters,
        objectiveQuestions,
        discursiveQuestions,
        maxScore,
      };
    }
  }

  // 2. Try fetching version layout & answerKey from backend API if callback provided
  if (fetchRemoteLayout) {
    try {
      const remote = await fetchRemoteLayout(exam.id, versionLetter);
      if (remote && remote.answerKey && Object.keys(remote.answerKey).length > 0) {
        const answerKey: Record<number, Letter> = {};
        const questionLetters: Record<number, Letter[]> = {};
        const objectiveQuestions: ResolvedExamQuestionMeta[] = [];
        const discursiveQuestions: ResolvedExamQuestionMeta[] = [];

        const nums = Object.keys(remote.answerKey)
          .map(Number)
          .filter((n) => Number.isInteger(n) && n >= 1)
          .sort((a, b) => a - b);

        for (const qNum of nums) {
          const rawCorrect = String(remote.answerKey[String(qNum)] || '').toUpperCase() as Letter;
          if (!LETTERS.includes(rawCorrect)) {
            return {
              ok: false,
              code: 'ANSWER_KEY_MISSING',
              error: `Gabarito remoto incompleto na questão ${qNum} do Caderno ${versionLetter}.`,
            };
          }
          const layoutItem = remote.questionsLayout?.find((q) => q.orderIndex === qNum);
          const letters =
            layoutItem?.alternatives && layoutItem.alternatives.length >= 2
              ? layoutItem.alternatives
                  .map((a) => String(a.letter).toUpperCase())
                  .filter((l): l is Letter => LETTERS.includes(l as Letter))
              : LETTERS;
          answerKey[qNum] = rawCorrect;
          questionLetters[qNum] = letters.length >= 2 ? letters : LETTERS;
          objectiveQuestions.push({
            questionNumber: qNum,
            questionId: layoutItem?.originalQuestionId || layoutItem?.questionId || `q-${qNum}`,
            type: 'objetiva',
            statement: layoutItem?.statement || `Questão ${qNum}`,
            letters: questionLetters[qNum],
            correctLetter: rawCorrect,
            maxScore: layoutItem?.maxScore || 0,
          });
        }

        if (objectiveQuestions.length > 0) {
          normalizeQuestionPointWeights(objectiveQuestions, discursiveQuestions, maxScore);
          return {
            ok: true,
            versionLetter,
            examVersionId: remote.examVersionId || `${exam.id}-${versionLetter}`,
            totalObjectiveQuestions: objectiveQuestions.length,
            answerKey,
            questionLetters,
            objectiveQuestions,
            discursiveQuestions,
            maxScore,
          };
        }
      }
    } catch {
      // Fall through to strict check below
    }
  }

  // 3. Only if exam has NO generated versions yet and Caderno A is requested, resolve strictly from exam.selectedQuestionIds
  if ((!exam.versions || exam.versions.length === 0) && versionLetter === 'A' && (exam.selectedQuestionIds || []).length > 0) {
    const answerKey: Record<number, Letter> = {};
    const questionLetters: Record<number, Letter[]> = {};
    const objectiveQuestions: ResolvedExamQuestionMeta[] = [];
    const discursiveQuestions: ResolvedExamQuestionMeta[] = [];

    let objIdx = 0;
    for (let idx = 0; idx < exam.selectedQuestionIds.length; idx++) {
      const qId = exam.selectedQuestionIds[idx];
      const q = questionBank.find((item) => item.id === qId);
      if (!q) {
        return {
          ok: false,
          code: 'ANSWER_KEY_MISSING',
          error: `A prova "${exam.title}" referencia questões não encontradas no banco (${qId}). Regere os cadernos antes de corrigir.`,
        };
      }

      if (q.type === 'discursiva') {
        discursiveQuestions.push({
          questionNumber: idx + 1,
          questionId: q.id,
          type: 'discursiva',
          statement: q.statement,
          letters: [],
          maxScore: q.maxScore || q.points || 0,
        });
        continue;
      }

      const rawCorrect = String(q.correctAlternative || '').toUpperCase() as Letter;
      if (!LETTERS.includes(rawCorrect)) {
        return {
          ok: false,
          code: 'ANSWER_KEY_MISSING',
          error: `A questão "${q.code}" da prova "${exam.title}" não possui alternativa correta definida.`,
        };
      }

      objIdx++;
      const letters =
        q.alternatives && q.alternatives.length >= 2
          ? q.alternatives
              .map((a) => String(a.letter).toUpperCase())
              .filter((l): l is Letter => LETTERS.includes(l as Letter))
          : LETTERS;

      answerKey[objIdx] = rawCorrect;
      questionLetters[objIdx] = letters.length >= 2 ? letters : LETTERS;
      objectiveQuestions.push({
        questionNumber: objIdx,
        questionId: q.id,
        type: 'objetiva',
        statement: q.statement,
        letters: questionLetters[objIdx],
        correctLetter: rawCorrect,
        maxScore: q.points || 0,
      });
    }

    if (objectiveQuestions.length > 0) {
      normalizeQuestionPointWeights(objectiveQuestions, discursiveQuestions, maxScore);
      return {
        ok: true,
        versionLetter,
        examVersionId: `${exam.id}-${versionLetter}`,
        totalObjectiveQuestions: objectiveQuestions.length,
        answerKey,
        questionLetters,
        objectiveQuestions,
        discursiveQuestions,
        maxScore,
      };
    }
  }

  return {
    ok: false,
    code: matchedVersion ? 'ANSWER_KEY_MISSING' : 'VERSION_NOT_FOUND',
    error: matchedVersion
      ? `A prova "${exam.title}" (Caderno ${versionLetter}) não possui gabarito oficial cadastrado.`
      : `Caderno "${versionLetter}" não encontrado na prova "${exam.title}". Cadernos disponíveis: ${
          (exam.versions || []).map((v) => v.versionLetter).join(', ') || 'nenhum'
        }.`,
  };
}

function normalizeQuestionPointWeights(
  objectiveQuestions: ResolvedExamQuestionMeta[],
  discursiveQuestions: ResolvedExamQuestionMeta[],
  maxScore: number
): void {
  const all = [...objectiveQuestions, ...discursiveQuestions];
  if (all.length === 0) return;

  const declaredSum = all.reduce((acc, q) => acc + (q.maxScore > 0 ? q.maxScore : 0), 0);
  if (declaredSum > 0 && all.every((q) => q.maxScore > 0)) {
    // Scale proportionally to exam.maxScore if needed, or preserve exact declared points when matching
    const ratio = Math.abs(declaredSum - maxScore) < 0.01 ? 1 : maxScore / declaredSum;
    all.forEach((q) => {
      q.maxScore = Number((q.maxScore * ratio).toFixed(4));
    });
  } else {
    const equalWeight = maxScore / all.length;
    all.forEach((q) => {
      q.maxScore = Number(equalWeight.toFixed(4));
    });
  }
}

/**
 * Matches a student ONLY when the QR payload carries a real student ID or registration.
 * NEVER falls back to students[0] or a fake student name!
 */
export function resolveStudentFromQr(parsed: ParsedQrData, students: Student[]): Student | null {
  if (!parsed.nominal && !parsed.studentId && !parsed.studentRegistration) {
    return null;
  }
  if (parsed.studentId) {
    const byId = students.find((s) => s.id === parsed.studentId);
    if (byId) return byId;
  }
  if (parsed.studentRegistration && parsed.studentRegistration.toUpperCase() !== 'ANON') {
    const normReg = parsed.studentRegistration.trim().toLowerCase();
    const byReg = students.find((s) => s.registration.trim().toLowerCase() === normReg);
    if (byReg) return byReg;
  }
  return null;
}

/**
 * Deterministic grading without any fallback guessing.
 * Unmarked (null) and ambiguous (rasura) questions always receive 0 points.
 */
export function gradeExamDeterministically(params: {
  objectiveQuestions: ResolvedExamQuestionMeta[];
  discursiveQuestions?: ResolvedExamQuestionMeta[];
  markedAnswers: Record<number, Letter | null>;
  ambiguousQuestions?: number[];
  discursiveScores?: Record<string, number>;
  maxScore: number;
}): DeterministicGradeOutput {
  const {
    objectiveQuestions,
    discursiveQuestions = [],
    markedAnswers,
    ambiguousQuestions = [],
    discursiveScores = {},
    maxScore,
  } = params;

  const ambiguousSet = new Set(ambiguousQuestions);
  let correctCount = 0;
  let wrongCount = 0;
  let blankCount = 0;
  let ambiguousCount = 0;
  let objectiveScore = 0;

  const objectiveResults = objectiveQuestions.map((q) => {
    const rawChosen = markedAnswers[q.questionNumber] ?? null;
    const isAmbiguous = ambiguousSet.has(q.questionNumber) && rawChosen === null;
    const chosen = rawChosen && LETTERS.includes(rawChosen) ? rawChosen : null;
    const correct = q.correctLetter!;

    if (isAmbiguous) {
      ambiguousCount++;
    } else if (chosen === null) {
      blankCount++;
    } else if (chosen === correct) {
      correctCount++;
      objectiveScore += q.maxScore;
    } else {
      wrongCount++;
    }

    const isCorrect = chosen !== null && chosen === correct;
    return {
      questionNumber: q.questionNumber,
      questionId: q.questionId,
      chosen,
      correct,
      isCorrect,
      score: isCorrect ? Number(q.maxScore.toFixed(2)) : 0,
    };
  });

  let discursiveScore = 0;
  const discursiveResults = discursiveQuestions.map((dq) => {
    const raw = Number(discursiveScores[dq.questionId] ?? 0);
    const clamped = Number.isFinite(raw) ? Math.max(0, Math.min(dq.maxScore, raw)) : 0;
    discursiveScore += clamped;
    return {
      questionId: dq.questionId,
      score: Number(clamped.toFixed(2)),
      maxScore: Number(dq.maxScore.toFixed(2)),
    };
  });

  const totalScore = Number(
    Math.min(maxScore, objectiveScore + discursiveScore).toFixed(2)
  );

  return {
    correctCount,
    wrongCount,
    blankCount,
    ambiguousCount,
    totalObjectiveQuestions: objectiveQuestions.length,
    objectiveScore: Number(objectiveScore.toFixed(2)),
    discursiveScore: Number(discursiveScore.toFixed(2)),
    totalScore,
    maxScore,
    objectiveResults,
    discursiveResults,
  };
}
