import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit3,
  Trash2,
  BookOpen,
  ShieldCheck,
  CheckCircle,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { mcqAssessmentService } from '../../services/mcqAssessmentService';
import type { MCQAssessment, MCQOptionKey } from '../../types/mcqAssessment';
import { MCQStatusBadge, MCQDeleteModal } from '../../components/mcq-assessments';

export default function MCQAssessmentDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [assessment, setAssessment] = useState<MCQAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Delete modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function load() {
      if (!id) return;
      setLoading(true);
      const { data, error: err } = await mcqAssessmentService.getAssessmentById(id);
      if (err || !data) {
        setError(err || 'Assessment not found');
      } else {
        setAssessment(data);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  const handleConfirmDelete = async (item: MCQAssessment) => {
    setIsDeleting(true);
    await mcqAssessmentService.deleteAssessment(item.id, true);
    setIsDeleting(false);
    setDeleteModalOpen(false);
    navigate('/mcq-assessments', {
      state: { message: 'Assessment archived successfully.' },
    });
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#1B1C1E]">
          <Loader2 size={20} className="animate-spin text-[#B08E67]" />
          <span>Loading assessment details...</span>
        </div>
      </div>
    );
  }

  if (error || !assessment) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] p-8">
        <div className="mx-auto max-w-lg rounded-2xl border border-[#E7DED3] bg-white p-8 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#A75B52]/10 text-[#A75B52]">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-base font-bold text-[#1B1C1E]">Assessment Not Found</h2>
          <p className="text-xs text-[#625D57]">{error || 'The requested assessment could not be found.'}</p>
          <Link
            to="/mcq-assessments"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#1B1C1E] px-4 py-2 text-xs font-bold text-white hover:bg-[#9C7449]"
          >
            <ArrowLeft size={14} />
            <span>Back to MCQ Assessments</span>
          </Link>
        </div>
      </div>
    );
  }

  const optionKeys: MCQOptionKey[] = ['A', 'B', 'C', 'D'];
  const totalMarks = assessment.questions.reduce(
    (sum, q) => sum + (Number(q.marks) || 1),
    0
  );

  return (
    <div className="min-h-screen bg-[#FAF7F2] p-6 lg:p-8 space-y-6">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between">
        <Link
          to="/mcq-assessments"
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#E7DED3] bg-white px-3.5 py-2 text-xs font-bold text-[#1B1C1E] hover:bg-[#FAF7F2] hover:border-[#B08E67] transition-all"
        >
          <ArrowLeft size={14} />
          <span>Back to Assessments</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            to={`/mcq-assessments/${assessment.id}/edit`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#1B1C1E] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#9C7449] transition-all"
          >
            <Edit3 size={14} />
            <span>Update Assessment</span>
          </Link>
          <button
            type="button"
            onClick={() => setDeleteModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#A75B52]/30 bg-white px-3.5 py-2 text-xs font-bold text-[#A75B52] hover:bg-[#A75B52]/10 transition-all"
          >
            <Trash2 size={14} />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Main Assessment Header Card */}
      <div className="rounded-2xl border border-[#E7DED3] bg-white p-6 lg:p-8 shadow-sm space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E7DED3] pb-6">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex items-center gap-2.5">
              <MCQStatusBadge status={assessment.status} />
              <span className="rounded-md bg-[#FAF7F2] px-2.5 py-0.5 text-xs font-bold text-[#9C7449] border border-[#E7DED3]">
                {assessment.subjectName}
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-[#1B1C1E] tracking-tight">
              {assessment.title}
            </h1>
            {assessment.description && (
              <p className="text-xs text-[#625D57] leading-relaxed pt-1">
                {assessment.description}
              </p>
            )}
          </div>

          <div className="rounded-xl border border-[#5E8065]/30 bg-[#5E8065]/10 p-3 text-xs text-[#5E8065] flex items-center gap-2">
            <ShieldCheck size={18} />
            <div>
              <strong className="block font-bold">Faculty Master Key</strong>
              <span>Correct solutions & explanations visible</span>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border border-[#E7DED3] bg-[#FAF7F2] p-3.5">
            <span className="text-[11px] font-medium text-[#8C857D] block">Assigned Cohort</span>
            <span className="text-xs font-bold text-[#1B1C1E] truncate block mt-0.5">
              {assessment.classInfo?.className || 'Class'}
            </span>
            <span className="text-[10px] text-[#8C857D] block mt-0.5">
              {assessment.classInfo?.specialization} • {assessment.classInfo?.batch}
            </span>
          </div>

          <div className="rounded-xl border border-[#E7DED3] bg-[#FAF7F2] p-3.5">
            <span className="text-[11px] font-medium text-[#8C857D] block">Schedule Window</span>
            <span className="text-xs font-bold text-[#1B1C1E] block mt-0.5">
              {assessment.schedule.date}
            </span>
            <span className="text-[10px] text-[#8C857D] block mt-0.5">
              {assessment.schedule.startTime} – {assessment.schedule.endTime}
            </span>
          </div>

          <div className="rounded-xl border border-[#E7DED3] bg-[#FAF7F2] p-3.5">
            <span className="text-[11px] font-medium text-[#8C857D] block">Assessment Duration</span>
            <span className="text-xs font-bold text-[#9C7449] block mt-0.5">
              {assessment.schedule.durationMinutes} Minutes
            </span>
            <span className="text-[10px] text-[#8C857D] block mt-0.5">
              Authoritative Server Timer
            </span>
          </div>

          <div className="rounded-xl border border-[#E7DED3] bg-[#FAF7F2] p-3.5">
            <span className="text-[11px] font-medium text-[#8C857D] block">Evaluation Scope</span>
            <span className="text-xs font-bold text-[#1B1C1E] block mt-0.5">
              {assessment.questions.length} Questions
            </span>
            <span className="text-[10px] text-[#9C7449] font-bold block mt-0.5">
              {totalMarks} Total Marks
            </span>
          </div>
        </div>
      </div>

      {/* Questions Answer-Key Stream */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#625D57] flex items-center gap-2">
            <BookOpen size={14} className="text-[#B08E67]" />
            <span>Assessment Question Sheet & Answer Key ({assessment.questions.length} Questions)</span>
          </h2>
        </div>

        {assessment.questions.map((q, idx) => {
          const correctOption = q.options.find((o) => o.id === q.correctOptionId);

          return (
            <div
              key={q.id || idx}
              className="rounded-2xl border border-[#E7DED3] bg-white p-6 shadow-sm space-y-4 hover:border-[#CFBAA1] transition-all"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4 border-b border-[#E7DED3] pb-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1B1C1E] text-xs font-bold text-white">
                    {idx + 1}
                  </span>
                  <h3 className="text-sm font-bold text-[#1B1C1E]">
                    Question {idx + 1}
                  </h3>
                </div>
                <span className="rounded-lg bg-[#FAF7F2] px-3 py-1 text-xs font-bold text-[#9C7449] border border-[#E7DED3]">
                  {q.marks} {q.marks === 1 ? 'Mark' : 'Marks'}
                </span>
              </div>

              {/* Statement */}
              <p className="text-sm font-medium text-[#1B1C1E] leading-relaxed whitespace-pre-wrap">
                {q.questionText}
              </p>

              {/* Options */}
              <div className="space-y-2 pt-1">
                {q.options.map((opt, optIdx) => {
                  const optKey = optionKeys[optIdx] || `Option ${optIdx + 1}`;
                  const isCorrect = opt.id === q.correctOptionId;

                  return (
                    <div
                      key={opt.id || optIdx}
                      className={`flex items-start gap-3 rounded-xl border p-3 text-xs transition-all ${
                        isCorrect
                          ? 'border-[#B08E67] bg-[#FAF7F2] ring-1 ring-[#B08E67]'
                          : 'border-[#E7DED3] bg-white text-[#625D57]'
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                          isCorrect
                            ? 'bg-[#B08E67] text-white'
                            : 'bg-[#E9DED0] text-[#1B1C1E]'
                        }`}
                      >
                        {optKey}
                      </span>
                      <span className={`flex-1 ${isCorrect ? 'font-bold text-[#1B1C1E]' : 'font-medium'}`}>
                        {opt.text}
                      </span>
                      {isCorrect && (
                        <span className="inline-flex items-center gap-1 shrink-0 rounded-md bg-[#B08E67] px-2 py-0.5 text-[10px] font-bold text-white">
                          <CheckCircle size={10} />
                          <span>Correct Answer</span>
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Explanation Box */}
              <div className="rounded-xl border border-[#B08E67]/40 bg-[#FAF7F2] p-3 text-xs">
                <div className="font-bold text-[#9C7449] mb-1 flex items-center gap-1.5">
                  <CheckCircle size={13} className="text-[#B08E67]" />
                  <span>Correct Key:</span>
                  <span className="text-[#1B1C1E]">
                    {correctOption
                      ? `${optionKeys[q.options.findIndex((o) => o.id === q.correctOptionId)]}. ${correctOption.text}`
                      : 'None'}
                  </span>
                </div>
                {q.explanation && (
                  <div className="mt-2 pt-2 border-t border-[#E7DED3] text-[#625D57]">
                    <strong className="text-[#1B1C1E] block mb-0.5 font-semibold">Solution Explanation:</strong>
                    <p className="leading-relaxed whitespace-pre-wrap">{q.explanation}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Modal */}
      <MCQDeleteModal
        isOpen={deleteModalOpen}
        assessment={assessment}
        onClose={() => setDeleteModalOpen(false)}
        onConfirmDelete={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}
