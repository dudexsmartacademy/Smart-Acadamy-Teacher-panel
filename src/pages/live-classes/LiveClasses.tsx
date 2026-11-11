import { Calendar, Clock, Edit, Eye, Link as LinkIcon, Plus, Trash2, Video } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { liveClassService } from "../../services/liveClassService";
import type { LiveClassItem } from "../../services/liveClassService";

function formatStatus(status: LiveClassItem["status"]): string {
  switch (status) {
    case "upcoming":
      return "Upcoming";
    case "live":
      return "Live Now";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    case "draft":
      return "Draft";
    default:
      return "Status unavailable";
  }
}

export default function LiveClasses() {
  const [liveClasses, setLiveClasses] = useState<LiveClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (item: LiveClassItem) => {
    if (!window.confirm(`Delete the live class "${item.title}"? Students will no longer see it.`)) return;
    setActionError(null);
    setDeletingId(item.id);
    const result = await liveClassService.deleteLiveClass(item.id);
    setDeletingId(null);
    if (!result.success) {
      setActionError(result.error || "Could not delete the live class.");
      return;
    }
    setLiveClasses((current) => current.filter((c) => c.id !== item.id));
  };

  useEffect(() => {
    async function load() {
      try {
        const result = await liveClassService.getMyClassSessions();
        setError(result.error);
        setLiveClasses(result.data);
      } catch (error) {
        setLiveClasses([]);
        setError(error instanceof Error ? error.message : "Failed to load live classes.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  // The query returns only this teacher's sessions (row-level security).
  const assignedClasses = liveClasses;

  return (
    <div className="p-4 sm:p-6">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Live Classes</h1>
          <p className="mt-1 text-sm text-gray-500">
            Scheduled sessions for your batches.
          </p>
        </div>
        <Link
          to="/live-classes/create"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus size={18} />
          Create Live Class
        </Link>
      </header>

      {error && (
        <p role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Could not load live classes: {error}
        </p>
      )}
      {loading && <p className="py-10 text-center text-sm text-gray-500">Loading live classes…</p>}


      {!loading && !error && assignedClasses.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-600">
          <p className="font-medium text-gray-800 mb-1">No live classes scheduled yet.</p>
          <p className="text-gray-500">Click 'Create Live Class' to schedule a session for your assigned cohorts.</p>
        </div>
      )}

      {actionError && (
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {!loading && !error && assignedClasses.length > 0 && (
        <div className="grid gap-5 lg:grid-cols-2">
          {assignedClasses.map((item) => (
            <article key={item.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-blue-50 p-2.5 text-blue-600">
                    <Video size={21} />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900">
                      {item.title || "Title unavailable"}
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      {item.subjectName || "Subject unavailable"} · {item.className || "Class name unavailable"}
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                  {formatStatus(item.status)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Calendar size={16} />
                  {item.scheduledDate || "Date unavailable"}
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={16} />
                  {item.startTime && item.endTime
                    ? `${item.startTime} - ${item.endTime}`
                    : "Time unavailable"}
                </div>
                <div className="flex items-center gap-2">
                  <LinkIcon size={16} />
                  {item.meetingUrl ? "Meeting link available" : "Meeting link unavailable"}
                </div>
                {item.meetingPlatform && (
                  <div className="flex items-center gap-2">
                    <Video size={16} />
                    {item.meetingPlatform}
                  </div>
                )}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  to={`/live-classes/${item.id}`}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Eye size={16} />
                  View
                </Link>
                {item.status === "upcoming" && (
                  <Link
                    to={`/live-classes/${item.id}/edit`}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <Edit size={16} />
                    Edit
                  </Link>
                )}
                {item.meetingUrl && (
                  <a
                    href={item.meetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    <Video size={16} />
                    Join
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(item)}
                  disabled={deletingId === item.id}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 size={16} />
                  {deletingId === item.id ? "Deleting…" : "Delete"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
