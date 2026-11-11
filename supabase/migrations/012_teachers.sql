-- 012_teachers.sql
CREATE TABLE IF NOT EXISTS public.teacher_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    faculty_id TEXT UNIQUE NOT NULL,
    college_id UUID NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    designation TEXT NOT NULL DEFAULT 'Assistant Professor',
    phone TEXT,
    profile_photo TEXT,
    qualification TEXT,
    experience_years INT DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive', 'pending')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_teacher_profiles_faculty_id ON public.teacher_profiles(faculty_id);
CREATE INDEX IF NOT EXISTS idx_teacher_profiles_dept ON public.teacher_profiles(department_id);
