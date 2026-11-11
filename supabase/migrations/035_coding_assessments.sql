-- 035_coding_assessments.sql
CREATE TYPE public.programming_language AS ENUM ('python', 'javascript', 'typescript', 'java', 'cpp', 'c', 'sql');
CREATE TYPE public.submission_status AS ENUM ('pending', 'running', 'accepted', 'wrong_answer', 'time_limit_exceeded', 'runtime_error', 'compilation_error');

CREATE TABLE IF NOT EXISTS public.coding_problems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    problem_statement TEXT NOT NULL,
    input_format TEXT,
    output_format TEXT,
    constraints TEXT,
    time_limit_ms INT NOT NULL DEFAULT 2000,
    memory_limit_mb INT NOT NULL DEFAULT 256,
    starter_templates JSONB NOT NULL DEFAULT '{}'::jsonb, -- e.g. {"python": "def solution():\n    pass"}
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(question_id)
);

CREATE TABLE IF NOT EXISTS public.coding_test_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coding_problem_id UUID NOT NULL REFERENCES public.coding_problems(id) ON DELETE CASCADE,
    input_data TEXT NOT NULL,
    expected_output TEXT NOT NULL,
    is_hidden BOOLEAN NOT NULL DEFAULT false,
    weightage NUMERIC(5,2) NOT NULL DEFAULT 1.0,
    explanation TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.code_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID REFERENCES public.student_attempts(id) ON DELETE CASCADE,
    coding_problem_id UUID NOT NULL REFERENCES public.coding_problems(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    language public.programming_language NOT NULL,
    code TEXT NOT NULL,
    status public.submission_status NOT NULL DEFAULT 'pending',
    score NUMERIC(5,2) DEFAULT 0.0,
    test_cases_passed INT DEFAULT 0,
    total_test_cases INT DEFAULT 0,
    execution_time_ms INT,
    memory_used_kb INT,
    error_message TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_coding_test_cases_problem ON public.coding_test_cases(coding_problem_id);
CREATE INDEX IF NOT EXISTS idx_code_submissions_attempt ON public.code_submissions(attempt_id);
CREATE INDEX IF NOT EXISTS idx_code_submissions_student ON public.code_submissions(student_id);
