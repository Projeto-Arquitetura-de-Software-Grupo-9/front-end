import { PasswordRecoveryScreen } from '@/components/auth/PasswordRecoveryScreen';

export const metadata = {
  title: 'Recuperação de Senha — Correge SGP',
  description: 'Redefina sua senha de acesso institucional ao Sistema de Geração de Provas.',
};

export default function RecuperarSenhaPage() {
  return <PasswordRecoveryScreen />;
}
