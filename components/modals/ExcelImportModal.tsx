'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { api } from '@/lib/api';
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  FileDown,
  Sparkles,
  Loader2,
} from 'lucide-react';

export const ExcelImportModal: React.FC = () => {
  const { isExcelImportModalOpen, setIsExcelImportModalOpen, addToast } =
    useApp();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isExcelImportModalOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setErrorMessage(null);
      setSelectedFile(file);
      setFileName(file.name);
    }
  };

  const handleConfirmImport = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setErrorMessage(null);

    try {
      const result = await api.importStudentsExcelFile(selectedFile);
      addToast({
        type: 'success',
        title: 'Importação Concluída!',
        message: `${result.importedCount} aluno(s) cadastrado(s) com sucesso. ${
          result.skippedCount > 0 ? `(${result.skippedCount} linhas ignoradas/duplicadas)` : ''
        }`,
      });

      // Recarrega lista completa de alunos da aplicação
      window.location.reload();
      setIsExcelImportModalOpen(false);
      setSelectedFile(null);
      setFileName(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao importar arquivo Excel.');
      addToast({
        type: 'error',
        title: 'Falha na Importação',
        message: err.message || 'Erro ao processar planilha.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Importação Oficial de Alunos por Planilha
              </h2>
              <p className="text-xs text-slate-500">
                Envie sua planilha Excel (.xlsx) para cadastrar turmas e alunos no sistema.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setIsExcelImportModalOpen(false);
              setSelectedFile(null);
              setFileName(null);
              setErrorMessage(null);
            }}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dropzone Area */}
        <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:border-[#9E0B1A] hover:bg-red-50/20 transition group relative cursor-pointer">
          <input
            type="file"
            accept=".xlsx"
            onChange={handleFileUpload}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
          <Upload className="w-8 h-8 text-slate-400 group-hover:text-[#9E0B1A] mx-auto mb-2 transition" />
          <p className="text-xs font-bold text-slate-800">
            Arraste seu arquivo Excel (.xlsx) ou clique para procurar
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Colunas reconhecidas: Nome Completo, Matrícula, Curso, Email, Turma
          </p>

          <div className="mt-3 flex items-center justify-center gap-2">
            <a
              href={api.getStudentImportTemplateUrl()}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] rounded-lg transition"
            >
              <FileDown className="w-3.5 h-3.5 text-slate-500" /> Baixar Modelo Oficial (.xlsx)
            </a>
          </div>
        </div>

        {/* File Selected Status */}
        {fileName && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-800">{fileName}</span>
            </div>
            <span className="text-[11px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded">
              Arquivo Pronto para Envio
            </span>
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => {
              setIsExcelImportModalOpen(false);
              setSelectedFile(null);
              setFileName(null);
              setErrorMessage(null);
            }}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={!selectedFile || isUploading}
            onClick={handleConfirmImport}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#9E0B1A] hover:bg-[#850916] disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Processando no Servidor...
              </>
            ) : (
              'Confirmar e Importar Planilha'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
