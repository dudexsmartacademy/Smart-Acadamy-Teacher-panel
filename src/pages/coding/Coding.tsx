import {
  BarChart3,
  Calendar,
  Clock,
  Code2,
  Eye,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import CustomSelect from "../../components/CustomSelect";
import { codingAssessmentService } from "../../services/codingAssessmentService";

export type CodingAssessment = {
  id: string;
  title: string;
  subject: string;
  className: string;
  difficulty: "Easy" | "Medium" | "Hard";
  marks: number;
  timeLimit: number;
  start: string;
  end: string;
  status: "Draft" | "Scheduled" | "Live" | "Completed";
  problemStatement?: string;
  description?: string;
  inputFormat?: string;
  outputFormat?: string;
  constraints?: string;
  examples?: string;
  memoryLimit?: string;
  allowedLanguages?: string[];
  visibleTestCases?: Array<{ id: number; input: string; output: string }>;
  hiddenTestCases?: Array<{ id: number; input: string; output: string }>;
};

export default function Coding() {
  const [assessments, setAssessments] = useState<CodingAssessment[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    codingAssessmentService
      .list()
      .then(setAssessments)
      .catch((err: unknown) => setLoadError(err instanceof Error ? err.message : "Could not load coding assessments."));
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this coding assessment?")) {
      return;
    }
    try {
      await codingAssessmentService.archive(id);
      setAssessments((current) => current.filter((a) => a.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not delete the coding assessment.");
    }
  };

  const filteredAssessments = assessments.filter(
    (assessment) => {
      const searchMatch =
        assessment.title
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        assessment.subject
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        assessment.className
          .toLowerCase()
          .includes(search.toLowerCase());

      const statusMatch =
        statusFilter === "All" ||
        assessment.status === statusFilter;

      return searchMatch && statusMatch;
    },
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Coding Assessments
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Create and manage coding assessments
          </p>
        </div>

        <Link
          to="/coding/create"
          className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus size={18} />
          Create Coding Assessment
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              placeholder="Search coding assessments..."
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
                { value: "Draft", label: "Draft" },
                { value: "Scheduled", label: "Scheduled" },
                { value: "Live", label: "Live" },
                { value: "Completed", label: "Completed" },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Coding Assessment Cards */}
      <div className="grid gap-5 lg:grid-cols-2">
        {filteredAssessments.map((assessment) => (
          <div
            key={assessment.id}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            {/* Card Header */}
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-blue-50 p-2.5 text-blue-600">
                  <Code2 size={21} />
                </div>

                <div>
                  <h2 className="font-semibold text-gray-900">
                    {assessment.title}
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    {assessment.subject} ·{" "}
                    {assessment.className}
                  </p>
                </div>
              </div>

              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  assessment.status === "Completed"
                    ? "bg-green-50 text-green-700"
                    : assessment.status === "Live"
                      ? "bg-blue-50 text-blue-700"
                      : assessment.status === "Scheduled"
                        ? "bg-yellow-50 text-yellow-700"
                        : "bg-gray-100 text-gray-700"
                }`}
              >
                {assessment.status}
              </span>
            </div>

            {/* Assessment Information */}
            <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Code2 size={16} />
                {assessment.difficulty}
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <BarChart3 size={16} />
                {assessment.marks} Marks
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock size={16} />
                {assessment.timeLimit} Minutes
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar size={16} />
                {assessment.start}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-5 flex gap-2">
              <Link
                to={`/coding/${assessment.id}`}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Eye size={16} />
                View
              </Link>

              {assessment.status === "Completed" && (
                <Link
                  to={`/coding/${assessment.id}/results`}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <BarChart3 size={16} />
                  Results
                </Link>
              )}

              <button
                type="button"
                onClick={() => handleDelete(assessment.id)}
                className="rounded-lg border border-gray-200 p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredAssessments.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white py-12 text-center">
          <p className={`text-sm ${loadError ? "text-red-600" : "text-gray-500"}`}>
            {loadError || "No coding assessments found."}
          </p>
        </div>
      )}
    </div>
  );
}