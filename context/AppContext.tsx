'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  ScreenType,
  Question,
  Exam,
  Student,
  ExamReport,
  ExamVersion,
  DifficultyLevel,
  Alternative,
} from '@/lib/types';
import {
  INITIAL_QUESTIONS,
  INITIAL_STUDENTS,
  INITIAL_EXAMS,
  INITIAL_REPORT,
} from '@/lib/mock-data';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
}

interface ExamDraft {
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
  shuffleQuestions: boolean;
  shuffleAlternatives: boolean;
  numberOfVersions: number;
  maxScore: number;
}

interface AppContextType {
  currentScreen: ScreenType;
  setCurrentScreen: (screen: ScreenType) => void;
  
  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Questions
  questions: Question[];
  addQuestion: (question: Omit<Question, 'id' | 'code'>) => Question;
  updateQuestion: (id: string, question: Partial<Question>) => void;
  deleteQuestion: (id: string) => void;
  
  // Exams
  exams: Exam[];
  activeExamId: string;
  setActiveExamId: (id: string) => void;
  selectedExam: Exam | undefined;
  createExamFromDraft: (draft: ExamDraft) => Exam;
  deleteExam: (id: string) => void;
  
  // Exam Wizard Draft
  examDraft: ExamDraft;
  setExamDraft: React.Dispatch<React.SetStateAction<ExamDraft>>;
  examWizardStep: number;
  setExamWizardStep: (step: number) => void;
  resetExamDraft: () => void;

  // Print Preview state
  previewVersion: 'A' | 'B' | 'C' | 'D';
  setPreviewVersion: (v: 'A' | 'B' | 'C' | 'D') => void;
  showAnswerKeyInPreview: boolean;
  setShowAnswerKeyInPreview: (show: boolean) => void;
  showQrCodeInPreview: boolean;
  setShowQrCodeInPreview: (show: boolean) => void;
  previewZoom: number;
  setPreviewZoom: (zoom: number) => void;
  previewPage: number;
  setPreviewPage: (page: number) => void;

  // Students
  students: Student[];
  addStudent: (student: Omit<Student, 'id'>) => Student;
  importStudents: (students: Omit<Student, 'id'>[]) => void;
  deleteStudent: (id: string) => void;
  deleteStudentsBatch: (ids: string[]) => void;

  // Results & Reports
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
}

