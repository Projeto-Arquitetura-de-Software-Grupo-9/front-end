import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export const runtime = 'nodejs';

function resolvePythonBinary(): string {
  const candidates = [
    process.env.PYTHON_PATH,
    'C:\\Users\\davi3\\AppData\\Local\\Programs\\Python\\Python313\\python.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python313', 'python.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python312', 'python.exe'),
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
  return 'python';
}

function runPythonOmrScanner(payload: Record<string, unknown>): Promise<Record<string, any>> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), 'back-end', 'omr_scanner.py');
    const pythonBin = resolvePythonBinary();
    const pyProcess = spawn(pythonBin, [scriptPath], {
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

    pyProcess.on('error', (err) => {
      reject(err);
    });

    pyProcess.on('close', (code) => {
      if (code === 0 && stdoutData.trim()) {
        try {
          const parsed = JSON.parse(stdoutData.trim());
          resolve(parsed);
        } catch {
          reject(new Error(`Invalid JSON from Python OMR: ${stdoutData}`));
        }
      } else {
        reject(new Error(stderrData || `Python exited with code ${code}`));
      }
    });

    pyProcess.stdin.write(JSON.stringify(payload));
    pyProcess.stdin.end();
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
        error: err?.message || 'Erro ao executar o motor OMR Python.',
      },
      { status: 500 }
    );
  }
}
