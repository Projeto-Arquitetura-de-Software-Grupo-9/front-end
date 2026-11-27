import { Question, Student, Class, Discipline, Correction, Exam } from './types';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://back-end-coral-eta.vercel.app/api/v1';

const AUTH_TOKEN_STORAGE_KEY = 'correge_auth_token';
let inMemoryAuthToken: string | null = null;

export function getAuthToken(): string | null {
  if (inMemoryAuthToken) return inMemoryAuthToken;
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
      if (stored) {
        inMemoryAuthToken = stored;
        return stored;
      }
    } catch {
      // ignore storage errors
    }
  }
  return null;
}

export function setAuthToken(token: string | null): void {
  inMemoryAuthToken = token;
  if (typeof window !== 'undefined') {
    try {
      if (token) {
        localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
      } else {
        localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
      }
    } catch {
      // ignore storage errors
    }
  }
}

export function clearAuthToken(): void {
  setAuthToken(null);
}

export interface HealthCheckResponse {
  status: string;
  service: string;
  timestamp: string;
  dataSource?: string;
  modules?: Record<string, string>;
}

export interface BackendExamLayoutQuestionDTO {
  questionId: string;
  orderIndex: number;
  statement: string;
  alternatives: {
    letter: 'A' | 'B' | 'C' | 'D' | 'E';
    text: string;
  }[];
  correctAlternative?: 'A' | 'B' | 'C' | 'D' | 'E';
  pointValue: number;
}

export interface BackendExamLayoutDTO {
  examId: string;
  title: string;
  versionLetter: string;
  header: {
    institutionName: string;
    course: string;
    discipline: string;
    professorName: string;
    examTitle: string;
    code: string;
    versionLetter: string;
    date: string;
    duration: string;
    maxScore: number;
    instructions: string[];
  };
  pages: {
    pageNumber: number;
    questions: BackendExamLayoutQuestionDTO[];
  }[];
  totalQuestions: number;
  totalPages: number;
  qrCodePayload: string;
  answerKey: Record<number, 'A' | 'B' | 'C' | 'D' | 'E'>;
}

export interface ProfessorProfileDTO {
  id: string;
  nomeCompleto: string;
  email: string;
  createdAt?: string;
}