const DEFAULT_EXAM_DRAFT: ExamDraft = {
  title: 'P1 - Direito Constitucional I - Turma A',
  discipline: 'Direito Constitucional',
  course: 'Direito',
  classGroup: 'Turma A',
  semester: '2024.2',
  institution: 'UNIVERSIDADE FEDERAL DO RIO DE JANEIRO',
  department: 'Faculdade Nacional de Direito | Departamento de Direito Público',
  date: '12 Mar, 2024',
  duration: '2 horas',
  instructions: 'Marque apenas uma alternativa por questão. Preencha completamente o campo correspondente. Use apenas caneta preta ou azul. Rasuras anularão a questão. Duração máxima: 2 horas. Permitida consulta apenas a textos de lei seca sem anotações.',
  selectedQuestionIds: ['q-1024', 'q-1027', 'q-1028', 'q-1029'],
  shuffleQuestions: true,
  shuffleAlternatives: true,
  numberOfVersions: 4,
  maxScore: 10.0,
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('banco-questoes');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [questions, setQuestions] = useState<Question[]>(INITIAL_QUESTIONS);
  const [exams, setExams] = useState<Exam[]>(INITIAL_EXAMS);
  const [activeExamId, setActiveExamId] = useState<string>('exam-1');
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
  const [currentReport, setCurrentReport] = useState<ExamReport>(INITIAL_REPORT);
  
  // Exam Wizard Draft
  const [examDraft, setExamDraft] = useState<ExamDraft>(DEFAULT_EXAM_DRAFT);
  const [examWizardStep, setExamWizardStep] = useState<number>(2); // Default on Step 2 as in mockup

  // Print Preview state
  const [previewVersion, setPreviewVersion] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [showAnswerKeyInPreview, setShowAnswerKeyInPreview] = useState(true);
  const [showQrCodeInPreview, setShowQrCodeInPreview] = useState(true);
  const [previewZoom, setPreviewZoom] = useState(100);
  const [previewPage, setPreviewPage] = useState(1);

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

  // Build shuffled versions for an exam
  const buildExamVersions = (
    selectedQIds: string[],
    shuffleQ: boolean,
    shuffleAlt: boolean,
    numVersions: number
  ): ExamVersion[] => {
    const baseQuestions = selectedQIds
      .map((id) => questions.find((q) => q.id === id))
      .filter((q): q is Question => q !== undefined);

    const versionLetters: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'].slice(
      0,
      numVersions
    ) as any;

    return versionLetters.map((letter, vIdx) => {
      // If version A and no shuffle, keep original; otherwise shuffle if enabled
      let versionQuestions = [...baseQuestions];
      if (shuffleQ && vIdx > 0) {
        versionQuestions = shuffleArray(versionQuestions);
      }

      const questionsForVersion = versionQuestions.map((q, qIndex) => {
        let alts = [...q.alternatives];
        if (shuffleAlt && vIdx > 0) {
          // Shuffle alternatives while tracking the correct answer text
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
          };
        } else {
          return {
            originalQuestionId: q.id,
            orderIndex: qIndex + 1,
            statement: q.statement,
            alternatives: alts,
            correctAlternative: q.correctAlternative,
          };
        }
      });

      const answerKey: Record<number, 'A' | 'B' | 'C' | 'D' | 'E'> = {};
      questionsForVersion.forEach((qv, idx) => {
        answerKey[idx + 1] = qv.correctAlternative;
      });

      return {
        versionLetter: letter,
        questions: questionsForVersion,
        answerKey,
      };
    });
  };

  const selectedExam = exams.find((e) => e.id === activeExamId) || exams[0];

  // Question operations
  const addQuestion = (newQData: Omit<Question, 'id' | 'code'>): Question => {
    const nextCodeNum = 1024 + questions.length;
    const newQuestion: Question = {
      ...newQData,
      id: `q-${Date.now()}`,
      code: `#Q-${nextCodeNum}`,
    };
    setQuestions((prev) => [newQuestion, ...prev]);
    addToast({
      type: 'success',
      title: 'Questão Criada!',
      message: `Questão ${newQuestion.code} adicionada com sucesso ao banco.`,
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
    const target = questions.find((q) => q.id === id);
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    addToast({
      type: 'warning',
      title: 'Questão Removida',
      message: `A questão ${target?.code || ''} foi excluída.`,
    });
  };

  // Exam operations
  const createExamFromDraft = (draft: ExamDraft): Exam => {
    const versions = buildExamVersions(
      draft.selectedQuestionIds,
      draft.shuffleQuestions,
      draft.shuffleAlternatives,
      draft.numberOfVersions
    );

    const newExam: Exam = {
      id: `exam-${Date.now()}`,
      code: `#${draft.discipline.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`,
      title: draft.title,
      subtitle: `Semestre Acadêmico ${draft.semester}`,
      institution: draft.institution,
      department: draft.department,
      course: draft.course,
      discipline: draft.discipline,
      classGroup: draft.classGroup,
      semester: draft.semester,
      date: draft.date,
      duration: draft.duration,
      instructions: draft.instructions,
      status: 'Pendente',
      shuffleQuestions: draft.shuffleQuestions,
      shuffleAlternatives: draft.shuffleAlternatives,
      numberOfVersions: draft.numberOfVersions,
      selectedQuestionIds: draft.selectedQuestionIds,
      versions,
      maxScore: draft.maxScore,
      totalStudents: 32,
      averageScore: 0,
    };

    setExams((prev) => [newExam, ...prev]);
    setActiveExamId(newExam.id);
    addToast({
      type: 'success',
      title: 'Prova Criada com Sucesso!',
      message: `A prova "${newExam.title}" com ${draft.numberOfVersions} cadernos foi gerada.`,
    });
    return newExam;
  };

  const deleteExam = (id: string) => {
    setExams((prev) => prev.filter((e) => e.id !== id));
    addToast({
      type: 'info',
      title: 'Prova Removida',
      message: 'A avaliação foi excluída do sistema.',
    });
  };

  const resetExamDraft = () => {
    setExamDraft(DEFAULT_EXAM_DRAFT);
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
      title: 'Aluno Removido',
      message: 'O cadastro do aluno foi desvinculado.',
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
  const navigateToPreview = (examId?: string) => {
    if (examId) setActiveExamId(examId);
    setCurrentScreen('pre-visualizacao');
  };

  const navigateToResults = (examId?: string) => {
    if (examId) setActiveExamId(examId);
    setCurrentScreen('resultados');
  };

  const navigateToFolha = (examId?: string) => {
    if (examId) setActiveExamId(examId);
    setCurrentScreen('folha-respostas');
  };

  return (
    <AppContext.Provider
      value={{
        currentScreen,
        setCurrentScreen,
        searchQuery,
        setSearchQuery,
        questions,
        addQuestion,
        updateQuestion,
        deleteQuestion,
        exams,
        activeExamId,
        setActiveExamId,
        selectedExam,
        createExamFromDraft,
        deleteExam,
        examDraft,
        setExamDraft,
        examWizardStep,
        setExamWizardStep,
        resetExamDraft,
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
