import {
  ArrowLeft,
  CheckCircle,
  Clock,
  Code2,
  LoaderCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { CodingAssessment } from "./Coding";
import {
  codingAssessmentService,
  type CodingSubmission,
} from "../../services/codingAssessmentService";

// No automatic code runner is configured, so the teacher reviews each
// submission and enters a score; saving publishes it to the student's results.
export default function CodingEvaluation() {
  const { id } = useParams<{ id: string }>();
  const [assessment, setAssessment] = useState<CodingAssessment | null>(null);
  const [submissions, setSubmissions] = useState<CodingSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    if (!id) return;
    try {
      const [a, subs] = await Promise.all([
        codingAssessmentService.getById(id),
        codingAssessmentService.getSubmissions(id),
      ]);
      setAssessment(a);
      setSubmissions(subs);
      setScores(Object.fromEntries(subs.map((s) => [s.id, s.status === "evaluated" ? String(s.score) : ""])));
      setFeedback(Object.fromEntries(subs.map((s) => [s.id, s.feedback])));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load submissions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const saveScore = async (submission: CodingSubmission) => {
    if (!assessment) return;
    const value = Number(scores[submission.id]);
    if (!Number.isFinite(value) || scores[submission.id] === "") {
      alert("Enter a score before saving.");
      return;
    }
    setSavingId(submission.id);
    try {
      await codingAssessmentService.gradeSubmission(assessment, submission, value, feedback[submission.id] || "");
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not save the score.");
    } finally {
      setSavingId(null);
    }
  };

  const evaluated = submissions.filter((s) => s.status === "evaluated");
  const pending = submissions.length - evaluated.length;
  const averageScore =
    evaluated.length > 0 ? evaluated.reduce((t, s) => t + s.score, 0) / evaluated.length : 0;

  if (loading) {
    return <div className="p-6 text-sm text-gray-500">Loading submissions…</div>;
  }

  if (!assessment) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <h1 className="text-lg font-semibold text-gray-900">
            Coding Assessment Not Found
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            {error || "The requested coding assessment could not be found or has been removed."}
          </p>
          <Link
            to="/coding"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <ArrowLeft size={16} />
            Back to Coding Assessments
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          to="/coding"
          className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50"
        >
          <ArrowLeft size={18} />
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Coding Evaluation
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Review each submission and publish a score (out of {assessment.marks}).
          </p>
        </div>
      </div>

      {/* Assessment Information */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-blue-50 p-3 text-blue-600">
            <Code2 size={22} />
          </div>

          <div>
            <h2 className="font-semibold text-gray-900">
              {assessment.title}
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {assessment.subject} · {assessment.className}
            </p>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Submissions" value={submissions.length} icon={<Code2 size={20} />} />
        <StatCard title="Evaluated" value={evaluated.length} icon={<CheckCircle size={20} />} />
        <StatCard title="Pending Review" value={pending} icon={<Clock size={20} />} />
        <StatCard title="Average Score" value={averageScore.toFixed(1)} icon={<LoaderCircle size={20} />} />
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Submissions */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-900">Submissions</h2>
        </div>

        <div className="divide-y divide-gray-100">
          {submissions.map((s) => (
            <div key={s.id} className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-900">{s.student}</p>
                  <p className="text-xs text-gray-500">
                    {s.rrn && `${s.rrn} · `}
                    {s.language} · {s.submittedAt ? new Date(s.submittedAt).toLocaleString() : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {s.status === "evaluated" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                      <CheckCircle size={13} /> Scored {s.score}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                      <Clock size={13} /> Pending review
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setOpenId(openId === s.id ? null : s.id)}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    {openId === s.id ? "Hide" : "Review"}
                  </button>
                </div>
              </div>

              {openId === s.id && (
                <div className="mt-4 space-y-3">
                  <pre className="max-h-96 overflow-auto rounded-lg bg-gray-900 p-4 text-xs text-gray-100">
                    <code>{s.sourceCode || "(empty submission)"}</code>
                  </pre>
                  <div className="flex flex-wrap items-end gap-3">
                    <label className="text-sm text-gray-700">
                      Score (0–{assessment.marks})
                      <input
                        type="number"
                        min={0}
                        max={assessment.marks}
                        value={scores[s.id] ?? ""}
                        onChange={(e) => setScores({ ...scores, [s.id]: e.target.value })}
                        className="mt-1 block w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="min-w-[240px] flex-1 text-sm text-gray-700">
                      Feedback (optional)
                      <input
                        type="text"
                        value={feedback[s.id] ?? ""}
                        onChange={(e) => setFeedback({ ...feedback, [s.id]: e.target.value })}
                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={savingId === s.id}
                      onClick={() => void saveScore(s)}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      {savingId === s.id ? "Saving…" : "Save & Publish"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {submissions.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-500">
            No student submissions recorded for this assessment yet.
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-gray-500">{title}</p>

        <div className="rounded-lg bg-gray-50 p-2 text-gray-600">
          {icon}
        </div>
      </div>

      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
