'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import {
  BookOpen,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  UserPlus,
  ShieldCheck,
  Loader2,
} from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const {
    login,
    authPrefillEmail,
    setAuthPrefillEmail,
    setAuthView,
    isBackendOnline,
  } = useApp();

  const [email, setEmail] = useState(authPrefillEmail || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (authPrefillEmail) {
      setEmail(authPrefillEmail);
    }
  }, [authPrefillEmail]);

  const handleOpenRecovery = () => {
    if (email.trim()) {
      setAuthPrefillEmail(email.trim());
    }
    setAuthView('recovery');
  };

  const handleOpenRegister = () => {
    setAuthView('register');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.endsWith('@catolicasc.org.br')) {
      setErrorMsg('E-mail de docente deve pertencer ao domínio institucional @catolicasc.org.br.');
      return;
    }
    if (password.length < 8) {
      setErrorMsg('A senha de acesso deve conter no mínimo 8 caracteres.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await login('professor', cleanEmail, password);
      if (!res.success && res.error) {
        setErrorMsg(res.error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 text-slate-100">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#9E0B1A]/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Institutional Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/15 text-xs font-semibold text-slate-200">
            <span
              className={`w-2 h-2 rounded-full ${
                isBackendOnline ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            Católica de Santa Catarina • SGP v1.10
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-2">
            Sistema de Geração de Provas
          </h1>
          <p className="text-xs text-slate-400">
            Acesso autenticado exclusivo para docentes da instituição.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white text-slate-900 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 border border-slate-100">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-red-50 text-[#9E0B1A] flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Acesso Docente</h2>
              <p className="text-[11px] text-slate-500">
                Autenticação institucional com credenciais cadastradas
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl flex items-start gap-2 text-xs">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Email input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-slate-700">
                  E-mail Institucional *
                </label>
                <span className="text-[10px] font-mono text-slate-400">
                  @catolicasc.org.br
                </span>
              </div>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  disabled={isSubmitting}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome.sobrenome@catolicasc.org.br"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#9E0B1A] disabled:opacity-60"
                />
              </div>
            </div>

            {/* Password input */}
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
                  autoComplete="current-password"
                  disabled={isSubmitting}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  className="w-full pl-9 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#9E0B1A] disabled:opacity-60"
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

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-[#9E0B1A] hover:bg-[#850916] disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Autenticando...</span>
                </>
              ) : (
                <>
                  <span>Entrar no Painel do Docente</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider + Create Account CTA */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="text-center text-xs text-slate-500">
              Primeiro acesso ao sistema?
            </div>
            <button
              type="button"
              onClick={handleOpenRegister}
              disabled={isSubmitting}
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
