import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { CustomSelect } from "../../components/CustomSelect";
import ResponsiveDatePicker from "../../components/ResponsiveDatePicker";
import { useAuth } from "../../context/AuthContext";
import { announcementService, type AnnouncementItem as Announcement } from "../../services/announcementService";

type AnnouncementPriority = "Low" | "Normal" | "High" | "Urgent";

export default function EditAnnouncement() {
  const { assignments: teacherAssignments } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();

  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState<AnnouncementPriority>("Normal");
  const [publishDate, setPublishDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");

  useEffect(() => {
    async function load() {
      if (!id) return;
      setLoading(true);
      try {
        const res = await announcementService.getAnnouncementById(id);
        if (res.data) {
          setAnnouncement(res.data);
          setTitle(res.data.title);
          setContent(res.data.content);
          setPriority(res.data.priority);
          setPublishDate(res.data.publishDate);
          setExpiryDate(res.data.expiryDate);
        }
      } catch (err) {
        console.error("Failed to load announcement:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const authorized =
    teacherAssignments.length === 0 ||
    announcement?.classId === "all" ||
    announcement?.className === "All Batches" ||
    (announcement
      ? teacherAssignments.some(
          (assignment) =>
            assignment.active &&
            (assignment.classId === announcement.classId ||
              assignment.className === announcement.className ||
              assignment.subject === announcement.subject)
        )
      : false);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!announcement) {
      return;
    }

    if (!authorized) {
      alert(
        "You are not authorized to edit this announcement."
      );
      return;
    }

    if (announcement.status === "Archived") {
      alert(
        "Archived announcement cannot be edited."
      );
      return;
    }

    if (!publishDate) {
      alert("Please select a publish date.");
      return;
    }

    if (expiryDate && expiryDate < publishDate) {
      alert(
        "Expiry date cannot be earlier than the publish date."
      );
      return;
    }

    setSaving(true);
    try {
      await announcementService.updateAnnouncement(announcement.id, {
        title: title.trim(),
        content: content.trim(),
        priority,
        publishDate,
        expiryDate,
      });

      navigate(`/announcements/${announcement.id}`);
    } catch (err) {
      console.error("Failed to update announcement:", err);
      alert("Failed to update announcement. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center p-6">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-900 border-t-transparent" />
      </div>
    );
  }

  if (!announcement) {
    return (
      <div className="w-full min-w-0 p-4 sm:p-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center sm:p-8">
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

  if (!authorized) {
    return (
      <div className="w-full min-w-0 p-4 sm:p-6">
        <div className="rounded-xl border border-red-200 bg-white p-6 text-center sm:p-8">
          <h1 className="text-xl font-semibold text-red-700">
            Access Denied
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            You are not authorized to edit this announcement.
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

  if (announcement.status === "Archived") {
    return (
      <div className="w-full min-w-0 p-4 sm:p-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center sm:p-8">
          <h1 className="text-xl font-semibold text-gray-900">
            Announcement Archived
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Archived announcements cannot be edited.
          </p>

          <Link
            to={`/announcements/${announcement.id}`}
            className="mt-5 inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
          >
            <ArrowLeft size={16} />
            Back to Announcement
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 max-w-full p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          to={`/announcements/${announcement.id}`}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={16} />
          Back to Announcement
        </Link>

        <h1 className="mt-4 text-xl font-bold text-gray-900 sm:text-2xl">
          Edit Announcement
        </h1>

        <p className="mt-1 text-xs text-gray-500 sm:text-sm">
          Update the announcement details.
        </p>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="w-full min-w-0 max-w-4xl rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6"
      >
        <div className="grid min-w-0 gap-5 md:grid-cols-2">
          {/* Title */}
          <div className="min-w-0 md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Title
            </label>

            <input
              type="text"
              value={title}
              onChange={(event) =>
                setTitle(event.target.value)
              }
              required
              className="w-full min-w-0 rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-gray-500"
            />
          </div>

          {/* Batch */}
          <div className="min-w-0">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Batch
            </label>

            <input
              type="text"
              value={announcement.className}
              disabled
              className="w-full min-w-0 rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-gray-600"
            />

            <p className="mt-1 text-xs text-gray-500">
              Batch assignment cannot be changed.
            </p>
          </div>

          {/* Subject */}
          <div className="min-w-0">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Subject
            </label>

            <input
              type="text"
              value={announcement.subject}
              disabled
              className="w-full min-w-0 rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-gray-600"
            />

            <p className="mt-1 text-xs text-gray-500">
              Subject assignment cannot be changed.
            </p>
          </div>

          {/* Priority */}
          <div className="min-w-0">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Priority
            </label>

            <CustomSelect
              value={priority}
              onChange={(value) =>
                setPriority(value as AnnouncementPriority)
              }
              options={[
                { value: "Low", label: "Low" },
                { value: "Normal", label: "Normal" },
                { value: "High", label: "High" },
              ]}
              placeholder="Select Priority"
            />
          </div>

          {/* Publish Date */}
          <div className="min-w-0">
            <ResponsiveDatePicker
              label="Publish Date"
              value={publishDate}
              onChange={(value) => {
                setPublishDate(value);

                if (expiryDate && expiryDate < value) {
                  setExpiryDate("");
                }
              }}
              required
            />
          </div>

          {/* Expiry Date */}
          <div className="min-w-0">
            <ResponsiveDatePicker
              label="Expiry Date"
              value={expiryDate}
              onChange={setExpiryDate}
              minDate={publishDate || undefined}
            />
          </div>

          {/* Content */}
          <div className="min-w-0 md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Content
            </label>

            <textarea
              value={content}
              onChange={(event) =>
                setContent(event.target.value)
              }
              rows={7}
              required
              className="w-full min-w-0 resize-none rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-gray-500"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-gray-200 pt-5">
          <Link
            to={`/announcements/${announcement.id}`}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}