import { useState, useMemo, useEffect } from "react";
import { useBatchOptions } from "../../hooks/useBatchOptions";
import { Link } from "react-router-dom";
import {
  Code2,
  Calendar,
  Clock,
  Timer,
  ExternalLink,
  Plus,
  Search,
  Copy,
  Check,
  Trash2,
  Edit3,
  Share2,
  CheckCircle2,
  Laptop,
  ListFilter,
  Sparkles,
  Info,
  X,
  Eye,
} from "lucide-react";
import DeleteModal from "../../components/DeleteModal";
import CustomSelect from "../../components/CustomSelect";
import MultiSelectChecklist from "../../components/MultiSelectChecklist";
import ResponsiveDatePicker from "../../components/ResponsiveDatePicker";
import { hackerrankService, type HackerRankSubmission } from "../../services/hackerrankService";

export type AssessmentType = "Coding" | "MCQ" | "Coding + MCQ";

export type HackerRankChallenge = {
  id: string;
  title: string;
  type: AssessmentType;
  date: string;
  startTime: string;
  duration: string;
  url: string;
  batch?: string;
  description?: string;
  createdAt: string;
  status: "Active" | "Upcoming" | "Completed";
};

/**
 * Returns the current date in local YYYY-MM-DD format.
 * Avoids the date shifting caused by converting to UTC.
 */
