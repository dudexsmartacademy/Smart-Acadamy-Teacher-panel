import { useState } from "react";
import type { FormEvent } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import CustomSelect from "../../components/CustomSelect";
import ResponsiveDatePicker from "../../components/ResponsiveDatePicker";
import MultiSelectChecklist from "../../components/MultiSelectChecklist";
import { useBatchOptions } from "../../hooks/useBatchOptions";
import { announcementService } from "../../services/announcementService";

type AnnouncementPriority = "Low" | "Normal" | "High" | "Urgent";

export default function CreateAnnouncement() {
  const { options: batchOptions, loading: batchesLoading } = useBatchOptions();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [batches, setBatches] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [subject, setSubject] = useState("");
  const [priority, setPriority] =
    useState<AnnouncementPriority>("Normal");
  const [publishDate, setPublishDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [expiryDate, setExpiryDate] = useState("");
  const [notifyAdmin, setNotifyAdmin] = useState(true);

  const subjects = [
    "General",
    "Data Structures",
    "Python Programming",
    "Database Management Systems",
    "Computer Networks",
    "Full Stack Development",
    "Machine Learning",
    "Aptitude & Soft Skills",
  ];

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (batches.length === 0) {
      alert("Select at least one batch.");
      return;
    }

    if (!publishDate) {
      alert("Please select a publish date.");
      return;
    }

    if (expiryDate && expiryDate < publishDate) {
      alert("Expiry date cannot be earlier than the publish date.");
      return;
    }

    setSaving(true);
    const res = await announcementService.createAnnouncement({
      title,
      content,
      priority,
      publishDate,
      expiryDate,
      classId: "all",
      className: batches.join(", "),
      batches,
      subject: subject || "General",
      status: "Published" as const,
      notifyAdmin,
    });
    setSaving(false);
    if (res.error) {
      alert(`Could not publish the announcement: ${res.error}`);
      return;
    }
    navigate("/announcements");
  };

  return (
    <div className="w-full min-w-0 max-w-full p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/announcements"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={16} />
          Back to Announcements
        </Link>

        <h1 className="mt-4 text-xl font-bold text-gray-900 sm:text-2xl">
          Create Announcement
        </h1>

        <p className="mt-1 text-xs text-gray-500 sm:text-sm">
          Create an announcement for one or more batches.
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
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Enter announcement title"
              required
              className="w-full min-w-0 rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-gray-500"
            />
          </div>

          {/* Batch */}
          <div className="min-w-0">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Batch
            </label>

            <MultiSelectChecklist
              values={batches}
              onChange={setBatches}
              options={batchOptions}
              placeholder={batchesLoading ? "Loading batches…" : "Select Batches"}
              allLabel="All Batches"
              disabled={batchesLoading}
            />
          </div>

          {/* Subject */}
          <div className="min-w-0">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Subject
            </label>

            <CustomSelect
              value={subject}
              onChange={setSubject}
              placeholder="Select Subject"
              options={subjects.map((item) => ({
                value: item,
                label: item,
              }))}
            />
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
              onChange={(event) => setContent(event.target.value)}
              placeholder="Enter announcement content"
              rows={6}
              required
              className="w-full min-w-0 resize-none rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-gray-500"
            />
          </div>

          {/* Notify Admin Option */}
          <div className="min-w-0 md:col-span-2">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-200">
              <input
                type="checkbox"
                checked={notifyAdmin}
                onChange={(e) => setNotifyAdmin(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
              />
              <span className="font-medium text-gray-800">Also notify Admin &amp; send announcement to Admin Panel</span>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-gray-200 pt-5">
          <Link
            to="/announcements"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
          >
            {saving ? "Publishing…" : "Publish Announcement"}
          </button>
        </div>
      </form>
    </div>
  );
}