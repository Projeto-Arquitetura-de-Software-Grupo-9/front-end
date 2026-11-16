'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import {
  downloadFile,
  getResults,
  getReportExams,
  ResultsReport,
} from '@/lib/results';
import {
  TrendingUp,
  Download,
  RefreshCw,
  Users,
  Award,
  BarChart2,
  Activity,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Search,
  Table,
  BarChart3,
  FileSpreadsheet,
  Check,
  X,
  FileText,
} from 'lucide-react';

const formatScore = (n: number | null) =>
  n === null ? '—' : n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

export const ResultsScreen: React.FC = () => {
  const { activeExamId, setActiveExamId, addToast, setCurrentScreen } = useApp();

  const [catalog, setCatalog] = useState<{
    exams: { id: string; title: string }[];
    source: string;
    error: string;
  } | null>(null);

  const exams = catalog?.exams || [];
  const examId =
    exams.find((e) => e.id === activeExamId)?.id || exams[0]?.id || '';

  const [request, setRequest] = useState<{
    key: string;
    data: ResultsReport | null;
    error: string;
  } | null>(null);

  const [exporting, setExporting] = useState(false);
  const [versionId, setVersionId] = useState('');
  const [revision, setRevision] = useState(0);
  const [activeTab, setActiveTab] = useState<'matriz' | 'psicometria'>('matriz');
  const [matrixSearch, setMatrixSearch] = useState('');

  const requestKey = `${examId}:${revision}`;
  const loading = Boolean(examId) && request?.key !== requestKey;
  const error = request?.key === requestKey ? request.error : '';

  // Fetch exams catalog from backend
  useEffect(() => {
    const controller = new AbortController();
    getReportExams(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setCatalog({
            exams: result.data,
            source: result.dataSource,
            error: '',
          });
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setCatalog({
            exams: [],
            source: '',
            error:
              err instanceof Error
                ? err.message
                : 'Falha ao listar avaliações do servidor.',
          });
        }
      });
    return () => controller.abort();
  }, [revision]);

  // Fetch results for selected exam
  useEffect(() => {
    if (!examId) return;
    const controller = new AbortController();
    getResults(examId, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setRequest({ key: requestKey, data, error: '' });
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setRequest({
            key: requestKey,
            data: null,
            error:
              err instanceof Error
                ? err.message
                : 'Falha ao carregar resultados da avaliação.',
          });
        }
      });
    return () => controller.abort();
  }, [examId, requestKey]);

  const report =
    request?.key === requestKey && request.data?.examId === examId
      ? request.data
      : null;

  // Selected version (caderno)
  const version =
    report?.versions.find((v) => v.id === versionId) || report?.versions[0];

  // Filtered student rows in matrix
  const filteredRows = useMemo(() => {
    if (!version?.rows) return [];
    const q = matrixSearch.trim().toLowerCase();
    if (!q) return version.rows;
    return version.rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.registration.toLowerCase().includes(q)
    );
  }, [version, matrixSearch]);

  const exportExcel = async () => {
    setExporting(true);
    try {
      await downloadFile(
        `/reports/${encodeURIComponent(examId)}/results?format=xlsx`,
        `resultados_${examId}.xlsx`
      );
      addToast({
        type: 'success',
        title: 'Planilha Exportada com Sucesso!',
        message: 'O relatório consolidado em Excel foi baixado.',
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Falha na Exportação',
        message:
          err instanceof Error
            ? err.message
            : 'Não foi possível exportar a planilha.',
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <TrendingUp className="w-6 h-6 text-[#9E0B1A]" />
            <span>Resultados e Análise de Desempenho</span>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Métricas psicométricas, matriz de acertos e distribuição estatística dos cadernos de prova.
          </p>
        </div>

        {/* Action Controls Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Exam Selector */}
          <div className="relative">
            <select
              aria-label="Prova"
              value={examId}
              onChange={(e) => setActiveExamId(e.target.value)}
              disabled={loading || exams.length === 0}
              className="text-xs font-semibold text-slate-800 bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2.5 pr-8 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#9E0B1A] shadow-2xs max-w-xs truncate"
            >
              {exams.length === 0 ? (
                <option value="">Nenhuma prova cadastrada</option>
              ) : (
                exams.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => setRevision((r) => r + 1)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-2xs transition cursor-pointer disabled:opacity-50"
            title="Recarregar dados do backend"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#9E0B1A]' : 'text-slate-500'}`} />
            <span>Atualizar</span>
          </button>

          {/* Export to Excel */}
          <button
            onClick={exportExcel}
            disabled={!report || loading || exporting}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#9E0B1A] hover:bg-[#850916] text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{exporting ? 'Exportando...' : 'Exportar Excel'}</span>
          </button>
        </div>
      </div>

      {/* Catalog & Network Status Feedback */}
      {!catalog && (
        <div className="p-6 bg-white border border-slate-200 rounded-2xl flex items-center gap-3 text-slate-600 text-xs">
          <RefreshCw className="w-4 h-4 animate-spin text-[#9E0B1A]" />
          <span>Sincronizando avaliações com o servidor backend...</span>
        </div>
      )}

      {catalog?.error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{catalog.error}</span>
        </div>
      )}

      {catalog && !catalog.error && exams.length === 0 && (
        <div className="p-8 bg-white border border-dashed border-slate-200 rounded-3xl text-center space-y-2">
          <FileText className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-sm font-semibold text-slate-700">Nenhuma avaliação encontrada</p>
          <p className="text-xs text-slate-500">Crie ou publique uma avaliação para visualizar suas estatísticas.</p>
        </div>
      )}

      {loading && (
        <div className="p-8 bg-white border border-slate-200 rounded-2xl text-center space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin text-[#9E0B1A] mx-auto" />
          <p className="text-xs font-semibold text-slate-600">Calculando indicadores psicométricos e matriz de notas...</p>
        </div>
      )}

      {error && !loading && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setRevision((r) => r + 1)}
            className="text-xs font-bold text-[#9E0B1A] underline cursor-pointer"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Report Data Display */}
      {report && !loading && (
        <>
          {/* Pending Unassigned Corrections Callout */}
          {report.pendingCount > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 flex-shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-900">
                    {report.pendingCount} folha(s) de resposta sem aluno vinculado
                  </h4>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Estas correções foram processadas pelo leitor óptico, mas aguardam identificação para compor as médias.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setCurrentScreen('lancamento-manual')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-2xs transition cursor-pointer self-start sm:self-auto whitespace-nowrap"
              >
                <span>Vincular Folhas Avulsas</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* Alunos */}
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-2xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Alunos Identificados</span>
                <div className="w-8 h-8 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2.5">
                <span className="text-2xl font-black text-slate-900">
                  {report.metrics.count}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">folhas vinculadas</span>
              </div>
            </div>

            {/* Média */}
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-2xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Média Geral</span>
                <div className="w-8 h-8 rounded-xl bg-red-50 text-[#9E0B1A] flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2.5">
                <span className="text-2xl font-black text-slate-900">
                  {formatScore(report.metrics.average)}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">escala 0.0 a 10.0</span>
              </div>
            </div>

            {/* Mediana */}
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-2xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Mediana</span>
                <div className="w-8 h-8 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center">
                  <BarChart2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2.5">
                <span className="text-2xl font-black text-slate-900">
                  {formatScore(report.metrics.median)}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">ponto central</span>
              </div>
            </div>

            {/* Desvio Padrão */}
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-2xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Desvio Padrão</span>
                <div className="w-8 h-8 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2.5">
                <span className="text-2xl font-black text-slate-900">
                  {formatScore(report.metrics.standardDeviation)}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">dispersão amostral</span>
              </div>
            </div>

            {/* Maior / Menor Nota */}
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-2xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Extremos (Max / Min)</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2.5 flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-700">
                  {formatScore(report.metrics.highest)}
                </span>
                <span className="text-xs text-slate-400 font-semibold">
                  / {formatScore(report.metrics.lowest)}
                </span>
              </div>
            </div>
          </div>

          {/* Sub-Header & Caderno Selector Tabs */}
          <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden">
            {/* Navigation Tabs Bar */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Caderno Selector Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-1 whitespace-nowrap">
                  Caderno:
                </span>
                {report.versions.map((v) => {
                  const isCurrent = (version?.id || report.versions[0]?.id) === v.id;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setVersionId(v.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                        isCurrent
                          ? 'bg-[#9E0B1A] text-white shadow-2xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/60'
                      }`}
                    >
                      <span>Caderno {v.letter}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                          isCurrent
                            ? 'bg-red-800/60 text-white'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {v.rows.length}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* View Switcher: Matriz vs Psicometria */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start md:self-auto">
                <button
                  onClick={() => setActiveTab('matriz')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    activeTab === 'matriz'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Table className="w-3.5 h-3.5" />
                  <span>Matriz de Desempenho</span>
                </button>

                <button
                  onClick={() => setActiveTab('psicometria')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    activeTab === 'psicometria'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Psicometria & Questões</span>
                </button>
              </div>
            </div>

            {/* View 1: Matriz de Respostas dos Alunos */}
            {activeTab === 'matriz' && (
              <div className="p-4 sm:p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={matrixSearch}
                      onChange={(e) => setMatrixSearch(e.target.value)}
                      placeholder="Filtrar por nome ou matrícula do aluno..."
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#9E0B1A]"
                    />
                  </div>

                  {/* Legend */}
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300 inline-block"></span>
                      Acerto
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded bg-rose-100 border border-rose-300 inline-block"></span>
                      Erro
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded bg-slate-100 border border-slate-300 inline-block"></span>
                      Em branco / Rasura
                    </span>
                  </div>
                </div>

                {!version?.rows.length ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    Nenhuma folha de resposta confirmada para o Caderno {version?.letter || 'selecionado'}.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4 min-w-[200px]">Aluno / Matrícula</th>
                          <th className="py-3 px-3 text-center min-w-[70px]">Nota</th>
                          {version.questions.map((q) => (
                            <th
                              key={q.number}
                              className="py-2.5 px-2 text-center min-w-[44px] font-mono"
                              title={`Questão ${q.number} • Gabarito Oficial: ${q.correct}`}
                            >
                              <span className="block font-bold text-slate-800">Q{q.number}</span>
                              <span className="block text-[10px] text-emerald-700 font-semibold bg-emerald-50 rounded px-1 py-0.2 mt-0.5">
                                {q.correct}
                              </span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredRows.map((row) => {
                          const isPass = row.score >= 7.0;
                          const isWarning = row.score >= 5.0 && row.score < 7.0;

                          return (
                            <tr key={row.id} className="hover:bg-slate-50/70 transition">
                              <td className="py-3 px-4">
                                <div className="font-bold text-slate-900">{row.name}</div>
                                <div className="text-[11px] font-mono text-slate-400">
                                  {row.registration}
                                  {row.pending && (
                                    <span className="ml-1.5 text-amber-600 font-semibold">
                                      • Atribuição pendente
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td className="py-3 px-3 text-center">
                                <span
                                  className={`inline-block px-2.5 py-1 rounded-lg font-bold text-xs ${
                                    isPass
                                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/60'
                                      : isWarning
                                      ? 'bg-amber-50 text-amber-800 border border-amber-200/60'
                                      : 'bg-rose-50 text-rose-800 border border-rose-200/60'
                                  }`}
                                >
                                  {formatScore(row.score)}
                                </span>
                              </td>

                              {row.answers.map((a) => (
                                <td key={a.number} className="py-2 px-1 text-center">
                                  <span
                                    title={`Resposta: ${a.chosen || 'Em branco'} | Gabarito: ${a.correct}`}
                                    className={`inline-flex items-center justify-center w-7 h-7 rounded-lg font-mono font-bold text-xs ${
                                      a.chosen === null
                                        ? 'bg-slate-100 text-slate-400'
                                        : a.isCorrect
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                                    }`}
                                  >
                                    {a.chosen || '—'}
                                  </span>
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* View 2: Estatísticas e Psicometria por Questão */}
            {activeTab === 'psicometria' && (
              <div className="p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Distribuição Estatística por Alternativa — Caderno {version?.letter}
                  </h3>
                  <span className="text-xs text-slate-400">
                    {version?.questions.length || 0} questões cadastradas
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {version?.questions.map((q) => {
                    const pctCorrect = q.total
                      ? Math.round((q.correctCount / q.total) * 100)
                      : 0;

                    return (
                      <div
                        key={q.number}
                        className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200 space-y-3"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs font-black text-slate-900 block">
                              Questão {q.number}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {q.correctCount} de {q.total} alunos acertaram
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="inline-block px-2 py-0.5 rounded font-mono text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              Gabarito: {q.correct}
                            </span>
                            <span className="block text-[10px] font-bold text-slate-600 mt-0.5">
                              {pctCorrect}% acerto
                            </span>
                          </div>
                        </div>

                        {/* Distribution Bars */}
                        <div className="space-y-1.5 pt-1">
                          {['A', 'B', 'C', 'D', 'E'].map((letter) => {
                            const count = q.distribution[letter] || 0;
                            const isCorrectOpt = letter === q.correct;
                            const pct = q.total ? (count / q.total) * 100 : 0;

                            return (
                              <div key={letter} className="flex items-center gap-2 text-xs">
                                <span
                                  className={`w-4 font-mono font-bold text-[11px] ${
                                    isCorrectOpt ? 'text-emerald-700' : 'text-slate-600'
                                  }`}
                                >
                                  {letter}
                                </span>

                                <div className="flex-1 bg-slate-200/80 h-3 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-300 ${
                                      isCorrectOpt ? 'bg-emerald-500' : 'bg-slate-400'
                                    }`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>

                                <span className="font-mono text-[10px] text-slate-500 w-8 text-right">
                                  {count} ({Math.round(pct)}%)
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {q.blankCount > 0 && (
                          <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-200/60">
                            {q.blankCount} resposta(s) em branco ou rasuras
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
