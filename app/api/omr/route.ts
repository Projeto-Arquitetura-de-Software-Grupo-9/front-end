import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export const runtime = 'nodejs';

const VALID_LETTERS = new Set(['A', 'B', 'C', 'D', 'E']);

function resolvePythonBinary(): string {
  const localAppData = process.env.LOCALAPPDATA || '';
  const candidates = [
    process.env.PYTHON_PATH,
    path.join(localAppData, 'Programs', 'Python', 'Python313', 'python.exe'),
    path.join(localAppData, 'Programs', 'Python', 'Python312', 'python.exe'),
    path.join(localAppData, 'Programs', 'Python', 'Python311', 'python.exe'),
    path.join(localAppData, 'Programs', 'Python', 'Python310', 'python.exe'),
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    } catch {
      // ignore
    }
  }
  return process.platform === 'win32' ? 'python' : 'python3';
}

function resolveScriptPath(): string | null {
  const candidates = [
    path.join(process.cwd(), 'back-end', 'omr_scanner.py'),
    path.join(process.cwd(), '..', 'back-end', 'omr_scanner.py'),
    path.join(process.cwd(), 'omr_scanner.py'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(/*turbopackIgnore: true*/ c)) {
      return c;
    }
  }
  return null;
}

/**
 * Deterministic server-side grader ONLY for action === 'grade' when explicit markedAnswers AND officialAnswerKey are provided.
 * Never invents answers and never defaults missing answer keys to 'A'.
 */
function gradeExplicitAnswers(payload: Record<string, any>): { status: number; body: Record<string, any> } {
  const markedAnswers: Record<string, string | null> = payload.markedAnswers || payload.respostasLidas || {};
  const officialAnswerKey: Record<string, string> = payload.officialAnswerKey || {};
  const keyEntries = Object.entries(officialAnswerKey).filter(
    ([q, letter]) => Number(q) >= 1 && VALID_LETTERS.has(String(letter).toUpperCase())
  );

  if (keyEntries.length === 0) {
    return {
      status: 400,
      body: {
        success: false,
        code: 'MISSING_OFFICIAL_ANSWER_KEY',
        error: 'Gabarito oficial (officialAnswerKey) obrigatório para correção.',
      },
    };
  }

  const totalQuestions = Number(payload.totalQuestions) || keyEntries.length;
  const maxScore = Number(payload.maxScore) > 0 ? Number(payload.maxScore) : 10.0;
  const pointPerQuestion = totalQuestions > 0 ? maxScore / totalQuestions : 0;

  let correctCount = 0;
  const details = [];

  for (let i = 1; i <= totalQuestions; i++) {
    const qKey = String(i);
    const rawCorrect = officialAnswerKey[qKey] ?? officialAnswerKey[i];
    const correct = rawCorrect ? String(rawCorrect).toUpperCase() : null;
    if (!correct || !VALID_LETTERS.has(correct)) {
      return {
        status: 400,
        body: {
          success: false,
          code: 'INCOMPLETE_OFFICIAL_ANSWER_KEY',
          error: `Gabarito oficial incompleto: alternativa correta ausente para a questão ${i}.`,
        },
      };
    }

    const rawChosen = markedAnswers[qKey] ?? markedAnswers[i] ?? null;
    const chosenUpper = rawChosen ? String(rawChosen).toUpperCase() : null;
    const chosen = chosenUpper && VALID_LETTERS.has(chosenUpper) ? chosenUpper : null;
    const isCorrect = chosen !== null && chosen === correct;
    if (isCorrect) correctCount++;

    details.push({
      questionNumber: i,
      questionId: `q-${i}`,
      chosen,
      correct,
      isCorrect,
      score: isCorrect ? Number(pointPerQuestion.toFixed(2)) : 0,
    });
  }

  const totalScore = Number((correctCount * pointPerQuestion).toFixed(2));

  return {
    status: 200,
    body: {
      success: true,
      engine: 'Correge Deterministic Grader (API)',
      versionLetter: payload.versionLetter || 'A',
      versaoMarcada: payload.versaoMarcada || payload.versionLetter || 'A',
      markedAnswers,
      respostasLidas: markedAnswers,
      grading: {
        correctCount,
        totalQuestions,
        totalScore,
        maxScore,
        details,
      },
    },
  };
}

function runPythonOmrScanner(
  payload: Record<string, unknown>
): Promise<{ status: number; body: Record<string, any> }> {
  return new Promise((resolve) => {
    const scriptPath = resolveScriptPath();
    if (!scriptPath) {
      return resolve({
        status: 501,
        body: {
          success: false,
          code: 'PYTHON_OMR_UNAVAILABLE',
          error:
            'Motor Python/OpenCV não está disponível no servidor. Utilize o leitor óptico nativo do navegador.',
        },
      });
    }

    const pythonBin = resolvePythonBinary();
    const pyProcess = spawn(/*turbopackIgnore: true*/ pythonBin, [scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdoutData = '';
    let stderrData = '';

    pyProcess.stdout.on('data', (chunk) => {
      stdoutData += chunk.toString('utf-8');
    });

    pyProcess.stderr.on('data', (chunk) => {
      stderrData += chunk.toString('utf-8');
    });

    pyProcess.on('error', () => {
      resolve({
        status: 501,
        body: {
          success: false,
          code: 'PYTHON_OMR_UNAVAILABLE',
          error:
            'Python/OpenCV não está instalado neste servidor. Utilize o leitor óptico nativo do navegador.',
        },
      });
    });

    pyProcess.on('close', (code) => {
      if (code === 0 && stdoutData.trim()) {
        try {
          const parsed = JSON.parse(stdoutData.trim());
          resolve({
            status: parsed.success === false ? 400 : 200,
            body: parsed,
          });
          return;
        } catch {
          resolve({
            status: 500,
            body: {
              success: false,
              code: 'OMR_PARSE_ERROR',
              error: 'Resposta inválida do motor Python OMR.',
            },
          });
          return;
        }
      }

      resolve({
        status: 501,
        body: {
          success: false,
          code: 'PYTHON_OMR_UNAVAILABLE',
          error:
            stderrData.trim() ||
            'Falha ao executar leitura óptica no servidor Python/OpenCV.',
        },
      });
    });

    try {
      pyProcess.stdin.write(JSON.stringify(payload));
      pyProcess.stdin.end();
    } catch {
      resolve({
        status: 500,
        body: {
          success: false,
          code: 'OMR_STDIN_ERROR',
          error: 'Erro ao enviar imagem ao processo OMR.',
        },
      });
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = String(body?.action || 'scan').toLowerCase();

    if (action === 'grade') {
      const graded = gradeExplicitAnswers(body);
      return NextResponse.json(graded.body, { status: graded.status });
    }

    if (action === 'scan') {
      if (!body?.imageBase64 || typeof body.imageBase64 !== 'string') {
        return NextResponse.json(
          {
            success: false,
            code: 'MISSING_IMAGE',
            error: 'Imagem do cartão-resposta (imageBase64) é obrigatória para leitura OMR.',
          },
          { status: 400 }
        );
      }

      const result = await runPythonOmrScanner(body);
      return NextResponse.json(result.body, { status: result.status });
    }

    return NextResponse.json(
      {
        success: false,
        code: 'INVALID_ACTION',
        error: `Ação OMR desconhecida: "${action}". Utilize "scan" ou "grade".`,
      },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Erro ao processar folha OMR.',
      },
      { status: 500 }
    );
  }
}
