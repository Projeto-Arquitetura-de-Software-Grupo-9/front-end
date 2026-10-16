export type ScreenType =
  | 'banco-questoes'
  | 'turmas'
  | 'criar-prova'
  | 'aplicacoes'
  | 'folha-respostas'
  | 'pre-visualizacao'
  | 'resultados'
  | 'lancamento-manual'
  | 'alunos'
  | 'portal-aluno'
  | 'configuracoes';

export type UserRole = 'professor' | 'estudante';

export interface User {
  id: string;
  role: UserRole;
  fullName: string;
  email: string;
  createdAt: string;
  anonymizedAt?: string;
}

export interface Class {
  id: string;
  teacherId: string;
  name: string;
  subject: string;
  term: string; // ex: "2026/1"
  status: 'active' | 'archived';
  inviteCode: string; // único e regenerável
  createdAt: string;
  studentCount?: number;
}

export interface ClassEnrollment {
  id: string;
  classId: string;
  studentId: string;
  status: 'active' | 'removed';
  enrolledVia: 'teacher' | 'invite_code';
  enrolledAt: string;
}

export type DifficultyLevel = 'Fácil' | 'Médio' | 'Difícil';
export type QuestionType = 'objetiva' | 'discursiva';

export interface Alternative {
  id: string;
  letter: 'A' | 'B' | 'C' | 'D' | 'E';
  text: string;
}

export interface Question {
  id: string;
  teacherId?: string;
  code: string; // e.g. #Q-1024
  type?: QuestionType; // 'objetiva' | 'discursiva' (default 'objetiva')
  discipline: string; // e.g. "Cálculo I", "Física II", "Álgebra Linear"
  difficulty: DifficultyLevel;
  topic?: string;
  tags?: string[];
  statement: string; // Enunciado (suporta Markdown básico)
  alternatives: Alternative[]; // 2 a 5 alternativas se objetiva
  correctAlternative: 'A' | 'B' | 'C' | 'D' | 'E';
  points?: number; // Pontuação individual (sem validação de soma)
  maxScore?: number; // Para discursivas
  explanation?: string;
  deletedAt?: string; // Soft-delete
}

export interface ExamVersion {
  id?: string;
  applicationId?: string;
  versionLetter: 'A' | 'B' | 'C' | 'D';
  versionNumber?: number;
  shuffleQuestions?: boolean;
  shuffleAlternatives?: boolean;
  withStudentIdentification?: boolean;
  questions: {
    originalQuestionId: string;
    orderIndex: number;
    statement: string;
    alternatives: Alternative[];
    correctAlternative: 'A' | 'B' | 'C' | 'D' | 'E';
  }[];
  layout?: {
    questionOrder: string[];
    alternativeOrder: {
      questionId: string;
      printedOrder: string[];
    }[];
  };
  answerKey: Record<number, 'A' | 'B' | 'C' | 'D' | 'E'>; // question number (1-based) -> correct letter
  answerKeyPublished?: boolean;
  answerKeyPublishedAt?: string;
  publicCode?: string;
  qrCodePayload?: string;
}

export interface Application {
  id: string;
  examId: string;
  classId: string;
  teacherId?: string;
  title: string;
  className: string;
  discipline: string;
  status: 'draft' | 'generated' | 'closed';
  withStudentIdentification: boolean;
  shuffleQuestions: boolean;
  shuffleAlternatives: boolean;
  numberOfVersions: number;
  pdfUrl?: string;
  createdAt: string;
  answerKeyPublished: boolean;
  publicCode: string;
  versions?: ExamVersion[];
}

export interface ExamQuestionConfig {
  questionId: string;
  order: number;
  score: number;
}

export interface Exam {
  id: string;
  teacherId?: string;
  code: string; // e.g. #CAL-1-2024.2
  title: string; // e.g. "P1 - Cálculo I - 2024.2"
  description?: string;
  subtitle?: string;
  institution?: string;
  department?: string;
  course?: string;
  discipline: string;
  classGroup?: string;
  semester?: string;
  date?: string;
  duration?: string;
  instructions?: string;
  status: 'draft' | 'ready' | 'closed' | 'Corrigida' | 'Pendente' | 'Em Andamento';
  questionsConfig?: ExamQuestionConfig[]; // Spec model
  shuffleQuestions: boolean;
  shuffleAlternatives: boolean;
  numberOfVersions: number; // e.g. 4 (A, B, C, D)
  selectedQuestionIds: string[];
  versions: ExamVersion[];
  maxScore: number;
  totalStudents?: number;
  averageScore?: number;
  permutationStrategy?: 'FISHER_YATES' | 'CYCLIC_ROTATION';
  createdAt?: string;
  studentAssignments?: {
    studentId: string;
    studentName: string;
    registration: string;
    assignedVersion: 'A' | 'B' | 'C' | 'D';
  }[];
}

export interface Student {
  id: string;
  name: string;
  registration: string; // Matrícula e.g. 2024.1.001
  course: string;
  email: string;
  classGroup: string;
  discipline: string;
  examsTaken: number;
  overallAverage: number;
}

export interface Correction {
  id: string;
  applicationId: string;
  examVersionId: string;
  versionLetter: 'A' | 'B' | 'C' | 'D';
  studentId?: string; // Ausente se prova sem identificação pendente de atribuição
  studentName?: string;
  registration?: string;
  reportedStudentName?: string; // Lido à mão pelo professor no app
  reportedStudentRegistration?: string;
  objectiveResults: {
    questionId: string;
    chosen: 'A' | 'B' | 'C' | 'D' | 'E' | null;
    correct: 'A' | 'B' | 'C' | 'D' | 'E';
    isCorrect: boolean;
    score: number;
  }[];
  discursiveScores?: { questionId: string; score: number }[];
  totalScore: number;
  maxScore: number;
  notes?: string;
  confirmedAt: string;
  correctedBy?: string;
  isAutomaticallyAssigned: boolean;
  clientCorrectionId?: string;
  syncStatus: 'pending' | 'synced' | 'error';
}

export interface StudentExamResult {
  studentId: string;
  studentName: string;
  registration: string;
  versionLetter: 'A' | 'B' | 'C' | 'D';
  score: number;
  maxScore: number;
  submittedAt: string;
  answers: Record<number, {
    chosen: 'A' | 'B' | 'C' | 'D' | 'E' | null;
    correct: 'A' | 'B' | 'C' | 'D' | 'E';
    isCorrect: boolean;
  }>;
}

export interface QuestionAnalytics {
  questionNumber: number;
  discipline: string;
  difficulty: DifficultyLevel;
  statementSnippet: string;
  correctLetter: 'A' | 'B' | 'C' | 'D' | 'E';
  correctCount: number;
  totalAnswers: number;
  correctPercentage: number;
  distribution: {
    A: number;
    B: number;
    C: number;
    D: number;
    E: number;
  };
}

export interface ExamReport {
  examId: string;
  examTitle: string;
  averageScore: number;
  medianScore?: number;
  standardDeviation?: number;
  highestScore: number;
  highestScorer: string;
  lowestScore: number;
  lowestScorersCount: number;
  approvalRate: number;
  totalStudents: number;
  questionsAnalytics: QuestionAnalytics[];
  studentResults: StudentExamResult[];
  pendingCorrectionsCount?: number;
}
