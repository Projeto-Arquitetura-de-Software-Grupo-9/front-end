'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
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
  FileSpreadsheet,
  Download,
  Filter,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';

export const TurmasScreen: React.FC = () => {
  const {
    disciplines,
    classes,
    activeClassId,
    setActiveClassId,
    addClass,
    archiveClass,
    regenerateInviteCode,
    students,
    deleteStudent,
    deleteStudentsBatch,
    setIsNewStudentModalOpen,
    setIsExcelImportModalOpen,
    addToast,
  } = useApp();

  // Search and selection state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDisciplineFilter, setSelectedDisciplineFilter] = useState<string>('Todas');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  // New Class Modal
  const [isNewClassModalOpen, setIsNewClassModalOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassSubject, setNewClassSubject] = useState(
    disciplines[0]?.name || ''
  );
  const [newClassTerm, setNewClassTerm] = useState('2026/1');

  useEffect(() => {
    if (
      disciplines.length > 0 &&
      !disciplines.some((d) => (d.name || (d as any).nome) === newClassSubject)
    ) {
      setNewClassSubject(disciplines[0].name);
    }
  }, [disciplines, newClassSubject]);

  // Quick enroll student by email
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [enrollEmail, setEnrollEmail] = useState('');

  // Active selected class
  const activeClass =
    classes.find((c) => c.id === activeClassId) || classes[0] || null;

  // Filter classes by discipline filter
  const filteredClasses = useMemo(() => {
    if (selectedDisciplineFilter === 'Todas') return classes;
    return classes.filter(
      (c) =>
        (c.subject || '').trim().toLowerCase() ===
        selectedDisciplineFilter.trim().toLowerCase()
    );
  }, [classes, selectedDisciplineFilter]);

  // Students belonging to the active class (or filtered by class)
  const classStudents = useMemo(() => {
    if (!activeClass) return students;
    return students.filter((std) => {
      // Matches class group name or subject/discipline
      if (std.classGroup && std.classGroup === activeClass.name) return true;
      if (
        (std.discipline || '').trim().toLowerCase() ===
        (activeClass.subject || '').trim().toLowerCase()
      )
        return true;
      return false;
    });
  }, [students, activeClass]);

  // Filtered students by search term (strictly scoped to the active class)
  const filteredStudents = useMemo(() => {
    return classStudents.filter((std) => {
      const q = searchTerm.trim().toLowerCase();
      if (!q) return true;
      return (
        std.name.toLowerCase().includes(q) ||
        std.registration.toLowerCase().includes(q) ||
        std.email.toLowerCase().includes(q) ||
        (std.course || '').toLowerCase().includes(q)
      );
    });
  }, [classStudents, searchTerm]);

  // Checkbox selection
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudentIds(filteredStudents.map((s) => s.id));
    } else {
      setSelectedStudentIds([]);
    }
  };

  const handleToggleStudent = (id: string) => {
    if (selectedStudentIds.includes(id)) {
      setSelectedStudentIds(selectedStudentIds.filter((sid) => sid !== id));
    } else {
      setSelectedStudentIds([...selectedStudentIds, id]);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedStudentIds.length === 0) return;
    deleteStudentsBatch(selectedStudentIds);
    setSelectedStudentIds([]);
  };

  const isAllSelected =
    filteredStudents.length > 0 &&
    filteredStudents.every((s) => selectedStudentIds.includes(s.id));

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

  const handleCreateClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;

    const matchedDisc = disciplines.find(
      (d) => (d.name || (d as any).nome) === newClassSubject
    );

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
    addToast({
      type: 'success',
      title: 'Turma Criada com Sucesso!',
      message: `A turma "${created.name}" já está disponível para matrícula.`,
    });
  };

  const downloadSampleCsv = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' + 'Nome,Matrícula,Email,Curso\n';
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'modelo_alunos_correge.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast({
      type: 'info',
      title: 'Download Concluído',
      message: 'Planilha modelo CSV (cabeçalhos) baixada com sucesso.',
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <GraduationCap className="w-6 h-6 text-[#9E0B1A]" />
            <span>Minhas Turmas</span>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Gerencie turmas letivas, códigos de convite e acompanhe o corpo discente matriculado.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/disciplinas"
            className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs px-4 py-2.5 rounded-xl shadow-2xs transition cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-[#9E0B1A]" />
            <span>Disciplinas</span>
          </Link>

          <button
            onClick={() => setIsNewClassModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#9E0B1A] hover:bg-[#850916] text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Turma</span>
          </button>
        </div>
      </div>

      {/* Filter by Discipline Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-400 font-semibold whitespace-nowrap mr-1">Filtrar por Disciplina:</span>
        <button
          onClick={() => setSelectedDisciplineFilter('Todas')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer whitespace-nowrap ${
            selectedDisciplineFilter === 'Todas'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Todas ({classes.length})
        </button>
        {disciplines.map((d) => {
          const dName = d.name || (d as any).nome || 'Disciplina';
          const isSelected = selectedDisciplineFilter === dName;
          const count = classes.filter(
            (c) => (c.subject || '').trim().toLowerCase() === dName.trim().toLowerCase()
          ).length;

          return (
            <button
              key={d.id}
              onClick={() => setSelectedDisciplineFilter(dName)}
              className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer whitespace-nowrap ${
                isSelected
                  ? 'bg-[#9E0B1A] text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {dName} ({count})
            </button>
          );
        })}
      </div>

      {/* Grid of Classes Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {filteredClasses.length === 0 ? (
          <div className="col-span-3 p-8 bg-white border border-dashed border-slate-200 rounded-3xl text-center space-y-3">
            <GraduationCap className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">
              Nenhuma turma encontrada nesta categoria.
            </p>
            <button
              onClick={() => setIsNewClassModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#9E0B1A] hover:underline cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Criar nova turma agora
            </button>
          </div>
        ) : (
          filteredClasses.map((cls) => {
            const isSelected = cls.id === activeClass?.id;
            const isArchived = cls.status === 'archived';

            return (
              <div
                key={cls.id}
                onClick={() => setActiveClassId(cls.id)}
                className={`p-5 rounded-2xl border transition text-left cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                  isSelected
                    ? 'bg-white border-[#9E0B1A] shadow-md ring-2 ring-[#9E0B1A]/20'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                } ${isArchived ? 'opacity-60 bg-slate-50' : ''}`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded mb-1.5">
                      {cls.term}
                    </span>
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <Users className="w-3 h-3 text-slate-400" />
                      {cls.studentCount ?? (isSelected ? classStudents.length : 0)} alunos
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm">{cls.name}</h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                    <BookOpen className="w-3 h-3 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{cls.subject}</span>
                  </p>
                </div>

                {/* Invite Code Box */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-[11px]">
                    <span className="text-slate-400 font-medium">Convite: </span>
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
          })
        )}
      </div>

      {/* Selected Class Detail & Merged Student Management */}
      {activeClass && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden space-y-0">
          {/* Header of Active Class */}
          <div className="p-6 bg-slate-50/70 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-lg font-bold text-slate-900">
                  Alunos Matriculados em {activeClass.name}
                </h2>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-red-50 text-[#9E0B1A] border border-red-200/60">
                  {filteredStudents.length} alunos
                </span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {activeClass.subject} ({activeClass.term})
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Alunos inscritos via código de convite ({activeClass.inviteCode}) ou importados via planilha institucional.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setIsNewStudentModalOpen(true)}
                className="px-3.5 py-2 bg-[#9E0B1A] hover:bg-[#850916] text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Matricular Aluno
              </button>

              <button
                onClick={() => setIsExcelImportModalOpen(true)}
                className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                Importar Excel
              </button>

              <button
                onClick={downloadSampleCsv}
                className="px-3 py-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                title="Baixar planilha modelo CSV para importação"
              >
                <Download className="w-3.5 h-3.5" />
                Modelo
              </button>

              <button
                onClick={() => archiveClass(activeClass.id)}
                className="px-3 py-2 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-xl text-xs font-semibold transition flex items-center gap-1 cursor-pointer ml-1"
                title="Arquivar turma sem perder histórico"
              >
                <Archive className="w-3.5 h-3.5" />
                Arquivar
              </button>
            </div>
          </div>

          {/* Action and Search Toolbar */}
          <div className="p-4 border-b border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome, matrícula ou e-mail institucional..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#9E0B1A]"
              />
            </div>

            {selectedStudentIds.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">
                  {selectedStudentIds.length} selecionado(s)
                </span>
                <button
                  onClick={handleDeleteSelected}
                  className="px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Excluir Selecionados
                </button>
              </div>
            )}
          </div>

          {/* Students Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase font-semibold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4 rounded accent-[#9E0B1A] text-[#9E0B1A] border-slate-300 cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-3">Nome do Aluno</th>
                  <th className="px-4 py-3">Matrícula</th>
                  <th className="px-4 py-3">E-mail Institucional</th>
                  <th className="px-4 py-3 text-center">Provas</th>
                  <th className="px-4 py-3 text-center">Média Geral</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      Nenhum aluno encontrado para os critérios de busca.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((std) => {
                    const isChecked = selectedStudentIds.includes(std.id);
                    const avg = std.overallAverage ?? 0;
                    const isPass = avg >= 7.0;
                    const isWarning = avg >= 5.0 && avg < 7.0;

                    return (
                      <tr
                        key={std.id}
                        className={`hover:bg-slate-50/70 transition ${
                          isChecked ? 'bg-red-50/40' : ''
                        }`}
                      >
                        <td className="py-3 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleStudent(std.id)}
                            className="w-4 h-4 rounded accent-[#9E0B1A] text-[#9E0B1A] border-slate-300 cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3.5 font-bold text-slate-900">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs flex-shrink-0">
                              {std.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="truncate">{std.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-slate-600">
                          {std.registration}
                        </td>
                        <td className="px-4 py-3.5 text-slate-500 font-medium">
                          {std.email}
                        </td>
                        <td className="px-4 py-3.5 text-center text-slate-600 font-semibold">
                          {std.examsTaken ?? 0}
                        </td>
                        <td className="px-4 py-3.5 text-center font-bold">
                          {avg > 0 ? (
                            <span
                              className={`inline-block px-2 py-0.5 rounded-md text-[11px] ${
                                isPass
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : isWarning
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-rose-50 text-rose-700'
                              }`}
                            >
                              {avg.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
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
                            title="Desvincular aluno da turma"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Nova Turma */}
      {isNewClassModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-[#9E0B1A]" />
                <h3 className="font-bold text-slate-900 text-sm">Criar Nova Turma</h3>
              </div>
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
                  <Link
                    href="/disciplinas"
                    onClick={() => setIsNewClassModalOpen(false)}
                    className="text-[11px] font-bold text-[#9E0B1A] hover:underline cursor-pointer"
                  >
                    + Gerenciar Disciplinas
                  </Link>
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
                  {disciplines.map((d) => {
                    const dName = d.name || (d as any).nome || 'Disciplina';
                    const dCode = d.code || (d as any).codigo || 'DIR-101';
                    const dCourse = d.course || (d as any).curso || 'Direito';
                    return (
                      <option key={d.id} value={dName}>
                        {dName} ({dCode} • {dCourse})
                      </option>
                    );
                  })}
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
                  className="px-4 py-2 bg-[#9E0B1A] hover:bg-[#850916] text-white font-bold rounded-xl cursor-pointer shadow-sm transition"
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
