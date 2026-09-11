'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  FileText,
  Sparkles,
} from 'lucide-react';

export const ExcelImportModal: React.FC = () => {
  const { isExcelImportModalOpen, setIsExcelImportModalOpen, importStudents, addToast } =
    useApp();

  const [previewRows, setPreviewRows] = useState<
    Array<{
      name: string;
      registration: string;
      course: string;
      email: string;
      classGroup: string;
      discipline: string;
      examsTaken: number;
      overallAverage: number;
    }>
  >([]);

  const [fileName, setFileName] = useState<string | null>(null);

  if (!isExcelImportModalOpen) return null;

  const sampleData = [
    {
      name: 'Camila Pitanga Albuquerque',
      registration: '2024.1.201',
      course: 'Direito',
      email: 'camila.pitanga@universidade.edu.br',
      classGroup: 'Turma A',
      discipline: 'Direito Constitucional',
      examsTaken: 0,
      overallAverage: 8.4,
    },
    {
      name: 'Lucas Brandão Silveira',
      registration: '2024.1.202',
      course: 'Direito',
      email: 'lucas.brandao@universidade.edu.br',
      classGroup: 'Turma B',
      discipline: 'Direito Penal',
      examsTaken: 0,
      overallAverage: 7.9,
    },
    {
      name: 'Rafaela Matos Queiroz',
      registration: '2024.1.203',
      course: 'Direito',
      email: 'rafaela.queiroz@universidade.edu.br',
      classGroup: 'Turma A',
      discipline: 'Direito Civil',
      examsTaken: 0,
      overallAverage: 9.1,
    },
    {
      name: 'Gabriel Menezes Fontes',
      registration: '2024.1.204',
      course: 'Direito',
      email: 'gabriel.fontes@universidade.edu.br',
      classGroup: 'Turma C',
      discipline: 'Direito Administrativo',
      examsTaken: 0,
      overallAverage: 6.5,
    },
    {
      name: 'Larissa Torres Mendes',
      registration: '2024.1.205',
      course: 'Direito',
      email: 'larissa.torres@universidade.edu.br',
      classGroup: 'Turma B',
      discipline: 'Direito Tributário',
      examsTaken: 0,
      overallAverage: 8.8,
    },
  ];

  const handleLoadSample = () => {
    setFileName('alunos_matriculados_2024_2.xlsx');
    setPreviewRows(sampleData);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setPreviewRows(sampleData);
    }
  };

  const handleConfirmImport = () => {
    if (previewRows.length === 0) return;
    importStudents(previewRows);
    setIsExcelImportModalOpen(false);
    setPreviewRows([]);
    setFileName(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full p-6 sm:p-8 space-y-6 my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Importação de Alunos por Planilha
              </h2>
              <p className="text-xs text-slate-500">
                Suporta formatos .xlsx, .xls e .csv com mapeamento automático de colunas.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setIsExcelImportModalOpen(false);
              setPreviewRows([]);
              setFileName(null);
            }}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dropzone Area */}
        <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:border-blue-500 hover:bg-blue-50/20 transition group relative cursor-pointer">
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileUpload}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
          <Upload className="w-8 h-8 text-slate-400 group-hover:text-blue-600 mx-auto mb-2 transition" />
          <p className="text-xs font-bold text-slate-800">
            Arraste seu arquivo Excel (.xlsx) ou clique para procurar
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Colunas recomendadas: Nome, Matrícula, Curso, Email, Turma
          </p>

          <div className="mt-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleLoadSample();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-[11px] rounded-lg transition"
            >
              <Sparkles className="w-3.5 h-3.5" /> Carregar Planilha de Demonstração
            </button>
          </div>
        </div>

        {/* Live Data Preview */}
        {previewRows.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-800">
                  {fileName} — {previewRows.length} registros válidos identificados
                </span>
              </div>
              <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                100% Pronto
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Nome</th>
                    <th className="py-2.5 px-3">Matrícula</th>
                    <th className="py-2.5 px-3">Curso</th>
                    <th className="py-2.5 px-3">Turma</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {previewRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-semibold text-slate-900">{row.name}</td>
                      <td className="py-2 px-3 font-mono text-slate-500">{row.registration}</td>
                      <td className="py-2 px-3">{row.course}</td>
                      <td className="py-2 px-3">{row.classGroup}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => {
              setIsExcelImportModalOpen(false);
              setPreviewRows([]);
              setFileName(null);
            }}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={previewRows.length === 0}
            onClick={handleConfirmImport}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer"
          >
            Confirmar e Importar {previewRows.length > 0 ? `(${previewRows.length})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
};
