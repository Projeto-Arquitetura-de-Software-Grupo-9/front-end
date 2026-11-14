'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { A4ExamSheet, A4BlankVersoSheet, A4ExamQuestion } from '@/components/common/A4ExamSheet';
import { A4AnswerSheet, A4AnswerSheetQuestion } from '@/components/common/A4AnswerSheet';
import { getVersionLetters } from '@/lib/exam-utils';

function PrintRenderContent() {
  const searchParams = useSearchParams();
  const { exams, questions, students, selectedExam } = useApp();

  const examId = searchParams.get('examId') || selectedExam?.id;
  const exam = exams.find((e) => e.id === examId) || selectedExam;

  if (!exam) {
    return (
      <div className="p-8 text-center text-slate-500 font-sans text-xs">
        Nenhuma avaliação encontrada para renderização.
      </div>
    );
  }

  const renderType = searchParams.get('type') || 'exam'; // 'exam' | 'answersheet'
  const targetVersion = searchParams.get('version') || 'A'; // 'A', 'B', etc. or 'batch'
  const isNominal = searchParams.get('nominal') !== 'false';
  const isDuplex = searchParams.get('duplex') !== 'false';
  const includeBoxNota = searchParams.get('boxNota') === 'true';
  const printPurpose = searchParams.get('purpose') === 'post_exam_concepts' ? 'post_exam_concepts' : 'application';
  const withAnswerSheet = searchParams.get('withAnswerSheet') !== 'false';

  const numVersions = Math.max(1, Math.min(26, exam.numberOfVersions || 4));
  const versionLetters = getVersionLetters(numVersions);
  const showConceptExplanations = printPurpose === 'post_exam_concepts';

  const getStudentAssignedVersion = (stdId: string, fallbackIdx: number): string => {
    const assignment = (exam as any).studentAssignments?.find((a: any) => a.studentId === stdId);
    if (assignment?.assignedVersion && versionLetters.includes(assignment.assignedVersion)) {
      return assignment.assignedVersion;
    }
    return versionLetters[(fallbackIdx * 7 + 2) % versionLetters.length] || 'A';
  };

  const getQuestionsForVersion = (vLetter: string): A4ExamQuestion[] => {
    const vData = (exam as any).versions?.find((v: any) => v.versionLetter === vLetter);
    if (vData?.questions && vData.questions.length > 0) {
      return vData.questions.map((qv: any, idx: number) => {
        const origQ = questions.find((q) => q.id === qv.originalQuestionId);
        return {
          id: qv.originalQuestionId || `q-${idx}`,
          orderIndex: idx + 1,
          statement: qv.statement,
          alternatives: qv.alternatives,
          correctAlternative: qv.correctAlternative,
          explanation: qv.explanation || origQ?.explanation,
          topic: qv.topic || origQ?.topic,
        };
      });
    }

    const baseQuestions =
      exam.selectedQuestionIds
        ?.map((id) => questions.find((q) => q.id === id))
        .filter((q): q is NonNullable<typeof q> => q !== undefined) || questions.slice(0, 5);

    return baseQuestions.map((q, idx) => ({
      id: q.id,
      orderIndex: idx + 1,
      statement: q.statement,
      alternatives: q.alternatives,
      correctAlternative: q.correctAlternative,
      explanation: q.explanation,
      topic: q.topic,
    }));
  };

  const paginateQuestions = (vQuestions: A4ExamQuestion[]) => {
    const QUESTIONS_PER_PAGE = showConceptExplanations ? 2 : 3;
    const page1Questions = vQuestions.slice(0, QUESTIONS_PER_PAGE);
    const remainingQuestions = vQuestions.slice(QUESTIONS_PER_PAGE);
    const additionalPagesCount = remainingQuestions.length > 0 ? Math.ceil(remainingQuestions.length / QUESTIONS_PER_PAGE) : 0;
    const totalPages = 1 + additionalPagesCount;

    const pagesData: { pageNumber: number; questions: A4ExamQuestion[] }[] = [
      { pageNumber: 1, questions: page1Questions },
    ];
    for (let p = 2; p <= totalPages; p++) {
      const startIndex = (p - 2) * QUESTIONS_PER_PAGE;
      const pQuestions = remainingQuestions.slice(startIndex, startIndex + QUESTIONS_PER_PAGE);
      if (pQuestions.length > 0) {
        pagesData.push({ pageNumber: p, questions: pQuestions });
      }
    }
    return { totalPages: pagesData.length, pagesData };
  };

  const getAnswerSheetQuestionsForVersion = (vLetter: string): A4AnswerSheetQuestion[] => {
    const vQuestions = getQuestionsForVersion(vLetter);
    return vQuestions.map((q) => ({
      orderIndex: q.orderIndex,
      letters: q.alternatives?.length ? q.alternatives.map((a) => a.letter) : ['A', 'B', 'C', 'D', 'E'],
    }));
  };

  // Se renderType for answersheet pura
  if (renderType === 'answersheet') {
    const sheetsToRender = targetVersion === 'batch' && isNominal
      ? students.map((std, sIdx) => {
          const v = getStudentAssignedVersion(std.id, sIdx);
          return {
            student: { name: std.name, registration: std.registration },
            version: v,
            questions: getAnswerSheetQuestionsForVersion(v),
          };
        })
      : [
          {
            student: undefined,
            version: targetVersion === 'batch' ? 'A' : targetVersion,
            questions: getAnswerSheetQuestionsForVersion(targetVersion === 'batch' ? 'A' : targetVersion),
          },
        ];

    return (
      <div className="w-full flex flex-col items-center bg-white print:p-0 print:m-0">
        {sheetsToRender.map((item, idx) => (
          <div key={`ans-render-${idx}`} className="w-full flex flex-col items-center">
            <A4AnswerSheet
              examTitle={exam.title}
              examCode={exam.code}
              discipline={exam.discipline}
              classGroup={exam.classGroup}
              institution={exam.institution}
              versionLetter={item.version}
              questions={item.questions}
              student={item.student}
              pageNumber={1}
              totalPages={isDuplex ? 2 : 1}
              isDuplex={isDuplex}
            />
            {isDuplex && (
              <A4BlankVersoSheet
                versionLetter={item.version}
                examCode={exam.code}
                pageNumber={2}
                totalPages={2}
                studentName={item.student?.name}
                pureBlankInPrint={true}
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  // RenderType === 'exam' (Caderno completo de perguntas)
  const versionsList = targetVersion === 'batch'
    ? (isNominal ? students.map((s, sIdx) => ({ student: s, version: getStudentAssignedVersion(s.id, sIdx) })) : versionLetters.map((v) => ({ student: undefined, version: v })))
    : [{ student: undefined, version: targetVersion }];

  return (
    <div className="w-full flex flex-col items-center bg-white print:p-0 print:m-0">
      {versionsList.map((entry, eIdx) => {
        const vQuestions = getQuestionsForVersion(entry.version);
        const { pagesData } = paginateQuestions(vQuestions);
        const numQPages = pagesData.length;
        const totalSheets: React.ReactNode[] = [];
        let curPage = 1;

        pagesData.forEach((p) => {
          totalSheets.push(
            <A4ExamSheet
              key={`exam-${eIdx}-q-${p.pageNumber}`}
              exam={exam}
              questions={p.questions}
              pageNumber={curPage++}
              totalPages={numQPages + (withAnswerSheet ? (isDuplex && numQPages % 2 !== 0 ? 3 : 2) : 0)}
              versionLetter={entry.version}
              showAnswerKey={showConceptExplanations}
              showConceptExplanations={showConceptExplanations}
              showQrCode={true}
              includeBoxNota={includeBoxNota}
              isDuplex={isDuplex}
              student={entry.student ? { name: entry.student.name, registration: entry.student.registration } : undefined}
            />
          );
        });

        if (withAnswerSheet && !showConceptExplanations) {
          if (isDuplex && numQPages % 2 !== 0) {
            totalSheets.push(
              <A4BlankVersoSheet
                key={`exam-${eIdx}-bverso`}
                versionLetter={entry.version}
                examCode={exam.code}
                pageNumber={curPage++}
                totalPages={curPage + 1}
                studentName={entry.student?.name}
              />
            );
          }
          const ansQuestions = getAnswerSheetQuestionsForVersion(entry.version);
          totalSheets.push(
            <A4AnswerSheet
              key={`exam-${eIdx}-ans`}
              examTitle={exam.title}
              examCode={exam.code}
              discipline={exam.discipline}
              classGroup={exam.classGroup}
              institution={exam.institution}
              versionLetter={entry.version}
              questions={ansQuestions}
              pageNumber={curPage++}
              totalPages={curPage}
              isDuplex={isDuplex}
              student={entry.student ? { name: entry.student.name, registration: entry.student.registration } : undefined}
            />
          );
          if (isDuplex) {
            totalSheets.push(
              <A4BlankVersoSheet
                key={`exam-${eIdx}-ansverso`}
                versionLetter={entry.version}
                examCode={exam.code}
                pageNumber={curPage++}
                totalPages={curPage}
                studentName={entry.student?.name}
                pureBlankInPrint={true}
              />
            );
          }
        }

        return (
          <div key={`entry-${eIdx}`} className="w-full flex flex-col items-center">
            {totalSheets}
          </div>
        );
      })}
    </div>
  );
}

export default function PrintRenderPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Carregando layout de impressão...</div>}>
      <PrintRenderContent />
    </Suspense>
  );
}
