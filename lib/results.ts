import { API_BASE_URL } from './api';
export interface ResultsReport {
  examId: string; title: string; pendingCount: number;
  metrics: { count: number; average: number | null; median: number | null; highest: number | null; lowest: number | null; standardDeviation: number | null };
  versions: {
    id: string; letter: string;
    rows: { id: string; name: string; registration: string; pending: boolean; score: number;
      answers: { number: number; chosen: string | null; correct: string; isCorrect: boolean }[] }[];
    questions: { number: number; correct: string; total: number; correctCount: number; blankCount: number; distribution: Record<string, number> }[];
  }[];
}
async function checked(response: Response) {
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || 'Não foi possível acessar o backend.');
  }
  return response;
}
export async function getResults(examId: string, signal: AbortSignal): Promise<ResultsReport> {
  const response = await checked(await fetch(`${API_BASE_URL}/reports/${encodeURIComponent(examId)}/results`, { signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]), cache: 'no-store' }));
  return (await response.json()).data;
}
export async function downloadFile(path: string, filename: string, body?: unknown) {
  const response = await checked(await fetch(`${API_BASE_URL}${path}`, {
    method: body ? 'POST' : 'GET', headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(60000),
  }));
  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename;
  document.body.appendChild(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
