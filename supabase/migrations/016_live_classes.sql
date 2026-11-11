-- 016_live_classes.sql
CREATE TABLE IF NOT EXISTS public.live_classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    course_offering_id UUID REFERENCES public.course_offerings(id) ON DELETE SET NULL,
    teacher_id UUID NOT NULL REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    meeting_platform TEXT NOT NULL DEFAULT 'Google Meet',
    meeting_url TEXT NOT NULL,
    scheduled_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('draft', 'scheduled', 'live', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_live_classes_class ON public.live_classes(class_id);
CREATE INDEX IF NOT EXISTS idx_live_classes_teacher ON public.live_classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_live_classes_date ON public.live_classes(scheduled_date);
