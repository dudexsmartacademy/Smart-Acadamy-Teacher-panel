-- 019_attendance_corrections.sql
CREATE TABLE IF NOT EXISTS public.attendance_correction_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attendance_record_id UUID NOT NULL REFERENCES public.attendance_records(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    requested_status public.attendance_status NOT NULL,
    reason TEXT NOT NULL,
    supporting_document_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES public.teacher_profiles(id) ON DELETE SET NULL,
    review_remarks TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_attendance_corrections_student ON public.attendance_correction_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_corrections_status ON public.attendance_correction_requests(status);
