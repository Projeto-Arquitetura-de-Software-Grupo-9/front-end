'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ScreenType,
  Question,
  Exam,
  Student,
  ExamReport,
  ExamVersion,
  DifficultyLevel,
  Alternative,
  Class,
  Discipline,
  Application,
  Correction,
  User,
  UserRole,
} from '@/lib/types';
import {
  INITIAL_QUESTIONS,
  INITIAL_STUDENTS,
  INITIAL_EXAMS,
  INITIAL_REPORT,
  INITIAL_CLASSES,
  INITIAL_DISCIPLINES,
  INITIAL_APPLICATIONS,
  INITIAL_CORRECTIONS,
  CURRENT_USER,
  CURRENT_STUDENT_USER,
  getVersionLetters,
  generateRandomStudentAssignments,
} from '@/lib/mock-data';
import { api, API_BASE_URL } from '@/lib/api';

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
  
  // LGPD & Auth (Features 1 & 1.1)
  isAuthenticated: boolean;
  currentUser: User;
  login: (role: UserRole, email?: string) => void;
  logout: () => void;
  anonymizeUser: () => void;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Disciplines
  disciplines: Discipline[];
  addDiscipline: (data: { name: string; code?: string; course?: string }) => Discipline;
  deleteDiscipline: (id: string) => void;

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
  activeExamId: string;
  setActiveExamId: (id: string) => void;
  selectedExam: Exam | undefined;
  createExamFromDraft: (draft: ExamDraft) => Exam;
  updateExam: (id: string, draft: ExamDraft) => Exam;
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
  duplicateExam: (id: string) => Exam;
  
  // Applications (Feature 5, 6 - Prova aplicada a Turma)
  applications: Application[];
  activeApplicationId: string;
  setActiveApplicationId: (id: string) => void;
  selectedApplication: Application | undefined;
  createApplication: (examId: string, classId: string, options: {
    withStudentIdentification: boolean;
    numberOfVersions: number;
    shuffleQuestions: boolean;
    shuffleAlternatives: boolean;
  }) => Application;
  publishAnswerKey: (applicationId: string) => void;

  // Corrections & Pending manual assignment (Feature 8, 9)
  corrections: Correction[];
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

  // Backend QAS Connection Status
  isBackendOnline: boolean;
  backendUrl: string;
}

