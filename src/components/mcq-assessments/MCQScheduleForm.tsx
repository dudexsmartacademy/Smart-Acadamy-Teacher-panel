import React from 'react';
import {
  Calendar,
  Clock,
  ShieldAlert,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import type { MCQSchedule, MCQClassInfo } from '../../types/mcqAssessment';

interface Props {
  title: string;
  classInfo: MCQClassInfo;
  questionsCount: number;
  maxMarks: number;
  schedule: MCQSchedule;
  onScheduleChange: (updated: MCQSchedule) => void;
  availableClasses: MCQClassInfo[];
  onClassChange: (c: MCQClassInfo) => void;
  onBack: () => void;
  onProceed: () => void;
  isEditMode?: boolean;
}

export const MCQScheduleForm: React.FC<Props> = ({
  title,
  classInfo,
  questionsCount,
  maxMarks,
  schedule,
  onScheduleChange,
  availableClasses,
  onClassChange,
  onBack,
  onProceed,
  isEditMode = false,
}) => {
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onScheduleChange({ ...schedule, date: e.target.value });
  };

  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onScheduleChange({ ...schedule, startTime: e.target.value });
  };

  const handleEndTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onScheduleChange({ ...schedule, endTime: e.target.value });
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    onScheduleChange({
      ...schedule,
      durationMinutes: isNaN(val) ? 15 : Math.max(5, val),
    });
  };

  const validateAndProceed = () => {
    const errs: Record<string, string> = {};
    if (!schedule.date) errs.date = 'Please choose an assessment date.';
    if (!schedule.startTime) errs.startTime = 'Start time is required.';
    if (!schedule.endTime) errs.endTime = 'End time is required.';
    if (!schedule.durationMinutes || schedule.durationMinutes <= 0) {
      errs.durationMinutes = 'Duration must be greater than zero.';
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setErrors({});
    onProceed();
  };

  return (
    <div className="space-y-6">
      {/* Read-only Assessment Overview Header */}
      <div className="rounded-2xl border border-[#E7DED3] bg-white p-6 shadow-sm">
        <div className="border-b border-[#E7DED3] pb-4">
          <span className="rounded-md bg-[#FAF7F2] px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-[#9C7449] border border-[#E7DED3]">
            Step 3 • Confirm & Schedule
          </span>
          <h2 className="mt-2 text-xl font-bold text-[#1B1C1E]">
            Schedule MCQ Assessment
          </h2>
          <p className="mt-0.5 text-xs text-[#625D57]">
            Set the evaluation date, start/end availability window, and test duration.
          </p>
        </div>

        {/* Read-only Summary Cards */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-[#E7DED3] bg-[#FAF7F2] p-3">
            <span className="text-[11px] font-medium text-[#8C857D] block">Assessment Title</span>
            <span className="text-xs font-bold text-[#1B1C1E] truncate block mt-0.5">
              {title || 'Untitled Assessment'}
            </span>
          </div>

          <div className="rounded-xl border border-[#E7DED3] bg-[#FAF7F2] p-3">
            <span className="text-[11px] font-medium text-[#8C857D] block">Target Class</span>
            <span className="text-xs font-bold text-[#1B1C1E] truncate block mt-0.5">
              {classInfo?.department || 'Dept'} • {classInfo?.section || 'B'} • {classInfo?.batch || '2024–2028'}
            </span>
          </div>

          <div className="rounded-xl border border-[#E7DED3] bg-[#FAF7F2] p-3">
            <span className="text-[11px] font-medium text-[#8C857D] block">Total Questions</span>
            <span className="text-xs font-bold text-[#1B1C1E] block mt-0.5">
              {questionsCount} Questions
            </span>
          </div>

          <div className="rounded-xl border border-[#E7DED3] bg-[#FAF7F2] p-3">
            <span className="text-[11px] font-medium text-[#8C857D] block">Total Marks</span>
            <span className="text-xs font-bold text-[#9C7449] block mt-0.5">
              {maxMarks} Maximum Marks
            </span>
          </div>
        </div>
      </div>

      {/* Backend Authoritative Timer Warning / Notice */}
      <div className="rounded-2xl border border-[#B08E67]/40 bg-[#FAF7F2] p-5 shadow-sm">
        <div className="flex items-start gap-3.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#B08E67] text-white shadow-sm">
            <ShieldAlert size={18} />
          </div>
          <div className="text-xs space-y-1">
            <h4 className="font-bold text-[#1B1C1E] text-sm">
              Authoritative Assessment Timer & Auto-Submit Enforcement
            </h4>
            <p className="text-[#625D57] leading-relaxed">
              Students can only access this assessment during its configured availability window.
              The backend server acts as the authoritative timekeeper. When the configured duration expires,
              the student&apos;s attempt will automatically terminate and submit to protect evaluation integrity.
            </p>
          </div>
        </div>
      </div>

      {/* Schedule Configuration Card */}
      <div className="rounded-2xl border border-[#E7DED3] bg-white p-6 shadow-sm space-y-6">
        <div className="border-b border-[#E7DED3] pb-3">
          <h3 className="text-sm font-bold text-[#1B1C1E]">
            Timing & Availability Configuration
          </h3>
          <p className="text-xs text-[#8C857D]">
            Timezone configured for academy: <strong className="text-[#1B1C1E]">{schedule.timezone}</strong>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Assessment Date */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[#625D57] flex items-center gap-1.5 mb-1.5">
              <Calendar size={13} className="text-[#B08E67]" />
              <span>Assessment Date</span>
              <span className="text-[#A75B52] font-bold">*</span>
            </label>
            <input
              type="date"
              value={schedule.date}
              onChange={handleDateChange}
              className={`w-full rounded-xl border p-3 text-xs font-semibold transition-all focus:outline-none ${
                errors.date
                  ? 'border-[#A75B52] bg-[#FAF7F2]'
                  : 'border-[#E7DED3] bg-[#FAF7F2]/50 focus:border-[#B08E67] focus:bg-white'
              }`}
            />
            {errors.date && (
              <p className="mt-1 text-xs text-[#A75B52] font-medium">{errors.date}</p>
            )}
          </div>

          {/* Assessment Duration */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[#625D57] flex items-center gap-1.5 mb-1.5">
              <Clock size={13} className="text-[#B08E67]" />
              <span>Assessment Duration</span>
              <span className="text-[#A75B52] font-bold">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="5"
                step="5"
                value={schedule.durationMinutes}
                onChange={handleDurationChange}
                placeholder="30"
                className={`w-full rounded-xl border p-3 text-xs font-bold transition-all focus:outline-none ${
                  errors.durationMinutes
                    ? 'border-[#A75B52] bg-[#FAF7F2]'
                    : 'border-[#E7DED3] bg-[#FAF7F2]/50 focus:border-[#B08E67] focus:bg-white'
                }`}
              />
              <span className="absolute right-3 top-3 text-xs font-semibold text-[#8C857D]">
                Minutes
              </span>
            </div>
            {errors.durationMinutes && (
              <p className="mt-1 text-xs text-[#A75B52] font-medium">{errors.durationMinutes}</p>
            )}
          </div>

          {/* Start Time */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[#625D57] flex items-center gap-1.5 mb-1.5">
              <Clock size={13} className="text-[#5E8065]" />
              <span>Start Time (Window Open)</span>
              <span className="text-[#A75B52] font-bold">*</span>
            </label>
            <input
              type="text"
              value={schedule.startTime}
              onChange={handleStartTimeChange}
              placeholder="e.g. 10:00 AM"
              className={`w-full rounded-xl border p-3 text-xs font-semibold transition-all focus:outline-none ${
                errors.startTime
                  ? 'border-[#A75B52] bg-[#FAF7F2]'
                  : 'border-[#E7DED3] bg-[#FAF7F2]/50 focus:border-[#B08E67] focus:bg-white'
              }`}
            />
            {errors.startTime && (
              <p className="mt-1 text-xs text-[#A75B52] font-medium">{errors.startTime}</p>
            )}
          </div>

          {/* End Time */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[#625D57] flex items-center gap-1.5 mb-1.5">
              <Clock size={13} className="text-[#A75B52]" />
              <span>End Time (Window Expiry)</span>
              <span className="text-[#A75B52] font-bold">*</span>
            </label>
            <input
              type="text"
              value={schedule.endTime}
              onChange={handleEndTimeChange}
              placeholder="e.g. 10:30 AM"
              className={`w-full rounded-xl border p-3 text-xs font-semibold transition-all focus:outline-none ${
                errors.endTime
                  ? 'border-[#A75B52] bg-[#FAF7F2]'
                  : 'border-[#E7DED3] bg-[#FAF7F2]/50 focus:border-[#B08E67] focus:bg-white'
              }`}
            />
            {errors.endTime && (
              <p className="mt-1 text-xs text-[#A75B52] font-medium">{errors.endTime}</p>
            )}
          </div>
        </div>

        {/* Authorized Class Breakdown Section */}
        <div className="pt-4 border-t border-[#E7DED3]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#1B1C1E]">
                Authorized Batch Cohort
              </h4>
              <p className="text-[11px] text-[#8C857D]">
                Select the authorized batch allowed to take this assessment.
              </p>
            </div>
            <span className="rounded-md bg-[#FAF7F2] px-2 py-0.5 text-[11px] font-bold text-[#5E8065] border border-[#E7DED3]">
              RBAC Verified
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {availableClasses.map((c) => {
              const isSelected = classInfo?.classId === c.classId;

              return (
                <button
                  key={c.classId}
                  type="button"
                  onClick={() => onClassChange(c)}
                  className={`text-left rounded-xl border p-3.5 transition-all ${
                    isSelected
                      ? 'border-[#B08E67] bg-[#FAF7F2] ring-2 ring-[#B08E67]/20 shadow-sm'
                      : 'border-[#E7DED3] bg-white hover:border-[#CFBAA1]'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="font-bold text-xs text-[#1B1C1E]">{c.className}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isSelected
                          ? 'bg-[#B08E67] text-white'
                          : 'bg-[#E9DED0] text-[#1B1C1E]'
                      }`}
                    >
                      {c.className}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-[#625D57] space-y-0.5">
                    <p className="truncate">{c.college}</p>
                    <p className="font-medium text-[#1B1C1E]">
                      {c.specialization}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="sticky bottom-4 z-20 flex items-center justify-between rounded-2xl border border-[#E7DED3] bg-white p-4 shadow-lg">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-xl border border-[#E7DED3] bg-[#FAF7F2] px-5 py-2.5 text-xs font-bold text-[#1B1C1E] hover:bg-[#E9DED0] hover:border-[#B08E67] transition-all"
        >
          <ArrowLeft size={14} />
          <span>Back to Preview</span>
        </button>

        <button
          type="button"
          onClick={validateAndProceed}
          className="inline-flex items-center gap-2 rounded-xl bg-[#1B1C1E] px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#9C7449] transition-all"
        >
          <span>{isEditMode ? 'Proceed & Save Changes' : 'Proceed to Final Step'}</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
};
