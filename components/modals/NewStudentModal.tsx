'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { X, UserPlus, GraduationCap } from 'lucide-react';

export const NewStudentModal: React.FC = () => {
  const { isNewStudentModalOpen, setIsNewStudentModalOpen, addStudent } = useApp();

  const [name, setName] = useState('');
  const [registration, setRegistration] = useState('2024.1.');
  const [course, setCourse] = useState('Direito');
  const [email, setEmail] = useState('');
  const [classGroup, setClassGroup] = useState('Turma A');
  const [discipline, setDiscipline] = useState('Direito Constitucional');

  if (!isNewStudentModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    addStudent({
      name: name.trim(),
      registration: registration.trim(),
      course: course.trim(),
      email: email.trim() || `${name.toLowerCase().replace(/\s+/g, '.')}@universidade.edu.br`,
      classGroup,
      discipline,
      examsTaken: 0,
      overallAverage: 0,
    });

    setName('');
    setRegistration('2024.1.');
    setEmail('');
    setIsNewStudentModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Cadastrar Novo Aluno
              </h2>
              <p className="text-xs text-slate-500">
                Vincule o estudante às turmas e cadastre o número de matrícula.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsNewStudentModalOpen(false)}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Nome Completo do Estudante *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Amanda Silva Castro"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Matrícula *
              </label>
              <input
                type="text"
                required
                value={registration}
                onChange={(e) => setRegistration(e.target.value)}
                placeholder="2024.1.001"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Turma
              </label>
              <input
                type="text"
                value={classGroup}
                onChange={(e) => setClassGroup(e.target.value)}
                placeholder="Turma A"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Curso Universitário
            </label>
            <input
              type="text"
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              placeholder="Engenharia Civil"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              E-mail Institucional
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="aluno@universidade.edu.br"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsNewStudentModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer"
            >
              Cadastrar Aluno
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
