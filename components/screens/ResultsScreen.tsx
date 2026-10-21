'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import {
  Download,
  Star,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  TrendingUp,
  BarChart3,
  ChevronDown,
  QrCode,
  Printer,
} from 'lucide-react';

interface StudentRow {
  studentId: string;
  studentName: string;
  registration: string;
  versionLetter?: string;
  answers: Record<number, 'A' | 'B' | 'C' | 'D' | 'E'>;
}

const OFFICIAL_ANSWER_KEYS: Record<number, 'A' | 'B' | 'C' | 'D' | 'E'> = {
  1: 'A',
  2: 'B',
  3: 'C',
  4: 'A',
  5: 'B',
  6: 'E',
  7: 'C',
  8: 'C',
  9: 'A',
  10: 'E',
  11: 'D',
  12: 'D',
  13: 'A',
  14: 'A',
  15: 'B',
};

const INITIAL_STUDENT_ROWS: StudentRow[] = [
  {
    studentId: 'std-1',
    studentName: 'Amanda Dolores',
    registration: '2024.1.001',
    answers: { 1: 'A', 2: 'B', 3: 'C', 4: 'A', 5: 'B', 6: 'E', 7: 'C', 8: 'C', 9: 'A', 10: 'E', 11: 'D', 12: 'D', 13: 'A', 14: 'A', 15: 'B' },
  },
  {
    studentId: 'std-2',
    studentName: 'Bruno Cortela',
    registration: '2024.1.045',
    answers: { 1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E', 6: 'E', 7: 'C', 8: 'C', 9: 'A', 10: 'E', 11: 'C', 12: 'D', 13: 'C', 14: 'A', 15: 'B' },
  },
  {
    studentId: 'std-3',
    studentName: 'Cleber Santana',
    registration: '2024.1.089',
    answers: { 1: 'A', 2: 'B', 3: 'C', 4: 'A', 5: 'B', 6: 'E', 7: 'C', 8: 'C', 9: 'A', 10: 'E', 11: 'D', 12: 'D', 13: 'C', 14: 'A', 15: 'B' },
  },
  {
    studentId: 'std-4',
    studentName: 'Julio Balestrin',
    registration: '2024.1.102',
    answers: { 1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E', 6: 'E', 7: 'C', 8: 'C', 9: 'A', 10: 'E', 11: 'C', 12: 'D', 13: 'C', 14: 'A', 15: 'B' },
  },
  {
    studentId: 'std-5',
    studentName: 'Moacir Neto',
    registration: '2024.1.103',
    answers: { 1: 'A', 2: 'B', 3: 'C', 4: 'A', 5: 'B', 6: 'E', 7: 'C', 8: 'C', 9: 'A', 10: 'E', 11: 'C', 12: 'D', 13: 'C', 14: 'A', 15: 'B' },
  },
  {
    studentId: 'std-6',
    studentName: 'Alberto Einstein',
    registration: '2024.1.104',
    answers: { 1: 'A', 2: 'B', 3: 'C', 4: 'A', 5: 'B', 6: 'E', 7: 'C', 8: 'C', 9: 'A', 10: 'E', 11: 'D', 12: 'D', 13: 'A', 14: 'A', 15: 'B' },
  },
];

export const ResultsScreen: React.FC = () => {
  const searchParams = useSearchParams();
  const examIdParam = searchParams.get('examId');

  const {
    exams,
    activeExamId,
    setActiveExamId,
    corrections,
    setCurrentScreen,
    setIsScannerModalOpen,
    addToast,
  } = useApp();

  useEffect(() => {
    if (examIdParam && examIdParam !== activeExamId) {
      setActiveExamId(examIdParam);
    }
  }, [examIdParam, activeExamId, setActiveExamId]);

  const [studentsList, setStudentsList] = useState<StudentRow[]>(INITIAL_STUDENT_ROWS);
  const [questionViewFilter, setQuestionViewFilter] = useState<'all' | '1-6' | '7-12' | '13-15'>('all');

  const currentExam = exams.find((e) => e.id === activeExamId) || exams[0];

  // Merge scanned corrections with student assignments so scanned QR results appear live
  const enrichedStudentRows = useMemo(() => {
    const baseMap = new Map<string, StudentRow>();
    studentsList.forEach((row) => {
      const assigned = currentExam?.studentAssignments?.find(
        (a) => a.studentId === row.studentId || a.registration === row.registration
      );
      baseMap.set(row.studentId, {
        ...row,
        versionLetter: assigned?.assignedVersion || row.versionLetter || 'A',
      });
    });

    // Apply any assigned corrections from QR Scanner
    corrections
      .filter((c) => c.studentId && c.objectiveResults?.length > 0)
      .forEach((corr) => {
        const ansRecord: Record<number, 'A' | 'B' | 'C' | 'D' | 'E'> = {};
        corr.objectiveResults.forEach((r, idx) => {
          ansRecord[idx + 1] = r.chosen || 'A';
        });
        const existing = baseMap.get(corr.studentId!);
        baseMap.set(corr.studentId!, {
          studentId: corr.studentId!,
          studentName: corr.studentName || existing?.studentName || 'Aluno',
          registration: corr.registration || existing?.registration || '2024.1.000',
          versionLetter: corr.versionLetter || existing?.versionLetter || 'A',
          answers: { ...(existing?.answers || {}), ...ansRecord },
        });
      });

    return Array.from(baseMap.values());
  }, [studentsList, currentExam?.studentAssignments, corrections]);

  // Unassigned corrections (Feature 9 - Provas Avulsas / Não Nominais)
  const pendingCorrections = useMemo(() => {
    return corrections.filter((c) => !c.studentId);
  }, [corrections]);

  // Dynamically compute question stats
  const questionsStats = useMemo(() => {
    const totalQuestions = 15;
    const stats = [];

    for (let qNum = 1; qNum <= totalQuestions; qNum++) {
      const correctLetter = OFFICIAL_ANSWER_KEYS[qNum] || 'A';
      const distribution = { A: 0, B: 0, C: 0, D: 0, E: 0 };
      let totalAnswers = 0;
      let correctAnswers = 0;

      enrichedStudentRows.forEach((std) => {
        const studentChoice = std.answers[qNum];
        if (studentChoice && studentChoice in distribution) {
          distribution[studentChoice]++;
          totalAnswers++;
          if (studentChoice === correctLetter) {
            correctAnswers++;
          }
        }
      });

      const maxCountInQuestion = Math.max(
        distribution.A,
        distribution.B,
        distribution.C,
        distribution.D,
        distribution.E,
        1
      );

      const accuracyPercentage =
        totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0;

      stats.push({
        qNum,
        correctLetter,
        distribution,
        totalAnswers,
        correctAnswers,
        accuracyPercentage,
        maxCountInQuestion,
      });
    }

    return stats;
  }, [enrichedStudentRows]);

  // Compute metrics (Média, Mediana, Desvio Padrão)
  const classMetrics = useMemo(() => {
    if (enrichedStudentRows.length === 0) {
      return { average: 7.2, median: 7.5, stdDev: 1.35, highest: 10, lowest: 3.0, highestName: 'Alberto Einstein' };
    }

    let topScore = -1;
    let topName = enrichedStudentRows[0]?.studentName || '';

    const scores = enrichedStudentRows
      .map((std) => {
        let correctCount = 0;
        for (let q = 1; q <= 15; q++) {
          if (std.answers[q] === OFFICIAL_ANSWER_KEYS[q]) {
            correctCount++;
          }
        }
        const s = (correctCount / 15) * 10;
        if (s > topScore) {
          topScore = s;
          topName = std.studentName;
        }
        return s;
      })
      .sort((a, b) => a - b);

    const sum = scores.reduce((a, b) => a + b, 0);
    const avg = sum / scores.length;

    const mid = Math.floor(scores.length / 2);
    const median = scores.length % 2 !== 0 ? scores[mid] : (scores[mid - 1] + scores[mid]) / 2;

    const variance = scores.reduce((acc, score) => acc + Math.pow(score - avg, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);

    const highest = Math.max(...scores);
    const lowest = Math.min(...scores);

    return {
      average: Number(avg.toFixed(1)),
      median: Number(median.toFixed(1)),
      stdDev: Number(stdDev.toFixed(2)),
      highest: Number(highest.toFixed(1)),
      lowest: Number(lowest.toFixed(1)),
      highestName: topName,
    };
  }, [enrichedStudentRows]);

  const handleCycleAnswer = (studentId: string, qNum: number) => {
    const letters: ('A' | 'B' | 'C' | 'D' | 'E')[] = ['A', 'B', 'C', 'D', 'E'];
    setStudentsList((prev) =>
      prev.map((row) => {
        if (row.studentId !== studentId) return row;
        const currentChoice = row.answers[qNum] || 'A';
        const nextChoice = letters[(letters.indexOf(currentChoice) + 1) % letters.length];
        return {
          ...row,
          answers: {
            ...row.answers,
            [qNum]: nextChoice,
          },
        };
      })
    );
  };

  const handleExport = (type: 'csv' | 'xlsx' | 'pdf') => {
    addToast({
      type: 'success',
      title: `Relatório Exportado (${type.toUpperCase()})`,
      message: `Arquivo consolidado contendo notas, cadernos sorteados e matriz de acertos pronto.`,
    });
  };

  const filteredQuestionsList = useMemo(() => {
    if (questionViewFilter === '1-6') return questionsStats.slice(0, 6);
    if (questionViewFilter === '7-12') return questionsStats.slice(6, 12);
    if (questionViewFilter === '13-15') return questionsStats.slice(12, 15);
    return questionsStats;
  }, [questionsStats, questionViewFilter]);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Clean Modern Header & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Resultados e Desempenho da Turma
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {currentExam?.discipline} • {currentExam?.classGroup} •{' '}
            {currentExam?.withStudentIdentification === false ? 'Prova Avulsa' : 'Prova Nominal'} •{' '}
            {currentExam?.numberOfVersions || 4} Caderno(s)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Exam Selector */}
          <div className="relative">
            <select
              value={activeExamId}
              onChange={(e) => setActiveExamId(e.target.value)}
              className="text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 pr-7 appearance-none cursor-pointer focus:outline-none"
            >
              {exams.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title} ({e.classGroup})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <Link
            href={`/provas/${currentExam?.id || activeExamId}?p=caderno`}
            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" /> Ver Prova / Gabarito
          </Link>

          <button
            type="button"
            onClick={() => setIsScannerModalOpen(true)}
            className="px-3 py-1.5 bg-[#9E0B1A] hover:bg-[#850916] text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <QrCode className="w-3.5 h-3.5" /> Ler QR / Escanear
          </button>

          <div className="h-4 w-px bg-slate-200 hidden sm:block" />

          <button
            onClick={() => handleExport('xlsx')}
            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
          </button>
          <button
            onClick={() => handleExport('pdf')}
            className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> PDF
          </button>
        </div>
      </div>

      {/* Pending manual assignments notification for Avulsa exams */}
      {pendingCorrections.length > 0 && (
        <div className="bg-amber-50 border border-amber-200/80 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-amber-950 font-medium">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>
              Existem <strong>{pendingCorrections.length} folha(s) avulsa(s) corrigida(s) via QR Code</strong> aguardando vínculo com aluno da chamada.
            </span>
          </div>

          <button
            onClick={() => setCurrentScreen('lancamento-manual')}
            className="px-3 py-1.5 bg-amber-900 hover:bg-amber-950 text-white font-bold text-xs rounded-lg transition cursor-pointer whitespace-nowrap self-start sm:self-auto"
          >
            Vincular Alunos Manualmente →
          </button>
        </div>
      )}

      {/* 4 Statistical KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Média da Turma</span>
            <div className="w-7 h-7 rounded-lg bg-red-50 text-[#9E0B1A] flex items-center justify-center">
              <Star className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-slate-900">{classMetrics.average}</div>
            <div className="text-[11px] text-slate-400">Escala de 0 a 10.0</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Mediana</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-slate-900">{classMetrics.median}</div>
            <div className="text-[11px] text-slate-400">Ponto central</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Desvio Padrão</span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <BarChart3 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-slate-900">{classMetrics.stdDev}</div>
            <div className="text-[11px] text-slate-400">Dispersão das notas</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Maior Nota</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-slate-900">{classMetrics.highest}</div>
            <div className="text-[11px] text-slate-500 truncate">{classMetrics.highestName}</div>
          </div>
        </div>
      </div>

      {/* Matriz de Desempenho (Questão × Aluno + Caderno Sorteado + Nota) */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Notas por Aluno, Caderno Sorteado e Matriz de Respostas
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Mostra o caderno atribuído a cada aluno na impressão e os acertos lidos pelo QR Code.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500 inline-block"></span>
              <span className="text-slate-700">Acerto</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-rose-400 inline-block"></span>
              <span className="text-slate-700">Erro</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[860px]">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-2.5 px-3 w-44">Aluno</th>
                <th className="py-2.5 px-2 text-center w-24">Caderno</th>
                <th className="py-2.5 px-2 text-center w-20">Nota</th>
                {Array.from({ length: 15 }, (_, i) => i + 1).map((qNum) => (
                  <th key={qNum} className="py-2.5 px-1 text-center w-9">
                    Q{qNum}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {enrichedStudentRows.map((std) => {
                let hits = 0;
                for (let q = 1; q <= 15; q++) {
                  if ((std.answers[q] || 'A') === OFFICIAL_ANSWER_KEYS[q]) hits++;
                }
                const studentScore = ((hits / 15) * 10).toFixed(1);

                return (
                  <tr key={std.studentId} className="hover:bg-slate-50/60 transition">
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="font-bold text-slate-900">{std.studentName}</div>
                      <div className="text-[10px] font-mono text-slate-400">{std.registration}</div>
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700">
                        Caderno {std.versionLetter || 'A'}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <span className="font-black text-sm text-slate-900">{studentScore}</span>
                    </td>
                    {Array.from({ length: 15 }, (_, i) => i + 1).map((qNum) => {
                      const studentLetter = std.answers[qNum] || 'A';
                      const correctLetter = OFFICIAL_ANSWER_KEYS[qNum] || 'A';
                      const isCorrect = studentLetter === correctLetter;

                      return (
                        <td key={qNum} className="py-2 px-1 text-center">
                          <button
                            type="button"
                            onClick={() => handleCycleAnswer(std.studentId, qNum)}
                            className={`w-7 h-7 rounded-md mx-auto flex items-center justify-center font-bold text-xs text-white shadow-2xs cursor-pointer transition transform hover:scale-105 ${
                              isCorrect ? 'bg-emerald-500' : 'bg-rose-400'
                            }`}
                          >
                            {studentLetter}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Distribuição por Questão */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Distribuição de Alternativas por Questão
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Frequência de marcação de cada alternativa na turma (verde = gabarito oficial).
            </p>
          </div>

          <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold self-start">
            {(
              [
                { id: 'all', label: 'Todas (1-15)' },
                { id: '1-6', label: 'Q1-Q6' },
                { id: '7-12', label: 'Q7-Q12' },
                { id: '13-15', label: 'Q13-Q15' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setQuestionViewFilter(tab.id)}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  questionViewFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {filteredQuestionsList.map((qItem) => {
            const letters: ('A' | 'B' | 'C' | 'D' | 'E')[] = ['A', 'B', 'C', 'D', 'E'];

            return (
              <div
                key={qItem.qNum}
                className="bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-300 transition"
              >
                <div className="flex items-center justify-between pb-1 border-b border-slate-200/60">
                  <span className="text-[10px] font-bold text-slate-500">
                    Gabarito: <b className="text-emerald-700 font-extrabold">{qItem.correctLetter}</b>
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    Q{qItem.qNum}
                  </span>
                </div>

                <div className="flex items-end justify-between h-16 gap-1.5 pt-3">
                  {letters.map((letter) => {
                    const count = qItem.distribution[letter];
                    const isCorrect = letter === qItem.correctLetter;
                    const heightPct = Math.max(
                      (count / qItem.maxCountInQuestion) * 100,
                      8
                    );

                    return (
                      <div
                        key={letter}
                        className="flex-1 flex flex-col items-center justify-end h-full gap-1"
                      >
                        <div
                          style={{ height: `${heightPct}%` }}
                          className={`w-full rounded transition-all duration-200 ${
                            isCorrect
                              ? 'bg-emerald-500'
                              : count > 0
                              ? 'bg-slate-300'
                              : 'bg-slate-200/50'
                          }`}
                        />
                        <span
                          className={`text-[10px] font-bold ${
                            isCorrect ? 'text-emerald-700' : 'text-slate-500'
                          }`}
                        >
                          {letter}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 text-center text-[10px] text-slate-400 font-medium">
                  {qItem.accuracyPercentage.toFixed(0)}% acertos
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
