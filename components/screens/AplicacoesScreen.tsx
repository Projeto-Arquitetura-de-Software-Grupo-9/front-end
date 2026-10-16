'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Layers,
  Plus,
  FileText,
  Printer,
  Download,
  Share2,
  CheckCircle2,
  Eye,
  Shuffle,
  UserCheck,
  UserX,
  ExternalLink,
  Lock,
  Calendar,
  GraduationCap,
} from 'lucide-react';

export const AplicacoesScreen: React.FC = () => {
  const {
    applications,
    activeApplicationId,
    setActiveApplicationId,
    classes,
    exams,
    createApplication,
    publishAnswerKey,
    navigateToPreview,
    addToast,
  } = useApp();

  const [isNewAppModalOpen, setIsNewAppModalOpen] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState<string>(exams[0]?.id || '');
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '');
  const [withIdentification, setWithIdentification] = useState(true);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleAlternatives, setShuffleAlternatives] = useState(true);
  const [numVersions, setNumVersions] = useState(4);

  const activeApp = applications.find((a) => a.id === activeApplicationId) || applications[0];

  const handleCreateApplication = (e: React.FormEvent) => {
    e.preventDefault();
    const newApp = createApplication(selectedExamId, selectedClassId, {
      withStudentIdentification: withIdentification,
      numberOfVersions: numVersions,
      shuffleQuestions,
      shuffleAlternatives,
    });
    setIsNewAppModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#9E0B1A] uppercase tracking-wider">
            <Layers className="w-4 h-4" />
            <span>Features 5 & 6 – Aplicação de Provas e Geração de PDF (Católica SC)</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">
            Aplicações de Provas & PDFs
          </h1>
          <p className="text-xs text-slate-500">
            Aplique um modelo de prova a uma turma específica, configure versões embaralhadas e gere o PDF único consolidado.
          </p>
        </div>

        <button
          onClick={() => setIsNewAppModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#9E0B1A] hover:bg-[#850916] text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Aplicação (Prova × Turma)</span>
        </button>
      </div>

      {/* Grid of Applications */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {applications.map((app) => {
          const isSelected = app.id === activeApp?.id;

          return (
            <div
              key={app.id}
              onClick={() => setActiveApplicationId(app.id)}
              className={`p-5 rounded-2xl border transition text-left cursor-pointer relative ${
                isSelected
                  ? 'bg-white border-[#9E0B1A] shadow-md ring-1 ring-[#9E0B1A]/20'
                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded mb-1.5">
                    {app.discipline}
                  </span>
                  <h3 className="font-bold text-slate-900 text-sm">{app.title}</h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                    <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                    <span>Turma: <strong>{app.className}</strong></span>
                  </p>
                </div>

                <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-100 text-emerald-800">
                  {app.status === 'generated' ? 'PDF Gerado' : 'Rascunho'}
                </span>
              </div>

              {/* Badges of Mode */}
              <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-100 text-[11px]">
                {app.withStudentIdentification ? (
                  <span className="inline-flex items-center gap-1 font-semibold text-[#9E0B1A] bg-red-50 px-2 py-0.5 rounded">
                    <UserCheck className="w-3 h-3" />
                    Com Identificação do Aluno (QR único)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                    <UserX className="w-3 h-3" />
                    Sem Identificação (Prova Anônima)
                  </span>
                )}

                <span className="text-slate-500 font-medium">
                  {app.numberOfVersions} Cadernos ({app.numberOfVersions === 4 ? 'A, B, C, D' : 'A, B'})
                </span>
              </div>

              {/* Gabarito Status & Public Code */}
              <div className="mt-3 flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl">
                <div>
                  <span className="text-[11px] text-slate-500">Gabarito: </span>
                  {app.answerKeyPublished ? (
                    <span className="text-[11px] font-bold text-emerald-700">Publicado</span>
                  ) : (
                    <span className="text-[11px] font-bold text-slate-500">Não publicado</span>
                  )}
                </div>

                <div className="font-mono text-[10px] text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                  Código Público: <strong>{app.publicCode}</strong>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Application Details & PDF Actions */}
      {activeApp && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  {activeApp.title}
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Turma vinculada: <strong>{activeApp.className}</strong> • Criada em {new Date(activeApp.createdAt).toLocaleDateString('pt-BR')}
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => navigateToPreview(activeApp.examId)}
                className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Eye className="w-3.5 h-3.5 text-slate-500" />
                Visualizar Prova / Folha
              </button>

              <button
                onClick={() => {
                  addToast({
                    type: 'success',
                    title: 'Download do PDF Único Consolidado',
                    message: `Baixando arquivo consolidado contendo todas as ${activeApp.numberOfVersions} versões e provas da turma.`,
                  });
                }}
                className="px-3.5 py-2 bg-[#9E0B1A] hover:bg-[#850916] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                Baixar PDF Consolidado
              </button>

              {!activeApp.answerKeyPublished ? (
                <button
                  onClick={() => publishAnswerKey(activeApp.id)}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Publicar Gabarito (Feature 7)
                </button>
              ) : (
                <span className="px-3 py-1.5 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Gabarito Público
                </span>
              )}
            </div>
          </div>

          {/* Details breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="text-slate-400 font-medium">Modo de Identificação</div>
              <div className="text-sm font-bold text-slate-900 mt-1">
                {activeApp.withStudentIdentification
                  ? 'Personalizada por Aluno'
                  : 'Anônima (Sem Identificação)'}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {activeApp.withStudentIdentification
                  ? 'Cada aluno recebe seu nome impresso e um QR Code específico. A nota é atribuída automaticamente no scan.'
                  : 'O aluno escreve o nome à mão. A nota fica pendente até atribuição manual na tela de resultados.'}
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="text-slate-400 font-medium">Versões & Embaralhamento</div>
              <div className="text-sm font-bold text-slate-900 mt-1">
                {activeApp.numberOfVersions} Cadernos de Prova
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {activeApp.shuffleQuestions ? 'Questões embaralhadas' : 'Questões em ordem fixa'} •{' '}
                {activeApp.shuffleAlternatives ? 'Alternativas embaralhadas' : 'Alternativas em ordem fixa'}
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="text-slate-400 font-medium">Consulta de Gabarito (Pública / Alunos)</div>
              <div className="text-sm font-bold font-mono text-[#9E0B1A] mt-1">
                {activeApp.publicCode}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {activeApp.answerKeyPublished
                  ? 'Disponível no portal web do aluno ou via rota pública com este código.'
                  : 'Oculto para os alunos até você clicar em "Publicar Gabarito".'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nova Aplicação */}
      {isNewAppModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Criar Nova Aplicação de Prova</h3>
              <button
                onClick={() => setIsNewAppModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateApplication} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Selecione o Modelo de Prova (Exam Template) *
                </label>
                <select
                  value={selectedExamId}
                  onChange={(e) => setSelectedExamId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#9E0B1A]"
                >
                  {exams.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.title} ({ex.discipline})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Selecione a Turma de Destino (Class) *
                </label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#9E0B1A]"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.subject} - {c.term})
                    </option>
                  ))}
                </select>
              </div>

              {/* Mode: With or Without Identification (Feature 6 da Spec) */}
              <div className="border border-slate-200 rounded-2xl p-3 space-y-2 bg-slate-50/50">
                <label className="block font-bold text-slate-700">
                  Identificação do Aluno na Prova (Feature 6)
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setWithIdentification(true)}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      withIdentification
                        ? 'border-[#9E0B1A] bg-red-50 text-[#9E0B1A] font-bold'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs">
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Com Identificação</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                      Nome pré-impresso + QR Code individual. Nota atribuída automaticamente.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWithIdentification(false)}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      !withIdentification
                        ? 'border-[#9E0B1A] bg-red-50 text-[#9E0B1A] font-bold'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs">
                      <UserX className="w-3.5 h-3.5" />
                      <span>Sem Identificação</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                      Prova anônima. Aluno escreve nome à mão. Lançamento manual posterior.
                    </div>
                  </button>
                </div>
              </div>

              {/* Versions and Shuffling */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Quantidade de Versões
                  </label>
                  <select
                    value={numVersions}
                    onChange={(e) => setNumVersions(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                  >
                    <option value={1}>1 Versão (Única)</option>
                    <option value={2}>2 Versões (A, B)</option>
                    <option value={4}>4 Versões (A, B, C, D)</option>
                  </select>
                </div>

                <div className="space-y-1.5 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shuffleQuestions}
                      onChange={(e) => setShuffleQuestions(e.target.checked)}
                      className="rounded text-[#9E0B1A] focus:ring-[#9E0B1A]"
                    />
                    <span className="text-[11px] font-semibold text-slate-700">Embaralhar Questões</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shuffleAlternatives}
                      onChange={(e) => setShuffleAlternatives(e.target.checked)}
                      className="rounded text-[#9E0B1A] focus:ring-[#9E0B1A]"
                    />
                    <span className="text-[11px] font-semibold text-slate-700">Embaralhar Alternativas</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewAppModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#9E0B1A] text-white font-bold rounded-xl"
                >
                  Gerar Aplicação & PDF
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
