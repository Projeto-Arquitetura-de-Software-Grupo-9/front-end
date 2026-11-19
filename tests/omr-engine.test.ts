import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeAnswerSheetPixels } from '../lib/omrEngine';
import {
  validateCorregeQrRaw,
  resolveExamStrictly,
  resolveVersionAndKeyStrictly,
  resolveStudentFromQr,
  gradeExamDeterministically,
} from '../lib/omrScannerFlow';
import { Exam, Question, Student } from '../lib/types';
import { Letter, LETTERS } from '../lib/qrCode';

/**
 * Generates a realistic synthetic A4 answer sheet RGBA buffer (1000x1414) with:
 * - 4 solid black corner fiducials (plus top-left asymmetric orientation bar)
 * - Optional realistic diagonal lighting shadow gradient
 * - Column-major hollow circular bubbles (with inner printed letter strokes!)
 * - Dark pen fill on specified marked bubbles (supports blanks and double-marks!)
 */
function renderSyntheticAnswerSheet(params: {
  width?: number;
  height?: number;
  totalQuestions: number;
  marks: Record<number, Letter[]>; // [] = blank, ['B'] = single mark, ['A','C'] = rasura/double
  withShadowGradient?: boolean;
  withFiducials?: boolean;
}): { rgba: Uint8ClampedArray; width: number; height: number } {
  const width = params.width ?? 1000;
  const height = params.height ?? 1414;
  const rgba = new Uint8ClampedArray(width * height * 4);

  // Fill paper background (with optional harsh uneven lighting shadow)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let lum = 248;
      if (params.withShadowGradient) {
        // Strong diagonal shadow dropping paper brightness down to ~155 on bottom-right
        const factor = (x / width) * 0.5 + (y / height) * 0.5;
        lum = Math.round(248 - factor * 92);
      }
      const p = (y * width + x) * 4;
      rgba[p] = lum;
      rgba[p + 1] = lum;
      rgba[p + 2] = lum;
      rgba[p + 3] = 255;
    }
  }

  const paintRect = (x0: number, y0: number, rw: number, rh: number, grayVal: number) => {
    for (let y = Math.max(0, Math.floor(y0)); y < Math.min(height, Math.ceil(y0 + rh)); y++) {
      for (let x = Math.max(0, Math.floor(x0)); x < Math.min(width, Math.ceil(x0 + rw)); x++) {
        const p = (y * width + x) * 4;
        rgba[p] = grayVal;
        rgba[p + 1] = grayVal;
        rgba[p + 2] = grayVal;
      }
    }
  };

  const paintBubble = (cx: number, cy: number, r: number, filled: boolean) => {
    const rOuter = r + 1;
    const rInner = r - 1.6;
    for (let y = Math.max(0, Math.floor(cy - rOuter - 1)); y <= Math.min(height - 1, Math.ceil(cy + rOuter + 1)); y++) {
      for (let x = Math.max(0, Math.floor(cx - rOuter - 1)); x <= Math.min(width - 1, Math.ceil(cx + rOuter + 1)); x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.hypot(dx, dy);
        const p = (y * width + x) * 4;
        if (filled) {
          // Slightly imperfect pen fill (dark ink inside 0.9*r)
          if (dist <= r * 0.95) {
            const ink = 28;
            rgba[p] = ink;
            rgba[p + 1] = ink;
            rgba[p + 2] = ink + 10; // slightly blue-black pen tint
          }
        } else {
          // Hollow printed circle ring
          if (dist >= rInner && dist <= rOuter) {
            rgba[p] = 25;
            rgba[p + 1] = 25;
            rgba[p + 2] = 25;
          } else if (dist <= r * 0.35 && (Math.abs(dx) < 1.3 || Math.abs(dy) < 1.3)) {
            // Simulated printed letter stroke inside unmarked bubble (~14% core coverage)
            rgba[p] = 45;
            rgba[p + 1] = 45;
            rgba[p + 2] = 45;
          }
        }
      }
    }
  };

  // 4 Corner Fiducials
  if (params.withFiducials !== false) {
    paintRect(16, 16, 18, 18, 10);
    paintRect(38, 16, 7, 18, 10); // asymmetric top-left orientation bar
    paintRect(width - 34, 16, 18, 18, 10);
    paintRect(16, height - 34, 18, 18, 10);
    paintRect(width - 34, height - 34, 18, 18, 10);
  }

  // Answer Bubbles Grid (column-major layout matching A4AnswerSheet.tsx)
  const totalQ = params.totalQuestions;
  const numCols = totalQ > 75 ? 4 : totalQ > 40 ? 3 : 2;
  const perCol = Math.ceil(totalQ / numCols);
  const bubbleR = numCols === 4 ? 10 : numCols === 3 ? 11 : 13;
  const stepX = bubbleR * 2.75;
  const stepY = bubbleR * 3.1;
  const startY = 470;
  const colSpan = (width - 180) / numCols;

  for (let qIdx = 0; qIdx < totalQ; qIdx++) {
    const qNum = qIdx + 1;
    const colIdx = Math.floor(qIdx / perCol);
    const rowIdx = qIdx % perCol;
    const colStartX = 115 + colIdx * colSpan;
    const cy = startY + rowIdx * stepY;
    const markedSet = new Set(params.marks[qNum] || []);

    LETTERS.forEach((letter, lIdx) => {
      const cx = colStartX + lIdx * stepX;
      paintBubble(cx, cy, bubbleR, markedSet.has(letter));
    });
  }

  return { rgba, width, height };
}

