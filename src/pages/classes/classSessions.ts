import { supabase } from "../../lib/supabase";
import type { LiveClassItem } from "../../services/liveClassService";

export type ClassStatus = "Active" | "Scheduled" | "Completed" | "Archived" | "Unknown";

/** A class session the teacher scheduled for one or more batches. */
export type ClassItem = {
  id: string;
  classId: string;
  name: string;
  department: string;
  section: string;
  subject: string;
  batch: string;
  academicYear: string;
  studentsCount: number | null;
  classDate?: string;
  schedule: string;
  meetLink?: string;
  room?: string;
  description: string;
  status: ClassStatus;
};

function sessionStatus(item: LiveClassItem): ClassStatus {
  if (item.status === "live") return "Active";
  if (item.status === "completed") return "Completed";
  if (item.status === "cancelled") return "Archived";
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  if (item.scheduledDate && item.scheduledDate < today) return "Completed";
  if (item.scheduledDate === today) return "Active";
  return "Scheduled";
}

export function toClassItem(item: LiveClassItem, studentCounts: Map<string, number>): ClassItem {
  const start = item.startTime.slice(0, 5);
  const end = item.endTime.slice(0, 5);
  return {
    id: item.id,
    classId: item.classId,
    name: item.title || item.subjectName,
    department: item.className || "",
    section: "",
    subject: item.subjectName,
    batch: item.className || "",
    academicYear: "",
    studentsCount: item.batches.length
      ? item.batches.reduce((sum, b) => sum + (studentCounts.get(b) || 0), 0)
      : item.classId
        ? studentCounts.get(item.classId) ?? 0
        : null,
    classDate: item.scheduledDate,
    schedule: start && end ? `${start} - ${end}` : "",
    meetLink: item.meetingUrl,
    room: item.meetingPlatform || "",
    description: item.topic && item.topic !== item.title ? item.topic : "",
    status: sessionStatus(item),
  };
}

/** Number of registered students in each global batch. */
export async function fetchStudentCounts(): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  const { data } = await supabase.from("student_profiles").select("batch_name");
  ((data || []) as Array<{ batch_name: string | null }>).forEach((r) => {
    if (r.batch_name) counts.set(r.batch_name, (counts.get(r.batch_name) || 0) + 1);
  });
  return counts;
}
