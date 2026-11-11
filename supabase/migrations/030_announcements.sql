-- 030_announcements.sql
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    scope TEXT NOT NULL DEFAULT 'class' CHECK (scope IN ('all', 'college', 'department', 'batch', 'class')),
    target_class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    target_department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
    target_batch_id UUID REFERENCES public.batches(id) ON DELETE CASCADE,
    publish_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    expires_at TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_announcements_class ON public.announcements(target_class_id);
CREATE INDEX IF NOT EXISTS idx_announcements_creator ON public.announcements(created_by);
