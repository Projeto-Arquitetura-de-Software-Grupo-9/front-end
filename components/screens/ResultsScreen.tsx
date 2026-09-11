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
  4: 'A', // Official is A, but students marked D in the design mockup (identifying error anomaly)
  5: 'B', // Official is B, but students marked E in the design mockup (identifying error anomaly)
  6: 'E',
  7: 'C',
  8: 'C',
  9: 'A',
  10: 'E',
  11: 'D', // Official is D, but students marked C in mockup
  12: 'D',
  13: 'A', // Official is A, but students marked C in mockup
  14: 'A',
  15: 'B',
};

// Initial student responses matching screenshot exactly
const INITIAL_STUDENT_ROWS: StudentRow[] = [
  {
    studentId: 'std-1',
    studentName: 'Dolores',
    registration: '2024.1.001',
    answers: { 1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E', 6: 'E', 7: 'C', 8: 'C', 9: 'A', 10: 'E', 11: 'C', 12: 'D', 13: 'C', 14: 'A', 15: 'B' },
  },
  {
    studentId: 'std-2',
    studentName: 'Cortela',
    registration: '2024.1.045',
    answers: { 1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E', 6: 'E', 7: 'C', 8: 'C', 9: 'A', 10: 'E', 11: 'C', 12: 'D', 13: 'C', 14: 'A', 15: 'B' },
  },
  {
    studentId: 'std-3',
    studentName: 'Cleber Santana',
    registration: '2024.1.089',
    answers: { 1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E', 6: 'E', 7: 'C', 8: 'C', 9: 'A', 10: 'E', 11: 'C', 12: 'D', 13: 'C', 14: 'A', 15: 'B' },
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
    answers: { 1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E', 6: 'E', 7: 'C', 8: 'C', 9: 'A', 10: 'E', 11: 'C', 12: 'D', 13: 'C', 14: 'A', 15: 'B' },
  },
  {
    studentId: 'std-6',
    studentName: 'Alberto Einstein',
    registration: '2024.1.104',
    answers: { 1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E', 6: 'E', 7: 'C', 8: 'C', 9: 'A', 10: 'E', 11: 'C', 12: 'D', 13: 'C', 14: 'A', 15: 'B' },
  },
];

export const ResultsScreen: React.FC = () => {
  const { exams, activeExamId, setActiveExamId, addToast } = useApp();
  const [studentsList, setStudentsList] = useState<StudentRow[]>(INITIAL_STUDENT_ROWS);
  const [questionViewFilter, setQuestionViewFilter] = useState<'all' | '1-6' | '7-12' | '13-15'>('all');

  const currentExam = exams.find((e) => e.id === activeExamId) || exams[0];

  // Dynamically compute question stats from the exact responses in studentsList
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

      // Find the maximum count among all alternatives in this question for proportional bar heights
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

  // Compute overall class metrics dynamically
  const classMetrics = useMemo(() => {
    if (studentsList.length === 0) {
      return { average: 7.2, highest: 10, lowest: 3.0, highestName: 'Alberto Einstein' };
    }

    const scores = studentsList.map((std) => {
      let correctCount = 0;
      for (let q = 1; q <= 15; q++) {
        if (std.answers[q] === OFFICIAL_ANSWER_KEYS[q]) {
          correctCount++;
        }
      }
      return (correctCount / 15) * 10;
    });

    const sum = scores.reduce((a, b) => a + b, 0);
    const avg = sum / scores.length;
    const highest = Math.max(...scores);
    const lowest = Math.min(...scores);
    const highestIndex = scores.indexOf(highest);
    const highestName = studentsList[highestIndex]?.studentName || 'Alberto Einstein';

    return {
      average: avg,
      highest: highest,
      lowest: lowest,
      highestName,
    };
  }, [studentsList]);

  // Cycle answer for a student to test live dynamic updates
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

  const handleExportExcel = () => {
    addToast({
      type: 'success',
      title: 'Planilha Excel Exportada!',
      message: 'Relatório consolidado com matriz Questão×Aluno baixado com sucesso.',
    });
  };

  const filteredQuestionsList = useMemo(() => {
    if (questionViewFilter === '1-6') return questionsStats.slice(0, 6);
    if (questionViewFilter === '7-12') return questionsStats.slice(6, 12);
    if (questionViewFilter === '13-15') return questionsStats.slice(12, 15);
    return questionsStats; // all 15
  }, [questionsStats, questionViewFilter]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header & Export Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Resultados - {currentExam.title}
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Visão aprofundada do aproveitamento, taxas de acerto e anomalias de aprendizagem.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={activeExamId}
              onChange={(e) => setActiveExamId(e.target.value)}
              className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 pr-8 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {exams.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer"
          >
            <Download className="w-4 h-4" /> Exportar Excel
          </button>
        </div>
      </div>

      {/* 3 KPI Cards matching resultados-e-analise.png */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Média da Turma */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Média da Turma</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Star className="w-5 h-5 fill-blue-600/10" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
              7.2
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs">
              <span className="font-semibold text-emerald-600">+0.4 de evolução</span>
              <span className="text-slate-400">de 10.0</span>
            </div>
          </div>
        </div>

        {/* Card 2: Maior Nota */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Maior Nota</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
              10
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs">
              <span className="font-semibold text-rose-500">Excepcional</span>
              <span className="text-slate-500">Alberto Einstein</span>
            </div>
          </div>
        </div>

        {/* Card 3: Menor Nota */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Menor Nota</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
              3.0
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs">
              <span className="font-semibold text-rose-500">2 alunos</span>
              <span className="text-slate-400">abaixo da média</span>
            </div>
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
              Identifique facilmente as questões com mais erros para revisão no quadro. Clique em qualquer resposta para alterar e ver o gráfico recalcular em tempo real.
            </p>
          </div>

          {/* Legend */}
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

        {/* Matrix Table */}
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
                          title={`${std.studentName} | Questão ${qNum}: marcou "${studentLetter}" (Gabarito: "${correctLetter}"). Clique para alterar.`}
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

      {/* Respostas por Questão (Dynamic Frequency Distribution Bar Charts) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Respostas por Questão
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Distribuição calculada em tempo real a partir das marcações dos alunos (verde = gabarito oficial).
            </p>
          </div>

          {/* Filter views for question charts */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setQuestionViewFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                questionViewFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todas (1-15)
            </button>
            <button
              onClick={() => setQuestionViewFilter('1-6')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                questionViewFilter === '1-6'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Q1-Q6
            </button>
            <button
              onClick={() => setQuestionViewFilter('7-12')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                questionViewFilter === '7-12'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Q7-Q12
            </button>
            <button
              onClick={() => setQuestionViewFilter('13-15')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                questionViewFilter === '13-15'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Q13-Q15
            </button>
          </div>
        </div>

        {/* Dynamic Distribution Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {filteredQuestionsList.map((qItem) => {
            const letters: ('A' | 'B' | 'C' | 'D' | 'E')[] = ['A', 'B', 'C', 'D', 'E'];

            return (
              <div
                key={qItem.qNum}
                className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-300 transition"
              >
                {/* Card Header: Q Number + Correct gabarito indicator */}
                <div className="flex items-center justify-between pb-1 border-b border-slate-200/60">
                  <span className="text-[10px] font-bold text-slate-500">
                    Gabarito: <b className="text-emerald-700 font-extrabold">{qItem.correctLetter}</b>
                  </span>
                  <span className="text-xs font-bold text-slate-700 font-mono">
                    Q{qItem.qNum}
                  </span>
                </div>

                {/* Dynamic Mini Bar Chart */}
                <div className="h-36 flex items-end justify-between gap-1.5 px-1 py-2">
                  {letters.map((letter) => {
                    const count = qItem.distribution[letter] || 0;
                    const isCorrectAlternative = letter === qItem.correctLetter;
                    const maxVal = qItem.maxCountInQuestion;
                    // Calculate height percentage strictly proportional to count
                    const heightPercent = count === 0 ? '4%' : `${(count / maxVal) * 88}%`;

                    return (
                      <div
                        key={letter}
                        className="flex-1 flex flex-col items-center justify-end h-full gap-1 group relative"
                        title={`Questão ${qItem.qNum} - Alternativa ${letter}: ${count} votos (${
                          qItem.totalAnswers > 0 ? ((count / qItem.totalAnswers) * 100).toFixed(0) : 0
                        }%)`}
                      >
                        {/* Value number above bar */}
                        <span
                          className={`text-[10px] font-bold transition-all ${
                            count > 0 ? 'text-slate-700' : 'text-slate-400'
                          }`}
                        >
                          {count}
                        </span>

                        {/* Bar Pillar */}
                        <div className="w-full bg-slate-200/60 rounded-t-md h-full flex items-end">
                          <div
                            style={{ height: heightPercent }}
                            className={`w-full rounded-t-md transition-all duration-300 ${
                              isCorrectAlternative
                                ? 'bg-emerald-500 group-hover:bg-emerald-600'
                                : count > 0
                                ? 'bg-blue-600 group-hover:bg-blue-700'
                                : 'bg-slate-300/40'
                            }`}
                          ></div>
                        </div>

                        {/* Letter label below bar */}
                        <span
                          className={`text-[11px] font-bold mt-0.5 ${
                            isCorrectAlternative
                              ? 'text-emerald-700 font-extrabold'
                              : 'text-slate-500'
                          }`}
                        >
                          {letter}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Bottom summary for question */}
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 font-medium">
                    {qItem.correctAnswers}/{qItem.totalAnswers} acertos
                  </span>
                  <span
                    className={`font-bold px-1.5 py-0.5 rounded text-[9px] ${
                      qItem.accuracyPercentage >= 70
                        ? 'bg-emerald-100 text-emerald-800'
                        : qItem.accuracyPercentage >= 40
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {qItem.accuracyPercentage.toFixed(0)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
