'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Question } from '@/lib/types';
import {
  Plus,
  Edit3,
  Trash2,
  ChevronDown,
  BookOpen,
} from 'lucide-react';

export const QuestionBankScreen: React.FC = () => {
  const {
    questions,
    deleteQuestion,
    setIsNewQuestionModalOpen,
    setEditingQuestion,
    searchQuery,
  } = useApp();

  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('Todas');
  const [selectedTag, setSelectedTag] = useState<string>('Todas');
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);

  // Extract all unique tags across questions
  const availableTags = useMemo(() => {
    const set = new Set<string>();
    questions.forEach((q) => {
      if (q.tags && q.tags.length > 0) {
        q.tags.forEach((tag) => set.add(tag));
      }
    });
    // Ensure default tags are available
    if (set.size === 0) {
      set.add('TAG 1');
      set.add('TAG 2');
      set.add('TAG 3');
    }
    return ['Todas', ...Array.from(set)];
  }, [questions]);

  // Filter questions based on difficulty, tag, and global search query
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      const matchDiff =
        selectedDifficulty === 'Todas' || q.difficulty === selectedDifficulty;
      
      const matchTag =
        selectedTag === 'Todas' ||
        (q.tags && q.tags.includes(selectedTag));

      const query = searchQuery?.trim().toLowerCase() || '';
      const matchSearch =
        query === '' ||
        q.statement.toLowerCase().includes(query) ||
        q.code.toLowerCase().includes(query) ||
        (q.topic && q.topic.toLowerCase().includes(query)) ||
        (q.tags && q.tags.some((t) => t.toLowerCase().includes(query)));

      return matchDiff && matchTag && matchSearch;
    });
  }, [questions, selectedDifficulty, selectedTag, searchQuery]);

  const handleEdit = (q: Question) => {
    setEditingQuestion(q);
    setIsNewQuestionModalOpen(true);
  };

  const handleNewQuestion = () => {
    setEditingQuestion(null);
    setIsNewQuestionModalOpen(true);
  };

  const toggleExpand = (id: string) => {
    setExpandedQuestionId((prev) => (prev === id ? null : id));
  };

  const getGabaritoDisplay = (q: Question) => {
    const map: Record<string, string> = {
      A: 'ID-1',
      B: 'ID-2',
      C: 'ID-3',
      D: 'ID-4',
      E: 'ID-5',
    };
    return map[q.correctAlternative] || `ID-${q.correctAlternative}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header with Title and Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Banco de Questões
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Gerencie e classifique seu acervo de perguntas para criação ágil de testes.
          </p>
        </div>

        <button
          onClick={handleNewQuestion}
          className="inline-flex items-center gap-2 bg-[#9E0B1A] hover:bg-[#850916] text-white font-semibold text-sm px-4 py-2.5 rounded-lg shadow-xs hover:shadow transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          Nova Questão
        </button>
      </div>

      {/* Filter and Count Bar */}
      <div className="bg-white px-4 py-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Difficulty Filter */}
          <div className="relative">
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 pr-8 appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-300"
            >
              <option value="Todas">Dificuldade: Todas</option>
              <option value="Fácil">Dificuldade: Fácil</option>
              <option value="Médio">Dificuldade: Médio</option>
              <option value="Difícil">Dificuldade: Difícil</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Tags (Etiquetas) Filter */}
          <div className="relative">
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 pr-8 appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-300"
            >
              {availableTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag === 'Todas' ? 'Etiquetas: Todas' : `Etiquetas: ${tag}`}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <div className="text-xs text-slate-500 font-normal whitespace-nowrap">
          Mostrando {filteredQuestions.length} questões
        </div>
      </div>

      {/* Questions Cards List */}
      <div className="space-y-4">
        {filteredQuestions.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700">Nenhuma questão encontrada</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Ajuste os filtros de dificuldade e etiquetas ou crie uma nova questão para alimentar o banco.
            </p>
            <button
              onClick={handleNewQuestion}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-[#9E0B1A] text-white rounded-lg text-xs font-semibold hover:bg-[#850916] transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar Questão
            </button>
          </div>
        ) : (
          filteredQuestions.map((q) => {
            const isExpanded = expandedQuestionId === q.id;
            const tagsToDisplay = q.tags && q.tags.length > 0 ? q.tags : ['TAG 1', 'TAG 2', 'TAG 3'];

            return (
              <div
                key={q.id}
                className="bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition p-6 space-y-3.5"
              >
                {/* Badges and Actions Row */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Difficulty Badge */}
                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-md ${
                        q.difficulty === 'Fácil'
                          ? 'bg-[#D1FAE5] text-[#065F46]'
                          : q.difficulty === 'Médio'
                          ? 'bg-[#FEF3C7] text-[#92400E]'
                          : 'bg-[#FEE2E2] text-[#991B1B]'
                      }`}
                    >
                      {q.difficulty}
                    </span>

                    {/* Alternatives Count Badge */}
                    <span className="text-xs font-medium px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700">
                      {q.alternatives.length} Alternativas
                    </span>

                    {/* Separator Divider */}
                    <span className="text-slate-300 font-light select-none mx-0.5">|</span>

                    {/* Tag Badges */}
                    {tagsToDisplay.map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#FDE8E8] text-[#9B1C1C] uppercase tracking-wide"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Actions (Edit / Delete) */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <button
                      onClick={() => handleEdit(q)}
                      className="text-slate-700 hover:text-slate-950 transition cursor-pointer p-0.5"
                      title="Editar Questão"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteQuestion(q.id)}
                      className="text-red-500 hover:text-red-700 transition cursor-pointer p-0.5"
                      title="Excluir Questão"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Statement / Enunciado */}
                <div
                  onClick={() => toggleExpand(q.id)}
                  className="cursor-pointer"
                >
                  <p className="text-sm text-slate-900 font-normal leading-relaxed">
                    {q.statement}
                  </p>
                </div>

                {/* Expanded Alternatives Details */}
                {isExpanded && (
                  <div className="pt-2 pb-1 pl-4 space-y-2 border-l-2 border-[#9E0B1A] bg-slate-50/70 p-3.5 rounded-r-xl">
                    <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Alternativas cadastradas:
                    </p>
                    <div className="space-y-1.5">
                      {q.alternatives.map((alt) => {
                        const isCorrect = alt.letter === q.correctAlternative;
                        return (
                          <div
                            key={alt.id}
                            className={`text-xs p-2 rounded-lg flex items-center gap-2 ${
                              isCorrect
                                ? 'bg-emerald-100/70 text-emerald-900 font-semibold border border-emerald-200'
                                : 'text-slate-700 bg-white border border-slate-100'
                            }`}
                          >
                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                isCorrect
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {alt.letter}
                            </span>
                            <span>{alt.text}</span>
                            {isCorrect && (
                              <span className="ml-auto text-[10px] text-emerald-700 bg-emerald-200/60 px-1.5 py-0.5 rounded font-bold">
                                CORRETA
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {q.explanation && (
                      <p className="text-xs text-slate-500 italic mt-2">
                        <span className="font-semibold text-slate-700">Comentário: </span>
                        {q.explanation}
                      </p>
                    )}
                  </div>
                )}

                {/* Bottom Footer: Answer Key & ID */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <button
                    onClick={() => toggleExpand(q.id)}
                    className="font-bold text-[#0E9F6E] hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                    title="Clique para alternar visualização das alternativas"
                  >
                    <span>Gabarito correto:</span>
                    <span>{getGabaritoDisplay(q)}</span>
                  </button>

                  <span className="text-slate-400 font-normal">
                    ID: {q.code}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
