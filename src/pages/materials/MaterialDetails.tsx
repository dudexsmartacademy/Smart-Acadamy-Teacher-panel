import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Edit,
  FileText,
  ExternalLink,
} from "lucide-react";
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

export default function MaterialDetails() {
  const { assignments: teacherAssignments } = useAuth();
  const { id } = useParams();
  const [material, setMaterial] = useState<Material | null>(null);
  const [loading, setLoading] = useState(true);

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
        const type: MaterialType = hasPdf ? "PDF" : "Document";
        setMaterial({
          id: res.data.id,
          title: res.data.title,
          description: res.data.description || "",
          type,
          classId: res.data.classId,
          className: res.data.className || "Class",
          subject: res.data.subjectName || "Subject",
          createdAt: res.data.createdAt?.split("T")[0] || res.data.noteDate,
          status: res.data.isPublished ? "Published" : "Draft",
          attachments: (res.data.attachments || []).map((a) => a.fileName),
        });
      }
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="p-6 text-center text-sm text-gray-500">
        Loading material details...
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

  const authorized =
    teacherAssignments.length === 0 ||
    teacherAssignments.some(
      (assignment) =>
        assignment.active &&
        (assignment.classId === material.classId || !material.classId)
    );

  if (!authorized) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-white p-8 text-center">
          <h1 className="text-xl font-semibold text-red-700">
            Access Denied
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            You are not authorized to view this material.
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

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <Link
            to="/materials"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={16} />
            Back to Materials
          </Link>

          <h1 className="mt-4 text-2xl font-bold text-gray-900">
            {material.title}
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Material Details
          </p>
        </div>

        {material.status !== "Archived" && (
          <Link
            to={`/materials/${material.id}/edit`}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            <Edit size={16} />
            Edit Material
          </Link>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Information */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Material Information
            </h2>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase text-gray-500">
                  Title
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {material.title}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase text-gray-500">
                  Material Type
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {material.type}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase text-gray-500">
                  Class
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {material.className}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase text-gray-500">
                  Subject
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {material.subject}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase text-gray-500">
                  Created Date
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {material.createdAt}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase text-gray-500">
                  Status
                </p>

                <span
                  className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                    material.status === "Published"
                      ? "bg-green-100 text-green-700"
                      : material.status === "Draft"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {material.status}
                </span>
              </div>
            </div>

            <div className="mt-6 border-t border-gray-200 pt-5">
              <p className="text-xs font-medium uppercase text-gray-500">
                Description
              </p>

              <p className="mt-2 text-sm leading-6 text-gray-700">
                {material.description}
              </p>
            </div>
          </div>
        </div>

        {/* Access */}
        <div>
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Material Access
            </h2>

            <div className="mt-5 space-y-3">
              {material.url && (
                <a
                  href={material.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-lg border border-gray-200 p-3 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <ExternalLink
                      size={18}
                      className="text-gray-600"
                    />

                    <span className="text-sm font-medium text-gray-800">
                      Open Material Link
                    </span>
                  </div>
                </a>
              )}

              {material.attachments?.map(
                (attachment) => (
                  <button
                    key={attachment}
                    type="button"
                    onClick={() =>
                      console.log(
                        "View attachment:",
                        attachment
                      )
                    }
                    className="flex w-full items-center justify-between rounded-lg border border-gray-200 p-3 text-left hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <FileText
                        size={18}
                        className="text-gray-600"
                      />

                      <span className="text-sm font-medium text-gray-800">
                        {attachment}
                      </span>
                    </div>
                  </button>
                )
              )}

              {!material.url &&
                (!material.attachments ||
                  material.attachments.length === 0) && (
                  <div className="py-5 text-center text-sm text-gray-500">
                    No material attachment available.
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}