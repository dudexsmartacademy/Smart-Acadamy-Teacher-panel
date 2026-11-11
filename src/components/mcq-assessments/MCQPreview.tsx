import { ArrowLeft, ArrowRight, ShieldCheck, FileQuestion } from 'lucide-react';
import type { MCQQuestion, MCQClassInfo } from '../../types/mcqAssessment';
import { MCQPreviewQuestion } from './MCQPreviewQuestion';
import { MCQStatusBadge } from './MCQStatusBadge';

interface Props {
  title: string;
  description?: string;
  classInfo: MCQClassInfo;
  subjectName: string;
  questions: MCQQuestion[];
  onUpdateClick: () => void;
  onConfirmClick: () => void;
}

export const MCQPreview: React.FC<Props> = ({
  title,
  description,
  classInfo,
  subjectName,
  questions,
  onUpdateClick,
  onConfirmClick,
}) => {
  const totalMarks = questions.reduce((sum, q) => sum + (Number(q.marks) || 1), 0);

  return (
    <div className="space-y-6">
      {/* Teacher Preview Header Banner */}
      <div className="rounded-2xl border border-[#E7DED3] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E7DED3] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-[#FAF7F2] px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-[#9C7449] border border-[#E7DED3]">
                Step 2 • Teacher Review Screen
              </span>
              <MCQStatusBadge status="Draft" />
            </div>
            <h2 className="mt-2 text-xl font-bold text-[#1B1C1E]">
              {title || 'Untitled MCQ Assessment'}
            </h2>
            {description && (
              <p className="mt-1 text-xs text-[#625D57] max-w-2xl">{description}</p>
            )}
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-xl bg-[#FAF7F2] px-3 py-2 text-xs font-medium text-[#625D57] border border-[#E7DED3]">
            <ShieldCheck size={16} className="text-[#5E8065]" />
            <span>Faculty View — Answer Key Protected</span>
          </div>
        </div>

        {/* Metadata Pills */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-[#E7DED3] bg-[#FAF7F2] p-3">
            <span className="text-[11px] font-medium text-[#8C857D] block">Assigned Class</span>
            <span className="text-xs font-bold text-[#1B1C1E] truncate block mt-0.5">
              {classInfo.className || 'Class'}
            </span>
          </div>

          <div className="rounded-xl border border-[#E7DED3] bg-[#FAF7F2] p-3">
            <span className="text-[11px] font-medium text-[#8C857D] block">Subject</span>
            <span className="text-xs font-bold text-[#1B1C1E] truncate block mt-0.5">
              {subjectName || 'Subject'}
            </span>
          </div>

          <div className="rounded-xl border border-[#E7DED3] bg-[#FAF7F2] p-3">
            <span className="text-[11px] font-medium text-[#8C857D] block">Total Questions</span>
            <span className="text-xs font-bold text-[#1B1C1E] block mt-0.5">
              {questions.length} Items
            </span>
          </div>

          <div className="rounded-xl border border-[#E7DED3] bg-[#FAF7F2] p-3">
            <span className="text-[11px] font-medium text-[#8C857D] block">Total Maximum Marks</span>
            <span className="text-xs font-bold text-[#9C7449] block mt-0.5">
              {totalMarks} Marks
            </span>
          </div>
        </div>
      </div>

      {/* Answer Key Document Stream */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#625D57] flex items-center gap-2">
            <FileQuestion size={14} className="text-[#B08E67]" />
            <span>Complete Assessment Questions & Answer Keys</span>
          </h3>
          <span className="text-xs text-[#8C857D]">
            Showing all {questions.length} questions in answer-key document format
          </span>
        </div>

        {questions.map((q, idx) => (
          <MCQPreviewQuestion key={q.id || idx} question={q} index={idx} />
        ))}
      </div>

      {/* Bottom Actions Bar */}
      <div className="sticky bottom-4 z-20 flex items-center justify-between rounded-2xl border border-[#E7DED3] bg-white p-4 shadow-lg">
        <button
          type="button"
          onClick={onUpdateClick}
          className="inline-flex items-center gap-2 rounded-xl border border-[#E7DED3] bg-[#FAF7F2] px-5 py-2.5 text-xs font-bold text-[#1B1C1E] hover:bg-[#E9DED0] hover:border-[#B08E67] transition-all"
        >
          <ArrowLeft size={14} />
          <span>Update (Back to Editor)</span>
        </button>

        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-xs text-[#8C857D]">
            All {questions.length} questions verified?
          </span>
          <button
            type="button"
            onClick={onConfirmClick}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1B1C1E] px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#9C7449] transition-all"
          >
            <span>Confirm (Proceed to Schedule)</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
