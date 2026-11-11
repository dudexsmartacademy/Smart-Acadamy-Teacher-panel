-- 027_notes.sql
CREATE TABLE IF NOT EXISTS public.notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    course_offering_id UUID REFERENCES public.course_offerings(id) ON DELETE SET NULL,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    teacher_id UUID NOT NULL REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
    note_date DATE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    is_published BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    archived_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notes_class ON public.notes(class_id);
CREATE INDEX IF NOT EXISTS idx_notes_teacher ON public.notes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_notes_date ON public.notes(note_date);
