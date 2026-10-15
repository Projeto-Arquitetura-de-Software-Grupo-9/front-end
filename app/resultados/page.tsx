import React, { Suspense } from 'react';
import { ResultsScreen } from '@/components/screens/ResultsScreen';

export const metadata = {
  title: 'Resultados & Relatórios — Correge',
  description: 'Análise de desempenho, matriz de respostas dos estudantes e detecção de anomalias.',
};

export default function ResultadosPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-xs font-semibold text-slate-500">
          Carregando relatórios...
        </div>
      }
    >
      <ResultsScreen />
    </Suspense>
  );
}
