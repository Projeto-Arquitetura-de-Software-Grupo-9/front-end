import { Correction, Exam, Student } from './types';

export interface ExamCorrectionStatus {
  status: Exam['status'];
  correctedCount: number;
  expectedCount: number;
}

/**
 * Deriva o status da prova a partir das correções salvas no banco:
 * - sem correções → 'ready' (Pronta p/ impressão)
 * - parte dos alunos corrigida → 'Em Andamento'
 * - todos os alunos esperados corrigidos → 'Corrigida'
 * O total esperado são os alunos da turma da prova ou, se a turma não tiver alunos, a distribuição de cadernos.
 * Cada aluno conta uma vez, mesmo que a folha seja lida de novo.
 */
export function computeExamCorrectionStatus(
  exam: Exam,
  corrections: Correction[],
  students: Student[]
): ExamCorrectionStatus {
  const corrected = new Set(
    corrections
      .filter((c) => c.applicationId === exam.id)
      .map((c) => c.studentId || c.registration || c.reportedStudentRegistration || `correcao:${c.id}`)
  ).size;

  // Prioriza os alunos da turma da prova: a distribuição de cadernos é gerada com todos os alunos do sistema
  const classStudents = students.filter(
    (s) => Boolean(exam.classGroup) && s.classGroup === exam.classGroup
  ).length;
  const expected = classStudents > 0 ? classStudents : exam.studentAssignments?.length || 0;

  let status: Exam['status'] = 'ready';
  if (corrected > 0) status = expected > 0 && corrected >= expected ? 'Corrigida' : 'Em Andamento';

  return { status, correctedCount: corrected, expectedCount: expected };
}

/**
 * Retorna as letras dos cadernos (A, B, C... até Z) com base no número de versões.
 */
export const getVersionLetters = (numVersions: number = 4): string[] => {
  const safeCount = Math.max(1, Math.min(26, Math.floor(numVersions) || 1));
  return Array.from({ length: safeCount }, (_, idx) => String.fromCharCode(65 + idx));
};

/**
 * Atribui cadernos (A..Z) aos alunos de forma distribuída para evitar cadernos iguais lado a lado.
 */
export const generateRandomStudentAssignments = (
  studentsList: Student[],
  numVersions: number = 4,
  seedShift?: number
) => {
  const letters = getVersionLetters(numVersions);
  if (letters.length === 1) {
    return studentsList.map((std) => ({
      studentId: std.id,
      studentName: std.name,
      registration: std.registration,
      assignedVersion: letters[0],
    }));
  }

  return studentsList.map((std, idx) => {
    const shift = seedShift !== undefined ? (seedShift * 3) : 1;
    const assignedIndex = (idx * 7 + shift) % letters.length;
    return {
      studentId: std.id,
      studentName: std.name,
      registration: std.registration,
      assignedVersion: letters[assignedIndex],
    };
  });
};
