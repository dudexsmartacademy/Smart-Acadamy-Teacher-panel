-- 034_grading_rules.sql
CREATE TABLE IF NOT EXISTS public.grading_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_id UUID REFERENCES public.colleges(id) ON DELETE CASCADE,
    grade TEXT NOT NULL,
    min_percentage NUMERIC(5,2) NOT NULL,
    max_percentage NUMERIC(5,2) NOT NULL,
    grade_point NUMERIC(4,2) DEFAULT 0.0,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(college_id, grade)
);

CREATE INDEX IF NOT EXISTS idx_grading_rules_college ON public.grading_rules(college_id);
