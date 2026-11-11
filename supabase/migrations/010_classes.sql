-- 010_classes.sql
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_id UUID NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    specialization_id UUID REFERENCES public.specializations(id) ON DELETE SET NULL,
    batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
    section_id UUID NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- e.g. "AI & DS - Section B"
    code TEXT,
    semester INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(department_id, specialization_id, batch_id, section_id, academic_year_id)
);

CREATE INDEX IF NOT EXISTS idx_classes_dept ON public.classes(department_id);
CREATE INDEX IF NOT EXISTS idx_classes_batch ON public.classes(batch_id);
CREATE INDEX IF NOT EXISTS idx_classes_year ON public.classes(academic_year_id);
