'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import {
  FileText,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Layers,
  Edit3,
  TrendingUp,
  Users,
  Calendar,
  ChevronRight,
  BookOpen,
  Copy,
  Trash2,
} from 'lucide-react';

export const ExamsListScreen: React.FC = () => {
  const { exams, searchQuery, setSearchQuery, deleteExam, duplicateExam, resetExamDraft } = useApp();
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Corrigida' | 'Pendente' | 'Em Andamento'>('Todos');
  const [disciplineFilter, setDisciplineFilter] = useState<string>('Todas');

  const disciplines = ['Todas', ...Array.from(new Set(exams.map((e) => e.discipline)))];

  const filteredExams = exams.filter((exam) => {
    const matchesSearch =
      searchQuery === '' ||
      exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exam.discipline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exam.course.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exam.classGroup.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exam.code.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'Todos' || exam.status === statusFilter;
    const matchesDiscipline = disciplineFilter === 'Todas' || exam.discipline === disciplineFilter;

    return matchesSearch && matchesStatus && matchesDiscipline;
  });

  const totalExams = exams.length;
  const correctedExams = exams.filter((e) => e.status === 'Corrigida').length;
  const pendingExams = exams.filter((e) => e.status === 'Pendente').length;
  const inProgressExams = exams.filter((e) => e.status === 'Em Andamento').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Minhas Provas
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Gerencie seus cadernos de questões A4, gabaritos e folhas de respostas OMR.
          </p>
        </div>

        <Link
          href="/provas/new"
          onClick={() => resetExamDraft()}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" /> Criar Nova Prova
        </Link>
      </div>

      {/* KPI Stats Bar (Clean & Compact) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-400">Total</span>
            <div className="text-xl font-bold text-slate-900">{totalExams} provas</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <BookOpen className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-400">Corrigidas</span>
            <div className="text-xl font-bold text-emerald-600">{correctedExams}</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-400">Pendentes</span>
            <div className="text-xl font-bold text-amber-600">{pendingExams}</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-400">Em Andamento</span>
            <div className="text-xl font-bold text-indigo-600">{inProgressExams}</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Layers className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-1">
          {(['Todos', 'Corrigida', 'Pendente', 'Em Andamento'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                statusFilter === st
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Discipline and Search */}
        <div className="flex items-center gap-2">
          <select
            value={disciplineFilter}
            onChange={(e) => setDisciplineFilter(e.target.value)}
            className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 appearance-none cursor-pointer focus:outline-none"
          >
            {disciplines.map((d) => (
              <option key={d} value={d}>
                {d === 'Todas' ? 'Todas as Disciplinas' : d}
              </option>
            ))}
          </select>

          <div className="relative w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar prova..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
            />
          </div>
        </div>
      </div>

      {/* Clean Exams List */}
      <div className="space-y-3">
        {filteredExams.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center space-y-3">
            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                {exams.length === 0 ? 'Nenhuma avaliação cadastrada' : 'Nenhuma avaliação encontrada'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {exams.length === 0
                  ? 'Crie sua primeira prova para gerar cadernos A4 e folhas de respostas OMR.'
                  : 'Tente ajustar seus filtros ou termos de busca.'}
              </p>
            </div>
            {exams.length === 0 ? (
              <Link
                href="/provas/new"
                onClick={() => resetExamDraft()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                <Plus className="w-4 h-4" /> Criar Minha Primeira Prova
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('Todos');
                  setDisciplineFilter('Todas');
                  setSearchQuery('');
                }}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                Limpar Filtros
              </button>
            )}
          </div>
        ) : (
          filteredExams.map((exam) => (
            <div
              key={exam.id}
              className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 shadow-xs hover:shadow-sm transition p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              {/* Exam Info */}
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                    {exam.code}
                  </span>

                  {exam.status === 'Corrigida' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                      <CheckCircle2 className="w-3 h-3" /> Corrigida
                    </span>
                  ) : exam.status === 'Pendente' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700">
                      <Clock className="w-3 h-3" /> Pendente
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700">
                      <Layers className="w-3 h-3" /> Em Andamento
                    </span>
                  )}

                  <span className="text-[11px] font-medium text-slate-500">
                    {exam.numberOfVersions || 4} Cadernos (A-D)
                  </span>
                </div>

                <Link
                  href={`/provas/${exam.id}?p=caderno`}
                  className="text-base font-bold text-slate-900 hover:text-blue-600 transition block truncate"
                >
                  {exam.title}
                </Link>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span>{exam.course} • {exam.discipline} • {exam.classGroup}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" /> {exam.date}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-slate-400" /> {exam.totalStudents || 34} alunos
                  </span>
                </div>
              </div>

              {/* Action Buttons: Clean & Focused (1 Primary + 1 Secondary + Subtle Icon Actions) */}
              <div className="flex items-center gap-1.5 flex-shrink-0 self-end sm:self-center">
                <Link
                  href={`/provas/${exam.id}?p=caderno`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-lg transition shadow-xs"
                  title="Abrir Caderno de Prova A4"
                >
                  <span>Caderno A4</span>
                  <ChevronRight className="w-3 h-3" />
                </Link>

                <Link
                  href={`/provas/${exam.id}?p=folha`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
                  title="Abrir Folha de Respostas OMR"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span>Folha OMR</span>
                </Link>

                <div className="flex items-center gap-0.5 border-l border-slate-200 pl-1.5 ml-0.5">
                  <Link
                    href={`/provas/new?edit=${exam.id}`}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    title="Editar Avaliação"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </Link>

                  <button
                    type="button"
                    onClick={() => duplicateExam(exam.id)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                    title="Duplicar Avaliação"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Deseja realmente excluir a prova "${exam.title}"?`)) {
                        deleteExam(exam.id);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                    title="Excluir Avaliação"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  {exam.status === 'Corrigida' && (
                    <Link
                      href={`/resultados?examId=${exam.id}`}
                      className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                      title="Ver Resultados"
                    >
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
