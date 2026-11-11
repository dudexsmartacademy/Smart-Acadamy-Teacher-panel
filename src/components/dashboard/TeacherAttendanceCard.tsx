import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Clock, ArrowRight, TrendingUp, CalendarDays, UserCheck, Check, X, Info, AlertTriangle } from "lucide-react";
import {
  ATTENDANCE_CHANGED_EVENT,
  teacherAttendanceService,
  type TeacherAttendanceDay,
  type TeacherAttendanceSummary,
} from "../../services/teacherAttendanceService";
import ConfirmDialog, { type ConfirmState } from "../attendance/ConfirmDialog";
import AdvanceLeaveDialog from "../attendance/AdvanceLeaveDialog";

export default function TeacherAttendanceCard() {
  const [summary, setSummary] = useState<TeacherAttendanceSummary>(() => teacherAttendanceService.getSummary());
  const [days, setDays] = useState<TeacherAttendanceDay[]>(() => teacherAttendanceService.getDays());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmState | null>(null);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);

  useEffect(() => {
    const sync = () => {
      setSummary(teacherAttendanceService.getSummary());
      setDays([...teacherAttendanceService.getDays()]);
    };
    window.addEventListener(ATTENDANCE_CHANGED_EVENT, sync);
    void teacherAttendanceService.refresh().then((res) => {
      setError(res.error);
      setLoading(false);
      sync();
    });
    return () => window.removeEventListener(ATTENDANCE_CHANGED_EVENT, sync);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const executeMarkPresent = async () => {
    setSaving(true);
    const result = await teacherAttendanceService.markTodayAttendance("Present");
    setSaving(false);
    setSummary(result.summary);
    showToast(result.message);
  };

  const handleMarkPresentWithConfirm = () => {
    if (summary.isSunday) {
      showToast("Today is Sunday — There are no classes scheduled for you today and you do not have to mark attendance for today because today is Sunday.");
      return;
    }

    if (summary.todayStatus && summary.todayStatus !== "Pending" && summary.todayStatus !== "Holiday") {
      setConfirmDialog({
        title: "Confirm Attendance Alteration",
        description: `You have already marked today's attendance as "${summary.todayStatus}". Do you want to modify and change today's status to Present, or cancel?`,
        warningNote: "This will update today's attendance record and log your check-in timestamp.",
        confirmText: "Yes, Update Attendance",
        onConfirm: () => {
          setConfirmDialog(null);
          void executeMarkPresent();
        },
      });
      return;
    }
    void executeMarkPresent();
  };

  const handleOpenLeaveDialog = () => {
    if (summary.isSunday) {
      showToast("Today is Sunday — There are no classes scheduled for today. You can apply advance leave for upcoming academic days.");
    }
    setLeaveDialogOpen(true);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50/60 via-white to-orange-50/30 p-5 shadow-sm transition-all hover:shadow-md sm:p-6">
      {toastMessage && (
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-xs font-medium text-white shadow-xl animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
          <button type="button" onClick={() => setToastMessage(null)} className="ml-2 rounded p-0.5 hover:bg-gray-800 cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Top row: Header & Mark Attendance Actions */}
      <div className="flex flex-col gap-4 border-b border-gray-100 pb-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#E9DED0] text-[#9C7449] shadow-xs">
            <UserCheck size={24} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-lg font-bold text-gray-900">Faculty Self-Attendance</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100/80 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                <CalendarDays size={13} />
                3-Month Course (90 Days)
              </span>
            </div>
            <p className="mt-0.5 text-xs text-gray-500">
              Track your teaching attendance, attended classes, and leave balance across the 90-day semester
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-xs">
            <div className="flex items-center gap-1.5">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  summary.isSunday
                    ? "bg-blue-500"
                    : summary.todayStatus === "Present"
                      ? "bg-emerald-500 animate-pulse"
                      : summary.todayStatus === "Leave"
                        ? "bg-amber-500"
                        : "bg-rose-500"
                }`}
              />
              <span className="text-xs font-semibold text-gray-700">
                Today:{" "}
                <span
                  className={
                    summary.isSunday
                      ? "text-blue-700 font-bold"
                      : summary.todayStatus === "Present"
                        ? "text-emerald-700"
                        : summary.todayStatus === "Leave"
                          ? "text-amber-700"
                          : "text-rose-700"
                  }
                >
                  {loading ? "Loading…" : summary.isSunday ? "Sunday (No Class)" : summary.todayStatus}
                </span>
              </span>
            </div>
            {summary.todayCheckInTime && (
              <span className="flex items-center gap-1 border-l border-gray-200 pl-2 text-[11px] text-gray-500">
                <Clock size={12} /> {summary.todayCheckInTime}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleMarkPresentWithConfirm}
            disabled={saving || loading}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-60 ${
              summary.isSunday ? "bg-gray-200 text-gray-700 hover:bg-gray-300" : "bg-emerald-600 text-white hover:bg-emerald-700"
            }`}
          >
            <Check size={14} />
            {saving ? "Saving…" : "Mark Present"}
          </button>

          <button
            type="button"
            onClick={handleOpenLeaveDialog}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-xs transition hover:bg-gray-50 active:scale-95 cursor-pointer"
          >
            Mark Leave
          </button>

          <Link
            to="/my-attendance"
            className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-gray-800 active:scale-95 cursor-pointer"
          >
            <span>View My Attendance</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {error && (
        <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {summary.isSunday && (
        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/80 p-3.5 flex items-start gap-2.5 text-xs text-blue-950">
          <Info className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Today is Sunday (Institutional Weekend):</strong> There are no classes scheduled for you today and faculty attendance is not required.
          </p>
        </div>
      )}

      {/* 4 Key Statistics for the 90-Day Course */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-gray-500">Total Course Days</p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-gray-900">{summary.totalCourseDays}</span>
            <span className="text-xs text-gray-500 font-medium">Days (3 Mo)</span>
          </div>
          <p className="mt-1 text-[11px] text-amber-700 font-medium">Day {summary.currentDayNumber} of 90 in progress</p>
        </div>

        <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 shadow-xs">
          <p className="text-xs font-medium text-emerald-800">Days Attended</p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-emerald-950">{summary.daysAttended}</span>
            <span className="text-xs text-emerald-700 font-medium">/ {summary.currentDayNumber} Days</span>
          </div>
          <p className="mt-1 text-[11px] text-emerald-700 font-medium">Full &amp; active class attendance</p>
        </div>

        <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-4 shadow-xs">
          <p className="text-xs font-medium text-amber-800">Leaves / Absent</p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-amber-950">{summary.daysLeave + summary.daysAbsent}</span>
            <span className="text-xs text-amber-700 font-medium">Days taken</span>
          </div>
          <p className="mt-1 text-[11px] text-amber-700 font-medium">
            {summary.daysLeave} Leave · {summary.daysAbsent} Absent
          </p>
        </div>

        <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-blue-800">Attendance Rate</p>
            <TrendingUp size={14} className="text-blue-600" />
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-blue-950">{summary.attendancePercentage}%</span>
            <span className="text-xs text-blue-700 font-medium">Target: 85%</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-blue-200/60">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-500"
              style={{ width: `${Math.min(summary.attendancePercentage, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {leaveDialogOpen && (
      <AdvanceLeaveDialog
        open
        summary={summary}
        days={days}
        onClose={() => setLeaveDialogOpen(false)}
        onConfirmRequired={setConfirmDialog}
        onSubmitted={showToast}
      />
      )}

      <ConfirmDialog state={confirmDialog} onCancel={() => setConfirmDialog(null)} />
    </div>
  );
}
