export type AttendanceStatus =
  | "Present"
  | "Absent"
  | "Late"
  | "Excused";

export type AttendanceInput = {
  studentId: string;
  rrn: string;
  status: AttendanceStatus;
  time: string;
  remarks: string;
  /** The student's global batch. */
  batchName?: string;
};

export type SaveAttendanceInput = {
  teacherId: string;
  /** Global batches this attendance session covers. */
  batches: string[];
  subject?: string;
  session: string;
  date: string;
  attendance: AttendanceInput[];
};

export type AttendanceAuditRecord = {
  action: "ATTENDANCE_SAVED";
  teacherId: string;
  batches: string[];
  subject: string;
  session: string;
  date: string;
  studentCount: number;
  createdAt: string;
};

export function validateAttendanceInput(
  input: SaveAttendanceInput
) {
  if (input.batches.length === 0) {
    throw new Error("Select at least one batch.");
  }

  // Subject defaults to General if not specified
  input.subject = input.subject || "General";

  if (!input.session) {
    throw new Error("Session is required.");
  }

  if (!input.date) {
    throw new Error("Date is required.");
  }

  if (input.attendance.length === 0) {
    throw new Error("No students found for this class.");
  }
}

export function createAttendanceAuditRecord(
  input: SaveAttendanceInput
): AttendanceAuditRecord {
  return {
    action: "ATTENDANCE_SAVED",
    teacherId: input.teacherId,
    batches: input.batches,
    subject: input.subject || "General",
    session: input.session,
    date: input.date,
    studentCount: input.attendance.length,
    createdAt: new Date().toISOString(),
  };
}

export function broadcastAttendanceUpdate(
  input: SaveAttendanceInput
) {
  if (typeof BroadcastChannel === "undefined") {
    return;
  }

  const channel = new BroadcastChannel(
    `teacher:${input.teacherId}`
  );

  channel.postMessage({
    type: "class_changed",
    batches: input.batches,
  });

  channel.close();
}

import { attendanceService } from "../../services/attendanceService";

export async function saveAttendance(
  input: SaveAttendanceInput
) {
  if (!input.teacherId) {
    throw new Error("Teacher authorization failed.");
  }

  validateAttendanceInput(input);

  const auditRecord =
    createAttendanceAuditRecord(input);

  // Call database-backed attendance service
  const dbResult = await attendanceService.saveAttendance({
    teacherId: input.teacherId,
    batches: input.batches,
    subject: input.subject || "General",
    session: input.session,
    date: input.date,
    attendance: input.attendance.map((a) => ({
      studentId: a.studentId,
      name: a.rrn,
      rrn: a.rrn,
      status: a.status,
      time: a.time,
      remarks: a.remarks,
      batchName: a.batchName,
    })),
  });

  broadcastAttendanceUpdate(input);

  return {
    success: dbResult.success,
    auditRecord,
    error: dbResult.error,
  };
}