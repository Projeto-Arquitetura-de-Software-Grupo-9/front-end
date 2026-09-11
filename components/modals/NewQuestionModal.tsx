'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { DifficultyLevel } from '@/lib/types';
import { X, BookOpen } from 'lucide-react';

export const NewQuestionModal: React.FC = () => {
  const {
    isNewQuestionModalOpen,
    setIsNewQuestionModalOpen,
    editingQuestion,
    setEditingQuestion,
    addQuestion,
    updateQuestion,
  } = useApp();

  const [statement, setStatement] = useState('');
  const [discipline, setDiscipline] = useState('Direito Constitucional');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('Médio');
  const [topic, setTopic] = useState('');
  const [tags, setTags] = useState('TAG 1, TAG 2, TAG 3');
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
      setTags(editingQuestion.tags?.join(', ') || 'TAG 1, TAG 2, TAG 3');
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
      setTags('TAG 1, TAG 2, TAG 3');
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

    const parsedTags = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    if (editingQuestion) {
      updateQuestion(editingQuestion.id, {
        statement,
        discipline,
        difficulty,
        topic,
        tags: parsedTags.length > 0 ? parsedTags : ['TAG 1', 'TAG 2', 'TAG 3'],
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
        tags: parsedTags.length > 0 ? parsedTags : ['TAG 1', 'TAG 2', 'TAG 3'],
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
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Etiquetas (separadas por vírgula)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="TAG 1, TAG 2, TAG 3"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E0B1A]/20"
            />
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
