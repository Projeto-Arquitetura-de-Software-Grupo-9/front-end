'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Question, Exam } from '@/lib/types';
import {
  GripVertical,
  Trash2,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Search,
  Printer,
  ChevronDown,
} from 'lucide-react';

export const CreateExamScreen: React.FC = () => {
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');

  const {
    questions,
    examDraft,
    setExamDraft,
    examWizardStep,
    setExamWizardStep,
    createExamFromDraft,
    updateExam,
    loadExamToDraft,
    resetExamDraft,
    navigateToPreview,
    addToast,
    disciplines,
    addDiscipline,
    classes,
  } = useApp();

  const [isCreatingDiscipline, setIsCreatingDiscipline] = useState(false);
  const [newDisciplineName, setNewDisciplineName] = useState('');
  const [showMoreHeaderOptions, setShowMoreHeaderOptions] = useState(false);

  // Ensure wizard only uses steps 1 and 2
  useEffect(() => {
    if (editId) {
      loadExamToDraft(editId);
    } else {
      if (examDraft.id) {
        resetExamDraft();
      } else {
        setExamWizardStep(1);
      }
    }
  }, [editId]);

  const activeStep = examWizardStep > 2 ? 2 : examWizardStep;

  const [searchBankQuery, setSearchBankQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('Todas');

  // Extract unique tags across questions
  const availableTags = useMemo(() => {
    const set = new Set<string>();
    questions.forEach((q) => {
      if (q.tags && Array.isArray(q.tags)) {
        q.tags.forEach((tag) => {
          if (tag && tag.trim()) set.add(tag.trim());
        });
      }
    });
    return ['Todas', ...Array.from(set)];
  }, [questions]);

  // Selected questions objects
  const selectedQuestions = examDraft.selectedQuestionIds
    .map((id) => questions.find((q) => q.id === id))
    .filter((q): q is Question => q !== undefined);

  // Available questions (not yet selected)
  const availableQuestions = useMemo(() => {
    return questions.filter((q) => {
      const isSelected = examDraft.selectedQuestionIds.includes(q.id);
      const matchesTag =
        selectedTag === 'Todas' ||
        (q.tags && Array.isArray(q.tags) && q.tags.includes(selectedTag));
      const query = searchBankQuery.trim().toLowerCase();
      const matchesSearch =
        query === '' ||
        q.statement.toLowerCase().includes(query) ||
        q.code.toLowerCase().includes(query) ||
        (q.topic && q.topic.toLowerCase().includes(query)) ||
        (q.tags && Array.isArray(q.tags) && q.tags.some((t) => t.toLowerCase().includes(query)));
      return !isSelected && matchesTag && matchesSearch;
    });
  }, [questions, examDraft.selectedQuestionIds, selectedTag, searchBankQuery]);

  const handleAddQuestion = (qId: string) => {
    if (examDraft.selectedQuestionIds.length >= 20) {
      addToast({
        type: 'warning',
        title: 'Limite Máximo de Questões',
        message: 'A prova pode conter no máximo 20 questões.',
      });
      return;
    }
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

  const handleAutoSelect = () => {
    const ids = questions.slice(0, 8).map((q) => q.id);
    setExamDraft((prev) => ({
      ...prev,
      selectedQuestionIds: ids,
    }));
    addToast({
      type: 'info',
      title: 'Seleção Automática',
      message: '8 questões selecionadas para a prova.',
    });
  };

  const handleAdvanceFromStep1 = () => {
    if (!examDraft.title.trim()) {
      addToast({
        type: 'error',
        title: 'Título Obrigatório',
        message: 'Por favor, informe o título da avaliação.',
      });
      return;
    }
    if (!examDraft.discipline.trim()) {
      addToast({
        type: 'error',
        title: 'Disciplina Obrigatória',
        message: 'Por favor, informe a disciplina da avaliação.',
      });
      return;
    }
    setExamWizardStep(2);
  };

  const handleStepClick = (targetStep: number) => {
    if (targetStep === 2 && !examDraft.title.trim()) {
      addToast({
        type: 'warning',
        title: 'Título Obrigatório',
        message: 'Informe o título da prova antes de selecionar as questões.',
      });
      return;
    }
    setExamWizardStep(targetStep);
  };

  const handleFinishAndGenerate = () => {
    if (!examDraft.title.trim()) {
      addToast({
        type: 'error',
        title: 'Título Obrigatório',
        message: 'A avaliação precisa de um título.',
      });
      setExamWizardStep(1);
      return;
    }

    if (examDraft.selectedQuestionIds.length === 0) {
      addToast({
        type: 'error',
        title: 'Selecione Questões',
        message: 'Adicione pelo menos uma questão à prova.',
      });
      setExamWizardStep(2);
      return;
    }

    let savedExam: Exam;
    if (editId) {
      savedExam = updateExam(editId, examDraft);
    } else {
      savedExam = createExamFromDraft(examDraft);
    }

    resetExamDraft();
    navigateToPreview(savedExam.id);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Clean Header with Inline 2-Step Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/provas"
              className="text-xs font-medium text-slate-500 hover:text-slate-900 flex items-center gap-1 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Provas
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-medium text-slate-500">
              {editId ? 'Editar' : 'Nova Prova'}
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-1">
            {examDraft.title || (editId ? 'Editar Avaliação' : 'Criar Nova Prova')}
          </h1>
        </div>

        {/* Minimalist 2-Step Segmented Pill */}
        <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 self-start sm:self-center">
          {[
            { step: 1, label: '1. Informações Básicas' },
            { step: 2, label: `2. Questões (${selectedQuestions.length})` },
          ].map((item) => {
            const isCurrent = activeStep === item.step;
            const isDone = activeStep > item.step;
            return (
              <button
                key={item.step}
                type="button"
                onClick={() => handleStepClick(item.step)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  isCurrent
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : isDone
                    ? 'text-emerald-700 hover:text-emerald-800'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* STEP 1: Informações Básicas (Turma, Nome, Disciplina, Data) */}
      {activeStep === 1 && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/90 shadow-2xs space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Informações Básicas da Prova
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Preencha os dados da turma e identificação da avaliação. As opções de impressão (nominal, cadernos aleatórios e folha de resposta) serão escolhidas na hora de imprimir.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nome / Título da Prova
              </label>
              <input
                type="text"
                value={examDraft.title}
                onChange={(e) =>
                  setExamDraft((p) => ({ ...p, title: e.target.value }))
                }
                placeholder="Ex: P1 - Direito Constitucional I"
                className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/15 focus:border-[#9E0B1A] transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Turma
              </label>
              <select
                value={examDraft.classGroup}
                onChange={(e) => {
                  const selectedName = e.target.value;
                  const foundClass = classes.find((c) => c.name === selectedName);
                  setExamDraft((p) => ({
                    ...p,
                    classGroup: selectedName,
                    discipline: foundClass ? foundClass.subject : p.discipline,
                    semester: foundClass ? foundClass.term : p.semester,
                  }));
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#9E0B1A] transition"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name} — {c.subject}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Disciplina
                </label>
                <button
                  type="button"
                  onClick={() => setIsCreatingDiscipline(!isCreatingDiscipline)}
                  className="text-[11px] font-semibold text-[#9E0B1A] hover:underline cursor-pointer"
                >
                  {isCreatingDiscipline ? 'Selecionar existente' : '+ Nova'}
                </button>
              </div>
              {isCreatingDiscipline ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newDisciplineName}
                    onChange={(e) => setNewDisciplineName(e.target.value)}
                    placeholder="Nome da disciplina..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-[#9E0B1A]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newDisciplineName.trim()) {
                        const created = addDiscipline({
                          name: newDisciplineName.trim(),
                          course: examDraft.course,
                        });
                        setExamDraft((p) => ({ ...p, discipline: created.name }));
                        setNewDisciplineName('');
                        setIsCreatingDiscipline(false);
                      }
                    }}
                    className="px-4 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-semibold transition cursor-pointer"
                  >
                    Adicionar
                  </button>
                </div>
              ) : (
                <select
                  value={examDraft.discipline}
                  onChange={(e) =>
                    setExamDraft((p) => ({ ...p, discipline: e.target.value }))
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#9E0B1A] transition"
                >
                  {disciplines.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Data da Avaliação
              </label>
              <input
                type="text"
                value={examDraft.date}
                onChange={(e) =>
                  setExamDraft((p) => ({ ...p, date: e.target.value }))
                }
                placeholder="Ex: 15 Mar, 2026"
                className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#9E0B1A] transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Valor Total da Prova (Pontos)
              </label>
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
                className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#9E0B1A] transition"
              />
            </div>
          </div>

          {/* Optional Header Details (Collapsed by default) */}
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowMoreHeaderOptions(!showMoreHeaderOptions)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition cursor-pointer"
            >
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${
                  showMoreHeaderOptions ? 'rotate-180' : ''
                }`}
              />
              <span>
                {showMoreHeaderOptions
                  ? 'Ocultar detalhes adicionais do cabeçalho'
                  : 'Personalizar instituição, curso, duração e instruções (opcional)'}
              </span>
            </button>

            {showMoreHeaderOptions && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 p-4 rounded-xl bg-slate-50/60 border border-slate-200/70">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Instituição
                  </label>
                  <input
                    type="text"
                    value={examDraft.institution}
                    onChange={(e) =>
                      setExamDraft((p) => ({ ...p, institution: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#9E0B1A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Curso
                  </label>
                  <input
                    type="text"
                    value={examDraft.course}
                    onChange={(e) =>
                      setExamDraft((p) => ({ ...p, course: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#9E0B1A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Duração
                  </label>
                  <input
                    type="text"
                    value={examDraft.duration}
                    onChange={(e) =>
                      setExamDraft((p) => ({ ...p, duration: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#9E0B1A]"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Instruções no Cabeçalho da Prova
                  </label>
                  <textarea
                    rows={2}
                    value={examDraft.instructions}
                    onChange={(e) =>
                      setExamDraft((p) => ({ ...p, instructions: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#9E0B1A]"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleAdvanceFromStep1}
              className="inline-flex items-center gap-2 bg-[#9E0B1A] hover:bg-[#850916] text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-2xs transition cursor-pointer"
            >
              Escolher Questões <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Seleção de Questões */}
      {activeStep === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (7 cols): Banco de Questões */}
          <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">
                  Banco de Questões
                </h2>
                <button
                  type="button"
                  onClick={handleAutoSelect}
                  className="text-xs font-semibold text-[#9E0B1A] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Sugerir 8 questões
                </button>
              </div>

              {/* Clean Unified Search & Tag Filter Bar */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Buscar por enunciado, tema ou código..."
                    value={searchBankQuery}
                    onChange={(e) => setSearchBankQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-slate-300"
                  />
                </div>

                <div className="relative">
                  <select
                    value={selectedTag}
                    onChange={(e) => setSelectedTag(e.target.value)}
                    className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 pr-7 appearance-none cursor-pointer focus:outline-none"
                  >
                    {availableTags.map((tag) => (
                      <option key={tag} value={tag}>
                        {tag === 'Todas' ? 'Todas as tags' : tag}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Available Question Cards */}
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {availableQuestions.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-10">
                    Nenhuma questão disponível com este filtro.
                  </p>
                ) : (
                  availableQuestions.map((q) => (
                    <div
                      key={q.id}
                      className="p-3.5 rounded-xl border border-slate-200/80 hover:border-slate-300 bg-white transition flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-semibold text-slate-400">
                            {q.code}
                          </span>
                          <span className="text-[10px] font-medium text-slate-500">
                            • {q.discipline}
                          </span>
                          {q.difficulty && (
                            <span className="text-[10px] font-medium text-slate-400">
                              • {q.difficulty}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-800 leading-relaxed line-clamp-2">
                          {q.statement}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddQuestion(q.id)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-[#9E0B1A] text-slate-700 hover:text-white rounded-lg text-xs font-semibold transition cursor-pointer shrink-0"
                      >
                        + Incluir
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column (5 cols): Questões na Prova */}
          <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">
                  Questões na Prova
                </h2>
                <span className="text-xs font-semibold text-slate-500">
                  {selectedQuestions.length} selecionada{selectedQuestions.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {selectedQuestions.length === 0 ? (
                  <div className="p-10 text-center border border-dashed border-slate-200 rounded-xl">
                    <p className="text-xs text-slate-400">
                      Clique em &ldquo;+ Incluir&rdquo; nas questões ao lado para montar a prova.
                    </p>
                  </div>
                ) : (
                  selectedQuestions.map((q, index) => (
                    <div
                      key={q.id}
                      className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/60 group"
                    >
                      <GripVertical className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-800 truncate">
                          <span className="font-bold text-slate-900 mr-1.5">
                            {index + 1}.
                          </span>
                          {q.statement}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(q.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition cursor-pointer"
                        title="Remover questão"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Clean Footer Actions */}
            <div className="flex items-center justify-between gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setExamWizardStep(1)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Voltar
              </button>

              <button
                type="button"
                onClick={handleFinishAndGenerate}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#9E0B1A] hover:bg-[#850916] text-white rounded-xl text-xs font-semibold shadow-2xs transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{editId ? 'Salvar e Ir para Impressão' : 'Criar Prova e Ir para Impressão'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
