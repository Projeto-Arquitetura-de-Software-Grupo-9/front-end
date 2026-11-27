import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeExamCorrectionStatus } from '../lib/exam-utils';
import type { Correction, Exam, Student } from '../lib/types';

const student = (id: string, classGroup = 'Turma A'): Student => ({
  id, name: `Aluno ${id}`, registration: `2026.${id}`, course: 'Direito', email: '', classGroup,
  discipline: 'Algoritmos', examsTaken: 0, overallAverage: 0,
});

const correction = (id: string, examId: string, studentId?: string): Correction => ({
  id, applicationId: examId, examVersionId: `${examId}-A`, versionLetter: 'A', studentId,
  objectiveResults: [], totalScore: 7, maxScore: 10, confirmedAt: '2026-11-27T10:00:00Z',
  isAutomaticallyAssigned: Boolean(studentId), syncStatus: 'synced',
});

const exam = (overrides: Partial<Exam> = {}): Exam => ({
  id: 'exam-1', code: '#PROVA-1', title: 'P1', institution: 'Católica', department: 'Escola', course: 'Direito',
  discipline: 'Algoritmos', classGroup: 'Turma A', semester: '2026.2', date: '2026-11-27', duration: '2h',
  instructions: '', status: 'ready', shuffleQuestions: true, shuffleAlternatives: true, numberOfVersions: 2,
  selectedQuestionIds: ['q1'], versions: [], maxScore: 10, ...overrides,
});

describe('computeExamCorrectionStatus', () => {
  const students = [student('s1'), student('s2'), student('s3', 'Turma B')];

  it('keeps an exam without corrections ready for printing', () => {
    const r = computeExamCorrectionStatus(exam(), [], students);
    assert.deepEqual(r, { status: 'ready', correctedCount: 0, expectedCount: 2 });
  });

  it('marks the exam in progress while some students of the class are still uncorrected', () => {
    const r = computeExamCorrectionStatus(exam(), [correction('c1', 'exam-1', 's1')], students);
    assert.deepEqual(r, { status: 'Em Andamento', correctedCount: 1, expectedCount: 2 });
  });

  it('marks the exam corrected once every student of the class has a correction', () => {
    const corrections = [correction('c1', 'exam-1', 's1'), correction('c2', 'exam-1', 's2')];
    assert.equal(computeExamCorrectionStatus(exam(), corrections, students).status, 'Corrigida');
  });

  it('counts a re-scanned student once and ignores corrections of other exams', () => {
    const corrections = [
      correction('c1', 'exam-1', 's1'),
      correction('c1b', 'exam-1', 's1'),
      correction('c9', 'exam-2', 's2'),
    ];
    const r = computeExamCorrectionStatus(exam(), corrections, students);
    assert.deepEqual(r, { status: 'Em Andamento', correctedCount: 1, expectedCount: 2 });
  });

  it('prefers the class roster over assignments built from every student in the system', () => {
    const assigned = exam({
      studentAssignments: ['s1', 's2', 's3'].map((id) => ({ studentId: id, studentName: id, registration: id, assignedVersion: 'A' })),
    });
    const corrections = [correction('c1', 'exam-1', 's1'), correction('c2', 'exam-1', 's2')];
    const r = computeExamCorrectionStatus(assigned, corrections, students);
    assert.deepEqual(r, { status: 'Corrigida', correctedCount: 2, expectedCount: 2 });
  });

  it('falls back to the assignments when the class has no registered students', () => {
    const assigned = exam({
      classGroup: 'Turma Vazia',
      studentAssignments: [{ studentId: 's1', studentName: 'Aluno s1', registration: '2026.s1', assignedVersion: 'A' }],
    });
    const r = computeExamCorrectionStatus(assigned, [correction('c1', 'exam-1', 's1')], students);
    assert.deepEqual(r, { status: 'Corrigida', correctedCount: 1, expectedCount: 1 });
  });

  it('stays in progress for anonymous exams whose total is unknown', () => {
    const r = computeExamCorrectionStatus(exam({ classGroup: 'Sem alunos' }), [correction('c1', 'exam-1')], students);
    assert.deepEqual(r, { status: 'Em Andamento', correctedCount: 1, expectedCount: 0 });
  });
});
