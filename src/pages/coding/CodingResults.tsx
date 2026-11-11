import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Clock,
  Code2,
  Download,
  Search,
  Trophy,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import CustomSelect from "../../components/CustomSelect";
import type { CodingAssessment } from "./Coding";
import { codingAssessmentService } from "../../services/codingAssessmentService";

type CodingResult = {
  id: string;
  student: string;
  rrn: string;
  attempt: number;
  score: number;
  totalMarks: number;
  percentage: number;
  grade: string;
  submittedAt: string;
  status: "Passed" | "Failed";
  passedTests: number;
  failedTests: number;
  executionResult: string;
  time: string;
};

export default function CodingResults() {
  const { id } = useParams<{ id: string }>();

  const [assessment, setAssessment] = useState<CodingAssessment | null>(null);
  const [allResults, setAllResults] = useState<CodingResult[]>([]);

  // Results are published by the teacher from the Coding Evaluation page.
  useEffect(() => {
    if (!id) return;
    Promise.all([codingAssessmentService.getById(id), codingAssessmentService.getResults(id)])
      .then(([a, rows]) => {
        setAssessment(a);
        setAllResults(
          rows.map((r) => ({
            id: r.id,
            student: r.student,
            rrn: r.rrn,
            attempt: 1,
            score: r.score,
            totalMarks: r.totalMarks,
            percentage: r.percentage,
            grade: r.grade,
            submittedAt: r.submittedAt ? new Date(r.submittedAt).toLocaleString() : "",
            status: r.status,
            passedTests: 0,
            failedTests: 0,
            executionResult: r.feedback || "Reviewed by teacher",
            time: "",
          })),
        );
      })
      .catch((err: unknown) => console.error("Could not load coding results:", err));
  }, [id]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const results = useMemo(() => {
    return allResults.filter((result) => {
      const searchMatch =
        result.student.toLowerCase().includes(search.toLowerCase()) ||
        result.rrn.toLowerCase().includes(search.toLowerCase());

      const statusMatch =
        statusFilter === "All" || result.status === statusFilter;

      return searchMatch && statusMatch;
    });
  }, [allResults, search, statusFilter]);

  const totalAssigned = allResults.length;
  const totalAttempted = allResults.length;
  const totalSubmitted = allResults.length;

  const average =
    allResults.length > 0
      ? allResults.reduce((sum, result) => sum + result.percentage, 0) /
        allResults.length
      : 0;

  const highest =
    allResults.length > 0
      ? Math.max(...allResults.map((result) => result.percentage))
      : 0;

  const lowest =
    allResults.length > 0
      ? Math.min(...allResults.map((result) => result.percentage))
      : 0;

  const passPercentage =
    allResults.length > 0
      ? (allResults.filter((result) => result.status === "Passed").length /
          allResults.length) *
        100
      : 0;

  const handleExport = () => {
    if (results.length === 0) {
      alert("No results to export.");
      return;
    }
    const headers = [
      "Student",
      "RRN",
      "Attempt",
      "Score",
      "Total Marks",
      "Percentage",
      "Grade",
      "Tests Passed",
      "Tests Failed",
      "Execution",
      "Time",
      "Status",
      "Submitted At",
    ];
    const rows = results.map((r) => [
      `"${r.student.replace(/"/g, '""')}"`,
      `"${r.rrn}"`,
      r.attempt,
      r.score,
      r.totalMarks,
      `${r.percentage}%`,
      `"${r.grade}"`,
      r.passedTests,
      r.failedTests,
      `"${r.executionResult}"`,
      `"${r.time}"`,
      `"${r.status}"`,
      `"${r.submittedAt}"`,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `coding_results_${assessment?.title?.replace(/\s+/g, "_") || id}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!assessment) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <h1 className="text-lg font-semibold text-gray-900">
            Coding assessment not found
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            The requested coding assessment does not exist or has been removed.
          </p>

          <Link
            to="/coding"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white"
          >
            <ArrowLeft size={17} />
            Back to Coding Assessments
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/coding"
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={17} />
          Back to Coding Assessments
        </Link>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2.5 text-blue-600">
                <Code2 size={22} />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {assessment.title} Results
                </h1>

                <p className="mt-1 text-sm text-gray-500">
                  {assessment.subject} · {assessment.className}
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExport}
            className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Download size={17} />
            Export Results
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-gray-500">Number Assigned</p>
            <BarChart3 size={19} className="text-gray-400" />
          </div>

          <p className="text-2xl font-bold text-gray-900">
            {totalAssigned}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-gray-500">Number Attempted</p>
            <Code2 size={19} className="text-gray-400" />
          </div>

          <p className="text-2xl font-bold text-gray-900">
            {totalAttempted}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-gray-500">Average</p>
            <Trophy size={19} className="text-gray-400" />
          </div>

          <p className="text-2xl font-bold text-gray-900">
            {average.toFixed(1)}%
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-gray-500">Pass Percentage</p>
            <CheckCircle2 size={19} className="text-gray-400" />
          </div>

          <p className="text-2xl font-bold text-gray-900">
            {passPercentage.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* More statistics */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Number Submitted</p>
          <p className="mt-2 text-xl font-bold text-gray-900">
            {totalSubmitted}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Highest Score</p>
          <p className="mt-2 text-xl font-bold text-gray-900">
            {highest}%
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Lowest Score</p>
          <p className="mt-2 text-xl font-bold text-gray-900">
            {lowest}%
          </p>
        </div>
      </div>

      {/* Search and filter */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              placeholder="Search student or RRN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div className="w-full md:w-48">
            <CustomSelect
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
              options={[
                { value: "All", label: "All Status" },
                { value: "Passed", label: "Passed" },
                { value: "Failed", label: "Failed" },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Results table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full text-left">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Student
                </th>

                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  RRN
                </th>

                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Attempt
                </th>

                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Score
                </th>

                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Percentage
                </th>

                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Grade
                </th>

                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Tests
                </th>

                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Execution
                </th>

                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Time
                </th>

                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Status
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {results.map((result) => (
                <tr key={result.id} className="hover:bg-gray-50">
                  <td className="px-5 py-4">
                    <Link
                      to={`/students/${result.rrn.replace("RRN", "")}`}
                      className="font-medium text-gray-900 hover:text-blue-600"
                    >
                      {result.student}
                    </Link>
                  </td>

                  <td className="px-5 py-4 text-sm text-gray-600">
                    {result.rrn}
                  </td>

                  <td className="px-5 py-4 text-sm text-gray-600">
                    #{result.attempt}
                  </td>

                  <td className="px-5 py-4 text-sm font-medium text-gray-900">
                    {result.score}/{result.totalMarks}
                  </td>

                  <td className="px-5 py-4 text-sm text-gray-600">
                    {result.percentage}%
                  </td>

                  <td className="px-5 py-4">
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                      {result.grade}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 size={15} />
                        {result.passedTests}
                      </span>

                      <span className="text-gray-300">/</span>

                      <span className="flex items-center gap-1 text-red-600">
                        <XCircle size={15} />
                        {result.failedTests}
                      </span>
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        result.executionResult === "Accepted"
                          ? "bg-green-50 text-green-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {result.executionResult}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                      <Clock size={15} />
                      {result.time}
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                        result.status === "Passed"
                          ? "bg-green-50 text-green-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {result.status === "Passed" ? (
                        <CheckCircle2 size={14} />
                      ) : (
                        <XCircle size={14} />
                      )}

                      {result.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {results.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-sm text-gray-500">
              No results found.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}