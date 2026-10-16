'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { DifficultyLevel, QuestionType } from '@/lib/types';
import { X, BookOpen, Tag, Plus, Trash2, CheckCircle2, FileText, ListOrdered } from 'lucide-react';

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

  const [questionType, setQuestionType] = useState<QuestionType>('objetiva');
  const [statement, setStatement] = useState('');
  const [discipline, setDiscipline] = useState('Direito Constitucional');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('Médio');
  const [topic, setTopic] = useState('');
  const [points, setPoints] = useState<number>(1.0);
  const [maxScore, setMaxScore] = useState<number>(2.5);
  const [selectedTags, setSelectedTags] = useState<string[]>(['Direito Constitucional', 'Objetiva']);
  const [tagInput, setTagInput] = useState('');
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const tagDropdownRef = useRef<HTMLDivElement>(null);

  const [explanation, setExplanation] = useState('');
  const [correctAlt, setCorrectAlt] = useState<'A' | 'B' | 'C' | 'D' | 'E'>('A');
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
      setQuestionType(editingQuestion.type || 'objetiva');
      setStatement(editingQuestion.statement);
      setDiscipline(editingQuestion.discipline);
      setDifficulty(editingQuestion.difficulty);
      setTopic(editingQuestion.topic || '');
      setPoints(editingQuestion.points || 1.0);
      setMaxScore(editingQuestion.maxScore || 2.5);
      setSelectedTags(
        editingQuestion.tags && editingQuestion.tags.length > 0
          ? [...editingQuestion.tags]
          : ['Direito', 'Revisão']
      );
      setTagInput('');
      setIsTagDropdownOpen(false);
      setHighlightedIndex(-1);
      setExplanation(editingQuestion.explanation || '');
      setCorrectAlt(editingQuestion.correctAlternative || 'A');
      if (editingQuestion.alternatives && editingQuestion.alternatives.length > 0) {
        setAlternatives(
          editingQuestion.alternatives.map((a) => ({
            letter: a.letter,
            text: a.text,
          }))
        );
      }
    } else {
      setQuestionType('objetiva');
      setStatement('');
      setDiscipline('Direito Constitucional');
      setDifficulty('Médio');
      setTopic('');
      setPoints(1.0);
      setMaxScore(2.5);
      setSelectedTags(['Direito Constitucional', 'Objetiva']);
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
    ['Direito Constitucional', 'Direito Penal', 'Direito Civil', 'Objetiva', 'Discursiva'].forEach((t) => tagSet.add(t));
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

  const dropdownOptions = useMemo(() => {
    const query = tagInput.trim().toLowerCase();
    const matches = allExistingTags.filter(
      (t) => !selectedTags.includes(t) && (!query || t.toLowerCase().includes(query))
    );
    return matches.map((t) => ({ type: 'existing' as const, label: t }));
  }, [allExistingTags, selectedTags, tagInput]);

  const handleAddTag = (tagToAdd: string) => {
    const trimmed = tagToAdd.trim();
    if (!trimmed) return;
    if (!selectedTags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      setSelectedTags((prev) => [...prev, trimmed]);
    }
    setTagInput('');
    setIsTagDropdownOpen(false);
    setHighlightedIndex(-1);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setSelectedTags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  const handleAddAlternative = () => {
    if (alternatives.length >= 5) return;
    const letters: ('A' | 'B' | 'C' | 'D' | 'E')[] = ['A', 'B', 'C', 'D', 'E'];
    const nextLetter = letters[alternatives.length];
    setAlternatives([...alternatives, { letter: nextLetter, text: '' }]);
  };

  const handleRemoveAlternative = (idx: number) => {
    if (alternatives.length <= 2) return; // Spec: 2 a 5 alternativas
    const remaining = alternatives.filter((_, i) => i !== idx);
    const letters: ('A' | 'B' | 'C' | 'D' | 'E')[] = ['A', 'B', 'C', 'D', 'E'];
    const reindexed = remaining.map((alt, i) => ({
      letter: letters[i],
      text: alt.text,
    }));
    setAlternatives(reindexed);
    if (!reindexed.some((a) => a.letter === correctAlt)) {
      setCorrectAlt('A');
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

    const mappedAlternatives =
      questionType === 'objetiva'
        ? alternatives.map((a, idx) => ({
            id: `alt-${idx}-${Date.now()}`,
            letter: a.letter,
            text: a.text.trim() || `Opção ${a.letter}`,
          }))
        : [];

    if (editingQuestion) {
      updateQuestion(editingQuestion.id, {
        type: questionType,
        statement,
        discipline,
        difficulty,
        topic,
        tags: selectedTags,
        explanation,
        correctAlternative: correctAlt,
        alternatives: mappedAlternatives,
        points: Number(points) || 1.0,
        maxScore: questionType === 'discursiva' ? Number(maxScore) || 2.5 : undefined,
      });
    } else {
      addQuestion({
        type: questionType,
        statement,
        discipline,
        difficulty,
        topic,
        tags: selectedTags,
        explanation,
        correctAlternative: correctAlt,
        alternatives: mappedAlternatives,
        points: Number(points) || 1.0,
        maxScore: questionType === 'discursiva' ? Number(maxScore) || 2.5 : undefined,
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
            <div className="w-10 h-10 rounded-xl bg-red-50 text-[#9E0B1A] flex items-center justify-center font-bold">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {editingQuestion ? 'Editar Questão' : 'Cadastrar Nova Questão'}
              </h2>
              <p className="text-xs text-slate-500">
                Conforme a Feature 2 da especificação: suporte a questões objetivas (2-5 alternativas) e discursivas.
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
          {/* Question Type Selector (Feature 2) */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">
              Tipo de Questão *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setQuestionType('objetiva')}
                className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition cursor-pointer ${
                  questionType === 'objetiva'
                    ? 'border-[#9E0B1A] bg-red-50/40 text-[#9E0B1A] font-bold shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <ListOrdered className="w-4 h-4 flex-shrink-0" />
                <div>
                  <div className="text-xs font-semibold">Objetiva</div>
                  <div className="text-[11px] text-slate-500">2 a 5 alternativas com uma correta</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setQuestionType('discursiva')}
                className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition cursor-pointer ${
                  questionType === 'discursiva'
                    ? 'border-[#9E0B1A] bg-red-50/40 text-[#9E0B1A] font-bold shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <FileText className="w-4 h-4 flex-shrink-0" />
                <div>
                  <div className="text-xs font-semibold">Discursiva</div>
                  <div className="text-[11px] text-slate-500">Enunciado aberto + pontuação máxima</div>
                </div>
              </button>
            </div>
          </div>

          {/* Statement */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block font-bold text-slate-700">
                Enunciado da Pergunta *
              </label>
              <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                Suporta Markdown básico (*itálico*, **negrito**)
              </span>
            </div>
            <textarea
              required
              rows={3}
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              placeholder="Ex: Discorra sobre o princípio da dignidade da pessoa humana..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E0B1A]/20 focus:border-[#9E0B1A]"
            />
          </div>

          {/* Row: Discipline, Difficulty, Points/MaxScore */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
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
                Tópico
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Ex: Direitos Fundamentais"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E0B1A]/20"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {questionType === 'discursiva' ? 'Pontuação Máx.' : 'Pontos'}
              </label>
              <input
                type="number"
                step="0.25"
                min="0.25"
                max="10"
                value={questionType === 'discursiva' ? maxScore : points}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 1.0;
                  if (questionType === 'discursiva') setMaxScore(val);
                  else setPoints(val);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E0B1A]/20"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Etiquetas (Tags)
            </label>
            <div
              onClick={() => tagInputRef.current?.focus()}
              className="min-h-[38px] p-1.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center gap-1.5 cursor-text"
            >
              {selectedTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 bg-white border border-slate-200 text-slate-700 rounded-lg shadow-2xs"
                >
                  <Tag className="w-2.5 h-2.5 text-slate-400" />
                  <span>{tag}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveTag(tag);
                    }}
                    className="text-slate-400 hover:text-red-600 ml-0.5"
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                ref={tagInputRef}
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (tagInput.trim()) handleAddTag(tagInput.trim());
                  }
                }}
                placeholder="+ Adicionar tag (Enter)"
                className="text-xs bg-transparent border-none outline-none px-2 py-1 flex-1 min-w-[120px]"
              />
            </div>
          </div>

          {/* If Objective Question: Show Alternatives (2 to 5) */}
          {questionType === 'objetiva' ? (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-700">
                  Alternativas ({alternatives.length} de 5 selecionadas)
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                    Gabarito: {correctAlt}
                  </span>
                  {alternatives.length < 5 && (
                    <button
                      type="button"
                      onClick={handleAddAlternative}
                      className="text-[11px] text-[#9E0B1A] hover:text-[#850916] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Adicionar Alternativa
                    </button>
                  )}
                </div>
              </div>

              {alternatives.map((alt, idx) => {
                const isSelected = correctAlt === alt.letter;
                return (
                  <div
                    key={alt.letter}
                    className={`flex items-center gap-2 p-2 rounded-xl border transition ${
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
                      title="Definir como gabarito oficial"
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

                    {alternatives.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveAlternative(idx)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                        title="Remover alternativa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Discursive resolution criteria */
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
              <div className="font-bold text-amber-900 text-xs flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                Critérios de Correção da Questão Discursiva
              </div>
              <p className="text-[11px] text-amber-800">
                Esta questão será avaliada manualmente pelo professor no app mobile ou na tela de resultados, atribuindo pontuação de 0 até {maxScore} pts.
              </p>
            </div>
          )}

          {/* Explanation / Answer criteria */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              {questionType === 'discursiva' ? 'Espelho de Correção / Resposta Esperada' : 'Justificativa do Gabarito (Opcional)'}
            </label>
            <textarea
              rows={2}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Explique os elementos essenciais da resposta esperada..."
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
