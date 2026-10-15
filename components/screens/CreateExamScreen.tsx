'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { Question } from '@/lib/types';
import { A4ExamSheet } from '@/components/common/A4ExamSheet';
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
  ShieldCheck,
  ChevronDown,
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
    students,
    addToast,
  } = useApp();

  const [searchBankQuery, setSearchBankQuery] = useState('');
  const [filterDiscipline, setFilterDiscipline] = useState('Todas');
  const [previewCadernoInStep4, setPreviewCadernoInStep4] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [showGabaritoInStep4, setShowGabaritoInStep4] = useState(false);
  const [showStudentRosterInStep3, setShowStudentRosterInStep3] = useState(false);
  const [isCrossMatrixExpanded, setIsCrossMatrixExpanded] = useState(false);

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
      {/* Title & Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Criar Prova: {examDraft.title || 'Nova Avaliação'}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Configure informações, selecione questões e gere variações de cadernos.
          </p>
        </div>

        <Link
          href="/provas"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition shadow-xs self-start sm:self-center"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar para Provas
        </Link>
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
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6 max-w-4xl">
          <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                3. Variações & Ensalamento
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure os cadernos, regras de embaralhamento e distribuição de alunos.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 self-start sm:self-center">
              {selectedQuestions.length} questões selecionadas
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Left Column: Variações & Embaralhamento */}
            <div className="space-y-5">
              {/* Quantidade de Cadernos */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Quantidade de Cadernos (Versões)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() =>
                        setExamDraft((p) => ({ ...p, numberOfVersions: num }))
                      }
                      className={`py-2 rounded-xl text-xs font-bold border transition cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                        examDraft.numberOfVersions === num
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-xs">
                        {num === 1 ? '1 Caderno' : `${num} Cadernos`}
                      </span>
                      <span
                        className={`text-[10px] font-normal ${
                          examDraft.numberOfVersions === num
                            ? 'text-blue-100'
                            : 'text-slate-400'
                        }`}
                      >
                        {num === 1
                          ? 'Apenas A'
                          : num === 2
                          ? 'A e B'
                          : num === 3
                          ? 'A, B e C'
                          : 'A, B, C e D'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles de Embaralhamento */}
              <div className="space-y-2.5 pt-1">
                <label className="block text-xs font-bold text-slate-700">
                  Regras de Embaralhamento
                </label>

                <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 cursor-pointer transition">
                  <input
                    type="checkbox"
                    checked={examDraft.shuffleQuestions}
                    onChange={(e) =>
                      setExamDraft((p) => ({
                        ...p,
                        shuffleQuestions: e.target.checked,
                      }))
                    }
                    className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-800 block">
                      Embaralhar ordem das questões
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      Altera a sequência das perguntas entre os cadernos A, B, C e D.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 cursor-pointer transition">
                  <input
                    type="checkbox"
                    checked={examDraft.shuffleAlternatives}
                    onChange={(e) =>
                      setExamDraft((p) => ({
                        ...p,
                        shuffleAlternatives: e.target.checked,
                      }))
                    }
                    className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-800 block">
                      Embaralhar alternativas de resposta
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      Permuta as opções (A-E) mantendo o gabarito sincronizado no OMR.
                    </span>
                  </div>
                </label>
              </div>

              {/* Estratégia de Permutação */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Algoritmo de Permutação
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setExamDraft((p) => ({
                        ...p,
                        permutationStrategy: 'FISHER_YATES',
                      }))
                    }
                    className={`p-2.5 rounded-xl text-xs font-bold border text-left transition cursor-pointer ${
                      (examDraft.permutationStrategy || 'FISHER_YATES') === 'FISHER_YATES'
                        ? 'bg-blue-50 border-blue-600 text-blue-900 ring-1 ring-blue-600'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-bold">Fisher-Yates</div>
                    <div className="text-[10px] font-normal text-slate-500 mt-0.5">
                      Permutações estocásticas completas
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setExamDraft((p) => ({
                        ...p,
                        permutationStrategy: 'CYCLIC_ROTATION',
                      }))
                    }
                    className={`p-2.5 rounded-xl text-xs font-bold border text-left transition cursor-pointer ${
                      examDraft.permutationStrategy === 'CYCLIC_ROTATION'
                        ? 'bg-blue-50 border-blue-600 text-blue-900 ring-1 ring-blue-600'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-bold">Rotação Cíclica</div>
                    <div className="text-[10px] font-normal text-slate-500 mt-0.5">
                      Deslocamento posicional ordenado
                    </div>
                  </button>
                </div>
              </div>

              {/* Pontuação Máxima */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Pontuação Máxima da Prova
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    value={examDraft.maxScore}
                    onChange={(e) =>
                      setExamDraft((p) => ({
                        ...p,
                        maxScore: parseFloat(e.target.value) || 10,
                      }))
                    }
                    className="w-28 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <span className="text-xs text-slate-500 font-medium">
                    {(examDraft.maxScore / (selectedQuestions.length || 1)).toFixed(2)} pts por questão
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Ensalamento & Distribuição */}
            <div className="space-y-4">
              <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200/80 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Ensalamento da Turma
                  </h3>
                  <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full">
                    {students.length} Estudantes
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Os alunos são distribuídos sequencialmente entre os cadernos ativos para evitar versões idênticas lado a lado.
                </p>

                {/* Distribution cards per caderno */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['A', 'B', 'C', 'D'] as const)
                    .slice(0, examDraft.numberOfVersions)
                    .map((v, vIdx) => {
                      const count = students.filter(
                        (_, idx) => idx % examDraft.numberOfVersions === vIdx
                      ).length;
                      return (
                        <div
                          key={v}
                          className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs text-center"
                        >
                          <span className="text-xs font-black text-blue-700 block">
                            Caderno {v}
                          </span>
                          <span className="text-sm font-extrabold text-slate-900 block mt-0.5">
                            {count}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {count === 1 ? 'aluno' : 'alunos'}
                          </span>
                        </div>
                      );
                    })}
                </div>

                {/* Toggle nominal roster */}
                <div className="pt-2 border-t border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => setShowStudentRosterInStep3(!showStudentRosterInStep3)}
                    className="w-full py-2 px-3 rounded-xl border border-slate-200 hover:bg-white text-xs font-semibold text-slate-700 flex items-center justify-between transition cursor-pointer"
                  >
                    <span>
                      {showStudentRosterInStep3
                        ? 'Ocultar Ensalamento Detalhado'
                        : 'Ver Alocação Nominal de Alunos'}
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                        showStudentRosterInStep3 ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {showStudentRosterInStep3 && (
                    <div className="mt-3 max-h-48 overflow-y-auto divide-y divide-slate-100 bg-white rounded-xl border border-slate-200 text-xs">
                      {students.map((std, idx) => {
                        const assignedLetter = (['A', 'B', 'C', 'D'] as const)[
                          idx % examDraft.numberOfVersions
                        ];
                        return (
                          <div
                            key={std.id}
                            className="flex items-center justify-between px-3 py-2 text-slate-800 hover:bg-slate-50"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-5 text-[10px] text-slate-400 font-mono">
                                {idx + 1}.
                              </span>
                              <span className="font-semibold">{std.name}</span>
                              <span className="font-mono text-[10px] text-slate-400">
                                ({std.registration})
                              </span>
                            </div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-50 text-blue-800 border border-blue-200">
                              Caderno {assignedLetter}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Security & OMR features info box */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-slate-800 text-[11px] uppercase tracking-wide">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Garantias de Correção e Segurança OMR
                </div>
                <div className="text-[11px] text-slate-500 leading-relaxed space-y-1">
                  <div>• QR Code institucional em cada caderno com ID único e versão.</div>
                  <div>• 4 Marcadores fiduciais nos cantos para alinhamento por Visão Computacional.</div>
                  <div>• Matriz de gabaritos cruzados sincronizada para correção automatizada.</div>
                </div>
              </div>
            </div>
          </div>

          {/* Collapsible Cross Answer Matrix */}
          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Matriz de Gabaritos Cruzados
                </h3>
                <p className="text-[11px] text-slate-500">
                  Rastreamento sincronizado de cada questão e gabarito em cada caderno.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsCrossMatrixExpanded(!isCrossMatrixExpanded)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition cursor-pointer"
              >
                <span>{isCrossMatrixExpanded ? 'Ocultar Matriz' : 'Inspecionar Matriz'}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                    isCrossMatrixExpanded ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </div>

            {isCrossMatrixExpanded && (
              <div className="mt-3 overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/80 text-[11px] font-bold text-slate-700 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Questão Original</th>
                      <th className="py-2.5 px-3 text-center">Caderno A</th>
                      {examDraft.numberOfVersions >= 2 && (
                        <th className="py-2.5 px-3 text-center bg-blue-50/50">Caderno B</th>
                      )}
                      {examDraft.numberOfVersions >= 3 && (
                        <th className="py-2.5 px-3 text-center">Caderno C</th>
                      )}
                      {examDraft.numberOfVersions >= 4 && (
                        <th className="py-2.5 px-3 text-center bg-blue-50/50">Caderno D</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {selectedQuestions.map((q, idx) => {
                      const posA = idx + 1;
                      const letterA = q.correctAlternative;

                      const posB = ((idx + 1) % selectedQuestions.length) + 1;
                      const letters: ('A' | 'B' | 'C' | 'D' | 'E')[] = ['A', 'B', 'C', 'D', 'E'];
                      const letterB = examDraft.shuffleAlternatives
                        ? letters[(letters.indexOf(letterA) + 1) % letters.length]
                        : letterA;

                      const posC = ((idx + 2) % selectedQuestions.length) + 1;
                      const letterC = examDraft.shuffleAlternatives
                        ? letters[(letters.indexOf(letterA) + 2) % letters.length]
                        : letterA;

                      const posD = ((idx + 3) % selectedQuestions.length) + 1;
                      const letterD = examDraft.shuffleAlternatives
                        ? letters[(letters.indexOf(letterA) + 3) % letters.length]
                        : letterA;

                      return (
                        <tr key={q.id} className="hover:bg-slate-50/60 transition">
                          <td className="py-2 px-3 font-medium text-slate-900">
                            <span className="font-bold text-slate-400 mr-2">{idx + 1}.</span>
                            <span className="line-clamp-1">{q.statement}</span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className="font-semibold text-slate-600">Q.{posA}</span>{' '}
                            <span className="font-black text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                              ({letterA})
                            </span>
                          </td>
                          {examDraft.numberOfVersions >= 2 && (
                            <td className="py-2 px-3 text-center bg-blue-50/30">
                              <span className="font-semibold text-slate-600">Q.{posB}</span>{' '}
                              <span className="font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                ({letterB})
                              </span>
                            </td>
                          )}
                          {examDraft.numberOfVersions >= 3 && (
                            <td className="py-2 px-3 text-center">
                              <span className="font-semibold text-slate-600">Q.{posC}</span>{' '}
                              <span className="font-black text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                                ({letterC})
                              </span>
                            </td>
                          )}
                          {examDraft.numberOfVersions >= 4 && (
                            <td className="py-2 px-3 text-center bg-blue-50/30">
                              <span className="font-semibold text-slate-600">Q.{posD}</span>{' '}
                              <span className="font-black text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                ({letterD})
                              </span>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Bottom Navigation Buttons */}
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

          {/* Live A4 Sheet Simulation Preview Card */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-100 p-3 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800">
                  Pré-visualização da Folha Real (A4):
                </span>
                <span className="text-[11px] text-slate-500">
                  Católica SC / Padrão OMR
                </span>
              </div>

              <div className="flex items-center gap-3">
                {/* Caderno selector */}
                <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
                  {(['A', 'B', 'C', 'D'] as const)
                    .slice(0, examDraft.numberOfVersions)
                    .map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setPreviewCadernoInStep4(v)}
                        className={`px-2.5 py-0.5 text-xs font-bold rounded transition cursor-pointer ${
                          previewCadernoInStep4 === v
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Caderno {v}
                      </button>
                    ))}
                </div>

                {/* Toggle Gabarito */}
                <button
                  type="button"
                  onClick={() => setShowGabaritoInStep4(!showGabaritoInStep4)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition cursor-pointer ${
                    showGabaritoInStep4
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {showGabaritoInStep4 ? 'Ocultar Gabarito' : 'Ver Gabarito'}
                </button>
              </div>
            </div>

            {/* Simulated Drafting Table Surface */}
            <div className="bg-slate-200/90 p-4 sm:p-8 rounded-2xl border border-slate-300 shadow-inner overflow-hidden flex justify-center">
              <div className="origin-top scale-[0.65] sm:scale-[0.72] -my-24">
                <A4ExamSheet
                  exam={{
                    title: examDraft.title || 'P1 - Avaliação Semestral',
                    discipline: examDraft.discipline,
                    course: examDraft.course,
                    classGroup: examDraft.classGroup,
                    semester: examDraft.semester,
                    institution: examDraft.institution || 'Católica SC Centro Universitário',
                    department: examDraft.department || 'Escola de Direito',
                    code: '#DIR-EXAM-2024.2',
                    date: examDraft.date,
                    duration: examDraft.duration,
                    instructions: examDraft.instructions,
                  }}
                  questions={(() => {
                    const base = selectedQuestions.slice(0, 3);
                    const vLetter = previewCadernoInStep4;
                    if (vLetter === 'A') {
                      return base.map((q, idx) => ({
                        id: q.id,
                        orderIndex: idx + 1,
                        statement: q.statement,
                        alternatives: q.alternatives,
                        correctAlternative: q.correctAlternative,
                      }));
                    }
                    
                    const shift = vLetter === 'B' ? 1 : vLetter === 'C' ? 2 : 3;
                    const letters: ('A' | 'B' | 'C' | 'D' | 'E')[] = ['A', 'B', 'C', 'D', 'E'];
                    const reordered = [...base.slice(shift % base.length), ...base.slice(0, shift % base.length)];

                    return reordered.map((q, idx) => {
                      const correctText = q.alternatives.find((a) => a.letter === q.correctAlternative)?.text;
                      const altShift = (shift + idx) % q.alternatives.length;
                      const shuffledAlts = [...q.alternatives.slice(altShift), ...q.alternatives.slice(0, altShift)];
                      let newCorrectLetter: 'A' | 'B' | 'C' | 'D' | 'E' = 'A';

                      const finalAlts = shuffledAlts.map((alt, aIdx) => {
                        const l = letters[aIdx];
                        if (alt.text === correctText) {
                          newCorrectLetter = l;
                        }
                        return { id: `${q.id}-v${vLetter}-${aIdx}`, letter: l, text: alt.text };
                      });

                      return {
                        id: `${q.id}-v${vLetter}`,
                        orderIndex: idx + 1,
                        statement: q.statement,
                        alternatives: finalAlts,
                        correctAlternative: newCorrectLetter,
                      };
                    });
                  })()}
                  pageNumber={1}
                  totalPages={2}
                  versionLetter={previewCadernoInStep4}
                  showAnswerKey={showGabaritoInStep4}
                  showQrCode={true}
                  includeBoxNota={true}
                  scale={1}
                />
              </div>
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
                <FileCheck className="w-4 h-4" /> Gerar Prova & Abrir Simulador Completo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
