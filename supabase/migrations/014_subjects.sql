-- 014_subjects.sql
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- e.g. "Python Programming", "Data Structures"
    code TEXT NOT NULL, -- e.g. "CS201"
    credits INT NOT NULL DEFAULT 3,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(department_id, code)
);

CREATE INDEX IF NOT EXISTS idx_subjects_dept ON public.subjects(department_id);

-- Add foreign key constraint to teacher_assignments
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_teacher_assignments_subject'
    ) THEN
        ALTER TABLE public.teacher_assignments 
        ADD CONSTRAINT fk_teacher_assignments_subject 
        FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE SET NULL;
    END IF;
END $$;
