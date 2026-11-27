'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ScreenType,
  Question,
  Exam,
  Student,
  ExamReport,
  ExamVersion,
  Class,
  Discipline,
  Application,
  Correction,
  User,
  UserRole,
} from '@/lib/types';
import {
  getVersionLetters,
  generateRandomStudentAssignments,
} from '@/lib/exam-utils';
import {
  api,
  API_BASE_URL,
  ApiError,
  generateDisciplineCode,
  mapBackendExam,
  setAuthToken,
  clearAuthToken,
} from '@/lib/api';

const AUTH_SESSION_STORAGE_KEY = 'correge_auth_session';

interface StoredAuthSession {
  token: string;
  user: User;
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
}

interface ExamDraft {
  id?: string;
  title: string;
  discipline: string;
  course: string;
  classGroup: string;
  semester: string;
  institution: string;
  department: string;
  date: string;
  duration: string;
  instructions: string;
  selectedQuestionIds: string[];
  withStudentIdentification: boolean;
  shuffleQuestions: boolean;
  shuffleAlternatives: boolean;
  numberOfVersions: number;
  maxScore: number;
  permutationStrategy?: 'FISHER_YATES' | 'CYCLIC_ROTATION';
}

interface AppContextType {
  currentScreen: ScreenType;
  setCurrentScreen: (screen: ScreenType) => void;

  // LGPD & Auth (Features 1 & 1.1 - 100% Backend JWT + bcrypt)
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  currentUser: User;
  authView: 'login' | 'register' | 'recovery';
  setAuthView: (view: 'login' | 'register' | 'recovery') => void;
  authPrefillEmail: string;
  setAuthPrefillEmail: (email: string) => void;
  login: (
    role: UserRole,
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  registerAccount: (data: {
    fullName: string;
    email: string;
    password: string;
    department?: string;
    role?: UserRole;
    autoLogin?: boolean;
  }) => Promise<{ success: boolean; error?: string }>;
  changePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<{ success: boolean; error?: string }>;
  requestPasswordReset: (
    email: string
  ) => Promise<{ success: boolean; message?: string; error?: string }>;
  resetPassword: (
    email: string,
    token: string,
    newPassword: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  anonymizeUser: () => Promise<void>;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Disciplines
  disciplines: Discipline[];
  addDiscipline: (data: { name: string; code?: string; course?: string }) => Promise<Discipline | null>;
  deleteDiscipline: (id: string) => Promise<boolean>;

  // Classes (Turmas - Feature 3)
  classes: Class[];
  activeClassId: string;
  setActiveClassId: (id: string) => void;
  selectedClass: Class | undefined;
  addClass: (cls: Omit<Class, 'id' | 'createdAt' | 'inviteCode' | 'teacherId'>) => Class;
  updateClass: (id: string, data: Partial<Class>) => void;
  archiveClass: (id: string) => void;
  regenerateInviteCode: (classId: string) => string;

  // Questions (Feature 2)
  questions: Question[];
  addQuestion: (question: Omit<Question, 'id' | 'code'>) => Question;
  updateQuestion: (id: string, question: Partial<Question>) => void;
  deleteQuestion: (id: string) => void;

  // Exams (Feature 4 - Templates)
  exams: Exam[];
  refreshExams: () => Promise<void>;
  activeExamId: string;
  setActiveExamId: (id: string) => void;
  selectedExam: Exam | undefined;
  createExamFromDraft: (draft: ExamDraft) => Promise<Exam | null>;
  updateExam: (id: string, draft: ExamDraft) => Promise<Exam | null>;
  updateExamPrintConfig: (
    id: string,
    config: {
      numberOfVersions?: number;
      shuffleQuestions?: boolean;
      shuffleAlternatives?: boolean;
      withStudentIdentification?: boolean;
    }
  ) => Exam | undefined;
  reshuffleExamStudents: (id: string) => void;
  deleteExam: (id: string) => void;
  duplicateExam: (id: string) => Promise<Exam | null>;

  // Applications (Feature 5, 6 - Prova aplicada a Turma)
  applications: Application[];
  activeApplicationId: string;
  setActiveApplicationId: (id: string) => void;
  selectedApplication: Application | undefined;
  createApplication: (
    examId: string,
    classId: string,
    options: {
      withStudentIdentification: boolean;
      numberOfVersions: number;
      shuffleQuestions: boolean;
      shuffleAlternatives: boolean;
    }
  ) => Application;
  publishAnswerKey: (applicationId: string) => void;

  // Corrections & Pending manual assignment (Feature 8, 9)
  corrections: Correction[];
  addCorrection: (
    correction: Omit<Correction, 'id' | 'confirmedAt'> & { id?: string; confirmedAt?: string }
  ) => Correction;
  assignCorrection: (correctionId: string, studentId: string, notes?: string) => void;

  // Exam Wizard Draft
  examDraft: ExamDraft;
  setExamDraft: React.Dispatch<React.SetStateAction<ExamDraft>>;
  examWizardStep: number;
  setExamWizardStep: (step: number) => void;
  resetExamDraft: () => void;
  loadExamToDraft: (id: string) => void;

  // Print Preview state
  previewVersion: string;
  setPreviewVersion: (v: string) => void;
  showAnswerKeyInPreview: boolean;
  setShowAnswerKeyInPreview: (show: boolean) => void;
  showQrCodeInPreview: boolean;
  setShowQrCodeInPreview: (show: boolean) => void;
  previewZoom: number;
  setPreviewZoom: (zoom: number) => void;
  previewPage: number;
  setPreviewPage: (page: number) => void;
  withStudentIdentificationPreview: boolean;
  setWithStudentIdentificationPreview: (val: boolean) => void;

  // Students
  students: Student[];
  addStudent: (student: Omit<Student, 'id'>) => Student;
  importStudents: (students: Omit<Student, 'id'>[]) => void;
  deleteStudent: (id: string) => void;
  deleteStudentsBatch: (ids: string[]) => void;

  // Results & Reports (Feature 10)
  currentReport: ExamReport;

  // Modals
  isNewQuestionModalOpen: boolean;
  setIsNewQuestionModalOpen: (open: boolean) => void;
  editingQuestion: Question | null;
  setEditingQuestion: (q: Question | null) => void;

  isNewStudentModalOpen: boolean;
  setIsNewStudentModalOpen: (open: boolean) => void;

  isExcelImportModalOpen: boolean;
  setIsExcelImportModalOpen: (open: boolean) => void;

  isScannerModalOpen: boolean;
  setIsScannerModalOpen: (open: boolean) => void;

  // Toasts
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;

  // Quick navigation helper
  navigateToPreview: (examId?: string) => void;
  navigateToResults: (examId?: string) => void;
  navigateToFolha: (examId?: string) => void;
  navigateToTurmas: () => void;
  navigateToAplicacoes: () => void;

  // Backend Connection Status
  isBackendOnline: boolean;
  backendUrl: string;
}

function getDefaultDraft(): ExamDraft {
  const now = new Date();
  const semester = `${now.getFullYear()}.${now.getMonth() < 6 ? 1 : 2}`;
  return {
    title: '',
    discipline: '',
    course: 'Direito',
    classGroup: '',
    semester,
    institution: 'CATÓLICA DE SANTA CATARINA',
    department: 'Centro Universitário Católica de Santa Catarina',
    date: now.toLocaleDateString('pt-BR'),
    duration: '2 horas',
    instructions:
      'Marque apenas uma alternativa por questão. Preencha completamente o campo correspondente. Use apenas caneta preta ou azul. Rasuras anularão a questão.',
    selectedQuestionIds: [],
    withStudentIdentification: true,
    shuffleQuestions: true,
    shuffleAlternatives: true,
    numberOfVersions: 4,
    maxScore: 10.0,
    permutationStrategy: 'FISHER_YATES',
  };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const EMPTY_USER: User = {
  id: '',
  fullName: '',
  email: '',
  role: 'professor',
  createdAt: '',
};

const EMPTY_REPORT: ExamReport = {
  examId: '',
  examTitle: 'Relatório de Avaliação',
  averageScore: 0,
  medianScore: 0,
  standardDeviation: 0,
  highestScore: 0,
  highestScorer: '-',
  lowestScore: 0,
  lowestScorersCount: 0,
  approvalRate: 0,
  totalStudents: 0,
  questionsAnalytics: [],
  studentResults: [],
  pendingCorrectionsCount: 0,
};

function decodeJwtExpiryMs(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const parsed = JSON.parse(jsonPayload);
    return typeof parsed?.exp === 'number' ? parsed.exp * 1000 : null;
  } catch {
    return null;
  }
}

function saveStoredAuthSession(session: StoredAuthSession | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (session) {
      localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
      setAuthToken(session.token);
    } else {
      localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
      clearAuthToken();
    }
  } catch {
    // ignore storage errors
  }
}

function readStoredAuthSession(): StoredAuthSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAuthSession;
    if (!parsed?.token || !parsed?.user?.id || !parsed?.user?.email) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

// mapBackendExam is imported from @/lib/api

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const [currentScreen, setCurrentScreenState] = useState<ScreenType>('banco-questoes');
  const [searchQuery, setSearchQuery] = useState('');

