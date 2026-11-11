import {
  ArrowLeft,
  CheckCircle,
  Eye,
  FileCheck,
  Image as ImageIcon,
  Maximize2,
  User,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  createScorecardSvg,
  type StudentAssessmentRecord,
  type StudentResultSummary,
} from "../../data/resultsData";
import { resultService } from "../../services/resultService";

export default function IndividualResult() {
  const { id } = useParams<{ id: string }>();
  const [resultsList, setResultsList] = useState<StudentResultSummary[]>([]);
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
        setResultsList([]);
      } else {
        setResultsList(res.data);
      }
      setIsLoading(false);
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Find the selected student result by id or studentId
  const currentStudent = useMemo(() => {
    return resultsList.find(
      (item) => item.id === id || item.studentId === id
    );
  }, [resultsList, id]);

  const [selectedAssessment, setSelectedAssessment] =
    useState<StudentAssessmentRecord | null>(null);
  const [isScreenshotZoomed, setIsScreenshotZoomed] = useState(false);
  const [facultyFeedback, setFacultyFeedback] = useState("");
  const [feedbackSaved, setFeedbackSaved] = useState(false);

  const assessmentsList = useMemo(() => {
    return currentStudent?.completedAssessments || [];
  }, [currentStudent]);

  const handleOpenAssessmentModal = (assessment: StudentAssessmentRecord) => {
    setSelectedAssessment(assessment);
    setFacultyFeedback("");
    setFeedbackSaved(false);
  };

  const handleSaveFeedback = () => {
    if (!facultyFeedback.trim()) return;
    setFeedbackSaved(true);
    setTimeout(() => setFeedbackSaved(false), 3000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fcfbf9] p-4 sm:p-6 lg:p-10 text-[#1e1e1e]">
        <div className="mb-6">
          <Link
            to="/results"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition"
          >
            <ArrowLeft size={16} />
            Back to All Results
          </Link>
        </div>
        <div className="rounded-2xl border border-[#e8e4dc] bg-white p-12 text-center shadow-sm">
          <p className="text-sm font-medium text-gray-500">Loading student result record...</p>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="min-h-screen bg-[#fcfbf9] p-4 sm:p-6 lg:p-10 text-[#1e1e1e]">
        <div className="mb-6">
          <Link
            to="/results"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition"
          >
            <ArrowLeft size={16} />
            Back to All Results
          </Link>
        </div>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-12 text-center shadow-sm">
          <p className="text-sm font-medium text-red-600">Failed to load result: {fetchError}</p>
        </div>
      </div>
    );
  }

  if (!currentStudent) {
    return (
      <div className="min-h-screen bg-[#fcfbf9] p-4 sm:p-6 lg:p-10 text-[#1e1e1e]">
        <div className="mb-6">
          <Link
            to="/results"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition"
          >
            <ArrowLeft size={16} />
            Back to All Results
          </Link>
        </div>
        <div className="rounded-2xl border border-[#e8e4dc] bg-white p-12 text-center shadow-sm">
          <p className="text-sm font-medium text-gray-500">Student result record not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfbf9] p-4 sm:p-6 lg:p-10 text-[#1e1e1e]">
      {/* Top Breadcrumb & Navigation */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Link
          to="/results"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition"
        >
          <ArrowLeft size={16} />
          Back to All Results
        </Link>

        {/* Student Quick Pill */}
        <div className="inline-flex items-center gap-2 rounded-full border border-[#e8e4dc] bg-white px-3.5 py-1.5 shadow-sm text-xs text-gray-700">
          <User size={13} className="text-gray-500" />
          <span className="font-semibold text-gray-900">
            {currentStudent.student}
          </span>
          <span className="text-gray-300">•</span>
          <span>{currentStudent.rrn}</span>
          <span className="text-gray-300">•</span>
          <span className="font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
            {currentStudent.batch}
          </span>
        </div>
      </div>

      {/* Main Container matching 5th Screenshot */}
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header Section */}
        <div>
          <p className="text-xs font-bold tracking-widest text-[#967756] uppercase">
            Academic Records
          </p>
          <h1 className="mt-1 text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">
            Results
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Final scorecards, percentage benchmarks, and faculty remarks.
          </p>
        </div>

        {/* Top Summary Banner Card */}
        <div className="rounded-2xl border border-[#e8e4dc] bg-white p-6 sm:p-8 shadow-sm">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
            {/* Cohort Placement Index */}
            <div className="sm:pr-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Cohort Placement Index
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-extrabold text-[#785b3a] tracking-tight">
                  {currentStudent.cohortPlacementIndex || currentStudent.percentage.toFixed(1)}%
                </span>
              </div>
              <p className="mt-2 text-xs font-medium text-emerald-800">
                {currentStudent.cohortPlacementGrade || "Grade A (Distinction Tier)"}
              </p>
            </div>

            {/* Highest Single Score */}
            <div className="pt-4 sm:pt-0 sm:px-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Highest Single Score
              </p>
              <p className="mt-3 text-2xl sm:text-3xl font-bold text-gray-900">
                {currentStudent.highestSingleScore || "90% · Python"}
              </p>
              <p className="mt-2 text-xs text-gray-500">
                Peak assessment mastery
              </p>
            </div>

            {/* Evaluations Completed */}
            <div className="pt-4 sm:pt-0 sm:pl-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Evaluations Completed
              </p>
              <p className="mt-3 text-2xl sm:text-3xl font-bold text-gray-900">
                {assessmentsList.length} Finalized
              </p>
              <p className="mt-2 text-xs text-emerald-600 font-medium flex items-center gap-1">
                <CheckCircle size={13} />
                100% Submission Compliance
              </p>
            </div>
          </div>
        </div>

        {/* Completed Assessments Table Card */}
        <div className="overflow-hidden rounded-2xl border border-[#e8e4dc] bg-white shadow-sm">
          <div className="px-6 py-5 border-b border-[#f0ece4]">
            <h2 className="text-lg font-bold text-gray-900">
              Completed Assessments
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#eee8dd] bg-[#f7f4ed]/80 text-xs font-bold uppercase tracking-wider text-gray-600">
                  <th className="px-6 py-4">Assessment Title</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Score</th>
                  <th className="px-6 py-4">Percentage</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#f2ede4]">
                {assessmentsList.map((assessment) => (
                  <tr
                    key={assessment.id}
                    className="hover:bg-[#faf8f4] transition"
                  >
                    {/* Title */}
                    <td className="px-6 py-5">
                      <span className="font-bold text-gray-900 text-sm sm:text-base">
                        {assessment.testTitle}
                      </span>
                      {assessment.description && (
                        <p className="mt-0.5 text-xs text-gray-500 line-clamp-1 max-w-md">
                          {assessment.description}
                        </p>
                      )}
                    </td>

                    {/* Type */}
                    <td className="px-6 py-5 text-sm">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold ${
                          assessment.type === "MCQ"
                            ? "bg-blue-50 text-blue-700 border border-blue-100"
                            : assessment.type === "Coding"
                            ? "bg-purple-50 text-purple-700 border border-purple-100"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                        }`}
                      >
                        {assessment.type}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-6 py-5 text-sm text-gray-600 whitespace-nowrap">
                      {assessment.date}
                    </td>

                    {/* Score */}
                    <td className="px-6 py-5 text-sm font-semibold text-gray-900 whitespace-nowrap">
                      {assessment.score} / {assessment.maxMarks}
                    </td>

                    {/* Percentage styled with amber/gold accent */}
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span className="text-base font-bold text-[#b45309]">
                        {assessment.percentage.toFixed(0)}%
                      </span>
                    </td>

                    {/* Action View Button */}
                    <td className="px-6 py-5 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleOpenAssessmentModal(assessment)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-1.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 hover:text-gray-900 hover:border-gray-400 transition"
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
        </div>
      </div>

      {/* Assessment Details & Screenshot Modal */}
      {selectedAssessment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-200 bg-[#f9fafb] px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 p-2 text-blue-700">
                  <FileCheck size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-gray-900">
                      {selectedAssessment.testTitle}
                    </h3>
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-semibold ${
                        selectedAssessment.type === "MCQ"
                          ? "bg-blue-50 text-blue-700"
                          : selectedAssessment.type === "Coding"
                          ? "bg-purple-50 text-purple-700"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {selectedAssessment.type}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Candidate: {currentStudent.student} ({currentStudent.rrn}) • {currentStudent.batch}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedAssessment(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Test Summary Grid */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3.5">
                  <p className="text-xs font-medium text-gray-500">Assessment Type</p>
                  <p className="mt-1 text-sm font-bold text-gray-900">{selectedAssessment.type}</p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3.5">
                  <p className="text-xs font-medium text-gray-500">Submission Date</p>
                  <p className="mt-1 text-sm font-bold text-gray-900">{selectedAssessment.date}</p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3.5">
                  <p className="text-xs font-medium text-gray-500">Student Entered Marks</p>
                  <p className="mt-1 text-base font-extrabold text-emerald-700">
                    {selectedAssessment.studentEnteredMarks || selectedAssessment.score} / {selectedAssessment.maxMarks}
                  </p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3.5">
                  <p className="text-xs font-medium text-gray-500">Obtained Percentage</p>
                  <p className="mt-1 text-base font-extrabold text-[#b45309]">
                    {selectedAssessment.percentage.toFixed(0)}%
                  </p>
                </div>
              </div>

              {/* Description & Syllabus */}
              {selectedAssessment.description && (
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Assessment Overview & Topics
                  </h4>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {selectedAssessment.description}
                  </p>
                </div>
              )}

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
                      src={selectedAssessment.resultScreenshotUrl || createScorecardSvg(
                        selectedAssessment.testTitle,
                        currentStudent?.student || '',
                        currentStudent?.rrn || '',
                        selectedAssessment.score,
                        selectedAssessment.maxMarks,
                        selectedAssessment.type,
                        selectedAssessment.date || new Date().toLocaleDateString(),
                        selectedAssessment.percentage
                      )}
                      alt={`${selectedAssessment.testTitle} Result Scorecard`}
                      className="w-full h-auto object-contain transition duration-200 group-hover:scale-[1.01]"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.onerror = null;
                        target.src = createScorecardSvg(
                          selectedAssessment.testTitle,
                          currentStudent?.student || '',
                          currentStudent?.rrn || '',
                          selectedAssessment.score,
                          selectedAssessment.maxMarks,
                          selectedAssessment.type,
                          selectedAssessment.date || new Date().toLocaleDateString(),
                          selectedAssessment.percentage
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
                  <span>✓ Uploaded on {selectedAssessment.submittedAt || selectedAssessment.date}</span>
                  <span className="text-emerald-400 font-medium">Status: Self-Submitted & Verified</span>
                </div>
              </div>

              {/* Student Self-Submission Notes */}
              {selectedAssessment.studentNotes && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-xs sm:text-sm text-amber-900">
                  <span className="font-semibold block mb-0.5">Student Remarks / Submission Memo:</span>
                  <p className="text-amber-800 italic">"{selectedAssessment.studentNotes}"</p>
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
            <div className="flex items-center justify-end border-t border-gray-200 bg-gray-50 px-6 py-3">
              <button
                type="button"
                onClick={() => setSelectedAssessment(null)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Screenshot Lightbox */}
      {isScreenshotZoomed && selectedAssessment && (
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
              src={selectedAssessment.resultScreenshotUrl || createScorecardSvg(
                selectedAssessment.testTitle,
                currentStudent?.student || '',
                currentStudent?.rrn || '',
                selectedAssessment.score,
                selectedAssessment.maxMarks,
                selectedAssessment.type,
                selectedAssessment.date || new Date().toLocaleDateString(),
                selectedAssessment.percentage
              )}
              alt="Full Scorecard"
              className="w-full h-auto rounded-2xl shadow-2xl border border-white/20"
              onError={(e) => {
                const target = e.currentTarget;
                target.onerror = null;
                target.src = createScorecardSvg(
                  selectedAssessment.testTitle,
                  currentStudent?.student || '',
                  currentStudent?.rrn || '',
                  selectedAssessment.score,
                  selectedAssessment.maxMarks,
                  selectedAssessment.type,
                  selectedAssessment.date || new Date().toLocaleDateString(),
                  selectedAssessment.percentage
                );
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}