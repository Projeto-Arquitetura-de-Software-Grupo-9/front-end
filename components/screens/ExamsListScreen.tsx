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
  Printer,
  Copy,
  Trash2,
  QrCode,
} from 'lucide-react';

export const ExamsListScreen: React.FC = () => {
  const {
    exams,
    searchQuery,
    setSearchQuery,
    deleteExam,
    duplicateExam,
    resetExamDraft,
    setActiveExamId,
    setIsScannerModalOpen,
  } = useApp();
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Corrigida' | 'Pendente' | 'Em Andamento'>('Todos');
  const [disciplineFilter, setDisciplineFilter] = useState<string>('Todas');

  const disciplines = ['Todas', ...Array.from(new Set(exams.map((e) => e.discipline)))];

  const filteredExams = exams.filter((exam) => {
    const matchesSearch =
      searchQuery === '' ||
      exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exam.discipline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (exam.course || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (exam.classGroup || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      exam.code.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'Todos' || exam.status === statusFilter;
    const matchesDiscipline = disciplineFilter === 'Todas' || exam.discipline === disciplineFilter;

    return matchesSearch && matchesStatus && matchesDiscipline;
  });

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Minhas Provas
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Crie provas rapidamente, configure a impressão (nominal/avulsa, cadernos aleatórios, folha de resposta) e acompanhe os resultados.
          </p>
        </div>

        <Link
          href="/provas/new"
          onClick={() => resetExamDraft()}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#9E0B1A] hover:bg-[#850916] text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" /> Nova Prova
        </Link>
      </div>

      {/* Unified Minimalist Filter & Search Bar */}
      <div className="bg-white px-3 py-2.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        {/* Segmented Status Pills */}
        <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-lg self-start">
          {(['Todos', 'Corrigida', 'Pendente', 'Em Andamento'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                statusFilter === st
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
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
            className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 cursor-pointer focus:outline-none"
          >
            {disciplines.map((d) => (
              <option key={d} value={d}>
                {d === 'Todas' ? 'Todas as Disciplinas' : d}
              </option>
            ))}
          </select>

          <div className="relative w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar prova ou turma..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-300"
            />
          </div>
        </div>
      </div>

      {/* Clean Exams List */}
      <div className="space-y-2.5">
        {filteredExams.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center space-y-3">
            <FileText className="w-9 h-9 text-slate-300 mx-auto" />
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                {exams.length === 0 ? 'Nenhuma prova cadastrada' : 'Nenhuma prova encontrada'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {exams.length === 0
                  ? 'Crie sua primeira prova com informações básicas e questões.'
                  : 'Tente ajustar os filtros ou termos de busca.'}
              </p>
            </div>
            {exams.length === 0 ? (
              <Link
                href="/provas/new"
                onClick={() => resetExamDraft()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#9E0B1A] hover:bg-[#850916] text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                <Plus className="w-4 h-4" /> Criar Primeira Prova
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
          filteredExams.map((exam) => {
            const numV = exam.numberOfVersions || 4;
            return (
              <div
                key={exam.id}
                className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 shadow-2xs transition px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                {/* Exam Info */}
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
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
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600">
                        <Layers className="w-3 h-3" /> Pronta p/ Impressão
                      </span>
                    )}

                    <span className="text-[11px] text-slate-400">•</span>
                    <span className="text-[11px] font-medium text-slate-500">
                      {exam.selectedQuestionIds?.length || exam.versions?.[0]?.questions?.length || 0} questões
                    </span>
                    <span className="text-[11px] text-slate-400">•</span>
                    <span className="text-[11px] font-medium text-slate-500">
                      {numV === 1
                        ? 'Ordem Fixa (Caderno A)'
                        : `${numV} Cadernos (A–${String.fromCharCode(64 + numV)})`}
                    </span>
                    <span className="text-[11px] text-slate-400">•</span>
                    <span className="text-[11px] font-medium text-slate-500">
                      {exam.withStudentIdentification === false ? 'Avulsa' : 'Nominal'}
                    </span>
                  </div>

                  <Link
                    href={`/provas/${exam.id}?p=caderno`}
                    className="text-sm font-bold text-slate-900 hover:text-[#9E0B1A] transition block truncate"
                  >
                    {exam.title}
                  </Link>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                    <span className="font-medium text-slate-700">{exam.classGroup}</span>
                    <span>•</span>
                    <span>{exam.discipline}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" /> {exam.date}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-slate-400" /> {exam.totalStudents || 32} alunos
                    </span>
                  </div>
                </div>

                {/* Action Buttons: Clean, Modern & Uncluttered */}
                <div className="flex items-center gap-1.5 flex-shrink-0 self-end sm:self-center">
                  <Link
                    href={`/provas/${exam.id}?p=caderno`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#9E0B1A] hover:bg-[#850916] text-white text-xs font-bold rounded-lg transition shadow-2xs"
                    title="Ver Prova no Formato A4 e Configurar Impressão"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimir / Ver A4</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveExamId(exam.id);
                      setIsScannerModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-lg transition cursor-pointer"
                    title="Ler QR Code e Corrigir Gabarito"
                  >
                    <QrCode className="w-3.5 h-3.5 text-[#9E0B1A]" />
                    <span className="hidden md:inline">Ler QR</span>
                  </button>

                  <Link
                    href={`/resultados?examId=${exam.id}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-lg transition"
                    title="Ver Resultados e Estatísticas da Prova"
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="hidden md:inline">Resultados</span>
                  </Link>

                  <div className="flex items-center gap-0.5 border-l border-slate-200 pl-1.5 ml-0.5">
                    <Link
                      href={`/provas/new?edit=${exam.id}`}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                      title="Editar Informações e Questões"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </Link>

                    <button
                      type="button"
                      onClick={() => duplicateExam(exam.id)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                      title="Duplicar Prova"
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
                      title="Excluir Prova"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
