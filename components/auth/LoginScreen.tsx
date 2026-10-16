'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { UserRole } from '@/lib/types';
import {
  GraduationCap,
  BookOpen,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  KeyRound,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { CorregeLogo } from '@/components/common/CorregeLogo';

export const LoginScreen: React.FC = () => {
  const { login, addToast } = useApp();

  const [activeTab, setActiveTab] = useState<UserRole | 'invite_code'>('estudante');
  const [email, setEmail] = useState('amanda.dolores@catolicasc.edu.br');
  const [password, setPassword] = useState('••••••••');
  const [inviteCode, setInviteCode] = useState('');
  const [studentName, setStudentName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleTabChange = (tab: UserRole | 'invite_code') => {
    setActiveTab(tab);
    setErrorMsg(null);
    if (tab === 'estudante') {
      setEmail('amanda.dolores@catolicasc.edu.br');
    } else if (tab === 'professor') {
      setEmail('ricardo.silveira@catolicasc.org.br');
    }
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
      login('estudante', email);
    } else if (activeTab === 'professor') {
      if (!email.toLowerCase().endsWith('@catolicasc.org.br')) {
        setErrorMsg('E-mail de docente deve pertencer ao domínio @catolicasc.org.br');
        return;
      }
      login('professor', email);
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
            Plataforma acadêmica unificada para professores e estudantes.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white text-slate-900 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 border border-slate-100">
          {/* Tabs Selector (Feature 1: Separado por tipo de usuário) */}
          <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1.5 rounded-2xl text-xs font-bold">
            <button
              type="button"
              onClick={() => handleTabChange('estudante')}
              className={`py-2 px-2 rounded-xl transition cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                activeTab === 'estudante'
                  ? 'bg-white text-[#9E0B1A] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Sou Aluno</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('professor')}
              className={`py-2 px-2 rounded-xl transition cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                activeTab === 'professor'
                  ? 'bg-white text-[#9E0B1A] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Sou Professor</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('invite_code')}
              className={`py-2 px-2 rounded-xl transition cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                activeTab === 'invite_code'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Auto-matrícula via código de turma"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Código</span>
            </button>
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
                  <span className="text-[10px] text-slate-400">mín. 8 caracteres</span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#9E0B1A]"
                  />
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
        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-slate-400">
          Centro Universitário Católica de Santa Catarina • Conformidade com LGPD
        </div>
      </div>
    </div>
  );
};
