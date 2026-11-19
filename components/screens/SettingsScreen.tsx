'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { api } from '@/lib/api';
import {
  School,
  QrCode,
  Save,
  ShieldCheck,
  AlertTriangle,
  UserX,
  Lock,
  RotateCcw,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';

export const SettingsScreen: React.FC = () => {
  const { currentUser, anonymizeUser, changePassword, addToast } = useApp();

  const [institutionName, setInstitutionName] = useState('CATÓLICA DE SANTA CATARINA');
  const [department, setDepartment] = useState(
    'Centro Universitário Católica de Santa Catarina'
  );
  const [professorName, setProfessorName] = useState(currentUser.fullName);
  const [professorEmail, setProfessorEmail] = useState(currentUser.email);
  const [passingGrade, setPassingGrade] = useState('7.0');
  const [omrSensitivity, setOmrSensitivity] = useState('Alta (Threshold 0.65)');
  const [autoRotate, setAutoRotate] = useState(true);

  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Authenticated password change state
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmNewPwd, setConfirmNewPwd] = useState('');
  const [showPwdFields, setShowPwdFields] = useState(false);
  const [isChangingPwd, setIsChangingPwd] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);

  // LGPD anonymization modal
  const [isAnonymizeModalOpen, setIsAnonymizeModalOpen] = useState(false);
  const [isAnonymizing, setIsAnonymizing] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadSettings() {
      setIsLoadingSettings(true);
      try {
        const remote = await api.getSettings(currentUser.id || undefined);
        if (!active || !remote) return;
        if (remote.institutionName) setInstitutionName(remote.institutionName);
        if (remote.department) setDepartment(remote.department);
        if (remote.professorName) setProfessorName(remote.professorName);
        if (remote.professorEmail) setProfessorEmail(remote.professorEmail);
        if (remote.passingGrade !== undefined) setPassingGrade(String(remote.passingGrade));
        if (remote.omrSensitivity) setOmrSensitivity(remote.omrSensitivity);
        if (remote.autoRotate !== undefined) setAutoRotate(Boolean(remote.autoRotate));
      } catch {
        // Keep current authenticated user defaults if settings API is unavailable
        if (active) {
          setProfessorName(currentUser.fullName);
          setProfessorEmail(currentUser.email);
        }
      } finally {
        if (active) setIsLoadingSettings(false);
      }
    }
    loadSettings();
    return () => {
      active = false;
    };
  }, [currentUser.id, currentUser.fullName, currentUser.email]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      const parsedGrade = Number(passingGrade.replace(',', '.'));
      const validGrade = Number.isFinite(parsedGrade)
        ? Math.max(0, Math.min(10, parsedGrade))
        : 7.0;

      await api.updateSettings(
        {
          institutionName,
          department,
          professorName,
          professorEmail,
          passingGrade: validGrade,
          omrSensitivity,
          autoRotate,
        },
        currentUser.id || undefined
      );

      addToast({
        type: 'success',
        title: 'Configurações Salvas!',
        message: 'As preferências institucionais foram persistidas no banco de dados.',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Erro ao Salvar Configurações',
        message: err?.message || 'Não foi possível salvar no servidor.',
      });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleResetDefaults = async () => {
    setIsSavingSettings(true);
    try {
      const reset = await api.resetSettings(currentUser.id || undefined);
      if (reset) {
        if (reset.institutionName) setInstitutionName(reset.institutionName);
        if (reset.department) setDepartment(reset.department);
        if (reset.passingGrade !== undefined) setPassingGrade(String(reset.passingGrade));
        if (reset.omrSensitivity) setOmrSensitivity(reset.omrSensitivity);
        if (reset.autoRotate !== undefined) setAutoRotate(Boolean(reset.autoRotate));
      }
      addToast({
        type: 'info',
        title: 'Padrões Restaurados',
        message: 'As configurações voltaram aos parâmetros institucionais padrão.',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Falha ao Restaurar',
        message: err?.message || 'Erro ao restaurar padrões no servidor.',
      });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null);
    if (newPwd.length < 8) {
      setPwdError('A nova senha deve possuir no mínimo 8 caracteres.');
      return;
    }
    if (newPwd !== confirmNewPwd) {
      setPwdError('A confirmação de senha não coincide com a nova senha.');
      return;
    }

    setIsChangingPwd(true);
    try {
      const res = await changePassword(currentPwd, newPwd);
      if (!res.success) {
        setPwdError(res.error || 'Não foi possível alterar a senha.');
        return;
      }
      setCurrentPwd('');
      setNewPwd('');
      setConfirmNewPwd('');
    } finally {
      setIsChangingPwd(false);
    }
  };

  const handleConfirmAnonymize = async () => {
    setIsAnonymizing(true);
    try {
      await anonymizeUser();
      setIsAnonymizeModalOpen(false);
    } finally {
      setIsAnonymizing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Configurações do Sistema</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Gerencie dados institucionais, segurança da conta, parâmetros de leitura OMR e privacidade
          LGPD.
        </p>
      </div>

      {isLoadingSettings ? (
        <div className="bg-white p-10 rounded-2xl border border-slate-200 flex items-center justify-center gap-2 text-xs text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin text-[#9E0B1A]" />
          <span>Carregando configurações do banco de dados...</span>
        </div>
      ) : (
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
                Parâmetros de Leitura Óptica (OMR)
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
                    Auto-alinhar e rotacionar folhas com base no QR Code e marcadores dos 4 cantos
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleResetDefaults}
              disabled={isSavingSettings}
              className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Restaurar Padrões
            </button>

            <button
              type="submit"
              disabled={isSavingSettings}
              className="inline-flex items-center gap-2 bg-[#9E0B1A] hover:bg-[#850916] disabled:opacity-50 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-sm transition cursor-pointer"
            >
              {isSavingSettings ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{isSavingSettings ? 'Salvando...' : 'Salvar Configurações'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Section 3: Alterar Senha (Autenticado) */}
      <form
        onSubmit={handlePasswordSubmit}
        className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <Lock className="w-5 h-5 text-slate-700" />
            <h2 className="text-sm font-bold text-slate-900">Segurança e Senha de Acesso</h2>
          </div>
          <button
            type="button"
            onClick={() => setShowPwdFields((v) => !v)}
            className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 cursor-pointer"
          >
            {showPwdFields ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showPwdFields ? 'Ocultar' : 'Mostrar senhas'}
          </button>
        </div>

        {pwdError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs">
            {pwdError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Senha Atual</label>
            <input
              type={showPwdFields ? 'text' : 'password'}
              required
              value={currentPwd}
              onChange={(e) => setCurrentPwd(e.target.value)}
              placeholder="Sua senha atual"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#9E0B1A]"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Nova Senha (mín. 8)</label>
            <input
              type={showPwdFields ? 'text' : 'password'}
              required
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              placeholder="Nova senha"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#9E0B1A]"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Confirmar Nova Senha</label>
            <input
              type={showPwdFields ? 'text' : 'password'}
              required
              value={confirmNewPwd}
              onChange={(e) => setConfirmNewPwd(e.target.value)}
              placeholder="Repita a nova senha"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#9E0B1A]"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isChangingPwd}
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition cursor-pointer"
          >
            {isChangingPwd ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Lock className="w-3.5 h-3.5" />
            )}
            <span>{isChangingPwd ? 'Atualizando...' : 'Atualizar Senha'}</span>
          </button>
        </div>
      </form>

      {/* Section 4: Privacidade & LGPD (Feature 1.1) */}
      <div className="bg-white p-6 rounded-2xl border border-rose-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-rose-100 pb-3">
          <ShieldCheck className="w-5 h-5 text-rose-600" />
          <h2 className="text-sm font-bold text-slate-900">
            Privacidade e Anonimização de Conta (LGPD)
          </h2>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <p className="text-slate-600 leading-relaxed max-w-2xl">
            Conforme a LGPD e o Art. 16 da Lei 13.709/2018, você pode solicitar a anonimização
            irreversível dos seus dados pessoais (nome e e-mail). Provas aplicadas, cadernos e
            histórico acadêmico de notas dos estudantes são preservados por obrigação institucional.
          </p>
          <button
            type="button"
            onClick={() => setIsAnonymizeModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold shrink-0 transition cursor-pointer"
          >
            <UserX className="w-4 h-4" />
            <span>Anonimizar Minha Conta</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {isAnonymizeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Confirmar Anonimização Irreversível
                </h3>
                <p className="text-xs text-slate-500">Esta ação bloqueará permanentemente seu login.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Seu nome será substituído por <strong>&quot;Usuário Removido&quot;</strong> e seu
              e-mail por um identificador anônimo. Sua sessão será encerrada imediatamente.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAnonymizeModalOpen(false)}
                disabled={isAnonymizing}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmAnonymize}
                disabled={isAnonymizing}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {isAnonymizing ? 'Anonimizando...' : 'Confirmar Anonimização'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
