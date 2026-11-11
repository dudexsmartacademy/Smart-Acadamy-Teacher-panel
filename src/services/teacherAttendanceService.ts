import { supabase, isSupabaseConfigured } from "../lib/supabase";

export type TeacherAttendanceStatus =
  | "Present"
  | "Absent"
  | "Leave"
  | "Half Day"
  | "Holiday"
  | "Pending"
  | "Rejected";

export type LeaveCategory = "Casual" | "Medical" | "Duty" | "On-Duty" | "None";

export type TeacherAttendanceDay = {
  dayNumber: number; // 1 to 90
  date: string; // YYYY-MM-DD
  dayOfWeek: string;
  status: TeacherAttendanceStatus;
  checkInTime?: string;
  checkOutTime?: string;
  classesConducted: number;
  subject: string;
  remarks?: string;
  leaveType?: LeaveCategory;
  /** Set for the database row backing this day, if any. */
  recordId?: string;
  /** True when the day is covered by a leave request the admin has not decided yet. */
  pendingApproval?: boolean;
  rejectedApproval?: boolean;
  late?: boolean;
};

export type TeacherAttendanceSummary = {
  totalCourseDays: number;
  totalCourseMonths: number;
  currentDayNumber: number;
  todayDate: string;
  todayDayOfWeek: string;
  isSunday: boolean;
  totalClassesAssigned: number;
  daysAttended: number;
  daysLeave: number;
  daysAbsent: number;
  daysRemaining: number;
  attendancePercentage: number;
  courseCompletionPercentage: number;
  casualLeaveAllowance: number;
  casualLeaveUsed: number;
  medicalLeaveAllowance: number;
  medicalLeaveUsed: number;
  todayStatus: TeacherAttendanceStatus | "Holiday";
  todayCheckInTime?: string;
  todayRemarks?: string;
  todayClassesScheduled: number;
  todaySubjects: string;
  courseStartDate: string;
  courseEndDate: string;
};

export type TodayAttendanceRecord = {
  id: string;
  date: string;
  status: string;
  check_in_time: string | null;
  check_out_time: string | null;
  remarks: string | null;
};

export type LeaveRequestRecord = {
  id: string;
  teacher_id: string;
  teacher_name: string;
  department: string | null;
  leave_type: string;
  from_date: string;
  to_date: string;
  total_days: number;
  reason: string;
  status: "pending" | "approved" | "rejected";
  review_remarks?: string | null;
  submitted_at: string;
};

type AttendanceRow = {
  id: string;
  date: string;
  status: string | null;
  check_in_time: string | null;
  check_out_time: string | null;
  remarks: string | null;
};

export const COURSE_DAYS = 90;
const CASUAL_LEAVE_ALLOWANCE = 6;
const MEDICAL_LEAVE_ALLOWANCE = 4;
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const ATTENDANCE_CHANGED_EVENT = "dudex_teacher_attendance_changed";

