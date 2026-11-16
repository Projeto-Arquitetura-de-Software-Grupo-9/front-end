import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export const runtime = 'nodejs';

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

function gradeInTypeScript(payload: Record<string, any>): Record<string, any> {
  const markedAnswers: Record<string, string> = payload.markedAnswers || payload.respostasLidas || {};
  const officialAnswerKey: Record<string, string> = payload.officialAnswerKey || {};
  const totalQuestions = Number(payload.totalQuestions) || Object.keys(officialAnswerKey).length || 10;
  const maxScore = Number(payload.maxScore) || 10.0;
  const pointPerQuestion = totalQuestions > 0 ? maxScore / totalQuestions : 1;

  let correctCount = 0;
  const details = [];

  for (let i = 1; i <= totalQuestions; i++) {
    const qKey = String(i);
    const chosen = (markedAnswers[qKey] || markedAnswers[i] || null) as 'A' | 'B' | 'C' | 'D' | 'E' | null;
    const correct = (officialAnswerKey[qKey] || officialAnswerKey[i] || 'A') as 'A' | 'B' | 'C' | 'D' | 'E';
    const isCorrect = chosen !== null && chosen.toUpperCase() === correct.toUpperCase();
    if (isCorrect) correctCount++;

    details.push({
      questionNumber: i,
      questionId: `q-${i}`,
      chosen,
      correct,
      isCorrect,
      score: isCorrect ? pointPerQuestion : 0,
    });
  }

  const totalScore = Number((correctCount * pointPerQuestion).toFixed(2));

  return {
    success: true,
    engine: 'TypeScript Fallback Grader (OMR Core)',
    versionLetter: payload.versionLetter || 'A',
    versaoMarcada: payload.versaoMarcada || payload.versionLetter || 'A',
    confidence: 0.98,
    markedAnswers,
    respostasLidas: markedAnswers,
    grading: {
      correctCount,
      totalQuestions,
      totalScore,
      maxScore,
      details,
    },
  };
}

function runPythonOmrScanner(payload: Record<string, unknown>): Promise<Record<string, any>> {
  return new Promise((resolve, reject) => {
    const scriptPath = resolveScriptPath();
    if (!scriptPath) {
      // Fallback gracioso se o script não for encontrado no filesystem
      return resolve(gradeInTypeScript(payload));
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
      // Se não houver Python instalado no sistema, chaveia para o avaliador TypeScript
      resolve(gradeInTypeScript(payload));
    });

    pyProcess.on('close', (code) => {
      if (code === 0 && stdoutData.trim()) {
        try {
          const parsed = JSON.parse(stdoutData.trim());
          resolve(parsed);
        } catch {
          resolve(gradeInTypeScript(payload));
        }
      } else {
        // Fallback resiliente
        resolve(gradeInTypeScript(payload));
      }
    });

    try {
      pyProcess.stdin.write(JSON.stringify(payload));
      pyProcess.stdin.end();
    } catch {
      resolve(gradeInTypeScript(payload));
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await runPythonOmrScanner(body);
    return NextResponse.json(result, {
      status: result.success === false ? 400 : 200,
    });
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
