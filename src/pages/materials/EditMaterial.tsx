import { useState, useEffect } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { ArrowLeft, FileText, X } from "lucide-react";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";
import CustomSelect from "../../components/CustomSelect";
import { useAuth } from "../../context/AuthContext";
import { notesService } from "../../services/notesService";

type MaterialType =
  | "PDF"
  | "Video"
  | "Document"
  | "Presentation"
  | "Link"
  | "Assignment";

type Material = {
  id: string;
  title: string;
  description: string;
  type: MaterialType;
  classId: string;
  className: string;
  subject: string;
  createdAt: string;
  status: "Published" | "Draft" | "Archived";
  url?: string;
  attachments?: string[];
};

export default function EditMaterial() {
  const { assignments: teacherAssignments } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();

  const [material, setMaterial] = useState<Material | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<MaterialType>("PDF");
  const [url, setUrl] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [className, setClassName] = useState("");

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    notesService.getNoteById(id).then((res) => {
      if (res.data) {
        const hasPdf = res.data.attachments?.some(
          (a) => a.fileType?.includes("pdf") || a.fileName.endsWith(".pdf")
        );
        const matType: MaterialType = hasPdf ? "PDF" : "Document";
        const m: Material = {
          id: res.data.id,
          title: res.data.title,
          description: res.data.description || "",
          type: matType,
          classId: res.data.classId,
          className: res.data.className || "Class",
          subject: res.data.subjectName || "Subject",
          createdAt: res.data.createdAt?.split("T")[0] || res.data.noteDate,
          status: res.data.isPublished ? "Published" : "Draft",
          attachments: (res.data.attachments || []).map((a) => a.fileName),
        };
        setMaterial(m);
        setTitle(m.title);
        setDescription(m.description);
        setType(m.type);
        setAttachments(m.attachments || []);
        setClassName(m.className);
      }
      setLoading(false);
    });
  }, [id]);

  const authorized =
    teacherAssignments.length === 0 ||
    material?.classId === "all" ||
    material?.className === "All Batches" ||
    (material
      ? teacherAssignments.some(
          (assignment) =>
            assignment.active &&
            (assignment.classId === material.classId ||
              assignment.className === material.className ||
              assignment.subject === material.subject)
        )
      : false);

  const handleFileChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;

    if (!files) {
      return;
    }

    const selectedFiles = Array.from(files);

    const newFiles = selectedFiles.map(
      (file) => file.name
    );

    setAttachments((current) => [
      ...current,
      ...newFiles,
    ]);

    event.target.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments((current) =>
      current.filter(
        (_, itemIndex) => itemIndex !== index
      )
    );
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!material) {
      return;
    }

    if (!authorized) {
      alert(
        "You are not authorized to edit this material."
      );
      return;
    }

    if (material.status === "Archived") {
      alert("Archived material cannot be edited.");
      return;
    }

    if (
      (type === "Link" || type === "Video") &&
      !url.trim()
    ) {
      alert("Please enter the material URL.");
      return;
    }

    setSaving(true);
    try {
      await notesService.updateNote(material.id, {
        title: title.trim(),
        description: description.trim(),
      });

      navigate(`/materials/${material.id}`);
    } catch (err) {
      console.error("Failed to update material:", err);
      alert("Failed to update material. Please try again.");
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

  if (!material) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <h1 className="text-xl font-semibold text-gray-900">
            Material Not Found
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            The requested material does not exist.
          </p>

          <Link
            to="/materials"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white"
          >
            <ArrowLeft size={16} />
            Back to Materials
          </Link>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-white p-8 text-center">
          <h1 className="text-xl font-semibold text-red-700">
            Access Denied
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            You are not authorized to edit this material.
          </p>

          <Link
            to="/materials"
            className="mt-5 inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
          >
            <ArrowLeft size={16} />
            Back to Materials
          </Link>
        </div>
      </div>
    );
  }

  if (material.status === "Archived") {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <h1 className="text-xl font-semibold text-gray-900">
            Material Archived
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Archived material cannot be edited.
          </p>

          <Link
            to={`/materials/${material.id}`}
            className="mt-5 inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
          >
            <ArrowLeft size={16} />
            Back to Material
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          to={`/materials/${material.id}`}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={16} />
          Back to Material
        </Link>

        <h1 className="mt-4 text-2xl font-bold text-gray-900">
          Edit Material
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Update the learning material details.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="max-w-4xl rounded-xl border border-gray-200 bg-white p-6"
      >
        <div className="grid gap-5 md:grid-cols-2">
          {/* Title */}
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Material Title
            </label>

            <input
              type="text"
              value={title}
              onChange={(e) =>
                setTitle(e.target.value)
              }
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-gray-500"
            />
          </div>

          {/* Class */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Class
            </label>

            <input
              type="text"
              value={className}
              disabled
              className="w-full rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-gray-600"
            />

            <p className="mt-1 text-xs text-gray-500">
              Class assignment cannot be changed.
            </p>
          </div>

          {/* Subject */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Subject
            </label>

            <input
              type="text"
              value={material.subject}
              disabled
              className="w-full rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-gray-600"
            />

            <p className="mt-1 text-xs text-gray-500">
              Subject assignment cannot be changed.
            </p>
          </div>

          {/* Material Type */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Material Type
            </label>

            <CustomSelect
              value={type}
              onChange={(val) => setType(val as MaterialType)}
              options={[
                { value: "PDF", label: "PDF" },
                { value: "Video", label: "Video" },
                { value: "Document", label: "Document" },
                { value: "Presentation", label: "Presentation" },
                { value: "Link", label: "Link" },
                { value: "Assignment", label: "Assignment" },
              ]}
            />
          </div>

          {/* URL */}
          {(type === "Link" || type === "Video") && (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Material URL
              </label>

              <input
                type="url"
                value={url}
                onChange={(e) =>
                  setUrl(e.target.value)
                }
                placeholder="https://..."
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-gray-500"
              />
            </div>
          )}

          {/* Description */}
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Description
            </label>

            <textarea
              value={description}
              onChange={(e) =>
                setDescription(e.target.value)
              }
              rows={5}
              required
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-gray-500"
            />
          </div>

          {/* Attachments */}
          {type !== "Link" && type !== "Video" && (
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Material Files
              </label>

              <div className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center">
                <FileText
                  size={30}
                  className="mx-auto text-gray-400"
                />

                <p className="mt-2 text-sm font-medium text-gray-700">
                  Add Material File
                </p>

                <label className="mt-4 inline-block cursor-pointer rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Choose File

                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              {attachments.length > 0 && (
                <div className="mt-4 space-y-2">
                  {attachments.map(
                    (attachment, index) => (
                      <div
                        key={`${attachment}-${index}`}
                        className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 p-2.5 sm:p-3 min-w-0 max-w-full"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
                          <FileText
                            size={18}
                            className="shrink-0 text-gray-500"
                          />

                          <span className="truncate text-xs sm:text-sm font-medium text-gray-800 min-w-0 flex-1" title={attachment}>
                            {attachment}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            removeAttachment(index)
                          }
                          className="shrink-0 p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                          title="Remove"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-3 border-t border-gray-200 pt-5">
          <Link
            to={`/materials/${material.id}`}
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