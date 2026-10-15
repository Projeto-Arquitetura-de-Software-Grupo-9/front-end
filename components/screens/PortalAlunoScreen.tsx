'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  UserCheck,
  Award,
  Calendar,
  BookOpen,
  CheckCircle2,
  XCircle,
  TrendingUp,
  FileText,
  Lock,
  ChevronRight,
  Filter,
} from 'lucide-react';

interface StudentExamView {
  id: string;
  title: string;
  discipline: string;
  term: string;
  teacher: string;
  date: string;
  score: number;
  maxScore: number;
  answerKeyPublished: boolean;
  publicCode: string;
  questionsSummary: Array<{
    number: number;
    chosen: string;
    correct: string;
    isCorrect: boolean;
    score: number;
  }>;
}

const MOCK_STUDENT_HISTORY: StudentExamView[] = [
  {
    id: 'sexam-1',
    title: 'P1 - Direito Constitucional I',
    discipline: 'Direito Constitucional',
    term: '2026/1',
    teacher: 'Prof. Dr. Ricardo Silveira',
    date: '12 Mar, 2026',
    score: 9.2,
    maxScore: 10.0,
    answerKeyPublished: true,
    publicCode: 'PUB-DIR-2026-A1',
    questionsSummary: [
      { number: 1, chosen: 'B', correct: 'B', isCorrect: true, score: 1.0 },
      { number: 2, chosen: 'A', correct: 'A', isCorrect: true, score: 1.0 },
      { number: 3, chosen: 'E', correct: 'E', isCorrect: true, score: 1.0 },
      { number: 4, chosen: 'A', correct: 'A', isCorrect: true, score: 1.0 },
      { number: 5, chosen: 'A', correct: 'A', isCorrect: true, score: 1.0 },
      { number: 6, chosen: 'B', correct: 'B', isCorrect: true, score: 1.0 },
      { number: 7, chosen: 'A', correct: 'A', isCorrect: true, score: 1.0 },
      { number: 8, chosen: 'D', correct: 'D', isCorrect: true, score: 1.0 },
      { number: 9, chosen: 'A', correct: 'A', isCorrect: true, score: 1.0 },
      { number: 10, chosen: 'A', correct: 'A', isCorrect: true, score: 1.0 },
      { number: 11, chosen: 'C', correct: 'B', isCorrect: false, score: 0 },
      { number: 12, chosen: 'D', correct: 'D', isCorrect: true, score: 1.0 },
    ],
  },
  {
    id: 'sexam-2',
    title: 'P1 - Teoria Geral do Delito',
    discipline: 'Direito Penal I',
    term: '2026/1',
    teacher: 'Prof. Dra. Camila Rocha',
    date: '04 Mar, 2026',
    score: 8.5,
    maxScore: 10.0,
    answerKeyPublished: true,
    publicCode: 'PUB-PEN-2026-T1',
    questionsSummary: [
      { number: 1, chosen: 'A', correct: 'A', isCorrect: true, score: 1.0 },
      { number: 2, chosen: 'B', correct: 'B', isCorrect: true, score: 1.0 },
      { number: 3, chosen: 'C', correct: 'C', isCorrect: true, score: 1.0 },
      { number: 4, chosen: 'A', correct: 'D', isCorrect: false, score: 0 },
      { number: 5, chosen: 'E', correct: 'E', isCorrect: true, score: 1.0 },
    ],
  },
  {
    id: 'sexam-3',
    title: 'P2 - Direito Civil (Obrigações)',
    discipline: 'Direito Civil II',
    term: '2025/2',
    teacher: 'Prof. Me. Rodrigo Lima',
    date: '28 Nov, 2025',
    score: 7.8,
    maxScore: 10.0,
    answerKeyPublished: false,
    publicCode: 'PUB-CIV-2025-P2',
    questionsSummary: [],
  },
];

