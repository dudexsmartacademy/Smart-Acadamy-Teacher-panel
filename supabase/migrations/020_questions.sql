-- 020_questions.sql
CREATE TYPE public.question_type AS ENUM ('mcq_single', 'mcq_multiple', 'coding', 'subjective');
CREATE TYPE public.difficulty_level AS ENUM ('easy', 'medium', 'hard');

CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID NOT NULL REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type public.question_type NOT NULL DEFAULT 'mcq_single',
    topic TEXT NOT NULL,
    difficulty public.difficulty_level NOT NULL DEFAULT 'medium',
    marks NUMERIC(5,2) NOT NULL DEFAULT 1.0,
    explanation TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_questions_subject ON public.questions(subject_id);
CREATE INDEX IF NOT EXISTS idx_questions_topic ON public.questions(topic);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON public.questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_created_by ON public.questions(created_by);
