import { Question, Student, Class, Discipline, Correction } from './types';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://back-end-coral-eta.vercel.app/api/v1';

export interface HealthCheckResponse {
  status: string;
  service: string;
  timestamp: string;
  dataSource?: string;
  modules?: Record<string, string>;
}

/**
 * Utilitário fetch resiliente com timeout
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 6000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const api = {
  // 1. Health & Status
  async checkHealth(): Promise<{ online: boolean; data?: HealthCheckResponse }> {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/health`, { method: 'GET' }, 4000);
      if (res.ok) {
        const data = await res.json();
        return { online: true, data };
      }
      return { online: false };
    } catch (err) {
      return { online: false };
    }
  },

  // 2. Disciplinas
  async getDisciplinas(): Promise<Discipline[]> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/disciplinas`);
    if (!res.ok) throw new Error('Falha ao carregar disciplinas');
    const json = await res.json();
    return json.data || [];
  },

  async createDisciplina(data: { nome: string; codigo: string; curso: string; idProfessor?: string }): Promise<Discipline> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/disciplinas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Falha ao criar disciplina');
    const json = await res.json();
    return json.data;
  },

  // 3. Turmas
  async getTurmas(): Promise<Class[]> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/turmas`);
    if (!res.ok) throw new Error('Falha ao carregar turmas');
    const json = await res.json();
    // Mapeia retorno do backend para tipo Class do frontend
    return (json.data || []).map((t: any) => ({
      id: t.id,
      name: t.nome,
      code: t.codigo || t.nome.substring(0, 8),
      course: t.disciplina?.curso || 'Geral',
      subject: t.disciplina?.nome || 'Disciplina',
      term: t.periodoLetivo,
      activeStudentsCount: t._count?.students ?? t._count?.alunos ?? 0,
      totalExamsCount: t._count?.provas ?? 0,
      passingAverage: 7.0,
      currentTermAverage: 7.5,
      attendanceRate: 92,
      shift: 'Matutino',
      status: t.status || 'Ativa',
    }));
  },

  async createTurma(data: { nome: string; idDisciplina: string; periodoLetivo: string; idProfessor?: string }): Promise<any> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/turmas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Falha ao criar turma');
    const json = await res.json();
    return json.data;
  },

  // 4. Alunos / Students
  async getStudents(classId?: string): Promise<Student[]> {
    const url = classId ? `${API_BASE_URL}/students?classId=${classId}` : `${API_BASE_URL}/students`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) throw new Error('Falha ao carregar alunos');
    const json = await res.json();
    return (json.data || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      registration: s.registration,
      course: s.course,
      email: s.email,
      classGroup: s.classGroup,
      discipline: s.discipline,
      examsTaken: s.examsTaken || 0,
      overallAverage: s.overallAverage || 0,
    }));
  },

  async createStudent(data: Omit<Student, 'id'>): Promise<Student> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Falha ao criar aluno');
    const json = await res.json();
    return json.data;
  },

  async importStudentsBatch(students: Omit<Student, 'id'>[]): Promise<Student[]> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/students/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ students }),
    });
    if (!res.ok) throw new Error('Falha ao importar alunos em lote');
    const json = await res.json();
    return json.data || [];
  },

  async deleteStudent(id: string): Promise<boolean> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/students/${id}`, {
      method: 'DELETE',
    });
    return res.ok;
  },

  // 5. Banco de Questões
  async getQuestions(filter?: { discipline?: string; difficulty?: string }): Promise<Question[]> {
    const params = new URLSearchParams();
    if (filter?.discipline) params.append('discipline', filter.discipline);
    if (filter?.difficulty) params.append('difficulty', filter.difficulty);

    const res = await fetchWithTimeout(`${API_BASE_URL}/questions?${params.toString()}`);
    if (!res.ok) throw new Error('Falha ao carregar questões');
    const json = await res.json();
    return json.data || [];
  },

  async createQuestion(data: any): Promise<Question> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Falha ao criar questão');
    const json = await res.json();
    return json.data;
  },

  // 6. Provas & Download PDF
  getExamPdfUrl(examId: string, options: { versionLetter: string; showAnswerKey?: boolean; showQrCode?: boolean; includeBoxNota?: boolean }) {
    const params = new URLSearchParams({
      versionLetter: options.versionLetter,
      showAnswerKey: String(options.showAnswerKey ?? false),
      showQrCode: String(options.showQrCode ?? true),
      includeBoxNota: String(options.includeBoxNota ?? true),
    });
    return `${API_BASE_URL}/exams/${examId}/download-pdf?${params.toString()}`;
  },

  async generateVariations(examId: string, payload: { studentRegistrations: string[]; count: number }) {
    const res = await fetchWithTimeout(`${API_BASE_URL}/exams/${examId}/variations/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Falha ao gerar variações no backend');
    return res.json();
  },

  // 7. Correções OMR & Lançamento Manual
  async getCorrecoes(): Promise<Correction[]> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/correcoes`);
    if (!res.ok) throw new Error('Falha ao carregar correções');
    const json = await res.json();
    return json.data || [];
  },

  async assignStudentToCorrection(correctionId: string, studentId: string): Promise<any> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/correcoes/${correctionId}/assign-student`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idAluno: studentId }),
    });
    if (!res.ok) throw new Error('Falha ao vincular aluno');
    return res.json();
  },

  // 8. Configurações
  async getSettings(): Promise<any> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/settings`);
    if (!res.ok) throw new Error('Falha ao carregar configurações');
    const json = await res.json();
    return json.data;
  },

  async updateSettings(data: any): Promise<any> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Falha ao salvar configurações');
    return res.json();
  },
};
