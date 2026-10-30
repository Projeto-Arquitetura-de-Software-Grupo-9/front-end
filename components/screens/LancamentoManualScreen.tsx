'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { getVersionLetters } from '@/lib/mock-data';
import {
  Search,
  CheckCircle2,
  UserCheck,
  Clock,
  QrCode,
  X,
} from 'lucide-react';

export const LancamentoManualScreen: React.FC = () => {
  const {
    selectedExam,
    corrections,
    assignCorrection,
    students,
    setIsScannerModalOpen,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'pendentes' | 'atribuidas'>('pendentes');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVersionFilter, setSelectedVersionFilter] = useState('Todas');

  // Modal State for assigning a pending sheet to a student
  const [selectedCorrectionId, setSelectedCorrectionId] = useState<string | null>(null);
  const [targetStudentId, setTargetStudentId] = useState<string>(students[0]?.id || '');
  const [manualNotes, setManualNotes] = useState('');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  const availableVersionLetters = useMemo(
    () => getVersionLetters(selectedExam?.numberOfVersions || 4),
    [selectedExam?.numberOfVersions]
  );

  // Unassigned corrections (Provas Avulsas / Não Nominais)
  const pendingCorrections = useMemo(() => {
    return corrections.filter((c) => !c.studentId);
  }, [corrections]);

  // Already assigned manual corrections
  const assignedCorrections = useMemo(() => {
    return corrections.filter((c) => c.studentId && !c.isAutomaticallyAssigned);
  }, [corrections]);

  // Filtered pending list based on search and version
  const filteredPending = useMemo(() => {
    return pendingCorrections.filter((c) => {
      const matchesSearch =
        !searchTerm.trim() ||
        (c.reportedStudentName &&
          c.reportedStudentName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.reportedStudentRegistration &&
          c.reportedStudentRegistration.includes(searchTerm));
      const matchesVersion =
        selectedVersionFilter === 'Todas' || c.versionLetter === selectedVersionFilter;
      return matchesSearch && matchesVersion;
    });
  }, [pendingCorrections, searchTerm, selectedVersionFilter]);

  const filteredAssigned = useMemo(() => {
    return assignedCorrections.filter((c) => {
      const matchesSearch =
        !searchTerm.trim() ||
        (c.studentName && c.studentName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.registration && c.registration.includes(searchTerm));
      const matchesVersion =
        selectedVersionFilter === 'Todas' || c.versionLetter === selectedVersionFilter;
      return matchesSearch && matchesVersion;
    });
  }, [assignedCorrections, searchTerm, selectedVersionFilter]);

  const correctionToAssign = useMemo(() => {
    return corrections.find((c) => c.id === selectedCorrectionId);
  }, [corrections, selectedCorrectionId]);

  const handleOpenAssignModal = (corrId: string) => {
    const target = corrections.find((c) => c.id === corrId);
    setSelectedCorrectionId(corrId);
    setManualNotes('');

    if (target?.reportedStudentName) {
      setStudentSearchQuery(target.reportedStudentName);
      const match = students.find(
        (s) =>
          s.name.toLowerCase().includes(target.reportedStudentName!.toLowerCase()) ||
          (target.reportedStudentRegistration &&
            s.registration.includes(target.reportedStudentRegistration))
      );
      setTargetStudentId(match ? match.id : students[0]?.id || '');
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
    <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-xs bg-white animate-in fade-in duration-200">
      {/* Single Minimalist Command Bar (Consistent with PrintPreviewScreen) */}
      <div className="bg-white px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: Segmented Status Toggle & Caderno Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveTab('pendentes')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                activeTab === 'pendentes'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <span>Folhas Avulsas Pendentes</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                  pendingCorrections.length > 0
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {pendingCorrections.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('atribuidas')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                activeTab === 'atribuidas'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <span>Já Vinculadas</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                {assignedCorrections.length}
              </span>
            </button>
          </div>

          <div className="h-4 w-px bg-slate-200 hidden sm:block" />

          {/* Caderno Filter Dropdown */}
          <select
            value={selectedVersionFilter}
            onChange={(e) => setSelectedVersionFilter(e.target.value)}
            className="text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 cursor-pointer focus:outline-none"
          >
            <option value="Todas">Todos os Cadernos</option>
            {availableVersionLetters.map((v) => (
              <option key={v} value={v}>
                Caderno {v}
              </option>
            ))}
          </select>
        </div>

        {/* Right: Search & Scan Button */}
        <div className="flex items-center gap-2">
          <div className="relative w-56 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar nome ou matrícula..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-300"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsScannerModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#9E0B1A] hover:bg-[#850916] text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-2xs"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Ler Folha Avulsa</span>
          </button>
        </div>
      </div>

      {/* Table Content */}
      {activeTab === 'pendentes' ? (
        filteredPending.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 text-slate-500 border-b border-slate-200 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="px-5 py-3">Caderno Lido</th>
                  <th className="px-4 py-3">Nome Anotado na Folha</th>
                  <th className="px-4 py-3">Matrícula Anotada</th>
                  <th className="px-4 py-3">Leitura</th>
                  <th className="px-4 py-3">Nota Calculada</th>
                  <th className="px-5 py-3 text-right">Vínculo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPending.map((corr) => (
                  <tr key={corr.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-5 py-3.5">
                      <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2.5 py-1 rounded-md">
                        Caderno {corr.versionLetter}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-900">
                        {corr.reportedStudentName || 'Sem nome anotado'}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-500">
                      {corr.reportedStudentRegistration || '—'}
                    </td>
                    <td className="px-4 py-3.5 text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {new Date(corr.confirmedAt).toLocaleDateString('pt-BR')}{' '}
                          {new Date(corr.confirmedAt).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-sm font-black text-emerald-700">
                        {corr.totalScore.toFixed(1)}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {' '}
                        / {corr.maxScore.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleOpenAssignModal(corr.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-bold transition cursor-pointer"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Vincular Aluno</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center space-y-2.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">
              Nenhuma folha avulsa pendente de vínculo
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Quando você imprimir provas no modo <strong>Avulsa</strong> e escanear o QR Code, elas aparecerão aqui para serem associadas aos alunos.
            </p>
          </div>
        )
      ) : filteredAssigned.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 text-slate-500 border-b border-slate-200 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="px-5 py-3">Aluno Vinculado</th>
                <th className="px-4 py-3">Matrícula</th>
                <th className="px-4 py-3">Caderno</th>
                <th className="px-4 py-3">Nota</th>
                <th className="px-4 py-3">Observações</th>
                <th className="px-5 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAssigned.map((corr) => (
                <tr key={corr.id} className="hover:bg-slate-50/60 transition">
                  <td className="px-5 py-3.5 font-bold text-slate-900">
                    {corr.studentName}
                  </td>
                  <td className="px-4 py-3.5 font-mono text-slate-500">
                    {corr.registration}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="font-mono font-bold text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                      Caderno {corr.versionLetter}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-black text-emerald-700 text-sm">
                    {corr.totalScore.toFixed(1)}
                  </td>
                  <td className="px-4 py-3.5 text-slate-500">
                    {corr.notes || '—'}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                      Vinculada
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-12 text-center text-slate-400 text-xs">
          Nenhuma folha avulsa vinculada manualmente ainda.
        </div>
      )}

      {/* Clean Modal to Link Student */}
      {selectedCorrectionId && correctionToAssign && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Vincular Folha Avulsa a Aluno
                </h3>
                <p className="text-[11px] text-slate-500">
                  Caderno {correctionToAssign.versionLetter} • Nota Calculada:{' '}
                  <strong className="text-emerald-700">
                    {correctionToAssign.totalScore.toFixed(1)}
                  </strong>
                </p>
              </div>
              <button
                onClick={() => setSelectedCorrectionId(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmAssignment} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Selecionar Aluno da Turma
                </label>
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                    placeholder="Filtrar por nome ou matrícula..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none"
                  />
                </div>

                <select
                  required
                  size={5}
                  value={targetStudentId}
                  onChange={(e) => setTargetStudentId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none"
                >
                  {eligibleStudents.map((s) => (
                    <option key={s.id} value={s.id} className="py-1 px-1">
                      {s.name} ({s.registration})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Observação (opcional)
                </label>
                <input
                  type="text"
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="Ex: Prova avulsa identificada à mão"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedCorrectionId(null)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#9E0B1A] hover:bg-[#850916] text-white font-bold rounded-lg transition cursor-pointer"
                >
                  Confirmar Vínculo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
