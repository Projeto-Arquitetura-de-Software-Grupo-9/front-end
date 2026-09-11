'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Question } from '@/lib/types';
import {
  GripVertical,
  Trash2,
  Plus,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Search,
  Layers,
  FileCheck,
  Printer,
  FileText,
  Sliders,
  Settings2,
  RotateCcw,
} from 'lucide-react';

export const CreateExamScreen: React.FC = () => {
  const {
    questions,
    examDraft,
    setExamDraft,
    examWizardStep,
    setExamWizardStep,
    createExamFromDraft,
    setCurrentScreen,
    navigateToPreview,
    navigateToFolha,
    addToast,
  } = useApp();

  const [searchBankQuery, setSearchBankQuery] = useState('');
  const [filterDiscipline, setFilterDiscipline] = useState('Todas');

  // Selected questions objects
  const selectedQuestions = examDraft.selectedQuestionIds
    .map((id) => questions.find((q) => q.id === id))
    .filter((q): q is Question => q !== undefined);

  // Available questions (not yet selected)
  const availableQuestions = questions.filter((q) => {
    const isSelected = examDraft.selectedQuestionIds.includes(q.id);
    const matchesDisc =
      filterDiscipline === 'Todas' || q.discipline === filterDiscipline;
    const matchesSearch =
      searchBankQuery === '' ||
      q.statement.toLowerCase().includes(searchBankQuery.toLowerCase()) ||
      q.code.toLowerCase().includes(searchBankQuery.toLowerCase());
    return !isSelected && matchesDisc && matchesSearch;
  });

  const handleAddQuestion = (qId: string) => {
    if (!examDraft.selectedQuestionIds.includes(qId)) {
      setExamDraft((prev) => ({
        ...prev,
        selectedQuestionIds: [...prev.selectedQuestionIds, qId],
      }));
    }
  };

  const handleRemoveQuestion = (qId: string) => {
    setExamDraft((prev) => ({
      ...prev,
      selectedQuestionIds: prev.selectedQuestionIds.filter((id) => id !== qId),
    }));
  };

  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= examDraft.selectedQuestionIds.length) return;

    const newIds = [...examDraft.selectedQuestionIds];
    const temp = newIds[index];
    newIds[index] = newIds[targetIndex];
    newIds[targetIndex] = temp;

    setExamDraft((prev) => ({
      ...prev,
      selectedQuestionIds: newIds,
    }));
  };

  const handleAutoSelect = () => {
    const ids = questions.slice(0, 8).map((q) => q.id);
    setExamDraft((prev) => ({
      ...prev,
      selectedQuestionIds: ids,
    }));
    addToast({
      type: 'info',
      title: 'Seleção Automática',
      message: '8 questões selecionadas balanceadas para a prova.',
    });
  };

  const handleFinishAndGenerate = () => {
    if (examDraft.selectedQuestionIds.length === 0) {
      addToast({
        type: 'error',
        title: 'Selecione Questões',
        message: 'A prova precisa de pelo menos uma questão.',
      });
      setExamWizardStep(2);
      return;
    }

    const created = createExamFromDraft(examDraft);
    navigateToPreview(created.id);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Title & Top Toggles Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Criar Prova: {examDraft.title || 'Nova Avaliação'}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Gere variações aleatórias automaticamente a partir de questões selecionadas.
          </p>
        </div>

        {/* Top Toggles */}
        <div className="flex flex-wrap items-center gap-6 bg-white px-5 py-2.5 rounded-2xl border border-slate-200 shadow-xs">
          {/* Toggle 1: Embaralhar Questões */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <span className="text-xs font-semibold text-slate-700">
              Embaralhar Questões
            </span>
            <button
              type="button"
              onClick={() =>
                setExamDraft((prev) => ({
                  ...prev,
                  shuffleQuestions: !prev.shuffleQuestions,
                }))
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                examDraft.shuffleQuestions ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  examDraft.shuffleQuestions ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </label>

          {/* Toggle 2: Embaralhar Alternativas */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <span className="text-xs font-semibold text-slate-700">
              Embaralhar Alternativas
            </span>
            <button
              type="button"
              onClick={() =>
                setExamDraft((prev) => ({
                  ...prev,
                  shuffleAlternatives: !prev.shuffleAlternatives,
                }))
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                examDraft.shuffleAlternatives ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  examDraft.shuffleAlternatives ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </label>
        </div>
      </div>

      {/* 4-Step Stepper Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between overflow-x-auto">
        {[
          { step: 1, label: 'Informações' },
          { step: 2, label: 'Questões (Ativo)' },
          { step: 3, label: 'Configurações' },
          { step: 4, label: 'Revisão' },
        ].map((item) => {
          const isCurrent = examWizardStep === item.step;
          const isDone = examWizardStep > item.step;

          return (
            <button
              key={item.step}
              onClick={() => setExamWizardStep(item.step)}
              className={`flex items-center gap-2.5 px-4 py-2 rounded-xl transition cursor-pointer text-xs font-semibold whitespace-nowrap ${
                isCurrent
                  ? 'bg-blue-50 text-blue-700 border border-blue-200/80 shadow-xs'
                  : isDone
                  ? 'text-emerald-700 hover:bg-emerald-50'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  isCurrent
                    ? 'bg-blue-600 text-white'
                    : isDone
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : item.step}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* STEP 1: Informações Gerais */}
      {examWizardStep === 1 && (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6 max-w-4xl">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-900">
              1. Dados Gerais da Avaliação
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Defina as informações institucionais que constarão no cabeçalho oficial da prova.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Nome / Título da Prova
              </label>
              <input
                type="text"
                value={examDraft.title}
                onChange={(e) =>
                  setExamDraft((p) => ({ ...p, title: e.target.value }))
                }
                placeholder="Ex: P1 - Direito Constitucional I - Turma A"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Disciplina
              </label>
              <input
                type="text"
                value={examDraft.discipline}
                onChange={(e) =>
                  setExamDraft((p) => ({ ...p, discipline: e.target.value }))
                }
                placeholder="Ex: Direito Constitucional"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Curso
              </label>
              <input
                type="text"
                value={examDraft.course}
                onChange={(e) =>
                  setExamDraft((p) => ({ ...p, course: e.target.value }))
                }
                placeholder="Ex: Direito"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Turma / Semestre
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={examDraft.classGroup}
                  onChange={(e) =>
                    setExamDraft((p) => ({ ...p, classGroup: e.target.value }))
                  }
                  placeholder="Turma A"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <input
                  type="text"
                  value={examDraft.semester}
                  onChange={(e) =>
                    setExamDraft((p) => ({ ...p, semester: e.target.value }))
                  }
                  placeholder="2024.2"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Data de Aplicação
              </label>
              <input
                type="text"
                value={examDraft.date}
                onChange={(e) =>
                  setExamDraft((p) => ({ ...p, date: e.target.value }))
                }
                placeholder="12 Mar, 2024"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Duração Máxima
              </label>
              <input
                type="text"
                value={examDraft.duration}
                onChange={(e) =>
                  setExamDraft((p) => ({ ...p, duration: e.target.value }))
                }
                placeholder="2 horas"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Instituição Universitária
              </label>
              <input
                type="text"
                value={examDraft.institution}
                onChange={(e) =>
                  setExamDraft((p) => ({ ...p, institution: e.target.value }))
                }
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Instruções Gerais para o Estudante
              </label>
              <textarea
                rows={3}
                value={examDraft.instructions}
                onChange={(e) =>
                  setExamDraft((p) => ({ ...p, instructions: e.target.value }))
                }
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              onClick={() => setExamWizardStep(2)}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-6 py-2.5 rounded-xl shadow-sm transition cursor-pointer"
            >
              Avançar para Seleção de Questões <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Questões (Ativo) matching criar-prova.png */}
      {examWizardStep === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Questões Disponíveis no Banco */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-slate-900">
                  Questões Disponíveis no Banco
                </h2>
                <button
                  onClick={handleAutoSelect}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Auto-selecionar
                </button>
              </div>

              {/* Filter Row */}
              <div className="flex items-center gap-2 mb-4">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Filtrar questões..."
                    value={searchBankQuery}
                    onChange={(e) => setSearchBankQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <span className="text-xs font-semibold text-slate-600 px-3 py-2 bg-slate-100 rounded-xl border border-slate-200/70">
                  {examDraft.discipline}
                </span>
              </div>

              {/* Available Question Cards */}
              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {availableQuestions.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-8">
                    Nenhuma questão extra encontrada com estes filtros.
                  </p>
                ) : (
                  availableQuestions.map((q) => (
                    <div
                      key={q.id}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 transition space-y-2.5"
                    >
                      <p className="text-xs font-medium text-slate-800 leading-snug">
                        {q.statement}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-100/70 text-blue-700">
                          {q.discipline}
                        </span>
                        <button
                          onClick={() => handleAddQuestion(q.id)}
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer shadow-xs"
                        >
                          Adicionar
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Questões Selecionadas para esta Prova */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-slate-900">
                  Questões Selecionadas para esta Prova
                </h2>
                <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                  {selectedQuestions.length} Questões Selecionadas
                </span>
              </div>

              {/* Selected List */}
              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {selectedQuestions.length === 0 ? (
                  <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl">
                    <p className="text-xs text-slate-400">
                      Nenhuma questão selecionada ainda. Clique em "Adicionar" ao lado.
                    </p>
                  </div>
                ) : (
                  selectedQuestions.map((q, index) => (
                    <div
                      key={q.id}
                      className="flex items-center gap-3 p-3.5 rounded-xl border border-blue-200 bg-blue-50/20 hover:border-blue-300 transition group"
                    >
                      <div className="text-slate-400 group-hover:text-slate-600 cursor-grab">
                        <GripVertical className="w-4 h-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-900 truncate">
                          <span className="font-bold mr-1.5 text-blue-700">
                            {index + 1}.
                          </span>
                          {q.statement}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleRemoveQuestion(q.id)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Remover questão"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Bottom Navigation Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => setExamWizardStep(1)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Voltar
              </button>

              <button
                onClick={() => setExamWizardStep(3)}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition cursor-pointer"
              >
                Avançar para Configurações <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Configurações de Embaralhamento e Gabarito */}
      {examWizardStep === 3 && (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6 max-w-4xl">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-900">
              3. Configurações de Variação & Folha
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Configure os cadernos com permutações aleatórias e critérios de pontuação.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Quantidade de Cadernos / Versões Diferentes
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() =>
                        setExamDraft((p) => ({ ...p, numberOfVersions: num }))
                      }
                      className={`py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        examDraft.numberOfVersions === num
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {num} {num === 1 ? 'Versão' : 'Versões'}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Gera automaticamente gabaritos cruzados para Caderno A, B, C e D.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Pontuação Máxima da Prova
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={examDraft.maxScore}
                  onChange={(e) =>
                    setExamDraft((p) => ({
                      ...p,
                      maxScore: parseFloat(e.target.value) || 10,
                    }))
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <div className="space-y-4 bg-slate-50/70 p-5 rounded-xl border border-slate-200/70">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Recursos de Segurança & Leitura OMR
              </h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-700 font-medium">
                    QR Code de Alinhamento OMR
                  </span>
                  <span className="text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded">
                    Ativado
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-700 font-medium">
                    Código de Barras por Estudante
                  </span>
                  <span className="text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded">
                    Ativado
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-700 font-medium">
                    Detecção Anti-Fraude de Respostas
                  </span>
                  <span className="text-blue-700 font-bold bg-blue-100 px-2 py-0.5 rounded">
                    Habilitada
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setExamWizardStep(2)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Voltar
            </button>

            <button
              onClick={() => setExamWizardStep(4)}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition cursor-pointer"
            >
              Avançar para Revisão <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Revisão & Geração */}
      {examWizardStep === 4 && (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6 max-w-4xl">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-900">
              4. Revisão e Geração de Gabaritos
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Verifique o resumo da avaliação antes de exportar as folhas e visualizar o caderno.
            </p>
          </div>

          {/* Summary Box */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-blue-50/60 border border-blue-100">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 block">
                Disciplina
              </span>
              <span className="text-sm font-bold text-slate-900">
                {examDraft.discipline}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 block">
                Total de Questões
              </span>
              <span className="text-sm font-bold text-blue-700">
                {selectedQuestions.length} questões
              </span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 block">
                Cadernos Gerados
              </span>
              <span className="text-sm font-bold text-slate-900">
                {examDraft.numberOfVersions} Cadernos (A-
                {String.fromCharCode(64 + examDraft.numberOfVersions)})
              </span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 block">
                Pontuação Total
              </span>
              <span className="text-sm font-bold text-emerald-700">
                {examDraft.maxScore.toFixed(1)} pts
              </span>
            </div>
          </div>

          {/* Shuffling details alert */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-900 text-xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div>
              <span className="font-bold">Embaralhamento Inteligente Ativo:</span> Cada versão terá permutações controladas de ordem de questões e alternativas, com gabarito sincronizado para leitura óptica.
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setExamWizardStep(3)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Voltar
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={handleFinishAndGenerate}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition cursor-pointer"
              >
                <FileCheck className="w-4 h-4" /> Gerar Prova & Pré-visualizar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
