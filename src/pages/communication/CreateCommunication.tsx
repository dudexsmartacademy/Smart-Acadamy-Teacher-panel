import { useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowLeft,
  LifeBuoy,
  Megaphone,
  MessageCircle,
  StickyNote,
} from "lucide-react";
import {
  Link,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { CustomSelect } from "../../components/CustomSelect";
import MultiSelectChecklist from "../../components/MultiSelectChecklist";
import { useBatchOptions } from "../../hooks/useBatchOptions";
import { communicationService } from "../../services/communicationService";

type CommunicationType =
  | "Announcements"
  | "Support Requests"
  | "Class Discussion"
  | "Teacher Notes";

type Priority = "Low" | "Normal" | "High";

const communicationTypes: CommunicationType[] = [
  "Announcements",
  "Support Requests",
  "Class Discussion",
  "Teacher Notes",
];

export default function CreateCommunication() {
  const { options: batchOptions, loading: batchesLoading } = useBatchOptions();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const requestedType =
    searchParams.get("type") as CommunicationType | null;

  const initialType = communicationTypes.includes(
    requestedType as CommunicationType
  )
    ? (requestedType as CommunicationType)
    : "Announcements";

  const [type, setType] =
    useState<CommunicationType>(initialType);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [batches, setBatches] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [student, setStudent] = useState("");
  const [priority, setPriority] =
    useState<Priority>("Normal");
  const [submitting, setSubmitting] = useState(false);

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

  const handleTypeChange = (
    value: CommunicationType
  ) => {
    setType(value);
    setTitle("");
    setContent("");
    setStudent("");
    setPriority("Normal");
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (batches.length === 0) {
      alert("Select at least one batch.");
      return;
    }

    setSubmitting(true);
    try {
      await communicationService.createCommunication({
        type,
        title: title.trim(),
        content: content.trim(),
        className: batches.join(", "),
        classId: "all",
        batches,
        subject: subject || "General",
        student: type === "Support Requests" ? student : undefined,
        priority: type === "Announcements" ? priority : undefined,
        date: new Date().toISOString().split("T")[0],
        status:
          type === "Announcements"
            ? "Published"
            : type === "Support Requests"
              ? "Open"
              : type === "Class Discussion"
                ? "Active"
                : "Private",
      });

      navigate("/communication");
    } catch (err) {
      console.error("Failed to create communication:", err);
      alert(`Failed to save communication: ${err instanceof Error ? err.message : "please try again."}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/communication"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={16} />
          Back to Student Communication
        </Link>

        <h1 className="mt-4 text-2xl font-bold text-gray-900">
          Create Communication
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Create controlled communication for an authorized class.
        </p>
      </div>

      {/* Communication Type */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-gray-900">
          Communication Type
        </h2>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {communicationTypes.map(
            (communicationType) => {
              const Icon =
                communicationType === "Announcements"
                  ? Megaphone
                  : communicationType ===
                    "Support Requests"
                    ? LifeBuoy
                    : communicationType ===
                      "Class Discussion"
                      ? MessageCircle
                      : StickyNote;

              return (
                <button
                  key={communicationType}
                  type="button"
                  onClick={() =>
                    handleTypeChange(
                      communicationType
                    )
                  }
                  className={`flex items-center gap-3 rounded-lg border p-4 text-left ${
                    type === communicationType
                      ? "border-gray-900 bg-gray-50"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <Icon
                    size={19}
                    className="text-gray-600"
                  />

                  <span className="text-sm font-medium text-gray-800">
                    {communicationType}
                  </span>
                </button>
              );
            }
          )}
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="max-w-4xl rounded-xl border border-gray-200 bg-white p-6"
      >
        <div className="grid gap-5 md:grid-cols-2">
          {/* Title */}
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Title
            </label>

            <input
              type="text"
              value={title}
              onChange={(e) =>
                setTitle(e.target.value)
              }
              placeholder="Enter title"
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-gray-500"
            />
          </div>

          {/* Class */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Class
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
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Subject
            </label>

            <CustomSelect
              value={subject}
              onChange={(val) => setSubject(String(val))}
              options={[
                { value: "", label: "Select Subject" },
                ...subjects.map((item) => ({ value: item, label: item })),
              ]}
              placeholder="Select Subject"
            />
          </div>

          {/* Student */}
          {type === "Support Requests" && (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Student
              </label>

              <input
                type="text"
                value={student}
                onChange={(e) =>
                  setStudent(e.target.value)
                }
                placeholder="Enter student name"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-gray-500"
              />
            </div>
          )}

          {/* Priority */}
          {type === "Announcements" && (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Priority
              </label>

              <CustomSelect
                value={priority}
                onChange={(val) => setPriority(val as Priority)}
                options={["Low", "Normal", "High"]}
                placeholder="Select Priority"
              />
            </div>
          )}

          {/* Content */}
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Content
            </label>

            <textarea
              value={content}
              onChange={(e) =>
                setContent(e.target.value)
              }
              placeholder="Enter communication content"
              rows={7}
              required
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-gray-500"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-3 border-t border-gray-200 pt-5">
          <Link
            to="/communication"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create Communication"}
          </button>
        </div>
      </form>
    </div>
  );
}