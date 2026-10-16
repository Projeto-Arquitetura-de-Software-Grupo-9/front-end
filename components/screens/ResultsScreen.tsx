'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Download,
  Star,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  TrendingUp,
  BarChart3,
  HelpCircle,
  Users,
  ChevronDown,
  RotateCcw,
  Sparkles,
  Layers,
  UserCheck,
  UserX,
  FileText,
  Check,
} from 'lucide-react';

interface StudentRow {
  studentId: string;
  studentName: string;
  registration: string;
  answers: Record<number, 'A' | 'B' | 'C' | 'D' | 'E'>;
}

// Official answer key for the 15 questions
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
  const {
    exams,
    activeExamId,
    setActiveExamId,
    corrections,
    setCurrentScreen,
    addToast,
  } = useApp();

  const [studentsList, setStudentsList] = useState<StudentRow[]>(INITIAL_STUDENT_ROWS);
  const [questionViewFilter, setQuestionViewFilter] = useState<'all' | '1-6' | '7-12' | '13-15'>('all');

  const currentExam = exams.find((e) => e.id === activeExamId) || exams[0];

  // Unassigned corrections (Feature 9)
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

      studentsList.forEach((std) => {
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
  }, [studentsList]);

  // Compute metrics (Feature 10: Média, Mediana, Desvio Padrão)
  const classMetrics = useMemo(() => {
    if (studentsList.length === 0) {
      return { average: 7.2, median: 7.5, stdDev: 1.35, highest: 10, lowest: 3.0, highestName: 'Alberto Einstein' };
    }

    const scores = studentsList.map((std) => {
      let correctCount = 0;
      for (let q = 1; q <= 15; q++) {
        if (std.answers[q] === OFFICIAL_ANSWER_KEYS[q]) {
          correctCount++;
        }
      }
      return (correctCount / 15) * 10;
    }).sort((a, b) => a - b);

    const sum = scores.reduce((a, b) => a + b, 0);
    const avg = sum / scores.length;
    
    // Median calculation
    const mid = Math.floor(scores.length / 2);
    const median = scores.length % 2 !== 0 ? scores[mid] : (scores[mid - 1] + scores[mid]) / 2;

    // Standard Deviation calculation
    const variance = scores.reduce((acc, score) => acc + Math.pow(score - avg, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);

    const highest = Math.max(...scores);
    const lowest = Math.min(...scores);
    const highestName = 'Alberto Einstein';

    return {
      average: Number(avg.toFixed(1)),
      median: Number(median.toFixed(1)),
      stdDev: Number(stdDev.toFixed(2)),
      highest,
      lowest,
      highestName,
    };
  }, [studentsList]);

  const handleCycleAnswer = (studentIndex: number, qNum: number) => {
    const letters: ('A' | 'B' | 'C' | 'D' | 'E')[] = ['A', 'B', 'C', 'D', 'E'];
    setStudentsList((prev) => {
      const updated = [...prev];
      const currentChoice = updated[studentIndex].answers[qNum] || 'A';
      const currentIndex = letters.indexOf(currentChoice);
      const nextChoice = letters[(currentIndex + 1) % letters.length];
      
      updated[studentIndex] = {
        ...updated[studentIndex],
        answers: {
          ...updated[studentIndex].answers,
          [qNum]: nextChoice,
        },
      };
      return updated;
    });
  };

  const handleExport = (type: 'csv' | 'xlsx' | 'pdf') => {
    addToast({
      type: 'success',
      title: `Relatório Exportado (${type.toUpperCase()})`,
      message: `Arquivo consolidado contendo notas, média, mediana e matriz de acertos pronto.`,
    });
  };

  const filteredQuestionsList = useMemo(() => {
    if (questionViewFilter === '1-6') return questionsStats.slice(0, 6);
    if (questionViewFilter === '7-12') return questionsStats.slice(6, 12);
    if (questionViewFilter === '13-15') return questionsStats.slice(12, 15);
    return questionsStats;
  }, [questionsStats, questionViewFilter]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#9E0B1A] uppercase tracking-wider">
            <TrendingUp className="w-4 h-4" />
            <span>Feature 10 – Relatórios Estatísticos e Desempenho (Católica SC)</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">
            Resultados e Análise de Desempenho
          </h1>
          <p className="text-xs text-slate-500">
            Acompanhe médias, mediana, desvio padrão, distribuição por alternativa e matriz de acertos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={activeExamId}
              onChange={(e) => setActiveExamId(e.target.value)}
              className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2 pr-7 appearance-none cursor-pointer shadow-2xs"
            >
              {exams.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => handleExport('xlsx')}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
            </button>
            <button
              onClick={() => handleExport('pdf')}
              className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" /> PDF
            </button>
          </div>
        </div>
      </div>

      {/* Feature 9 Alert: Pending manual assignments notification linking to lancamento-manual */}
      {pendingCorrections.length > 0 && (
        <div className="bg-amber-50 border border-amber-200/80 rounded-2xl px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="flex items-center gap-2.5 text-amber-950 font-medium">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>
              Você possui <strong>{pendingCorrections.length} prova(s) física(s) anônima(s)</strong> pendente(s) de atribuição nesta aplicação.
            </span>
          </div>

          <button
            onClick={() => setCurrentScreen('lancamento-manual')}
            className="px-3.5 py-1.5 bg-[#9E0B1A] hover:bg-[#850916] text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-2xs whitespace-nowrap self-start sm:self-auto"
          >
            Acessar Tela de Lançamento Manual →
          </button>
        </div>
      )}

      {/* 4 Statistical KPI Cards (Feature 10: Média, Mediana, Desvio Padrão, Maior Nota) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Média */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Média Geral</span>
            <div className="w-8 h-8 rounded-lg bg-red-50 text-[#9E0B1A] flex items-center justify-center font-bold">
              <Star className="w-4 h-4 fill-[#9E0B1A]/10" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">{classMetrics.average}</div>
            <div className="text-[11px] text-slate-400 mt-1">Escala de 0 a 10.0</div>
          </div>
        </div>

        {/* Mediana (Feature 10) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Mediana</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">{classMetrics.median}</div>
            <div className="text-[11px] text-slate-400 mt-1">Ponto central da turma</div>
          </div>
        </div>

        {/* Desvio Padrão (Feature 10) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Desvio Padrão</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">{classMetrics.stdDev}</div>
            <div className="text-[11px] text-slate-400 mt-1">Dispersão das notas</div>
          </div>
        </div>

        {/* Maior Nota */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Maior Nota</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">{classMetrics.highest}</div>
            <div className="text-[11px] text-slate-500 mt-1">{classMetrics.highestName}</div>
          </div>
        </div>
      </div>

      {/* Matriz de Desempenho (Questão × Aluno) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Matriz de Desempenho (Questão × Aluno)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Clique em qualquer resposta para simular alteração de gabarito e ver a matriz recalcular.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-emerald-500 inline-block"></span>
              <span className="text-slate-700">Acerto</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-rose-400 inline-block"></span>
              <span className="text-slate-700">Erro</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-bold text-slate-500">
                <th className="py-3 px-3 w-40">Alunos</th>
                {Array.from({ length: 15 }, (_, i) => i + 1).map((qNum) => (
                  <th key={qNum} className="py-3 px-1.5 text-center w-10">
                    Q{qNum}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {studentsList.map((std, stdIndex) => (
                <tr key={std.studentId} className="hover:bg-slate-50/50 transition">
                  <td className="py-3 px-3 font-bold text-slate-900 whitespace-nowrap">
                    {std.studentName}
                  </td>
                  {Array.from({ length: 15 }, (_, i) => i + 1).map((qNum) => {
                    const studentLetter = std.answers[qNum] || 'A';
                    const correctLetter = OFFICIAL_ANSWER_KEYS[qNum] || 'A';
                    const isCorrect = studentLetter === correctLetter;

                    return (
                      <td key={qNum} className="py-2 px-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleCycleAnswer(stdIndex, qNum)}
                          className={`w-8 h-8 rounded-lg mx-auto flex items-center justify-center font-bold text-xs text-white shadow-xs cursor-pointer transition transform hover:scale-110 active:scale-95 ${
                            isCorrect ? 'bg-emerald-500' : 'bg-rose-400'
                          }`}
                        >
                          {studentLetter}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Respostas por Questão (Distribuição de Frequência das Alternativas) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Distribuição por Questão
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Porcentagem e contagem de marcação de cada alternativa (verde = gabarito correto).
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setQuestionViewFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                questionViewFilter === 'all'
                  ? 'bg-[#9E0B1A] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todas (1-15)
            </button>
            <button
              onClick={() => setQuestionViewFilter('1-6')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                questionViewFilter === '1-6'
                  ? 'bg-[#9E0B1A] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Q1-Q6
            </button>
            <button
              onClick={() => setQuestionViewFilter('7-12')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                questionViewFilter === '7-12'
                  ? 'bg-[#9E0B1A] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Q7-Q12
            </button>
            <button
              onClick={() => setQuestionViewFilter('13-15')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                questionViewFilter === '13-15'
                  ? 'bg-[#9E0B1A] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Q13-Q15
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {filteredQuestionsList.map((qItem) => {
            const letters: ('A' | 'B' | 'C' | 'D' | 'E')[] = ['A', 'B', 'C', 'D', 'E'];

            return (
              <div
                key={qItem.qNum}
                className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-300 transition"
              >
                <div className="flex items-center justify-between pb-1 border-b border-slate-200/60">
                  <span className="text-[10px] font-bold text-slate-500">
                    Gabarito: <b className="text-emerald-700 font-extrabold">{qItem.correctLetter}</b>
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    Q{qItem.qNum}
                  </span>
                </div>

                <div className="flex items-end justify-between h-20 gap-1.5 pt-4">
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
                        className="flex-1 flex flex-col items-center justify-end h-full gap-1 group relative"
                      >
                        <div
                          style={{ height: `${heightPct}%` }}
                          className={`w-full rounded-md transition-all duration-200 ${
                            isCorrect
                              ? 'bg-emerald-500 shadow-xs'
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
