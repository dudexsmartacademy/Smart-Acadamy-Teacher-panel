import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { classService } from "./classService";

export type LiveClassStatus =
  | "upcoming"
  | "live"
  | "completed"
  | "cancelled"
  | "draft"
  | "unknown";

export interface LiveClassItem {
  id: string;
  title: string;
  classId: string;
  className: string | null;
  subjectName: string;
  meetingUrl: string;
  meetingPlatform: string | null;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  status: LiveClassStatus;
  teacherId: string;
  topic: string;
  /** Global batch names whose students see the session. */
  batches: string[];
}

function normalizeStatus(status: string | null): LiveClassStatus {
  switch (status?.trim().toLowerCase()) {
    case "upcoming":
    case "scheduled":
      return "upcoming";
    case "live":
    case "live now":
      return "live";
    case "completed":
      return "completed";
    case "cancelled":
    case "canceled":
      return "cancelled";
    case "draft":
      return "draft";
    default:
      return "unknown";
  }
}

function platformFromUrl(value: string): string {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    if (hostname.includes("meet.google")) return "Google Meet";
    if (hostname.includes("zoom")) return "Zoom";
    if (hostname.includes("teams.microsoft")) return "Microsoft Teams";
    return "Unknown";
  } catch {
    return "Unknown";
  }
}

// Map a live_classes row (DDL columns) to LiveClassItem
function mapLiveClass(
  row: Record<string, unknown>,
  classNames: Map<string, string>
): LiveClassItem {
  const classId = (row.class_id as string) || "";
  return {
    id: row.id as string,
    title: (row.title as string) || (row.topic as string) || "",
    classId,
    className:
      Array.isArray(row.batches) && (row.batches as string[]).length
        ? (row.batches as string[]).join(", ")
        : classId
          ? classNames.get(classId) || "All Students"
          : "All Students",
    subjectName: (row.subject as string) || (row.topic as string) || "",
    meetingUrl: (row.meeting_url as string) || "",
    meetingPlatform: (row.platform as string) || (row.meeting_platform as string) || "Google Meet",
    scheduledDate: (row.scheduled_date as string) || (row.date as string) || "",
    startTime: (row.start_time as string) || "",
    endTime: (row.end_time as string) || "",
    status: normalizeStatus(row.status as string | null),
    teacherId: (row.teacher_id as string) || "",
    topic: (row.topic as string) || "",
    batches: Array.isArray(row.batches) ? (row.batches as string[]) : [],
  };
}

async function fetchClassNames(): Promise<{
  data: Map<string, string>;
  error: string | null;
}> {
  const result = await classService.getClasses();
  if (result.error) return { data: new Map(), error: result.error };
  return {
    data: new Map(result.data.map((item) => [item.id, item.name])),
    error: null,
  };
}

async function getCurrentTeacher(): Promise<{
  id: string;
  fullName: string;
  error: string | null;
}> {
  if (!isSupabaseConfigured) {
    return { id: "", fullName: "", error: "Database connection is not configured." };
  }

  const { data: authResult, error: authError } = await supabase.auth.getUser();
  if (authError) return { id: "", fullName: "", error: authError.message };
  if (!authResult.user) {
    return { id: "", fullName: "", error: "Sign in before managing live classes." };
  }

  // Get full_name from profiles. Note: live_classes.teacher_id FK points to profiles(id)
  const { data: profile } = await (supabase
    .from("profiles")
    .select("full_name")
    .eq("id", authResult.user.id)
    .maybeSingle() as unknown as Promise<{
    data: { full_name: string } | null;
    error: Error | null;
  }>);

  return {
    id: authResult.user.id,
    fullName: profile?.full_name || authResult.user.user_metadata?.full_name || "Faculty Member",
    error: null,
  };
}