function getLocalToday(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function HackerRankAssessments() {
  const [challenges, setChallenges] = useState<HackerRankChallenge[]>([]);
  const [reviewing, setReviewing] = useState<HackerRankChallenge | null>(null);

  const reloadChallenges = async () => {
    try {
      setChallenges(await hackerrankService.list());
    } catch (error) {
      showNotification(error instanceof Error ? error.message : "Could not load HackerRank assessments.");
    }
  };

  useEffect(() => {
    void reloadChallenges();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { options: globalBatchOptions } = useBatchOptions();


  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [type, setType] = useState<AssessmentType>("Coding");
  const [date, setDate] = useState(getLocalToday());
  const [startTime, setStartTime] = useState("10:00 AM");
  const [duration, setDuration] = useState("60 Mins");
  const [customDuration, setCustomDuration] = useState("");
  const [url, setUrl] = useState(
    ""
  );
  const [selectedBatches, setSelectedBatches] = useState<string[]>([]);
  const [description, setDescription] = useState("");

  // Filters and search
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("All");
  const [filterBatches, setFilterBatches] = useState<string[]>([]);

  // Interaction feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] =
    useState<HackerRankChallenge | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Lock background scrolling when the modal is open.
  useEffect(() => {
    if (showCreateModal) {
      const scrollY = window.scrollY;

      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      document.body.style.overflowY = "scroll";
    } else {
      const scrollY = document.body.style.top;

      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.body.style.overflowY = "";

      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || "0", 10) * -1);
      }
    }

    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.body.style.overflowY = "";
    };
  }, [showCreateModal]);

  // Escape key handler for the modal.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && showCreateModal) {
        setShowCreateModal(false);
        resetForm();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showCreateModal]);

  const showNotification = (message: string) => {
    setSuccessToast(message);

    setTimeout(() => {
      setSuccessToast(null);
    }, 4000);
  };

  const resetForm = () => {
    setTitle("");
    setType("Coding");
    setDate(getLocalToday());
    setStartTime("10:00 AM");
    setDuration("60 Mins");
    setCustomDuration("");
    setUrl("");
    setSelectedBatches([]);
    setDescription("");
    setEditingId(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const handleOpenEdit = (item: HackerRankChallenge) => {
    setEditingId(item.id);
    setTitle(item.title);
    setType(item.type);
    setDate(item.date);
    setStartTime(item.startTime);
    setDuration(item.duration);
    setCustomDuration("");
    setUrl(item.url);
    const bList = (item.batch && item.batch !== 'All Batches') ? (item.batch || "").split(',').map((s) => s.trim()).filter(Boolean) : [];
    setSelectedBatches(bList);
    setDescription(item.description || "");
    setShowCreateModal(true);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!title.trim()) {
      alert("Please enter a title for the assessment.");
      return;
    }

    if (!date) {
      alert("Please select an assessment date.");
      return;
    }

    if (!url.trim()) {
      alert("Please provide the HackerRank or challenge URL link.");
      return;
    }

    let effectiveDuration = duration;

    if (duration === "Custom") {
      const minutes = Number(customDuration);

      if (!customDuration.trim() || !Number.isFinite(minutes) || minutes < 5) {
        alert("Please enter a valid custom duration of at least 5 minutes.");
        return;
      }

      effectiveDuration = `${minutes} Mins`;
    }

    // Students see assessments for their own batch.
    const batches =
      selectedBatches.length === 0
        ? globalBatchOptions.map((o) => o.value)
        : selectedBatches;
    if (batches.length === 0) {
      alert("No batches exist yet. The administrator creates them with each college.");
      return;
    }

    try {
      await hackerrankService.save(
        {
          ...(editingId ? { id: editingId } : {}),
          title: title.trim(),
          type,
          date,
          startTime: startTime.trim(),
          duration: effectiveDuration,
          url: url.trim(),
          batch: selectedBatches.length > 0 ? selectedBatches.join(", ") : "All Batches",
          description: description.trim(),
        },
        batches,
      );
      showNotification(
        editingId
          ? `"${title.trim()}" challenge updated successfully!`
          : `"${title.trim()}" challenge created and published successfully!`
      );
      setShowCreateModal(false);
      resetForm();
      await reloadChallenges();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Could not save the assessment.");
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;

    try {
      await hackerrankService.remove(itemToDelete.id);
      showNotification(`Assessment "${itemToDelete.title}" deleted.`);
      setItemToDelete(null);
      await reloadChallenges();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Could not delete the assessment.");
    }
  };

  const handleCopyLink = async (challengeUrl: string, id: string) => {
    try {
      await navigator.clipboard.writeText(challengeUrl);
      setCopiedId(id);

      setTimeout(() => {
        setCopiedId(null);
      }, 2500);
    } catch (error) {
      console.error("Failed to copy challenge URL:", error);
      showNotification("Unable to copy the link. Please copy it manually.");
    }
  };

  // Filtered assessment list.
  const filteredChallenges = useMemo(() => {
    return challenges.filter((item) => {
      const search = searchTerm.toLowerCase();

      const matchSearch =
        item.title.toLowerCase().includes(search) ||
        item.type.toLowerCase().includes(search) ||
        (item.batch && item.batch.toLowerCase().includes(search)) ||
        (item.description &&
          item.description.toLowerCase().includes(search));

      const matchType = filterType === "All" || item.type === filterType;

      const matchBatch =
        filterBatches.length === 0 ||
        filterBatches.some((b) =>
          item.batch === "All Batches" ||
          (item.batch || "").split(", ").map((s) => s.trim()).includes(b)
        );

      return Boolean(matchSearch && matchType && matchBatch);
    });
  }, [challenges, searchTerm, filterType, filterBatches]);

  return (
    <div className="min-h-screen bg-gray-50/60 p-3 sm:p-6 lg:p-8">
      {/* Toast notification */}
      {successToast && (
        <div className="fixed bottom-5 right-4 sm:right-6 z-50 flex max-w-sm items-center gap-3 rounded-xl bg-gray-900 px-4 py-3 sm:px-5 sm:py-3.5 text-xs sm:text-sm font-medium text-white shadow-2xl border border-gray-700 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <CheckCircle2
            size={18}
            className="text-green-400 shrink-0"
          />
          <span>{successToast}</span>
        </div>
      )}

      {/* Page header */}
      <div className="mb-6 sm:mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1b1c1e] px-3 py-1 text-xs font-semibold text-white">
              <Code2 size={13} className="text-[#d8bd96]" />
              HackerRank Integration
            </span>

            <span className="text-xs text-gray-500 font-medium">
              Assessment Management
            </span>
          </div>

          <h1 className="mt-2 text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-gray-900">
            HackerRank Coding & MCQ Challenges
          </h1>

          <p className="mt-1 text-xs sm:text-sm text-gray-500">
            Create, schedule, and distribute HackerRank coding challenges and
            MCQ assessments to your students.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 sm:px-5 sm:py-3 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-gray-800 active:scale-[0.98] transition cursor-pointer self-start sm:self-auto"
        >
          <Plus size={18} />
          <span>Create New Challenge</span>
        </button>
      </div>

      {/* Quick summary statistics */}
      <div className="mb-6 sm:mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-200/80 bg-white p-4 sm:p-5 shadow-xs">
          <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-gray-500">
            Total Challenges
          </p>

          <p className="mt-1 sm:mt-2 text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
            {challenges.length}
          </p>

          <p className="mt-0.5 sm:mt-1 text-[11px] text-gray-400">
            All published tests
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200/80 bg-white p-4 sm:p-5 shadow-xs">
          <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-gray-500">
            Coding Tests
          </p>

          <p className="mt-1 sm:mt-2 text-xl sm:text-2xl lg:text-3xl font-bold text-blue-600">
            {
              challenges.filter(
                (challenge) =>
                  challenge.type === "Coding" ||
                  challenge.type === "Coding + MCQ"
              ).length
            }
          </p>

          <p className="mt-0.5 sm:mt-1 text-[11px] text-gray-400">
            Problem solving challenges
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200/80 bg-white p-4 sm:p-5 shadow-xs">
          <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-gray-500">
            MCQ Tests
          </p>

          <p className="mt-1 sm:mt-2 text-xl sm:text-2xl lg:text-3xl font-bold text-amber-600">
            {challenges.filter((challenge) => challenge.type === "MCQ").length}
          </p>

          <p className="mt-0.5 sm:mt-1 text-[11px] text-gray-400">
            Objective evaluations
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200/80 bg-white p-4 sm:p-5 shadow-xs">
          <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-gray-500">
            Active / Upcoming
          </p>

          <p className="mt-1 sm:mt-2 text-xl sm:text-2xl lg:text-3xl font-bold text-green-600">
            {
              challenges.filter(
                (challenge) => challenge.status !== "Completed"
              ).length
            }
          </p>

          <p className="mt-0.5 sm:mt-1 text-[11px] text-gray-400">
            Ready for submissions
          </p>
        </div>
      </div>

      {/* Search and filter toolbar */}
      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-gray-200/80 bg-white p-3.5 sm:p-4 shadow-xs md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1">
          <Search
            size={17}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
          />

          <input
            type="text"
            placeholder="Search challenges by title, format, batch..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2 sm:py-2.5 pl-10 pr-4 text-xs sm:text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-gray-900 focus:bg-white transition"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
          {/* Filter by assessment type */}
          <div className="w-full sm:w-44">
            <CustomSelect
              value={filterType}
              onChange={(value) => setFilterType(value)}
              options={[
                { value: "All", label: "All Formats" },
                { value: "Coding", label: "Coding Only" },
                { value: "MCQ", label: "MCQ Only" },
                { value: "Coding + MCQ", label: "Coding + MCQ" },
              ]}
            />
          </div>

          {/* Filter by batch */}
          <div className="w-full sm:w-52">
            <MultiSelectChecklist
              values={filterBatches}
              onChange={setFilterBatches}
              options={globalBatchOptions}
              placeholder="All Batches"
              allLabel="All Batches"
            />
          </div>
        </div>
      </div>

      {/* Assessment cards */}
      <div>
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base sm:text-lg font-bold text-gray-900">
            Created Challenges & Tests ({filteredChallenges.length})
          </h2>

          {filteredChallenges.length > 0 && (
            <p className="text-xs text-gray-500">
              Click "Open Challenge" to launch or copy the link to share with
              students.
            </p>
          )}
        </div>

        {filteredChallenges.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 sm:p-12 text-center shadow-xs">
            <div className="mx-auto flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-500">
              <Code2 size={26} />
            </div>

            <h3 className="mt-3 sm:mt-4 text-sm sm:text-base font-semibold text-gray-900">
              No challenges found
            </h3>

            <p className="mt-1 text-xs sm:text-sm text-gray-500 max-w-sm mx-auto">
              {searchTerm ||
              filterType !== "All" ||
              filterBatches.length > 0
                ? "Try clearing your filters or search term to see more results."
                : "Get started by creating your first HackerRank Coding or MCQ test for students."}
            </p>

            <button
              type="button"
              onClick={handleOpenCreate}
              className="mt-4 sm:mt-5 inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-gray-800 transition"
            >
              <Plus size={16} />
              <span>Create Challenge</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredChallenges.map((item) => {
              const isCopied = copiedId === item.id;
              const isCoding =
                item.type === "Coding" || item.type === "Coding + MCQ";

              return (
                <div
                  key={item.id}
                  className="group relative flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-xs transition hover:border-gray-300 hover:shadow-md"
                >
                  <div>
                    {/* Type badge and card actions */}
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] sm:text-xs font-bold tracking-wide uppercase ${
                            isCoding
                              ? "bg-blue-50 text-blue-700 border border-blue-200/70"
                              : "bg-amber-50 text-amber-700 border border-amber-200/70"
                          }`}
                        >
                          {isCoding ? (
                            <Laptop size={13} />
                          ) : (
                            <ListFilter size={13} />
                          )}

                          {item.type}
                        </span>

                        {item.batch && (
                          <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-gray-600">
                            {item.batch}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setReviewing(item)}
                          className="rounded-lg px-2 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-50 transition"
                          title="Review student submissions"
                        >
                          Review
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
                          title="Edit Assessment"
                          aria-label={`Edit ${item.title}`}
                        >
                          <Edit3 size={15} />
                        </button>

                        <button
                          type="button"
                          onClick={() => setItemToDelete(item)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition"
                          title="Delete Assessment"
                          aria-label={`Delete ${item.title}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    {/* Assessment title */}
                    <h3 className="text-sm sm:text-base font-bold text-gray-900 group-hover:text-blue-600 transition line-clamp-1">
                      {item.title}
                    </h3>

                    {/* Assessment description */}
                    {item.description && (
                      <p className="mt-1 text-xs text-gray-500 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}

                    {/* Date, time, and duration */}
                    <div className="mt-3.5 grid grid-cols-2 gap-2 rounded-xl border border-gray-100 bg-gray-50/70 p-2.5 sm:p-3 text-xs text-gray-600">
                      <div className="flex items-center gap-1.5 truncate">
                        <Calendar
                          size={13}
                          className="text-gray-400 shrink-0"
                        />
                        <span className="font-medium truncate">
                          {item.date}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 truncate">
                        <Clock
                          size={13}
                          className="text-gray-400 shrink-0"
                        />
                        <span className="font-medium truncate">
                          {item.startTime}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 col-span-2">
                        <Timer
                          size={13}
                          className="text-gray-400 shrink-0"
                        />
                        <span className="font-medium">
                          Duration:{" "}
                          <strong className="text-gray-800">
                            {item.duration}
                          </strong>
                        </span>
                      </div>
                    </div>

                    {/* Challenge URL */}
                    <div className="mt-3 flex items-center justify-between rounded-xl border border-gray-200/80 bg-gray-50 px-2.5 py-1.5 text-xs">
                      <div className="min-w-0 flex-1 truncate font-mono text-[11px] text-gray-600">
                        {item.url}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopyLink(item.url, item.id)}
                        className={`ml-2 inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition ${
                          isCopied
                            ? "bg-green-100 text-green-800"
                            : "bg-white text-gray-700 shadow-2xs hover:bg-gray-100 border border-gray-200"
                        }`}
                        title="Copy challenge URL"
                      >
                        {isCopied ? (
                          <>
                            <Check
                              size={12}
                              className="text-green-600"
                            />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy
                              size={12}
                              className="text-gray-500"
                            />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Primary actions */}
                  <div className="mt-4 pt-3 border-t border-gray-100 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-gray-900 px-3.5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-gray-800 transition"
                      >
                        <span>Open Challenge</span>
                        <ExternalLink size={13} />
                      </a>

                      <button
                        type="button"
                        onClick={() => handleCopyLink(item.url, item.id)}
                        className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white p-2.5 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition"
                        title="Share / Copy Link"
                        aria-label={`Copy link for ${item.title}`}
                      >
                        <Share2 size={14} />
                      </button>
                    </div>

                    <Link
                      to={`/results?assessment=${encodeURIComponent(item.title)}`}
                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-[#FAF7F2] px-3.5 py-2 text-xs font-semibold text-[#1B1C1E] shadow-2xs hover:bg-[#E9DED0] hover:border-gray-400 transition"
                    >
                      <Eye size={13} className="text-gray-700" />
                      <span>View Result</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create/edit assessment modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-3 sm:p-6 transition-opacity animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-labelledby="assessment-modal-title"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0"
            onClick={() => {
              setShowCreateModal(false);
              resetForm();
            }}
            aria-hidden="true"
          />

          {/* Modal container */}
          <div className="flex min-h-full items-start sm:items-center justify-center py-4 sm:py-8">
            <div className="relative z-10 flex max-h-[90vh] sm:max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
              {/* Modal header */}
              <div className="sticky top-0 z-20 flex shrink-0 items-center justify-between border-b border-gray-100 bg-white px-5 py-4 sm:px-6 shadow-2xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1b1c1e] text-white">
                    <Code2
                      size={20}
                      className="text-[#d8bd96]"
                    />
                  </div>

                  <div className="min-w-0">
                    <h2
                      id="assessment-modal-title"
                      className="text-base sm:text-lg font-bold text-gray-900 truncate"
                    >
                      {editingId
                        ? "Edit HackerRank Challenge"
                        : "Create New HackerRank Challenge"}
                    </h2>

                    <p className="text-xs text-gray-500 truncate">
                      Enter details, schedule, duration and provide the
                      HackerRank link.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition shrink-0 ml-2"
                  aria-label="Close dialog"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable form */}
              <form
                onSubmit={handleSubmit}
                className="flex flex-1 flex-col overflow-hidden"
              >
                <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6 space-y-4 sm:space-y-5">
                  {/* 1. Assessment title */}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-700">
                      Challenge Title *
                    </label>

                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder="e.g. DudexAI Coding Challenge 2"
                      className="w-full min-w-0 box-border rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition"
                    />
                  </div>

                  {/* 2. Assessment format */}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-700">
                      Assessment Format *
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {(
                        ["Coding", "MCQ", "Coding + MCQ"] as AssessmentType[]
                      ).map((assessmentType) => (
                        <button
                          key={assessmentType}
                          type="button"
                          onClick={() => setType(assessmentType)}
                          className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-bold transition cursor-pointer ${
                            type === assessmentType
                              ? "border-gray-900 bg-gray-900 text-white shadow-xs"
                              : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          {assessmentType === "Coding" && (
                            <Laptop size={14} />
                          )}

                          {assessmentType === "MCQ" && (
                            <ListFilter size={14} />
                          )}

                          {assessmentType === "Coding + MCQ" && (
                            <Sparkles size={14} />
                          )}

                          <span>{assessmentType}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. Responsive assessment date and start time */}
                  <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="min-w-0 w-full">
                      <ResponsiveDatePicker
                        label="Assessment Date"
                        value={date}
                        minDate={getLocalToday()}
                        onChange={setDate}
                      />
                    </div>

                    <div className="min-w-0 w-full">
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-700">
                        Start Time *
                      </label>

                      <input
                        type="text"
                        required
                        value={startTime}
                        onChange={(event) =>
                          setStartTime(event.target.value)
                        }
                        placeholder="e.g. 10:00 AM"
                        className="w-full min-w-0 box-border rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition"
                      />
                    </div>
                  </div>

                  {/* 4. Assessment duration */}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-700">
                      Total Duration *
                    </label>

                    <div className="flex flex-wrap items-center gap-2">
                      {[
                        "30 Mins",
                        "45 Mins",
                        "60 Mins",
                        "90 Mins",
                        "120 Mins",
                        "Custom",
                      ].map((durationOption) => (
                        <button
                          key={durationOption}
                          type="button"
                          onClick={() => setDuration(durationOption)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                            duration === durationOption
                              ? "bg-gray-900 text-white"
                              : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          {durationOption}
                        </button>
                      ))}
                    </div>

                    {duration === "Custom" && (
                      <div className="mt-2.5 flex items-center gap-2">
                        <input
                          type="number"
                          min="5"
                          step="1"
                          required
                          placeholder="Minutes (e.g. 75)"
                          value={customDuration}
                          onChange={(event) =>
                            setCustomDuration(event.target.value)
                          }
                          className="w-36 rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
                        />

                        <span className="text-xs text-gray-500 font-medium">
                          Minutes
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 5. Target batches */}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-700">
                      Target Batches
                    </label>

                    <MultiSelectChecklist
                      values={selectedBatches}
                      onChange={setSelectedBatches}
                      options={globalBatchOptions}
                      placeholder="Select Batches"
                      allLabel="All Batches"
                    />
                  </div>

                  {/* 6. Assessment URL */}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-700">
                      HackerRank / Assessment URL Link *
                    </label>

                    <input
                      type="url"
                      required
                      value={url}
                      onChange={(event) => setUrl(event.target.value)}
                      placeholder="https://www.hackerrank.com/your-challenge"
                      className="w-full min-w-0 box-border rounded-xl border border-gray-300 px-3.5 py-2.5 text-xs sm:text-sm text-gray-900 outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition font-mono"
                    />

                    <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-gray-500">
                      <Info
                        size={13}
                        className="text-gray-400 shrink-0"
                      />

                      <span>
                        Students will be directed to this test URL when they
                        click "Open Challenge".
                      </span>
                    </p>
                  </div>

                  {/* 7. Description and instructions */}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-700">
                      Description / Instructions (Optional)
                    </label>

                    <textarea
                      rows={2}
                      value={description}
                      onChange={(event) =>
                        setDescription(event.target.value)
                      }
                      placeholder="Provide test instructions, problem topics, or passing requirements..."
                      className="w-full min-w-0 box-border rounded-xl border border-gray-300 px-3.5 py-2 text-xs sm:text-sm text-gray-900 outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition"
                    />
                  </div>
                </div>

                {/* Sticky footer actions */}
                <div className="sticky bottom-0 z-20 flex shrink-0 items-center justify-end gap-2.5 border-t border-gray-100 bg-gray-50/95 px-5 py-3 sm:px-6 backdrop-blur-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-gray-800 active:scale-[0.98] transition cursor-pointer"
                  >
                    <CheckCircle2 size={16} />

                    <span>
                      {editingId ? "Save Changes" : "Create & Display"}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      <DeleteModal
        isOpen={!!itemToDelete}
        title="Delete HackerRank Assessment"
        itemName={itemToDelete?.title}
        message="Are you sure you want to delete this challenge? Students will no longer see this test in their dashboard."
        onClose={() => setItemToDelete(null)}
        onConfirm={handleDelete}
      />

      {reviewing && (
        <SubmissionsReview challenge={reviewing} onClose={() => setReviewing(null)} />
      )}
    </div>
  );
}

// Students self-report their HackerRank marks with a screenshot; the teacher
// checks the screenshot, then verifies (publishing to results) or rejects.
function SubmissionsReview({
  challenge,
  onClose,
}: {
  challenge: HackerRankChallenge;
  onClose: () => void;
}) {
  const [items, setItems] = useState<HackerRankSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    try {
      const list = await hackerrankService.getSubmissions(challenge.id);
      setItems(list);
      setScores(Object.fromEntries(list.map((s) => [s.id, String(s.verifiedScore ?? s.reportedScore)])));
      setNotes(Object.fromEntries(list.map((s) => [s.id, s.reviewNote])));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load submissions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challenge.id]);

  const act = async (s: HackerRankSubmission, action: "verify" | "reject") => {
    setBusyId(s.id);
    try {
      if (action === "verify") {
        const score = Number(scores[s.id]);
        if (!Number.isFinite(score)) throw new Error("Enter a valid score (0–100).");
        await hackerrankService.verify(challenge, s, score, notes[s.id] || "");
      } else {
        await hackerrankService.reject(s, notes[s.id] || "");
      }
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not save the review.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 p-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Submissions · {challenge.title}</h2>
            <p className="text-xs text-gray-500">Verify each student's reported score against their screenshot.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="divide-y divide-gray-100">
          {loading && <p className="p-5 text-sm text-gray-500">Loading submissions…</p>}
          {error && <p className="p-5 text-sm text-red-600">{error}</p>}
          {!loading && !error && items.length === 0 && (
            <p className="p-8 text-center text-sm text-gray-500">No students have submitted results yet.</p>
          )}
          {items.map((s) => (
            <div key={s.id} className="flex flex-col gap-3 p-5 sm:flex-row">
              {s.screenshotUrl ? (
                <a href={s.screenshotUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
                  <img src={s.screenshotUrl} alt={`${s.student} result screenshot`} className="h-28 w-44 rounded-lg border border-gray-200 object-cover" />
                </a>
              ) : (
                <div className="flex h-28 w-44 shrink-0 items-center justify-center rounded-lg border border-dashed border-gray-300 text-xs text-gray-400">
                  No screenshot
                </div>
              )}
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-gray-900">{s.student}</p>
                  {s.rrn && <span className="text-xs text-gray-500">{s.rrn}</span>}
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      s.status === "Verified"
                        ? "bg-green-50 text-green-700"
                        : s.status === "Rejected"
                          ? "bg-red-50 text-red-700"
                          : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {s.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Reported {s.reportedScore}/100 · {s.submittedAt ? new Date(s.submittedAt).toLocaleString() : ""}
                </p>
                <div className="flex flex-wrap items-end gap-2">
                  <label className="text-xs text-gray-700">
                    Verified score
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={scores[s.id] ?? ""}
                      onChange={(e) => setScores({ ...scores, [s.id]: e.target.value })}
                      className="mt-1 block w-24 rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                    />
                  </label>
                  <label className="min-w-[160px] flex-1 text-xs text-gray-700">
                    Note
                    <input
                      type="text"
                      value={notes[s.id] ?? ""}
                      onChange={(e) => setNotes({ ...notes, [s.id]: e.target.value })}
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={busyId === s.id}
                    onClick={() => void act(s, "verify")}
                    className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
                  >
                    Verify & publish
                  </button>
                  <button
                    type="button"
                    disabled={busyId === s.id}
                    onClick={() => void act(s, "reject")}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}