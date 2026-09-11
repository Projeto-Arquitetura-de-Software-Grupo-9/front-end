'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Student } from '@/lib/types';
import {
  Download,
  Plus,
  Trash2,
  Search,
  ChevronDown,
  Upload,
  UserCheck,
  GraduationCap,
  Mail,
  FileSpreadsheet,
} from 'lucide-react';

export const StudentsScreen: React.FC = () => {
  const {
    students,
    deleteStudent,
    deleteStudentsBatch,
    setIsNewStudentModalOpen,
    setIsExcelImportModalOpen,
    addToast,
  } = useApp();

  const [selectedDiscipline, setSelectedDiscipline] = useState('Todas');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // Unique disciplines/courses
  const disciplines = useMemo(() => {
    const set = new Set(students.map((s) => s.discipline));
    return ['Todas', ...Array.from(set)];
  }, [students]);

  // Filtered students
  const filteredStudents = useMemo(() => {
    return students.filter((std) => {
      const matchDisc =
        selectedDiscipline === 'Todas' ||
        std.discipline === selectedDiscipline ||
        std.course.toLowerCase().includes(selectedDiscipline.toLowerCase());
      const matchSearch =
        searchTerm.trim() === '' ||
        std.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        std.registration.toLowerCase().includes(searchTerm.toLowerCase()) ||
        std.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        std.course.toLowerCase().includes(searchTerm.toLowerCase());
      return matchDisc && matchSearch;
    });
  }, [students, selectedDiscipline, searchTerm]);

  // Handle select all
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

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header with Title and Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Alunos Cadastrados
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Importe listas de alunos, vincule matrículas e acompanhe médias consolidadas.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsExcelImportModalOpen(true)}
            className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs px-4 py-2.5 rounded-xl shadow-xs transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" />
            Importar Lista (Excel)
          </button>

          <button
            onClick={() => setIsNewStudentModalOpen(true)}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Novo Aluno
          </button>
        </div>
      </div>

      {/* Filter and Mass Actions Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Discipline Filter */}
          <div className="relative">
            <select
              value={selectedDiscipline}
              onChange={(e) => setSelectedDiscipline(e.target.value)}
              className="text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2 pr-9 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {disciplines.map((d) => (
                <option key={d} value={d}>
                  Disciplina: {d}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por nome, matrícula ou e-mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Mass Actions */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-400">Ações em Massa:</span>
          <button
            onClick={handleDeleteSelected}
            disabled={selectedStudentIds.length === 0}
            className="px-4 py-1.5 rounded-xl border border-rose-300 text-rose-600 hover:bg-rose-50 disabled:opacity-40 disabled:hover:bg-transparent text-xs font-semibold transition cursor-pointer"
          >
            Excluir Selecionados ({selectedStudentIds.length})
          </button>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400">
                <th className="py-4 px-6 w-12">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                  />
                </th>
                <th className="py-4 px-4 font-semibold">Nome Completo</th>
                <th className="py-4 px-4 font-semibold">Matrícula</th>
                <th className="py-4 px-4 font-semibold">Curso</th>
                <th className="py-4 px-4 font-semibold">Email</th>
                <th className="py-4 px-4 font-semibold text-center">Provas Realizadas</th>
                <th className="py-4 px-6 font-semibold text-right">Média Geral</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Nenhum aluno encontrado com estes filtros.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((std) => {
                  const isChecked = selectedStudentIds.includes(std.id);
                  const isPass = std.overallAverage >= 7.0;
                  const isWarning = std.overallAverage >= 5.0 && std.overallAverage < 7.0;
                  const isFail = std.overallAverage < 5.0;

                  return (
                    <tr
                      key={std.id}
                      className={`hover:bg-slate-50/70 transition ${
                        isChecked ? 'bg-blue-50/30' : ''
                      }`}
                    >
                      <td className="py-4 px-6">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleStudent(std.id)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                        />
                      </td>

                      <td className="py-4 px-4 font-bold text-slate-900">
                        {std.name}
                      </td>

                      <td className="py-4 px-4 text-slate-500 font-mono">
                        {std.registration}
                      </td>

                      <td className="py-4 px-4 text-slate-700">
                        {std.course}
                      </td>

                      <td className="py-4 px-4 text-slate-500">
                        {std.email}
                      </td>

                      <td className="py-4 px-4 text-center font-semibold text-slate-700">
                        {std.examsTaken}
                      </td>

                      <td className="py-4 px-6 text-right">
                        <span
                          className={`inline-flex items-center justify-center min-w-[40px] px-2 py-0.5 rounded text-xs font-bold ${
                            isPass
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isWarning
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {std.overallAverage.toFixed(1)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
