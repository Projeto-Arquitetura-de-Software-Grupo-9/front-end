'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { DifficultyLevel } from '@/lib/types';
import { X, BookOpen, Tag, Plus } from 'lucide-react';

export const NewQuestionModal: React.FC = () => {
  const {
    isNewQuestionModalOpen,
    setIsNewQuestionModalOpen,
    editingQuestion,
    setEditingQuestion,
    addQuestion,
    updateQuestion,
    questions,
  } = useApp();

  const [statement, setStatement] = useState('');
  const [discipline, setDiscipline] = useState('Direito Constitucional');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('Médio');
  const [topic, setTopic] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(['TAG 1', 'TAG 2', 'TAG 3']);
  const [tagInput, setTagInput] = useState('');
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const tagDropdownRef = useRef<HTMLDivElement>(null);

  const [explanation, setExplanation] = useState('');
  const [correctAlt, setCorrectAlt] = useState<'A' | 'B' | 'C' | 'D' | 'E'>('C');
  const [alternatives, setAlternatives] = useState<
    { letter: 'A' | 'B' | 'C' | 'D' | 'E'; text: string }[]
  >([
    { letter: 'A', text: '' },
    { letter: 'B', text: '' },
    { letter: 'C', text: '' },
    { letter: 'D', text: '' },
    { letter: 'E', text: '' },
  ]);

  useEffect(() => {
    if (editingQuestion) {
      setStatement(editingQuestion.statement);
      setDiscipline(editingQuestion.discipline);
      setDifficulty(editingQuestion.difficulty);
      setTopic(editingQuestion.topic || '');
      setSelectedTags(
        editingQuestion.tags && editingQuestion.tags.length > 0
          ? [...editingQuestion.tags]
          : ['TAG 1', 'TAG 2', 'TAG 3']
      );
      setTagInput('');
      setIsTagDropdownOpen(false);
      setHighlightedIndex(-1);
      setExplanation(editingQuestion.explanation || '');
      setCorrectAlt(editingQuestion.correctAlternative);
      setAlternatives(
        editingQuestion.alternatives.map((a) => ({
          letter: a.letter,
          text: a.text,
        }))
      );
    } else {
      setStatement('');
      setDiscipline('Direito Constitucional');
      setDifficulty('Médio');
      setTopic('');
      setSelectedTags(['TAG 1', 'TAG 2', 'TAG 3']);
      setTagInput('');
      setIsTagDropdownOpen(false);
      setHighlightedIndex(-1);
      setExplanation('');
      setCorrectAlt('A');
      setAlternatives([
        { letter: 'A', text: '' },
        { letter: 'B', text: '' },
        { letter: 'C', text: '' },
        { letter: 'D', text: '' },
        { letter: 'E', text: '' },
      ]);
    }
  }, [editingQuestion, isNewQuestionModalOpen]);

  // Extract all unique existing tags across questions
  const allExistingTags = useMemo(() => {
    const tagSet = new Set<string>();
    ['TAG 1', 'TAG 2', 'TAG 3'].forEach((t) => tagSet.add(t));
    if (questions) {
      questions.forEach((q) => {
        if (q.tags && Array.isArray(q.tags)) {
          q.tags.forEach((t) => {
            const clean = t?.trim();
            if (clean) tagSet.add(clean);
          });
        }
      });
    }
    return Array.from(tagSet);
  }, [questions]);

  // Filter existing tags not yet selected, matching typed search query
  const filteredExistingTags = useMemo(() => {
    const query = tagInput.trim().toLowerCase();
    return allExistingTags.filter((tag) => {
      const alreadySelected = selectedTags.some(
        (st) => st.toLowerCase() === tag.toLowerCase()
      );
      if (alreadySelected) return false;
      if (!query) return true;
      return tag.toLowerCase().includes(query);
    });
  }, [allExistingTags, selectedTags, tagInput]);

  // Check if what the user typed is a new tag that can be created
  const canCreateNewTag = useMemo(() => {
    const query = tagInput.trim();
    if (!query) return false;
    const alreadySelected = selectedTags.some(
      (st) => st.toLowerCase() === query.toLowerCase()
    );
    const exactExistingMatch = allExistingTags.some(
      (t) => t.toLowerCase() === query.toLowerCase()
    );
    return !alreadySelected && !exactExistingMatch;
  }, [tagInput, selectedTags, allExistingTags]);

  // Combined options for dropdown navigation
  const dropdownOptions = useMemo(() => {
    const options: { type: 'create' | 'existing'; label: string }[] = [];
    if (canCreateNewTag) {
      options.push({ type: 'create', label: tagInput.trim() });
    }
    filteredExistingTags.forEach((tag) => {
      options.push({ type: 'existing', label: tag });
    });
    return options;
  }, [canCreateNewTag, tagInput, filteredExistingTags]);

  const handleAddTag = (tagToAdd: string) => {
    const trimmed = tagToAdd.trim();
    if (!trimmed) return;

    const exists = selectedTags.some(
      (t) => t.toLowerCase() === trimmed.toLowerCase()
    );
    if (!exists) {
      const existingMatch = allExistingTags.find(
        (t) => t.toLowerCase() === trimmed.toLowerCase()
      );
      setSelectedTags((prev) => [...prev, existingMatch || trimmed]);
    }
    setTagInput('');
    setIsTagDropdownOpen(false);
    setHighlightedIndex(-1);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setSelectedTags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && dropdownOptions[highlightedIndex]) {
        handleAddTag(dropdownOptions[highlightedIndex].label);
      } else if (tagInput.trim()) {
        handleAddTag(tagInput.trim());
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isTagDropdownOpen) {
        setIsTagDropdownOpen(true);
      }
      setHighlightedIndex((prev) =>
        prev < dropdownOptions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : dropdownOptions.length - 1
      );
    } else if (e.key === 'Backspace' && !tagInput && selectedTags.length > 0) {
      handleRemoveTag(selectedTags[selectedTags.length - 1]);
    } else if (e.key === 'Escape') {
      setIsTagDropdownOpen(false);
      setHighlightedIndex(-1);
    }
  };

  if (!isNewQuestionModalOpen) return null;

  const handleAltChange = (index: number, val: string) => {
    const updated = [...alternatives];
    updated[index].text = val;
    setAlternatives(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!statement.trim()) return;

    const mappedAlternatives = alternatives.map((a, idx) => ({
      id: `alt-${idx}-${Date.now()}`,
      letter: a.letter,
      text: a.text.trim() || `Opção ${a.letter}`,
    }));

    if (editingQuestion) {
      updateQuestion(editingQuestion.id, {
        statement,
        discipline,
        difficulty,
        topic,
        tags: selectedTags,
        explanation,
        correctAlternative: correctAlt,
        alternatives: mappedAlternatives,
      });
    } else {
      addQuestion({
        statement,
        discipline,
        difficulty,
        topic,
        tags: selectedTags,
        explanation,
        correctAlternative: correctAlt,
        alternatives: mappedAlternatives,
        points: 1.0,
      });
    }

    setIsNewQuestionModalOpen(false);
    setEditingQuestion(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-[#9E0B1A] flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {editingQuestion ? 'Editar Questão' : 'Cadastrar Nova Questão'}
              </h2>
              <p className="text-xs text-slate-500">
                Adicione o enunciado, etiquetas e opções com marcação do gabarito oficial.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setIsNewQuestionModalOpen(false);
              setEditingQuestion(null);
            }}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Statement */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">
              Enunciado da Pergunta *
            </label>
            <textarea
              required
              rows={3}
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              placeholder="Ex: Dada a função f(x) = ..., determine o valor de x para o qual..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E0B1A]/20 focus:border-[#9E0B1A]"
            />
          </div>

          {/* Row: Discipline, Difficulty, Topic */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Disciplina
              </label>
              <input
                type="text"
                value={discipline}
                onChange={(e) => setDiscipline(e.target.value)}
                placeholder="Direito Constitucional"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E0B1A]/20"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Dificuldade
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E0B1A]/20"
              >
                <option value="Fácil">Fácil</option>
                <option value="Médio">Médio</option>
                <option value="Difícil">Difícil</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Tópico / Conteúdo
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Ex: Direitos Fundamentais"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E0B1A]/20"
              />
            </div>
          </div>

          {/* Tags / Etiquetas */}
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <label className="block font-bold text-slate-700">
                Etiquetas
              </label>
              <span className="text-[11px] text-slate-400">
                Pressione Enter para adicionar ou criar
              </span>
            </div>

            {/* Tags Box */}
            <div
              onClick={() => tagInputRef.current?.focus()}
              className="min-h-[42px] p-2 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center gap-1.5 focus-within:ring-2 focus-within:ring-[#9E0B1A]/20 focus-within:border-slate-300 transition cursor-text"
            >
              {selectedTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-white border border-slate-200 text-slate-700 rounded-lg shadow-2xs group"
                >
                  <Tag className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                  <span>{tag}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveTag(tag);
                    }}
                    className="ml-0.5 text-slate-400 hover:text-red-600 rounded-full hover:bg-slate-100 p-0.5 transition cursor-pointer"
                    title={`Remover ${tag}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              <input
                ref={tagInputRef}
                type="text"
                value={tagInput}
                onChange={(e) => {
                  setTagInput(e.target.value);
                  setIsTagDropdownOpen(true);
                  setHighlightedIndex(-1);
                }}
                onFocus={() => setIsTagDropdownOpen(true)}
                onBlur={() => {
                  setTimeout(() => setIsTagDropdownOpen(false), 200);
                }}
                onKeyDown={handleTagInputKeyDown}
                placeholder={
                  selectedTags.length === 0
                    ? 'Digite uma etiqueta e pressione Enter...'
                    : 'Adicionar etiqueta...'
                }
                className="flex-1 min-w-[150px] px-2 py-1 bg-transparent text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
              />
            </div>

            {/* Dropdown for Selection / Creation */}
            {isTagDropdownOpen && dropdownOptions.length > 0 && (
              <div
                ref={tagDropdownRef}
                className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto py-1.5"
              >
                {dropdownOptions.map((opt, idx) => {
                  const isHighlighted = highlightedIndex === idx;
                  if (opt.type === 'create') {
                    return (
                      <button
                        type="button"
                        key={`create-${opt.label}`}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleAddTag(opt.label);
                        }}
                        className={`w-full px-3 py-2 text-left text-xs text-[#9E0B1A] font-semibold flex items-center justify-between transition cursor-pointer border-b border-slate-100 ${
                          isHighlighted ? 'bg-red-50' : 'hover:bg-red-50/70'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Plus className="w-3.5 h-3.5" />
                          <span>
                            Criar nova etiqueta: <strong>{opt.label}</strong>
                          </span>
                        </span>
                        <span className="text-[10px] bg-red-100/60 text-[#9E0B1A] px-2 py-0.5 rounded font-bold">
                          Enter
                        </span>
                      </button>
                    );
                  }

                  return (
                    <button
                      type="button"
                      key={`existing-${opt.label}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleAddTag(opt.label);
                      }}
                      className={`w-full px-3 py-1.5 text-left text-xs text-slate-700 flex items-center justify-between transition cursor-pointer ${
                        isHighlighted ? 'bg-slate-100 text-slate-900 font-medium' : 'hover:bg-slate-50'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5 text-slate-400" />
                        <span>{opt.label}</span>
                      </span>
                      <span className="text-[10px] text-slate-400">Selecionar</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Quick-select pills from available existing tags */}
            {allExistingTags.filter((t) => !selectedTags.includes(t)).length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-2">
                <span className="text-[11px] font-medium text-slate-400">
                  Sugestões existentes:
                </span>
                {allExistingTags
                  .filter((t) => !selectedTags.includes(t))
                  .slice(0, 6)
                  .map((tag) => (
                    <button
                      type="button"
                      key={tag}
                      onClick={() => handleAddTag(tag)}
                      className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-md transition cursor-pointer"
                    >
                      <Plus className="w-2.5 h-2.5" />
                      {tag}
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* Alternatives list */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700">
                Alternativas (Selecione a Correta)
              </label>
              <span className="text-[11px] text-emerald-700 font-semibold">
                Gabarito Atual: Alternativa {correctAlt}
              </span>
            </div>

            {alternatives.map((alt, idx) => {
              const isSelected = correctAlt === alt.letter;
              return (
                <div
                  key={alt.letter}
                  className={`flex items-center gap-2.5 p-2 rounded-xl border transition ${
                    isSelected
                      ? 'border-emerald-300 bg-emerald-50/40'
                      : 'border-slate-200 bg-slate-50/50'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setCorrectAlt(alt.letter)}
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {alt.letter}
                  </button>

                  <input
                    type="text"
                    required
                    value={alt.text}
                    onChange={(e) => handleAltChange(idx, e.target.value)}
                    placeholder={`Texto da alternativa ${alt.letter}...`}
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#9E0B1A]"
                  />

                  {isSelected && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                      GABARITO
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Explanation */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Justificativa / Comentário da Resolução (Opcional)
            </label>
            <textarea
              rows={2}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Explique o raciocínio para os alunos..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E0B1A]/20"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsNewQuestionModalOpen(false);
                setEditingQuestion(null);
              }}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 bg-[#9E0B1A] hover:bg-[#850916] text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer"
            >
              {editingQuestion ? 'Salvar Alterações' : 'Cadastrar no Banco'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
