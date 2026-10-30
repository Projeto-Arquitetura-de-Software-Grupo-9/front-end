'use client';
import React, { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { downloadFile, getResults, ResultsReport } from '@/lib/results';
const format = (n: number | null) => n === null ? '—' : n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
export const ResultsScreen: React.FC = () => {
  const { exams, activeExamId, setActiveExamId, addToast, setCurrentScreen } = useApp();
  const examId = exams.find(e => e.id === activeExamId)?.id || exams[0]?.id || '';
  const [request, setRequest] = useState<{ key: string; data: ResultsReport | null; error: string } | null>(null);
  const [exporting, setExporting] = useState(false);
  const [versionId, setVersionId] = useState('');
  const [revision, setRevision] = useState(0);
  const requestKey = `${examId}:${revision}`;
  const loading = Boolean(examId) && request?.key !== requestKey;
  const error = request?.key === requestKey ? request.error : '';
  useEffect(() => {
    if (!examId) return;
    const controller = new AbortController();
    getResults(examId, controller.signal)
      .then(data => { if (!controller.signal.aborted) setRequest({ key: requestKey, data, error: '' }); })
      .catch(err => { if (!controller.signal.aborted) setRequest({ key: requestKey, data: null, error: err instanceof Error ? err.message : 'Falha ao carregar.' }); });
    return () => controller.abort();
  }, [examId, requestKey]);
  const report = request?.key === requestKey && request.data?.examId === examId ? request.data : null;
  const version = report?.versions.find(v => v.id === versionId) || report?.versions[0];
  const exportExcel = async () => {
    setExporting(true);
    try {
      await downloadFile(`/reports/${encodeURIComponent(examId)}/results?format=xlsx`, 'resultados.xlsx');
      addToast({ type: 'success', title: 'Excel baixado com sucesso.' });
    } catch (err) {
      addToast({ type: 'error', title: 'Falha na exportação', message: err instanceof Error ? err.message : 'Tente novamente.' });
    } finally { setExporting(false); }
  };
  const button = 'px-4 py-2 rounded-xl border bg-white disabled:opacity-50';
  return <div className="space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-4">
      <h1 className="text-2xl font-bold">Resultados e análise</h1>
      <div className="flex flex-wrap gap-2">
        <select aria-label="Prova" value={examId} onChange={e => setActiveExamId(e.target.value)} className={button}>{exams.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}</select>
        <button className={button} disabled={loading} onClick={() => setRevision(r => r + 1)}>Atualizar</button>
        <button className={button} disabled={!report || loading || exporting} onClick={exportExcel}>{exporting ? 'Exportando…' : 'Exportar Excel'}</button>
      </div>
    </header>
    {!examId && <p>Nenhuma prova disponível.</p>}
    {loading && <p role="status">Carregando resultados…</p>}
    {error && <p role="alert" className="p-4 bg-amber-50 rounded-xl">{error} Use Atualizar para tentar novamente.</p>}
    {report && <>
      <p className="text-sm text-slate-600">Notas confirmadas pelo módulo de correção. Última correção por aluno; atribuições pendentes fora das estatísticas.</p>
      {report.pendingCount > 0 && <p className="p-4 bg-amber-50 rounded-xl">{report.pendingCount} correção(ões) sem aluno vinculado. <button className="underline" onClick={() => setCurrentScreen('lancamento-manual')}>Acessar lançamento manual</button></p>}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">{Object.entries({ 'Alunos identificados': report.metrics.count, Média: report.metrics.average, Mediana: report.metrics.median, 'Desvio padrão': report.metrics.standardDeviation, 'Maior nota': report.metrics.highest }).map(([label, value]) => <div key={label} className="bg-white border p-5 rounded-2xl"><p className="text-sm text-slate-600">{label}</p><strong className="text-2xl">{format(value)}</strong></div>)}</div>
      <section className="bg-white border rounded-2xl p-5 space-y-4">
        <div className="flex justify-between gap-3"><h2 className="font-bold">Matriz de desempenho</h2><select aria-label="Caderno" value={version?.id || ''} onChange={e => setVersionId(e.target.value)} className={button}>{report.versions.map(v => <option key={v.id} value={v.id}>Caderno {v.letter}</option>)}</select></div>
        <p className="text-xs text-slate-600">Cada caderno possui seu próprio gabarito. “—” indica resposta em branco ou inválida.</p>
        {!version?.rows.length ? <p>Nenhuma correção confirmada para este caderno.</p> : <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr><th className="p-2">Aluno / matrícula</th><th className="p-2">Nota</th>{version.questions.map(q => <th key={q.number} className="p-2">Q{q.number}<small className="block">Gabarito {q.correct}</small></th>)}</tr></thead><tbody>{version.rows.map(row => <tr key={row.id} className="border-t"><td className="p-2 whitespace-nowrap">{row.name}<small className="block">{row.registration}{row.pending ? ' • Atribuição pendente' : ''}</small></td><td className="p-2">{format(row.score)}</td>{row.answers.map(a => <td key={a.number} className="p-2"><span title={`Gabarito: ${a.correct}`} className={`inline-block rounded px-2 py-1 ${a.chosen === null ? 'bg-slate-100' : a.isCorrect ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900'}`}>{a.chosen || '—'}</span></td>)}</tr>)}</tbody></table></div>}
      </section>
      <section className="bg-white border rounded-2xl p-5 space-y-4"><h2 className="font-bold">Distribuição por questão — Caderno {version?.letter}</h2><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{version?.questions.map(q => <div key={q.number} className="border rounded-xl p-4 space-y-2"><strong>Q{q.number} • Gabarito {q.correct}</strong><p className="text-xs">{q.correctCount}/{q.total} acertos ({q.total ? Math.round(q.correctCount / q.total * 100) : 0}%) • {q.blankCount} em branco/inválidas</p>{Object.entries(q.distribution).map(([letter, count]) => <div key={letter} className="flex gap-2 items-center text-xs"><span>{letter}</span><div className="flex-1 bg-slate-100 h-3 rounded"><div className={`h-3 rounded ${letter === q.correct ? 'bg-emerald-500' : 'bg-slate-500'}`} style={{ width: `${q.total ? count / q.total * 100 : 0}%` }} /></div><span>{count}</span></div>)}</div>)}</div></section>
    </>}
  </div>;
};
