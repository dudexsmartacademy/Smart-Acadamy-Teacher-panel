import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Download,
  Search,
  TrendingUp,
  AlertTriangle,
  CalendarDays,
  Check,
  Edit2,
  X,
  Info,
  FileText,
} from "lucide-react";
import {
  ATTENDANCE_CHANGED_EVENT,
  teacherAttendanceService,
  type LeaveRequestRecord,
  type TeacherAttendanceDay,
  type TeacherAttendanceStatus,
  type TeacherAttendanceSummary,
} from "../../services/teacherAttendanceService";
import CustomSelect from "../../components/CustomSelect";
import ConfirmDialog, { type ConfirmState } from "../../components/attendance/ConfirmDialog";
import AdvanceLeaveDialog from "../../components/attendance/AdvanceLeaveDialog";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function TeacherAttendance() {
  const [days, setDays] = useState<TeacherAttendanceDay[]>(() => teacherAttendanceService.getDays());
  const [summary, setSummary] = useState<TeacherAttendanceSummary>(() => teacherAttendanceService.getSummary());
  const [leaves, setLeaves] = useState<LeaveRequestRecord[]>(() => teacherAttendanceService.getLeaveRequests());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [monthFilter, setMonthFilter] = useState<string>("All");

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmState | null>(null);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);

  // Edit Modal State
  const [editingDay, setEditingDay] = useState<TeacherAttendanceDay | null>(null);
  const [editStatus, setEditStatus] = useState<TeacherAttendanceStatus>("Present");
  const [editRemarks, setEditRemarks] = useState("");
  const [editLeaveType, setEditLeaveType] = useState<TeacherAttendanceDay["leaveType"]>("Casual");
  const [editError, setEditError] = useState<string | null>(null);

  const syncFromService = () => {
    setDays([...teacherAttendanceService.getDays()]);
    setSummary(teacherAttendanceService.getSummary());
    setLeaves([...teacherAttendanceService.getLeaveRequests()]);
  };

  // Load from Supabase and stay in sync with the dashboard card
  useEffect(() => {
    window.addEventListener(ATTENDANCE_CHANGED_EVENT, syncFromService);
    void teacherAttendanceService.refresh().then((res) => {
      setLoadError(res.error);
      setLoading(false);
      syncFromService();
    });
    return () => window.removeEventListener(ATTENDANCE_CHANGED_EVENT, syncFromService);
  }, []);

  // Months covered by the current 90-day course window
  const courseMonths = useMemo(() => {
    const keys: string[] = [];
    days.forEach((d) => {
      const key = d.date.slice(0, 7);
      if (!keys.includes(key)) keys.push(key);
    });
    return keys.map((key, index) => ({
      key,
      name: MONTH_NAMES[Number(key.slice(5, 7)) - 1],
      label: `Month ${index + 1} (${MONTH_NAMES[Number(key.slice(5, 7)) - 1]})`,
    }));
  }, [days]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleMarkToday = async (status: TeacherAttendanceStatus) => {
    setSaving(true);
    const result = await teacherAttendanceService.markTodayAttendance(status);
    setSaving(false);
    syncFromService();
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
        warningNote: "This will update today's attendance record and log your current check-in timestamp.",
        confirmText: "Yes, Update Attendance",
        onConfirm: () => {
          setConfirmDialog(null);
          void handleMarkToday("Present");
        },
      });
      return;
    }
    void handleMarkToday("Present");
  };

  const handleOpenEdit = (day: TeacherAttendanceDay) => {
    setEditingDay(day);
    setEditStatus(day.date > summary.todayDate ? "Leave" : day.status === "Pending" ? "Present" : day.status);
    setEditRemarks(day.pendingApproval ? "" : day.remarks || "");
    setEditLeaveType(day.leaveType && day.leaveType !== "None" ? day.leaveType : "Casual");
    setEditError(null);
  };

  const executeSaveEdit = async () => {
    if (!editingDay) return;
    setSaving(true);
    const res = await teacherAttendanceService.updateDayAttendance(editingDay, editStatus, editRemarks, editLeaveType);
    setSaving(false);
    if (!res.success) {
      setEditError(res.message);
      return;
    }
    syncFromService();
    setEditingDay(null);
    showToast(res.message);
  };

  const handleSaveEdit = () => {
    if (!editingDay) return;

    if (editingDay.status !== "Pending" && editingDay.status !== editStatus) {
      setConfirmDialog({
        title: "Confirm Attendance Alteration",
        description: `Are you sure you want to change Day ${editingDay.dayNumber} (${editingDay.date}) status from "${editingDay.status}" to "${editStatus}"?`,
        warningNote: "This will update the attendance record, recalculate your metrics, and refresh the 90-day heatmap.",
        confirmText: "Yes, Update Attendance",
        onConfirm: () => {
          setConfirmDialog(null);
          void executeSaveEdit();
        },
      });
      return;
    }

    void executeSaveEdit();
  };

  const handleOpenLeaveDialog = () => {
    if (summary.isSunday) {
      showToast("Today is Sunday — There are no classes scheduled today. You can select tomorrow or upcoming academic dates for advance leave.");
    }
    setLeaveDialogOpen(true);
  };

  const heatmapCounts = useMemo(() => {
    return {
      present: days.filter((d) => d.status === "Present" || d.status === "Half Day").length,
      leave: days.filter((d) => d.status === "Leave").length,
      absent: days.filter((d) => d.status === "Absent").length,
      pending: days.filter((d) => d.status === "Pending").length,
    };
  }, [days]);

  const filteredDays = useMemo(() => {
    return days.filter((item) => {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        item.date.includes(searchLower) ||
        item.dayOfWeek.toLowerCase().includes(searchLower) ||
        `day ${item.dayNumber}`.toLowerCase().includes(searchLower) ||
        (item.remarks && item.remarks.toLowerCase().includes(searchLower));

      const matchesStatus =
        statusFilter === "All" ||
        (statusFilter === "Present" && (item.status === "Present" || item.status === "Half Day")) ||
        (statusFilter === "Absent" && (item.status === "Absent" || item.status === "Leave")) ||
        item.status === statusFilter;

      const matchesMonth = monthFilter === "All" || item.date.startsWith(monthFilter);

      return matchesSearch && matchesStatus && matchesMonth;
    });
  }, [days, search, statusFilter, monthFilter]);

  const handleExportCSV = () => {
    const headers = "Day Number,Date,Day of Week,Status,Check-In,Check-Out,Classes Conducted,Subject,Remarks\n";
    const rows = days
      .map(
        (d) =>
          `${d.dayNumber},${d.date},${d.dayOfWeek},${d.status},"${d.checkInTime || "--"}","${d.checkOutTime || "--"}",${d.classesConducted},"${d.subject}","${(d.remarks || "").replace(/"/g, '""')}"`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Faculty_Attendance_90_Days_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("Attendance CSV report downloaded.");
  };

  const workingDaysSoFar = Math.max(summary.currentDayNumber, 1);
  const statusBadgeClass = (status: TeacherAttendanceStatus) =>
    status === "Present"
      ? "bg-emerald-100 text-emerald-800"
      : status === "Half Day"
        ? "bg-purple-100 text-purple-800"
        : status === "Leave"
          ? "bg-amber-100 text-amber-800"
          : status === "Absent"
            ? "bg-rose-100 text-rose-800"
            : "bg-gray-100 text-gray-600";

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2.5 rounded-xl bg-gray-900 px-4 py-3 text-sm font-medium text-white shadow-2xl animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 size={18} className="text-emerald-400" />
          <span>{toastMessage}</span>
          <button type="button" onClick={() => setToastMessage(null)} className="ml-2 rounded p-1 hover:bg-gray-800">
            <X size={15} />
          </button>
        </div>
      )}

      {/* Breadcrumb & Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-900"
          >
            <ArrowLeft size={14} /> Back to Dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            My Attendance &amp; 90-Day Course Tracker
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Comprehensive faculty attendance record for the 3-Month (90 Days) semester curriculum
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={days.length === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-700 shadow-xs hover:bg-gray-50 disabled:opacity-50"
          >
            <Download size={16} />
            Export Report (CSV)
          </button>
        </div>
      </div>

      {loadError && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          {loadError}
        </div>
      )}

      {/* Today's Live Attendance Marking Card */}
      <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-white p-5 shadow-xs sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gray-900 text-white shadow-sm">
              <CalendarCheck size={28} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-900">
                  TODAY · {summary.isSunday ? "SUNDAY (WEEKEND)" : `DAY ${summary.currentDayNumber} OF ${summary.totalCourseDays}`}
                </span>
                <span className="text-xs text-gray-600 font-semibold">
                  {summary.todayDayOfWeek}, {summary.todayDate}
                </span>
              </div>
              <h2 className="mt-1 text-lg font-bold text-gray-900">
                {summary.isSunday ? "Faculty Attendance — Sunday (Weekend)" : "Mark Today's Attendance"}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-600">
                <span className="flex items-center gap-1 font-semibold text-gray-800">
                  Status:
                  <span
                    className={`ml-1 inline-flex items-center rounded-md px-2 py-0.5 font-bold ${
                      summary.isSunday
                        ? "bg-blue-100 text-blue-800"
                        : summary.todayStatus === "Present"
                          ? "bg-emerald-100 text-emerald-800"
                          : summary.todayStatus === "Leave"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {loading ? "Loading…" : summary.isSunday ? "Sunday (No Class)" : summary.todayStatus}
                  </span>
                </span>
                {summary.todayCheckInTime && (
                  <span className="flex items-center gap-1 text-gray-500">
                    <Clock size={13} /> Clocked In: {summary.todayCheckInTime}
                  </span>
                )}
                <span>
                  {summary.isSunday
                    ? "· Institutional Weekend (0 Classes)"
                    : `· Scheduled Sessions: ${summary.todayClassesScheduled} Class${summary.todayClassesScheduled === 1 ? "" : "es"}${summary.todaySubjects && summary.todaySubjects !== "—" ? ` (${summary.todaySubjects})` : ""}`}
                </span>
              </div>
            </div>
          </div>

          {/* Direct Attendance Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleMarkPresentWithConfirm}
              disabled={saving || loading}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-60 ${
                summary.isSunday
                  ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  : summary.todayStatus === "Present"
                    ? "bg-emerald-700 text-white ring-2 ring-emerald-400"
                    : "bg-emerald-600 text-white hover:bg-emerald-700"
              }`}
            >
              <Check size={16} />
              {saving ? "Saving…" : "Mark Present"}
            </button>

            <button
              type="button"
              onClick={handleOpenLeaveDialog}
              disabled={loading}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-xs transition active:scale-95 cursor-pointer ${
                summary.todayStatus === "Leave"
                  ? "bg-amber-700 text-white ring-2 ring-amber-400"
                  : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              Apply Leave
            </button>
          </div>
        </div>

        {summary.isSunday && (
          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/80 p-3.5 flex items-start gap-2.5 text-xs text-blue-950">
            <Info className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Institutional Weekend:</strong> Today is Sunday — there are no classes scheduled for you today and you do not have to mark attendance for today because today is Sunday.
            </p>
          </div>
        )}
      </div>

      {/* 90-Day Course Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Course Days</p>
            <CalendarDays size={18} className="text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-3xl font-extrabold text-gray-900">{summary.totalCourseDays}</p>
            <span className="text-xs font-semibold text-gray-500">Days (3 Months)</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs font-medium text-gray-500">
            <span>Completed: {summary.currentDayNumber} Days</span>
            <span>Left: {summary.daysRemaining} Days</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-amber-600" style={{ width: `${summary.courseCompletionPercentage}%` }} />
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Classes Attended</p>
            <CheckCircle2 size={18} className="text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-3xl font-extrabold text-emerald-950">{summary.daysAttended}</p>
            <span className="text-xs font-semibold text-emerald-700">/ {summary.currentDayNumber} Working Days</span>
          </div>
          <p className="mt-3 text-xs font-medium text-emerald-700">{summary.daysAttended} Days Present (Regular classes)</p>
          <div className="mt-1.5 h-1.5 w-full rounded-full bg-emerald-200">
            <div
              className="h-full rounded-full bg-emerald-600"
              style={{ width: `${Math.min((summary.daysAttended / workingDaysSoFar) * 100, 100).toFixed(0)}%` }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-800">Leaves &amp; Absent</p>
            <AlertTriangle size={18} className="text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-3xl font-extrabold text-amber-950">{summary.daysLeave + summary.daysAbsent}</p>
            <span className="text-xs font-semibold text-amber-700">Days Total</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs font-medium text-amber-800">
            <span>Leaves: {summary.daysLeave} (Casual + Medical)</span>
            <span>Absent: {summary.daysAbsent}</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full rounded-full bg-amber-200">
            <div
              className="h-full rounded-full bg-amber-600"
              style={{ width: `${Math.min(((summary.daysLeave + summary.daysAbsent) / workingDaysSoFar) * 100, 100).toFixed(0)}%` }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-800">Attendance Rate</p>
            <TrendingUp size={18} className="text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-3xl font-extrabold text-blue-950">{summary.attendancePercentage}%</p>
            <span className="text-xs font-semibold text-blue-700">Benchmark: 85%</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs font-medium text-blue-800">
            <span>CL: {Math.max(summary.casualLeaveAllowance - summary.casualLeaveUsed, 0)} left</span>
            <span>ML: {Math.max(summary.medicalLeaveAllowance - summary.medicalLeaveUsed, 0)} left</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full rounded-full bg-blue-200">
            <div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.min(summary.attendancePercentage, 100)}%` }} />
          </div>
        </div>
      </div>

      {/* 90-Day Course Visual Grid / Heatmap */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs sm:p-6">
        <div className="flex flex-col gap-2 border-b border-gray-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-bold text-gray-900">90-Day Semester Curriculum Heatmap</h3>
            <p className="text-xs text-gray-500">
              Interactive timeline of all 90 days across{" "}
              {courseMonths.map((m, i) => `Month ${i + 1} (${m.name})`).join(", ") || "the current course"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 font-medium text-gray-700">
              <span className="h-3 w-3 rounded-sm bg-emerald-500" /> Present ({heatmapCounts.present})
            </span>
            <span className="flex items-center gap-1.5 font-medium text-gray-700">
              <span className="h-3 w-3 rounded-sm bg-amber-500" /> Leave ({heatmapCounts.leave})
            </span>
            <span className="flex items-center gap-1.5 font-medium text-gray-700">
              <span className="h-3 w-3 rounded-sm bg-rose-500" /> Absent ({heatmapCounts.absent})
            </span>
            <span className="flex items-center gap-1.5 font-medium text-gray-700">
              <span className="h-3 w-3 rounded-sm bg-gray-200" /> Pending ({heatmapCounts.pending})
            </span>
          </div>
        </div>

        {loading && days.length === 0 ? (
          <p className="mt-5 text-sm text-gray-500">Loading your attendance…</p>
        ) : (
          <div className="mt-5 grid grid-cols-6 gap-1.5 sm:grid-cols-10 md:grid-cols-15 lg:grid-cols-30">
            {days.map((d) => {
              let bgClass = "bg-gray-100 text-gray-400 border-gray-200";
              if (d.status === "Present") {
                bgClass = "bg-emerald-500 text-white hover:bg-emerald-600 shadow-xs";
              } else if (d.status === "Half Day") {
                bgClass = "bg-purple-500 text-white hover:bg-purple-600 shadow-xs";
              } else if (d.status === "Leave") {
                bgClass = d.pendingApproval
                  ? "bg-amber-200 text-amber-900 border-amber-300 border-dashed hover:bg-amber-300"
                  : "bg-amber-500 text-white hover:bg-amber-600 shadow-xs";
              } else if (d.status === "Absent") {
                bgClass = "bg-rose-500 text-white hover:bg-rose-600 shadow-xs";
              }

              const isToday = d.date === summary.todayDate;

              return (
                <button
                  key={d.dayNumber}
                  type="button"
                  onClick={() => handleOpenEdit(d)}
                  title={`Day ${d.dayNumber} (${d.date}): ${d.status}${d.pendingApproval ? " (pending approval)" : ""} ${d.remarks ? `· ${d.remarks}` : ""}`}
                  className={`relative flex h-8 w-full cursor-pointer items-center justify-center rounded-md border text-[11px] font-bold transition active:scale-90 ${bgClass} ${
                    isToday ? "ring-2 ring-gray-900 ring-offset-1" : ""
                  }`}
                >
                  {d.dayNumber}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Attendance Filter & Daily Records Table */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-xs">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="relative flex-1 sm:max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by day, date, remarks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:items-center gap-2">
            <div className="w-full md:w-56">
              <CustomSelect
                value={statusFilter}
                onChange={(val) => setStatusFilter(val)}
                options={[
                  { value: "All", label: `All Status (${days.length})` },
                  { value: "Present", label: "Present & Half Day" },
                  { value: "Absent", label: "Leaves & Absent" },
                  { value: "Pending", label: "Upcoming Days" },
                ]}
              />
            </div>

            <div className="w-full md:w-56">
              <CustomSelect
                value={monthFilter}
                onChange={(val) => setMonthFilter(val)}
                options={[
                  { value: "All", label: `All Months (${courseMonths.length} Mo)` },
                  ...courseMonths.map((m) => ({ value: m.key, label: m.label })),
                ]}
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50/80">
              <tr>
                <th className="px-5 py-3 text-xs font-bold uppercase text-gray-600">Course Day #</th>
                <th className="px-5 py-3 text-xs font-bold uppercase text-gray-600">Date &amp; Day</th>
                <th className="px-5 py-3 text-xs font-bold uppercase text-gray-600">Attendance Status</th>
                <th className="px-5 py-3 text-xs font-bold uppercase text-gray-600">Check-In / Out</th>
                <th className="px-5 py-3 text-xs font-bold uppercase text-gray-600">Classes Held</th>
                <th className="px-5 py-3 text-xs font-bold uppercase text-gray-600">Subject / Remarks</th>
                <th className="px-5 py-3 text-right text-xs font-bold uppercase text-gray-600">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {filteredDays.map((item) => {
                const isToday = item.date === summary.todayDate;

                return (
                  <tr key={item.dayNumber} className={`transition hover:bg-gray-50/80 ${isToday ? "bg-amber-50/30" : ""}`}>
                    <td className="px-5 py-3.5">
                      <span className="font-bold text-gray-900">Day {item.dayNumber}</span>
                      <span className="text-xs text-gray-400 font-medium"> / 90</span>
                    </td>

                    <td className="px-5 py-3.5">
                      <p className="font-medium text-gray-900">{item.date}</p>
                      <p className="text-xs text-gray-500">{item.dayOfWeek}</p>
                    </td>

                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${statusBadgeClass(item.status)}`}>
                        {item.status}
                        {item.late && " (Late)"}
                        {item.leaveType && item.leaveType !== "None" && ` (${item.leaveType})`}
                        {item.pendingApproval && " · Pending"}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-xs text-gray-600">
                      {item.checkInTime ? (
                        <span>
                          {item.checkInTime} — {item.checkOutTime || "--"}
                        </span>
                      ) : (
                        <span className="text-gray-400">-- : --</span>
                      )}
                    </td>

                    <td className="px-5 py-3.5">
                      <span className="font-semibold text-gray-900">
                        {item.classesConducted} Class{item.classesConducted === 1 ? "" : "es"}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-xs">
                      <p className="font-medium text-gray-800">{item.subject}</p>
                      <p className="text-gray-500">{item.remarks || (item.status === "Pending" ? "Not marked" : "Regular curriculum")}</p>
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(item)}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                      >
                        <Edit2 size={13} />
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!loading && filteredDays.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-500">No attendance records match your filter criteria.</div>
        )}
      </div>

      {/* Leave requests submitted to the administration */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-xs">
        <div className="flex items-center gap-2 border-b border-gray-200 p-4 sm:p-5">
          <FileText size={18} className="text-amber-700" />
          <h3 className="font-bold text-gray-900">My Leave Requests ({leaves.length})</h3>
        </div>
        {leaves.length === 0 ? (
          <p className="p-5 text-sm text-gray-500">You haven't submitted any leave requests yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50/80 text-xs font-bold uppercase text-gray-600">
                <tr>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Duration</th>
                  <th className="px-5 py-3">Days</th>
                  <th className="px-5 py-3">Reason</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Admin Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leaves.map((l) => (
                  <tr key={l.id}>
                    <td className="px-5 py-3 font-semibold text-gray-900">{l.leave_type}</td>
                    <td className="px-5 py-3 text-gray-700">
                      {l.from_date} to {l.to_date}
                    </td>
                    <td className="px-5 py-3 text-gray-700">{l.total_days}</td>
                    <td className="px-5 py-3 text-gray-700">{l.reason}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${
                          l.status === "approved"
                            ? "bg-emerald-100 text-emerald-800"
                            : l.status === "rejected"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {l.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs italic text-gray-600">{l.review_remarks || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Record Modal */}
      {editingDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Day {editingDay.dayNumber} Attendance Record</h3>
                <p className="text-xs text-gray-500">
                  {editingDay.date} ({editingDay.dayOfWeek})
                </p>
              </div>
              <button type="button" onClick={() => setEditingDay(null)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {editingDay.date < summary.todayDate ? (
              <div className="mt-4 space-y-3 text-sm">
                <p>
                  <span className="font-semibold text-gray-700">Status: </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${statusBadgeClass(editingDay.status)}`}>
                    {editingDay.status === "Pending" ? "Not marked" : editingDay.status}
                  </span>
                </p>
                <p className="text-gray-600">{editingDay.remarks || "No remarks."}</p>
                <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50/80 p-3 text-xs text-blue-950">
                  <Info className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
                  Past attendance is locked. Ask the administration to correct this day.
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {editError && (
                  <div className="flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                    <p className="font-medium">{editError}</p>
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-gray-700">Attendance Status</label>
                  <CustomSelect
                    value={editStatus}
                    onChange={(val) => setEditStatus(val as TeacherAttendanceStatus)}
                    options={
                      editingDay.date > summary.todayDate
                        ? [{ value: "Leave", label: "Leave (request in advance)" }]
                        : [
                            { value: "Present", label: "Present" },
                            { value: "Half Day", label: "Half Day" },
                            { value: "Absent", label: "Absent" },
                          ]
                    }
                  />
                </div>

                {editStatus === "Leave" && (
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-gray-700">Leave Category</label>
                    <CustomSelect
                      value={editLeaveType || "Casual"}
                      onChange={(val) => setEditLeaveType(val as TeacherAttendanceDay["leaveType"])}
                      options={[
                        { value: "Casual", label: "Casual Leave" },
                        { value: "Medical", label: "Medical Leave" },
                        { value: "Duty", label: "On-Duty / Conference" },
                      ]}
                    />
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-gray-700">
                    {editStatus === "Leave" ? "Reason for Leave" : "Remarks / Notes"}
                  </label>
                  <input
                    type="text"
                    value={editRemarks}
                    onChange={(e) => setEditRemarks(e.target.value)}
                    placeholder={editStatus === "Leave" ? "Reason for the leave request" : "e.g. Conducted lectures, makeup session"}
                    className="w-full rounded-xl border border-gray-300 p-2.5 text-sm outline-none transition bg-white text-gray-900 focus:border-amber-600 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2.5 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => setEditingDay(null)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                {editingDay.date < summary.todayDate ? "Close" : "Cancel"}
              </button>
              {editingDay.date >= summary.todayDate && (
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="rounded-xl bg-amber-600 px-5 py-2 text-sm font-bold text-white hover:bg-amber-700 cursor-pointer transition active:scale-95 shadow-sm disabled:opacity-60"
                >
                  {saving ? "Saving…" : editStatus === "Leave" ? "Submit Leave Request" : "Save Changes"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {leaveDialogOpen && (
      <AdvanceLeaveDialog
        open
        summary={summary}
        days={days}
        onClose={() => setLeaveDialogOpen(false)}
        onConfirmRequired={setConfirmDialog}
        onSubmitted={(message) => {
          syncFromService();
          showToast(message);
        }}
      />
      )}

      <ConfirmDialog state={confirmDialog} onCancel={() => setConfirmDialog(null)} />
    </div>
  );
}
