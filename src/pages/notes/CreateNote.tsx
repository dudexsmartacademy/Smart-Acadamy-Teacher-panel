import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
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
import MultiSelectChecklist from "../../components/MultiSelectChecklist";
import { useBatchOptions } from "../../hooks/useBatchOptions";
import { notesService } from "../../services/notesService";

type Attachment = {
  name: string;
  type: string;
  size: number;
};

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function getLocalToday(): string {
  const today = new Date();

  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
}

function parseDate(value: string): Date | null {
  if (!value) return null;

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) return null;

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

  if (!date) return "";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

type ResponsiveDatePickerProps = {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
};

function ResponsiveDatePicker({
  value,
  onChange,
  required = false,
}: ResponsiveDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const initialDate = parseDate(value) ?? new Date();

  const [visibleMonth, setVisibleMonth] = useState(
    new Date(
      initialDate.getFullYear(),
      initialDate.getMonth(),
      1
    )
  );

  const containerRef = useRef<HTMLDivElement>(null);

  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();

  const todayString = getLocalToday();

  useEffect(() => {
    if (!isOpen) return;

    function handleOutsideClick(event: PointerEvent) {
      const target = event.target as Node;

      if (
        containerRef.current &&
        !containerRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener(
        "pointerdown",
        handleOutsideClick
      );
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const date = parseDate(value) ?? new Date();

    setVisibleMonth(
      new Date(date.getFullYear(), date.getMonth(), 1)
    );
  }, [isOpen, value]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPreviousMonth = new Date(year, month, 0).getDate();

    return Array.from({ length: 42 }, (_, index) => {
      const dayNumber = index - firstDay + 1;

      if (dayNumber < 1) {
        return {
          date: new Date(
            year,
            month - 1,
            daysInPreviousMonth + dayNumber
          ),
          currentMonth: false,
        };
      }

      if (dayNumber > daysInMonth) {
        return {
          date: new Date(
            year,
            month + 1,
            dayNumber - daysInMonth
          ),
          currentMonth: false,
        };
      }

      return {
        date: new Date(year, month, dayNumber),
        currentMonth: true,
      };
    });
  }, [year, month]);

  function changeMonth(amount: number) {
    setVisibleMonth(new Date(year, month + amount, 1));
  }

  function selectDate(date: Date) {
    onChange(formatDateForInput(date));
    setIsOpen(false);
  }

  function selectToday() {
    const today = new Date();

    onChange(todayString);

    setVisibleMonth(
      new Date(today.getFullYear(), today.getMonth(), 1)
    );

    setIsOpen(false);
  }

  function clearDate() {
    onChange("");
    setIsOpen(false);
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full min-w-0"
    >
      <label className="mb-2 block text-sm font-medium text-gray-700">
        Note Date
      </label>

      <button
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
        aria-label="Choose note date"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className="flex w-full min-w-0 items-center justify-between gap-3 rounded-lg border border-gray-300 bg-white px-3 py-2 text-left text-sm outline-none transition-colors hover:border-gray-400 focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
      >
        <span
          className={
            value ? "text-gray-900" : "text-gray-400"
          }
        >
          {value ? formatDateForDisplay(value) : "mm/dd/yyyy"}
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
          role="dialog"
          aria-label="Note date calendar"
          className="absolute left-0 top-full z-[1000] mt-2 box-border w-[min(320px,calc(100vw-32px))] max-w-[calc(100vw-32px)] rounded-xl border border-gray-200 bg-white p-3 shadow-xl sm:p-4"
        >
          {/* Month header */}
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold text-gray-900">
              {new Intl.DateTimeFormat("en-US", {
                month: "long",
                year: "numeric",
              }).format(visibleMonth)}
            </p>

            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => changeMonth(-1)}
                aria-label="Previous month"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100"
              >
                <ChevronLeft size={19} />
              </button>

              <button
                type="button"
                onClick={() => changeMonth(1)}
                aria-label="Next month"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100"
              >
                <ChevronRight size={19} />
              </button>
            </div>
          </div>

          {/* Weekdays */}
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

          {/* Dates */}
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
                  aria-pressed={isSelected}
                  aria-label={date.toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                  className={[
                    "mx-auto flex h-9 w-9 max-w-full items-center justify-center rounded-lg text-xs transition-colors",
                    currentMonth
                      ? "text-gray-800"
                      : "text-gray-300",
                    isSelected
                      ? "bg-blue-600 font-semibold text-white hover:bg-blue-700"
                      : "hover:bg-gray-100",
                    isToday && !isSelected
                      ? "border border-blue-500 font-semibold"
                      : "",
                  ].join(" ")}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
            <button
              type="button"
              onClick={clearDate}
              className="rounded-md px-2 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50"
            >
              Clear
            </button>

            <button
              type="button"
              onClick={selectToday}
              className="rounded-md px-2 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CreateNote() {
  const navigate = useNavigate();
  const { options: batchOptions, loading: batchesLoading } = useBatchOptions();

  const [noteDate, setNoteDate] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [batches, setBatches] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [rawFiles, setRawFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const subjects = useMemo(() => {
    const set = new Set<string>();
    [
      "Data Structures",
      "Python Programming",
      "Database Management Systems",
      "Computer Networks",
      "Full Stack Development",
      "Machine Learning",
      "Aptitude & Soft Skills",
      "General",
    ].forEach((s) => set.add(s));
    return Array.from(set);
  }, []);


  const handleFileChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;

    if (!files) return;

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
    setRawFiles((current) => [
      ...current,
      ...selectedFiles,
    ]);

    event.target.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments((current) =>
      current.filter((_, itemIndex) => itemIndex !== index)
    );
    setRawFiles((current) =>
      current.filter((_, itemIndex) => itemIndex !== index)
    );
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!noteDate) {
      alert("Please select a note date.");
      return;
    }

    if (!title.trim()) {
      alert("Please enter a note title.");
      return;
    }

    if (batches.length === 0) {
      alert("Please select at least one batch.");
      return;
    }

    if (!subject.trim()) {
      alert("Please select or enter a subject.");
      return;
    }

    if (!description.trim()) {
      alert("Please enter a note description.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await notesService.createNote(
        {
          batches,
          title: title.trim(),
          description: description.trim(),
          noteDate,
          subject: subject,
        },
        rawFiles
      );

      if (res.error) {
        alert(`Failed to save note: ${res.error}`);
        setSubmitting(false);
        return;
      }

      alert("Note created and published successfully!");
      navigate("/notes");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error creating note";
      alert(`Failed to save note: ${msg}`);
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-full min-w-0 p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/notes"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={16} />
          Back to Notes
        </Link>

        <h1 className="mt-4 text-xl font-bold text-gray-900 sm:text-2xl">
          Create Note
        </h1>

        <p className="mt-1 text-xs text-gray-500 sm:text-sm">
          Create a note for one or more batches.
        </p>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="w-full min-w-0 max-w-4xl rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6"
      >
        <div className="grid min-w-0 gap-5 md:grid-cols-2">
          {/* Note Date */}
          <div className="min-w-0">
            <ResponsiveDatePicker
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

            <MultiSelectChecklist
              values={batches}
              onChange={setBatches}
              options={batchOptions}
              placeholder={batchesLoading ? "Loading batches…" : "Select Target Batches"}
              allLabel="All Batches"
              disabled={batchesLoading}
              emptyText="No batches yet. The administrator creates them with each college."
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
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Enter note title"
              required
              className="w-full min-w-0 rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-gray-500"
            />
          </div>

          {/* Subject */}
          <div className="min-w-0 md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Subject / Topic
            </label>

            <div className="space-y-2">
              <CustomSelect
                value={subject}
                onChange={setSubject}
                placeholder="Select Subject / Course"
                options={subjects.map((item) => ({
                  value: item,
                  label: item,
                }))}
              />
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Or type custom subject name..."
                className="w-full min-w-0 rounded-lg border border-gray-300 px-3 py-1.5 text-xs outline-none focus:border-gray-500 text-gray-700"
              />
            </div>
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
              placeholder="Enter note description"
              rows={5}
              required
              className="w-full min-w-0 resize-none rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-gray-500"
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
                  Upload PDF, documents, or images
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

            {/* Selected attachments */}
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
            to="/notes"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
          >
            {submitting ? "Publishing Note..." : "Save & Publish Note"}
          </button>
        </div>
      </form>
    </div>
  );
}