'use client';

import React from 'react';
import { AppProvider, useApp } from '@/context/AppContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { ToastContainer } from '@/components/ui/ToastContainer';

// Screens
import { DashboardScreen } from '@/components/screens/DashboardScreen';
import { QuestionBankScreen } from '@/components/screens/QuestionBankScreen';
import { CreateExamScreen } from '@/components/screens/CreateExamScreen';
import { AnswerSheetScreen } from '@/components/screens/AnswerSheetScreen';
import { PrintPreviewScreen } from '@/components/screens/PrintPreviewScreen';
import { ResultsScreen } from '@/components/screens/ResultsScreen';
import { StudentsScreen } from '@/components/screens/StudentsScreen';
import { SettingsScreen } from '@/components/screens/SettingsScreen';

// Modals
import { NewQuestionModal } from '@/components/modals/NewQuestionModal';
import { NewStudentModal } from '@/components/modals/NewStudentModal';
import { ExcelImportModal } from '@/components/modals/ExcelImportModal';
import { ScannerModal } from '@/components/modals/ScannerModal';

function MainAppContent() {
  const { currentScreen } = useApp();

  const renderScreen = () => {
    switch (currentScreen) {
      case 'dashboard':
        return <DashboardScreen />;
      case 'banco-questoes':
        return <QuestionBankScreen />;
      case 'criar-prova':
        return <CreateExamScreen />;
      case 'folha-respostas':
        return <AnswerSheetScreen />;
      case 'pre-visualizacao':
        return <PrintPreviewScreen />;
      case 'resultados':
        return <ResultsScreen />;
      case 'alunos':
        return <StudentsScreen />;
      case 'configuracoes':
        return <SettingsScreen />;
      default:
        return <DashboardScreen />;
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
