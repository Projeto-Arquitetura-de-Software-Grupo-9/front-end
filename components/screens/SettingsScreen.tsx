'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Building2,
  Sliders,
  Sparkles,
  ShieldCheck,
  Save,
  CheckCircle2,
  QrCode,
  School,
} from 'lucide-react';

export const SettingsScreen: React.FC = () => {
  const { addToast } = useApp();

  const [institutionName, setInstitutionName] = useState('UNIVERSIDADE FEDERAL DO RIO DE JANEIRO');
  const [department, setDepartment] = useState('Escola de Engenharia | Departamento de Matemática Aplicada');
  const [professorName, setProfessorName] = useState('Prof. Dr. Ricardo Silva');
  const [professorEmail, setProfessorEmail] = useState('ricardo.silva@poli.ufrj.br');
  const [passingGrade, setPassingGrade] = useState('7.0');
  const [omrSensitivity, setOmrSensitivity] = useState('Alta (Threshold 0.65)');
  const [autoRotate, setAutoRotate] = useState(true);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    addToast({
      type: 'success',
      title: 'Configurações Salvas!',
      message: 'As preferências institucionais e parâmetros OMR foram atualizados.',
    });
  };

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Configurações do Sistema
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Gerencie os dados institucionais, cabeçalhos padrão e regras de leitura óptica.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Dados Institucionais */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <School className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Identificação Institucional & Cabeçalho Padrão
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">
                Nome da Universidade / Instituição
              </label>
              <input
                type="text"
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">
                Faculdade / Departamento
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Nome do Docente Titular
              </label>
              <input
                type="text"
                value={professorName}
                onChange={(e) => setProfessorName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                E-mail Institucional
              </label>
              <input
                type="email"
                value={professorEmail}
                onChange={(e) => setProfessorEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Parâmetros OMR e Critérios */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <QrCode className="w-5 h-5 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Parâmetros de Leitura OMR & IA
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Sensibilidade do Scanner OMR
              </label>
              <select
                value={omrSensitivity}
                onChange={(e) => setOmrSensitivity(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option>Alta (Threshold 0.65)</option>
                <option>Média (Threshold 0.50)</option>
                <option>Rigorosa (Threshold 0.80)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Nota Mínima para Aprovação
              </label>
              <input
                type="text"
                value={passingGrade}
                onChange={(e) => setPassingGrade(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="md:col-span-2 pt-2">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoRotate}
                  onChange={(e) => setAutoRotate(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                />
                <span className="text-xs font-semibold text-slate-800">
                  Auto-alinhar e rotacionar folhas escaneadas com base nos 4 marcadores angulares
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-sm transition cursor-pointer"
          >
            <Save className="w-4 h-4" /> Salvar Configurações
          </button>
        </div>
      </form>
    </div>
  );
};
