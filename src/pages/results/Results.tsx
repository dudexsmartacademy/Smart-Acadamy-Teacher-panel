import {
  BarChart3,
  CheckCircle,
  CheckCircle2,
  ExternalLink,
  Eye,
  FileCheck,
  FileText,
  Filter,
  Image as ImageIcon,
  Maximize2,
  Search,
  TrendingDown,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import CustomSelect from "../../components/CustomSelect";
import MultiSelectChecklist from "../../components/MultiSelectChecklist";
import { useBatchOptions } from "../../hooks/useBatchOptions";
import {
  createScorecardSvg,
  type StudentAssessmentRecord,
  type StudentResultSummary,
} from "../../data/resultsData";
import { resultService } from "../../services/resultService";

// Submission timestamps are stored in UTC; show them in academy time (IST).
function formatSubmittedAt(value: string): string {
  const date = new Date(value);
  if (!value || isNaN(date.getTime())) return value || '—';
  return date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
}

export default function Results() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryAssessment = searchParams.get("assessment");
  const queryBatch = searchParams.get("batch");

  const [search, setSearch] = useState("");
  const [batchFilter, setBatchFilter] = useState<string>(
    () => queryBatch || "All"
  );
  const [selectedBatches, setSelectedBatches] = useState<string[]>(() => queryBatch && queryBatch !== "All" ? [queryBatch] : []);
  const { options: globalBatchOptions, loading: batchesLoading } = useBatchOptions();
  const [assessmentFilter, setAssessmentFilter] = useState<string>(
    () => queryAssessment || "All"
  );

  const [allResults, setAllResults] = useState<StudentResultSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setIsLoading(true);
      setFetchError(null);
      const res = await resultService.getComprehensiveResults();
      if (!isMounted) return;
      if (res.error) {
        setFetchError(res.error);
        setAllResults([]);
      } else {
        setAllResults(res.data);
      }
      setIsLoading(false);
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Sync state if URL query params change
  useEffect(() => {
    if (queryAssessment) {
      setAssessmentFilter(queryAssessment);
    }
  }, [queryAssessment]);

  useEffect(() => {
    if (queryBatch) {
      setBatchFilter(queryBatch);
    }
  }, [queryBatch]);

  // Selected student for quick inspection modal
  const [inspectStudent, setInspectStudent] =
    useState<StudentResultSummary | null>(null);
  const [isScreenshotZoomed, setIsScreenshotZoomed] = useState(false);
  const [facultyFeedback, setFacultyFeedback] = useState("");
  const [feedbackSaved, setFeedbackSaved] = useState(false);

  const baseResults = useMemo<StudentResultSummary[]>(() => {
    if (assessmentFilter !== "All") {
      return allResults.filter(
        (r) => r.assessment.toLowerCase() === assessmentFilter.toLowerCase()
      );
    }
    return allResults;
  }, [allResults, assessmentFilter]);

  const allAvailableAssessments = useMemo(() => {
    const list = [...new Set(allResults.map((r) => r.assessment))].filter(Boolean);

    if (queryAssessment && !list.includes(queryAssessment)) {
      list.push(queryAssessment);
    }

    return list.sort();
  }, [allResults, queryAssessment]);

  const cleanBatchName = (b?: string) => {
    if (!b) return 'Batch 1';
    const match = b.match(/Batch\s*\d+/i);
    return match ? match[0] : b;
  };

  

  const filteredResults = useMemo(() => {
    return baseResults.filter((result) => {
      const searchText = search.toLowerCase();
      const cleanB = cleanBatchName(result.batch);

      const searchMatch =
        result.student.toLowerCase().includes(searchText) ||
        result.rrn.toLowerCase().includes(searchText) ||
        result.assessment.toLowerCase().includes(searchText) ||
        cleanB.toLowerCase().includes(searchText);

      const batchMatch =
        (batchFilter === "All" || cleanB === batchFilter || result.batch === batchFilter) &&
        (selectedBatches.length === 0 || selectedBatches.includes(cleanB) || selectedBatches.includes(result.batch));

      const assessmentMatch =
        assessmentFilter === "All" ||
        result.assessment.toLowerCase() === assessmentFilter.toLowerCase();

      return searchMatch && batchMatch && assessmentMatch;
    });
  }, [baseResults, search, batchFilter, selectedBatches, assessmentFilter]);

  const numberAssigned = filteredResults.length;
  const numberAttempted = filteredResults.length;
  const numberSubmitted = filteredResults.filter(
    (result) => result.status === "Submitted"
  ).length;

  const average =
    filteredResults.length > 0
      ? filteredResults.reduce((sum, result) => sum + result.percentage, 0) /
        filteredResults.length
      : 0;

  const highest =
    filteredResults.length > 0
      ? Math.max(...filteredResults.map((result) => result.percentage))
      : 0;

  const lowest =
    filteredResults.length > 0
      ? Math.min(...filteredResults.map((result) => result.percentage))
      : 0;

  const passPercentage =
    filteredResults.length > 0
      ? (filteredResults.filter((result) => result.percentage >= 40).length /
          filteredResults.length) *
        100
      : 0;

  const handleAssessmentChange = (val: string) => {
    setAssessmentFilter(val);
    const newParams = new URLSearchParams(searchParams);
    if (val === "All") {
      newParams.delete("assessment");
    } else {
      newParams.set("assessment", val);
    }
    setSearchParams(newParams);
  };

  

  const handleOpenInspect = (student: StudentResultSummary) => {
    setInspectStudent(student);
    setFacultyFeedback("");
    setFeedbackSaved(false);
  };

  const handleSaveFeedback = () => {
    if (!facultyFeedback.trim()) return;
    setFeedbackSaved(true);
    setTimeout(() => setFeedbackSaved(false), 3000);
  };

  const activeTestRecord: StudentAssessmentRecord | undefined =
    inspectStudent?.completedAssessments?.[0];

  return (
    <div className="p-3.5 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Results
          </h1>

          <p className="mt-1 text-xs text-gray-500 sm:text-sm">
            {assessmentFilter !== "All" ? (
              <span>
                Viewing submissions for: <strong className="text-gray-900">{assessmentFilter}</strong>
              </span>
            ) : (
              "View assessment results and student performance"
            )}
          </p>
        </div>

        {assessmentFilter !== "All" && (
          <button
            type="button"
            onClick={() => handleAssessmentChange("All")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            <X size={14} />
            Clear Assessment Filter
          </button>
        )}
      </div>

      {/* Statistics */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-50 p-2.5 text-blue-600">
              <Users size={20} />
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Number Assigned
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {numberAssigned}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-yellow-50 p-2.5 text-yellow-600">
              <FileText size={20} />
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Number Attempted
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {numberAttempted}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-50 p-2.5 text-green-600">
              <CheckCircle2 size={20} />
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Number Submitted
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {numberSubmitted}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-50 p-2.5 text-purple-600">
              <BarChart3 size={20} />
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Average
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {average.toFixed(2)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Statistics */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <TrendingUp
              size={20}
              className="text-green-600"
            />

            <div>
              <p className="text-sm text-gray-500">
                Highest
              </p>

              <p className="text-xl font-bold text-gray-900">
                {highest.toFixed(2)}%
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <TrendingDown
              size={20}
              className="text-red-600"
            />

            <div>
              <p className="text-sm text-gray-500">
                Lowest
              </p>

              <p className="text-xl font-bold text-gray-900">
                {lowest.toFixed(2)}%
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <CheckCircle2
              size={20}
              className="text-blue-600"
            />

            <div>
              <p className="text-sm text-gray-500">
                Pass Percentage
              </p>

              <p className="text-xl font-bold text-gray-900">
                {passPercentage.toFixed(2)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters with Batches & Assessment Options */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              placeholder="Search student, RRN, or assessment..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500"
            />
          </div>

          {/* Batches Dropdown */}
          <div className="w-full lg:w-52">
            <MultiSelectChecklist
              values={selectedBatches}
              onChange={setSelectedBatches}
              options={globalBatchOptions}
              placeholder="All Batches"
              allLabel="All Batches"
              disabled={batchesLoading}
            />
          </div>

          {/* Assessments Dropdown */}
          <div className="w-full lg:w-72">
            <CustomSelect
              value={assessmentFilter}
              onChange={handleAssessmentChange}
              options={[
                { value: "All", label: "All Assessments" },
                ...allAvailableAssessments.map((a) => ({ value: a, label: a })),
              ]}
            />
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                  Student
                </th>

                <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                  Batch
                </th>

                <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                  Assessment
                </th>

                <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                  Attempt
                </th>

                <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                  Score
                </th>

                <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                  Percentage
                </th>

                <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                  Grade
                </th>

                <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                  Submitted At
                </th>

                <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                  Status
                </th>

                <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500 text-center">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {filteredResults.map((result) => (
                <tr
                  key={result.id}
                  className="hover:bg-gray-50 transition"
                >
                  <td className="px-5 py-4">
                    <div>
                      <span className="font-medium text-gray-900 block">
                        {result.student}
                      </span>
                      <span className="text-xs text-gray-500">
                        {result.rrn} • {result.department}
                      </span>
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <span className="inline-flex items-center rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                      {cleanBatchName(result.batch)}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-sm text-gray-600">
                    {result.assessment}
                  </td>

                  <td className="px-5 py-4 text-sm text-gray-600">
                    {result.attempt}
                  </td>

                  <td className="px-5 py-4 text-sm font-semibold text-gray-900">
                    {result.score}/{result.totalMarks}
                  </td>

                  <td className="px-5 py-4 text-sm font-medium text-gray-700">
                    {result.percentage.toFixed(2)}%
                  </td>

                  <td className="px-5 py-4">
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                      {result.grade}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-sm text-gray-600">
                    {formatSubmittedAt(result.submittedAt)}
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        result.status === "Submitted"
                          ? "bg-green-50 text-green-700"
                          : "bg-yellow-50 text-yellow-700"
                      }`}
                    >
                      {result.status}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-center">
                    <button
                      type="button"
                      onClick={() => handleOpenInspect(result)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition shadow-xs"
                      title="Inspect student submission & scorecard screenshot"
                    >
                      <Eye size={15} />
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-sm text-gray-500">
            Loading assessment results from database...
          </div>
        ) : fetchError ? (
          <div className="py-12 text-center text-sm font-medium text-red-600">
            Failed to load results: {fetchError}
          </div>
        ) : filteredResults.length === 0 && (
          <div className="py-12 text-center">
            <Filter size={32} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">
              No results found matching your filters.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Try selecting "All Batches" or clearing your search query.
            </p>
          </div>
        )}
      </div>

      {/* STUDENT SUBMISSION & RESULT SCREENSHOT MODAL */}
      {inspectStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fadeIn">
          <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 bg-[#f9fafb] px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 p-2 text-blue-700">
                  <FileCheck size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-gray-900">
                      {inspectStudent.student} — {inspectStudent.assessment}
                    </h3>
                  </div>
                  <p className="text-xs text-gray-500">
                    Registration: {inspectStudent.rrn} • {inspectStudent.batch} • {inspectStudent.department}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setInspectStudent(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Submission Stats Metrics */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3.5">
                  <p className="text-xs font-medium text-gray-500">Assessment</p>
                  <p className="mt-1 text-sm font-bold text-gray-900 truncate">
                    {inspectStudent.assessment}
                  </p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3.5">
                  <p className="text-xs font-medium text-gray-500">Submitted At</p>
                  <p className="mt-1 text-sm font-bold text-gray-900">
                    {formatSubmittedAt(inspectStudent.submittedAt)}
                  </p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3.5">
                  <p className="text-xs font-medium text-gray-500">Student Score</p>
                  <p className="mt-1 text-base font-extrabold text-emerald-700">
                    {inspectStudent.score} / {inspectStudent.totalMarks}
                  </p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3.5">
                  <p className="text-xs font-medium text-gray-500">Obtained %</p>
                  <p className="mt-1 text-base font-extrabold text-[#b45309]">
                    {inspectStudent.percentage.toFixed(1)}% (Grade {inspectStudent.grade})
                  </p>
                </div>
              </div>

              {/* Uploaded Result Screenshot Section */}
              <div className="rounded-xl border border-[#e2e8f0] bg-slate-900 text-white overflow-hidden shadow-md">
                <div className="flex items-center justify-between bg-slate-800/90 px-4 py-3 border-b border-slate-700">
                  <div className="flex items-center gap-2">
                    <ImageIcon size={16} className="text-sky-400" />
                    <span className="text-xs font-semibold tracking-wide uppercase text-slate-200">
                      Student Uploaded Result Screenshot & Verified Scorecard
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsScreenshotZoomed(true)}
                    className="inline-flex items-center gap-1 rounded bg-slate-700 px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-slate-600 transition"
                  >
                    <Maximize2 size={13} />
                    Full Screen
                  </button>
                </div>

                {/* Scorecard Visual Display */}
                <div className="p-4 sm:p-6 bg-slate-950 flex items-center justify-center">
                  <div
                    onClick={() => setIsScreenshotZoomed(true)}
                    className="group relative max-w-2xl w-full cursor-zoom-in overflow-hidden rounded-xl border border-slate-700 shadow-xl transition hover:border-sky-500"
                  >
                    <img
                      src={activeTestRecord?.resultScreenshotUrl || createScorecardSvg(
                        activeTestRecord?.testTitle || 'Assessment',
                        inspectStudent.student,
                        inspectStudent.rrn,
                        activeTestRecord?.score || 0,
                        activeTestRecord?.maxMarks || 100,
                        activeTestRecord?.type || 'Coding',
                        activeTestRecord?.date || new Date().toLocaleDateString(),
                        activeTestRecord?.percentage || 0
                      )}
                      alt={`${inspectStudent.student} Result Scorecard`}
                      className="w-full h-auto object-contain transition duration-200 group-hover:scale-[1.01]"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.onerror = null;
                        target.src = createScorecardSvg(
                          activeTestRecord?.testTitle || 'Assessment',
                          inspectStudent.student,
                          inspectStudent.rrn,
                          activeTestRecord?.score || 0,
                          activeTestRecord?.maxMarks || 100,
                          activeTestRecord?.type || 'Coding',
                          activeTestRecord?.date || new Date().toLocaleDateString(),
                          activeTestRecord?.percentage || 0
                        );
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                      <span className="rounded-full bg-black/80 px-4 py-2 text-xs font-semibold text-white shadow backdrop-blur-sm flex items-center gap-2">
                        <Maximize2 size={14} /> Click to Expand Screenshot
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800/60 px-4 py-2.5 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800">
                  <span>✓ Uploaded on {formatSubmittedAt(inspectStudent.submittedAt)}</span>
                  <span className="text-emerald-400 font-medium">Status: Self-Submitted & Verified</span>
                </div>
              </div>

              {/* Student Self-Submission Notes */}
              {activeTestRecord?.studentNotes && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-xs sm:text-sm text-amber-900">
                  <span className="font-semibold block mb-0.5">Student Remarks / Submission Memo:</span>
                  <p className="text-amber-800 italic">"{activeTestRecord.studentNotes}"</p>
                </div>
              )}

              {/* Faculty Review & Feedback */}
              <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Faculty Verification & Remarks
                </label>
                <textarea
                  rows={2}
                  value={facultyFeedback}
                  onChange={(e) => setFacultyFeedback(e.target.value)}
                  placeholder="Enter remarks or verified comments for this student's result..."
                  className="w-full rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
                />

                <div className="flex items-center justify-between pt-1">
                  {feedbackSaved ? (
                    <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                      <CheckCircle size={14} /> Verification remarks recorded!
                    </span>
                  ) : (
                    <span className="text-xs text-gray-500">
                      Result verified against student test submission log.
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={handleSaveFeedback}
                    className="rounded-lg bg-gray-900 px-4 py-2 text-xs font-semibold text-white hover:bg-gray-800 transition"
                  >
                    Save Remarks
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-3">
              <Link
                to={`/results/${inspectStudent.id}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800"
              >
                <span>View Full Academic Profile & All Test History</span>
                <ExternalLink size={13} />
              </Link>

              <button
                type="button"
                onClick={() => setInspectStudent(null)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Screenshot Lightbox */}
      {isScreenshotZoomed && activeTestRecord && (
        <div
          onClick={() => setIsScreenshotZoomed(false)}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-fadeIn cursor-zoom-out"
        >
          <div className="relative max-w-5xl w-full p-2" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setIsScreenshotZoomed(false)}
              className="absolute -top-10 right-0 rounded-full bg-white/20 p-2 text-white hover:bg-white/40 transition"
            >
              <X size={20} />
            </button>
            <img
              src={activeTestRecord.resultScreenshotUrl || createScorecardSvg(
                activeTestRecord?.testTitle || 'Assessment',
                inspectStudent?.student || '',
                inspectStudent?.rrn || '',
                activeTestRecord?.score || 0,
                activeTestRecord?.maxMarks || 100,
                activeTestRecord?.type || 'Coding',
                activeTestRecord?.date || new Date().toLocaleDateString(),
                activeTestRecord?.percentage || 0
              )}
              alt="Full Scorecard"
              className="w-full h-auto rounded-2xl shadow-2xl border border-white/20"
              onError={(e) => {
                const target = e.currentTarget;
                target.onerror = null;
                target.src = createScorecardSvg(
                  activeTestRecord?.testTitle || 'Assessment',
                  inspectStudent?.student || '',
                  inspectStudent?.rrn || '',
                  activeTestRecord?.score || 0,
                  activeTestRecord?.maxMarks || 100,
                  activeTestRecord?.type || 'Coding',
                  activeTestRecord?.date || new Date().toLocaleDateString(),
                  activeTestRecord?.percentage || 0
                );
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}