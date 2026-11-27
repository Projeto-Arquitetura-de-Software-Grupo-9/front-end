import QRCode from 'qrcode';

export interface QrCodeOptions {
  size?: number;
  margin?: number;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}

export type Letter = 'A' | 'B' | 'C' | 'D' | 'E';
export const LETTERS: Letter[] = ['A', 'B', 'C', 'D', 'E'];

export interface ParsedQrData {
  raw: string;
  examId?: string;
  examCode?: string;
  examTitle?: string;
  discipline?: string;
  classGroup?: string;
  versionLetter: string;
  studentRegistration?: string;
  studentId?: string;
  studentName?: string;
  nominal: boolean;
  totalQuestions?: number;
  embeddedKey?: Record<number, Letter>;
}

/**
 * Parses any QR Code payload (JSON or plain text) extracting institutional exam & student metadata.
 */
export function parseQrPayload(raw: string): ParsedQrData {
  const clean = (raw || '').trim();
  const embeddedKey: Record<number, Letter> = {};
  let examId: string | undefined;
  let examCode: string | undefined;
  let examTitle: string | undefined;
  let discipline: string | undefined;
  let classGroup: string | undefined;
  let versionLetter = 'A';
  let studentRegistration: string | undefined;
  let studentId: string | undefined;
  let studentName: string | undefined;
  let nominal = true;
  let totalQuestions: number | undefined;

  try {
    const parsed = JSON.parse(clean);
    if (parsed && typeof parsed === 'object') {
      examId = parsed.examId || parsed.idProva || parsed.appId;
      examCode = parsed.code || parsed.exam || parsed.examCode;
      examTitle = parsed.title || parsed.examTitle;
      discipline = parsed.disc || parsed.discipline;
      classGroup = parsed.turma || parsed.classGroup;

      const rawVer = String(parsed.ver || parsed.versionLetter || parsed.version || 'A').toUpperCase().trim();
      versionLetter = /^[A-Z]$/.test(rawVer) ? rawVer : 'A';

      const reg = parsed.std || parsed.reg || parsed.registration || parsed.matricula;
      if (reg && String(reg).toUpperCase() !== 'ANON') {
        studentRegistration = String(reg);
      }
      const sId = parsed.stdId || parsed.studentId || parsed.idAluno;
      if (sId && String(sId).toUpperCase() !== 'ANON') {
        studentId = String(sId);
      }
      if (parsed.name || parsed.studentName || parsed.aluno) {
        studentName = String(parsed.name || parsed.studentName || parsed.aluno);
      }

      if (parsed.nominal !== undefined) {
        nominal = Boolean(parsed.nominal);
      } else {
        nominal = Boolean(studentRegistration && studentRegistration.toUpperCase() !== 'ANON');
      }

      totalQuestions = Number(parsed.q || parsed.totalQuestions || 0) || undefined;

      if (typeof parsed.k === 'string') {
        parsed.k.toUpperCase().split('').forEach((ch: string, idx: number) => {
          if (LETTERS.includes(ch as Letter)) {
            embeddedKey[idx + 1] = ch as Letter;
          }
        });
      }
      if (parsed.answerKey && typeof parsed.answerKey === 'object') {
        Object.entries(parsed.answerKey).forEach(([k, v]) => {
          const up = String(v).toUpperCase() as Letter;
          if (LETTERS.includes(up)) embeddedKey[Number(k)] = up;
        });
      }

      return {
        raw: clean,
        examId,
        examCode,
        examTitle,
        discipline,
        classGroup,
        versionLetter,
        studentRegistration,
        studentId,
        studentName,
        nominal,
        totalQuestions,
        embeddedKey,
      };
    }
  } catch {
    // Plain text fallback regex
  }

  const verMatch = clean.match(/(?:V|VER|VERSION|CADERNO)\s*[=:-]?\s*([A-Z])\b/i);
  const regMatch = clean.match(/\b(202\d[.\d]+)\b/);

  return {
    raw: clean,
    versionLetter: verMatch ? verMatch[1].toUpperCase() : 'A',
    studentRegistration: regMatch ? regMatch[1] : undefined,
    nominal: Boolean(regMatch),
    embeddedKey,
  };
}

/**
 * Generates an ISO/IEC 18004 compliant SVG QR Code.
 * Uses official QRCode library ensuring 100% readability across smartphone cameras and scanners.
 */
export async function generateQrCodeSvg(
  text: string,
  options: QrCodeOptions = {}
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

/**
 * Synchronous variant used for rendering: the SVG exists on the very first render,
 * so window.print() never captures an empty placeholder. The qrcode library runs the
 * callback form synchronously in both the browser and Node builds.
 */
export function generateQrCodeSvgSync(text: string, options: QrCodeOptions = {}): string {
  let svg = '';
  let error: Error | null | undefined;
  QRCode.toString(
    text,
    {
      type: 'svg',
      margin: options.margin !== undefined ? options.margin : 2,
      errorCorrectionLevel: options.errorCorrectionLevel || 'M',
      width: options.size || 200,
    },
    (err, result) => {
      error = err;
      svg = result;
    }
  );
  if (error) throw error;
  return svg;
}