export interface AuthResponseDTO {
  token?: string;
  professor?: ProfessorProfileDTO;
  id?: string;
  nomeCompleto?: string;
  email?: string;
  createdAt?: string;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function parseErrorResponse(res: Response, fallbackMsg: string): Promise<ApiError> {
  const errBody = await res.json().catch(() => ({}));
  const msg = errBody?.error || errBody?.message || fallbackMsg;
  return new ApiError(msg, res.status, errBody?.code);
}

/**
 * Utilitário fetch resiliente com timeout e injeção automática de Bearer JWT
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 10000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const headers = new Headers(options.headers || undefined);
  const token = getAuthToken();
  if (token && url.startsWith(API_BASE_URL) && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value?: string | null): boolean {
  return typeof value === 'string' && UUID_REGEX.test(value.trim());
}

export function mapBackendExam(e: any): Exam {
  const instructions = Array.isArray(e.instructions)
    ? e.instructions.join('\n')
    : typeof e.instructions === 'string'
    ? e.instructions
    : '';

  const dbVersions: any[] = Array.isArray(e.versions) ? e.versions : [];
  const jsonVersions: any[] = Array.isArray(e.variationsJson?.versions)
    ? e.variationsJson.versions
    : [];

  // Prioritize real PostgreSQL VersaoProva rows (they carry the real UUID required by FK id_versao_prova)
  const rawVersions =
    dbVersions.length > 0
      ? [...dbVersions].sort((a, b) =>
          String(a.versionLetter || '').localeCompare(String(b.versionLetter || ''))
        )
      : jsonVersions;

  const mappedVersions = rawVersions.map((v: any, vIdx: number) => {
    const versionLetter = String(v.versionLetter || String.fromCharCode(65 + vIdx)).toUpperCase();
    const jsonFallback = jsonVersions.find(
      (jv) => String(jv.versionLetter || '').toUpperCase() === versionLetter
    );
    const dbMatch = dbVersions.find(
      (dv) => String(dv.versionLetter || '').toUpperCase() === versionLetter
    );

    let qLayout =
      v.questionsLayout ||
      v.questions ||
      jsonFallback?.questions ||
      jsonFallback?.questionsLayout ||
      [];
    if (typeof qLayout === 'string') {
      try {
        qLayout = JSON.parse(qLayout);
      } catch {
        qLayout = [];
      }
    }

    const questions = (Array.isArray(qLayout) ? qLayout : []).map((q: any, qIdx: number) => ({
      originalQuestionId: q.originalQuestionId || q.questionId || q.id || 'q-' + qIdx,
      orderIndex: q.orderIndex || qIdx + 1,
      statement: q.statement || '',
      alternatives: (q.alternatives || []).map((a: any, aIdx: number) => ({
        id: a.id || 'alt-' + aIdx,
        letter: a.letter || String.fromCharCode(65 + aIdx),
        text: typeof a === 'string' ? a : a.text || '',
      })),
      correctAlternative: q.correctAlternative || 'A',
      explanation: q.explanation,
      topic: q.topic,
    }));

    let aKey = v.answerKey || jsonFallback?.answerKey || {};
    if (typeof aKey === 'string') {
      try {
        aKey = JSON.parse(aKey);
      } catch {
        aKey = {};
      }
    }

    const resolvedVersionId =
      (dbMatch?.id && isUuid(String(dbMatch.id)) ? String(dbMatch.id) : null) ||
      (v.id ? String(v.id) : `${e.id}-${versionLetter}`);

    return {
      id: resolvedVersionId,
      versionLetter,
      questions,
      answerKey: aKey,
      qrCodePayload:
        v.qrCodePayload ||
        jsonFallback?.qrCodePayload ||
        JSON.stringify({
          app: 'CORREGE',
          examId: e.id,
          code: e.code || '#EXAM',
          ver: versionLetter,
        }),
    };
  });

  const selectedQuestionIds =
    e.selectedQuestionIds && e.selectedQuestionIds.length > 0
      ? e.selectedQuestionIds
      : e.variationsJson?.selectedQuestionIds && e.variationsJson.selectedQuestionIds.length > 0
      ? e.variationsJson.selectedQuestionIds
      : (mappedVersions[0]?.questions || []).map((q: any) => q.originalQuestionId);

  return {
    id: e.id,
    teacherId: e.teacherId,
    code: e.code || '#EXAM',
    title: e.title || 'Avaliação',
    subtitle: e.subtitle,
    institution: e.institution || 'CATÓLICA DE SANTA CATARINA',
    department: e.department || '',
    course: e.course || 'Graduação',
    discipline: e.discipline || e.disciplinaRef?.nome || '',
    classGroup: e.classGroup || '',
    semester: e.semester || `${new Date().getFullYear()}.1`,
    date: e.date || '',
    duration: e.duration || '2 horas',
    instructions,
    status: (e.status as any) || 'ready',
    shuffleQuestions: e.shuffleQuestions ?? e.variationsJson?.shuffleQuestions ?? true,
    shuffleAlternatives: e.shuffleAlternatives ?? e.variationsJson?.shuffleAlternatives ?? true,
    withStudentIdentification: e.withStudentIdentification ?? true,
    numberOfVersions:
      e.variationsJson?.numberOfVersions ||
      e.numberOfVersions ||
      (mappedVersions.length > 0 ? mappedVersions.length : 1),
    selectedQuestionIds,
    versions: mappedVersions,
    maxScore: e.maxScore || e.variationsJson?.maxScore || 10.0,
    totalStudents: e.totalStudents || (e.variationsJson?.studentAssignments || []).length || 0,
    averageScore: e.averageScore || 0,
    studentAssignments: e.variationsJson?.studentAssignments || e.studentAssignments || [],
    createdAt: e.createdAt,
  };
}

export function mapBackendCorrecao(raw: any): Correction {
  let parsedRespostas: Record<string, any> = {};
  if (typeof raw?.respostasLidas === 'string') {
    try {
      parsedRespostas = JSON.parse(raw.respostasLidas);
    } catch {
      parsedRespostas = {};
    }
  } else if (raw?.respostasLidas && typeof raw.respostasLidas === 'object') {
    parsedRespostas = raw.respostasLidas;
  }

  let answerKey: Record<string, string> = {};
  const rawKey = raw?.versaoProva?.answerKey;
  if (typeof rawKey === 'string') {
    try {
      answerKey = JSON.parse(rawKey);
    } catch {
      answerKey = {};
    }
  } else if (rawKey && typeof rawKey === 'object') {
    answerKey = rawKey;
  }

  const objectiveResults = Object.entries(parsedRespostas)
    .filter(([k]) => !k.startsWith('desc_') && !Number.isNaN(Number(k)))
    .map(([qNum, chosen]) => {
      const correct = (String(answerKey[qNum] || '').toUpperCase() || 'A') as
        | 'A'
        | 'B'
        | 'C'
        | 'D'
        | 'E';
      const chosenNorm = chosen
        ? (String(chosen).toUpperCase() as 'A' | 'B' | 'C' | 'D' | 'E')
        : null;
      return {
        questionId: `q-${qNum}`,
        chosen: chosenNorm,
        correct,
        isCorrect: chosenNorm !== null && chosenNorm === correct,
        score: 0,
      };
    });

  const discursiveScores = Object.entries(parsedRespostas)
    .filter(([k]) => k.startsWith('desc_'))
    .map(([k, v]) => ({
      questionId: k.replace(/^desc_/, ''),
      score: Number(v) || 0,
    }));

  return {
    id: String(raw.id),
    applicationId: String(
      raw.versaoProva?.examId ||
        raw.versaoProva?.idProva ||
        raw.idProva ||
        raw.applicationId ||
        ''
    ),
    examVersionId: String(raw.idVersaoProva || raw.examVersionId || ''),
    versionLetter: String(
      raw.versaoMarcada || raw.versaoProva?.versionLetter || raw.versionLetter || 'A'
    ),
    studentId: raw.idAluno || raw.studentId || undefined,
    studentName: raw.student?.name || raw.aluno?.name || raw.studentName || undefined,
    registration:
      raw.student?.registration || raw.aluno?.registration || raw.registration || undefined,
    reportedStudentName: raw.nomeManuscrito || raw.reportedStudentName || undefined,
    reportedStudentRegistration:
      raw.matriculaManuscrita || raw.reportedStudentRegistration || undefined,
    objectiveResults: Array.isArray(raw.objectiveResults) ? raw.objectiveResults : objectiveResults,
    discursiveScores: Array.isArray(raw.discursiveScores) ? raw.discursiveScores : discursiveScores,
    totalScore: Number(raw.notaTotal ?? raw.totalScore ?? 0),
    maxScore: Number(raw.versaoProva?.prova?.maxScore ?? raw.maxScore ?? 10),
    confirmedAt: String(
      raw.dataConfirmacao || raw.createdAt || raw.confirmedAt || new Date().toISOString()
    ),
    isAutomaticallyAssigned: Boolean(raw.atribuicaoAutomatica ?? raw.isAutomaticallyAssigned),
    syncStatus: 'synced',
  };
}

export function generateDisciplineCode(name: string, explicitCode?: string): string {
  const cleanExplicit = (explicitCode || '').trim().toUpperCase();
  if (cleanExplicit) return cleanExplicit;

  const prefix =
    (name || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9]/g, '')
      .substring(0, 3)
      .toUpperCase() || 'DSC';

  return `${prefix}-${Math.floor(100 + Math.random() * 900)}`;
}

export function buildDisciplinePayload(data: {
  nome?: string;
  name?: string;
  codigo?: string;
  code?: string;
  curso?: string;
  course?: string;
  idProfessor?: string;
  teacherId?: string;
}): { nome: string; codigo: string; curso: string; idProfessor?: string } {
  const nome = (data.nome || data.name || '').trim();
  const codigo = generateDisciplineCode(nome, data.codigo || data.code);
  const curso = (data.curso || data.course || '').trim() || 'Direito';
  const professorId = (data.idProfessor || data.teacherId || '').trim();

  return {
    nome,
    codigo,
    curso,
    ...(professorId ? { idProfessor: professorId } : {}),
  };
}

export function sanitizeExamPayload<T extends Record<string, any>>(payload: T): T {
  const now = new Date();
  const defaultSemester = `${now.getFullYear()}.${now.getMonth() < 6 ? 1 : 2}`;
  const defaultDate = now.toLocaleDateString('pt-BR');

  const sanitized: Record<string, any> = { ...payload };

  const isFullExamPayload =
    'title' in payload || 'discipline' in payload || 'selectedQuestionIds' in payload;

  if (isFullExamPayload) {
    const semester = String(payload.semester || '').trim() || defaultSemester;
    const discipline = String(payload.discipline || '').trim();
    const title = String(payload.title || '').trim();

    sanitized.title = title;
    sanitized.discipline = discipline;
    sanitized.semester = semester;
    sanitized.subtitle = String(payload.subtitle || '').trim() || `Período Letivo ${semester}`;
    sanitized.institution =
      String(payload.institution || '').trim() || 'CATÓLICA DE SANTA CATARINA';
    sanitized.department =
      String(payload.department || '').trim() ||
      'Centro Universitário Católica de Santa Catarina';
    sanitized.course = String(payload.course || '').trim() || 'Graduação';
    sanitized.classGroup = String(payload.classGroup || '').trim() || 'Turma Geral';
    sanitized.date = String(payload.date || '').trim() || defaultDate;
    sanitized.duration = String(payload.duration || '').trim() || '2 horas';
    if (typeof payload.instructions === 'string') {
      sanitized.instructions = payload.instructions.trim();
    }

    // Never send optimistic/temporary frontend discipline IDs (disc-...) to the backend FK check
    const rawDisciplinaId =
      typeof payload.disciplinaId === 'string' ? payload.disciplinaId.trim() : '';
    if (!rawDisciplinaId || rawDisciplinaId.startsWith('disc-')) {
      delete sanitized.disciplinaId;
    } else {
      sanitized.disciplinaId = rawDisciplinaId;
    }

    // Keep selectedQuestionIds strictly in sync with selectedQuestions to avoid backend mismatch 400
    if (Array.isArray(payload.selectedQuestions) && payload.selectedQuestions.length > 0) {
      sanitized.selectedQuestionIds = payload.selectedQuestions.map((q: any) => String(q.id));
    }
  }

  return sanitized as T;
}

export const api = {
  // 1. Health & Status
  async checkHealth(): Promise<{ online: boolean; data?: HealthCheckResponse }> {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/health`, { method: 'GET' }, 5000);
      if (res.ok) {
        const data = await res.json();
        return { online: true, data };
      }
      return { online: false };
    } catch {
      return { online: false };
    }
  },

  // 1.1 Professores (Autenticação Real JWT + bcrypt no banco)
  async loginProfessor(data: { email: string; senha: string }): Promise<AuthResponseDTO> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/professores/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: data.email.trim().toLowerCase(),
        senha: data.senha,
      }),
    });
    if (!res.ok) {
      throw await parseErrorResponse(res, 'E-mail institucional ou senha incorretos.');
    }
    const json = await res.json();
    return json.data || json;
  },

  async createProfessor(data: {
    nomeCompleto: string;
    email: string;
    senha: string;
  }): Promise<AuthResponseDTO> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/professores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nomeCompleto: data.nomeCompleto.trim(),
        email: data.email.trim().toLowerCase(),
        senha: data.senha,
      }),
    });
    if (!res.ok) {
      throw await parseErrorResponse(res, 'Falha ao cadastrar docente no servidor.');
    }
    const json = await res.json();
    return json.data || json;
  },

  async getCurrentProfessor(): Promise<ProfessorProfileDTO> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/professores/me`, {
      method: 'GET',
    });
    if (!res.ok) {
      throw await parseErrorResponse(res, 'Sessão inválida ou expirada.');
    }
    const json = await res.json();
    return json.data || json;
  },

  async getProfessorById(id: string): Promise<ProfessorProfileDTO> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/professores/${encodeURIComponent(id)}`, {
      method: 'GET',
    });
    if (!res.ok) {
      throw await parseErrorResponse(res, 'Professor não encontrado.');
    }
    const json = await res.json();
    return json.data || json;
  },

  async changePassword(data: {
    senhaAtual: string;
    novaSenha: string;
  }): Promise<{ message?: string }> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/professores/me/password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      throw await parseErrorResponse(res, 'Não foi possível alterar a senha.');
    }
    return res.json();
  },

  async forgotPassword(email: string): Promise<{ message?: string }> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/professores/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
    if (!res.ok) {
      throw await parseErrorResponse(
        res,
        'Serviço de recuperação por e-mail indisponível no momento.'
      );
    }
    return res.json();
  },

  async resetPassword(data: { token: string; novaSenha: string }): Promise<{ message?: string }> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/professores/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      throw await parseErrorResponse(res, 'Token inválido ou expirado.');
    }
    return res.json();
  },

  async anonymizeProfessorAccount(teacherId?: string): Promise<boolean> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/professores/me/anonymize`, {
      method: 'POST',
    });
    if (res.ok) return true;
    if (res.status === 404) {
      return this.anonymizeTeacherData(teacherId);
    }
    throw await parseErrorResponse(res, 'Não foi possível anonimizar a conta.');
  },

  // 2. Disciplinas
  async getDisciplinas(): Promise<Discipline[]> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/disciplinas`);
    if (!res.ok) throw await parseErrorResponse(res, 'Falha ao carregar disciplinas');
    const json = await res.json();
    return (json.data || []).map((d: any) => ({
      id: String(d.id),
      teacherId: String(d.idProfessor || d.teacherId || ''),
      code: String(d.codigo || d.code || ''),
      name: String(d.nome || d.name || ''),
      course: String(d.curso || d.course || ''),
      createdAt: String(d.createdAt || new Date().toISOString()),
    }));
  },

  async createDisciplina(data: {
    nome?: string;
    name?: string;
    codigo?: string;
    code?: string;
    curso?: string;
    course?: string;
    idProfessor?: string;
    teacherId?: string;
  }): Promise<Discipline> {
    const payload = buildDisciplinePayload(data);
    if (!payload.nome) {
      throw new ApiError('O nome da disciplina é obrigatório.', 400);
    }
    const res = await fetchWithTimeout(
      `${API_BASE_URL}/disciplinas`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      15000
    );
    if (!res.ok) throw await parseErrorResponse(res, 'Falha ao criar disciplina');
    const json = await res.json();
    const d = json.data || {};
    return {
      id: String(d.id),
      teacherId: String(d.idProfessor || d.teacherId || payload.idProfessor || ''),
      code: String(d.codigo || d.code || payload.codigo),
      name: String(d.nome || d.name || payload.nome),
      course: String(d.curso || d.course || payload.curso),
      createdAt: String(d.createdAt || new Date().toISOString()),
    };
  },

  async deleteDisciplina(id: string): Promise<boolean> {
    const res = await fetchWithTimeout(
      `${API_BASE_URL}/disciplinas/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
      },
      15000
    );
    if (!res.ok) {
      throw await parseErrorResponse(res, 'Não foi possível remover a disciplina.');
    }
    return true;
  },

  // 3. Turmas
  async getTurmas(): Promise<Class[]> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/turmas`);
    if (!res.ok) throw await parseErrorResponse(res, 'Falha ao carregar turmas');
    const json = await res.json();
    return (json.data || []).map((t: any) => ({
      id: String(t.id),
      teacherId: String(t.idProfessor || t.teacherId || ''),
      disciplineId: t.idDisciplina ? String(t.idDisciplina) : undefined,
      name: String(t.nome || t.name || ''),
      subject: String(t.disciplina?.nome || t.subject || ''),
      term: String(t.periodoLetivo || t.term || ''),
      status: t.status === 'archived' || t.status === 'Arquivada' ? 'archived' : 'active',
      inviteCode: String(t.codigoConvite || t.inviteCode || ''),
      createdAt: String(t.createdAt || new Date().toISOString()),
      studentCount: Number(t._count?.students ?? t._count?.alunos ?? t.studentCount ?? 0),
    }));
  },

  async createTurma(data: {
    nome: string;
    idDisciplina: string;
    periodoLetivo: string;
    idProfessor?: string;
    codigoConvite?: string;
  }): Promise<any> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/turmas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw await parseErrorResponse(res, 'Falha ao criar turma');
    const json = await res.json();
    return json.data;
  },

  async updateTurma(id: string, data: any): Promise<any> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/turmas/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.ok;
  },

  async deleteTurma(id: string): Promise<boolean> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/turmas/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return res.ok;
  },

  // 4. Alunos / Students
  async getStudents(classId?: string): Promise<Student[]> {
    const url = classId
      ? `${API_BASE_URL}/students?classId=${encodeURIComponent(classId)}`
      : `${API_BASE_URL}/students`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) throw await parseErrorResponse(res, 'Falha ao carregar alunos');
    const json = await res.json();
    return (json.data || []).map((s: any) => ({
      id: String(s.id),
      name: String(s.name || ''),
      registration: String(s.registration || ''),
      course: String(s.course || ''),
      email: String(s.email || ''),
      classGroup: String(s.classGroup || ''),
      discipline: String(s.discipline || ''),
      examsTaken: Number(s.examsTaken || 0),
      overallAverage: Number(s.overallAverage || 0),
    }));
  },

  async createStudent(data: Omit<Student, 'id'>): Promise<Student> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw await parseErrorResponse(res, 'Falha ao criar aluno');
    const json = await res.json();
    return json.data;
  },

  async updateStudent(id: string, data: Partial<Student>): Promise<any> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/students/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.ok;
  },

  async importStudentsBatch(students: Omit<Student, 'id'>[]): Promise<Student[]> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/students/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ students }),
    });
    if (!res.ok) throw await parseErrorResponse(res, 'Falha ao importar alunos em lote');
    const json = await res.json();
    return json.data || [];
  },

  async importStudentsExcelFile(file: File): Promise<{
    importedCount: number;
    skippedCount: number;
    totalStudents: number;
    errors?: Array<{ row: number; reason: string }>;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetchWithTimeout(
      `${API_BASE_URL}/students/import`,
      {
        method: 'POST',
        body: formData,
      },
      15000
    );
    if (!res.ok) {
      throw await parseErrorResponse(res, 'Falha ao importar planilha de alunos');
    }
    const json = await res.json();
    return json.data || json;
  },

  getStudentImportTemplateUrl(): string {
    return `${API_BASE_URL}/students/import-template`;
  },

  async deleteStudent(id: string): Promise<boolean> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/students/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return res.ok;
  },

  async deleteStudentsBatch(ids: string[]): Promise<boolean> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/students/batch-delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    return res.ok;
  },

  // 5. Banco de Questões
  async getQuestions(filter?: { discipline?: string; difficulty?: string }): Promise<Question[]> {
    const params = new URLSearchParams();
    if (filter?.discipline) params.append('discipline', filter.discipline);
    if (filter?.difficulty) params.append('difficulty', filter.difficulty);

    const qs = params.toString();
    const res = await fetchWithTimeout(`${API_BASE_URL}/questions${qs ? `?${qs}` : ''}`);
    if (!res.ok) throw await parseErrorResponse(res, 'Falha ao carregar questões');
    const json = await res.json();
    return json.data || [];
  },

  async createQuestion(data: any): Promise<Question> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw await parseErrorResponse(res, 'Falha ao criar questão');
    const json = await res.json();
    return json.data;
  },

  async updateQuestion(id: string, data: any): Promise<any> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/questions/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.ok;
  },

  async deleteQuestion(id: string): Promise<boolean> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/questions/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return res.ok;
  },

  // 6. Provas, Layout, Folha de Respostas & QR Code
  async getExams(): Promise<any[]> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/exams`);
    if (!res.ok) throw await parseErrorResponse(res, 'Falha ao carregar provas do backend');
    const json = await res.json();
    return json.data || [];
  },

  async createExam(payload: any): Promise<any> {
    const sanitized = sanitizeExamPayload(payload);
    const res = await fetchWithTimeout(
      `${API_BASE_URL}/exams`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sanitized),
      },
      15000
    );
    if (!res.ok) {
      throw await parseErrorResponse(res, 'Falha ao salvar prova no banco de dados');
    }
    const json = await res.json();
    return json.data;
  },

  async updateExam(id: string, payload: any): Promise<any> {
    const sanitized = sanitizeExamPayload(payload);
    const res = await fetchWithTimeout(
      `${API_BASE_URL}/exams/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sanitized),
      },
      15000
    );
    if (!res.ok) {
      throw await parseErrorResponse(res, 'Falha ao atualizar prova no banco de dados');
    }
    const json = await res.json();
    return json.data;
  },

  async deleteExam(id: string): Promise<boolean> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/exams/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return res.ok;
  },

  async getExamLayout(examId: string, versionLetter = 'A'): Promise<BackendExamLayoutDTO | null> {
    const res = await fetchWithTimeout(
      `${API_BASE_URL}/exams/${encodeURIComponent(examId)}/layout?versionLetter=${encodeURIComponent(versionLetter)}`
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || null;
  },

  async getAnswerSheet(examId: string, versionLetter = 'A'): Promise<any | null> {
    const res = await fetchWithTimeout(
      `${API_BASE_URL}/exams/${encodeURIComponent(examId)}/answer-sheet?versionLetter=${encodeURIComponent(versionLetter)}&includeAnswerKey=true`
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || null;
  },

  async validateQrCode(qrCodePayload: string): Promise<{
    valid: boolean;
    decoded?: {
      appId: string;
      vId: string;
      ver: string;
      code: string;
      stdId?: string;
      reg?: string;
      ts: number;
      chk: string;
    };
    error?: string;
  }> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/qr-codes/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qrCodePayload }),
    });
    const json = await res.json().catch(() => ({}));
    const payload = json.data || json;
    return {
      valid: Boolean(payload.isValid ?? payload.valid),
      decoded: payload.decoded,
      error: payload.errorMessage || json.error,
    };
  },

  getExamPdfUrl(
    examId: string,
    options: {
      versionLetter: string;
      showAnswerKey?: boolean;
      showQrCode?: boolean;
      includeBoxNota?: boolean;
      isDuplex?: boolean;
      includeAnswerSheet?: boolean;
    }
  ) {
    const params = new URLSearchParams({
      versionLetter: options.versionLetter,
      showAnswerKey: String(options.showAnswerKey ?? false),
      showQrCode: String(options.showQrCode ?? true),
      includeBoxNota: String(options.includeBoxNota ?? true),
      isDuplex: String(options.isDuplex ?? false),
      includeAnswerSheet: String(options.includeAnswerSheet ?? true),
    });
    return `${API_BASE_URL}/exams/${encodeURIComponent(examId)}/download-pdf?${params.toString()}`;
  },

  async generateVariations(
    examId: string,
    payload: {
      examId?: string;
      numberOfVersions: number;
      shuffleQuestions?: boolean;
      shuffleAlternatives?: boolean;
      permutationStrategy?: 'FISHER_YATES' | 'CYCLIC_ROTATION';
      questionIds?: string[];
    }
  ) {
    const res = await fetchWithTimeout(
      `${API_BASE_URL}/exams/${encodeURIComponent(examId)}/variations/generate`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, examId }),
      }
    );
    if (!res.ok) throw await parseErrorResponse(res, 'Falha ao gerar variações no backend');
    return res.json();
  },

  // 7. Correções OMR & Lançamento Manual
  async getCorrecoes(): Promise<Correction[]> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/correcoes`);
    if (!res.ok) throw await parseErrorResponse(res, 'Falha ao carregar correções');
    const json = await res.json();
    return (json.data || []).map(mapBackendCorrecao);
  },

  async resolveExamVersionUuid(examId: string, versionLetter = 'A'): Promise<string | null> {
    if (!examId) return null;
    try {
      const remoteExams = await this.getExams();
      const targetExam = remoteExams.find((e: any) => String(e.id) === String(examId));
      const versions: any[] = Array.isArray(targetExam?.versions) ? targetExam.versions : [];
      const upper = String(versionLetter || 'A').trim().toUpperCase();
      const matched =
        versions.find((v: any) => String(v.versionLetter || '').toUpperCase() === upper) ||
        versions[0];
      if (matched?.id && isUuid(String(matched.id))) {
        return String(matched.id);
      }
    } catch {
      // ignore lookup failures; caller will handle
    }
    return null;
  },

  async createCorrecao(payload: {
    idVersaoProva: string;
    idProva?: string;
    versaoMarcada?: string;
    idAluno?: string;
    nomeManuscrito?: string;
    matriculaManuscrita?: string;
    notaTotal: number;
    respostasLidas: Record<string, string>;
    atribuicaoAutomatica?: boolean;
  }): Promise<any> {
    let resolvedVersionId = (payload.idVersaoProva || '').trim();
    const versionLetter = (payload.versaoMarcada || 'A').trim().toUpperCase();

    // If caller passed a synthetic ID (e.g. "<examId>-A"), resolve the real VersaoProva UUID from DB first
    if (!isUuid(resolvedVersionId) && payload.idProva) {
      const dbVersionId = await this.resolveExamVersionUuid(payload.idProva, versionLetter);
      if (dbVersionId) {
        resolvedVersionId = dbVersionId;
      }
    }

    const buildBody = (verId: string) =>
      JSON.stringify({
        ...payload,
        idVersaoProva: verId,
        versaoMarcada: versionLetter,
        idAluno: payload.idAluno && isUuid(payload.idAluno) ? payload.idAluno : undefined,
      });

    let res = await fetchWithTimeout(
      `${API_BASE_URL}/correcoes`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: buildBody(resolvedVersionId),
      },
      15000
    );

    // Retry once if the cached VersaoProva UUID was regenerated on the server
    if (!res.ok && payload.idProva) {
      const firstErr = await parseErrorResponse(res, 'Falha ao registrar correção no backend');
      if (firstErr.message.includes('id_versao_prova')) {
        const freshVersionId = await this.resolveExamVersionUuid(payload.idProva, versionLetter);
        if (freshVersionId && freshVersionId !== resolvedVersionId) {
          res = await fetchWithTimeout(
            `${API_BASE_URL}/correcoes`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: buildBody(freshVersionId),
            },
            15000
          );
          if (!res.ok) {
            throw await parseErrorResponse(res, 'Falha ao registrar correção no backend');
          }
          const retryJson = await res.json();
          return retryJson.data;
        }
      }
      throw firstErr;
    }

    if (!res.ok) throw await parseErrorResponse(res, 'Falha ao registrar correção no backend');
    const json = await res.json();
    return json.data;
  },

  async assignStudentToCorrection(correctionId: string, studentId: string): Promise<any> {
    const res = await fetchWithTimeout(
      `${API_BASE_URL}/correcoes/${encodeURIComponent(correctionId)}/assign-student`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idAluno: studentId }),
      }
    );
    if (!res.ok) throw await parseErrorResponse(res, 'Falha ao vincular aluno');
    return res.json();
  },

  // 8. Configurações
  async getSettings(teacherId?: string): Promise<any> {
    const qs = teacherId ? `?teacherId=${encodeURIComponent(teacherId)}` : '';
    const res = await fetchWithTimeout(`${API_BASE_URL}/settings${qs}`);
    if (!res.ok) throw await parseErrorResponse(res, 'Falha ao carregar configurações');
    const json = await res.json();
    return json.data;
  },

  async updateSettings(data: any, teacherId?: string): Promise<any> {
    const qs = teacherId ? `?teacherId=${encodeURIComponent(teacherId)}` : '';
    const res = await fetchWithTimeout(`${API_BASE_URL}/settings${qs}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw await parseErrorResponse(res, 'Falha ao salvar configurações');
    const json = await res.json();
    return json.data || json;
  },

  async resetSettings(teacherId?: string): Promise<any> {
    const qs = teacherId ? `?teacherId=${encodeURIComponent(teacherId)}` : '';
    const res = await fetchWithTimeout(`${API_BASE_URL}/settings/reset${qs}`, {
      method: 'POST',
    });
    if (!res.ok) throw await parseErrorResponse(res, 'Falha ao restaurar padrões');
    const json = await res.json();
    return json.data || json;
  },

  async anonymizeTeacherData(teacherId?: string): Promise<boolean> {
    const qs = teacherId ? `?teacherId=${encodeURIComponent(teacherId)}` : '';
    const res = await fetchWithTimeout(`${API_BASE_URL}/settings/anonymize${qs}`, {
      method: 'POST',
    });
    return res.ok;
  },

  // 9. API Auxiliar OMR (/api/omr)
  async gradeOmrSheet(payload: {
    markedAnswers: Record<number | string, string | null>;
    officialAnswerKey: Record<number | string, string>;
    totalQuestions: number;
    versionLetter?: string;
    maxScore?: number;
  }): Promise<{
    success: boolean;
    engine?: string;
    versionLetter?: string;
    grading?: {
      correctCount: number;
      totalQuestions: number;
      totalScore: number;
      maxScore: number;
      details: Array<{
        questionNumber: number;
        questionId: string;
        chosen: 'A' | 'B' | 'C' | 'D' | 'E' | null;
        correct: 'A' | 'B' | 'C' | 'D' | 'E';
        isCorrect: boolean;
        score: number;
      }>;
    };
    error?: string;
  }> {
    const res = await fetchWithTimeout(
      '/api/omr',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'grade',
          ...payload,
        }),
      },
      10000
    );
    return res.json();
  },
};