  // Auth & LGPD (100% Backend JWT + bcrypt)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<User>(EMPTY_USER);
  const [authView, setAuthView] = useState<'login' | 'register' | 'recovery'>('login');
  const [authPrefillEmail, setAuthPrefillEmail] = useState<string>('');

  // Core Data — estritamente populados pelo backend (zero mocks!)
  const [questions, setQuestions] = useState<Question[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [activeClassId, setActiveClassId] = useState<string>('');
  const [exams, setExams] = useState<Exam[]>([]);
  const [activeExamId, setActiveExamId] = useState<string>('');
  const [applications, setApplications] = useState<Application[]>([]);
  const [activeApplicationId, setActiveApplicationId] = useState<string>('');
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [currentReport, setCurrentReport] = useState<ExamReport>(EMPTY_REPORT);

  const [examDraft, setExamDraft] = useState<ExamDraft>(() => getDefaultDraft());
  const [examWizardStep, setExamWizardStep] = useState<number>(1);

  const [isBackendOnline, setIsBackendOnline] = useState<boolean>(false);
  const [backendUrl] = useState<string>(API_BASE_URL);

  // Print Preview state
  const [previewVersion, setPreviewVersion] = useState<string>('A');
  const [showAnswerKeyInPreview, setShowAnswerKeyInPreview] = useState(false);
  const [showQrCodeInPreview, setShowQrCodeInPreview] = useState(true);
  const [previewZoom, setPreviewZoom] = useState(100);
  const [previewPage, setPreviewPage] = useState(1);
  const [withStudentIdentificationPreview, setWithStudentIdentificationPreview] = useState(true);

  // Modals
  const [isNewQuestionModalOpen, setIsNewQuestionModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isNewStudentModalOpen, setIsNewStudentModalOpen] = useState(false);
  const [isExcelImportModalOpen, setIsExcelImportModalOpen] = useState(false);
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { ...toast, id }]);
      setTimeout(() => {
        removeToast(id);
      }, 4500);
    },
    [removeToast]
  );

  const refreshExams = useCallback(async () => {
    try {
      const remoteExams = await api.getExams();
      if (Array.isArray(remoteExams)) {
        const mapped = remoteExams.map(mapBackendExam);
        setExams(mapped);
        if (mapped.length > 0) {
          setActiveExamId((prev) => (mapped.some((x) => x.id === prev) ? prev : mapped[0].id));
        }
      }
    } catch (err) {
      console.warn('Erro ao atualizar provas do backend:', err);
    }
  }, []);

  const syncWithBackend = useCallback(async () => {
    try {
      const health = await api.checkHealth();
      setIsBackendOnline(health.online);
      if (!health.online) return;

      const [
        remoteStudents,
        remoteDisciplines,
        remoteClasses,
        remoteExams,
        remoteQuestions,
        remoteCorrecoes,
      ] = await Promise.all([
        api.getStudents().catch(() => null),
        api.getDisciplinas().catch(() => null),
        api.getTurmas().catch(() => null),
        api.getExams().catch(() => null),
        api.getQuestions().catch(() => null),
        api.getCorrecoes().catch(() => null),
      ]);

      if (Array.isArray(remoteStudents)) setStudents(remoteStudents);
      if (Array.isArray(remoteDisciplines)) {
        setDisciplines(remoteDisciplines.filter((d) => Boolean(d.name)));
      }
      if (Array.isArray(remoteClasses)) setClasses(remoteClasses);
      if (Array.isArray(remoteQuestions)) setQuestions(remoteQuestions);
      if (Array.isArray(remoteCorrecoes)) setCorrections(remoteCorrecoes);
      if (Array.isArray(remoteExams)) {
        const mapped = remoteExams.map(mapBackendExam);
        setExams(mapped);
        if (mapped.length > 0) {
          setActiveExamId((prev) => (mapped.some((x) => x.id === prev) ? prev : mapped[0].id));
        }
      }
    } catch {
      setIsBackendOnline(false);
    }
  }, []);

  // Limpa chaves obsoletas de mock/localStorage e restaura + valida sessão JWT real
  useEffect(() => {
    let isMounted = true;

    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('correge_exams_v1');
        localStorage.removeItem('correge_users_v1');
        localStorage.removeItem('correge_disciplines_v1');
      } catch {
        // ignore
      }
    }

    async function bootstrapSession() {
      const stored = readStoredAuthSession();
      if (!stored) {
        if (isMounted) {
          setIsAuthenticated(false);
          setIsAuthLoading(false);
        }
        return;
      }

      const expMs = decodeJwtExpiryMs(stored.token);
      if (expMs !== null && expMs <= Date.now()) {
        saveStoredAuthSession(null);
        if (isMounted) {
          setIsAuthenticated(false);
          setCurrentUser(EMPTY_USER);
          setIsAuthLoading(false);
        }
        return;
      }

      setAuthToken(stored.token);

      try {
        // Valida token diretamente no back-end (/professores/me)
        const profile = await api.getCurrentProfessor();
        if (!isMounted) return;
        const verifiedUser: User = {
          id: String(profile.id),
          role: 'professor',
          fullName: String(profile.nomeCompleto || stored.user.fullName),
          email: String(profile.email || stored.user.email),
          createdAt: String(profile.createdAt || stored.user.createdAt || new Date().toISOString()),
        };
        saveStoredAuthSession({ token: stored.token, user: verifiedUser });
        setCurrentUser(verifiedUser);
        setIsAuthenticated(true);
      } catch (err: any) {
        if (!isMounted) return;
        if (err instanceof ApiError && err.status === 401) {
          // Token inválido ou expirado no servidor
          saveStoredAuthSession(null);
          setCurrentUser(EMPTY_USER);
          setIsAuthenticated(false);
        } else if (err instanceof ApiError && err.status === 404) {
          // Compatibilidade com back-end anterior antes do redeploy de GET /professores/me
          try {
            const prof = await api.getProfessorById(stored.user.id);
            if (!isMounted) return;
            const verifiedUser: User = {
              id: String(prof.id),
              role: 'professor',
              fullName: String(prof.nomeCompleto || stored.user.fullName),
              email: String(prof.email || stored.user.email),
              createdAt: String(prof.createdAt || stored.user.createdAt || new Date().toISOString()),
            };
            saveStoredAuthSession({ token: stored.token, user: verifiedUser });
            setCurrentUser(verifiedUser);
            setIsAuthenticated(true);
          } catch {
            saveStoredAuthSession(null);
            setCurrentUser(EMPTY_USER);
            setIsAuthenticated(false);
          }
        } else {
          // Erro transitório de rede com JWT ainda não expirado: mantém sessão verificada até reconexão
          setCurrentUser(stored.user);
          setIsAuthenticated(true);
        }
      } finally {
        if (isMounted) {
          setIsAuthLoading(false);
        }
      }
    }

    bootstrapSession();
    return () => {
      isMounted = false;
    };
  }, []);

  // Sincroniza dados reais do banco assim que autenticado (e também verifica status online)
  useEffect(() => {
    syncWithBackend();
  }, [isAuthenticated, syncWithBackend]);

  const persistExams = (newExams: Exam[]) => {
    setExams(newExams);
  };

  // Helper shuffle function (Fisher-Yates)
  const shuffleArray = <T,>(arr: T[]): T[] => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  // Build shuffled versions for an exam / application (Feature 6 da Spec)
  const buildExamVersions = (
    selectedQIds: string[],
    shuffleQ: boolean,
    shuffleAlt: boolean,
    numVersions: number,
    examCode = '#EXAM',
    examId?: string
  ): ExamVersion[] => {
    const baseQuestions = selectedQIds
      .map((id) => questions.find((q) => q.id === id))
      .filter((q): q is Question => q !== undefined && !q.deletedAt);

    const versionLetters = getVersionLetters(numVersions);

    return versionLetters.map((letter, vIdx) => {
      let versionQuestions = [...baseQuestions];
      if (shuffleQ && vIdx > 0) {
        versionQuestions = shuffleArray(versionQuestions);
      }

      const questionsForVersion = versionQuestions.map((q, qIndex) => {
        let alts = [...(q.alternatives || [])];
        if (shuffleAlt && vIdx > 0 && alts.length > 0) {
          const correctAltText = q.alternatives.find(
            (a) => a.letter === q.correctAlternative
          )?.text;
          const shuffledAltsText = shuffleArray(alts.map((a) => a.text));
          const letters: ('A' | 'B' | 'C' | 'D' | 'E')[] = ['A', 'B', 'C', 'D', 'E'];

          let newCorrectLetter: 'A' | 'B' | 'C' | 'D' | 'E' = q.correctAlternative || 'A';
          alts = shuffledAltsText.map((text, idx) => {
            const l = letters[idx];
            if (text === correctAltText) {
              newCorrectLetter = l;
            }
            return {
              id: `${q.id}-v${letter}-alt-${idx}`,
              letter: l,
              text,
            };
          });

          return {
            originalQuestionId: q.id,
            orderIndex: qIndex + 1,
            statement: q.statement,
            alternatives: alts,
            correctAlternative: newCorrectLetter,
            explanation: q.explanation,
            topic: q.topic,
          };
        } else {
          return {
            originalQuestionId: q.id,
            orderIndex: qIndex + 1,
            statement: q.statement,
            alternatives: alts,
            correctAlternative: q.correctAlternative,
            explanation: q.explanation,
            topic: q.topic,
          };
        }
      });

      const answerKey: Record<number, 'A' | 'B' | 'C' | 'D' | 'E'> = {};
      let objIdx = 0;
      questionsForVersion.forEach((qv) => {
        if (qv.alternatives && qv.alternatives.length > 0) {
          objIdx++;
          answerKey[objIdx] = qv.correctAlternative;
        }
      });

      return {
        id: examId ? `${examId}-${letter}` : `version-${letter}`,
        versionLetter: letter,
        versionNumber: vIdx + 1,
        questions: questionsForVersion,
        answerKey,
        publicCode: `PUB-${examCode.replace(/[^A-Za-z0-9]/g, '')}-${letter}`,
        qrCodePayload: JSON.stringify({
          app: 'CORREGE',
          ...(examId ? { examId } : {}),
          code: examCode,
          ver: letter,
        }),
        answerKeyPublished: false,
      };
    });
  };

  const selectedExam = exams.find((e) => e.id === activeExamId) || exams[0];
  const selectedClass = classes.find((c) => c.id === activeClassId) || classes[0];
  const selectedApplication =
    applications.find((a) => a.id === activeApplicationId) || applications[0];

  // =========================================================================
  // AUTH & LGPD — 100% REAL BACKEND (JWT + bcrypt)
  // =========================================================================
  const login = async (
    _role: UserRole,
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !password) {
      return { success: false, error: 'Informe seu e-mail institucional e senha.' };
    }
    if (!cleanEmail.endsWith('@catolicasc.org.br')) {
      return {
        success: false,
        error: 'E-mail de docente deve pertencer ao domínio @catolicasc.org.br.',
      };
    }

    try {
      const authRes = await api.loginProfessor({ email: cleanEmail, senha: password });
      const prof = authRes.professor || {
        id: authRes.id || '',
        nomeCompleto: authRes.nomeCompleto || '',
        email: authRes.email || cleanEmail,
        createdAt: authRes.createdAt,
      };

      if (!authRes.token || !prof.id) {
        return {
          success: false,
          error: 'Resposta de autenticação inválida do servidor.',
        };
      }

      const authenticatedUser: User = {
        id: String(prof.id),
        role: 'professor',
        fullName: String(prof.nomeCompleto || cleanEmail.split('@')[0]),
        email: String(prof.email || cleanEmail),
        createdAt: String(prof.createdAt || new Date().toISOString()),
      };

      saveStoredAuthSession({ token: authRes.token, user: authenticatedUser });
      setCurrentUser(authenticatedUser);
      setIsAuthenticated(true);
      setAuthView('login');
      setCurrentScreenState('aplicacoes');
      router.push('/provas');

      addToast({
        type: 'success',
        title: `Bem-vindo(a), ${authenticatedUser.fullName}!`,
        message: 'Sessão docente autenticada com segurança.',
      });

      return { success: true };
    } catch (err: any) {
      const msg =
        err?.name === 'AbortError'
          ? 'Tempo limite excedido ao conectar com o servidor. Verifique sua conexão.'
          : err?.message || 'Não foi possível autenticar. Verifique suas credenciais.';
      return { success: false, error: msg };
    }
  };

  const registerAccount = async (data: {
    fullName: string;
    email: string;
    password: string;
    department?: string;
    role?: UserRole;
    autoLogin?: boolean;
  }): Promise<{ success: boolean; error?: string }> => {
    const cleanName = data.fullName.trim();
    const cleanEmail = data.email.trim().toLowerCase();

    if (cleanName.length < 3) {
      return { success: false, error: 'Informe seu nome completo (mínimo de 3 caracteres).' };
    }
    if (!cleanEmail.endsWith('@catolicasc.org.br')) {
      return {
        success: false,
        error: 'O e-mail docente deve pertencer ao domínio institucional @catolicasc.org.br.',
      };
    }
    if (data.password.length < 8) {
      return { success: false, error: 'A senha de acesso deve conter pelo menos 8 caracteres.' };
    }

    try {
      const created = await api.createProfessor({
        nomeCompleto: cleanName,
        email: cleanEmail,
        senha: data.password,
      });

      setAuthPrefillEmail(cleanEmail);

      if (data.autoLogin === false) {
        setAuthView('login');
        addToast({
          type: 'success',
          title: 'Cadastro Concluído!',
          message: 'Sua conta institucional foi criada no banco de dados. Faça login para continuar.',
        });
        return { success: true };
      }

      // Usa token retornado no registro ou efetua login imediato para obter JWT (compatibilidade com deploys anteriores)
      let token = created.token;
      let prof = created.professor || {
        id: created.id || '',
        nomeCompleto: created.nomeCompleto || cleanName,
        email: created.email || cleanEmail,
        createdAt: created.createdAt,
      };

      if (!token) {
        const loginRes = await api.loginProfessor({ email: cleanEmail, senha: data.password });
        token = loginRes.token;
        if (loginRes.professor) {
          prof = loginRes.professor;
        }
      }

      if (!token || !prof.id) {
        setAuthView('login');
        addToast({
          type: 'success',
          title: 'Conta Criada!',
          message: 'Faça login com suas credenciais para acessar o sistema.',
        });
        return { success: true };
      }

      const authenticatedUser: User = {
        id: String(prof.id),
        role: 'professor',
        fullName: String(prof.nomeCompleto || cleanName),
        email: String(prof.email || cleanEmail),
        createdAt: String(prof.createdAt || new Date().toISOString()),
      };

      saveStoredAuthSession({ token, user: authenticatedUser });
      setCurrentUser(authenticatedUser);
      setIsAuthenticated(true);
      setAuthView('login');
      setCurrentScreenState('aplicacoes');
      router.push('/provas');

      addToast({
        type: 'success',
        title: 'Conta Criada com Sucesso!',
        message: `Bem-vindo(a), ${authenticatedUser.fullName}. Seu acesso institucional foi ativado.`,
      });

      return { success: true };
    } catch (err: any) {
      const msg =
        err?.name === 'AbortError'
          ? 'Tempo limite excedido ao cadastrar conta no servidor.'
          : err?.message || 'Não foi possível concluir o cadastro.';
      return { success: false, error: msg };
    }
  };

  const changePassword = async (
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (newPassword.length < 8) {
      return { success: false, error: 'A nova senha deve possuir no mínimo 8 caracteres.' };
    }
    try {
      await api.changePassword({
        senhaAtual: currentPassword,
        novaSenha: newPassword,
      });
      addToast({
        type: 'success',
        title: 'Senha Atualizada!',
        message: 'Sua senha institucional foi alterada com segurança.',
      });
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Não foi possível alterar a senha.',
      };
    }
  };

  const requestPasswordReset = async (
    email: string
  ): Promise<{ success: boolean; message?: string; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.endsWith('@catolicasc.org.br')) {
      return {
        success: false,
        error: 'Informe um e-mail docente válido (@catolicasc.org.br).',
      };
    }
    try {
      const res = await api.forgotPassword(cleanEmail);
      setAuthPrefillEmail(cleanEmail);
      addToast({
        type: 'info',
        title: 'Solicitação Processada',
        message:
          res.message ||
          'Se o e-mail estiver cadastrado, você receberá as instruções de redefinição.',
      });
      return { success: true, message: res.message };
    } catch (err: any) {
      return {
        success: false,
        error:
          err?.message ||
          'Serviço de envio de e-mail para recuperação não está configurado no servidor.',
      };
    }
  };

  const resetPassword = async (
    email: string,
    token: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!token.trim()) {
      return { success: false, error: 'Informe o token de recuperação recebido por e-mail.' };
    }
    if (newPassword.length < 8) {
      return { success: false, error: 'A nova senha deve possuir no mínimo 8 caracteres.' };
    }

    try {
      await api.resetPassword({ token: token.trim(), novaSenha: newPassword });
      setAuthPrefillEmail(email.trim().toLowerCase());
      addToast({
        type: 'success',
        title: 'Senha Redefinida!',
        message: 'Sua senha institucional foi atualizada com sucesso.',
      });
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Token de recuperação inválido ou expirado.',
      };
    }
  };

  const logout = () => {
    saveStoredAuthSession(null);
    setIsAuthenticated(false);
    setCurrentUser(EMPTY_USER);
    setAuthView('login');
    addToast({
      type: 'info',
      title: 'Sessão Encerrada',
      message: 'Você saiu da conta institucional.',
    });
  };

  const anonymizeUser = async () => {
    try {
      await api.anonymizeProfessorAccount(currentUser.id);
      saveStoredAuthSession(null);
      setIsAuthenticated(false);
      setCurrentUser(EMPTY_USER);
      setAuthView('login');
      addToast({
        type: 'warning',
        title: 'Conta Anonimizada (LGPD)',
        message:
          'Seus dados pessoais foram anonimizados no banco de dados e sua sessão foi encerrada. Provas e notas institucionais foram preservadas.',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Erro ao Anonimizar Conta',
        message: err?.message || 'Não foi possível concluir a anonimização no servidor.',
      });
    }
  };

  // =========================================================================
  // DISCIPLINES
  // =========================================================================
  const addDiscipline = async (data: {
    name: string;
    code?: string;
    course?: string;
  }): Promise<Discipline | null> => {
    const cleanName = (data.name || '').trim();
    if (!cleanName) {
      addToast({
        type: 'error',
        title: 'Nome Obrigatório',
        message: 'Informe o nome da disciplina para cadastrar.',
      });
      return null;
    }

    const existing = disciplines.find(
      (d) => (d.name || '').trim().toLowerCase() === cleanName.toLowerCase()
    );
    if (existing) {
      addToast({
        type: 'info',
        title: 'Disciplina já Cadastrada',
        message: `"${existing.name}" (${existing.code}) já existe na sua lista.`,
      });
      return existing;
    }

    const generatedCode = generateDisciplineCode(cleanName, data.code);
    const cleanCourse = (data.course || '').trim() || 'Direito';

    let professorId = (currentUser.id || '').trim();
    if (!professorId) {
      try {
        const profile = await api.getCurrentProfessor();
        if (profile?.id) {
          professorId = String(profile.id);
          setCurrentUser((prev) => ({
            ...prev,
            id: professorId,
            fullName: profile.nomeCompleto || prev.fullName,
            email: profile.email || prev.email,
          }));
        }
      } catch {
        // Backend will validate JWT token if idProfessor is omitted
      }
    }

    try {
      const createdRemote = await api.createDisciplina({
        nome: cleanName,
        codigo: generatedCode,
        curso: cleanCourse,
        ...(professorId ? { idProfessor: professorId } : {}),
      });

      setDisciplines((prev) => {
        if (prev.some((d) => d.id === createdRemote.id)) return prev;
        return [...prev, createdRemote];
      });

      addToast({
        type: 'success',
        title: 'Disciplina Criada!',
        message: `${createdRemote.name} (${createdRemote.code}) salva no banco de dados.`,
      });
      return createdRemote;
    } catch (err: any) {
      const msg =
        err?.name === 'AbortError'
          ? 'Tempo limite excedido ao salvar a disciplina. Tente novamente.'
          : err?.message || 'Não foi possível salvar a disciplina no banco de dados.';
      addToast({
        type: 'error',
        title: 'Erro ao Cadastrar Disciplina',
        message: msg,
      });
      return null;
    }
  };

  const deleteDiscipline = async (id: string): Promise<boolean> => {
    const target = disciplines.find((d) => d.id === id);
    try {
      await api.deleteDisciplina(id);
      setDisciplines((prev) => prev.filter((d) => d.id !== id));
      addToast({
        type: 'info',
        title: 'Disciplina Removida',
        message: target ? `"${target.name}" foi removida.` : 'Disciplina removida.',
      });
      return true;
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Erro ao Remover Disciplina',
        message:
          err?.message ||
          'Não foi possível remover a disciplina. Verifique se há turmas ou provas vinculadas.',
      });
      return false;
    }
  };

  // =========================================================================
  // CLASSES (TURMAS)
  // =========================================================================
  const addClass = (clsData: Omit<Class, 'id' | 'createdAt' | 'inviteCode' | 'teacherId'>): Class => {
    const matchedDisc = disciplines.find(
      (d) =>
        (clsData.disciplineId && d.id === clsData.disciplineId) ||
        d.name.trim().toLowerCase() === (clsData.subject || '').trim().toLowerCase()
    );
    const randomCode = `CAT-${(clsData.subject || 'TUR')
      .replace(/[^A-Za-z]/g, '')
      .substring(0, 3)
      .toUpperCase() || 'TUR'}-${Math.floor(1000 + Math.random() * 9000)}`;

    const tempId = `class-${Date.now()}`;
    const newClass: Class = {
      ...clsData,
      id: tempId,
      disciplineId: matchedDisc?.id || clsData.disciplineId,
      teacherId: currentUser.id,
      inviteCode: randomCode,
      createdAt: new Date().toISOString(),
      studentCount: 0,
      status: 'active',
    };

    setClasses((prev) => [newClass, ...prev]);

    api
      .createTurma({
        nome: newClass.name,
        idDisciplina: matchedDisc?.id || clsData.disciplineId || newClass.subject,
        periodoLetivo: newClass.term,
        idProfessor: currentUser.id,
        codigoConvite: randomCode,
      })
      .then((createdRemote) => {
        if (createdRemote?.id) {
          setClasses((prev) =>
            prev.map((c) => (c.id === tempId ? { ...c, id: String(createdRemote.id) } : c))
          );
        }
      })
      .catch((err) => console.warn('Aviso de criação de turma no backend:', err));

    addToast({
      type: 'success',
      title: 'Turma Criada com Sucesso!',
      message: `Código de convite: ${newClass.inviteCode}`,
    });
    return newClass;
  };

  const updateClass = (id: string, data: Partial<Class>) => {
    api.updateTurma(id, data).catch((err) => console.warn('Aviso ao atualizar turma:', err));
    setClasses((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)));
    addToast({
      type: 'info',
      title: 'Turma Atualizada',
      message: 'Informações da turma salvas.',
    });
  };

  const archiveClass = (id: string) => {
    api.deleteTurma(id).catch((err) => console.warn('Aviso ao arquivar turma:', err));
    setClasses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: 'archived' } : c))
    );
    addToast({
      type: 'warning',
      title: 'Turma Arquivada',
      message: 'A turma foi arquivada (soft-delete). O histórico permanece intacto.',
    });
  };

  const regenerateInviteCode = (classId: string): string => {
    const target = classes.find((c) => c.id === classId);
    const newCode = `CAT-${(target?.subject || 'TUR').substring(0, 3).toUpperCase()}-${Math.floor(
      1000 + Math.random() * 9000
    )}`;
    api.updateTurma(classId, { codigoConvite: newCode }).catch(() => {});
    setClasses((prev) =>
      prev.map((c) => (c.id === classId ? { ...c, inviteCode: newCode } : c))
    );
    addToast({
      type: 'success',
      title: 'Novo Código de Convite Gerado!',
      message: `O código anterior foi invalidado. Novo código: ${newCode}`,
    });
    return newCode;
  };

  // =========================================================================
  // QUESTIONS
  // =========================================================================
  const addQuestion = (newQData: Omit<Question, 'id' | 'code'>): Question => {
    const nextCodeNum = 1024 + questions.length;
    const isDisc = newQData.type === 'discursiva';
    const tempId = `q-${Date.now()}`;
    const newQuestion: Question = {
      ...newQData,
      id: tempId,
      code: isDisc ? `#Q-DISC-${nextCodeNum}` : `#Q-${nextCodeNum}`,
      type: newQData.type || 'objetiva',
    };

    setQuestions((prev) => [newQuestion, ...prev]);

    api
      .createQuestion({
        statement: newQuestion.statement,
        type: newQuestion.type,
        discipline: newQuestion.discipline,
        difficulty: newQuestion.difficulty,
        topic: newQuestion.topic,
        tags: newQuestion.tags,
        points: newQuestion.points,
        explanation: newQuestion.explanation,
        alternatives: newQuestion.alternatives,
        correctAlternative: newQuestion.correctAlternative,
      })
      .then((createdRemote) => {
        if (createdRemote?.id) {
          setQuestions((prev) =>
            prev.map((q) =>
              q.id === tempId ? { ...q, id: createdRemote.id, code: createdRemote.code || q.code } : q
            )
          );
        }
      })
      .catch((err) => {
        addToast({
          type: 'warning',
          title: 'Aviso ao Salvar Questão',
          message: err?.message || 'Não foi possível sincronizar a questão com o servidor.',
        });
      });

    addToast({
      type: 'success',
      title: isDisc ? 'Questão Discursiva Adicionada!' : 'Questão Objetiva Adicionada!',
      message: `Questão ${newQuestion.code} cadastrada no banco.`,
    });
    return newQuestion;
  };

  const updateQuestion = (id: string, updatedData: Partial<Question>) => {
    api.updateQuestion(id, updatedData).catch((err) => console.warn('Aviso ao atualizar questão:', err));
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, ...updatedData } : q))
    );
    addToast({
      type: 'info',
      title: 'Questão Atualizada',
      message: 'As alterações foram salvas.',
    });
  };

  const deleteQuestion = (id: string) => {
    api.deleteQuestion(id).catch((err) => console.warn('Aviso ao excluir questão:', err));
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, deletedAt: new Date().toISOString() } : q))
    );
    addToast({
      type: 'warning',
      title: 'Questão Removida (Soft-delete)',
      message: 'A questão foi arquivada e não será incluída em novas provas.',
    });
  };

  // =========================================================================
  // EXAMS
  // =========================================================================
  const buildBackendExamPayload = (draft: ExamDraft, code: string, versions: ExamVersion[]) => {
    const cleanDiscipline = (draft.discipline || '').trim();
    const matchedDisc = disciplines.find(
      (d) => (d.name || '').trim().toLowerCase() === cleanDiscipline.toLowerCase()
    );
    const validDisciplinaId =
      matchedDisc?.id && !matchedDisc.id.startsWith('disc-') ? matchedDisc.id : undefined;

    const selectedQuestions = draft.selectedQuestionIds
      .map((qId) => questions.find((q) => q.id === qId))
      .filter((q): q is Question => Boolean(q))
      .map((q) => ({
        id: q.id,
        statement: q.statement,
        type: q.type || 'objetiva',
        discipline: q.discipline,
        difficulty: q.difficulty,
        alternatives: q.alternatives,
        correctAlternative: q.correctAlternative,
      }));

    const resolvedQuestionIds = selectedQuestions.map((q) => q.id);
    const now = new Date();
    const defaultSemester = `${now.getFullYear()}.${now.getMonth() < 6 ? 1 : 2}`;
    const cleanSemester = (draft.semester || '').trim() || defaultSemester;
    const cleanClassGroup = (draft.classGroup || '').trim() || classes[0]?.name || 'Turma Geral';

    return {
      code,
      title: (draft.title || '').trim(),
      subtitle: `Período Letivo ${cleanSemester}`,
      institution: (draft.institution || '').trim() || 'CATÓLICA DE SANTA CATARINA',
      department:
        (draft.department || '').trim() || 'Centro Universitário Católica de Santa Catarina',
      course: (draft.course || '').trim() || matchedDisc?.course || 'Graduação',
      discipline: cleanDiscipline,
      ...(validDisciplinaId ? { disciplinaId: validDisciplinaId } : {}),
      classGroup: cleanClassGroup,
      semester: cleanSemester,
      date: (draft.date || '').trim() || now.toLocaleDateString('pt-BR'),
      duration: (draft.duration || '').trim() || '2 horas',
      instructions: (draft.instructions || '').trim(),
      selectedQuestionIds: resolvedQuestionIds,
      selectedQuestions,
      shuffleQuestions: draft.shuffleQuestions,
      shuffleAlternatives: draft.shuffleAlternatives,
      withStudentIdentification: draft.withStudentIdentification ?? true,
      numberOfVersions: draft.numberOfVersions,
      maxScore: draft.maxScore,
      permutationStrategy: draft.permutationStrategy || 'FISHER_YATES',
      versions,
    };
  };

  const createExamFromDraft = async (draft: ExamDraft): Promise<Exam | null> => {
    const cleanTitle = (draft.title || '').trim();
    const cleanDiscipline = (draft.discipline || '').trim();

    if (!cleanTitle) {
      addToast({
        type: 'error',
        title: 'Título Obrigatório',
        message: 'A avaliação precisa de um título.',
      });
      return null;
    }

    if (!cleanDiscipline) {
      addToast({
        type: 'error',
        title: 'Disciplina Obrigatória',
        message: 'Selecione ou cadastre uma disciplina para a avaliação.',
      });
      return null;
    }

    const validQuestionIds = draft.selectedQuestionIds.filter((qId) =>
      questions.some((q) => q.id === qId && !q.deletedAt)
    );

    if (validQuestionIds.length === 0) {
      addToast({
        type: 'error',
        title: 'Selecione Questões',
        message: 'Adicione pelo menos uma questão válida do banco à prova.',
      });
      return null;
    }

    if (validQuestionIds.length > 20) {
      addToast({
        type: 'warning',
        title: 'Limite de 20 Questões',
        message: 'Foram mantidas as 20 primeiras questões selecionadas conforme a especificação.',
      });
    }

    const cappedIds = validQuestionIds.slice(0, 20);
    const codePrefix =
      cleanDiscipline
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Za-z]/g, '')
        .substring(0, 3)
        .toUpperCase() || 'PRV';
    const generatedCode = `#${codePrefix}-${Date.now().toString().slice(-4)}`;

    const initialVersions = buildExamVersions(
      cappedIds,
      draft.shuffleQuestions,
      draft.shuffleAlternatives,
      draft.numberOfVersions,
      generatedCode
    );

    const payload = buildBackendExamPayload(
      { ...draft, title: cleanTitle, discipline: cleanDiscipline, selectedQuestionIds: cappedIds },
      generatedCode,
      initialVersions
    );

    try {
      const createdRemote = await api.createExam(payload);
      const syncedBase = mapBackendExam(createdRemote);
      const studentAssignments = generateRandomStudentAssignments(students, draft.numberOfVersions);

      const finalVersions =
        syncedBase.versions.length > 0
          ? syncedBase.versions
          : buildExamVersions(
              cappedIds,
              draft.shuffleQuestions,
              draft.shuffleAlternatives,
              draft.numberOfVersions,
              syncedBase.code || generatedCode,
              syncedBase.id
            );

      const savedExam: Exam = {
        ...syncedBase,
        teacherId: syncedBase.teacherId || currentUser.id,
        withStudentIdentification: draft.withStudentIdentification ?? true,
        selectedQuestionIds: cappedIds,
        versions: finalVersions,
        studentAssignments,
        totalStudents: students.length,
      };

      setExams((prev) => [savedExam, ...prev.filter((e) => e.id !== savedExam.id)]);
      setActiveExamId(savedExam.id);

      addToast({
        type: 'success',
        title: 'Prova Salva com Sucesso!',
        message: `A avaliação "${savedExam.title}" (${savedExam.code}) foi salva e está pronta para impressão.`,
      });
      return savedExam;
    } catch (err: any) {
      const msg =
        err?.name === 'AbortError'
          ? 'Tempo limite excedido ao salvar a prova. Tente novamente.'
          : err?.message || 'Não foi possível salvar a prova no servidor.';
      addToast({
        type: 'error',
        title: 'Erro ao Cadastrar Prova',
        message: msg,
      });
      return null;
    }
  };

  const updateExam = async (id: string, draft: ExamDraft): Promise<Exam | null> => {
    const existing = exams.find((e) => e.id === id);
    if (!existing) {
      return createExamFromDraft(draft);
    }

    const validQuestionIds = draft.selectedQuestionIds
      .filter((qId) => questions.some((q) => q.id === qId && !q.deletedAt))
      .slice(0, 20);

    if (validQuestionIds.length === 0) {
      addToast({
        type: 'error',
        title: 'Selecione Questões',
        message: 'Adicione pelo menos uma questão válida à prova.',
      });
      return null;
    }

    const versions = buildExamVersions(
      validQuestionIds,
      draft.shuffleQuestions,
      draft.shuffleAlternatives,
      draft.numberOfVersions,
      existing.code,
      existing.id
    );

    const payload = buildBackendExamPayload(
      { ...draft, selectedQuestionIds: validQuestionIds },
      existing.code,
      versions
    );

    try {
      const updatedRemote = await api.updateExam(id, payload);
      const syncedBase = updatedRemote ? mapBackendExam(updatedRemote) : null;
      const studentAssignments = generateRandomStudentAssignments(students, draft.numberOfVersions);

      const updatedExam: Exam = {
        ...existing,
        ...(syncedBase || {}),
        id: existing.id,
        title: payload.title,
        discipline: payload.discipline,
        course: payload.course,
        classGroup: payload.classGroup,
        semester: payload.semester,
        institution: payload.institution,
        department: payload.department,
        date: payload.date,
        duration: payload.duration,
        instructions: payload.instructions,
        selectedQuestionIds: validQuestionIds,
        withStudentIdentification: draft.withStudentIdentification ?? true,
        shuffleQuestions: draft.shuffleQuestions,
        shuffleAlternatives: draft.shuffleAlternatives,
        numberOfVersions: draft.numberOfVersions,
        permutationStrategy: draft.permutationStrategy || 'FISHER_YATES',
        maxScore: draft.maxScore,
        versions:
          syncedBase && syncedBase.versions.length > 0 ? syncedBase.versions : versions,
        studentAssignments,
      };

      setExams((prev) => prev.map((e) => (e.id === id ? updatedExam : e)));
      setActiveExamId(updatedExam.id);

      addToast({
        type: 'success',
        title: 'Prova Atualizada com Sucesso!',
        message: `As alterações em "${updatedExam.title}" foram salvas.`,
      });
      return updatedExam;
    } catch (err: any) {
      const msg =
        err?.name === 'AbortError'
          ? 'Tempo limite excedido ao atualizar a prova. Tente novamente.'
          : err?.message || 'Não foi possível atualizar a prova no servidor.';
      addToast({
        type: 'error',
        title: 'Erro ao Atualizar Prova',
        message: msg,
      });
      return null;
    }
  };

  const updateExamPrintConfig = (
    id: string,
    config: {
      numberOfVersions?: number;
      shuffleQuestions?: boolean;
      shuffleAlternatives?: boolean;
      withStudentIdentification?: boolean;
    }
  ): Exam | undefined => {
    const existing = exams.find((e) => e.id === id);
    if (!existing) return undefined;

    const nextNumVersions = Math.max(
      1,
      Math.min(26, config.numberOfVersions ?? existing.numberOfVersions ?? 4)
    );
    const nextShuffleQ = config.shuffleQuestions ?? existing.shuffleQuestions ?? true;
    const nextShuffleAlt = config.shuffleAlternatives ?? existing.shuffleAlternatives ?? true;
    const nextWithIdent =
      config.withStudentIdentification ?? existing.withStudentIdentification ?? true;

    const versions = buildExamVersions(
      existing.selectedQuestionIds,
      nextShuffleQ,
      nextShuffleAlt,
      nextNumVersions,
      existing.code,
      existing.id
    );

    const studentAssignments = generateRandomStudentAssignments(students, nextNumVersions);

    const updatedExam: Exam = {
      ...existing,
      numberOfVersions: nextNumVersions,
      shuffleQuestions: nextShuffleQ,
      shuffleAlternatives: nextShuffleAlt,
      withStudentIdentification: nextWithIdent,
      versions,
      studentAssignments,
    };

    persistExams(exams.map((e) => (e.id === id ? updatedExam : e)));
    api
      .updateExam(id, {
        numberOfVersions: nextNumVersions,
        shuffleQuestions: nextShuffleQ,
        shuffleAlternatives: nextShuffleAlt,
        withStudentIdentification: nextWithIdent,
        versions,
      })
      .catch(() => {});

    return updatedExam;
  };

  const reshuffleExamStudents = (id: string) => {
    const existing = exams.find((e) => e.id === id);
    if (!existing) return;

    const numV = existing.numberOfVersions || 4;
    const studentAssignments = generateRandomStudentAssignments(students, numV);

    const updatedExam: Exam = {
      ...existing,
      studentAssignments,
    };

    persistExams(exams.map((e) => (e.id === id ? updatedExam : e)));
    addToast({
      type: 'info',
      title: 'Novo Sorteio de Cadernos Realizado!',
      message: `Os ${students.length} alunos foram redistribuídos entre os ${numV} cadernos.`,
    });
  };

  const duplicateExam = async (id: string): Promise<Exam | null> => {
    const original = exams.find((e) => e.id === id);
    if (!original) throw new Error('Prova não encontrada');

    return createExamFromDraft({
      title: `${original.title} (Cópia)`,
      discipline: original.discipline,
      course: original.course,
      classGroup: original.classGroup,
      semester: original.semester,
      institution: original.institution,
      department: original.department,
      date: original.date,
      duration: original.duration,
      instructions: original.instructions,
      selectedQuestionIds: original.selectedQuestionIds,
      withStudentIdentification: original.withStudentIdentification ?? true,
      shuffleQuestions: original.shuffleQuestions,
      shuffleAlternatives: original.shuffleAlternatives,
      numberOfVersions: original.numberOfVersions,
      maxScore: original.maxScore,
      permutationStrategy: original.permutationStrategy,
    });
  };

  const deleteExam = (id: string) => {
    api.deleteExam(id).catch((err) => console.warn('Erro ao deletar prova no backend:', err));
    const nextExams = exams.filter((e) => e.id !== id);
    persistExams(nextExams);
    if (activeExamId === id) {
      setActiveExamId(nextExams[0]?.id || '');
    }
    addToast({
      type: 'info',
      title: 'Prova Arquivada',
      message: 'O modelo de prova foi removido.',
    });
  };

  // =========================================================================
  // APPLICATIONS & CORRECTIONS
  // =========================================================================
  const createApplication = (
    examId: string,
    classId: string,
    options: {
      withStudentIdentification: boolean;
      numberOfVersions: number;
      shuffleQuestions: boolean;
      shuffleAlternatives: boolean;
    }
  ): Application => {
    const exam = exams.find((e) => e.id === examId);
    const targetClass = classes.find((c) => c.id === classId);
    if (!exam || !targetClass) {
      throw new Error('Selecione uma prova e uma turma válidas para criar a aplicação.');
    }

    const versions = buildExamVersions(
      exam.selectedQuestionIds,
      options.shuffleQuestions,
      options.shuffleAlternatives,
      options.numberOfVersions,
      exam.code,
      exam.id
    );

    const newApp: Application = {
      id: `app-${Date.now()}`,
      examId: exam.id,
      classId: targetClass.id,
      teacherId: currentUser.id,
      title: `Aplicação - ${exam.title} (${targetClass.name})`,
      className: targetClass.name,
      discipline: exam.discipline,
      status: 'generated',
      withStudentIdentification: options.withStudentIdentification,
      shuffleQuestions: options.shuffleQuestions,
      shuffleAlternatives: options.shuffleAlternatives,
      numberOfVersions: options.numberOfVersions,
      createdAt: new Date().toISOString(),
      versions,
      answerKeyPublished: false,
      publicCode: `PUB-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    };

    setApplications((prev) => [newApp, ...prev]);
    setActiveApplicationId(newApp.id);
    addToast({
      type: 'success',
      title: 'Aplicação Criada!',
      message: `Prova vinculada à ${targetClass.name}.`,
    });
    return newApp;
  };

  const publishAnswerKey = (applicationId: string) => {
    setApplications((prev) =>
      prev.map((app) =>
        app.id === applicationId ? { ...app, answerKeyPublished: true } : app
      )
    );
    addToast({
      type: 'success',
      title: 'Gabarito Oficial Publicado!',
      message: 'Gabarito marcado como publicado para esta aplicação.',
    });
  };

  const addCorrection = (
    correctionData: Omit<Correction, 'id' | 'confirmedAt'> & { id?: string; confirmedAt?: string }
  ): Correction => {
    const newCorrection: Correction = {
      ...correctionData,
      id: correctionData.id || `corr-${Date.now()}`,
      confirmedAt: correctionData.confirmedAt || new Date().toISOString(),
    };
    setCorrections((prev) => [newCorrection, ...prev]);

    if (!newCorrection.studentId) {
      setCurrentReport((prev) => ({
        ...prev,
        pendingCorrectionsCount: (prev.pendingCorrectionsCount || 0) + 1,
      }));
    }

    return newCorrection;
  };

  const assignCorrection = (correctionId: string, studentId: string, notes?: string) => {
    api
      .assignStudentToCorrection(correctionId, studentId)
      .catch((err) => console.warn('Aviso ao vincular correção no backend:', err));
    const student = students.find((s) => s.id === studentId);
    setCorrections((prev) =>
      prev.map((c) =>
        c.id === correctionId
          ? {
              ...c,
              studentId,
              studentName: student?.name,
              registration: student?.registration,
              notes,
              isAutomaticallyAssigned: false,
            }
          : c
      )
    );

    setCurrentReport((prev) => ({
      ...prev,
      pendingCorrectionsCount: Math.max(0, (prev.pendingCorrectionsCount || 1) - 1),
    }));

    addToast({
      type: 'success',
      title: 'Nota Atribuída ao Aluno!',
      message: `A prova física foi vinculada a ${student?.name || 'aluno'} com sucesso.`,
    });
  };

  const loadExamToDraft = (id: string) => {
    const target = exams.find((e) => e.id === id);
    if (!target) return;

    setExamDraft({
      id: target.id,
      title: target.title,
      discipline: target.discipline,
      course: target.course || '',
      classGroup: target.classGroup || '',
      semester: target.semester || '',
      institution: target.institution || '',
      department: target.department || '',
      date: target.date || '',
      duration: target.duration || '',
      instructions: target.instructions || '',
      selectedQuestionIds: target.selectedQuestionIds || [],
      withStudentIdentification: target.withStudentIdentification ?? true,
      shuffleQuestions: target.shuffleQuestions ?? true,
      shuffleAlternatives: target.shuffleAlternatives ?? true,
      numberOfVersions: target.numberOfVersions || 4,
      maxScore: target.maxScore || 10,
      permutationStrategy: target.permutationStrategy || 'FISHER_YATES',
    });
    setExamWizardStep(1);
  };

  const resetExamDraft = () => {
    setExamDraft(getDefaultDraft());
    setExamWizardStep(1);
  };

  // =========================================================================
  // STUDENTS
  // =========================================================================
  const addStudent = (stdData: Omit<Student, 'id'>): Student => {
    const tempId = `std-${Date.now()}`;
    const newStudent: Student = {
      ...stdData,
      id: tempId,
    };
    setStudents((prev) => [newStudent, ...prev]);

    api
      .createStudent(stdData)
      .then((createdRemote) => {
        if (createdRemote?.id) {
          setStudents((prev) =>
            prev.map((s) => (s.id === tempId ? { ...s, id: createdRemote.id } : s))
          );
        }
      })
      .catch((err) => {
        addToast({
          type: 'warning',
          title: 'Aviso ao Salvar Aluno',
          message: err?.message || 'Não foi possível sincronizar o aluno com o servidor.',
        });
      });

    addToast({
      type: 'success',
      title: 'Aluno Cadastrado!',
      message: `${newStudent.name} (${newStudent.registration}) inserido com sucesso.`,
    });
    return newStudent;
  };

  const importStudents = (newStudentsList: Omit<Student, 'id'>[]) => {
    const mapped = newStudentsList.map((s, idx) => ({
      ...s,
      id: `std-imp-${Date.now()}-${idx}`,
    }));
    setStudents((prev) => [...mapped, ...prev]);

    api
      .importStudentsBatch(newStudentsList)
      .then((savedList) => {
        if (Array.isArray(savedList) && savedList.length > 0) {
          api
            .getStudents()
            .then((fresh) => {
              if (Array.isArray(fresh)) setStudents(fresh);
            })
            .catch(() => {});
        }
      })
      .catch((err) => console.warn('Aviso de importação no backend:', err));

    addToast({
      type: 'success',
      title: 'Importação Concluída!',
      message: `${mapped.length} alunos importados da planilha.`,
    });
  };

  const deleteStudent = (id: string) => {
    api.deleteStudent(id).catch((err) => console.warn('Aviso ao excluir aluno:', err));
    setStudents((prev) => prev.filter((s) => s.id !== id));
    addToast({
      type: 'warning',
      title: 'Aluno Removido',
      message: 'O aluno foi desvinculado; o histórico de notas permanece preservado.',
    });
  };

  const deleteStudentsBatch = (ids: string[]) => {
    api.deleteStudentsBatch(ids).catch((err) => console.warn('Aviso na exclusão em lote:', err));
    setStudents((prev) => prev.filter((s) => !ids.includes(s.id)));
    addToast({
      type: 'warning',
      title: 'Exclusão em Massa',
      message: `${ids.length} alunos foram removidos.`,
    });
  };

  // =========================================================================
  // NAVIGATION HELPERS
  // =========================================================================
  const handleSetCurrentScreen = (screen: ScreenType) => {
    setCurrentScreenState(screen);
    const resolvedExamId = activeExamId || exams[0]?.id;
    const routeMap: Record<ScreenType, string> = {
      'banco-questoes': '/banco-questoes',
      turmas: '/turmas',
      'criar-prova': '/provas/new',
      aplicacoes: '/provas',
      'folha-respostas': resolvedExamId ? `/provas/${resolvedExamId}?p=folha` : '/provas',
      'pre-visualizacao': resolvedExamId ? `/provas/${resolvedExamId}?p=caderno` : '/provas',
      resultados: '/resultados',
      'lancamento-manual': resolvedExamId ? `/provas/${resolvedExamId}?p=lancamento` : '/provas',
      alunos: '/alunos',
      'portal-aluno': '/portal-aluno',
      configuracoes: '/configuracoes',
    };
    if (routeMap[screen]) {
      router.push(routeMap[screen]);
    }
  };

  const navigateToPreview = (examId?: string) => {
    const targetId = examId || activeExamId || exams[0]?.id;
    if (targetId) setActiveExamId(targetId);
    setCurrentScreenState('pre-visualizacao');
    router.push(targetId ? `/provas/${targetId}?p=caderno` : '/provas');
  };

  const navigateToResults = (examId?: string) => {
    const targetId = examId || activeExamId || exams[0]?.id;
    if (targetId) setActiveExamId(targetId);
    setCurrentScreenState('resultados');
    router.push(targetId ? `/resultados?examId=${targetId}` : '/resultados');
  };

  const navigateToFolha = (examId?: string) => {
    const targetId = examId || activeExamId || exams[0]?.id;
    if (targetId) setActiveExamId(targetId);
    setCurrentScreenState('folha-respostas');
    router.push(targetId ? `/provas/${targetId}?p=folha` : '/provas');
  };

  const navigateToTurmas = () => {
    setCurrentScreenState('turmas');
    router.push('/turmas');
  };

  const navigateToAplicacoes = () => {
    setCurrentScreenState('aplicacoes');
    router.push('/provas');
  };

  return (
    <AppContext.Provider
      value={{
        currentScreen,
        setCurrentScreen: handleSetCurrentScreen,
        isAuthenticated,
        isAuthLoading,
        currentUser,
        authView,
        setAuthView,
        authPrefillEmail,
        setAuthPrefillEmail,
        login,
        registerAccount,
        changePassword,
        requestPasswordReset,
        resetPassword,
        logout,
        anonymizeUser,
        searchQuery,
        setSearchQuery,
        disciplines,
        addDiscipline,
        deleteDiscipline,
        classes,
        activeClassId,
        setActiveClassId,
        selectedClass,
        addClass,
        updateClass,
        archiveClass,
        regenerateInviteCode,
        questions,
        addQuestion,
        updateQuestion,
        deleteQuestion,
        exams,
        refreshExams,
        activeExamId,
        setActiveExamId,
        selectedExam,
        createExamFromDraft,
        updateExam,
        updateExamPrintConfig,
        reshuffleExamStudents,
        deleteExam,
        duplicateExam,
        applications,
        activeApplicationId,
        setActiveApplicationId,
        selectedApplication,
        createApplication,
        publishAnswerKey,
        corrections,
        addCorrection,
        assignCorrection,
        examDraft,
        setExamDraft,
        examWizardStep,
        setExamWizardStep,
        resetExamDraft,
        loadExamToDraft,
        previewVersion,
        setPreviewVersion,
        showAnswerKeyInPreview,
        setShowAnswerKeyInPreview,
        showQrCodeInPreview,
        setShowQrCodeInPreview,
        previewZoom,
        setPreviewZoom,
        previewPage,
        setPreviewPage,
        withStudentIdentificationPreview,
        setWithStudentIdentificationPreview,
        students,
        addStudent,
        importStudents,
        deleteStudent,
        deleteStudentsBatch,
        currentReport,
        isNewQuestionModalOpen,
        setIsNewQuestionModalOpen,
        editingQuestion,
        setEditingQuestion,
        isNewStudentModalOpen,
        setIsNewStudentModalOpen,
        isExcelImportModalOpen,
        setIsExcelImportModalOpen,
        isScannerModalOpen,
        setIsScannerModalOpen,
        toasts,
        addToast,
        removeToast,
        navigateToPreview,
        navigateToResults,
        navigateToFolha,
        navigateToTurmas,
        navigateToAplicacoes,
        isBackendOnline,
        backendUrl,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp deve ser usado dentro de um AppProvider');
  }
  return context;
};