describe('Pure TypeScript OMR Engine (Real Bubble Reading, Zero Guessing)', () => {
  it('should accurately read marked bubbles, keep blanks as null, and flag double-marks (rasuras)', () => {
    const expectedMarks: Record<number, Letter[]> = {
      1: ['A'],
      2: ['C'],
      3: ['E'],
      4: [], // Blank — must stay null!
      5: ['B'],
      6: ['A', 'D'], // Rasura / double mark — must stay null AND be flagged ambiguous!
      7: ['D'],
      8: ['A'],
      9: [], // Blank — must stay null!
      10: ['C'],
    };

    const sheet = renderSyntheticAnswerSheet({
      totalQuestions: 10,
      marks: expectedMarks,
      withShadowGradient: false,
    });

    const result = analyzeAnswerSheetPixels(sheet.rgba, sheet.width, sheet.height, {
      totalQuestions: 10,
    });

    assert.equal(result.sheetDetected, true);
    assert.equal(result.fiducialsFound, true);
    assert.equal(result.rectified, true);
    assert.equal(result.markedAnswers[1], 'A');
    assert.equal(result.markedAnswers[2], 'C');
    assert.equal(result.markedAnswers[3], 'E');
    assert.equal(result.markedAnswers[4], null);
    assert.equal(result.markedAnswers[5], 'B');
    assert.equal(result.markedAnswers[6], null);
    assert.equal(result.markedAnswers[7], 'D');
    assert.equal(result.markedAnswers[8], 'A');
    assert.equal(result.markedAnswers[9], null);
    assert.equal(result.markedAnswers[10], 'C');

    assert.deepEqual(result.ambiguousQuestions, [6]);
    assert.deepEqual(result.blankQuestions, [4, 9]);
  });

  it('should read accurately even under harsh uneven diagonal shadows (shadow-immune local ink)', () => {
    const marks: Record<number, Letter[]> = {
      1: ['B'],
      2: ['D'],
      3: ['A'],
      4: ['E'],
      5: ['C'],
      6: ['B'],
      7: ['A'],
      8: ['D'],
    };

    const sheet = renderSyntheticAnswerSheet({
      totalQuestions: 8,
      marks,
      withShadowGradient: true,
    });

    const result = analyzeAnswerSheetPixels(sheet.rgba, sheet.width, sheet.height, {
      totalQuestions: 8,
    });

    assert.equal(result.sheetDetected, true);
    for (let i = 1; i <= 8; i++) {
      assert.equal(result.markedAnswers[i], marks[i][0], `Question ${i} mismatch under shadow`);
    }
  });

  it('should reject blank or random non-sheet photos with sheetDetected=false and ZERO guessed answers', () => {
    const width = 640;
    const height = 480;
    const blankRgba = new Uint8ClampedArray(width * height * 4).fill(235);
    const blankResult = analyzeAnswerSheetPixels(blankRgba, width, height, {
      totalQuestions: 10,
    });

    assert.equal(blankResult.sheetDetected, false);
    assert.equal(Object.keys(blankResult.markedAnswers).length, 0);
    assert.ok(blankResult.error && blankResult.error.length > 10);

    // Random noise image (e.g., desk / wall photo)
    const noiseRgba = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < noiseRgba.length; i += 4) {
      const v = (i * 2654435761) & 255;
      noiseRgba[i] = v;
      noiseRgba[i + 1] = v;
      noiseRgba[i + 2] = v;
      noiseRgba[i + 3] = 255;
    }
    const noiseResult = analyzeAnswerSheetPixels(noiseRgba, width, height, {
      totalQuestions: 10,
    });
    assert.equal(noiseResult.sheetDetected, false);
    assert.equal(Object.keys(noiseResult.markedAnswers).length, 0);
  });
});

