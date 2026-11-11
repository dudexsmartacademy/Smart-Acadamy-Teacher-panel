import React from 'react';
import { Eye, Edit3, Trash2, Calendar, Clock, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { MCQAssessment } from '../../types/mcqAssessment';
import { MCQStatusBadge } from './MCQStatusBadge';

interface Props {
  assessments: MCQAssessment[];
  onDeleteClick: (assessment: MCQAssessment) => void;
}

export const MCQAssessmentTable: React.FC<Props> = ({ assessments, onDeleteClick }) => {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#E7DED3] bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#FAF7F2] border-b border-[#E7DED3] text-[#625D57] uppercase font-semibold tracking-wider">
            <tr>
              <th className="px-5 py-3.5">Assessment</th>
              <th className="px-4 py-3.5">Class / Batch</th>
              <th className="px-4 py-3.5">Subject</th>
              <th className="px-3 py-3.5 text-center">Questions</th>
              <th className="px-3 py-3.5 text-center">Max Marks</th>
              <th className="px-4 py-3.5">Schedule</th>
              <th className="px-3 py-3.5 text-center">Duration</th>
              <th className="px-4 py-3.5">Status</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E7DED3]">
            {assessments.map((a) => {
              const totalMarks = a.questions.reduce(
                (sum, q) => sum + (Number(q.marks) || 1),
                0
              );

              return (
                <tr key={a.id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-bold text-[#1B1C1E] text-sm hover:text-[#9C7449]">
                      <Link to={`/mcq-assessments/${a.id}`}>{a.title}</Link>
                    </div>
                    {a.description && (
                      <p className="text-[#8C857D] line-clamp-1 max-w-xs mt-0.5">{a.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-4 text-[#625D57]">
                    <div className="font-medium text-[#1B1C1E]">{a.classInfo?.className || 'Class'}</div>
                    <div className="text-[11px] text-[#8C857D]">
                      {a.classInfo?.batch || '2024–2028'} • Sec {a.classInfo?.section || 'A'}
                    </div>
                  </td>
                  <td className="px-4 py-4 font-medium text-[#1B1C1E]">{a.subjectName}</td>
                  <td className="px-3 py-4 text-center font-semibold text-[#1B1C1E]">{a.questions.length}</td>
                  <td className="px-3 py-4 text-center font-bold text-[#9C7449]">{totalMarks}</td>
                  <td className="px-4 py-4 text-[#625D57]">
                    <div className="flex items-center gap-1 font-medium text-[#1B1C1E]">
                      <Calendar size={12} className="text-[#8C857D]" />
                      {a.schedule.date || 'TBD'}
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-[#8C857D] mt-0.5">
                      <Clock size={11} />
                      {a.schedule.startTime} – {a.schedule.endTime}
                    </div>
                  </td>
                  <td className="px-3 py-4 text-center font-medium text-[#1B1C1E]">
                    {a.schedule.durationMinutes} min
                  </td>
                  <td className="px-4 py-4">
                    <MCQStatusBadge status={a.status} />
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link
                        to={`/mcq-assessments/${a.id}`}
                        className="p-1.5 rounded-lg text-[#1B1C1E] hover:bg-[#E9DED0] hover:text-[#9C7449] transition-colors"
                        title="View Questions & Answer Key"
                      >
                        <Eye size={15} />
                      </Link>
                      <Link
                        to={`/mcq-assessments/${a.id}/edit`}
                        className="p-1.5 rounded-lg text-[#1B1C1E] hover:bg-[#E9DED0] hover:text-[#9C7449] transition-colors"
                        title="Update Assessment"
                      >
                        <Edit3 size={15} />
                      </Link>
                      <Link
                        to={`/results?assessment=${encodeURIComponent(a.title)}`}
                        className="p-1.5 rounded-lg text-[#1B1C1E] hover:bg-[#E9DED0] hover:text-[#9C7449] transition-colors"
                        title="View Student Results"
                      >
                        <BarChart3 size={15} className="text-[#9C7449]" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => onDeleteClick(a)}
                        className="p-1.5 rounded-lg text-[#A75B52] hover:bg-[#A75B52]/10 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
