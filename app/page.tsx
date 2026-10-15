'use client';

import React from 'react';
import { AppProvider, useApp } from '@/context/AppContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { ToastContainer } from '@/components/ui/ToastContainer';
import { LoginScreen } from '@/components/auth/LoginScreen';

// Screens
import { QuestionBankScreen } from '@/components/screens/QuestionBankScreen';
import { TurmasScreen } from '@/components/screens/TurmasScreen';
import { CreateExamScreen } from '@/components/screens/CreateExamScreen';
import { AplicacoesScreen } from '@/components/screens/AplicacoesScreen';
import { AnswerSheetScreen } from '@/components/screens/AnswerSheetScreen';
import { PrintPreviewScreen } from '@/components/screens/PrintPreviewScreen';
import { ResultsScreen } from '@/components/screens/ResultsScreen';
import { LancamentoManualScreen } from '@/components/screens/LancamentoManualScreen';
import { StudentsScreen } from '@/components/screens/StudentsScreen';
import { PortalAlunoScreen } from '@/components/screens/PortalAlunoScreen';
import { SettingsScreen } from '@/components/screens/SettingsScreen';

// Modals
import { NewQuestionModal } from '@/components/modals/NewQuestionModal';
import { NewStudentModal } from '@/components/modals/NewStudentModal';
import { ExcelImportModal } from '@/components/modals/ExcelImportModal';
import { ScannerModal } from '@/components/modals/ScannerModal';

function MainAppContent() {
  const { currentScreen, isAuthenticated } = useApp();

  // If not authenticated, render Institutional Login (Feature 1)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen">
        <LoginScreen />
        <ToastContainer />
      </div>
    );
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case 'banco-questoes':
        return <QuestionBankScreen />;
      case 'turmas':
        return <TurmasScreen />;
      case 'criar-prova':
        return <CreateExamScreen />;
      case 'aplicacoes':
        return <AplicacoesScreen />;
      case 'folha-respostas':
        return <AnswerSheetScreen />;
      case 'pre-visualizacao':
        return <PrintPreviewScreen />;
      case 'resultados':
        return <ResultsScreen />;
      case 'lancamento-manual':
        return <LancamentoManualScreen />;
      case 'alunos':
        return <StudentsScreen />;
      case 'portal-aluno':
        return <PortalAlunoScreen />;
      case 'configuracoes':
        return <SettingsScreen />;
      default:
        return <QuestionBankScreen />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Global Top Header */}
      <Header />

      <div className="flex-1 flex min-w-0">
        {/* Navigation Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <main className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto pb-16 min-w-0">
          {renderScreen()}
        </main>
      </div>

      {/* Global Modals */}
      <NewQuestionModal />
      <NewStudentModal />
      <ExcelImportModal />
      <ScannerModal />

      {/* Toasts */}
      <ToastContainer />
    </div>
  );
}

export default function Page() {
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}