describe('Strict QR Validation, Strict Exam Lookup & Deterministic Grading (Zero Fallbacks)', () => {
  const sampleExam: Exam = {
    id: 'exam-real-uuid-1',
    code: '#DIR-4561',
    title: 'P1 Direito Constitucional',
    institution: 'CATÓLICA SC',
    department: 'Direito',
    course: 'Direito',
    discipline: 'Direito Constitucional',
    classGroup: 'Turma A',
    semester: '2026.1',
    date: '19/11/2026',
    duration: '2 horas',
    instructions: '',
    status: 'ready',
    shuffleQuestions: true,
    shuffleAlternatives: true,
    numberOfVersions: 2,
    selectedQuestionIds: ['q1', 'q2'],
    maxScore: 10,
    versions: [
      {
        id: 'ver-uuid-a',
        versionLetter: 'A',
        questions: [
          {
            originalQuestionId: 'q1',
            orderIndex: 1,
            statement: 'Questão 1',
            alternatives: LETTERS.map((l) => ({ id: `a1-${l}`, letter: l, text: `Alt ${l}` })),
            correctAlternative: 'B',
          },
          {
            originalQuestionId: 'q2',
            orderIndex: 2,
            statement: 'Questão 2',
            alternatives: LETTERS.map((l) => ({ id: `a2-${l}`, letter: l, text: `Alt ${l}` })),
            correctAlternative: 'D',
          },
        ],
        answerKey: { 1: 'B', 2: 'D' },
      },
    ],
  };

  it('should reject non-Correge QR codes (URLs, Pix, plain text, unrelated JSON)', () => {
    assert.equal(validateCorregeQrRaw('https://example.com/pix').ok, false);
    assert.equal(validateCorregeQrRaw('00020126580014BR.GOV.BCB.PIX').ok, false);
    assert.equal(validateCorregeQrRaw('{"hello":"world"}').ok, false);
    assert.equal(validateCorregeQrRaw('').ok, false);

    const valid = validateCorregeQrRaw(
      JSON.stringify({
        app: 'CORREGE',
        examId: 'exam-real-uuid-1',
        code: '#DIR-4561',
        ver: 'A',
        nominal: false,
      })
    );
    assert.equal(valid.ok, true);
    assert.equal(valid.parsed?.examId, 'exam-real-uuid-1');
    assert.equal(valid.parsed?.versionLetter, 'A');
  });

  it('should return EXAM_NOT_FOUND error when QR exam does not exist (NEVER falls back to exams[0])', async () => {
    const validQr = validateCorregeQrRaw(
      JSON.stringify({
        app: 'CORREGE',
        examId: 'exam-nonexistent-999',
        code: '#OUTRA-9999',
        ver: 'A',
      })
    );
    assert.equal(validQr.ok, true);

    const res = await resolveExamStrictly(validQr.parsed!, [sampleExam], async () => [sampleExam]);
    assert.equal(res.ok, false);
    assert.equal(res.code, 'EXAM_NOT_FOUND');
    assert.equal(res.exam, undefined);
    assert.ok(res.error?.includes('Prova não encontrada'));

    // Exact normalized code match succeeds
    const matchQr = validateCorregeQrRaw(
      JSON.stringify({ app: 'CORREGE', exam: 'DIR4561', ver: 'A' })
    );
    const okRes = await resolveExamStrictly(matchQr.parsed!, [sampleExam]);
    assert.equal(okRes.ok, true);
    assert.equal(okRes.exam?.id, 'exam-real-uuid-1');
  });

  it('should reject missing Caderno version instead of fabricating synthetic keys or defaulting to A', async () => {
    const missingVer = await resolveVersionAndKeyStrictly(sampleExam, 'Z', [] as Question[]);
    assert.equal(missingVer.ok, false);
    assert.equal(missingVer.code, 'VERSION_NOT_FOUND');

    const validVer = await resolveVersionAndKeyStrictly(sampleExam, 'A', [] as Question[]);
    assert.equal(validVer.ok, true);
    assert.deepEqual(validVer.answerKey, { 1: 'B', 2: 'D' });
  });

  it('should NEVER force students[0] on avulsa sheets and should grade blanks/rasuras as 0', async () => {
    const roster: Student[] = [
      {
        id: 'std-1',
        name: 'Aluno Real 1',
        registration: '2026.1.001',
        course: 'Direito',
        email: 'a1@catolicasc.edu.br',
        classGroup: 'Turma A',
        discipline: 'Direito Constitucional',
        examsTaken: 0,
        overallAverage: 0,
      },
    ];

    const avulsaQr = validateCorregeQrRaw(
      JSON.stringify({ app: 'CORREGE', examId: 'exam-real-uuid-1', ver: 'A', nominal: false, std: 'ANON' })
    );
    assert.equal(resolveStudentFromQr(avulsaQr.parsed!, roster), null);

    const validVer = await resolveVersionAndKeyStrictly(sampleExam, 'A', [] as Question[]);
    const grade = gradeExamDeterministically({
      objectiveQuestions: validVer.objectiveQuestions!,
      markedAnswers: { 1: 'B', 2: null }, // Q1 right (5 pts), Q2 blank (0 pts)
      ambiguousQuestions: [],
      maxScore: 10,
    });

    assert.equal(grade.correctCount, 1);
    assert.equal(grade.blankCount, 1);
    assert.equal(grade.totalScore, 5);
  });
});
