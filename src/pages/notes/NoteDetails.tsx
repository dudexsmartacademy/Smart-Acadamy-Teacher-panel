import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Download,
  Edit,
  ExternalLink,
  FileText,
  Image,
  Loader2,
} from "lucide-react";
import { notesService } from "../../services/notesService";

type Attachment = {
  id: string;
  name: string;
  type: "pdf" | "image";
  filePath: string;
  signedUrl?: string;
  size?: string;
};

type Note = {
  id: string;
  noteDate: string;
  title: string;
  description: string;
  classId: string;
  className: string;
  subject: string;
  teacher: string;
  createdAt: string;
  updatedAt: string;
  attachments: Attachment[];
  status: "Published" | "Draft" | "Archived";
};

export default function NoteDetails() {
  const { id } = useParams();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!id) {
        setLoading(false);
        return;
      }

      const res = await notesService.getNoteById(id);
      if (!active) return;

      if (res.data) {
        const attList = await Promise.all(
          (res.data.attachments || []).map(async (a) => {
            let signed = "";
            if (a.filePath) {
              signed = (await notesService.getSignedUrl(a.filePath)) || "";
            }
            return {
              id: a.id,
              name: a.fileName,
              type: (a.fileType?.includes("pdf") ? "pdf" : "image") as "pdf" | "image",
              filePath: a.filePath,
              signedUrl: signed,
              size: a.fileSize ? `${(a.fileSize / 1024).toFixed(1)} KB` : undefined,
            };
          })
        );

        if (active) {
          setNote({
            id: res.data.id,
            noteDate: res.data.noteDate,
            title: res.data.title,
            description: res.data.description || "",
            classId: res.data.classId,
            className: res.data.className || "Class",
            subject: res.data.subjectName || "Subject",
            teacher: "Faculty Member",
            createdAt: res.data.createdAt?.split("T")[0] || res.data.noteDate,
            updatedAt: res.data.createdAt?.split("T")[0] || res.data.noteDate,
            attachments: attList,
            status: res.data.isPublished ? "Published" : "Draft",
          });
        }
      }
      if (active) setLoading(false);
    }

    load();

    return () => {
      active = false;
    };
  }, [id]);

  const handleDownload = async (attachment: Attachment) => {
    const downloadUrl = attachment.signedUrl;
    if (!downloadUrl) return;

    setDownloadingId(attachment.id);
    try {
      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = attachment.name || "note_attachment";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(downloadUrl, "_blank");
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center p-6 text-sm text-gray-500">
        <Loader2 className="h-7 w-7 animate-spin text-amber-700" />
        <p className="mt-3">Loading note details...</p>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="p-6">
        <Link
          to="/notes"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={16} />
          Back to Notes
        </Link>

        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-8 text-center">
          <h1 className="text-xl font-semibold text-gray-900">
            Note Not Found
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            The requested note does not exist.
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
          to="/notes"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={16} />
          Back to Notes
        </Link>

        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {note.title}
              </h1>

              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  note.status === "Published"
                    ? "bg-green-100 text-green-700"
                    : note.status === "Draft"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-gray-100 text-gray-700"
                }`}
              >
                {note.status}
              </span>
            </div>

            <p className="mt-1 text-sm text-gray-500">
              {note.className} · {note.subject}
            </p>
          </div>

          {note.status !== "Archived" && (
            <Link
              to={`/notes/${note.id}/edit`}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              <Edit size={17} />
              Edit Note
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Note Information
            </h2>

            <div className="mt-5 space-y-5">
              <div className="flex items-start gap-3">
                <Calendar
                  size={19}
                  className="mt-0.5 text-gray-500"
                />

                <div>
                  <p className="text-xs text-gray-500">
                    Note Date
                  </p>

                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {note.noteDate}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-500">
                  Description
                </p>

                <p className="mt-2 text-sm leading-6 text-gray-700 whitespace-pre-line">
                  {note.description || "No description provided."}
                </p>
              </div>
            </div>
          </div>

          {/* Attachments */}
          {note.attachments && note.attachments.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Attachments ({note.attachments.length})
              </h2>

              <div className="mt-4 space-y-3">
                {note.attachments.map((attachment) => {
                  const isDownloading = downloadingId === attachment.id;

                  return (
                    <div
                      key={attachment.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 p-3 sm:p-4 min-w-0 max-w-full"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        {attachment.type === "pdf" ? (
                          <FileText
                            size={22}
                            className="shrink-0 text-amber-700"
                          />
                        ) : (
                          <Image
                            size={22}
                            className="shrink-0 text-amber-700"
                          />
                        )}

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs sm:text-sm font-medium text-gray-900" title={attachment.name}>
                            {attachment.name}
                          </p>

                          <p className="mt-0.5 text-[11px] sm:text-xs text-gray-500">
                            {attachment.type === "pdf" ? "PDF Document" : "Image File"}
                            {attachment.size ? ` · ${attachment.size}` : ""}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {attachment.signedUrl && (
                          <button
                            type="button"
                            onClick={() => window.open(attachment.signedUrl, "_blank")}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
                            title="View attachment in new tab"
                          >
                            <ExternalLink size={13} />
                            View
                          </button>
                        )}

                        {attachment.signedUrl && (
                          <button
                            type="button"
                            disabled={isDownloading}
                            onClick={() => handleDownload(attachment)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50 transition"
                            title="Download attachment"
                          >
                            {isDownloading ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <Download size={13} />
                            )}
                            Download
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Metadata */}
        <div>
          <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Note Details
            </h2>

            <div>
              <p className="text-xs text-gray-500">
                Subject
              </p>
              <p className="mt-1 text-sm font-medium text-gray-900">
                {note.subject}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">
                Batch
              </p>
              <p className="mt-1 text-sm font-medium text-gray-900">
                {note.className}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">
                Status
              </p>
              <p className="mt-1 text-sm font-medium text-gray-900">
                {note.status}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">
                Published On
              </p>
              <p className="mt-1 text-sm font-medium text-gray-900">
                {note.createdAt}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
