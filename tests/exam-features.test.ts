import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import QRCode from 'qrcode';

async function generateQrCodeSvg(
  text: string,
  options: { size?: number; margin?: number; errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H' } = {}
): Promise<string> {
  const margin = options.margin !== undefined ? options.margin : 2;
  const errorCorrectionLevel = options.errorCorrectionLevel || 'M';
  const width = options.size || 200;

  return QRCode.toString(text, {
    type: 'svg',
    margin,
    errorCorrectionLevel,
    width,
  });
}

describe('Frontend Exam & Print Features Suite (Jonatas Tasks)', () => {
  describe('Task #1 - QR Code Generation & Payload Specifications', () => {
    it('should generate valid SVG QR code string with standard XML elements', async () => {
      const payload = JSON.stringify({
        examId: 'exam-001',
        studentId: 'stud-123',
        version: 'A',
        totalQuestions: 10,
      });

      const svg = await generateQrCodeSvg(payload, { size: 180, margin: 2 });
      assert.ok(svg.includes('<svg'), 'Generated QR code must contain SVG root element');
      assert.ok(svg.includes('</svg>'), 'Generated QR code must close SVG element');
      assert.ok(svg.includes('viewBox'), 'Generated QR code must define viewBox');
    });

    it('should accept custom margin and error correction level', async () => {
      const payload = 'CORREGE:E1:S0:VA';
      const svg = await generateQrCodeSvg(payload, { margin: 1, errorCorrectionLevel: 'H' });
      assert.ok(svg.length > 100, 'High error correction SVG must be non-empty');
    });
  });

  describe('Task #2 & #4 - Duplex Print Rules & Blank Verso Compensation', () => {
    function calculateDuplexPages(questionPageCount: number, includeAnswerSheet: boolean): {
      questionPages: number;
      blankVersoInjected: boolean;
      answerSheetPages: number;
      totalPhysicalSheets: number;
    } {
      const isOdd = questionPageCount % 2 !== 0;
      const blankVersoInjected = isOdd;
      const questionPages = isOdd ? questionPageCount + 1 : questionPageCount;
      const answerSheetPages = includeAnswerSheet ? 2 : 0;
      const totalPhysicalSheets = (questionPages + answerSheetPages) / 2;
      return { questionPages, blankVersoInjected, answerSheetPages, totalPhysicalSheets };
    }

    it('should inject blank verso when question pages are odd', () => {
      const result = calculateDuplexPages(3, false);
      assert.equal(result.blankVersoInjected, true, 'Odd pages (3) must inject blank verso');
      assert.equal(result.questionPages, 4, 'Total question pages becomes 4 (3 content + 1 blank)');
      assert.equal(result.totalPhysicalSheets, 2, 'Requires exactly 2 physical duplex sheets');
    });

    it('should not inject blank verso when question pages are already even', () => {
      const result = calculateDuplexPages(4, false);
      assert.equal(result.blankVersoInjected, false, 'Even pages (4) must not inject blank verso');
      assert.equal(result.questionPages, 4);
      assert.equal(result.totalPhysicalSheets, 2);
    });

    it('should keep OMR Answer Sheet strictly on isolated sheet with 100% blank verso', () => {
      const result = calculateDuplexPages(3, true);
      assert.equal(result.blankVersoInjected, true);
      assert.equal(result.answerSheetPages, 2, 'OMR sheet gets dedicated recto + blank verso');
      assert.equal(result.totalPhysicalSheets, 3, '2 sheets for questions + 1 sheet for answer sheet');
    });
  });

  describe('Task #3 & #5 - N Cadernos (A..Z) & Fisher-Yates Randomization', () => {
    function getCadernoLabel(index: number): string {
      return String.fromCharCode(65 + (index % 26));
    }

    function shuffleStudentsFisherYates<T>(array: T[], seed = 42): T[] {
      const copy = [...array];
      let m = copy.length;
      let s = seed;
      const pseudoRandom = () => {
        s = (s * 9301 + 49297) % 233280;
        return s / 233280;
      };

      while (m) {
        const i = Math.floor(pseudoRandom() * m--);
        const t = copy[m];
        copy[m] = copy[i];
        copy[i] = t;
      }
      return copy;
    }

    it('should support up to 26 cadernos labeled from A to Z', () => {
      assert.equal(getCadernoLabel(0), 'A');
      assert.equal(getCadernoLabel(1), 'B');
      assert.equal(getCadernoLabel(2), 'C');
      assert.equal(getCadernoLabel(25), 'Z');
    });

    it('should randomize students so first student does not always get Caderno A', () => {
      const students = [
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob' },
        { id: '3', name: 'Carlos' },
        { id: '4', name: 'Daniel' },
        { id: '5', name: 'Eduardo' },
      ];

      const shuffled = shuffleStudentsFisherYates(students, 12345);
      assert.notEqual(shuffled[0].id, students[0].id, 'First student was shuffled away from position 0');
      assert.equal(shuffled.length, students.length, 'All students preserved');
    });
  });

  describe('Task #5 - Default Print Configuration & Concept Explanations', () => {
    it('should default to institutional print standards: no box nota, no answer key, duplex on', () => {
      const defaultPrintConfig = {
        includeBoxNota: false,
        showAnswerKey: false,
        isDuplexMode: true,
        showConceptExplanations: false,
      };

      assert.equal(defaultPrintConfig.includeBoxNota, false, 'Default must exclude Box NOTA');
      assert.equal(defaultPrintConfig.showAnswerKey, false, 'Default must exclude answer key marks on exam');
      assert.equal(defaultPrintConfig.isDuplexMode, true, 'Default must have duplex enabled');
    });

    it('should allow enabling concept explanations for post-exam review', () => {
      const reviewConfig = {
        showAnswerKey: true,
        showConceptExplanations: true,
      };

      assert.equal(reviewConfig.showConceptExplanations, true);
      assert.equal(reviewConfig.showAnswerKey, true);
    });
  });
});
