-- 026_results.sql
CREATE TABLE IF NOT EXISTS public.results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    attempt_id UUID UNIQUE NOT NULL REFERENCES public.student_attempts(id) ON DELETE CASCADE,
    score NUMERIC(6,2) NOT NULL,
    max_marks NUMERIC(6,2) NOT NULL,
    percentage NUMERIC(5,2) NOT NULL,
    grade TEXT NOT NULL,
    is_passed BOOLEAN NOT NULL DEFAULT true,
    published_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_results_assessment ON public.results(assessment_id);
CREATE INDEX IF NOT EXISTS idx_results_student ON public.results(student_id);
