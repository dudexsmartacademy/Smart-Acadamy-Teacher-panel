import React from 'react';
import { Eye, Edit3, Trash2, Calendar, Clock, HelpCircle, Award, BookOpen, Layers, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { MCQAssessment } from '../../types/mcqAssessment';
import { MCQStatusBadge } from './MCQStatusBadge';

interface Props {
  assessment: MCQAssessment;
  onDeleteClick: (assessment: MCQAssessment) => void;
  isHighlighted?: boolean;
}

export const MCQAssessmentCard: React.FC<Props> = ({
  assessment,
  onDeleteClick,
  isHighlighted = false,
}) => {
  const questionCount = assessment.questions.length || assessment.questionCount || 0;
  const totalMarks =
    assessment.questions.length > 0
      ? assessment.questions.reduce((sum, q) => sum + (Number(q.marks) || 1), 0)
      : assessment.totalMarks || 0;

  const formattedDate = React.useMemo(() => {
    if (!assessment.schedule.date) return 'Not scheduled';
    try {
      const d = new Date(assessment.schedule.date);
      return d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return assessment.schedule.date;
    }
  }, [assessment.schedule.date]);

  const classDisplay = assessment.classInfo
    ? `${assessment.classInfo.department || 'General'} • ${
        assessment.classInfo.section || 'All'
      } • ${assessment.classInfo.batch || '2024–2028'}`
    : 'Class Not Assigned';

  return (
    <div
      className={`group relative rounded-2xl border bg-white p-5 transition-all duration-200 hover:shadow-md flex flex-col justify-between ${
        isHighlighted
          ? 'border-[#B08E67] ring-2 ring-[#B08E67]/20 shadow-md bg-[#FAF7F2]/50'
          : 'border-[#E7DED3] hover:border-[#B08E67]/50'
      }`}
    >
      <div>
        {/* Header with Title & Status */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-[#1B1C1E] group-hover:text-[#9C7449] transition-colors truncate">
              {assessment.title}
            </h3>
            <p className="mt-0.5 text-xs text-[#625D57] flex items-center gap-1.5 font-medium">
              <Layers size={13} className="text-[#B08E67] shrink-0" />
              <span>{classDisplay}</span>
            </p>
          </div>
          <MCQStatusBadge status={assessment.status} className="shrink-0" />
        </div>

        {/* Badges / Metrics Row */}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FAF7F2] text-[#1B1C1E] border border-[#E7DED3] font-medium">
            <BookOpen size={12} className="text-[#B08E67]" />
            {assessment.subjectName}
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FAF7F2] text-[#1B1C1E] border border-[#E7DED3] font-medium">
            <HelpCircle size={12} className="text-[#B08E67]" />
            {questionCount} Questions
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FAF7F2] text-[#1B1C1E] border border-[#E7DED3] font-semibold">
            <Award size={12} className="text-[#B08E67]" />
            {totalMarks} Marks
          </span>
        </div>

        {/* Schedule & Timing Info */}
        <div className="mt-4 pt-3 border-t border-[#E7DED3] space-y-1.5 text-xs text-[#625D57]">
          <div className="flex items-center gap-2">
            <Calendar size={13} className="text-[#8C857D] shrink-0" />
            <span className="font-medium text-[#1B1C1E]">{formattedDate}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={13} className="text-[#8C857D] shrink-0" />
            <span>
              {assessment.schedule.startTime || '10:00 AM'} – {assessment.schedule.endTime || '10:30 AM'}
              <span className="mx-1.5 text-[#8C857D]">•</span>
              <strong className="text-[#1B1C1E] font-medium">
                Duration: {assessment.schedule.durationMinutes} Minutes
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-5 pt-3 border-t border-[#E7DED3] flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Link
            to={`/mcq-assessments/${assessment.id}`}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#FAF7F2] text-[#1B1C1E] border border-[#E7DED3] hover:bg-[#E9DED0] hover:border-[#B08E67] transition-all"
            title="View full assessment answer key and details"
          >
            <Eye size={13} />
            View
          </Link>
          <Link
            to={`/mcq-assessments/${assessment.id}/edit`}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white text-[#1B1C1E] border border-[#E7DED3] hover:bg-[#FAF7F2] hover:border-[#B08E67] hover:text-[#9C7449] transition-all"
            title="Update assessment questions and schedule"
          >
            <Edit3 size={13} />
            Update
          </Link>
          <Link
            to={`/results?assessment=${encodeURIComponent(assessment.title)}`}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#FAF7F2] text-[#1B1C1E] border border-[#E7DED3] hover:bg-[#E9DED0] hover:border-[#B08E67] transition-all"
            title="View student results and scorecard submissions"
          >
            <BarChart3 size={13} className="text-[#9C7449]" />
            View Result
          </Link>
        </div>

        <button
          type="button"
          onClick={() => onDeleteClick(assessment)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#A75B52] hover:bg-[#A75B52]/10 hover:text-[#A75B52] transition-all"
          title="Delete or Archive Assessment"
        >
          <Trash2 size={13} />
          Delete
        </button>
      </div>
    </div>
  );
};
