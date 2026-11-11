-- 022_assessments.sql
CREATE TYPE public.assessment_status AS ENUM ('draft', 'scheduled', 'active', 'closed', 'archived');
CREATE TYPE public.assessment_type AS ENUM ('mcq', 'coding', 'hybrid', 'assignment');

CREATE TABLE IF NOT EXISTS public.assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    course_offering_id UUID REFERENCES public.course_offerings(id) ON DELETE SET NULL,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    type public.assessment_type NOT NULL DEFAULT 'mcq',
    duration_seconds INT NOT NULL DEFAULT 1800, -- e.g. 30 mins
    max_marks NUMERIC(6,2) NOT NULL DEFAULT 100.0,
    pass_marks NUMERIC(6,2) NOT NULL DEFAULT 40.0,
    start_at TIMESTAMPTZ,
    end_at TIMESTAMPTZ,
    attempts_allowed INT NOT NULL DEFAULT 1,
    negative_marking BOOLEAN NOT NULL DEFAULT false,
    negative_marks NUMERIC(4,2) NOT NULL DEFAULT 0.0,
    randomize_questions BOOLEAN NOT NULL DEFAULT false,
    randomize_options BOOLEAN NOT NULL DEFAULT false,
    show_result_immediately BOOLEAN NOT NULL DEFAULT true,
    show_correct_answers BOOLEAN NOT NULL DEFAULT false,
    status public.assessment_status NOT NULL DEFAULT 'draft',
    created_by UUID NOT NULL REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_assessments_class ON public.assessments(class_id);
CREATE INDEX IF NOT EXISTS idx_assessments_creator ON public.assessments(created_by);
CREATE INDEX IF NOT EXISTS idx_assessments_status ON public.assessments(status);
