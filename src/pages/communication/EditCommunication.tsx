import { useMemo, useState, useEffect } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Save,
} from "lucide-react";

import { CustomSelect } from "../../components/CustomSelect";
import { useAuth } from "../../context/AuthContext";
import {
  communicationService,
  type CommunicationItem,
} from "../../services/communicationService";

export default function EditCommunication() {
  const { assignments: teacherAssignments } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();

  const [communication, setCommunication] = useState<CommunicationItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadItem() {
      if (!id) return;
      setLoading(true);
      try {
        const item = await communicationService.getCommunicationById(id);
        if (item) {
          setCommunication(item);
          setTitle(item.title);
          setContent(item.content);
          setStatus(item.status);
        }
      } catch (err) {
        console.error("Failed to load communication:", err);
      } finally {
        setLoading(false);
      }
    }
    loadItem();
  }, [id]);

  const isAuthorized = useMemo(() => {
    if (!communication) return false;
    if (teacherAssignments.length === 0) return true;
    if (communication.classId === "all" || communication.className === "All Batches") return true;
    return teacherAssignments.some(
      (item) =>
        item.active &&
        (item.classId === communication.classId ||
          item.className === communication.className ||
          item.subject === communication.subject)
    );
  }, [communication, teacherAssignments]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center p-6">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-900 border-t-transparent" />
      </div>
    );
  }

  if (!communication) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-gray-900">
            Communication Not Found
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            The requested communication could not be found.
          </p>

          <Link
            to="/communication"
            className="mt-5 inline-flex rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Back to Communication
          </Link>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-red-700">
            Access Denied
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            You are not authorized to edit this communication.
          </p>

          <Link
            to="/communication"
            className="mt-5 inline-flex rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Back to Communication
          </Link>
        </div>
      </div>
    );
  }

  if (communication.type === "Teacher Notes") {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-gray-900">
            Editing Not Available
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Teacher Notes cannot be edited from this page.
          </p>

          <Link
            to={`/communication/${communication.id}`}
            className="mt-5 inline-flex rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Back to Details
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");

    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    if (!content.trim()) {
      setError("Content is required.");
      return;
    }

    if (!status) {
      setError("Status is required.");
      return;
    }

    setSaving(true);
    try {
      await communicationService.updateCommunication(communication.id, {
        title: title.trim(),
        content: content.trim(),
        status,
      });

      navigate(`/communication/${communication.id}`);
    } catch (err) {
      console.error("Failed to update communication:", err);
      setError("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          to={`/communication/${communication.id}`}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
        >
          <ArrowLeft size={18} />
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Edit Communication
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Update the selected communication.
          </p>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-gray-200 bg-white shadow-sm"
      >
        {/* Communication Information */}
        <div className="border-b border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Communication Information
          </h2>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {/* Type */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Communication Type
              </label>

              <input
                type="text"
                value={communication.type}
                disabled
                className="w-full rounded-lg border border-gray-300 bg-gray-100 px-3 py-2.5 text-sm text-gray-600"
              />
            </div>

            {/* Class */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Class
              </label>

              <input
                type="text"
                value={communication.className}
                disabled
                className="w-full rounded-lg border border-gray-300 bg-gray-100 px-3 py-2.5 text-sm text-gray-600"
              />
            </div>

            {/* Subject */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Subject
              </label>

              <input
                type="text"
                value={communication.subject}
                disabled
                className="w-full rounded-lg border border-gray-300 bg-gray-100 px-3 py-2.5 text-sm text-gray-600"
              />
            </div>

            {/* Student */}
            {communication.student && (
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Student
                </label>

                <input
                  type="text"
                  value={communication.student}
                  disabled
                  className="w-full rounded-lg border border-gray-300 bg-gray-100 px-3 py-2.5 text-sm text-gray-600"
                />
              </div>
            )}
          </div>
        </div>

        {/* Editable Fields */}
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Edit Details
          </h2>

          <div className="mt-6 space-y-6">
            {/* Title */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Title
              </label>

              <input
                type="text"
                value={title}
                onChange={(event) =>
                  setTitle(event.target.value)
                }
                placeholder="Enter communication title"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-gray-500"
              />
            </div>

            {/* Content */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Content
              </label>

              <textarea
                rows={7}
                value={content}
                onChange={(event) =>
                  setContent(event.target.value)
                }
                placeholder="Enter communication content"
                className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-gray-500"
              />
            </div>

            {/* Status */}
            <div className="max-w-md">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Status
              </label>

              <CustomSelect
                value={status}
                onChange={(val) => setStatus(String(val))}
                options={
                  communication.type === "Announcements"
                    ? ["Published", "Draft", "Archived"]
                    : communication.type === "Support Requests"
                    ? ["Open", "Resolved"]
                    : ["Active", "Closed"]
                }
                placeholder="Select Status"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse gap-3 border-t border-gray-200 p-6 sm:flex-row sm:justify-end">
          <Link
            to={`/communication/${communication.id}`}
            className="rounded-lg border border-gray-300 px-5 py-2.5 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            <Save size={17} />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}