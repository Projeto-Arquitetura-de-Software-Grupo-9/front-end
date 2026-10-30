'use client';

import React, { useState, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import {
  KeyRound,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

type RecoveryStep = 'request' | 'verify' | 'success';

export const PasswordRecoveryScreen: React.FC = () => {
  const {
    authPrefillEmail,
    setAuthPrefillEmail,
    setAuthView,
    requestPasswordReset,
    resetPassword,
  } = useApp();
  const pathname = usePathname();
  const router = useRouter();

  const [step, setStep] = useState<RecoveryStep>('request');
  const [email, setEmail] = useState(
    authPrefillEmail || 'ricardo.silveira@catolicasc.org.br'
  );
  const [verificationCode, setVerificationCode] = useState('');
  const [generatedDemoCode, setGeneratedDemoCode] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const passwordChecks = useMemo(() => {
    const minLength = newPassword.length >= 8;
    const hasUpperAndLower = /[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword);
    const hasNumberOrSymbol = /[0-9!@#$%^&*(),.?":{}|<>_\-+=]/.test(newPassword);
    const score = [minLength, hasUpperAndLower, hasNumberOrSymbol].filter(Boolean).length;
    return { minLength, hasUpperAndLower, hasNumberOrSymbol, score };
  }, [newPassword]);

  const passwordsMatch =
    confirmPassword.length > 0 && newPassword === confirmPassword;

  const handleBackToLogin = () => {
    if (email.trim()) {
      setAuthPrefillEmail(email.trim());
    }
    setAuthView('login');
    if (pathname === '/recuperar-senha') {
      router.push('/provas');
    }
  };

  const handleRequestCode = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const res = requestPasswordReset(email);
    if (!res.success) {
      setErrorMsg(res.error || 'Não foi possível enviar o código de verificação.');
      return;
    }

    setGeneratedDemoCode(res.code || null);
    setStep('verify');
  };

  const handleResendCode = () => {
    setErrorMsg(null);
    const res = requestPasswordReset(email);
    if (res.success && res.code) {
      setGeneratedDemoCode(res.code);
    }
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (verificationCode.trim().length !== 6) {
      setErrorMsg('Informe o código de verificação de 6 dígitos enviado ao seu e-mail.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMsg('A nova senha deve conter pelo menos 8 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('As senhas informadas não coincidem. Verifique e tente novamente.');
      return;
    }

    const res = resetPassword(email, verificationCode, newPassword);
    if (!res.success) {
      setErrorMsg(res.error || 'Falha ao redefinir a senha.');
      return;
    }

    setStep('success');
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
            Recuperação de Senha
          </h1>
          <p className="text-xs text-slate-400">
            Redefina sua credencial institucional de acesso ao SGP.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white text-slate-900 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-5 border border-slate-100">
          {/* Card Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-red-50 text-[#9E0B1A] flex items-center justify-center">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  {step === 'request'
                    ? 'Solicitar Código'
                    : step === 'verify'
                    ? 'Validar e Nova Senha'
                    : 'Senha Redefinida'}
                </h2>
                <p className="text-[11px] text-slate-500">
                  {step === 'request'
                    ? 'Passo 1 de 2 • Identificação institucional'
                    : step === 'verify'
                    ? 'Passo 2 de 2 • Código e nova credencial'
                    : 'Concluído com sucesso'}
                </p>
              </div>
            </div>

            {step !== 'success' && (
              <button
                type="button"
                onClick={handleBackToLogin}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-[#9E0B1A] transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Voltar
              </button>
            )}
          </div>

          {/* Step Progress Indicator */}
          <div className="flex items-center gap-2">
            <div
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                step === 'request' || step === 'verify' || step === 'success'
                  ? 'bg-[#9E0B1A]'
                  : 'bg-slate-200'
              }`}
            />
            <div
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                step === 'verify' || step === 'success'
                  ? 'bg-[#9E0B1A]'
                  : 'bg-slate-200'
              }`}
            />
            <div
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                step === 'success' ? 'bg-emerald-500' : 'bg-slate-200'
              }`}
            />
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: Request Code */}
          {step === 'request' && (
            <form onSubmit={handleRequestCode} className="space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Informe seu e-mail institucional cadastrado. Enviaremos um código
                de segurança de <strong>6 dígitos</strong> para validar a troca de
                sua senha.
              </p>

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
                    placeholder="docente@catolicasc.org.br"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#9E0B1A]"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#9E0B1A] hover:bg-[#850916] text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Enviar Código de Verificação</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* STEP 2: Verify Code & Set New Password */}
          {step === 'verify' && (
            <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
              {/* Demo Helper Pill with generated code */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">
                    📩 Código enviado para:
                  </span>
                  <button
                    type="button"
                    onClick={() => setStep('request')}
                    className="text-[10px] font-bold text-[#9E0B1A] hover:underline cursor-pointer"
                  >
                    Alterar e-mail
                  </button>
                </div>
                <div className="font-mono text-slate-800 truncate">{email}</div>
                {generatedDemoCode && (
                  <div className="pt-1.5 border-t border-slate-200/80 flex items-center justify-between">
                    <span>
                      🔑 <strong>Código de Teste:</strong>{' '}
                      <code className="font-mono font-bold text-[#9E0B1A] bg-red-50 px-1.5 py-0.5 rounded">
                        {generatedDemoCode}
                      </code>
                    </span>
                    <button
                      type="button"
                      onClick={() => setVerificationCode(generatedDemoCode)}
                      className="text-[10px] font-bold text-emerald-700 hover:underline cursor-pointer"
                    >
                      Preencher código
                    </button>
                  </div>
                )}
              </div>

              {/* 6-digit Verification Code */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700">
                    Código de Verificação (6 dígitos) *
                  </label>
                  <button
                    type="button"
                    onClick={handleResendCode}
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-[#9E0B1A] cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Reenviar código
                  </button>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) =>
                      setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                    }
                    placeholder="Ex: 849201"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold tracking-widest text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#9E0B1A]"
                  />
                </div>
              </div>

              {/* New Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700">
                    Nova Senha de Acesso *
                  </label>
                  <span className="text-[10px] text-slate-400">mín. 8 caracteres</span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Digite sua nova senha"
                    className="w-full pl-9 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#9E0B1A]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {newPassword.length > 0 && (
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
                  </div>
                )}
              </div>

              {/* Confirm New Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700">
                    Confirmar Nova Senha *
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
                    placeholder="Repita a nova senha"
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

              <button
                type="submit"
                className="w-full py-3 bg-[#9E0B1A] hover:bg-[#850916] text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Redefinir Senha de Acesso</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* STEP 3: Success */}
          {step === 'success' && (
            <div className="space-y-5 text-center py-2">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-base font-black text-slate-900">
                  Senha Atualizada com Sucesso!
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  A credencial de acesso para{' '}
                  <strong className="text-slate-800 font-mono">{email}</strong> foi
                  redefinida. Você já pode acessar o Painel Docente.
                </p>
              </div>

              <button
                type="button"
                onClick={handleBackToLogin}
                className="w-full py-3 bg-[#9E0B1A] hover:bg-[#850916] text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Voltar para o Login</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Bottom Link */}
          {step !== 'success' && (
            <div className="pt-3 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-500">
                Lembrou sua senha?{' '}
                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className="font-bold text-[#9E0B1A] hover:underline cursor-pointer"
                >
                  Voltar ao Login
                </button>
              </p>
            </div>
          )}
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
