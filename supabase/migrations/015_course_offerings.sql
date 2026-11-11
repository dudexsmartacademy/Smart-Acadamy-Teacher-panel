-- 015_course_offerings.sql
CREATE TABLE IF NOT EXISTS public.course_offerings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
    semester INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(subject_id, class_id, academic_year_id)
);

CREATE INDEX IF NOT EXISTS idx_course_offerings_class ON public.course_offerings(class_id);
CREATE INDEX IF NOT EXISTS idx_course_offerings_teacher ON public.course_offerings(teacher_id);
