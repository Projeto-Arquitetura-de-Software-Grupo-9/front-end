'use client';

import React from 'react';
import { AppProvider, useApp } from '@/context/AppContext';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { ToastContainer } from '@/components/ui/ToastContainer';
import { LoginScreen } from '@/components/auth/LoginScreen';

// Global Modals
import { NewQuestionModal } from '@/components/modals/NewQuestionModal';
import { NewStudentModal } from '@/components/modals/NewStudentModal';
import { ExcelImportModal } from '@/components/modals/ExcelImportModal';
import { ScannerModal } from '@/components/modals/ScannerModal';

interface AppShellProps {
  children: React.ReactNode;
}

function AppShellContent({ children }: AppShellProps) {
  const { isAuthenticated } = useApp();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen">
        <LoginScreen />
        <ToastContainer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Global Top Header */}
      <Header />

      <div className="flex-1 flex min-w-0">
        {/* Navigation Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <main className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto pb-16 min-w-0">
          {children}
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

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  return (
    <AppProvider>
      <AppShellContent>{children}</AppShellContent>
    </AppProvider>
  );
};
