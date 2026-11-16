'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import {
  BookOpen,
  Plus,
  Trash2,
  GraduationCap,
  Users,
  Search,
  ArrowRight,
  ExternalLink,
  X,
  Sparkles,
} from 'lucide-react';

export const DisciplinasScreen: React.FC = () => {
  const {
    disciplines,
    classes,
    addDiscipline,
    deleteDiscipline,
    addClass,
    setActiveClassId,
    addToast,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDisciplineId, setSelectedDisciplineId] = useState<string>(
    disciplines[0]?.id || ''
  );

  // Modal para cadastrar nova disciplina de forma separada e limpa
  const [isNewDisciplineModalOpen, setIsNewDisciplineModalOpen] = useState(false);
  const [newDiscName, setNewDiscName] = useState('');
  const [newDiscCode, setNewDiscCode] = useState('');
  const [newDiscCourse, setNewDiscCourse] = useState('Direito');

  // Modal para cadastrar nova turma nesta disciplina
  const [isNewClassModalOpen, setIsNewClassModalOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassTerm, setNewClassTerm] = useState('2026/1');

  const filteredDisciplines = disciplines.filter(
    (d) =>
      (d.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.course || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedDiscipline =
    disciplines.find((d) => d.id === selectedDisciplineId) ||
    filteredDisciplines[0] ||
    disciplines[0];

  // Turmas associadas à disciplina selecionada
  const disciplineClasses = classes.filter((c) => {
    if (!selectedDiscipline) return false;
    if (c.disciplineId && c.disciplineId === selectedDiscipline.id) return true;
    return (
      (c.subject || '').trim().toLowerCase() ===
      (selectedDiscipline.name || '').trim().toLowerCase()
    );
  });

  const handleCreateDiscipline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDiscName.trim()) return;

    const created = addDiscipline({
      name: newDiscName.trim(),
      code: newDiscCode.trim() || undefined,
      course: newDiscCourse.trim() || 'Direito',
    });

    setSelectedDisciplineId(created.id);
    setNewDiscName('');
    setNewDiscCode('');
    setIsNewDisciplineModalOpen(false);
  };

  const handleCreateClassForDiscipline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDiscipline || !newClassName.trim()) return;

    const created = addClass({
      disciplineId: selectedDiscipline.id,
      name: newClassName.trim(),
      subject: selectedDiscipline.name,
      term: newClassTerm.trim() || '2026/1',
      status: 'active',
    });

    setActiveClassId(created.id);
    setIsNewClassModalOpen(false);
    setNewClassName('');
    addToast({
      type: 'success',
      title: 'Turma Criada!',
      message: `Turma "${created.name}" vinculada a ${selectedDiscipline.name}.`,
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header com Ações Separadas e Limpas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-[#9E0B1A]" />
            <span>Minhas Disciplinas</span>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Gerencie suas disciplinas acadêmicas e acesse as turmas letivas vinculadas a cada uma.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsNewDisciplineModalOpen(true)}
            className="inline-flex items-center gap-2 bg-[#9E0B1A] hover:bg-[#850916] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Disciplina</span>
          </button>
        </div>
      </div>

      {/* Grid de 2 Colunas: Lista de Disciplinas (Esquerda) e Turmas da Disciplina (Direita) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Coluna Esquerda: Disciplinas Cadastradas */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Disciplinas ({disciplines.length})
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                Clique para ver as turmas
              </span>
            </div>

            {/* Barra de Busca de Disciplinas */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar disciplina por nome ou código..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white"
              />
            </div>
          </div>

          {/* Lista de Cards de Disciplinas */}
          <div className="space-y-2.5">
            {filteredDisciplines.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500 space-y-2">
                <BookOpen className="w-6 h-6 text-slate-300 mx-auto" />
                <p className="font-semibold text-slate-700">Nenhuma disciplina encontrada</p>
                <p className="text-[11px] text-slate-400">
                  Clique em &quot;Cadastrar Disciplina&quot; para adicionar ao sistema.
                </p>
              </div>
            ) : (
              filteredDisciplines.map((disc) => {
                const isSelected = selectedDiscipline?.id === disc.id;
                const turmasCount = classes.filter(
                  (c) =>
                    (c.disciplineId && c.disciplineId === disc.id) ||
                    (c.subject || '').trim().toLowerCase() === (disc.name || '').trim().toLowerCase()
                ).length;

                return (
                  <div
                    key={disc.id}
                    onClick={() => setSelectedDisciplineId(disc.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                      isSelected
                        ? 'bg-white border-[#9E0B1A] shadow-md ring-1 ring-[#9E0B1A]/20'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold text-[#9E0B1A] bg-red-50 border border-red-100 px-1.5 py-0.5 rounded">
                            {disc.code || 'DISC'}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500 truncate">
                            {disc.course || 'Graduação'}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-900 text-sm truncate">
                          {disc.name}
                        </h3>
                        <p className="text-xs text-slate-500 flex items-center gap-1.5 pt-0.5">
                          <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {turmasCount === 1
                              ? '1 turma ativa'
                              : `${turmasCount} turmas ativas`}
                          </span>
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Deseja realmente remover a disciplina "${disc.name}"?`)) {
                            deleteDiscipline(disc.id);
                          }
                        }}
                        className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                        title="Remover disciplina"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Coluna Direita: Turmas da Disciplina Selecionada */}
        <div className="lg:col-span-7 space-y-4">
          {selectedDiscipline ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              {/* Header da Disciplina Selecionada */}
              <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#9E0B1A] bg-red-50 px-2 py-0.5 rounded border border-red-200">
                      {selectedDiscipline.code}
                    </span>
                    <span className="text-xs text-slate-500">• {selectedDiscipline.course}</span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {selectedDiscipline.name}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setIsNewClassModalOpen(true)}
                  className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-3.5 py-2 rounded-xl transition cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nova Turma nesta Disciplina</span>
                </button>
              </div>

              {/* Lista de Turmas vinculadas */}
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Turmas Vinculadas ({disciplineClasses.length})
                  </span>
                  <Link
                    href="/turmas"
                    className="text-xs font-semibold text-[#9E0B1A] hover:underline flex items-center gap-1"
                  >
                    <span>Ir para Minhas Turmas & Alunos</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>

                {disciplineClasses.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50/70 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500 space-y-2">
                    <GraduationCap className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="font-semibold text-slate-700">
                      Nenhuma turma cadastrada para esta disciplina ainda
                    </p>
                    <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                      Crie turmas (como &quot;Turma A - Matutino&quot;) para matricular alunos e aplicar provas.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsNewClassModalOpen(true)}
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-[#9E0B1A] hover:underline"
                    >
                      <Plus className="w-3.5 h-3.5" /> Criar Primeira Turma
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {disciplineClasses.map((cls) => (
                      <div
                        key={cls.id}
                        className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs transition flex flex-col justify-between gap-3 group"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase">
                              {cls.term}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {cls.inviteCode}
                            </span>
                          </div>
                          <h4 className="font-bold text-slate-900 text-sm group-hover:text-[#9E0B1A] transition">
                            {cls.name}
                          </h4>
                          <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                            <Users className="w-3 h-3 text-slate-400" />
                            <span>
                              {cls.studentCount || 0} alunos matriculados
                            </span>
                          </p>
                        </div>

                        <Link
                          href="/turmas"
                          onClick={() => setActiveClassId(cls.id)}
                          className="pt-2 border-t border-slate-100 text-xs font-semibold text-[#9E0B1A] flex items-center justify-between hover:underline"
                        >
                          <span>Ver alunos e gerenciar</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
              Selecione uma disciplina para ver suas turmas.
            </div>
          )}
        </div>
      </div>

      {/* Modal Dedicado e Limpo: Cadastrar Disciplina */}
      {isNewDisciplineModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-red-50 text-[#9E0B1A] flex items-center justify-center font-bold">
                  <BookOpen className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Cadastrar Nova Disciplina
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewDisciplineModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDiscipline} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nome da Disciplina *
                </label>
                <input
                  type="text"
                  required
                  value={newDiscName}
                  onChange={(e) => setNewDiscName(e.target.value)}
                  placeholder="Ex: Direito Constitucional I"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#9E0B1A]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Código da Disciplina
                </label>
                <input
                  type="text"
                  value={newDiscCode}
                  onChange={(e) => setNewDiscCode(e.target.value)}
                  placeholder="Ex: DIR-101 (opcional, gerado automático se vazio)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#9E0B1A]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Curso Universitário *
                </label>
                <input
                  type="text"
                  required
                  value={newDiscCourse}
                  onChange={(e) => setNewDiscCourse(e.target.value)}
                  placeholder="Ex: Direito, Engenharia de Software..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#9E0B1A]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewDisciplineModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#9E0B1A] hover:bg-[#850916] text-white font-bold rounded-xl transition cursor-pointer shadow-xs"
                >
                  Salvar Disciplina
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Dedicado: Nova Turma nesta Disciplina */}
      {isNewClassModalOpen && selectedDiscipline && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Nova Turma</h3>
                  <p className="text-[11px] text-slate-500">{selectedDiscipline.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewClassModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateClassForDiscipline} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nome da Turma *
                </label>
                <input
                  type="text"
                  required
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="Ex: Turma A - Matutino"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#9E0B1A]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Período Letivo *
                </label>
                <input
                  type="text"
                  required
                  value={newClassTerm}
                  onChange={(e) => setNewClassTerm(e.target.value)}
                  placeholder="Ex: 2026/1"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#9E0B1A]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewClassModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition cursor-pointer shadow-xs"
                >
                  Criar Turma
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
