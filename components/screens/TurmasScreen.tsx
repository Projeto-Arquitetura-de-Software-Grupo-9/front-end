'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  GraduationCap,
  Plus,
  Copy,
  RefreshCw,
  Users,
  Archive,
  BookOpen,
  Calendar,
  Check,
  Search,
  UserPlus,
  Mail,
  Trash2,
  ExternalLink,
} from 'lucide-react';

export const TurmasScreen: React.FC = () => {
  const {
    disciplines,
    addDiscipline,
    deleteDiscipline,
    classes,
    activeClassId,
    setActiveClassId,
    addClass,
    archiveClass,
    regenerateInviteCode,
    students,
    deleteStudent,
    addToast,
    setCurrentScreen,
  } = useApp();

  const [isNewClassModalOpen, setIsNewClassModalOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassSubject, setNewClassSubject] = useState(disciplines[0]?.name || 'Direito Constitucional');
  const [newClassTerm, setNewClassTerm] = useState('2026/1');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  // Nova Disciplina modal state
  const [isNewDisciplineModalOpen, setIsNewDisciplineModalOpen] = useState(false);
  const [newDiscName, setNewDiscName] = useState('');
  const [newDiscCode, setNewDiscCode] = useState('');
  const [newDiscCourse, setNewDiscCourse] = useState('Direito');

  // Quick enroll student in class
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [enrollEmail, setEnrollEmail] = useState('');

  const activeClass = classes.find((c) => c.id === activeClassId) || classes[0];

  const handleCopyInviteCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    addToast({
      type: 'info',
      title: 'Código Copiado!',
      message: `Código de convite ${code} copiado para a área de transferência.`,
    });
    setTimeout(() => setCopiedCodeId(null), 3000);
  };

  const handleCreateDiscipline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDiscName.trim()) return;
    const created = addDiscipline({
      name: newDiscName.trim(),
      code: newDiscCode.trim() || undefined,
      course: newDiscCourse.trim() || 'Direito',
    });
    setNewClassSubject(created.name);
    setNewDiscName('');
    setNewDiscCode('');
    setIsNewDisciplineModalOpen(false);
  };

  const handleCreateClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    const matchedDisc = disciplines.find((d) => d.name === newClassSubject);
    const created = addClass({
      disciplineId: matchedDisc?.id,
      name: newClassName.trim(),
      subject: newClassSubject.trim(),
      term: newClassTerm.trim(),
      status: 'active',
    });
    setActiveClassId(created.id);
    setIsNewClassModalOpen(false);
    setNewClassName('');
  };

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.registration.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">
            Minhas Turmas & Disciplinas
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cadastre disciplinas, crie turmas e gerencie o corpo discente.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => setIsNewDisciplineModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-bold shadow-2xs transition cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-[#9E0B1A]" />
            <span>Nova Disciplina</span>
          </button>

          <button
            onClick={() => setIsNewClassModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#9E0B1A] hover:bg-[#850916] text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Turma</span>
          </button>
        </div>
      </div>

      {/* Disciplinas Cadastradas */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#9E0B1A]" />
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Disciplinas Cadastradas ({disciplines.length})
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setIsNewDisciplineModalOpen(true)}
            className="text-xs font-bold text-[#9E0B1A] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Cadastrar Disciplina
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {disciplines.map((disc) => (
            <div
              key={disc.id}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 group"
            >
              <span className="font-mono text-[10px] font-bold text-[#9E0B1A] bg-red-50 px-1.5 py-0.5 rounded">
                {disc.code}
              </span>
              <span className="font-semibold">{disc.name}</span>
              <span className="text-[10px] text-slate-400">({disc.course})</span>
              <button
                type="button"
                onClick={() => deleteDiscipline(disc.id)}
                className="text-slate-300 hover:text-red-600 transition cursor-pointer ml-0.5"
                title="Remover disciplina"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Grid of Classes Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {classes.map((cls) => {
          const isSelected = cls.id === activeClass?.id;
          const isArchived = cls.status === 'archived';

          return (
            <div
              key={cls.id}
              onClick={() => setActiveClassId(cls.id)}
              className={`p-5 rounded-2xl border transition text-left cursor-pointer relative overflow-hidden ${
                isSelected
                  ? 'bg-white border-[#9E0B1A] shadow-md ring-1 ring-[#9E0B1A]/20'
                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
              } ${isArchived ? 'opacity-60 bg-slate-50' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded mb-1.5">
                    {cls.term}
                  </span>
                  <h3 className="font-bold text-slate-900 text-sm">{cls.name}</h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <BookOpen className="w-3 h-3 text-slate-400" />
                    {cls.subject}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1 justify-end">
                    <Users className="w-3 h-3 text-slate-400" />
                    {cls.studentCount || 34} alunos
                  </span>
                </div>
              </div>

              {/* Invite Code Box */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="text-[11px]">
                  <span className="text-slate-400 font-medium">Código de Convite: </span>
                  <span className="font-mono font-bold text-[#9E0B1A] bg-red-50 px-2 py-0.5 rounded">
                    {cls.inviteCode}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyInviteCode(cls.inviteCode, cls.id);
                    }}
                    className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition cursor-pointer"
                    title="Copiar código para compartilhar com alunos"
                  >
                    {copiedCodeId === cls.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      regenerateInviteCode(cls.id);
                    }}
                    className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-[#9E0B1A] rounded-lg transition cursor-pointer"
                    title="Regenerar código de convite (invalida o anterior)"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Class Detail & Enrolled Students */}
      {activeClass && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Header of Active Class */}
          <div className="p-6 bg-slate-50/60 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  Alunos Matriculados em {activeClass.name}
                </h2>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  {filteredStudents.length} alunos
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Alunos inscritos via código de convite ({activeClass.inviteCode}) ou matriculados manualmente.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEnrollModalOpen(true)}
                className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <UserPlus className="w-3.5 h-3.5 text-slate-500" />
                Matricular por E-mail
              </button>

              <button
                onClick={() => archiveClass(activeClass.id)}
                className="px-3 py-2 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                title="Arquivar turma sem perder histórico"
              >
                <Archive className="w-3.5 h-3.5" />
                Arquivar Turma
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="p-4 border-b border-slate-100 flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome, matrícula ou e-mail do aluno..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#9E0B1A]"
              />
            </div>
          </div>

          {/* Students Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase font-semibold text-[10px] tracking-wider">
                <tr>
                  <th className="px-6 py-3">Aluno</th>
                  <th className="px-4 py-3">Matrícula</th>
                  <th className="px-4 py-3">E-mail Institucional</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((std) => (
                  <tr key={std.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-3.5 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-xs">
                          {std.name.substring(0, 1)}
                        </div>
                        <span>{std.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-600">
                      {std.registration}
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 font-medium">
                      {std.email}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Matriculado
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => deleteStudent(std.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                        title="Desvincular da turma"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Nova Turma */}
      {isNewClassModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Criar Nova Turma</h3>
              <button
                onClick={() => setIsNewClassModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateClass} className="space-y-3.5 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700">
                    Selecione a Disciplina *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewClassModalOpen(false);
                      setIsNewDisciplineModalOpen(true);
                    }}
                    className="text-[11px] font-bold text-[#9E0B1A] hover:underline cursor-pointer"
                  >
                    + Nova Disciplina
                  </button>
                </div>
                <select
                  required
                  value={newClassSubject}
                  onChange={(e) => setNewClassSubject(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-[#9E0B1A]"
                >
                  <option value="" disabled>
                    Selecione uma disciplina...
                  </option>
                  {disciplines.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name} ({d.code} • {d.course})
                    </option>
                  ))}
                </select>
              </div>

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
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#9E0B1A]"
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
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#9E0B1A]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewClassModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#9E0B1A] text-white font-bold rounded-xl cursor-pointer"
                >
                  Criar Turma
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nova Disciplina */}
      {isNewDisciplineModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#9E0B1A]" />
                <h3 className="font-bold text-slate-900 text-sm">Cadastrar Nova Disciplina</h3>
              </div>
              <button
                onClick={() => setIsNewDisciplineModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateDiscipline} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nome da Disciplina *
                </label>
                <input
                  type="text"
                  required
                  value={newDiscName}
                  onChange={(e) => setNewDiscName(e.target.value)}
                  placeholder="Ex: Direito Cibernético"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#9E0B1A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Código (opcional)
                  </label>
                  <input
                    type="text"
                    value={newDiscCode}
                    onChange={(e) => setNewDiscCode(e.target.value)}
                    placeholder="Ex: DIR-801"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-[#9E0B1A]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Curso
                  </label>
                  <input
                    type="text"
                    required
                    value={newDiscCourse}
                    onChange={(e) => setNewDiscCourse(e.target.value)}
                    placeholder="Ex: Direito"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#9E0B1A]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewDisciplineModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#9E0B1A] text-white font-bold rounded-xl cursor-pointer"
                >
                  Salvar Disciplina
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Matrícula por Email */}
      {isEnrollModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Matricular Aluno por E-mail</h3>
              <button
                onClick={() => setIsEnrollModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                ×
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-500">
                Informe o e-mail institucional do aluno (@catolicasc.edu.br) para vincular à turma {activeClass.name}.
              </p>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  E-mail do Aluno
                </label>
                <input
                  type="email"
                  value={enrollEmail}
                  onChange={(e) => setEnrollEmail(e.target.value)}
                  placeholder="aluno@catolicasc.edu.br"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#9E0B1A]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEnrollModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    addToast({
                      type: 'success',
                      title: 'Convite Enviado!',
                      message: `Instruções de matrícula enviadas para ${enrollEmail || 'aluno@catolicasc.edu.br'}.`,
                    });
                    setIsEnrollModalOpen(false);
                    setEnrollEmail('');
                  }}
                  className="px-4 py-2 bg-[#9E0B1A] text-white font-bold rounded-xl"
                >
                  Confirmar Matrícula
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