const BLANK_EXAM_DRAFT: ExamDraft = {
  title: '',
  discipline: 'Direito Constitucional',
  course: 'Direito',
  classGroup: 'Turma A',
  semester: '2026.1',
  institution: 'CATÓLICA DE SANTA CATARINA',
  department: 'Curso de Direito | Departamento de Ciências Jurídicas',
  date: '15 Mar, 2026',
  duration: '2 horas',
  instructions:
    'Marque apenas uma alternativa por questão. Preencha completamente o campo correspondente. Use apenas caneta preta ou azul. Rasuras anularão a questão. Duração máxima: 2 horas. Permitida consulta apenas a textos de lei seca sem anotações.',
  selectedQuestionIds: [],
  withStudentIdentification: true,
  shuffleQuestions: true,
  shuffleAlternatives: true,
  numberOfVersions: 4,
  maxScore: 10.0,
  permutationStrategy: 'FISHER_YATES',
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const [currentScreen, setCurrentScreenState] = useState<ScreenType>('banco-questoes');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Auth & LGPD
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User>(CURRENT_USER);

  // Core Data
  const [questions, setQuestions] = useState<Question[]>(INITIAL_QUESTIONS);
  const [disciplines, setDisciplines] = useState<Discipline[]>(INITIAL_DISCIPLINES);
  const [classes, setClasses] = useState<Class[]>(INITIAL_CLASSES);
  const [activeClassId, setActiveClassId] = useState<string>('class-1');
  const [exams, setExams] = useState<Exam[]>(INITIAL_EXAMS);
  const [activeExamId, setActiveExamId] = useState<string>('exam-1');
  const [applications, setApplications] = useState<Application[]>(INITIAL_APPLICATIONS);
  const [activeApplicationId, setActiveApplicationId] = useState<string>('app-1');
  const [corrections, setCorrections] = useState<Correction[]>(INITIAL_CORRECTIONS);
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
  const [currentReport, setCurrentReport] = useState<ExamReport>({
    ...INITIAL_REPORT,
    medianScore: 8.0,
    standardDeviation: 1.45,
    pendingCorrectionsCount: 2,
  });
  
  // Exam Wizard Draft: starts cleanly on Step 1 with clean draft
  const [examDraft, setExamDraft] = useState<ExamDraft>(BLANK_EXAM_DRAFT);
  const [examWizardStep, setExamWizardStep] = useState<number>(1);

  // Backend QAS Connectivity State
  const [isBackendOnline, setIsBackendOnline] = useState<boolean>(false);
  const [backendUrl] = useState<string>(API_BASE_URL);

  // Sincronização inicial com o backend em QAS
  useEffect(() => {
    let isMounted = true;
    async function syncWithBackend() {
      try {
        const health = await api.checkHealth();
        if (isMounted) {
          setIsBackendOnline(health.online);
          if (health.online) {
            console.log('🌐 Conectado ao backend QAS:', API_BASE_URL);
            try {
              const [remoteStudents, remoteDisciplines, remoteClasses] = await Promise.all([
                api.getStudents().catch(() => []),
                api.getDisciplinas().catch(() => []),
                api.getTurmas().catch(() => []),
              ]);
              if (isMounted) {
                if (remoteStudents.length > 0) setStudents(remoteStudents);
                if (remoteDisciplines.length > 0) setDisciplines(remoteDisciplines);
                if (remoteClasses.length > 0) setClasses(remoteClasses);
              }
            } catch (syncErr) {
              console.warn('Sincronização parcial com QAS:', syncErr);
            }
          }
        }
      } catch (err) {
        if (isMounted) setIsBackendOnline(false);
      }
    }
    syncWithBackend();
    return () => {
      isMounted = false;
    };
  }, []);

  // LocalStorage Persistence for Exams & Disciplines
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('correge_exams_v1');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setExams(parsed);
            if (parsed[0]?.id) setActiveExamId(parsed[0].id);
          }
        }
        const storedDisc = localStorage.getItem('correge_disciplines_v1');
        if (storedDisc) {
          const parsedDisc = JSON.parse(storedDisc);
          if (Array.isArray(parsedDisc) && parsedDisc.length > 0) {
            setDisciplines(parsedDisc);
          }
        }
      } catch (e) {
        console.error('Failed to load from localStorage:', e);
      }
    }
  }, []);

  const persistExams = (newExams: Exam[]) => {
    setExams(newExams);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('correge_exams_v1', JSON.stringify(newExams));
      } catch (e) {
        console.error('Failed to save exams to localStorage:', e);
      }
    }
  };

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

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
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
    numVersions: number
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
          
          let newCorrectLetter: 'A' | 'B' | 'C' | 'D' | 'E' = 'A';
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
      questionsForVersion.forEach((qv, idx) => {
        answerKey[idx + 1] = qv.correctAlternative;
      });

      return {
        id: `version-${letter}`,
        versionLetter: letter,
        versionNumber: vIdx + 1,
        questions: questionsForVersion,
        answerKey,
        publicCode: `PUB-KEY-${letter}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        qrCodePayload: `CATOLICA-OMR:V=${letter}:APP=APP1`,
        answerKeyPublished: false,
      };
    });
  };

  const selectedExam = exams.find((e) => e.id === activeExamId) || exams[0];
  const selectedClass = classes.find((c) => c.id === activeClassId) || classes[0];
  const selectedApplication = applications.find((a) => a.id === activeApplicationId) || applications[0];

  // LGPD Anonymization (Feature 1.1)
  const anonymizeUser = () => {
    setCurrentUser((prev) => ({
      ...prev,
      fullName: 'Usuário Removido',
      email: `anon-${prev.id}@removido.local`,
      anonymizedAt: new Date().toISOString(),
    }));
    addToast({
      type: 'warning',
      title: 'Conta Anonimizada (LGPD)',
      message: 'Seus dados pessoais foram substituídos por identificadores anônimos. Suas provas e notas foram preservadas.',
    });
  };

  const login = (role: UserRole, email?: string) => {
    if (role === 'estudante') {
      setCurrentUser({
        ...CURRENT_STUDENT_USER,
        email: email || CURRENT_STUDENT_USER.email,
      });
      setIsAuthenticated(true);
      setCurrentScreenState('portal-aluno');
      router.push('/portal-aluno');
      addToast({
        type: 'success',
        title: 'Bem-vinda, Amanda!',
        message: 'Acesso autenticado ao Portal do Aluno (Católica SC).',
      });
    } else {
      setCurrentUser({
        ...CURRENT_USER,
        email: email || CURRENT_USER.email,
      });
      setIsAuthenticated(true);
      setCurrentScreenState('banco-questoes');
      router.push('/provas');
      addToast({
        type: 'success',
        title: 'Bem-vindo, Professor!',
        message: 'Acesso autenticado ao Painel Docente.',
      });
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    addToast({
      type: 'info',
      title: 'Sessão Encerrada',
      message: 'Você saiu da conta institucional.',
    });
  };

  // Discipline operations
  const persistDisciplines = (next: Discipline[]) => {
    setDisciplines(next);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('correge_disciplines_v1', JSON.stringify(next));
      } catch (e) {
        console.error('Failed to save disciplines:', e);
      }
    }
  };

  const addDiscipline = (data: { name: string; code?: string; course?: string }): Discipline => {
    const cleanName = data.name.trim();
    const existing = disciplines.find((d) => d.name.toLowerCase() === cleanName.toLowerCase());
    if (existing) return existing;

    const generatedCode =
      data.code?.trim().toUpperCase() ||
      `${cleanName.substring(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    const newDisc: Discipline = {
      id: `disc-${Date.now()}`,
      teacherId: currentUser.id,
      code: generatedCode,
      name: cleanName,
      course: data.course?.trim() || 'Direito',
      createdAt: new Date().toISOString(),
    };

    const next = [...disciplines, newDisc];
    persistDisciplines(next);
    addToast({
      type: 'success',
      title: 'Disciplina Criada!',
      message: `${newDisc.name} (${newDisc.code}) adicionada ao sistema.`,
    });
    return newDisc;
  };

  const deleteDiscipline = (id: string) => {
    const target = disciplines.find((d) => d.id === id);
    const next = disciplines.filter((d) => d.id !== id);
    persistDisciplines(next);
    addToast({
      type: 'info',
      title: 'Disciplina Removida',
      message: target ? `"${target.name}" foi removida.` : 'Disciplina removida.',
    });
  };

  // Class operations (Feature 3)
  const addClass = (clsData: Omit<Class, 'id' | 'createdAt' | 'inviteCode' | 'teacherId'>): Class => {
    const randomCode = `CAT-${clsData.subject.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newClass: Class = {
      ...clsData,
      id: `class-${Date.now()}`,
      teacherId: currentUser.id,
      inviteCode: randomCode,
      createdAt: new Date().toISOString(),
      studentCount: 0,
      status: 'active',
    };
    setClasses((prev) => [newClass, ...prev]);
    addToast({
      type: 'success',
      title: 'Turma Criada com Sucesso!',
      message: `Código de convite: ${newClass.inviteCode}`,
    });
    return newClass;
  };

  const updateClass = (id: string, data: Partial<Class>) => {
    setClasses((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)));
    addToast({
      type: 'info',
      title: 'Turma Atualizada',
      message: 'Informações da turma salvas.',
    });
  };

  const archiveClass = (id: string) => {
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
    const newCode = `CAT-${(target?.subject || 'TUR').substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
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

  // Question operations (Feature 2)
  const addQuestion = (newQData: Omit<Question, 'id' | 'code'>): Question => {
    const nextCodeNum = 1024 + questions.length;
    const isDisc = newQData.type === 'discursiva';
    const newQuestion: Question = {
      ...newQData,
      id: `q-${Date.now()}`,
      code: isDisc ? `#Q-DISC-${nextCodeNum}` : `#Q-${nextCodeNum}`,
      type: newQData.type || 'objetiva',
    };
    setQuestions((prev) => [newQuestion, ...prev]);
    addToast({
      type: 'success',
      title: isDisc ? 'Questão Discursiva Adicionada!' : 'Questão Objetiva Adicionada!',
      message: `Questão ${newQuestion.code} cadastrada no banco.`,
    });
    return newQuestion;
  };

  const updateQuestion = (id: string, updatedData: Partial<Question>) => {
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
    // Soft-delete as requested by Feature 2
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === id ? { ...q, deletedAt: new Date().toISOString() } : q
      )
    );
    addToast({
      type: 'warning',
      title: 'Questão Removida (Soft-delete)',
      message: 'A questão foi arquivada e não será incluída em novas provas.',
    });
  };

  // Exam operations (Feature 4 - Templates)
  const createExamFromDraft = (draft: ExamDraft): Exam => {
    // Enforce up to 20 questions limit
    if (draft.selectedQuestionIds.length > 20) {
      addToast({
        type: 'error',
        title: 'Limite Excedido',
        message: 'A prova pode conter no máximo 20 questões conforme a especificação.',
      });
    }

    const versions = buildExamVersions(
      draft.selectedQuestionIds.slice(0, 20),
      draft.shuffleQuestions,
      draft.shuffleAlternatives,
      draft.numberOfVersions
    );

    const studentAssignments = generateRandomStudentAssignments(
      students,
      draft.numberOfVersions
    );

    const newExam: Exam = {
      id: `exam-${Date.now()}`,
      teacherId: currentUser.id,
      code: `#${draft.discipline.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`,
      title: draft.title,
      description: draft.instructions,
      subtitle: `Período Letivo ${draft.semester}`,
      institution: draft.institution,
      department: draft.department,
      course: draft.course,
      discipline: draft.discipline,
      classGroup: draft.classGroup,
      semester: draft.semester,
      date: draft.date,
      duration: draft.duration,
      instructions: draft.instructions,
      status: 'ready',
      withStudentIdentification: draft.withStudentIdentification ?? true,
      shuffleQuestions: draft.shuffleQuestions,
      shuffleAlternatives: draft.shuffleAlternatives,
      numberOfVersions: draft.numberOfVersions,
      permutationStrategy: draft.permutationStrategy || 'FISHER_YATES',
      selectedQuestionIds: draft.selectedQuestionIds,
      versions,
      studentAssignments,
      maxScore: draft.maxScore,
      totalStudents: students.length > 0 ? students.length : 32,
      averageScore: 0,
      createdAt: new Date().toISOString(),
    };

    const nextExams = [newExam, ...exams];
    persistExams(nextExams);
    setActiveExamId(newExam.id);
    addToast({
      type: 'success',
      title: 'Template de Prova Salvo!',
      message: `A prova "${newExam.title}" está pronta para ser aplicada a uma turma.`,
    });
    return newExam;
  };

  const updateExam = (id: string, draft: ExamDraft): Exam => {
    const existing = exams.find((e) => e.id === id);
    if (!existing) {
      return createExamFromDraft(draft);
    }

    const versions = buildExamVersions(
      draft.selectedQuestionIds,
      draft.shuffleQuestions,
      draft.shuffleAlternatives,
      draft.numberOfVersions
    );

    const studentAssignments = generateRandomStudentAssignments(
      students,
      draft.numberOfVersions
    );

    const updatedExam: Exam = {
      ...existing,
      title: draft.title,
      discipline: draft.discipline,
      course: draft.course,
      classGroup: draft.classGroup,
      semester: draft.semester,
      institution: draft.institution,
      department: draft.department,
      date: draft.date,
      duration: draft.duration,
      instructions: draft.instructions,
      selectedQuestionIds: draft.selectedQuestionIds,
      withStudentIdentification: draft.withStudentIdentification ?? true,
      shuffleQuestions: draft.shuffleQuestions,
      shuffleAlternatives: draft.shuffleAlternatives,
      numberOfVersions: draft.numberOfVersions,
      permutationStrategy: draft.permutationStrategy || 'FISHER_YATES',
      maxScore: draft.maxScore,
      versions,
      studentAssignments,
    };

    const nextExams = exams.map((e) => (e.id === id ? updatedExam : e));
    persistExams(nextExams);
    setActiveExamId(updatedExam.id);
    addToast({
      type: 'success',
      title: 'Prova Atualizada com Sucesso!',
      message: `As alterações em "${updatedExam.title}" foram salvas.`,
    });
    return updatedExam;
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
      nextNumVersions
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

    const nextExams = exams.map((e) => (e.id === id ? updatedExam : e));
    persistExams(nextExams);
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

    const nextExams = exams.map((e) => (e.id === id ? updatedExam : e));
    persistExams(nextExams);
    addToast({
      type: 'info',
      title: 'Novo Sorteio de Cadernos Realizado!',
      message: `Os ${students.length} alunos foram redistribuídos aleatoriamente entre os ${numV} cadernos.`,
    });
  };

  const duplicateExam = (id: string): Exam => {
    const original = exams.find((e) => e.id === id);
    if (!original) throw new Error('Prova não encontrada');

    const copy: Exam = {
      ...original,
      id: `exam-${Date.now()}`,
      code: `${original.code}-COP`,
      title: `${original.title} (Cópia)`,
      status: 'Pendente',
    };

    const nextExams = [copy, ...exams];
    persistExams(nextExams);
    setActiveExamId(copy.id);
    addToast({
      type: 'success',
      title: 'Prova Duplicada!',
      message: `Uma cópia de "${original.title}" foi adicionada à lista.`,
    });
    return copy;
  };

  const deleteExam = (id: string) => {
    const nextExams = exams.filter((e) => e.id !== id);
    persistExams(nextExams);
    if (activeExamId === id && nextExams.length > 0) {
      setActiveExamId(nextExams[0].id);
    }
    addToast({
      type: 'info',
      title: 'Prova Arquivada',
      message: 'O modelo de prova foi arquivado.',
    });
  };

  // Application operations (Feature 5, 6 - Prova x Turma)
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
    const exam = exams.find((e) => e.id === examId) || exams[0];
    const targetClass = classes.find((c) => c.id === classId) || classes[0];

    const versions = buildExamVersions(
      exam.selectedQuestionIds,
      options.shuffleQuestions,
      options.shuffleAlternatives,
      options.numberOfVersions
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
      pdfUrl: `/storage/applications/app-${Date.now()}-consolidated.pdf`,
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
      message: `Prova vinculada à ${targetClass.name}. PDF consolidado disponível.`,
    });
    return newApp;
  };

  // Publish Answer Key (Feature 7)
  const publishAnswerKey = (applicationId: string) => {
    setApplications((prev) =>
      prev.map((app) =>
        app.id === applicationId ? { ...app, answerKeyPublished: true } : app
      )
    );
    addToast({
      type: 'success',
      title: 'Gabarito Oficial Publicado!',
      message: 'Os alunos já podem consultar as respostas pelo portal web usando o código público.',
    });
  };

  // Manual Assignment of pending correction (Feature 9)
  const assignCorrection = (correctionId: string, studentId: string, notes?: string) => {
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

    // Update report pending count
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
    setExamDraft(BLANK_EXAM_DRAFT);
    setExamWizardStep(1);
  };

  // Student operations
  const addStudent = (stdData: Omit<Student, 'id'>): Student => {
    const newStudent: Student = {
      ...stdData,
      id: `std-${Date.now()}`,
    };
    setStudents((prev) => [newStudent, ...prev]);
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
    addToast({
      type: 'success',
      title: 'Importação Concluída!',
      message: `${mapped.length} alunos importados da planilha com sucesso.`,
    });
  };

  const deleteStudent = (id: string) => {
    setStudents((prev) => prev.filter((s) => s.id !== id));
    addToast({
      type: 'warning',
      title: 'Aluno Removido da Turma',
      message: 'O aluno foi desvinculado, mas seu histórico de notas permanece preservado.',
    });
  };

  const deleteStudentsBatch = (ids: string[]) => {
    setStudents((prev) => prev.filter((s) => !ids.includes(s.id)));
    addToast({
      type: 'warning',
      title: 'Exclusão em Massa',
      message: `${ids.length} alunos foram removidos com sucesso.`,
    });
  };

  // Navigation helpers
  const handleSetCurrentScreen = (screen: ScreenType) => {
    setCurrentScreenState(screen);
    const routeMap: Record<ScreenType, string> = {
      'banco-questoes': '/banco-questoes',
      'turmas': '/turmas',
      'criar-prova': '/provas/new',
      'aplicacoes': '/provas',
      'folha-respostas': `/provas/${activeExamId || 'exam-1'}?p=folha`,
      'pre-visualizacao': `/provas/${activeExamId || 'exam-1'}?p=caderno`,
      'resultados': '/resultados',
      'lancamento-manual': `/provas/${activeExamId || 'exam-2'}?p=lancamento`,
      'alunos': '/alunos',
      'portal-aluno': '/portal-aluno',
      'configuracoes': '/configuracoes',
    };
    if (routeMap[screen]) {
      router.push(routeMap[screen]);
    }
  };

  const navigateToPreview = (examId?: string) => {
    const targetId = examId || activeExamId;
    if (targetId) setActiveExamId(targetId);
    setCurrentScreenState('pre-visualizacao');
    if (targetId) router.push(`/provas/${targetId}?p=caderno`);
  };

  const navigateToResults = (examId?: string) => {
    const targetId = examId || activeExamId;
    if (targetId) setActiveExamId(targetId);
    setCurrentScreenState('resultados');
    router.push(targetId ? `/resultados?examId=${targetId}` : '/resultados');
  };

  const navigateToFolha = (examId?: string) => {
    const targetId = examId || activeExamId;
    if (targetId) setActiveExamId(targetId);
    setCurrentScreenState('folha-respostas');
    if (targetId) router.push(`/provas/${targetId}?p=folha`);
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
        currentUser,
        login,
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
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