export const PortalAlunoScreen: React.FC = () => {
  const [selectedExamId, setSelectedExamId] = useState<string>(MOCK_STUDENT_HISTORY[0].id);
  const [filterDiscipline, setFilterDiscipline] = useState('Todas');

  const selectedExam = MOCK_STUDENT_HISTORY.find((e) => e.id === selectedExamId) || MOCK_STUDENT_HISTORY[0];

  const filteredExams = MOCK_STUDENT_HISTORY.filter(
    (e) => filterDiscipline === 'Todas' || e.discipline === filterDiscipline
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#9E0B1A] uppercase tracking-wider">
            <UserCheck className="w-4 h-4" />
            <span>Feature 11 – Portal do Aluno (Católica SC)</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">
            Meu Histórico de Provas e Notas
          </h1>
          <p className="text-xs text-slate-500">
            Acesso autenticado do estudante (@catolicasc.edu.br) para conferir resultados e gabaritos publicados.
          </p>
        </div>

        {/* Student identification badge */}
        <div className="flex items-center gap-2.5 bg-white border border-slate-200 px-3.5 py-2 rounded-2xl shadow-2xs self-start sm:self-auto">
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-xs">
            AD
          </div>
          <div className="text-left text-xs">
            <div className="font-bold text-slate-900">Amanda Dolores</div>
            <div className="text-[10px] text-slate-500 font-mono">2024.1.001 • @catolicasc.edu.br</div>
          </div>
        </div>
      </div>

      {/* Evolution Mini-Chart */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Média Geral do Aluno</span>
          <div className="text-2xl font-black text-slate-900 mt-2">8.5</div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1">Acima da média da turma (7.2)</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Provas Realizadas</span>
          <div className="text-2xl font-black text-slate-900 mt-2">3 avaliações</div>
          <div className="text-[11px] text-slate-500 mt-1">100% de presença confirmada</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Aproveitamento Médio</span>
          <div className="text-2xl font-black text-emerald-700 mt-2">85%</div>
          <div className="text-[11px] text-slate-500 mt-1">Taxa de acerto em questões objetivas</div>
        </div>
      </div>

      {/* Main Grid: Exam List & Exam Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: List of Student's Exams */}
        <div className="space-y-3">
          <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-slate-500" />
            Minhas Avaliações
          </h2>

          <div className="space-y-2.5">
            {filteredExams.map((exam) => {
              const isSelected = exam.id === selectedExam.id;

              return (
                <div
                  key={exam.id}
                  onClick={() => setSelectedExamId(exam.id)}
                  className={`p-4 rounded-2xl border transition text-left cursor-pointer ${
                    isSelected
                      ? 'bg-white border-[#9E0B1A] shadow-md ring-1 ring-[#9E0B1A]/20'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase bg-slate-100 px-1.5 py-0.5 rounded">
                        {exam.term}
                      </span>
                      <h3 className="font-bold text-slate-900 text-sm mt-1">{exam.title}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{exam.teacher}</p>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-black text-emerald-700">
                        {exam.score.toFixed(1)}
                      </div>
                      <span className="text-[10px] text-slate-400">de {exam.maxScore}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 text-[11px]">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {exam.date}
                    </span>

                    {exam.answerKeyPublished ? (
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Gabarito Disponível
                      </span>
                    ) : (
                      <span className="text-slate-400 font-medium flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        Gabarito Pendente
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Detailed Exam View */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase bg-slate-100 px-2 py-0.5 rounded">
                {selectedExam.discipline} • {selectedExam.term}
              </span>
              <h2 className="text-lg font-bold text-slate-900 mt-1">
                {selectedExam.title}
              </h2>
              <p className="text-xs text-slate-500">
                Professor: <strong>{selectedExam.teacher}</strong> • Realizada em {selectedExam.date}
              </p>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-2xl text-center">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Nota Final</span>
              <span className="text-2xl font-black text-emerald-700">
                {selectedExam.score.toFixed(1)} / {selectedExam.maxScore.toFixed(1)}
              </span>
            </div>
          </div>

          {/* Breakdown per question (when answer key is published) */}
          {selectedExam.answerKeyPublished ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-xs">
                  Detalhamento de Acertos por Questão
                </h3>
                <span className="text-xs text-slate-500 font-mono">
                  Código de Consulta: <strong>{selectedExam.publicCode}</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {selectedExam.questionsSummary.map((q) => (
                  <div
                    key={q.number}
                    className={`p-3 rounded-xl border flex items-center justify-between ${
                      q.isCorrect
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : 'bg-rose-50/50 border-rose-200'
                    }`}
                  >
                    <div>
                      <div className="text-[11px] font-bold text-slate-700">
                        Questão {q.number}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Marcou: <strong className="font-bold">{q.chosen}</strong> • Correta: <strong>{q.correct}</strong>
                      </div>
                    </div>

                    <div>
                      {q.isCorrect ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
              <Lock className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="font-bold text-slate-700 text-sm">
                O gabarito oficial ainda não foi publicado pelo professor
              </div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Conforme a Feature 7 da especificação, as respostas questão a questão e os critérios só são liberados para visualização do aluno após a publicação pelo docente.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
