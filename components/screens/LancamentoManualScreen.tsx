'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import {
  ClipboardCheck,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  UserX,
  ChevronDown,
  Layers,
  GraduationCap,
  Calendar,
  FileText,
  Clock,
  Sparkles,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';

export const LancamentoManualScreen: React.FC = () => {
  const {
    applications,
    activeApplicationId,
    setActiveApplicationId,
    corrections,
    assignCorrection,
    students,
    setCurrentScreen,
    addToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'pendentes' | 'atribuidas'>('pendentes');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVersionFilter, setSelectedVersionFilter] = useState('Todas');

  // Modal State for assigning
  const [selectedCorrectionId, setSelectedCorrectionId] = useState<string | null>(null);
  const [targetStudentId, setTargetStudentId] = useState<string>(students[0]?.id || '');
  const [manualNotes, setManualNotes] = useState('');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  const currentApp = applications.find((a) => a.id === activeApplicationId) || applications[0];

  // Corrections for the current application
  const appCorrections = useMemo(() => {
    return corrections.filter(
      (c) => !activeApplicationId || c.applicationId === activeApplicationId || c.applicationId === 'app-2'
    );
  }, [corrections, activeApplicationId]);

  // Unassigned corrections (Feature 9)
  const pendingCorrections = useMemo(() => {
    return appCorrections.filter((c) => !c.studentId);
  }, [appCorrections]);

  // Already assigned manual corrections
  const assignedCorrections = useMemo(() => {
    return appCorrections.filter((c) => c.studentId && !c.isAutomaticallyAssigned);
  }, [appCorrections]);

  // Filtered pending list based on search and version
  const filteredPending = useMemo(() => {
    return pendingCorrections.filter((c) => {
      const matchesSearch =
        !searchTerm.trim() ||
        (c.reportedStudentName && c.reportedStudentName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.reportedStudentRegistration && c.reportedStudentRegistration.includes(searchTerm));
      const matchesVersion =
        selectedVersionFilter === 'Todas' || c.versionLetter === selectedVersionFilter;
      return matchesSearch && matchesVersion;
    });
  }, [pendingCorrections, searchTerm, selectedVersionFilter]);

  // Selected correction being assigned
  const correctionToAssign = useMemo(() => {
    return corrections.find((c) => c.id === selectedCorrectionId);
  }, [corrections, selectedCorrectionId]);

  // Open modal and pre-filter students list matching reported name/matricula
  const handleOpenAssignModal = (corrId: string) => {
    const target = corrections.find((c) => c.id === corrId);
    setSelectedCorrectionId(corrId);
    setManualNotes('');

    if (target?.reportedStudentName) {
      setStudentSearchQuery(target.reportedStudentName);
      // Try to find matching student
      const match = students.find(
        (s) =>
          s.name.toLowerCase().includes(target.reportedStudentName!.toLowerCase()) ||
          (target.reportedStudentRegistration && s.registration.includes(target.reportedStudentRegistration))
      );
      if (match) {
        setTargetStudentId(match.id);
      } else {
        setTargetStudentId(students[0]?.id || '');
      }
    } else {
      setStudentSearchQuery('');
      setTargetStudentId(students[0]?.id || '');
    }
  };

  const handleConfirmAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCorrectionId || !targetStudentId) return;

    assignCorrection(selectedCorrectionId, targetStudentId, manualNotes);
    setSelectedCorrectionId(null);
    setManualNotes('');
  };

  // Filter available students in modal
  const eligibleStudents = useMemo(() => {
    return students.filter((s) => {
      if (!studentSearchQuery.trim()) return true;
      const query = studentSearchQuery.toLowerCase();
      return (
        s.name.toLowerCase().includes(query) ||
        s.registration.toLowerCase().includes(query) ||
        s.email.toLowerCase().includes(query)
      );
    });
  }, [students, studentSearchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#9E0B1A] uppercase tracking-wider">
            <ClipboardCheck className="w-4 h-4" />
            <span>Feature 9 – Lançamento Manual de Notas (Católica SC)</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">
            Lançamento Manual de Provas
          </h1>
          <p className="text-xs text-slate-500">
            Associe as correções realizadas pelo app móvel aos respectivos alunos da turma para provas aplicadas sem identificação pré-impressa.
          </p>
        </div>

        {/* Application Selector */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={activeApplicationId}
              onChange={(e) => setActiveApplicationId(e.target.value)}
              className="text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 pr-8 appearance-none cursor-pointer shadow-2xs focus:outline-none focus:ring-1 focus:ring-[#9E0B1A]"
            >
              {applications.map((app) => (
                <option key={app.id} value={app.id}>
                  {app.title} ({app.withStudentIdentification ? 'Com Identificação' : 'Sem Identificação'})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Info Callout explaining Feature 9 Rule */}
      <div className="p-4 bg-slate-100/80 rounded-2xl border border-slate-200 flex items-start gap-3 text-xs text-slate-700">
        <HelpCircle className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-bold text-slate-900 block">Como funciona o fluxo da Feature 9:</span>
          <p className="text-slate-600 leading-relaxed text-[11px]">
            Quando uma prova é aplicada no modo <strong>Sem Identificação</strong> (anônima), o professor usa a câmera do app móvel para calcular a nota e anota o nome/matrícula escrito à mão pelo aluno. A correção fica salva nesta fila até você associá-la formalmente a um aluno matriculado. A nota passará a constar no histórico do aluno e nos relatórios consolidados.
          </p>
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Pendentes */}
        <div className="bg-white p-5 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">Pendentes de Atribuição</span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-amber-950">{pendingCorrections.length}</div>
            <div className="text-[11px] text-amber-700 mt-1">Aguardando vinculação ao aluno</div>
          </div>
        </div>

        {/* Já Atribuídas Manualmente */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Atribuídas Manualmente</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-slate-900">{assignedCorrections.length}</div>
            <div className="text-[11px] text-slate-500 mt-1">Lançamentos confirmados</div>
          </div>
        </div>

        {/* Turma Destino */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Turma Selecionada</span>
            <div className="w-8 h-8 rounded-lg bg-red-50 text-[#9E0B1A] flex items-center justify-center font-bold">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-base font-bold text-slate-900 truncate">{currentApp.className}</div>
            <div className="text-[11px] text-slate-500 mt-1">{currentApp.discipline}</div>
          </div>
        </div>
      </div>

      {/* Main Content Area: Tabs + Filters + Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 pt-4">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setActiveTab('pendentes')}
              className={`pb-4 text-xs font-bold transition relative cursor-pointer ${
                activeTab === 'pendentes'
                  ? 'text-[#9E0B1A] border-b-2 border-[#9E0B1A]'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>Provas Pendentes</span>
              <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                {pendingCorrections.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('atribuidas')}
              className={`pb-4 text-xs font-bold transition relative cursor-pointer ${
                activeTab === 'atribuidas'
                  ? 'text-[#9E0B1A] border-b-2 border-[#9E0B1A]'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>Histórico de Atribuições</span>
              <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                {assignedCorrections.length}
              </span>
            </button>
          </div>

          <button
            onClick={() => setCurrentScreen('resultados')}
            className="text-xs font-bold text-[#9E0B1A] hover:text-[#850916] flex items-center gap-1 cursor-pointer pb-4"
          >
            <span>Ver Estatísticas Gerais</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Filters Toolbar */}
        <div className="p-4 bg-slate-50/60 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar pelo nome escrito à mão na prova ou matrícula..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#9E0B1A]"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Caderno:</span>
            <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-xl">
              {['Todas', 'A', 'B'].map((v) => (
                <button
                  key={v}
                  onClick={() => setSelectedVersionFilter(v)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                    selectedVersionFilter === v
                      ? 'bg-[#9E0B1A] text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {v === 'Todas' ? 'Todos' : `Caderno ${v}`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab 1: Provas Pendentes de Atribuição */}
        {activeTab === 'pendentes' && (
          <div>
            {filteredPending.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase font-semibold text-[10px] tracking-wider">
                    <tr>
                      <th className="px-6 py-3">Caderno</th>
                      <th className="px-4 py-3">Identificação Manuscrita na Prova Física</th>
                      <th className="px-4 py-3">Matrícula Anotada</th>
                      <th className="px-4 py-3">Data da Correção</th>
                      <th className="px-4 py-3">Nota Calculada</th>
                      <th className="px-4 py-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPending.map((corr) => (
                      <tr key={corr.id} className="hover:bg-slate-50/60 transition">
                        <td className="px-6 py-4">
                          <span className="font-mono font-bold text-xs bg-red-50 text-[#9E0B1A] border border-red-200 px-2.5 py-1 rounded-lg">
                            Caderno {corr.versionLetter}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-bold text-slate-900 text-sm">
                            {corr.reportedStudentName || 'Aluno não identificado'}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            Anotado pelo professor no app mobile
                          </span>
                        </td>
                        <td className="px-4 py-4 font-mono text-slate-600 font-semibold">
                          {corr.reportedStudentRegistration || 'Não preenchido'}
                        </td>
                        <td className="px-4 py-4 text-slate-500">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{new Date(corr.confirmedAt).toLocaleDateString('pt-BR')} {new Date(corr.confirmedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-base font-black text-emerald-700">
                            {corr.totalScore.toFixed(1)} <span className="text-xs font-normal text-slate-400">/ {corr.maxScore.toFixed(1)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button
                            onClick={() => handleOpenAssignModal(corr.id)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#9E0B1A] hover:bg-[#850916] text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Vincular a Aluno</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Empty state */
              <div className="p-12 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-slate-800 text-base">
                  Nenhuma prova pendente de lançamento manual!
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Todas as correções de provas físicas desta aplicação já foram associadas aos alunos da turma.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Histórico de Atribuições */}
        {activeTab === 'atribuidas' && (
          <div>
            {assignedCorrections.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase font-semibold text-[10px] tracking-wider">
                    <tr>
                      <th className="px-6 py-3">Aluno Vinculado</th>
                      <th className="px-4 py-3">Matrícula</th>
                      <th className="px-4 py-3">Caderno</th>
                      <th className="px-4 py-3">Nota Atribuída</th>
                      <th className="px-4 py-3">Observações</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {assignedCorrections.map((corr) => (
                      <tr key={corr.id} className="hover:bg-slate-50/60 transition">
                        <td className="px-6 py-3.5 font-bold text-slate-900">
                          {corr.studentName}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-slate-600">
                          {corr.registration}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-slate-700 font-semibold">
                          Caderno {corr.versionLetter}
                        </td>
                        <td className="px-4 py-3.5 font-bold text-emerald-700 text-sm">
                          {corr.totalScore.toFixed(1)} pts
                        </td>
                        <td className="px-4 py-3.5 text-slate-500 italic">
                          {corr.notes || 'Sem observações'}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Lançado
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 text-xs">
                Nenhum lançamento manual registrado ainda para esta aplicação.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Vincular a Aluno (Feature 9) */}
      {selectedCorrectionId && correctionToAssign && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Associar Prova Física a um Aluno
                </h3>
                <span className="text-[11px] text-slate-400">
                  Feature 9 – Lançamento Manual de Nota
                </span>
              </div>
              <button
                onClick={() => setSelectedCorrectionId(null)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ×
              </button>
            </div>

            {/* Exam card summary */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">
                  Caderno {correctionToAssign.versionLetter}
                </span>
                <span className="font-bold text-emerald-700 text-sm">
                  Nota: {correctionToAssign.totalScore} / {correctionToAssign.maxScore}
                </span>
              </div>
              <div className="text-[11px] text-slate-600">
                Texto lido na prova física: <strong>"{correctionToAssign.reportedStudentName || 'N/A'}"</strong>
              </div>
              {correctionToAssign.reportedStudentRegistration && (
                <div className="text-[11px] text-slate-600">
                  Matrícula anotada: <strong className="font-mono">{correctionToAssign.reportedStudentRegistration}</strong>
                </div>
              )}
            </div>

            <form onSubmit={handleConfirmAssignment} className="space-y-4 text-xs">
              {/* Student Search & Select */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Selecione o Aluno Matriculado na Turma *
                </label>
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                    placeholder="Filtrar por nome ou matrícula..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <select
                  required
                  size={5}
                  value={targetStudentId}
                  onChange={(e) => setTargetStudentId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#9E0B1A]"
                >
                  {eligibleStudents.map((s) => (
                    <option key={s.id} value={s.id} className="py-1 px-1">
                      {s.name} — Matrícula: {s.registration} ({s.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes field */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Observações do Lançamento (Opcional)
                </label>
                <input
                  type="text"
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="Ex: Aluno fez 2ª chamada / prova sem identificação manuscrita."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#9E0B1A]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedCorrectionId(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#9E0B1A] hover:bg-[#850916] text-white font-bold rounded-xl transition cursor-pointer shadow-xs"
                >
                  Confirmar e Atribuir Nota
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
