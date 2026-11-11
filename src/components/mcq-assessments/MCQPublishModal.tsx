import { Sparkles, X, Check } from 'lucide-react';
import type { MCQClassInfo, MCQSchedule } from '../../types/mcqAssessment';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirmPublish: () => void;
  title: string;
  classInfo: MCQClassInfo;
  subjectName: string;
  questionsCount: number;
  maxMarks: number;
  schedule: MCQSchedule;
  isPublishing?: boolean;
}

export const MCQPublishModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onConfirmPublish,
  title,
  classInfo,
  subjectName,
  questionsCount,
  maxMarks,
  schedule,
  isPublishing = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-lg rounded-2xl border border-[#E7DED3] bg-white p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#E7DED3] pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1B1C1E] text-[#B08E67] shadow-sm">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1B1C1E]">
                Publish MCQ Assessment?
              </h3>
              <p className="text-xs text-[#8C857D]">
                Confirm schedule and student availability settings.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPublishing}
            className="rounded-lg p-1.5 text-[#8C857D] hover:bg-[#FAF7F2] hover:text-[#1B1C1E] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Message */}
        <p className="text-xs text-[#625D57] leading-relaxed">
          Students in <strong className="text-[#1B1C1E]">{classInfo?.className}</strong> will be
          able to access this assessment once the scheduled window opens. The official status will be marked as{' '}
          <strong className="text-[#9C7449]">Scheduled</strong>.
        </p>

        {/* Assessment Ready Summary Sheet */}
        <div className="rounded-xl border border-[#E7DED3] bg-[#FAF7F2] p-4 space-y-2.5 text-xs">
          <div className="flex justify-between">
            <span className="text-[#8C857D]">Title:</span>
            <span className="font-bold text-[#1B1C1E]">{title}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#8C857D]">Class:</span>
            <span className="font-medium text-[#1B1C1E]">
              {classInfo?.department} • {classInfo?.section} • {classInfo?.batch}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#8C857D]">Subject:</span>
            <span className="font-medium text-[#1B1C1E]">{subjectName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#8C857D]">Scope:</span>
            <span className="font-semibold text-[#1B1C1E]">
              {questionsCount} Questions • {maxMarks} Marks
            </span>
          </div>
          <div className="flex justify-between border-t border-[#E7DED3] pt-2">
            <span className="text-[#8C857D]">Window:</span>
            <span className="font-medium text-[#1B1C1E]">
              {schedule.date} ({schedule.startTime} – {schedule.endTime})
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#8C857D]">Duration:</span>
            <span className="font-bold text-[#9C7449]">{schedule.durationMinutes} Minutes</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPublishing}
            className="rounded-xl border border-[#E7DED3] bg-[#FAF7F2] px-4 py-2 text-xs font-semibold text-[#1B1C1E] hover:bg-[#E9DED0] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirmPublish}
            disabled={isPublishing}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1B1C1E] px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-[#9C7449] transition-all disabled:opacity-50"
          >
            {isPublishing ? (
              <span>Scheduling...</span>
            ) : (
              <>
                <Check size={14} />
                <span>Proceed MCQ</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
