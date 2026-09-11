'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  FileText,
  FolderOpen,
  Users,
  CheckCircle2,
  Plus,
  Camera,
  Edit3,
  Eye,
  TrendingUp,
  ChevronDown,
  ArrowUpRight,
  Printer,
  Sparkles,
} from 'lucide-react';

export const DashboardScreen: React.FC = () => {
  const {
    exams,
    questions,
    students,
    setCurrentScreen,
    setExamWizardStep,
    setActiveExamId,
    setIsScannerModalOpen,
    navigateToPreview,
    navigateToResults,
  } = useApp();

  const [timeFilter, setTimeFilter] = useState('Últimos 30 Dias');

  const chartData = [
    { label: 'Semana 1', count: 18, height: '35%' },
    { label: 'Semana 2', count: 68, height: '72%' },
    { label: 'Semana 3', count: 94, height: '90%' },
    { label: 'Semana 4 (Atual)', count: 96, height: '92%' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Welcome Banner */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Bem-vindo de volta, Professor(a)
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Aqui está um resumo do desempenho das suas turmas e atividades pendentes.
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total de Provas */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-300 transition group">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Total de Provas Criadas</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
              128
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs">
              <span className="font-semibold text-emerald-600">+4 novas</span>
              <span className="text-slate-400">este semestre</span>
            </div>
          </div>
        </div>

        {/* Card 2: Questões no Banco */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-300 transition group">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Questões no Banco</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition">
              <FolderOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
              845
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs">
              <span className="font-semibold text-emerald-600">+15 esta semana</span>
              <span className="text-slate-400">fácil reutilização</span>
            </div>
          </div>
        </div>

        {/* Card 3: Alunos Cadastrados */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-300 transition group">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Alunos Cadastrados</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
              1.247
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs">
              <span className="font-semibold text-rose-600">Fidelizados</span>
              <span className="text-slate-400">em 4 turmas</span>
            </div>
          </div>
        </div>

        {/* Card 4: Provas Corrigidas Hoje */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-300 transition group">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Provas Corrigidas Hoje</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
              56
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs">
              <span className="font-semibold text-emerald-600">Meta diária batida</span>
              <span className="text-slate-400">via escaneamento</span>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Section: Chart and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Column (2 spans) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-bold text-slate-900">
              Volume de Provas Corrigidas por Semana
            </h2>
            <div className="relative">
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5 pr-8 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option>Últimos 30 Dias</option>
                <option>Último Semestre</option>
                <option>Últimos 7 Dias</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Bar Chart Container */}
          <div className="h-56 flex items-end justify-between px-6 pt-4 pb-2 gap-4 border-b border-slate-100">
            {chartData.map((item, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                <span className="text-xs font-semibold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white px-2 py-0.5 rounded shadow-sm">
                  {item.count} provas
                </span>
                <div className="w-14 bg-slate-100 rounded-t-xl overflow-hidden flex items-end h-full max-h-44">
                  <div
                    style={{ height: item.height }}
                    className="w-full bg-blue-600 rounded-t-xl group-hover:bg-blue-700 transition-all duration-500"
                  ></div>
                </div>
                <span className="text-xs font-medium text-slate-500 text-center whitespace-nowrap mt-1">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions (1 span) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 mb-4">Ações Rápidas</h2>
            <div className="space-y-3.5">
              {/* Action 1: Criar Nova Prova */}
              <button
                onClick={() => {
                  setExamWizardStep(1);
                  setCurrentScreen('criar-prova');
                }}
                className="w-full p-4 rounded-xl bg-blue-50/70 hover:bg-blue-100/70 border border-blue-100 flex items-center gap-3.5 text-left transition group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition flex-shrink-0">
                  <Plus className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">
                    Criar Nova Prova
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Gere provas com gabarito</p>
                </div>
              </button>

              {/* Action 2: Escanear Folhas */}
              <button
                onClick={() => setIsScannerModalOpen(true)}
                className="w-full p-4 rounded-xl bg-emerald-50/70 hover:bg-emerald-100/70 border border-emerald-100 flex items-center gap-3.5 text-left transition group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition flex-shrink-0">
                  <Camera className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">
                    Escanear Folhas
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Subir imagens para correção IA</p>
                </div>
              </button>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                IA de OCR calibrada
              </span>
              <span className="font-semibold text-emerald-600">99.8% acurácia</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Exams Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 pb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Provas Recentes</h2>
          <button
            onClick={() => setCurrentScreen('criar-prova')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            Ver todas as provas <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-y border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-6">Nome da Prova</th>
                <th className="py-3.5 px-6">Disciplina</th>
                <th className="py-3.5 px-6">Data</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {exams.map((exam) => (
                <tr key={exam.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-4 px-6 font-semibold text-slate-900">
                    <button
                      onClick={() => navigateToPreview(exam.id)}
                      className="hover:text-blue-600 text-left transition font-semibold"
                    >
                      {exam.title}
                    </button>
                  </td>
                  <td className="py-4 px-6 text-slate-600 font-medium">{exam.discipline}</td>
                  <td className="py-4 px-6 text-slate-500">{exam.date}</td>
                  <td className="py-4 px-6">
                    {exam.status === 'Corrigida' ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                        Corrigida
                      </span>
                    ) : exam.status === 'Pendente' ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                        Pendente
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
                        Em Andamento
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-2 text-slate-400">
                      <button
                        onClick={() => {
                          setActiveExamId(exam.id);
                          setExamWizardStep(1);
                          setCurrentScreen('criar-prova');
                        }}
                        className="p-1.5 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                        title="Editar Prova"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (exam.status === 'Corrigida') {
                            navigateToResults(exam.id);
                          } else {
                            navigateToPreview(exam.id);
                          }
                        }}
                        className="p-1.5 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                        title={exam.status === 'Corrigida' ? 'Ver Resultados' : 'Pré-visualização'}
                      >
                        {exam.status === 'Corrigida' ? (
                          <TrendingUp className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Eye className="w-4 h-4 text-blue-600" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
