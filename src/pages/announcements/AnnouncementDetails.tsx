import { useState, useEffect } from "react";
import { ArrowLeft, Calendar, Edit } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { announcementService, type AnnouncementItem as Announcement } from "../../services/announcementService";

export default function AnnouncementDetails() {
  const { assignments: teacherAssignments } = useAuth();
  const { id } = useParams();

  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!id) return;
      setLoading(true);
      try {
        const res = await announcementService.getAnnouncementById(id);
        if (res.data) {
          setAnnouncement(res.data);
        }
      } catch (err) {
        console.error("Failed to load announcement:", err);
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

  if (!announcement) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <h1 className="text-xl font-semibold text-gray-900">
            Announcement Not Found
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            The requested announcement does not exist.
          </p>

          <Link
            to="/announcements"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white"
          >
            <ArrowLeft size={16} />
            Back to Announcements
          </Link>
        </div>
      </div>
    );
  }

  const authorized =
    teacherAssignments.length === 0 ||
    announcement.classId === "all" ||
    announcement.className === "All Batches" ||
    teacherAssignments.some(
      (assignment) =>
        assignment.active &&
        (assignment.classId === announcement.classId ||
          assignment.className === announcement.className ||
          assignment.subject === announcement.subject)
    );

  if (!authorized) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-white p-8 text-center">
          <h1 className="text-xl font-semibold text-red-700">
            Access Denied
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            You are not authorized to view this announcement.
          </p>

          <Link
            to="/announcements"
            className="mt-5 inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
          >
            <ArrowLeft size={16} />
            Back to Announcements
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <Link
            to="/announcements"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={16} />
            Back to Announcements
          </Link>

          <h1 className="mt-4 text-2xl font-bold text-gray-900">
            {announcement.title}
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Announcement Details
          </p>
        </div>

        {announcement.status !== "Archived" && (
          <Link
            to={`/announcements/${announcement.id}/edit`}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            <Edit size={16} />
            Edit Announcement
          </Link>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Announcement Content */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {announcement.title}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {announcement.className} •{" "}
                  {announcement.subject}
                </p>
              </div>

              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                  announcement.priority === "High"
                    ? "bg-red-100 text-red-700"
                    : announcement.priority ===
                      "Normal"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {announcement.priority} Priority
              </span>
            </div>

            <div className="mt-6 border-t border-gray-200 pt-6">
              <p className="whitespace-pre-wrap text-sm leading-7 text-gray-700">
                {announcement.content}
              </p>
            </div>
          </div>
        </div>

        {/* Information */}
        <div>
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Announcement Information
            </h2>

            <div className="mt-5 space-y-5">
              <div>
                <p className="text-xs font-medium uppercase text-gray-500">
                  Batch
                </p>

                <p className="mt-1 text-sm text-gray-900">
                  {announcement.className}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase text-gray-500">
                  Subject
                </p>

                <p className="mt-1 text-sm text-gray-900">
                  {announcement.subject}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase text-gray-500">
                  Priority
                </p>

                <p className="mt-1 text-sm text-gray-900">
                  {announcement.priority}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase text-gray-500">
                  Status
                </p>

                <span
                  className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                    announcement.status ===
                    "Published"
                      ? "bg-green-100 text-green-700"
                      : announcement.status ===
                        "Draft"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {announcement.status}
                </span>
              </div>

              <div className="border-t border-gray-200 pt-5">
                <p className="text-xs font-medium uppercase text-gray-500">
                  Publish Date
                </p>

                <div className="mt-1 flex items-center gap-2 text-sm text-gray-900">
                  <Calendar size={15} />
                  {announcement.publishDate}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium uppercase text-gray-500">
                  Expiry Date
                </p>

                <div className="mt-1 flex items-center gap-2 text-sm text-gray-900">
                  <Calendar size={15} />
                  {announcement.expiryDate ||
                    "No expiry date"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}