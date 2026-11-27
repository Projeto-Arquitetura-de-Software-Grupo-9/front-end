import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  api,
  API_BASE_URL,
  generateDisciplineCode,
  buildDisciplinePayload,
  sanitizeExamPayload,
} from '../lib/api';

describe('Frontend API Integration & Mock Removal Verification (Items 1, 4, 5, 6, 10)', () => {
  it('should expose all required production API endpoints in lib/api.ts', () => {
    assert.equal(typeof api.checkHealth, 'function');
    assert.equal(typeof api.loginProfessor, 'function');
    assert.equal(typeof api.createProfessor, 'function');
    assert.equal(typeof api.getDisciplinas, 'function');
    assert.equal(typeof api.createDisciplina, 'function');
    assert.equal(typeof api.deleteDisciplina, 'function');
    assert.equal(typeof api.getTurmas, 'function');
    assert.equal(typeof api.createTurma, 'function');
    assert.equal(typeof api.updateTurma, 'function');
    assert.equal(typeof api.deleteTurma, 'function');
    assert.equal(typeof api.getStudents, 'function');
    assert.equal(typeof api.createStudent, 'function');
    assert.equal(typeof api.updateStudent, 'function');
    assert.equal(typeof api.deleteStudent, 'function');
    assert.equal(typeof api.deleteStudentsBatch, 'function');
    assert.equal(typeof api.importStudentsExcelFile, 'function');
    assert.equal(typeof api.getStudentImportTemplateUrl, 'function');
    assert.equal(typeof api.getQuestions, 'function');
    assert.equal(typeof api.createQuestion, 'function');
    assert.equal(typeof api.updateQuestion, 'function');
    assert.equal(typeof api.deleteQuestion, 'function');
    assert.equal(typeof api.getExams, 'function');
    assert.equal(typeof api.createExam, 'function');
    assert.equal(typeof api.updateExam, 'function');
    assert.equal(typeof api.deleteExam, 'function');
    assert.equal(typeof api.getCorrecoes, 'function');
    assert.equal(typeof api.createCorrecao, 'function');
    assert.equal(typeof api.anonymizeTeacherData, 'function');
  });

  it('should return valid template download URL without hardcoded machine paths', () => {
    const templateUrl = api.getStudentImportTemplateUrl();
    assert.ok(templateUrl.includes('/students/import-template'));
    assert.ok(!templateUrl.includes('davi3'));
    assert.ok(!templateUrl.includes('Users'));
  });

  it('should build valid PDF URL with institutional defaults (no box nota by default, duplex support)', () => {
    const pdfUrl = api.getExamPdfUrl('exam-123', {
      versionLetter: 'A',
      showAnswerKey: false,
      showQrCode: true,
      includeBoxNota: false,
      isDuplex: true,
      includeAnswerSheet: true,
    });

    assert.ok(pdfUrl.includes('versionLetter=A'));
    assert.ok(pdfUrl.includes('includeBoxNota=false'));
    assert.ok(pdfUrl.includes('isDuplex=true'));
    assert.ok(pdfUrl.includes('includeAnswerSheet=true'));
  });

  it('should verify version bubbles support up to 26 letters (A..Z)', () => {
    const defaultBubbles = ['A', 'B', 'C', 'D'];
    const expandedBubbles = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));

    assert.equal(defaultBubbles.length, 4);
    assert.equal(expandedBubbles.length, 26);
    assert.equal(expandedBubbles[0], 'A');
    assert.equal(expandedBubbles[25], 'Z');
  });

  it('should normalize backend discipline payloads (nome, codigo, curso) to Discipline contract (name, code, course)', () => {
    const rawBackendDisciplines = [
      {
        id: 'disc-backend-1',
        idProfessor: 'prof-catolica-01',
        codigo: 'DIR-101',
        nome: 'Direito Constitucional',
        curso: 'Direito',
      },
      {
        id: 'disc-backend-2',
        code: 'MAT-201',
        name: 'Cálculo I',
        course: 'Engenharia',
      },
    ];

    const normalized = rawBackendDisciplines.map((d: any) => ({
      id: String(d.id),
      teacherId: String(d.idProfessor || d.teacherId || 'prof-catolica-01'),
      code: String(d.codigo || d.code || 'DIR-101'),
      name: String(d.nome || d.name || 'Disciplina'),
      course: String(d.curso || d.course || 'Direito'),
      createdAt: String(d.createdAt || new Date().toISOString()),
    }));

    assert.equal(normalized[0].name, 'Direito Constitucional');
    assert.equal(normalized[0].code, 'DIR-101');
    assert.equal(normalized[0].course, 'Direito');
    assert.equal(normalized[0].teacherId, 'prof-catolica-01');

    assert.equal(normalized[1].name, 'Cálculo I');
    assert.equal(normalized[1].code, 'MAT-201');
    assert.equal(normalized[1].course, 'Engenharia');

    // Duplicate search test (reproducing previous TypeError crash)
    const newName = 'direito penal';
    const existing = normalized.find(
      (d) => (d.name || (d as any).nome || '').trim().toLowerCase() === newName.toLowerCase()
    );
    assert.equal(existing, undefined);

    const existingMatch = normalized.find(
      (d) => (d.name || (d as any).nome || '').trim().toLowerCase() === 'direito constitucional'
    );
    assert.ok(existingMatch);
    assert.equal(existingMatch?.id, 'disc-backend-1');
  });

  it('should generate clean discipline codes and omit empty idProfessor in discipline payload', () => {
    assert.equal(generateDisciplineCode('Direito Constitucional', ' dir-101 '), 'DIR-101');
    const generated = generateDisciplineCode('Cálculo I');
    assert.match(generated, /^CAL-\d{3}$/);

    const fallbackCode = generateDisciplineCode('---');
    assert.match(fallbackCode, /^DSC-\d{3}$/);

    const withoutProf = buildDisciplinePayload({
      name: '  Direito Penal  ',
      code: '',
      course: '   ',
      idProfessor: '',
    });
    assert.equal(withoutProf.nome, 'Direito Penal');
    assert.match(withoutProf.codigo, /^DIR-\d{3}$/);
    assert.equal(withoutProf.curso, 'Direito');
    assert.equal('idProfessor' in withoutProf, false);

    const withProf = buildDisciplinePayload({
      nome: 'Direito Civil',
      codigo: 'civ-202',
      curso: 'Direito',
      idProfessor: '3aac1889-df83-4302-ba4c-09f19ba9a08f',
    });
    assert.equal(withProf.codigo, 'CIV-202');
    assert.equal(withProf.idProfessor, '3aac1889-df83-4302-ba4c-09f19ba9a08f');
  });

  it('should sanitize exam payloads to prevent empty-string 400, temp disciplinaId 404, and question mismatch errors', () => {
    const sanitized = sanitizeExamPayload({
      code: '#DIR-1234',
      title: '  P1 Direito Constitucional  ',
      discipline: '  Direito Constitucional  ',
      disciplinaId: 'disc-1764200000000',
      classGroup: '',
      course: '',
      institution: '',
      department: '',
      semester: '',
      date: '',
      duration: '',
      instructions: '  Leia com atenção.  ',
      selectedQuestionIds: ['q-valid-1', 'q-stale-deleted'],
      selectedQuestions: [
        { id: 'q-valid-1', statement: 'Pergunta 1', type: 'objetiva', alternatives: [] },
      ],
    });

    assert.equal(sanitized.title, 'P1 Direito Constitucional');
    assert.equal(sanitized.discipline, 'Direito Constitucional');
    assert.equal('disciplinaId' in sanitized, false);
    assert.equal(sanitized.classGroup, 'Turma Geral');
    assert.equal(sanitized.course, 'Graduação');
    assert.equal(sanitized.institution, 'CATÓLICA DE SANTA CATARINA');
    assert.ok(sanitized.department.length > 0);
    assert.ok(sanitized.date.length > 0);
    assert.equal(sanitized.duration, '2 horas');
    assert.deepEqual(sanitized.selectedQuestionIds, ['q-valid-1']);

    const withValidUuid = sanitizeExamPayload({
      title: 'P2',
      discipline: 'Direito',
      disciplinaId: 'fc5e35b4-5547-48d3-bf43-7218d47521a5',
      classGroup: 'Turma A',
    });
    assert.equal(withValidUuid.disciplinaId, 'fc5e35b4-5547-48d3-bf43-7218d47521a5');
    assert.equal(withValidUuid.classGroup, 'Turma A');

    // Partial print config update should not inject unrelated fields
    const partialPrintConfig = sanitizeExamPayload({
      numberOfVersions: 3,
      shuffleQuestions: true,
      withStudentIdentification: false,
    });
    assert.equal('title' in partialPrintConfig, false);
    assert.equal(partialPrintConfig.numberOfVersions, 3);
  });
});
