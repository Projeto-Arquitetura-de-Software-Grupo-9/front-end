'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { AppProvider, useApp } from '@/context/AppContext';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { ToastContainer } from '@/components/ui/ToastContainer';
import { LoginScreen } from '@/components/auth/LoginScreen';
import { RegisterScreen } from '@/components/auth/RegisterScreen';
import { PasswordRecoveryScreen } from '@/components/auth/PasswordRecoveryScreen';
import { MobileScannerScreen } from '@/components/screens/MobileScannerScreen';

// Global Modals
import { NewQuestionModal } from '@/components/modals/NewQuestionModal';
import { NewStudentModal } from '@/components/modals/NewStudentModal';
import { ExcelImportModal } from '@/components/modals/ExcelImportModal';
import { ScannerModal } from '@/components/modals/ScannerModal';

interface AppShellProps {
  children: React.ReactNode;
}

function AppShellContent({ children }: AppShellProps) {
  const { isAuthenticated, authView } = useApp();
  const pathname = usePathname();
  const [isSmartphone, setIsSmartphone] = useState(false);

  useEffect(() => {
    const checkSmartphone = () => {
      const mobileViewport = window.innerWidth < 768;
      const mobileUA =
        /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        );
      setIsSmartphone(mobileViewport || mobileUA);
    };

    checkSmartphone();
    window.addEventListener('resize', checkSmartphone);
    return () => window.removeEventListener('resize', checkSmartphone);
  }, []);

  const isPublicAuthRoute =
    pathname === '/cadastro' || pathname === '/recuperar-senha' || pathname === '/login';

  if (!isAuthenticated || isPublicAuthRoute) {
    let activeAuthComponent = <LoginScreen />;
    if (pathname === '/cadastro' || authView === 'register') {
      activeAuthComponent = <RegisterScreen />;
    } else if (pathname === '/recuperar-senha' || authView === 'recovery') {
      activeAuthComponent = <PasswordRecoveryScreen />;
    }

    return (
      <div className="min-h-screen">
        {activeAuthComponent}
        <ToastContainer />
      </div>
    );
  }

  if (isSmartphone) {
    return (
      <div className="min-h-screen">
        <MobileScannerScreen />
        <ToastContainer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Smartphone fallback via CSS media query before JS hydration */}
      <div className="md:hidden min-h-screen">
        <MobileScannerScreen />
      </div>

      {/* Desktop Full Layout */}
      <div className="hidden md:flex md:flex-col min-h-screen">
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
      </div>

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
