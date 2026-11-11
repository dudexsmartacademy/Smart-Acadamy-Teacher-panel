-- 024_student_attempts.sql
CREATE TYPE public.attempt_status AS ENUM ('in_progress', 'submitted', 'auto_submitted', 'expired', 'evaluated');

CREATE TABLE IF NOT EXISTS public.student_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    attempt_number INT NOT NULL DEFAULT 1,
    started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    expires_at TIMESTAMPTZ NOT NULL,
    submitted_at TIMESTAMPTZ,
    status public.attempt_status NOT NULL DEFAULT 'in_progress',
    score NUMERIC(6,2),
    percentage NUMERIC(5,2),
    grade TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(assessment_id, student_id, attempt_number)
);

CREATE INDEX IF NOT EXISTS idx_student_attempts_assessment ON public.student_attempts(assessment_id);
CREATE INDEX IF NOT EXISTS idx_student_attempts_student ON public.student_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_student_attempts_status ON public.student_attempts(status);
