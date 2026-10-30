'use client';

import React, { useState, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import {
  UserPlus,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  GraduationCap,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';

const COURSES_LIST = [
  'Direito',
  'Engenharia de Software',
  'Ciência da Computação',
  'Administração',
  'Ciências Contábeis',
  'Psicologia',
  'Arquitetura e Urbanismo',
  'Engenharia Civil',
  'Engenharia Mecânica',
  'Medicina',
];

export const RegisterScreen: React.FC = () => {
  const { registerAccount, setAuthView, setAuthPrefillEmail } = useApp();
  const pathname = usePathname();
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('Direito');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const passwordChecks = useMemo(() => {
    const minLength = password.length >= 8;
    const hasUpperAndLower = /[a-z]/.test(password) && /[A-Z]/.test(password);
    const hasNumberOrSymbol = /[0-9!@#$%^&*(),.?":{}|<>_\-+=]/.test(password);
    const score = [minLength, hasUpperAndLower, hasNumberOrSymbol].filter(Boolean).length;
    return { minLength, hasUpperAndLower, hasNumberOrSymbol, score };
  }, [password]);

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  const handleBackToLogin = () => {
    if (email.trim()) {
      setAuthPrefillEmail(email.trim());
    }
    setAuthView('login');
    if (pathname === '/cadastro') {
      router.push('/provas');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (fullName.trim().length < 3 || !fullName.trim().includes(' ')) {
      setErrorMsg('Por favor, informe seu nome e sobrenome completos.');
      return;
    }

    if (!email.trim().toLowerCase().endsWith('@catolicasc.org.br')) {
      setErrorMsg('O e-mail docente deve pertencer ao domínio institucional @catolicasc.org.br.');
      return;
    }

    if (password.length < 8) {
      setErrorMsg('A senha de acesso deve conter no mínimo 8 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('As senhas informadas não coincidem. Verifique e tente novamente.');
      return;
    }

    if (!acceptedTerms) {
      setErrorMsg('Você precisa aceitar os Termos de Uso e Política de Privacidade (LGPD).');
      return;
    }

    const res = registerAccount({
      fullName,
      email,
      password,
      department: `Curso de ${department}`,
      role: 'professor',
      autoLogin: true,
    });

    if (!res.success && res.error) {
      setErrorMsg(res.error);
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
            Cadastro Institucional
          </h1>
          <p className="text-xs text-slate-400">
            Crie sua conta docente para gerar e corrigir avaliações no SGP.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white text-slate-900 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-5 border border-slate-100">
          {/* Card Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-red-50 text-[#9E0B1A] flex items-center justify-center">
                <UserPlus className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Criar Conta Docente</h2>
                <p className="text-[11px] text-slate-500">Preencha seus dados institucionais</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleBackToLogin}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-[#9E0B1A] transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Voltar
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

            {/* Full Name */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Nome Completo do Docente *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ex: Prof. Dr. Carlos Eduardo Mendes"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#9E0B1A]"
                />
              </div>
            </div>

            {/* Institutional Email */}
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome.sobrenome@catolicasc.org.br"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#9E0B1A]"
                />
              </div>
            </div>

            {/* Course / Department */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Curso / Departamento Principal
              </label>
              <div className="relative">
                <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#9E0B1A]"
                >
                  {COURSES_LIST.map((course) => (
                    <option key={course} value={course}>
                      {course}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Password */}
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
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Crie uma senha segura"
                  className="w-full pl-9 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#9E0B1A]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Strength Meter */}
              {password.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  <div className="flex gap-1 h-1">
                    {[1, 2, 3].map((lvl) => (
                      <div
                        key={lvl}
                        className={`flex-1 rounded-full transition-colors ${
                          passwordChecks.score >= lvl
                            ? passwordChecks.score === 1
                              ? 'bg-red-500'
                              : passwordChecks.score === 2
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                            : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-[10px] text-slate-500">
                    <span className={passwordChecks.minLength ? 'text-emerald-700 font-semibold' : ''}>
                      ✓ 8+ caracteres
                    </span>
                    <span className={passwordChecks.hasUpperAndLower ? 'text-emerald-700 font-semibold' : ''}>
                      ✓ Maiúsc./minúsc.
                    </span>
                    <span className={passwordChecks.hasNumberOrSymbol ? 'text-emerald-700 font-semibold' : ''}>
                      ✓ Número/símbolo
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-slate-700">
                  Confirmar Senha *
                </label>
                {confirmPassword.length > 0 && (
                  <span
                    className={`text-[10px] font-bold flex items-center gap-1 ${
                      passwordsMatch ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {passwordsMatch ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" /> Senhas coincidem
                      </>
                    ) : (
                      'Não coincidem'
                    )}
                  </span>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha criada"
                  className="w-full pl-9 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#9E0B1A]"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* LGPD Consent Checkbox */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-[#9E0B1A] focus:ring-[#9E0B1A] border-slate-300"
                />
                <span className="text-[11px] text-slate-600 leading-relaxed">
                  Concordo com os <strong>Termos de Uso Institucional</strong> e a{' '}
                  <strong>Política de Privacidade (LGPD)</strong> do Centro Universitário
                  Católica de Santa Catarina.
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3 bg-[#9E0B1A] hover:bg-[#850916] text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Criar Conta e Acessar Painel</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Footer link to Login */}
          <div className="pt-3 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Já possui uma conta institucional?{' '}
              <button
                type="button"
                onClick={handleBackToLogin}
                className="font-bold text-[#9E0B1A] hover:underline cursor-pointer"
              >
                Fazer Login
              </button>
            </p>
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
