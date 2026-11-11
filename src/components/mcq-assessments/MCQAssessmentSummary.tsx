import React from 'react';
import {
  FileCheck,
  CheckCircle2,
  AlertCircle,
  ListOrdered,
} from 'lucide-react';
import type { MCQQuestion } from '../../types/mcqAssessment';

interface Props {
  questions: MCQQuestion[];
  activeIndex: number;
  onSelectQuestion: (index: number) => void;
  isQuestionValid: (q: MCQQuestion) => boolean;
}

export const MCQAssessmentSummary: React.FC<Props> = ({
  questions,
  activeIndex,
  onSelectQuestion,
  isQuestionValid,
}) => {
  const totalQuestions = questions.length;
  const completedQuestions = questions.filter(isQuestionValid).length;
  const incompleteQuestions = totalQuestions - completedQuestions;
  const totalMarks = questions.reduce((sum, q) => sum + (Number(q.marks) || 1), 0);
  const percentage = totalQuestions > 0 ? Math.round((completedQuestions / totalQuestions) * 100) : 0;

  return (
    <div className="rounded-2xl border border-[#E7DED3] bg-white p-5 shadow-sm space-y-4">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-[#E7DED3] pb-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#1B1C1E] flex items-center gap-1.5">
          <FileCheck size={14} className="text-[#B08E67]" />
          <span>Assessment Summary</span>
        </h4>
        <span className="rounded-md bg-[#FAF7F2] px-2 py-0.5 text-[11px] font-bold text-[#9C7449] border border-[#E7DED3]">
          Live Metric
        </span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-xl border border-[#E7DED3] bg-[#FAF7F2] p-3">
          <span className="text-[11px] font-medium text-[#625D57] block">Total Questions</span>
          <span className="text-lg font-bold text-[#1B1C1E]">{totalQuestions}</span>
        </div>

        <div className="rounded-xl border border-[#E7DED3] bg-[#FAF7F2] p-3">
          <span className="text-[11px] font-medium text-[#625D57] block">Maximum Marks</span>
          <span className="text-lg font-bold text-[#9C7449]">{totalMarks}</span>
        </div>

        <div className="rounded-xl border border-[#5E8065]/30 bg-[#5E8065]/10 p-3">
          <div className="flex items-center gap-1 text-[11px] font-medium text-[#5E8065]">
            <CheckCircle2 size={11} />
            <span>Completed</span>
          </div>
          <span className="text-lg font-bold text-[#5E8065]">{completedQuestions}</span>
        </div>

        <div className="rounded-xl border border-[#A75B52]/30 bg-[#A75B52]/10 p-3">
          <div className="flex items-center gap-1 text-[11px] font-medium text-[#A75B52]">
            <AlertCircle size={11} />
            <span>Incomplete</span>
          </div>
          <span className="text-lg font-bold text-[#A75B52]">{incompleteQuestions}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-[#625D57]">Completion Readiness</span>
          <span className={percentage === 100 ? 'text-[#5E8065]' : 'text-[#9C7449]'}>
            {percentage}%
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-[#E9DED0]">
          <div
            className={`h-full transition-all duration-300 ${
              percentage === 100 ? 'bg-[#5E8065]' : 'bg-[#B08E67]'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Quick Jump Question Matrix */}
      <div className="pt-2 border-t border-[#E7DED3]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#8C857D] flex items-center gap-1">
            <ListOrdered size={12} />
            <span>Question Quick Nav</span>
          </span>
        </div>
        <div className="grid grid-cols-5 gap-1.5 max-h-36 overflow-y-auto pr-1">
          {questions.map((q, idx) => {
            const isActive = idx === activeIndex;
            const isValid = isQuestionValid(q);
            return (
              <button
                key={q.id || idx}
                type="button"
                onClick={() => onSelectQuestion(idx)}
                className={`flex h-7 items-center justify-center rounded-lg text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-[#1B1C1E] text-white shadow-sm ring-2 ring-[#B08E67]'
                    : isValid
                    ? 'bg-[#5E8065]/15 text-[#5E8065] hover:bg-[#5E8065]/25 border border-[#5E8065]/30'
                    : 'bg-[#FAF7F2] text-[#8C857D] hover:bg-[#E9DED0] border border-[#E7DED3]'
                }`}
                title={`Jump to Question ${idx + 1}`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
