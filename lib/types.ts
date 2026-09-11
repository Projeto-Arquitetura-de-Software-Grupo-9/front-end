export type ScreenType =
  | 'dashboard'
  | 'banco-questoes'
  | 'criar-prova'
  | 'folha-respostas'
  | 'pre-visualizacao'
  | 'resultados'
  | 'alunos'
  | 'configuracoes';

export type DifficultyLevel = 'Fácil' | 'Médio' | 'Difícil';

export interface Alternative {
  id: string;
  letter: 'A' | 'B' | 'C' | 'D' | 'E';
  text: string;
}

export interface Question {
  id: string;
  code: string; // e.g. #Q-1024
  discipline: string; // e.g. "Cálculo I", "Física II", "Álgebra Linear"
  difficulty: DifficultyLevel;
  topic?: string;
  tags?: string[];
  statement: string; // Enunciado
  alternatives: Alternative[];
  correctAlternative: 'A' | 'B' | 'C' | 'D' | 'E';
  points?: number;
  explanation?: string;
}

export interface ExamVersion {
  versionLetter: 'A' | 'B' | 'C' | 'D';
  questions: {
    originalQuestionId: string;
    orderIndex: number;
    statement: string;
    alternatives: Alternative[];
    correctAlternative: 'A' | 'B' | 'C' | 'D' | 'E';
  }[];
  answerKey: Record<number, 'A' | 'B' | 'C' | 'D' | 'E'>; // question number (1-based) -> correct letter
}

export interface Exam {
  id: string;
  code: string; // e.g. #CAL-1-2024.2
  title: string; // e.g. "P1 - Cálculo I - 2024.2"
  subtitle?: string;
  institution: string; // "UNIVERSIDADE FEDERAL DO RIO DE JANEIRO"
  department: string; // "Escola de Engenharia | Departamento de Matemática Aplicada"
  course: string; // "Engenharia Civil"
  discipline: string; // "Cálculo I"
  classGroup: string; // "Turma A"
  semester: string; // "2024.2"
  date: string; // "12 Mar, 2024"
  duration: string; // "2 horas"
  instructions: string;
  status: 'Corrigida' | 'Pendente' | 'Em Andamento';
  shuffleQuestions: boolean;
  shuffleAlternatives: boolean;
  numberOfVersions: number; // e.g. 4 (A, B, C, D)
  selectedQuestionIds: string[];
  versions: ExamVersion[];
  maxScore: number;
  totalStudents?: number;
  averageScore?: number;
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
  highestScore: number;
  highestScorer: string;
  lowestScore: number;
  lowestScorersCount: number;
  approvalRate: number;
  totalStudents: number;
  questionsAnalytics: QuestionAnalytics[];
  studentResults: StudentExamResult[];
}
