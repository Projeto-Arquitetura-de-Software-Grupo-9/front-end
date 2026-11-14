import { Student } from './types';

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
