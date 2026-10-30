'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { UserRole } from '@/lib/types';
import {
  BookOpen,
  Lock,
  Mail,
  ArrowRight,
  KeyRound,
  AlertCircle,
  Eye,
  EyeOff,
  UserPlus,
  ShieldCheck,
} from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const {
    login,
    addToast,
    authPrefillEmail,
    setAuthPrefillEmail,
    setAuthView,
  } = useApp();

  const [activeTab, setActiveTab] = useState<UserRole | 'invite_code'>('professor');
  const [email, setEmail] = useState(
    authPrefillEmail || 'ricardo.silveira@catolicasc.org.br'
  );
  const [password, setPassword] = useState('••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (authPrefillEmail) {
      setEmail(authPrefillEmail);
    }
  }, [authPrefillEmail]);

  const handleTabChange = (tab: UserRole | 'invite_code') => {
    setActiveTab(tab);
    setErrorMsg(null);
    if (tab === 'estudante') {
      setEmail('amanda.dolores@catolicasc.edu.br');
    } else if (tab === 'professor') {
      setEmail(authPrefillEmail || 'ricardo.silveira@catolicasc.org.br');
    }
  };

  const handleOpenRecovery = () => {
    if (email.trim()) {
      setAuthPrefillEmail(email.trim());
    }
    setAuthView('recovery');
  };

  const handleOpenRegister = () => {
    setAuthView('register');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Feature 1 domain validation
    if (activeTab === 'estudante') {
      if (!email.toLowerCase().endsWith('@catolicasc.edu.br')) {
        setErrorMsg('E-mail de estudante deve pertencer ao domínio @catolicasc.edu.br');
        return;
      }
      const res = login('estudante', email, password);
      if (!res.success && res.error) {
        setErrorMsg(res.error);
      }
    } else if (activeTab === 'professor') {
      if (!email.toLowerCase().endsWith('@catolicasc.org.br')) {
        setErrorMsg('E-mail de docente deve pertencer ao domínio @catolicasc.org.br');
        return;
      }
      if (password.length < 8) {
        setErrorMsg('A senha de acesso deve conter no mínimo 8 caracteres.');
        return;
      }
      const res = login('professor', email, password);
      if (!res.success && res.error) {
        setErrorMsg(res.error);
      }
    } else if (activeTab === 'invite_code') {
      if (!inviteCode.trim()) {
        setErrorMsg('Por favor, informe o código de convite da turma.');
        return;
      }
      if (!email.toLowerCase().endsWith('@catolicasc.edu.br')) {
        setErrorMsg('Para auto-matrícula, informe seu e-mail @catolicasc.edu.br.');
        return;
      }
      addToast({
        type: 'success',
        title: 'Matrícula Realizada com Sucesso!',
        message: `Você foi matriculado na turma com o código ${inviteCode.toUpperCase()}.`,
      });
      login('estudante', email);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 text-slate-100">
      {/* Decorative background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#9E0B1A]/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Institutional Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/15 text-xs font-semibold text-slate-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            Católica de Santa Catarina • SGP v1.10
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-2">
            Sistema de Geração de Provas
          </h1>
          <p className="text-xs text-slate-400">
            Acesso exclusivo para docentes da instituição.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white text-slate-900 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 border border-slate-100">
          {/* Header do Card (Acesso Docente) */}
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-red-50 text-[#9E0B1A] flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Acesso Docente</h2>
              <p className="text-[11px] text-slate-500">Entre com suas credenciais institucionais</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl flex items-center gap-2 text-xs">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Invite code mode input */}
            {activeTab === 'invite_code' && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Código de Convite da Turma (Feature 3) *
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="Ex: CAT-DIR-8492"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#9E0B1A]"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Código fornecido pelo seu professor para entrar na turma.
                </p>
              </div>
            )}

            {/* Email input with domain notice */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-slate-700">
                  E-mail Institucional *
                </label>
                <span className="text-[10px] font-mono text-slate-400">
                  {activeTab === 'professor'
                    ? '@catolicasc.org.br'
                    : '@catolicasc.edu.br'}
                </span>
              </div>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={
                    activeTab === 'professor'
                      ? 'docente@catolicasc.org.br'
                      : 'aluno@catolicasc.edu.br'
                  }
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#9E0B1A]"
                />
              </div>
            </div>

            {/* Password input */}
            {activeTab !== 'invite_code' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700">
                    Senha de Acesso *
                  </label>
                  <button
                    type="button"
                    onClick={handleOpenRecovery}
                    className="text-[11px] font-bold text-[#9E0B1A] hover:underline cursor-pointer"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#9E0B1A]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Demo Helper Pill */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] text-slate-500 space-y-1">
              <span className="font-bold text-slate-700 block">Credenciais Rápidas de Teste:</span>
              {activeTab === 'estudante' ? (
                <div>
                  👤 <strong>Aluna Amanda:</strong> <code>amanda.dolores@catolicasc.edu.br</code> (leva direto ao Portal do Aluno - Feature 11).
                </div>
              ) : activeTab === 'professor' ? (
                <div>
                  👨‍🏫 <strong>Prof. Ricardo:</strong> <code>ricardo.silveira@catolicasc.org.br</code> (acessa o painel completo do docente).
                </div>
              ) : (
                <div>
                  🔑 <strong>Código de Teste:</strong> <code>CAT-DIR-8492</code> (Turma A - Matutino).
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3 bg-[#9E0B1A] hover:bg-[#850916] text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer flex items-center justify-center gap-2"
            >
              <span>
                {activeTab === 'estudante'
                  ? 'Acessar Portal do Aluno (Feature 11)'
                  : activeTab === 'professor'
                  ? 'Entrar no Painel do Docente'
                  : 'Matricular e Entrar'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Divider + Create Account CTA */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="text-center text-xs text-slate-500">
              Novo docente na instituição?
            </div>
            <button
              type="button"
              onClick={handleOpenRegister}
              className="w-full py-2.5 bg-slate-50 hover:bg-red-50/70 text-slate-800 hover:text-[#9E0B1A] border border-slate-200 hover:border-red-200 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4 text-[#9E0B1A]" />
              <span>Criar Conta Docente</span>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Centro Universitário Católica de Santa Catarina • Conformidade LGPD</span>
        </div>
      </div>
    </div>
  );
};
