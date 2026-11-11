import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, School } from "lucide-react";

import MultiSelectChecklist from "../../components/MultiSelectChecklist";
import ResponsiveDatePicker from "../../components/ResponsiveDatePicker";
import { batchService, type BatchOption } from "../../services/batchService";
import { liveClassService, type LiveClassItem } from "../../services/liveClassService";

// Today's local date in YYYY-MM-DD format (local components avoid UTC shifts).
const getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const inputClass =
  "w-full min-w-0 rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500";

/** Create New Class / Edit Class form. A class targets one or more global batches. */
export default function ClassForm({ existing }: { existing?: LiveClassItem }) {
  const navigate = useNavigate();
  const isEdit = Boolean(existing);

  const [batchList, setBatchList] = useState<BatchOption[]>([]);
  const [subjectSuggestions, setSubjectSuggestions] = useState<string[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [name, setName] = useState(existing?.title || "");
  const [batches, setBatches] = useState<string[]>(existing?.batches || []);
  const [subject, setSubject] = useState(existing?.subjectName || "");
  const [classDate, setClassDate] = useState(existing?.scheduledDate || "");
  const [startTime, setStartTime] = useState(existing?.startTime.slice(0, 5) || "10:00");
  const [endTime, setEndTime] = useState(existing?.endTime.slice(0, 5) || "11:00");
  const [meetLink, setMeetLink] = useState(existing?.meetingUrl || "");
  const [description, setDescription] = useState(existing && existing.topic !== existing.title ? existing.topic : "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Subjects this teacher already used, offered as suggestions.
    void liveClassService.getMyClassSessions().then((res) => {
      setSubjectSuggestions(Array.from(new Set(res.data.map((c) => c.subjectName).filter(Boolean))));
    });
    void batchService.getBatches().then((res) => {
      setBatchList(res.data);
      if (res.error) setError(res.error);
      setLoadingBatches(false);
    });
  }, []);

  const batchOptions = useMemo(() => {
    const options = batchList.map((b) => ({ value: b.name, label: b.name }));
    // Keep batches saved on the class even if a college was later changed.
    batches.forEach((b) => {
      if (!options.some((o) => o.value === b)) options.push({ value: b, label: b });
    });
    return options;
  }, [batchList, batches]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!name.trim() || !subject.trim()) return setError("Please enter a class name and subject.");
    if (batches.length === 0) return setError("Select at least one batch.");
    if (!classDate) return setError("Please select a class date.");
    // Validate against today at submission time (handles a page left open across midnight).
    if (!isEdit && classDate < getTodayDateString()) {
      return setError("You cannot create a class for a past date. Please select today or a future date.");
    }
    if (!startTime || !endTime || endTime <= startTime) return setError("End time must be after the start time.");
    if (!/^https:\/\/\S+$/i.test(meetLink.trim())) return setError("Enter the meet link as a full https:// URL.");

    setSaving(true);
    const payload = {
      batches,
      title: name,
      subject,
      description,
      meetingUrl: meetLink,
      scheduledDate: classDate,
      startTime,
      endTime,
    };
    const result = existing
      ? await liveClassService.updateClassSession(existing.id, payload)
      : await liveClassService.scheduleForBatches(payload);
    setSaving(false);

    if (result.error) return setError(`Could not save the class: ${result.error}`);
    navigate("/classes");
  };

  return (
    <div className="min-w-0 p-4 sm:p-6">
      <div className="mb-6">
        <Link to="/classes" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft size={16} />
          Back to Classes
        </Link>
      </div>

      <div className="mx-auto w-full min-w-0 max-w-3xl rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-8">
        <div className="mb-6 flex min-w-0 items-center gap-3 border-b border-gray-200 pb-5">
          <div className="shrink-0 rounded-lg bg-blue-50 p-2 text-blue-600">
            <School size={22} />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900">{isEdit ? "Edit Class" : "Create New Class"}</h1>
            <p className="text-sm text-gray-500">
              {isEdit ? "Update the details and schedule of this class" : "Configure details and schedule for a new class section"}
            </p>
          </div>
        </div>

        {error && (
          <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="min-w-0 space-y-6">
          <div className="min-w-0">
            <label className="mb-1 block text-sm font-medium text-gray-700">Class Name / Title *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Advanced Machine Learning"
              className={inputClass}
            />
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="min-w-0">
              <label className="mb-1 block text-sm font-medium text-gray-700">Batches *</label>
              <MultiSelectChecklist
                values={batches}
                onChange={setBatches}
                options={batchOptions}
                placeholder={loadingBatches ? "Loading batches…" : "Select batches"}
                allLabel="All Batches"
                disabled={loadingBatches}
                emptyText="No batches yet. The administrator creates them with each college."
              />
            </div>

            <div className="min-w-0">
              <label className="mb-1 block text-sm font-medium text-gray-700">Subject *</label>
              <input
                type="text"
                required
                list="assigned-subjects"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Python Programming"
                className={inputClass}
              />
              <datalist id="assigned-subjects">
                {subjectSuggestions.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="min-w-0">
              <ResponsiveDatePicker
                label="Select Date"
                value={classDate}
                minDate={isEdit ? undefined : getTodayDateString()}
                onChange={setClassDate}
              />
            </div>

            <div className="min-w-0">
              <label className="mb-1 block text-sm font-medium text-gray-700">Schedule / Time *</label>
              <div className="flex items-center gap-2">
                <input type="time" required value={startTime} onChange={(e) => setStartTime(e.target.value)} aria-label="Start time" className={inputClass} />
                <span className="text-sm text-gray-500">–</span>
                <input type="time" required value={endTime} onChange={(e) => setEndTime(e.target.value)} aria-label="End time" className={inputClass} />
              </div>
            </div>
          </div>

          <div className="min-w-0">
            <label className="mb-1 block text-sm font-medium text-gray-700">Meet Link / Online Class URL *</label>
            <input
              type="url"
              required
              value={meetLink}
              onChange={(e) => setMeetLink(e.target.value)}
              placeholder="e.g. https://meet.google.com/abc-defg-hij or Zoom link"
              className={inputClass}
            />
          </div>

          <div className="min-w-0">
            <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a brief overview of course objectives and syllabus..."
              className={inputClass}
            />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-200 pt-5">
            <Link to="/classes" className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
            >
              {saving ? "Saving…" : isEdit ? "Save Changes" : batches.length > 1 ? `Create Class for ${batches.length} Batches` : "Create Class"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
