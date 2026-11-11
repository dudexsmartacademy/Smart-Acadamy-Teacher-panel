import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileText,
  ImagePlus,
  X,
} from "lucide-react";

import CustomSelect from "../../components/CustomSelect";
import { useAuth } from "../../context/AuthContext";
import { notesService } from "../../services/notesService";

type Attachment = {
  name: string;
  type: string;
  size: number;
};

type Note = {
  id: string;
  noteDate: string;
  title: string;
  description: string;
  classId: string;
  className: string;
  subject: string;
  attachments: Attachment[];
  status: "Published" | "Draft" | "Archived";
};


const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function getLocalToday(): string {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDate(value: string): Date | null {
  if (!value) {
    return null;
  }

  const parts = value.split("-").map(Number);

  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return null;
  }

  const [year, month, day] = parts;
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateForDisplay(value: string): string {
  const date = parseDate(value);

  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

type ResponsiveDatePickerProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
};

function ResponsiveDatePicker({
  label,
  value,
  onChange,
  required = false,
}: ResponsiveDatePickerProps) {
  const initialDate = parseDate(value) ?? new Date();

  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(
    new Date(
      initialDate.getFullYear(),
      initialDate.getMonth(),
      1
    )
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const todayString = getLocalToday();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;

      if (
        containerRef.current &&
        !containerRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener(
        "pointerdown",
        handlePointerDown
      );
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const currentDate = parseDate(value) ?? new Date();

      setVisibleMonth(
        new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          1
        )
      );
    }
  }, [isOpen, value]);

  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPreviousMonth = new Date(year, month, 0).getDate();

  const calendarDays = useMemo(() => {
    const days: Array<{
      date: Date;
      currentMonth: boolean;
    }> = [];

    for (let index = 0; index < 42; index++) {
      const dayNumber = index - firstDayOfMonth + 1;

      if (dayNumber < 1) {
        days.push({
          date: new Date(
            year,
            month - 1,
            daysInPreviousMonth + dayNumber
          ),
          currentMonth: false,
        });
      } else if (dayNumber > daysInMonth) {
        days.push({
          date: new Date(
            year,
            month + 1,
            dayNumber - daysInMonth
          ),
          currentMonth: false,
        });
      } else {
        days.push({
          date: new Date(year, month, dayNumber),
          currentMonth: true,
        });
      }
    }

    return days;
  }, [
    year,
    month,
    firstDayOfMonth,
    daysInMonth,
    daysInPreviousMonth,
  ]);

  function changeMonth(amount: number) {
    setVisibleMonth(
      new Date(year, month + amount, 1)
    );
  }

  function selectDate(date: Date) {
    onChange(formatDateForInput(date));
    setIsOpen(false);
  }

  function clearDate() {
    onChange("");
    setIsOpen(false);
  }

  function selectToday() {
    onChange(todayString);

    const today = new Date();

    setVisibleMonth(
      new Date(today.getFullYear(), today.getMonth(), 1)
    );

    setIsOpen(false);
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full min-w-0"
    >
      <label className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </label>

      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={`Choose ${label.toLowerCase()}`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="flex w-full min-w-0 items-center justify-between gap-3 rounded-lg border border-gray-300 bg-white px-3 py-2 text-left text-sm outline-none transition-colors hover:border-gray-400 focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
      >
        <span
          className={
            value ? "truncate text-gray-900" : "truncate text-gray-400"
          }
        >
          {value
            ? formatDateForDisplay(value)
            : "Select date"}
        </span>

        <CalendarDays
          size={17}
          className="shrink-0 text-gray-500"
        />
      </button>

      {required && (
        <input
          type="text"
          value={value}
          required
          tabIndex={-1}
          aria-hidden="true"
          className="pointer-events-none absolute h-px w-px opacity-0"
          onChange={() => undefined}
        />
      )}

      {isOpen && (
        <div
          ref={popupRef}
          role="dialog"
          aria-label={`${label} calendar`}
          className="absolute left-0 top-full z-[1000] mt-2 w-[min(320px,calc(100vw-32px))] max-w-[calc(100vw-32px)] rounded-xl border border-gray-200 bg-white p-3 shadow-xl sm:p-4"
        >
          {/* Calendar header */}
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900">
                {new Intl.DateTimeFormat("en-US", {
                  month: "long",
                  year: "numeric",
                }).format(visibleMonth)}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => changeMonth(-1)}
                aria-label="Previous month"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 active:bg-gray-200"
              >
                <ChevronLeft size={19} />
              </button>

              <button
                type="button"
                onClick={() => changeMonth(1)}
                aria-label="Next month"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 active:bg-gray-200"
              >
                <ChevronRight size={19} />
              </button>
            </div>
          </div>

          {/* Weekday headings */}
          <div className="grid grid-cols-7">
            {WEEKDAYS.map((day, index) => (
              <div
                key={`${day}-${index}`}
                className="flex h-9 items-center justify-center text-xs font-semibold text-gray-500"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar dates */}
          <div className="grid grid-cols-7">
            {calendarDays.map(({ date, currentMonth }, index) => {
              const dateString = formatDateForInput(date);
              const isSelected = dateString === value;
              const isToday = dateString === todayString;

              return (
                <button
                  key={`${dateString}-${index}`}
                  type="button"
                  onClick={() => selectDate(date)}
                  aria-label={date.toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                  aria-pressed={isSelected}
                  className={[
                    "mx-auto flex h-9 w-9 max-w-full items-center justify-center rounded-lg text-xs transition-colors",
                    currentMonth
                      ? "text-gray-800"
                      : "text-gray-300",
                    isSelected
                      ? "bg-gray-900 font-semibold text-white hover:bg-gray-800"
                      : "hover:bg-gray-100",
                    isToday && !isSelected
                      ? "border border-gray-400 font-semibold"
                      : "",
                  ].join(" ")}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          {/* Calendar footer */}
          <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
            <button
              type="button"
              onClick={clearDate}
              className="rounded-md px-2 py-1.5 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50"
            >
              Clear
            </button>

            <button
              type="button"
              onClick={selectToday}
              className="rounded-md px-2 py-1.5 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EditNote() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { assignments: teacherAssignments } = useAuth();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);

  const [noteDate, setNoteDate] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    notesService.getNoteById(id).then((res) => {
      if (res.data) {
        const loaded: Note = {
          id: res.data.id,
          noteDate: res.data.noteDate,
          title: res.data.title,
          description: res.data.description || "",
          classId: res.data.classId,
          className: res.data.className || "Class",
          subject: res.data.subjectName || "Subject",
          attachments: (res.data.attachments || []).map((a) => ({
            name: a.fileName,
            type: a.fileType || "application/pdf",
            size: a.fileSize || 0,
          })),
          status: res.data.isPublished ? "Published" : "Draft",
        };
        setNote(loaded);
        setNoteDate(loaded.noteDate);
        setTitle(loaded.title);
        setDescription(loaded.description);
        setAttachments(loaded.attachments);
      }
      setLoading(false);
    });
  }, [id]);

  const authorized =
    teacherAssignments.length === 0 ||
    teacherAssignments.some(
      (assignment) =>
        assignment.active &&
        (assignment.classId === note?.classId || !note?.classId)
    );

  // Subject choices: the note's own subject plus common subjects (notes are
  // published to batches, not tied to class assignments).
  const authorizedSubjects = useMemo(
    () =>
      Array.from(
        new Set(
          [
            note?.subject,
            ...teacherAssignments.map((assignment) => assignment.subject),
            "Data Structures",
            "Python Programming",
            "Database Management Systems",
            "Computer Networks",
            "Full Stack Development",
            "Machine Learning",
            "Aptitude & Soft Skills",
            "General",
          ].filter((value): value is string => Boolean(value))
        )
      ),
    [note, teacherAssignments]
  );

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;

    if (!files) {
      return;
    }

    const selectedFiles = Array.from(files);

    const allowedExtensions = [
      ".pdf",
      ".doc",
      ".docx",
      ".txt",
      ".ppt",
      ".pptx",
      ".xls",
      ".xlsx",
    ];

    const isAllowed = (file: File) => {
      const extension =
        "." + (file.name.split(".").pop()?.toLowerCase() || "");

      return (
        file.type.startsWith("image/") ||
        file.type === "application/pdf" ||
        file.type.includes("document") ||
        file.type.includes("word") ||
        file.type.includes("presentation") ||
        file.type.includes("sheet") ||
        file.type.includes("text") ||
        allowedExtensions.includes(extension)
      );
    };

    const invalidFile = selectedFiles.find(
      (file) => !isAllowed(file)
    );

    if (invalidFile) {
      alert(
        "Only PDF, documents (DOC, PPT, TXT, XLS), and image files are allowed."
      );

      event.target.value = "";
      return;
    }

    const newAttachments: Attachment[] = selectedFiles.map(
      (file) => ({
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
      })
    );

    setAttachments((current) => [
      ...current,
      ...newAttachments,
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

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!note) {
      return;
    }

    if (!authorized) {
      alert("You are not authorized to edit this note.");
      return;
    }

    if (note.status === "Archived") {
      alert("Archived notes cannot be edited.");
      return;
    }

    if (!noteDate) {
      alert("Please select a note date.");
      return;
    }

    if (title.trim() === "") {
      alert("Please enter a title.");
      return;
    }

    if (description.trim() === "") {
      alert("Please enter a description.");
      return;
    }

    if (attachments.length === 0) {
      alert(
        "Please keep at least one document, PDF, or image attached."
      );
      return;
    }

    notesService
      .updateNote(note.id, {
        title: title.trim(),
        description: description.trim(),
      })
      .finally(() => {
        navigate(`/notes/${note.id}`);
      });
  };

  if (loading) {
    return (
      <div className="w-full min-w-0 p-6 text-center text-sm text-gray-500">
        Loading note details...
      </div>
    );
  }

  if (!note) {
    return (
      <div className="w-full min-w-0 p-4 sm:p-6">
        <Link
          to="/notes"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={16} />
          Back to Notes
        </Link>

        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 text-center sm:p-8">
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

  if (!authorized) {
    return (
      <div className="w-full min-w-0 p-4 sm:p-6">
        <Link
          to="/notes"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={16} />
          Back to Notes
        </Link>

        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-6 text-center sm:p-8">
          <h1 className="text-xl font-semibold text-red-700">
            Access Denied
          </h1>

          <p className="mt-2 text-sm text-red-600">
            You are not authorized to edit this note.
          </p>
        </div>
      </div>
    );
  }

  if (note.status === "Archived") {
    return (
      <div className="w-full min-w-0 p-4 sm:p-6">
        <Link
          to={`/notes/${note.id}`}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={16} />
          Back to Note
        </Link>

        <div className="mt-6 rounded-xl border border-yellow-200 bg-yellow-50 p-6 text-center sm:p-8">
          <h1 className="text-xl font-semibold text-yellow-700">
            Editing Not Available
          </h1>

          <p className="mt-2 text-sm text-yellow-700">
            Archived notes cannot be edited.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 max-w-full p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          to={`/notes/${note.id}`}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={16} />
          Back to Note
        </Link>

        <h1 className="mt-4 text-xl font-bold text-gray-900 sm:text-2xl">
          Edit Note
        </h1>

        <p className="mt-1 text-xs text-gray-500 sm:text-sm">
          Update the note details and attachments.
        </p>
      </div>

      {/* Edit form */}
      <form
        onSubmit={handleSubmit}
        className="w-full min-w-0 max-w-4xl rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6"
      >
        <div className="grid min-w-0 gap-5 md:grid-cols-2">
          {/* Note Date */}
          <div className="min-w-0">
            <ResponsiveDatePicker
              label="Note Date"
              value={noteDate}
              onChange={setNoteDate}
              required
            />
          </div>

          {/* Batch */}
          <div className="min-w-0">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Batch
            </label>

            <input
              type="text"
              value={note.className}
              disabled
              className="w-full min-w-0 rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-gray-600"
            />
          </div>

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
              className="w-full min-w-0 rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
            />
          </div>

          {/* Subject */}
          <div className="min-w-0 md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Subject / Topic
            </label>

            <CustomSelect
              value={note.subject}
              onChange={() => {}}
              disabled
              options={authorizedSubjects.map((subject) => ({
                value: subject,
                label: subject,
              }))}
            />
          </div>

          {/* Description */}
          <div className="min-w-0 md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Description
            </label>

            <textarea
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              rows={5}
              required
              className="w-full min-w-0 resize-none rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
            />
          </div>

          {/* Attachments */}
          <div className="min-w-0 md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Attachments
            </label>

            <div className="rounded-lg border-2 border-dashed border-gray-300 p-4 sm:p-6">
              <div className="flex flex-col items-center text-center">
                <ImagePlus
                  size={30}
                  className="text-gray-400"
                />

                <p className="mt-2 text-sm font-medium text-gray-700">
                  Add PDF, documents, or images
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  Multiple PDFs, documents, or images can be attached
                </p>

                <label className="mt-4 cursor-pointer rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
                  Choose Files

                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.xlsx,.xls,image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {attachments.length > 0 && (
              <div className="mt-4 space-y-2">
                {attachments.map((attachment, index) => (
                  <div
                    key={`${attachment.name}-${index}`}
                    className="flex min-w-0 max-w-full items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 p-2.5 sm:p-3"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
                      <FileText
                        size={18}
                        className="shrink-0 text-gray-500"
                      />

                      <div className="min-w-0 flex-1">
                        <p
                          className="truncate text-xs font-medium text-gray-800 sm:text-sm"
                          title={attachment.name}
                        >
                          {attachment.name}
                        </p>

                        <p className="text-[11px] text-gray-500 sm:text-xs">
                          {(attachment.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="shrink-0 rounded p-1 text-gray-400 transition-colors hover:text-red-600"
                      title="Remove attachment"
                      aria-label={`Remove ${attachment.name}`}
                    >
                      <X size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-gray-200 pt-5">
          <Link
            to={`/notes/${note.id}`}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Cancel
          </Link>

          <button
            type="submit"
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}