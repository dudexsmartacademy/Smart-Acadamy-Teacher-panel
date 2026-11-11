import { CheckCircle, Award } from 'lucide-react';
import type { MCQQuestion, MCQOptionKey } from '../../types/mcqAssessment';

interface Props {
  question: MCQQuestion;
  index: number;
}

export const MCQPreviewQuestion: React.FC<Props> = ({ question, index }) => {
  const optionKeys: MCQOptionKey[] = ['A', 'B', 'C', 'D'];
  const correctOption = question.options.find((o) => o.id === question.correctOptionId);

  return (
    <div className="rounded-2xl border border-[#E7DED3] bg-white p-6 shadow-sm space-y-4 hover:border-[#CFBAA1] transition-all">
      {/* Question Header & Marks */}
      <div className="flex items-start justify-between gap-4 border-b border-[#E7DED3] pb-3">
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1B1C1E] text-xs font-bold text-white shadow-sm">
            {index + 1}
          </span>
          <h4 className="text-sm font-bold text-[#1B1C1E]">
            Question {index + 1}
          </h4>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg bg-[#FAF7F2] px-3 py-1 text-xs font-bold text-[#9C7449] border border-[#E7DED3]">
          <Award size={13} />
          <span>{question.marks} {question.marks === 1 ? 'Mark' : 'Marks'}</span>
        </div>
      </div>

      {/* Question Statement */}
      <div className="text-sm font-medium text-[#1B1C1E] leading-relaxed whitespace-pre-wrap">
        {question.questionText || <span className="text-[#8C857D] italic">No question statement entered</span>}
      </div>

      {/* Options List */}
      <div className="space-y-2.5 pt-1">
        {question.options.map((opt, optIdx) => {
          const optKey = optionKeys[optIdx] || `Option ${optIdx + 1}`;
          const isCorrect = opt.id === question.correctOptionId;

          return (
            <div
              key={opt.id || optIdx}
              className={`flex items-start gap-3 rounded-xl border p-3 text-xs transition-all ${
                isCorrect
                  ? 'border-[#B08E67] bg-[#FAF7F2] ring-1 ring-[#B08E67]'
                  : 'border-[#E7DED3] bg-white text-[#625D57]'
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                  isCorrect
                    ? 'bg-[#B08E67] text-white'
                    : 'bg-[#E9DED0] text-[#1B1C1E]'
                }`}
              >
                {optKey}
              </span>

              <span className={`flex-1 font-medium ${isCorrect ? 'text-[#1B1C1E] font-semibold' : ''}`}>
                {opt.text || <span className="text-[#8C857D] italic">Empty option</span>}
              </span>

              {isCorrect && (
                <span className="inline-flex items-center gap-1 shrink-0 rounded-md bg-[#B08E67] px-2 py-0.5 text-[10px] font-bold text-white">
                  <CheckCircle size={10} />
                  <span>Correct Answer</span>
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Correct Answer Summary Callout */}
      <div className="rounded-xl border border-[#B08E67]/40 bg-[#FAF7F2] p-3 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-[#9C7449] mb-1">
          <CheckCircle size={13} className="text-[#B08E67]" />
          <span>Official Answer Key:</span>
          <span className="text-[#1B1C1E] font-bold">
            {correctOption
              ? `${optionKeys[question.options.findIndex((o) => o.id === question.correctOptionId)]}. ${correctOption.text}`
              : 'None Selected'}
          </span>
        </div>

        {/* Explanation Block */}
        {question.explanation ? (
          <div className="mt-2 pt-2 border-t border-[#E7DED3] text-[#625D57]">
            <span className="font-semibold text-[#1B1C1E] block mb-0.5">Explanation:</span>
            <p className="leading-relaxed whitespace-pre-wrap">{question.explanation}</p>
          </div>
        ) : (
          <p className="mt-1 text-[11px] text-[#8C857D] italic">No explanation provided for this question.</p>
        )}
      </div>
    </div>
  );
};
