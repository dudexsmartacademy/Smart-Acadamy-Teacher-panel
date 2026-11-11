import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Clock } from "lucide-react";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";
import { liveClassService } from "../../services/liveClassService";
import { teacherService } from "../../services/teacherService";

interface PendingSessionItem {
  id: string;
  classId?: string;
  subject: string;
  className: string;
  time: string;
}

export default function PendingAttendance() {
  const [sessions, setSessions] = useState<PendingSessionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    const todayDate = new Date().toISOString().split("T")[0];

    async function fetchPendingSessions() {
      try {
        // 1. Fetch today's live classes and teacher assignments in parallel
        const [{ data: liveClasses }, { data: assignments }] = await Promise.all([
          liveClassService.getLiveClasses(),
          teacherService.getAssignments(),
        ]);

        const assignedMap = new Map((assignments || []).map((a) => [a.classId, a.className]));

        // Gather all sessions scheduled for today
        const candidates: Array<{
          id: string;
          classId: string;
          className: string;
          subject: string;
          time: string;
        }> = [];

        (liveClasses || [])
          .filter((lc) => lc.scheduledDate === todayDate)
          .forEach((lc) => {
            const classId = lc.classId || "all";
            const className = lc.className || assignedMap.get(lc.classId) || "All Students (College)";
            const timeStr = lc.startTime && lc.endTime ? `${lc.startTime} - ${lc.endTime}` : lc.startTime || "Scheduled";
            candidates.push({
              id: lc.id,
              classId,
              className,
              subject: lc.subjectName || lc.title || "Lecture",
              time: timeStr,
            });
          });

        // If no live classes scheduled today, check if assigned classes have attendance recorded today
        if (candidates.length === 0 && assignments && assignments.length > 0) {
          assignments.forEach((a) => {
            candidates.push({
              id: a.classId,
              classId: a.classId,
              className: a.className,
              subject: a.subject || "Academic Class",
              time: "Today",
            });
          });
        }

        if (candidates.length === 0) {
          setSessions([]);
          setLoading(false);
          return;
        }

        // 2. Check if attendance has already been recorded for these classes today
        const classIdsToCheck = Array.from(new Set(candidates.map((c) => c.classId).filter((id) => id && id !== "all")));

        let recordedClassIds = new Set<string>();
        if (classIdsToCheck.length > 0) {
          const { data: records } = await supabase
            .from("attendance_records")
            .select("class_id")
            .eq("date", todayDate)
            .in("class_id", classIdsToCheck);

          recordedClassIds = new Set((records || []).map((r: any) => r.class_id));
        }

        // Filter candidates that haven't recorded attendance today
        const pending = candidates.filter((c) => !recordedClassIds.has(c.classId));

        setSessions(pending);
      } catch (err) {
        console.error("Failed to load pending attendance:", err);
        setSessions([]);
      } finally {
        setLoading(false);
      }
    }

    void fetchPendingSessions();
  }, []);

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900">
          Pending Attendance
        </h3>
        {!loading && (
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              sessions.length > 0
                ? "bg-amber-100 text-amber-800"
                : "bg-green-100 text-green-800"
            }`}
          >
            {sessions.length > 0 ? `${sessions.length} Pending` : "Complete"}
          </span>
        )}
      </div>

      <div className="divide-y divide-gray-100">
        {loading ? (
          <div className="p-5 text-center text-xs text-gray-500">Checking attendance status...</div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-50 text-green-600 mb-2">
              <CheckCircle2 size={18} />
            </div>
            <p className="text-xs font-semibold text-gray-800">All Attendance Up To Date</p>
            <p className="text-[11px] text-gray-500 mt-0.5">No pending sessions for today.</p>
          </div>
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              className="flex items-center justify-between p-4 transition-colors hover:bg-gray-50/70"
            >
              <div className="min-w-0 flex-1 pr-3">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {session.subject}
                </p>

                <p className="mt-0.5 text-xs text-gray-500 truncate">
                  {session.className}
                </p>

                <div className="mt-1 flex items-center gap-1 text-[11px] text-gray-400">
                  <Clock size={11} />
                  <span>{session.time}</span>
                </div>
              </div>

              <Link
                to="/attendance"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-gray-800"
              >
                Mark Attendance
                <ArrowRight size={13} />
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
