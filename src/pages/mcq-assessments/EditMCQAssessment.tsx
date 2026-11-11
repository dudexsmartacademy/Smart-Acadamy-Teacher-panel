import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { mcqAssessmentService } from '../../services/mcqAssessmentService';
import type { MCQAssessment } from '../../types/mcqAssessment';
import CreateMCQAssessment from './CreateMCQAssessment';

export default function EditMCQAssessment() {
  const { id } = useParams<{ id: string }>();
  const [assessment, setAssessment] = useState<MCQAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#1B1C1E]">
          <Loader2 size={20} className="animate-spin text-[#B08E67]" />
          <span>Loading assessment data...</span>
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
          <h2 className="text-base font-bold text-[#1B1C1E]">Unable to Load Assessment</h2>
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

  return <CreateMCQAssessment initialAssessment={assessment} isEditMode={true} />;
}