export const liveClassService = {
  async getLiveClasses(): Promise<{
    data: LiveClassItem[];
    error: string | null;
  }> {
    if (!isSupabaseConfigured) {
      return { data: [], error: "Database connection is not configured." };
    }

    const [{ data, error }, classResult] = await Promise.all([
      supabase
        .from("live_classes")
        .select("*")
        .order("scheduled_date", { ascending: false }) as unknown as Promise<{
        data: Array<Record<string, unknown>> | null;
        error: Error | null;
      }>,
      fetchClassNames(),
    ]);

    if (error) return { data: [], error: error.message };
    if (classResult.error) return { data: [], error: classResult.error };

    return {
      data: (data || []).map((row) => mapLiveClass(row, classResult.data)),
      error: null,
    };
  },

  async getLiveClassById(
    id: string
  ): Promise<{ data: LiveClassItem | null; error: string | null }> {
    if (!isSupabaseConfigured) {
      return { data: null, error: "Database connection is not configured." };
    }

    const [{ data, error }, classResult] = await Promise.all([
      supabase
        .from("live_classes")
        .select("*")
        .eq("id", id)
        .maybeSingle() as unknown as Promise<{
        data: Record<string, unknown> | null;
        error: Error | null;
      }>,
      fetchClassNames(),
    ]);

    if (error) return { data: null, error: error.message };
    if (classResult.error) return { data: null, error: classResult.error };
    if (!data) return { data: null, error: null };

    return { data: mapLiveClass(data, classResult.data), error: null };
  },

  async updateLiveClass(
    id: string,
    updates: Partial<
      Pick<
        LiveClassItem,
        "title" | "subjectName" | "meetingUrl" | "scheduledDate" | "startTime" | "endTime"
      >
    >
  ): Promise<{ success: boolean; error: string | null }> {
    const teacher = await getCurrentTeacher();
    if (teacher.error) return { success: false, error: teacher.error };

    const dbUpdates: Record<string, unknown> = {};
    if (updates.title !== undefined) {
      dbUpdates.title = updates.title;
      dbUpdates.topic = updates.title;
    }
    if (updates.subjectName !== undefined) dbUpdates.subject = updates.subjectName;
    if (updates.meetingUrl !== undefined) {
      dbUpdates.meeting_url = updates.meetingUrl;
      dbUpdates.platform = platformFromUrl(updates.meetingUrl);
    }
    if (updates.scheduledDate !== undefined) {
      dbUpdates.scheduled_date = updates.scheduledDate;
      dbUpdates.date = updates.scheduledDate;
    }
    if (updates.startTime !== undefined) dbUpdates.start_time = updates.startTime;
    if (updates.endTime !== undefined) dbUpdates.end_time = updates.endTime;

    if (Object.keys(dbUpdates).length === 0) {
      return { success: false, error: "No live-class fields were provided to update." };
    }

    const { data, error } = await (supabase
      .from("live_classes")
      .update(dbUpdates)
      .eq("id", id)
      .eq("teacher_id", teacher.id)
      .select("id")
      .maybeSingle() as unknown as Promise<{
      data: { id: string } | null;
      error: Error | null;
    }>);

    if (error) return { success: false, error: error.message };
    if (!data) return { success: false, error: "Live class not found or update not permitted." };
    return { success: true, error: null };
  },

  /** Schedules one class session for the selected batches. */
  async scheduleForBatches(input: {
    batches: string[];
    title: string;
    subject: string;
    description: string;
    meetingUrl: string;
    scheduledDate: string;
    startTime: string;
    endTime: string;
  }): Promise<{ created: number; error: string | null }> {
    const teacher = await getCurrentTeacher();
    if (teacher.error) return { created: 0, error: teacher.error };
    if (input.batches.length === 0) return { created: 0, error: "Select at least one batch." };

    const meetingUrl = input.meetingUrl.trim();
    const subject = input.subject.trim() || "General";
    const { data, error } = await (supabase
      .from("live_classes")
      .insert({
        class_id: null,
        batches: input.batches,
        teacher_id: teacher.id,
        teacher_name: teacher.fullName,
        teacher_title: "Faculty",
        title: input.title.trim(),
        topic: input.description.trim() || input.title.trim() || subject,
        subject,
        date: input.scheduledDate,
        scheduled_date: input.scheduledDate,
        start_time: input.startTime,
        end_time: input.endTime,
        platform: platformFromUrl(meetingUrl),
        meeting_url: meetingUrl,
        status: "Upcoming",
        mode: "Online",
        is_hero: false,
      })
      .select("id") as unknown as Promise<{ data: Array<{ id: string }> | null; error: Error | null }>);
    if (error) return { created: 0, error: error.message };
    return { created: data?.length || 0, error: null };
  },

  /** Updates a class session's details, including its description (topic). */
  async updateClassSession(
    id: string,
    input: {
      batches: string[];
      title: string;
      subject: string;
      description: string;
      meetingUrl: string;
      scheduledDate: string;
      startTime: string;
      endTime: string;
    },
  ): Promise<{ success: boolean; error: string | null }> {
    const teacher = await getCurrentTeacher();
    if (teacher.error) return { success: false, error: teacher.error };
    const meetingUrl = input.meetingUrl.trim();
    const { data, error } = await (supabase
      .from("live_classes")
      .update({
        batches: input.batches,
        title: input.title.trim(),
        topic: input.description.trim() || input.title.trim(),
        subject: input.subject.trim() || "General",
        meeting_url: meetingUrl,
        platform: platformFromUrl(meetingUrl),
        date: input.scheduledDate,
        scheduled_date: input.scheduledDate,
        start_time: input.startTime,
        end_time: input.endTime,
      })
      .eq("id", id)
      .eq("teacher_id", teacher.id)
      .select("id") as unknown as Promise<{ data: Array<{ id: string }> | null; error: Error | null }>);
    if (error) return { success: false, error: error.message };
    if (!data || data.length === 0) return { success: false, error: "Class not found or update not permitted." };
    return { success: true, error: null };
  },

  /** The signed-in teacher's own class sessions. */
  async getMyClassSessions(): Promise<{ data: LiveClassItem[]; teacherId: string; error: string | null }> {
    const teacher = await getCurrentTeacher();
    if (teacher.error) return { data: [], teacherId: "", error: teacher.error };
    const result = await this.getLiveClasses();
    return { data: result.data.filter((c) => c.teacherId === teacher.id), teacherId: teacher.id, error: result.error };
  },

  /** Deletes one of the signed-in teacher's own live classes. */
  async deleteLiveClass(id: string): Promise<{ success: boolean; error: string | null }> {
    const teacher = await getCurrentTeacher();
    if (teacher.error) return { success: false, error: teacher.error };

    const { data, error } = await (supabase
      .from("live_classes")
      .delete()
      .eq("id", id)
      .eq("teacher_id", teacher.id)
      .select("id") as unknown as Promise<{
      data: Array<{ id: string }> | null;
      error: Error | null;
    }>);

    if (error) return { success: false, error: error.message };
    if (!data || data.length === 0) return { success: false, error: "Live class not found or delete not permitted." };
    return { success: true, error: null };
  },
};
