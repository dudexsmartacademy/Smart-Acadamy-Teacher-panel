BEGIN;

-- Shared, server-side roster used to authorize student sign-up.
CREATE TABLE IF NOT EXISTS public.student_email_roster (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_id TEXT NOT NULL,
    college_name TEXT NOT NULL,
    email TEXT NOT NULL,
    student_name TEXT,
    student_id TEXT,
    department TEXT,
    source_file_name TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT student_email_roster_normalized_email CHECK (email = lower(btrim(email)))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_student_email_roster_email
    ON public.student_email_roster (email);
CREATE INDEX IF NOT EXISTS idx_student_email_roster_college
    ON public.student_email_roster (college_id);
CREATE INDEX IF NOT EXISTS idx_student_email_roster_active_email
    ON public.student_email_roster (email) WHERE status = 'active';

ALTER TABLE public.student_email_roster ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage student email roster" ON public.student_email_roster;
CREATE POLICY "Admins manage student email roster"
    ON public.student_email_roster
    FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

REVOKE ALL ON public.student_email_roster FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_email_roster TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_student_roster_profile()
RETURNS TABLE (
    full_name TEXT,
    college_name TEXT,
    student_id TEXT,
    department TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
    SELECT
        r.student_name,
        r.college_name,
        r.student_id,
        r.department
    FROM public.student_email_roster AS r
    JOIN auth.users AS u ON lower(btrim(u.email)) = r.email
    WHERE u.id = auth.uid()
      AND u.email_confirmed_at IS NOT NULL
      AND r.status = 'active'
    LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_my_student_roster_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_student_roster_profile() TO authenticated;

COMMIT;
