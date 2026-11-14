'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import {
  UserCheck,
  Calendar,
  BookOpen,
  CheckCircle2,
  XCircle,
  Lock,
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

export const PortalAlunoScreen: React.FC = () => {
  const { currentUser, exams, corrections, students, applications } = useApp();
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [filterDiscipline, setFilterDiscipline] = useState('Todas');

  const currentStudent = useMemo(() => {
    return students.find(
      (s) =>
        (currentUser.email && s.email?.toLowerCase() === currentUser.email.toLowerCase()) ||
        s.id === currentUser.id
    );
  }, [students, currentUser]);

  const studentHistory: StudentExamView[] = useMemo(() => {
    const studentCorrections = corrections.filter((c) => {
      if (currentStudent && c.studentId === currentStudent.id) return true;
      if (currentUser.id && c.studentId === currentUser.id) return true;
      if (currentUser.fullName && c.studentName?.toLowerCase() === currentUser.fullName.toLowerCase()) return true;
      return false;
    });

    return studentCorrections.map((c) => {
      const app = applications.find((a) => a.id === c.applicationId);
      const exam = exams.find((e) => e.id === app?.examId || e.id === c.applicationId);

      return {
        id: c.id,
        title: exam?.title || 'Avaliação Acadêmica',
        discipline: exam?.discipline || 'Disciplina Geral',
        term: exam?.semester || '2026/1',
        teacher: exam?.teacherId || 'Corpo Docente',
        date: c.confirmedAt ? new Date(c.confirmedAt).toLocaleDateString('pt-BR') : exam?.date || 'Recente',
        score: c.totalScore ?? 0,
        maxScore: c.maxScore || 10,
        answerKeyPublished: true,
        publicCode: c.clientCorrectionId || `PUB-${c.id.slice(0, 8).toUpperCase()}`,
        questionsSummary: (c.objectiveResults || []).map((q, idx) => ({
          number: idx + 1,
          chosen: q.chosen || '-',
          correct: q.correct || '-',
          isCorrect: q.isCorrect,
          score: q.score,
        })),
      };
    });
  }, [corrections, currentStudent, currentUser, applications, exams]);

  const disciplines = useMemo(() => {
    const set = new Set<string>();
    studentHistory.forEach((h) => set.add(h.discipline));
    return ['Todas', ...Array.from(set)];
  }, [studentHistory]);

  const filteredExams = useMemo(() => {
    return studentHistory.filter(
      (e) => filterDiscipline === 'Todas' || e.discipline === filterDiscipline
    );
  }, [studentHistory, filterDiscipline]);

  const activeSelectedId = selectedExamId || (filteredExams[0]?.id ?? '');
  const selectedExam = filteredExams.find((e) => e.id === activeSelectedId) || filteredExams[0];

  const averageScore = useMemo(() => {
    if (studentHistory.length === 0) return 0;
    const sum = studentHistory.reduce((acc, curr) => acc + curr.score, 0);
    return Number((sum / studentHistory.length).toFixed(1));
  }, [studentHistory]);

  const overallAccuracy = useMemo(() => {
    let totalQuestions = 0;
    let correctQuestions = 0;
    studentHistory.forEach((h) => {
      h.questionsSummary.forEach((q) => {
        totalQuestions++;
        if (q.isCorrect) correctQuestions++;
      });
    });
    return totalQuestions > 0 ? Math.round((correctQuestions / totalQuestions) * 100) : 0;
  }, [studentHistory]);

  const studentName = currentUser.fullName || 'Estudante';
  const initials = studentName
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'AL';

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#9E0B1A] uppercase tracking-wider">
            <UserCheck className="w-4 h-4" />
            <span>Portal do Aluno (Católica SC)</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">
            Meu Histórico de Provas e Notas
          </h1>
          <p className="text-xs text-slate-500">
            Acesso autenticado do estudante para conferir resultados e gabaritos publicados.
          </p>
        </div>

        {/* Student identification badge */}
        <div className="flex items-center gap-2.5 bg-white border border-slate-200 px-3.5 py-2 rounded-2xl shadow-2xs self-start sm:self-auto">
          <div className="w-8 h-8 rounded-full bg-red-100 text-[#9E0B1A] font-bold flex items-center justify-center text-xs">
            {initials}
          </div>
          <div className="text-left text-xs">
            <div className="font-bold text-slate-900">{studentName}</div>
            <div className="text-[10px] text-slate-500 font-mono">
              {currentStudent?.registration || currentUser.id || 'Matrícula'} • {currentUser.email || '@catolicasc.edu.br'}
            </div>
          </div>
        </div>
      </div>

      {studentHistory.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900 text-base">Nenhuma avaliação ou nota disponível até o momento</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Suas avaliações e notas corrigidas aparecerão aqui automaticamente assim que forem publicadas pelo corpo docente.
          </p>
        </div>
      ) : (
        <>
          {/* Evolution Mini-Chart */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Média Geral do Aluno</span>
              <div className="text-2xl font-black text-slate-900 mt-2">{averageScore.toFixed(1)}</div>
              <div className="text-[11px] text-emerald-600 font-semibold mt-1">Média consolidada</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Provas Realizadas</span>
              <div className="text-2xl font-black text-slate-900 mt-2">{studentHistory.length} avaliações</div>
              <div className="text-[11px] text-slate-500 mt-1">Registros oficiais no sistema</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Aproveitamento Médio</span>
              <div className="text-2xl font-black text-emerald-700 mt-2">{overallAccuracy}%</div>
              <div className="text-[11px] text-slate-500 mt-1">Taxa de acerto em questões objetivas</div>
            </div>
          </div>

          {/* Main Grid: Exam List & Exam Detail */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: List of Student's Exams */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-slate-500" />
                  Minhas Avaliações
                </h2>
                {disciplines.length > 2 && (
                  <select
                    value={filterDiscipline}
                    onChange={(e) => setFilterDiscipline(e.target.value)}
                    className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700"
                  >
                    {disciplines.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-2.5">
                {filteredExams.map((exam) => {
                  const isSelected = exam.id === selectedExam?.id;

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
            {selectedExam && (
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
                      As respostas questão a questão e os critérios são liberados para visualização do aluno após a publicação pelo docente.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
