-- 017_class_sessions.sql
CREATE TABLE IF NOT EXISTS public.class_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    course_offering_id UUID REFERENCES public.course_offerings(id) ON DELETE SET NULL,
    teacher_id UUID NOT NULL REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
    session_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    mode TEXT NOT NULL DEFAULT 'offline' CHECK (mode IN ('offline', 'online', 'hybrid')),
    room TEXT,
    meeting_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_class_sessions_class ON public.class_sessions(class_id);
CREATE INDEX IF NOT EXISTS idx_class_sessions_teacher ON public.class_sessions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_class_sessions_date ON public.class_sessions(session_date);