export function toDateStr(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function getTodayDateStr(): string {
  return toDateStr(new Date());
}

export function isTodaySunday(): boolean {
  return new Date().getDay() === 0;
}

function parseDate(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

function formatCurrentTime(): string {
  return new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}

/** The 90 working days (Mon–Sat) starting at `start`. */
function workingDaysFrom(start: Date): string[] {
  const out: string[] = [];
  const cursor = new Date(start);
  while (out.length < COURSE_DAYS) {
    if (cursor.getDay() !== 0) out.push(toDateStr(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

/**
 * The 90-working-day course window that contains today. It starts on the
 * teacher's first attendance record; once 90 working days have passed, the
 * next window starts on the following working day.
 */
function courseWindow(firstRecordDate: string | null): string[] {
  const today = getTodayDateStr();
  let start = parseDate(firstRecordDate && firstRecordDate <= today ? firstRecordDate : today);
  for (let guard = 0; guard < 50; guard += 1) {
    const window = workingDaysFrom(start);
    if (window[window.length - 1] >= today) return window;
    start = parseDate(window[window.length - 1]);
    start.setDate(start.getDate() + 1);
  }
  return workingDaysFrom(parseDate(today));
}

function leaveCategoryFrom(value: string | null | undefined): LeaveCategory {
  const v = (value || "").toLowerCase();
  if (v.includes("medical") || v.includes("sick")) return "Medical";
  if (v.includes("on-duty") || v.includes("on duty")) return "On-Duty";
  if (v.includes("duty")) return "Duty";
  if (v.includes("casual")) return "Casual";
  return "None";
}

function statusFromRow(status: string | null): { status: TeacherAttendanceStatus; late: boolean } {
  switch ((status || "").toLowerCase()) {
    case "present":
      return { status: "Present", late: false };
    case "late":
      return { status: "Present", late: true };
    case "half_day":
      return { status: "Half Day", late: false };
    case "on_leave":
    case "leave":
      return { status: "Leave", late: false };
    case "absent":
      return { status: "Absent", late: false };
    default:
      return { status: "Pending", late: false };
  }
}

function statusToRow(status: TeacherAttendanceStatus): string {
  switch (status) {
    case "Half Day":
      return "half_day";
    case "Leave":
      return "on_leave";
    case "Absent":
      return "absent";
    default:
      return "present";
  }
}

function emptySummary(): TeacherAttendanceSummary {
  const today = new Date();
  const isSunday = today.getDay() === 0;
  return {
    totalCourseDays: COURSE_DAYS,
    totalCourseMonths: 3,
    currentDayNumber: 1,
    todayDate: getTodayDateStr(),
    todayDayOfWeek: DAY_NAMES[today.getDay()],
    isSunday,
    totalClassesAssigned: 0,
    daysAttended: 0,
    daysLeave: 0,
    daysAbsent: 0,
    daysRemaining: COURSE_DAYS - 1,
    attendancePercentage: 0,
    courseCompletionPercentage: 0,
    casualLeaveAllowance: CASUAL_LEAVE_ALLOWANCE,
    casualLeaveUsed: 0,
    medicalLeaveAllowance: MEDICAL_LEAVE_ALLOWANCE,
    medicalLeaveUsed: 0,
    todayStatus: isSunday ? "Holiday" : "Pending",
    todayClassesScheduled: 0,
    todaySubjects: "",
    courseStartDate: getTodayDateStr(),
    courseEndDate: getTodayDateStr(),
  };
}

let cachedDays: TeacherAttendanceDay[] = [];
let cachedSummary: TeacherAttendanceSummary = emptySummary();
let cachedLeaves: LeaveRequestRecord[] = [];

function notify(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(ATTENDANCE_CHANGED_EVENT));
  }
}

async function currentUser() {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Sign in to manage your attendance.");
  return data.user;
}

function buildSummary(days: TeacherAttendanceDay[], leaves: LeaveRequestRecord[]): TeacherAttendanceSummary {
  const today = getTodayDateStr();
  const sundayToday = isTodaySunday();
  const todayIndex = days.findIndex((d) => d.date >= today);
  const currentDay = todayIndex === -1 ? days[days.length - 1] : days[todayIndex];
  const todayRecord = days.find((d) => d.date === today);
  const currentDayNumber = currentDay ? currentDay.dayNumber : 1;

  // Only decided days count: pending leave requests are not leave yet.
  const recorded = days.filter((d) => d.status !== "Pending" && d.status !== "Rejected" && !d.pendingApproval && !d.rejectedApproval);
  const daysAttended = recorded.filter((d) => d.status === "Present" || d.status === "Half Day").length;
  const daysLeave = recorded.filter((d) => d.status === "Leave").length;
  const daysAbsent = recorded.filter((d) => d.status === "Absent").length;
  const attendancePercentage =
    recorded.length > 0 ? Number(((daysAttended / recorded.length) * 100).toFixed(1)) : 0;

  const approvedDays = (category: LeaveCategory) =>
    leaves
      .filter((l) => l.status === "approved" && leaveCategoryFrom(l.leave_type) === category)
      .reduce((sum, l) => sum + (Number(l.total_days) || 0), 0);

  return {
    totalCourseDays: COURSE_DAYS,
    totalCourseMonths: 3,
    currentDayNumber,
    todayDate: today,
    todayDayOfWeek: DAY_NAMES[new Date().getDay()],
    isSunday: sundayToday,
    totalClassesAssigned: days.reduce((sum, d) => sum + d.classesConducted, 0),
    daysAttended,
    daysLeave,
    daysAbsent,
    daysRemaining: Math.max(COURSE_DAYS - currentDayNumber, 0),
    attendancePercentage,
    courseCompletionPercentage: Number(((currentDayNumber / COURSE_DAYS) * 100).toFixed(1)),
    casualLeaveAllowance: CASUAL_LEAVE_ALLOWANCE,
    casualLeaveUsed: approvedDays("Casual"),
    medicalLeaveAllowance: MEDICAL_LEAVE_ALLOWANCE,
    medicalLeaveUsed: approvedDays("Medical"),
    todayStatus: sundayToday ? "Holiday" : todayRecord ? todayRecord.status : "Pending",
    todayCheckInTime: sundayToday ? undefined : todayRecord?.checkInTime,
    todayRemarks: sundayToday
      ? "Today is Sunday (Institutional Weekend) — No classes scheduled."
      : todayRecord?.remarks,
    todayClassesScheduled: todayRecord?.classesConducted ?? 0,
    todaySubjects: todayRecord?.subject ?? "",
    courseStartDate: days[0]?.date ?? today,
    courseEndDate: days[days.length - 1]?.date ?? today,
  };
}

export const teacherAttendanceService = {
  /** Last loaded course days (call refresh() to load from Supabase). */
  getDays(): TeacherAttendanceDay[] {
    return cachedDays;
  },

  getSummary(): TeacherAttendanceSummary {
    return cachedSummary;
  },

  getLeaveRequests(): LeaveRequestRecord[] {
    return cachedLeaves;
  },

  /** Loads the 90-day course window, its attendance rows, live classes and leave requests. */
  async refresh(): Promise<{ days: TeacherAttendanceDay[]; summary: TeacherAttendanceSummary; error: string | null }> {
    try {
      const user = await currentUser();

      const [firstRes, leaveRes, assignmentRes] = await Promise.all([
        supabase
          .from("teacher_attendance")
          .select("date")
          .eq("teacher_id", user.id)
          .order("date", { ascending: true })
          .limit(1),
        supabase
          .from("teacher_leave_requests")
          .select("*")
          .eq("teacher_id", user.id)
          .order("created_at", { ascending: false }),
        supabase.from("teacher_assignments").select("subject").eq("teacher_id", user.id),
      ]);
      if (firstRes.error) throw new Error(`Could not load your attendance: ${firstRes.error.message}`);

      const firstDate = (firstRes.data?.[0] as { date?: string } | undefined)?.date ?? null;
      const window = courseWindow(firstDate);
      const from = window[0];
      const to = window[window.length - 1];

      const [rowsRes, classesRes] = await Promise.all([
        supabase
          .from("teacher_attendance")
          .select("id, date, status, check_in_time, check_out_time, remarks")
          .eq("teacher_id", user.id)
          .gte("date", from)
          .lte("date", to),
        supabase
          .from("live_classes")
          .select("date, scheduled_date, subject, status")
          .eq("teacher_id", user.id)
          .gte("date", from)
          .lte("date", to),
      ]);
      if (rowsRes.error) throw new Error(`Could not load your attendance: ${rowsRes.error.message}`);

      const leaves = (leaveRes.error ? [] : (leaveRes.data || [])) as LeaveRequestRecord[];
      const rowsByDate = new Map<string, AttendanceRow>();
      ((rowsRes.data || []) as AttendanceRow[]).forEach((r) => rowsByDate.set(r.date, r));

      const classesByDate = new Map<string, string[]>();
      ((classesRes.data || []) as Array<{ date: string | null; scheduled_date: string | null; subject: string | null; status: string | null }>)
        .filter((c) => (c.status || "").toLowerCase() !== "cancelled")
        .forEach((c) => {
          const date = c.scheduled_date || c.date;
          if (!date) return;
          const list = classesByDate.get(date) || [];
          list.push(c.subject || "Class");
          classesByDate.set(date, list);
        });

      const assignedSubjects = Array.from(
        new Set(
          ((assignmentRes.data || []) as Array<{ subject: string | null }>)
            .map((a) => a.subject)
            .filter((s): s is string => Boolean(s)),
        ),
      ).join(", ");

      const days: TeacherAttendanceDay[] = window.map((date, index) => {
        const row = rowsByDate.get(date);
        const classes = classesByDate.get(date) || [];
        const subject = classes.length > 0 ? Array.from(new Set(classes)).join(", ") : assignedSubjects || "—";
        const base: TeacherAttendanceDay = {
          dayNumber: index + 1,
          date,
          dayOfWeek: DAY_NAMES[parseDate(date).getDay()],
          status: "Pending",
          classesConducted: classes.length,
          subject,
          leaveType: "None",
        };

        const coveringApprovedLeave = leaves.find((l) => l.status === "approved" && l.from_date <= date && l.to_date >= date);
        const coveringPendingLeave = leaves.find((l) => l.status === "pending" && l.from_date <= date && l.to_date >= date);
        const coveringRejectedLeave = leaves.find((l) => l.status === "rejected" && l.from_date <= date && l.to_date >= date);

        if (row) {
          const { status, late } = statusFromRow(row.status);
          
          // If the row was leave/on_leave or rejected, but leave was rejected by admin:
          if ((status === "Leave" || (row.status || '').toLowerCase() === 'leave' || (row.status || '').toLowerCase() === 'on_leave') && coveringRejectedLeave && !coveringApprovedLeave) {
            return {
              ...base,
              recordId: row.id,
              status: "Rejected",
              rejectedApproval: true,
              late: false,
              remarks: `Leave request rejected by administration: ${coveringRejectedLeave.review_remarks || coveringRejectedLeave.reason}`,
              leaveType: "None",
              classesConducted: 0,
            };
          }

          return {
            ...base,
            recordId: row.id,
            status,
            late,
            checkInTime: row.check_in_time || undefined,
            checkOutTime: row.check_out_time || undefined,
            remarks: row.remarks || (late ? "Marked late" : undefined),
            leaveType: status === "Leave" ? leaveCategoryFrom(coveringApprovedLeave?.leave_type || row.remarks) : "None",
            classesConducted: status === "Present" || status === "Half Day" ? classes.length : 0,
          };
        }

        if (coveringApprovedLeave) {
          return {
            ...base,
            status: "Leave",
            pendingApproval: false,
            leaveType: leaveCategoryFrom(coveringApprovedLeave.leave_type),
            remarks: `Approved leave: ${coveringApprovedLeave.reason}`,
          };
        }

        if (coveringPendingLeave) {
          return {
            ...base,
            status: "Leave",
            pendingApproval: true,
            leaveType: leaveCategoryFrom(coveringPendingLeave.leave_type),
            remarks: `Leave request pending approval: ${coveringPendingLeave.reason}`,
          };
        }

        if (coveringRejectedLeave && !coveringApprovedLeave) {
          return {
            ...base,
            status: "Rejected",
            rejectedApproval: true,
            leaveType: "None",
            remarks: `Leave request rejected by administration: ${coveringRejectedLeave.review_remarks || coveringRejectedLeave.reason}`,
          };
        }

        return base;
      });

      cachedDays = days;
      cachedLeaves = leaves;
      cachedSummary = buildSummary(days, leaves);
      notify();
      return { days, summary: cachedSummary, error: null };
    } catch (err: unknown) {
      return { days: cachedDays, summary: cachedSummary, error: err instanceof Error ? err.message : "Could not load attendance." };
    }
  },

  async fetchTodayAttendance(): Promise<{ data: TodayAttendanceRecord | null; error: string | null }> {
    try {
      const user = await currentUser();
      const { data, error } = await supabase
        .from("teacher_attendance")
        .select("id, date, status, check_in_time, check_out_time, remarks")
        .eq("teacher_id", user.id)
        .eq("date", getTodayDateStr())
        .maybeSingle();
      if (error) return { data: null, error: error.message };
      return { data: data as TodayAttendanceRecord | null, error: null };
    } catch (err: unknown) {
      return { data: null, error: err instanceof Error ? err.message : "Failed to load attendance" };
    }
  },

  /** Records today's attendance (Present, Half Day or Absent) for the signed-in teacher. */
  async markTodayAttendance(
    status: TeacherAttendanceStatus,
    remarks?: string,
  ): Promise<{ success: boolean; isSunday: boolean; message: string; summary: TeacherAttendanceSummary }> {
    if (isTodaySunday()) {
      return {
        success: false,
        isSunday: true,
        message: "Today is Sunday — There are no classes scheduled for you today and you do not have to mark attendance for today because today is Sunday.",
        summary: cachedSummary,
      };
    }
    if (status === "Leave" || status === "Pending" || status === "Holiday") {
      return {
        success: false,
        isSunday: false,
        message: "Leave must be applied at least one day in advance. Use Apply Leave for upcoming days.",
        summary: cachedSummary,
      };
    }
    try {
      const user = await currentUser();
      const existing = await this.fetchTodayAttendance();
      const working = status === "Present" || status === "Half Day";
      const { error } = await supabase.from("teacher_attendance").upsert(
        {
          teacher_id: user.id,
          teacher_name: user.user_metadata?.full_name || "Faculty Member",
          date: getTodayDateStr(),
          status: statusToRow(status),
          check_in_time: working ? existing.data?.check_in_time || formatCurrentTime() : null,
          check_out_time: working ? existing.data?.check_out_time || null : null,
          remarks: remarks?.trim() || (status === "Present" ? "Self check-in" : status === "Half Day" ? "Half day" : "Absent"),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "teacher_id,date" },
      );
      if (error) throw new Error(error.message);
      const { summary } = await this.refresh();
      return {
        success: true,
        isSunday: false,
        message: status === "Present" ? "Attendance marked as Present." : `Today's attendance updated to ${status}.`,
        summary,
      };
    } catch (err: unknown) {
      return {
        success: false,
        isSunday: false,
        message: `Could not record attendance: ${err instanceof Error ? err.message : "unknown error"}`,
        summary: cachedSummary,
      };
    }
  },

  async checkIn(remarks = "Self check-in"): Promise<{ success: boolean; error?: string }> {
    const res = await this.markTodayAttendance("Present", remarks);
    return res.success ? { success: true } : { success: false, error: res.message };
  },

  async checkOut(remarks?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await currentUser();
      const payload: Record<string, unknown> = { check_out_time: formatCurrentTime(), updated_at: new Date().toISOString() };
      if (remarks) payload.remarks = remarks;
      const { data, error } = await supabase
        .from("teacher_attendance")
        .update(payload)
        .eq("teacher_id", user.id)
        .eq("date", getTodayDateStr())
        .select("id");
      if (error) return { success: false, error: error.message };
      if (!data || data.length === 0) return { success: false, error: "Mark today's attendance before checking out." };
      await this.refresh();
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : "Check-out failed" };
    }
  },

  /** Submits a leave request to the administration. Approved leave appears in attendance. */
  async applyLeaveRange(
    fromDate: string,
    toDate: string,
    reason: string,
    leaveType: "Casual" | "Medical" | "Duty" | "On-Duty" = "Casual",
  ): Promise<{ success: boolean; count: number; error?: string; summary: TeacherAttendanceSummary }> {
    try {
      const user = await currentUser();
      if (toDate < fromDate) throw new Error("To Date cannot be earlier than From Date.");
      let count = 0;
      const cursor = parseDate(fromDate);
      const end = parseDate(toDate);
      while (cursor <= end) {
        if (cursor.getDay() !== 0) count += 1;
        cursor.setDate(cursor.getDate() + 1);
      }

      const { data: profile } = await supabase
        .from("teacher_profiles")
        .select("department")
        .eq("user_id", user.id)
        .maybeSingle();

      const { error } = await supabase.from("teacher_leave_requests").insert({
        teacher_id: user.id,
        teacher_name: user.user_metadata?.full_name || "Faculty Member",
        department: (profile as { department?: string } | null)?.department || "Academics",
        leave_type: leaveType,
        from_date: fromDate,
        to_date: toDate,
        total_days: Math.max(count, 1),
        reason: reason.trim(),
        status: "pending",
      });
      if (error) throw new Error(error.message);
      const { summary } = await this.refresh();
      return { success: true, count, summary };
    } catch (err: unknown) {
      return {
        success: false,
        count: 0,
        error: err instanceof Error ? err.message : "Leave request failed",
        summary: cachedSummary,
      };
    }
  },

  async fetchMyLeaveRequests(): Promise<{ data: LeaveRequestRecord[]; error: string | null }> {
    try {
      const user = await currentUser();
      const { data, error } = await supabase
        .from("teacher_leave_requests")
        .select("*")
        .eq("teacher_id", user.id)
        .order("created_at", { ascending: false });
      if (error) return { data: [], error: error.message };
      return { data: (data || []) as LeaveRequestRecord[], error: null };
    } catch (err: unknown) {
      return { data: [], error: err instanceof Error ? err.message : "Failed to load leave requests" };
    }
  },

  /**
   * Teachers may change only today's record; past days are corrected by the
   * administration and future days are requested as leave.
   */
  async updateDayAttendance(
    day: TeacherAttendanceDay,
    status: TeacherAttendanceStatus,
    remarks?: string,
    leaveType: TeacherAttendanceDay["leaveType"] = "Casual",
  ): Promise<{ success: boolean; message: string }> {
    const today = getTodayDateStr();
    if (day.date < today) {
      return { success: false, message: `Day ${day.dayNumber} is in the past. Ask the administration to correct past attendance.` };
    }
    if (day.date > today) {
      if (status !== "Leave") {
        return { success: false, message: "Upcoming days can only be requested as leave." };
      }
      if (!remarks?.trim()) {
        return { success: false, message: "Add a reason in Remarks to request leave for this day." };
      }
      const category = leaveType && leaveType !== "None" ? leaveType : "Casual";
      const res = await this.applyLeaveRange(day.date, day.date, remarks, category);
      return res.success
        ? { success: true, message: `Leave request submitted for Day ${day.dayNumber} (${day.date}).` }
        : { success: false, message: res.error || "Leave request failed" };
    }
    const res = await this.markTodayAttendance(status, remarks);
    return { success: res.success, message: res.message };
  },
};


if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === "dudex_teacher_leave_updated_at") {
      void teacherAttendanceService.refresh();
    }
  });
  window.addEventListener("dudex_teacher_leave_changed", () => {
    void teacherAttendanceService.refresh();
  });
  try {
    supabase
      .channel("teacher-portal-leave-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "teacher_leave_requests" }, () => {
        void teacherAttendanceService.refresh();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "teacher_attendance" }, () => {
        void teacherAttendanceService.refresh();
      })
      .subscribe();
  } catch (e) {
    console.warn("Could not setup teacher portal attendance realtime channel:", e);
  }
}
