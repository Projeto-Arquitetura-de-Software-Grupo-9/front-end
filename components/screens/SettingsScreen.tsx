'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  School,
  QrCode,
  Save,
  ShieldCheck,
  AlertTriangle,
  UserX,
  Lock,
  CheckCircle2,
} from 'lucide-react';

export const SettingsScreen: React.FC = () => {
  const { currentUser, anonymizeUser, addToast } = useApp();

  const [institutionName, setInstitutionName] = useState('CATÓLICA DE SANTA CATARINA');
  const [department, setDepartment] = useState('Curso de Direito | Departamento de Ciências Jurídicas');
  const [professorName, setProfessorName] = useState(currentUser.fullName);
  const [professorEmail, setProfessorEmail] = useState(currentUser.email);
  const [passingGrade, setPassingGrade] = useState('7.0');
  const [omrSensitivity, setOmrSensitivity] = useState('Alta (Threshold 0.65)');
  const [autoRotate, setAutoRotate] = useState(true);

  const [isAnonymizeModalOpen, setIsAnonymizeModalOpen] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    addToast({
      type: 'success',
      title: 'Configurações Salvas!',
      message: 'As preferências institucionais da Católica SC foram atualizadas.',
    });
  };

  const handleConfirmAnonymize = () => {
    anonymizeUser();
    setIsAnonymizeModalOpen(false);
  };

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-200">
      <div>
        <div className="flex items-center gap-2 text-xs font-bold text-[#9E0B1A] uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4" />
          <span>Configurações & Conformidade LGPD (Católica SC)</span>
        </div>
        <h1 className="text-2xl font-black text-slate-900 mt-1">
          Configurações do Sistema
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Gerencie dados institucionais, preferências de correção e direitos de privacidade sob a LGPD.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Dados Institucionais */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <School className="w-5 h-5 text-[#9E0B1A]" />
            <h2 className="text-sm font-bold text-slate-900">
              Identificação Institucional Católica SC
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
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#9E0B1A]"
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
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#9E0B1A]"
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
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#9E0B1A]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                E-mail Institucional (@catolicasc.org.br)
              </label>
              <input
                type="email"
                value={professorEmail}
                onChange={(e) => setProfessorEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#9E0B1A]"
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
                Sensibilidade da Leitura OMR
              </label>
              <select
                value={omrSensitivity}
                onChange={(e) => setOmrSensitivity(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#9E0B1A]"
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
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#9E0B1A]"
              />
            </div>

            <div className="md:col-span-2 pt-2">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoRotate}
                  onChange={(e) => setAutoRotate(e.target.checked)}
                  className="w-4 h-4 rounded text-[#9E0B1A] focus:ring-[#9E0B1A] border-slate-300"
                />
                <span className="text-xs font-semibold text-slate-800">
                  Auto-alinhar e rotacionar folhas com base nos marcadores dos 4 cantos
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-2 bg-[#9E0B1A] hover:bg-[#850916] text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-sm transition cursor-pointer"
          >
            <Save className="w-4 h-4" /> Salvar Configurações
          </button>
        </div>
      </form>

      {/* Section 3: Feature 1.1 - Anonimização de Conta (LGPD) */}
      <div className="bg-red-50/50 p-6 rounded-2xl border border-red-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-red-200 pb-3">
          <UserX className="w-5 h-5 text-red-700" />
          <h2 className="text-sm font-bold text-red-950">
            Feature 1.1 – Privacidade e Anonimização de Conta (LGPD)
          </h2>
        </div>

        <div className="space-y-3 text-xs text-red-900">
          <p>
            O usuário pode solicitar a anonimização da própria conta a qualquer momento via <code>POST /me/anonymize</code>.
          </p>
          <div className="bg-white/80 p-3.5 rounded-xl border border-red-200 space-y-1.5 text-[11px] text-slate-700">
            <div className="font-bold text-slate-900">Como funciona a anonimização:</div>
            <ul className="list-disc pl-4 space-y-1 text-slate-600">
              <li>Seu nome completo e e-mail serão substituídos por placeholders irreversíveis (ex: <em>"Usuário Removido"</em> e <em>"anon-{currentUser.id}@removido.local"</em>).</li>
              <li>A senha e os tokens de acesso são invalidados imediatamente.</li>
              <li><strong>Não é exclusão real:</strong> Correções, notas lançadas e histórico de turmas continuam preservados para não quebrar relatórios institucionais das turmas.</li>
              <li>A anonimização é <strong>permanente e irreversível</strong>.</li>
            </ul>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <span className="font-bold text-slate-900">Usuário Atual: </span>
              <span className="font-mono text-slate-600">{currentUser.fullName} ({currentUser.email})</span>
              {currentUser.anonymizedAt && (
                <span className="ml-2 text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                  Conta Anonimizada em {new Date(currentUser.anonymizedAt).toLocaleDateString('pt-BR')}
                </span>
              )}
            </div>

            {!currentUser.anonymizedAt && (
              <button
                type="button"
                onClick={() => setIsAnonymizeModalOpen(true)}
                className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-xs"
              >
                Solicitar Anonimização
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {isAnonymizeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-700" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">
                Confirmar Anonimização da Conta?
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Você tem certeza de que deseja anonimizar sua conta? Seus dados pessoais serão desassociados permanentemente do sistema conforme a LGPD. Suas correções e relatórios permanecerão íntegros.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAnonymizeModalOpen(false)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmAnonymize}
                className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white font-bold text-xs rounded-xl"
              >
                Sim, Anonimizar Minha Conta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
