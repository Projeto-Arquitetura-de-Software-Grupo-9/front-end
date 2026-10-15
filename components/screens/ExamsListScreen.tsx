'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import {
  FileText,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Layers,
  Eye,
  Edit3,
  TrendingUp,
  Printer,
  Sparkles,
  Users,
  Calendar,
  ChevronRight,
  BookOpen,
} from 'lucide-react';

export const ExamsListScreen: React.FC = () => {
  const { exams, searchQuery, setSearchQuery, setActiveExamId } = useApp();
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
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold">
              Central de Avaliações
            </span>
            <span className="text-xs font-semibold text-slate-400">
              {totalExams} avaliações cadastradas
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
            Minhas Provas
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Acesse seus cadernos institucionais A4, folhas de respostas OMR, gabaritos e relatórios estatísticos.
          </p>
        </div>

        <Link
          href="/provas/new"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" /> Criar Nova Prova
        </Link>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500">Total de Provas</span>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">{totalExams}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500">Corrigidas (OMR)</span>
            <div className="text-2xl font-extrabold text-emerald-600 mt-1">{correctedExams}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500">Pendentes</span>
            <div className="text-2xl font-extrabold text-amber-600 mt-1">{pendingExams}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500">Em Andamento</span>
            <div className="text-2xl font-extrabold text-indigo-600 mt-1">{inProgressExams}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          {(['Todos', 'Corrigida', 'Pendente', 'Em Andamento'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                statusFilter === st
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Discipline and Search */}
        <div className="flex items-center gap-3">
          <select
            value={disciplineFilter}
            onChange={(e) => setDisciplineFilter(e.target.value)}
            className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 appearance-none cursor-pointer focus:outline-none"
          >
            {disciplines.map((d) => (
              <option key={d} value={d}>
                {d === 'Todas' ? 'Todas as Disciplinas' : d}
              </option>
            ))}
          </select>

          <div className="relative w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Filtrar por nome ou código..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>
      </div>

      {/* Exams Grid */}
      <div className="grid grid-cols-1 gap-4">
        {filteredExams.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Nenhuma avaliação encontrada</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Nenhuma prova corresponde aos filtros selecionados. Tente ajustar os termos de busca ou crie uma nova avaliação.
            </p>
            <div className="pt-2">
              <Link
                href="/provas/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition"
              >
                <Plus className="w-4 h-4" /> Criar Avaliação
              </Link>
            </div>
          </div>
        ) : (
          filteredExams.map((exam) => (
            <div
              key={exam.id}
              className="bg-white rounded-2xl border border-slate-200 hover:border-blue-300 shadow-xs hover:shadow-md transition duration-200 p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6"
            >
              {/* Exam Info */}
              <div className="space-y-3 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200/60">
                    {exam.code}
                  </span>

                  {exam.status === 'Corrigida' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Corrigida
                    </span>
                  ) : exam.status === 'Pendente' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                      <Clock className="w-3.5 h-3.5" /> Pendente
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
                      <Layers className="w-3.5 h-3.5" /> Em Andamento
                    </span>
                  )}

                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                    {exam.numberOfVersions || 4} Cadernos (A, B, C, D)
                  </span>
                </div>

                <div>
                  <Link
                    href={`/provas/${exam.id}?p=caderno`}
                    className="text-lg font-bold text-slate-900 hover:text-blue-600 transition"
                  >
                    {exam.title}
                  </Link>
                  <p className="text-xs text-slate-500 mt-1">
                    {exam.course} • {exam.discipline} • {exam.classGroup} • Semestre {exam.semester}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 font-medium">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" /> {exam.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" /> {exam.duration}
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-slate-400" /> {exam.selectedQuestionIds?.length || 5} questões
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-slate-400" /> {exam.totalStudents || 34} alunos
                  </span>
                </div>
              </div>

              {/* Action Buttons Hub for this Exam */}
              <div className="flex flex-wrap lg:flex-nowrap items-center gap-2.5 flex-shrink-0">
                {/* Caderno A4 Preview & Print */}
                <Link
                  href={`/provas/${exam.id}?p=caderno`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold shadow-xs transition"
                  title="Abrir Simulador e Impressão do Caderno A4"
                >
                  <Eye className="w-4 h-4 text-blue-600" /> Caderno A4
                </Link>

                {/* Folha de Respostas OMR */}
                <Link
                  href={`/provas/${exam.id}?p=folha`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold shadow-xs transition"
                  title="Abrir Folha de Respostas Óptica OMR"
                >
                  <FileText className="w-4 h-4 text-emerald-600" /> Folha OMR
                </Link>

                {/* Resultados / Relatórios */}
                {exam.status === 'Corrigida' ? (
                  <Link
                    href={`/resultados?examId=${exam.id}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold shadow-xs transition"
                    title="Ver Resultados e Análise Estatística"
                  >
                    <TrendingUp className="w-4 h-4 text-emerald-400" /> Resultados
                  </Link>
                ) : (
                  <Link
                    href={`/provas/new?edit=${exam.id}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold shadow-xs transition"
                    title="Editar Prova"
                  >
                    <Edit3 className="w-4 h-4 text-slate-500" /> Editar
                  </Link>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
