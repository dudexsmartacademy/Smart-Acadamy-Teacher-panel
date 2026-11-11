import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Edit,
  ExternalLink,
  Users,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { liveClassService } from "../../services/liveClassService";

type LiveClass = {
  id: string;
  title: string;
  classId: string;
  className: string;
  subject: string;
  date: string;
  startTime: string;
  endTime: string;
  meetingLink: string;
  status: "Scheduled" | "Live" | "Completed" | "Cancelled" | "Draft" | "Unavailable";
};

export default function LiveClassDetails() {
  const { assignments: teacherAssignments } = useAuth();
  const { id } = useParams();

  const [liveClass, setLiveClass] = useState<LiveClass | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!id) return;
      setLoading(true);
      try {
        const res = await liveClassService.getLiveClassById(id);
        setLoadError(res.error);
        if (res.data) {
          const item = res.data;
          setLiveClass({
            id: item.id,
            title: item.title,
            classId: item.classId,
            className: item.className || "Class name unavailable",
            subject: item.subjectName || "Subject unavailable",
            date: item.scheduledDate,
            startTime: item.startTime,
            endTime: item.endTime,
            meetingLink: item.meetingUrl,
            status:
              item.status === "upcoming"
                ? "Scheduled"
                : item.status === "live"
                ? "Live"
                : item.status === "completed"
                ? "Completed"
                : item.status === "cancelled"
                ? "Cancelled"
                : item.status === "draft"
                ? "Draft"
                : "Unavailable",
          });
        }
      } catch (err) {
        console.error("Failed to load live class:", err);
        setLoadError(err instanceof Error ? err.message : "Failed to load live class.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center p-6">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-900 border-t-transparent" />
      </div>
    );
  }

  if (loadError || !liveClass) {
    return (
      <div className="p-6">
        <Link
          to="/live-classes"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={16} />
          Back to Live Classes
        </Link>

        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-8 text-center">
          <h1 className="text-xl font-semibold text-gray-900">
            Live Class Not Found
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            {loadError || "The requested live class is not available for this account."}
          </p>
        </div>
      </div>
    );
  }

  // The query returns only sessions this teacher may see (row-level security);
  // batch sessions have no class, older ones are checked against assignments.
  const authorized =
    !liveClass.classId ||
    teacherAssignments.some(
      (assignment) => assignment.active && assignment.classId === liveClass.classId
    );

  if (!authorized) {
    return (
      <div className="p-6">
        <Link
          to="/live-classes"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={16} />
          Back to Live Classes
        </Link>

        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <h1 className="text-xl font-semibold text-red-700">
            Access Denied
          </h1>

          <p className="mt-2 text-sm text-red-600">
            You are not authorized to view this live class.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/live-classes"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={16} />
          Back to Live Classes
        </Link>

        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {liveClass.title}
              </h1>

              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  liveClass.status === "Scheduled"
                    ? "bg-blue-100 text-blue-700"
                    : liveClass.status === "Live"
                      ? "bg-green-100 text-green-700"
                      : liveClass.status === "Completed"
                        ? "bg-gray-100 text-gray-700"
                        : "bg-red-100 text-red-700"
                }`}
              >
                {liveClass.status}
              </span>
            </div>

            <p className="mt-1 text-sm text-gray-500">
              {liveClass.className} · {liveClass.subject}
            </p>
          </div>

          {liveClass.status === "Scheduled" && (
            <Link
              to={`/live-classes/${liveClass.id}/edit`}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Edit size={17} />
              Edit Live Class
            </Link>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Live Class Information
            </h2>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <div className="flex items-start gap-3">
                <Calendar
                  size={20}
                  className="mt-0.5 text-gray-500"
                />

                <div>
                  <p className="text-xs text-gray-500">
                    Date
                  </p>

                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {liveClass.date}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock
                  size={20}
                  className="mt-0.5 text-gray-500"
                />

                <div>
                  <p className="text-xs text-gray-500">
                    Time
                  </p>

                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {liveClass.startTime} -{" "}
                    {liveClass.endTime}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Users
                  size={20}
                  className="mt-0.5 text-gray-500"
                />

                <div>
                  <p className="text-xs text-gray-500">
                    Class
                  </p>

                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {liveClass.className}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-500">
                  Subject
                </p>

                <p className="mt-1 text-sm font-medium text-gray-900">
                  {liveClass.subject}
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Meeting */}
        <div>
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Meeting
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Use the meeting link to join the live class.
            </p>

            {liveClass.meetingLink ? (
              <a
                href={liveClass.meetingLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white hover:bg-gray-800"
              >
                <ExternalLink size={17} />
                Open Meeting
              </a>
            ) : (
              <p className="mt-5 text-sm text-gray-500">Meeting link unavailable.</p>
            )}

            <div className="mt-4 rounded-lg bg-gray-50 p-3">
              <p className="break-all text-xs text-gray-600">
                {liveClass.meetingLink}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}