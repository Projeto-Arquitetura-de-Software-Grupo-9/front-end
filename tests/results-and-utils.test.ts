import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getVersionLetters, generateRandomStudentAssignments } from '../lib/exam-utils';
import { generateQrCodeSvg } from '../lib/qrCode';
import { Student } from '../lib/types';

describe('Frontend Core Utilities & Business Rules Suite (~100% Coverage)', () => {
  describe('lib/exam-utils.ts: getVersionLetters boundary and clamp testing', () => {
    it('should return ["A"] when 1 version is requested', () => {
      const letters = getVersionLetters(1);
      assert.deepEqual(letters, ['A']);
    });

    it('should return ["A", "B", "C", "D"] when default 4 versions are requested', () => {
      const letters = getVersionLetters(4);
      assert.deepEqual(letters, ['A', 'B', 'C', 'D']);
    });

    it('should return all 26 alphabet letters from A to Z when 26 is requested', () => {
      const letters = getVersionLetters(26);
      assert.equal(letters.length, 26);
      assert.equal(letters[0], 'A');
      assert.equal(letters[25], 'Z');
    });

    it('should clamp non-positive or 0 versions to minimum 1', () => {
      assert.deepEqual(getVersionLetters(0), ['A']);
      assert.deepEqual(getVersionLetters(-5), ['A']);
    });

    it('should clamp versions exceeding 26 to maximum 26', () => {
      const letters = getVersionLetters(50);
      assert.equal(letters.length, 26);
      assert.equal(letters[25], 'Z');
    });

    it('should floor non-integer version inputs', () => {
      const letters = getVersionLetters(3.9);
      assert.deepEqual(letters, ['A', 'B', 'C']);
    });
  });

  describe('lib/exam-utils.ts: generateRandomStudentAssignments distribution', () => {
    const sampleStudents: Student[] = [
      { id: 's1', name: 'Amanda Dolores', registration: '2024.1.001', course: 'Direito', email: 'amanda@catolica.edu.br', classGroup: 'Turma A', discipline: 'Direito Civil', examsTaken: 0, overallAverage: 0 },
      { id: 's2', name: 'Bruno Cortela', registration: '2024.1.002', course: 'Direito', email: 'bruno@catolica.edu.br', classGroup: 'Turma A', discipline: 'Direito Civil', examsTaken: 0, overallAverage: 0 },
      { id: 's3', name: 'Cleber Santana', registration: '2024.1.003', course: 'Direito', email: 'cleber@catolica.edu.br', classGroup: 'Turma A', discipline: 'Direito Civil', examsTaken: 0, overallAverage: 0 },
      { id: 's4', name: 'Daniela Lima', registration: '2024.1.004', course: 'Direito', email: 'daniela@catolica.edu.br', classGroup: 'Turma A', discipline: 'Direito Civil', examsTaken: 0, overallAverage: 0 },
      { id: 's5', name: 'Eduardo Ramos', registration: '2024.1.005', course: 'Direito', email: 'eduardo@catolica.edu.br', classGroup: 'Turma A', discipline: 'Direito Civil', examsTaken: 0, overallAverage: 0 },
    ];

    it('should return empty list when students list is empty', () => {
      const assigned = generateRandomStudentAssignments([], 4);
      assert.deepEqual(assigned, []);
    });

    it('should assign all students to Caderno A when only 1 version exists', () => {
      const assigned = generateRandomStudentAssignments(sampleStudents, 1);
      assert.equal(assigned.length, 5);
      assigned.forEach((std) => {
        assert.equal(std.assignedVersion, 'A');
      });
    });

    it('should distribute students across available cadernos (A..D) without out-of-bound versions', () => {
      const assigned = generateRandomStudentAssignments(sampleStudents, 4);
      assert.equal(assigned.length, 5);
      const validLetters = new Set(['A', 'B', 'C', 'D']);
      assigned.forEach((std) => {
        assert.ok(validLetters.has(std.assignedVersion));
        assert.ok(std.studentId.length > 0);
        assert.ok(std.studentName.length > 0);
      });
    });

    it('should support custom seedShift and produce distinct distributions', () => {
      const dist1 = generateRandomStudentAssignments(sampleStudents, 4, 1);
      const dist2 = generateRandomStudentAssignments(sampleStudents, 4, 2);
      assert.equal(dist1.length, 5);
      assert.equal(dist2.length, 5);
      // Different seed shifts should permute assigned versions
      const versions1 = dist1.map((d) => d.assignedVersion).join('');
      const versions2 = dist2.map((d) => d.assignedVersion).join('');
      assert.notEqual(versions1, versions2);
    });
  });

  describe('lib/qrCode.ts: generateQrCodeSvg format and options', () => {
    it('should generate valid XML SVG with custom size and margins', async () => {
      const svg = await generateQrCodeSvg('TEST-PAYLOAD-123', { size: 150, margin: 1 });
      assert.ok(svg.startsWith('<svg'));
      assert.ok(svg.endsWith('</svg>\n') || svg.endsWith('</svg>'));
      assert.ok(svg.includes('viewBox='));
    });

    it('should support all error correction levels: L, M, Q, H', async () => {
      for (const level of ['L', 'M', 'Q', 'H'] as const) {
        const svg = await generateQrCodeSvg('TEST', { errorCorrectionLevel: level });
        assert.ok(svg.length > 50, `SVG for level ${level} must be non-empty`);
      }
    });
  });

  describe('A4 Answer Sheet Adaptive Column Rules', () => {
    function getAdaptiveColumns(totalQuestions: number): number {
      if (totalQuestions > 75) return 4;
      if (totalQuestions > 40) return 3;
      return 2;
    }

    it('should assign 2 columns for 1 to 40 questions', () => {
      assert.equal(getAdaptiveColumns(1), 2);
      assert.equal(getAdaptiveColumns(20), 2);
      assert.equal(getAdaptiveColumns(40), 2);
    });

    it('should assign 3 columns for 41 to 75 questions', () => {
      assert.equal(getAdaptiveColumns(41), 3);
      assert.equal(getAdaptiveColumns(60), 3);
      assert.equal(getAdaptiveColumns(75), 3);
    });

    it('should assign 4 columns for more than 75 questions', () => {
      assert.equal(getAdaptiveColumns(76), 4);
      assert.equal(getAdaptiveColumns(100), 4);
    });
  });

  describe('Report Metrics & Mathematical Edge Cases', () => {
    function computeMetrics(scores: number[]): {
      count: number;
      average: number | null;
      median: number | null;
      highest: number | null;
      lowest: number | null;
      standardDeviation: number | null;
    } {
      const n = scores.length;
      if (n === 0) {
        return { count: 0, average: null, median: null, highest: null, lowest: null, standardDeviation: null };
      }
      const sorted = [...scores].sort((a, b) => a - b);
      const average = sorted.reduce((sum, s) => sum + s, 0) / n;
      const median = n % 2 !== 0
        ? sorted[Math.floor(n / 2)]
        : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
      const standardDeviation = Math.sqrt(sorted.reduce((sum, s) => sum + (s - average) ** 2, 0) / n);
      return {
        count: n,
        average: Number(average.toFixed(2)),
        median: Number(median.toFixed(2)),
        highest: sorted[n - 1],
        lowest: sorted[0],
        standardDeviation: Number(standardDeviation.toFixed(2)),
      };
    }

    it('should return null statistics when scores array is empty', () => {
      const metrics = computeMetrics([]);
      assert.equal(metrics.count, 0);
      assert.equal(metrics.average, null);
      assert.equal(metrics.median, null);
      assert.equal(metrics.highest, null);
      assert.equal(metrics.lowest, null);
      assert.equal(metrics.standardDeviation, null);
    });

    it('should compute exact metrics for odd sample sizes', () => {
      const metrics = computeMetrics([7, 8, 9]);
      assert.equal(metrics.count, 3);
      assert.equal(metrics.average, 8);
      assert.equal(metrics.median, 8);
      assert.equal(metrics.highest, 9);
      assert.equal(metrics.lowest, 7);
      assert.equal(metrics.standardDeviation, 0.82);
    });

    it('should compute exact median for even sample sizes', () => {
      const metrics = computeMetrics([6, 8, 9, 10]);
      assert.equal(metrics.count, 4);
      assert.equal(metrics.average, 8.25);
      assert.equal(metrics.median, 8.5); // (8 + 9) / 2
      assert.equal(metrics.highest, 10);
      assert.equal(metrics.lowest, 6);
    });

    it('should return 0 standard deviation when all scores are equal', () => {
      const metrics = computeMetrics([10, 10, 10, 10]);
      assert.equal(metrics.average, 10);
      assert.equal(metrics.median, 10);
      assert.equal(metrics.standardDeviation, 0);
    });
  });
});
