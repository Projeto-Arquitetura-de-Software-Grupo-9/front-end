import { Suspense } from 'react';
import { CreateExamScreen } from '@/components/screens/CreateExamScreen';

export const metadata = {
  title: 'Criar Prova — Correge',
  description: 'Assistente para criação e geração de variações de provas.',
};

export default function NewExamPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs font-semibold text-slate-500">
          Carregando assistente de provas...
        </div>
      }
    >
      <CreateExamScreen />
    </Suspense>
  );
}
