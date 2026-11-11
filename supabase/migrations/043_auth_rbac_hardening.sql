BEGIN;

CREATE OR REPLACE FUNCTION public.has_role(check_user_id UUID, check_role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, auth, pg_temp
AS $$
    SELECT check_user_id = auth.uid()
       AND EXISTS (
           SELECT 1
           FROM public.user_roles AS ur
           WHERE ur.user_id = check_user_id
             AND ur.role = check_role
       );
$$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.user_roles
        GROUP BY user_id
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Resolve users with multiple portal roles before applying RBAC hardening';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.teacher_profiles AS tp
        JOIN public.user_roles AS ur ON ur.user_id = tp.user_id
        WHERE ur.role <> 'teacher'
    ) THEN
        RAISE EXCEPTION 'Resolve teacher profiles assigned another portal role before applying RBAC hardening';
    END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_roles_single_role_per_user
    ON public.user_roles (user_id);

DROP POLICY IF EXISTS "Teachers upload note files to assigned classes" ON storage.objects;
CREATE POLICY "Teachers upload note files to assigned classes"
    ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'academy-notes'
        AND (
            public.has_role(auth.uid(), 'admin')
            OR (
                public.has_role(auth.uid(), 'teacher')
                AND EXISTS (
                    SELECT 1
                    FROM public.notes AS n
                    WHERE n.id = ((storage.foldername(name))[3])::UUID
                      AND n.class_id = ((storage.foldername(name))[2])::UUID
                      AND public.teacher_has_class(n.class_id)
                )
            )
        )
    );

DROP POLICY IF EXISTS "Teachers update delete note files" ON storage.objects;
CREATE POLICY "Teachers update note files"
    ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'academy-notes'
        AND (
            public.has_role(auth.uid(), 'admin')
            OR EXISTS (
                SELECT 1
                FROM public.notes AS n
                WHERE n.id = ((storage.foldername(name))[3])::UUID
                  AND n.class_id = ((storage.foldername(name))[2])::UUID
                  AND public.has_role(auth.uid(), 'teacher')
                  AND public.teacher_has_class(n.class_id)
            )
        )
    )
    WITH CHECK (
        bucket_id = 'academy-notes'
        AND (
            public.has_role(auth.uid(), 'admin')
            OR EXISTS (
                SELECT 1
                FROM public.notes AS n
                WHERE n.id = ((storage.foldername(name))[3])::UUID
                  AND n.class_id = ((storage.foldername(name))[2])::UUID
                  AND public.has_role(auth.uid(), 'teacher')
                  AND public.teacher_has_class(n.class_id)
            )
        )
    );
CREATE POLICY "Teachers delete note files"
    ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'academy-notes'
        AND (
            public.has_role(auth.uid(), 'admin')
            OR EXISTS (
                SELECT 1
                FROM public.notes AS n
                WHERE n.id = ((storage.foldername(name))[3])::UUID
                  AND n.class_id = ((storage.foldername(name))[2])::UUID
                  AND public.has_role(auth.uid(), 'teacher')
                  AND public.teacher_has_class(n.class_id)
            )
        )
    );

DROP POLICY IF EXISTS "Authorized users download note files" ON storage.objects;
CREATE POLICY "Authorized users download note files"
    ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'academy-notes'
        AND (
            public.has_role(auth.uid(), 'admin')
            OR EXISTS (
                SELECT 1
                FROM public.note_attachments AS na
                JOIN public.notes AS n ON n.id = na.note_id
                WHERE na.file_path = storage.objects.name
                  AND (
                      (
                          public.has_role(auth.uid(), 'teacher')
                          AND public.teacher_has_class(n.class_id)
                      )
                      OR (
                          public.has_role(auth.uid(), 'student')
                          AND n.is_published = true
                          AND n.archived_at IS NULL
                          AND public.student_belongs_to_class(
                              public.current_student_id(),
                              n.class_id
                          )
                      )
                  )
            )
        )
    );

REVOKE ALL ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.current_teacher_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
    SELECT tp.id
    FROM public.teacher_profiles AS tp
    WHERE tp.user_id = auth.uid()
      AND tp.status = 'active'
      AND public.has_role(auth.uid(), 'teacher')
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_student_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
    SELECT sp.id
    FROM public.student_profiles AS sp
    WHERE sp.user_id = auth.uid()
      AND sp.status = 'active'
      AND public.has_role(auth.uid(), 'student')
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.teacher_has_class(p_class_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
    SELECT public.has_role(auth.uid(), 'teacher')
       AND EXISTS (
           SELECT 1
           FROM public.teacher_assignments AS ta
           JOIN public.teacher_profiles AS tp ON tp.id = ta.teacher_id
           WHERE tp.user_id = auth.uid()
             AND tp.status = 'active'
             AND ta.class_id = p_class_id
             AND ta.is_active = true
       );
$$;

CREATE OR REPLACE FUNCTION public.teacher_has_course(p_course_offering_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
    SELECT public.has_role(auth.uid(), 'teacher')
       AND EXISTS (
           SELECT 1
           FROM public.course_offerings AS co
           JOIN public.teacher_profiles AS tp ON tp.id = co.teacher_id
           WHERE tp.user_id = auth.uid()
             AND tp.status = 'active'
             AND co.id = p_course_offering_id
             AND co.is_active = true
       );
$$;

CREATE OR REPLACE FUNCTION public.student_belongs_to_class(p_student_id UUID, p_class_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
    SELECT public.has_role(auth.uid(), 'student')
       AND p_student_id = public.current_student_id()
       AND EXISTS (
           SELECT 1
           FROM public.class_memberships AS cm
           WHERE cm.student_id = p_student_id
             AND cm.class_id = p_class_id
             AND cm.is_active = true
       );
$$;

CREATE OR REPLACE FUNCTION public.student_profile_matches_roster(
    p_college_id UUID,
    p_department_id UUID,
    p_batch_id UUID,
    p_rrn TEXT,
    p_roll_number TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
    SELECT auth.uid() IS NOT NULL
       AND EXISTS (
           SELECT 1
           FROM auth.users AS u
           JOIN public.profiles AS p ON p.id = u.id
           JOIN public.student_email_roster AS r
             ON r.email = lower(btrim(u.email))
           JOIN public.colleges AS c
             ON c.id = p_college_id
            AND (
                c.id::text = r.college_id
                OR lower(btrim(c.name)) = lower(btrim(r.college_name))
            )
           JOIN public.departments AS d
             ON d.id = p_department_id
            AND d.college_id = c.id
           JOIN public.batches AS b
             ON b.id = p_batch_id
            AND b.college_id = c.id
           WHERE u.id = auth.uid()
             AND u.email_confirmed_at IS NOT NULL
             AND r.status = 'active'
             AND (
                 r.student_name IS NULL
                 OR lower(btrim(p.full_name)) = lower(btrim(r.student_name))
             )
             AND (
                 r.department IS NULL
                 OR lower(btrim(d.name)) = lower(btrim(r.department))
                 OR lower(btrim(d.code)) = lower(btrim(r.department))
             )
             AND (
                 r.student_id IS NULL
                 OR lower(btrim(p_rrn)) = lower(btrim(r.student_id))
                 OR lower(btrim(COALESCE(p_roll_number, ''))) = lower(btrim(r.student_id))
             )
       );
$$;

REVOKE ALL ON FUNCTION public.student_profile_matches_roster(UUID, UUID, UUID, TEXT, TEXT)
    FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.student_profile_matches_roster(UUID, UUID, UUID, TEXT, TEXT)
    TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_auth_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    requested_role TEXT;
BEGIN
    IF NEW.email IS NULL OR btrim(NEW.email) = '' THEN
        RAISE EXCEPTION 'Dudex accounts require an email address';
    END IF;

    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        lower(btrim(NEW.email)),
        COALESCE(
            NULLIF(btrim(NEW.raw_user_meta_data ->> 'full_name'), ''),
            split_part(NEW.email, '@', 1)
        )
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        updated_at = timezone('utc'::text, now());

    IF TG_OP = 'INSERT' THEN
        requested_role := NEW.raw_app_meta_data ->> 'role';

        IF requested_role IN ('teacher', 'admin') THEN
            INSERT INTO public.user_roles (user_id, role)
            VALUES (NEW.id, requested_role::public.app_role)
            ON CONFLICT (user_id, role) DO NOTHING;
        ELSIF NEW.email_confirmed_at IS NOT NULL AND EXISTS (
            SELECT 1
            FROM public.student_email_roster AS r
            WHERE r.email = lower(btrim(NEW.email))
              AND r.status = 'active'
        ) THEN
            INSERT INTO public.user_roles (user_id, role)
            VALUES (NEW.id, 'student')
            ON CONFLICT (user_id, role) DO NOTHING;
        END IF;
    ELSIF OLD.email IS DISTINCT FROM NEW.email
       OR OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at THEN
        IF NEW.email_confirmed_at IS NOT NULL AND EXISTS (
            SELECT 1
            FROM public.student_email_roster AS r
            WHERE r.email = lower(btrim(NEW.email))
              AND r.status = 'active'
        ) AND NOT EXISTS (
            SELECT 1
            FROM public.user_roles AS ur
            WHERE ur.user_id = NEW.id
              AND ur.role IN ('admin', 'teacher')
        ) AND NOT EXISTS (
            SELECT 1
            FROM public.teacher_profiles AS tp
            WHERE tp.user_id = NEW.id
        ) THEN
            INSERT INTO public.user_roles (user_id, role)
            VALUES (NEW.id, 'student')
            ON CONFLICT (user_id, role) DO NOTHING;
        ELSE
            DELETE FROM public.user_roles
            WHERE user_id = NEW.id
              AND role = 'student';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_auth_user_profile() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS dudex_auth_user_profile_created ON auth.users;
CREATE TRIGGER dudex_auth_user_profile_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_profile();

DROP TRIGGER IF EXISTS dudex_auth_user_email_changed ON auth.users;
CREATE TRIGGER dudex_auth_user_email_changed
AFTER UPDATE OF email, email_confirmed_at ON auth.users
FOR EACH ROW
WHEN (
    OLD.email IS DISTINCT FROM NEW.email
    OR OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at
)
EXECUTE FUNCTION public.handle_auth_user_profile();

INSERT INTO public.profiles (id, email, full_name)
SELECT
    u.id,
    lower(btrim(u.email)),
    COALESCE(
        NULLIF(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
        split_part(u.email, '@', 1)
    )
FROM auth.users AS u
WHERE u.email IS NOT NULL
  AND btrim(u.email) <> ''
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.user_roles (user_id, role)
SELECT r.id, 'student'::public.app_role
FROM auth.users AS u
JOIN public.student_email_roster AS roster
  ON roster.email = lower(btrim(u.email))
 AND roster.status = 'active'
JOIN public.profiles AS r ON r.id = u.id
WHERE NOT EXISTS (
    SELECT 1
    FROM public.user_roles AS existing_role
    WHERE existing_role.user_id = u.id
      AND existing_role.role IN ('admin', 'teacher')
)
  AND NOT EXISTS (
      SELECT 1
      FROM public.teacher_profiles AS tp
      WHERE tp.user_id = u.id
  )
  AND u.email_confirmed_at IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT tp.user_id, 'teacher'::public.app_role
FROM public.teacher_profiles AS tp
ON CONFLICT (user_id, role) DO NOTHING;

CREATE OR REPLACE FUNCTION public.set_user_role(
    target_user_id UUID,
    target_role public.app_role,
    enabled BOOLEAN DEFAULT true
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
    IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Only an administrator can change account roles'
            USING ERRCODE = '42501';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = target_user_id) THEN
        RAISE EXCEPTION 'Target user does not have a profile';
    END IF;

    IF enabled AND EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = target_user_id
          AND role <> target_role
    ) THEN
        RAISE EXCEPTION 'An account can have only one academy portal role';
    END IF;

    IF target_role = 'student' AND enabled AND NOT EXISTS (
        SELECT 1
        FROM auth.users AS u
        JOIN public.student_email_roster AS r
          ON r.email = lower(btrim(u.email))
         AND r.status = 'active'
        WHERE u.id = target_user_id
          AND u.email_confirmed_at IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'Student role requires a verified email on the active roster';
    END IF;

    IF enabled THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (target_user_id, target_role)
        ON CONFLICT (user_id, role) DO NOTHING;
    ELSE
        DELETE FROM public.user_roles
        WHERE user_id = target_user_id
          AND role = target_role;
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_user_role(UUID, public.app_role, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_user_role(UUID, public.app_role, BOOLEAN) TO authenticated;

CREATE OR REPLACE FUNCTION public.sync_student_role_with_roster()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
    IF TG_OP = 'DELETE'
       OR (TG_OP = 'UPDATE' AND OLD.email IS DISTINCT FROM NEW.email)
       OR (TG_OP = 'UPDATE' AND OLD.status = 'active' AND NEW.status <> 'active') THEN
        DELETE FROM public.user_roles AS ur
        USING auth.users AS u
        WHERE ur.user_id = u.id
          AND ur.role = 'student'
          AND lower(u.email) = OLD.email;
    END IF;

    IF TG_OP <> 'DELETE' AND NEW.status = 'active' THEN
        INSERT INTO public.user_roles (user_id, role)
        SELECT u.id, 'student'::public.app_role
        FROM auth.users AS u
        WHERE lower(u.email) = NEW.email
          AND u.email_confirmed_at IS NOT NULL
          AND NOT EXISTS (
              SELECT 1
              FROM public.user_roles AS existing_role
              WHERE existing_role.user_id = u.id
                AND existing_role.role IN ('admin', 'teacher')
          )
          AND NOT EXISTS (
              SELECT 1
              FROM public.teacher_profiles AS tp
              WHERE tp.user_id = u.id
            )
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_student_role_with_roster() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS student_role_roster_sync ON public.student_email_roster;
CREATE TRIGGER student_role_roster_sync
AFTER INSERT OR UPDATE OF email, status OR DELETE
ON public.student_email_roster
FOR EACH ROW EXECUTE FUNCTION public.sync_student_role_with_roster();

CREATE OR REPLACE FUNCTION public.provision_teacher_account(
    target_email TEXT,
    target_full_name TEXT,
    target_faculty_id TEXT,
    target_department_id UUID,
    target_designation TEXT,
    target_phone TEXT DEFAULT NULL,
    target_qualification TEXT DEFAULT NULL,
    target_avatar_url TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    normalized_email TEXT := lower(btrim(target_email));
    target_user_id UUID;
    target_college_id UUID;
    teacher_profile_id UUID;
BEGIN
    IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Only an administrator can provision teacher accounts'
            USING ERRCODE = '42501';
    END IF;

    IF normalized_email = '' OR btrim(target_faculty_id) = '' THEN
        RAISE EXCEPTION 'A valid email and faculty ID are required';
    END IF;

    SELECT u.id, d.college_id
    INTO target_user_id, target_college_id
    FROM auth.users AS u
    JOIN public.departments AS d ON d.id = target_department_id
    WHERE lower(u.email) = normalized_email
      AND u.email_confirmed_at IS NOT NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'A verified Auth account and valid department are required';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.user_roles AS ur
        WHERE ur.user_id = target_user_id
          AND ur.role IN ('admin', 'student')
    ) THEN
        RAISE EXCEPTION 'This account already has a conflicting portal role';
    END IF;

    INSERT INTO public.profiles (id, email, full_name, phone, avatar_url)
    VALUES (
        target_user_id,
        normalized_email,
        COALESCE(NULLIF(btrim(target_full_name), ''), split_part(normalized_email, '@', 1)),
        NULLIF(btrim(target_phone), ''),
        NULLIF(btrim(target_avatar_url), '')
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
        updated_at = timezone('utc'::text, now());

    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'teacher')
    ON CONFLICT (user_id, role) DO NOTHING;

    INSERT INTO public.teacher_profiles (
        user_id,
        faculty_id,
        college_id,
        department_id,
        designation,
        phone,
        qualification,
        status
    )
    VALUES (
        target_user_id,
        btrim(target_faculty_id),
        target_college_id,
        target_department_id,
        COALESCE(NULLIF(btrim(target_designation), ''), 'Assistant Professor'),
        NULLIF(btrim(target_phone), ''),
        NULLIF(btrim(target_qualification), ''),
        'active'
    )
    ON CONFLICT (user_id) DO UPDATE
    SET faculty_id = EXCLUDED.faculty_id,
        college_id = EXCLUDED.college_id,
        department_id = EXCLUDED.department_id,
        designation = EXCLUDED.designation,
        phone = EXCLUDED.phone,
        qualification = EXCLUDED.qualification,
        status = 'active',
        updated_at = timezone('utc'::text, now())
    RETURNING id INTO teacher_profile_id;

    RETURN teacher_profile_id;
END;
$$;

REVOKE ALL ON FUNCTION public.provision_teacher_account(
    TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, TEXT
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.provision_teacher_account(
    TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, TEXT
) TO authenticated;

-- Only authenticated users with a canonical role can read shared reference data.
DROP POLICY IF EXISTS "Authenticated users view colleges" ON public.colleges;
CREATE POLICY "Academy roles view colleges" ON public.colleges
    FOR SELECT TO authenticated
    USING (
        public.has_role(auth.uid(), 'student')
        OR public.has_role(auth.uid(), 'teacher')
        OR public.has_role(auth.uid(), 'admin')
    );

DROP POLICY IF EXISTS "Teachers manage coding problems" ON public.coding_problems;
CREATE POLICY "Teachers manage coding problems"
    ON public.coding_problems
    FOR ALL TO authenticated
    USING (
        public.has_role(auth.uid(), 'teacher')
        AND EXISTS (
            SELECT 1
            FROM public.questions AS q
            WHERE q.id = coding_problems.question_id
              AND q.created_by = public.current_teacher_id()
        )
    )
    WITH CHECK (
        public.has_role(auth.uid(), 'teacher')
        AND EXISTS (
            SELECT 1
            FROM public.questions AS q
            WHERE q.id = coding_problems.question_id
              AND q.created_by = public.current_teacher_id()
        )
    );

DROP POLICY IF EXISTS "Authenticated users view departments" ON public.departments;
CREATE POLICY "Academy roles view departments" ON public.departments
    FOR SELECT TO authenticated
    USING (
        public.has_role(auth.uid(), 'student')
        OR public.has_role(auth.uid(), 'teacher')
        OR public.has_role(auth.uid(), 'admin')
    );

DROP POLICY IF EXISTS "Teachers manage test cases" ON public.coding_test_cases;
CREATE POLICY "Teachers manage test cases"
    ON public.coding_test_cases
    FOR ALL TO authenticated
    USING (
        public.has_role(auth.uid(), 'teacher')
        AND EXISTS (
            SELECT 1
            FROM public.coding_problems AS cp
            JOIN public.questions AS q ON q.id = cp.question_id
            WHERE cp.id = coding_test_cases.coding_problem_id
              AND q.created_by = public.current_teacher_id()
        )
    )
    WITH CHECK (
        public.has_role(auth.uid(), 'teacher')
        AND EXISTS (
            SELECT 1
            FROM public.coding_problems AS cp
            JOIN public.questions AS q ON q.id = cp.question_id
            WHERE cp.id = coding_test_cases.coding_problem_id
              AND q.created_by = public.current_teacher_id()
        )
    );

DROP POLICY IF EXISTS "Authenticated users view specializations" ON public.specializations;
CREATE POLICY "Academy roles view specializations" ON public.specializations
    FOR SELECT TO authenticated
    USING (
        public.has_role(auth.uid(), 'student')
        OR public.has_role(auth.uid(), 'teacher')
        OR public.has_role(auth.uid(), 'admin')
    );

DROP POLICY IF EXISTS "Authenticated users view academic years" ON public.academic_years;
CREATE POLICY "Academy roles view academic years" ON public.academic_years
    FOR SELECT TO authenticated
    USING (
        public.has_role(auth.uid(), 'student')
        OR public.has_role(auth.uid(), 'teacher')
        OR public.has_role(auth.uid(), 'admin')
    );

DROP POLICY IF EXISTS "Authenticated users view batches" ON public.batches;
CREATE POLICY "Academy roles view batches" ON public.batches
    FOR SELECT TO authenticated
    USING (
        public.has_role(auth.uid(), 'student')
        OR public.has_role(auth.uid(), 'teacher')
        OR public.has_role(auth.uid(), 'admin')
    );

DROP POLICY IF EXISTS "Authenticated users view sections" ON public.sections;
CREATE POLICY "Academy roles view sections" ON public.sections
    FOR SELECT TO authenticated
    USING (
        public.has_role(auth.uid(), 'student')
        OR public.has_role(auth.uid(), 'teacher')
        OR public.has_role(auth.uid(), 'admin')
    );

DROP POLICY IF EXISTS "Authenticated users read teacher profiles" ON public.teacher_profiles;
CREATE POLICY "Authorized users view relevant teacher profiles" ON public.teacher_profiles
    FOR SELECT TO authenticated
    USING (
        public.has_role(auth.uid(), 'admin')
        OR (public.has_role(auth.uid(), 'teacher') AND user_id = auth.uid())
        OR (
            public.has_role(auth.uid(), 'student')
            AND EXISTS (
                SELECT 1
                FROM public.teacher_assignments AS ta
                JOIN public.class_memberships AS cm
                  ON cm.class_id = ta.class_id
                 AND cm.student_id = public.current_student_id()
                 AND cm.is_active = true
                WHERE ta.teacher_id = teacher_profiles.id
                  AND ta.is_active = true
            )
        )
    );

DROP POLICY IF EXISTS "Teachers view students in assigned classes" ON public.student_profiles;
CREATE POLICY "Students view self and assigned teachers view enrolled students"
    ON public.student_profiles
    FOR SELECT TO authenticated
    USING (
        (public.has_role(auth.uid(), 'student') AND user_id = auth.uid())
        OR public.has_role(auth.uid(), 'admin')
        OR EXISTS (
            SELECT 1
            FROM public.class_memberships AS cm
            WHERE cm.student_id = student_profiles.id
              AND public.teacher_has_class(cm.class_id)
        )
    );

DROP POLICY IF EXISTS "Students create own roster-backed student profile" ON public.student_profiles;
CREATE POLICY "Students create own roster-backed student profile"
    ON public.student_profiles
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        AND status = 'active'
        AND public.has_role(auth.uid(), 'student')
        AND public.student_profile_matches_roster(
            college_id,
            department_id,
            batch_id,
            rrn,
            roll_number
        )
    );

DROP POLICY IF EXISTS "Students update own roster-backed student profile" ON public.student_profiles;
CREATE POLICY "Students update own roster-backed student profile"
    ON public.student_profiles
    FOR UPDATE TO authenticated
    USING (
        user_id = auth.uid()
        AND status = 'active'
        AND public.has_role(auth.uid(), 'student')
    )
    WITH CHECK (
        user_id = auth.uid()
        AND status = 'active'
        AND public.has_role(auth.uid(), 'student')
        AND public.student_profile_matches_roster(
            college_id,
            department_id,
            batch_id,
            rrn,
            roll_number
        )
    );

DROP POLICY IF EXISTS "Teachers manage own questions or view active questions" ON public.questions;
CREATE POLICY "Teachers manage own questions"
    ON public.questions
    FOR ALL TO authenticated
    USING (
        public.has_role(auth.uid(), 'teacher')
        AND created_by = public.current_teacher_id()
    )
    WITH CHECK (
        public.has_role(auth.uid(), 'teacher')
        AND created_by = public.current_teacher_id()
    );
DROP POLICY IF EXISTS "Students view questions for enrolled assessments" ON public.questions;
CREATE POLICY "Students view questions for enrolled assessments"
    ON public.questions
    FOR SELECT TO authenticated
    USING (
        public.has_role(auth.uid(), 'student')
        AND is_active = true
        AND EXISTS (
            SELECT 1
            FROM public.assessment_questions AS aq
            JOIN public.assessments AS a ON a.id = aq.assessment_id
            WHERE aq.question_id = questions.id
              AND a.status IN ('scheduled', 'active')
              AND (a.start_at IS NULL OR a.start_at <= now())
              AND (a.end_at IS NULL OR a.end_at >= now())
              AND public.student_belongs_to_class(public.current_student_id(), a.class_id)
        )
    );

DROP POLICY IF EXISTS "Teachers view all options; Students only without is_correct leak" ON public.question_options;
CREATE POLICY "Teachers manage options for own questions"
    ON public.question_options
    FOR ALL TO authenticated
    USING (
        public.has_role(auth.uid(), 'teacher')
        AND EXISTS (
            SELECT 1
            FROM public.questions AS q
            WHERE q.id = question_options.question_id
              AND q.created_by = public.current_teacher_id()
        )
    )
    WITH CHECK (
        public.has_role(auth.uid(), 'teacher')
        AND EXISTS (
            SELECT 1
            FROM public.questions AS q
            WHERE q.id = question_options.question_id
              AND q.created_by = public.current_teacher_id()
        )
    );

DROP POLICY IF EXISTS "Students view questions for enrolled assessments" ON public.assessment_questions;
CREATE POLICY "Students view questions for enrolled assessments"
    ON public.assessment_questions
    FOR SELECT TO authenticated
    USING (
        public.has_role(auth.uid(), 'student')
        AND EXISTS (
            SELECT 1
            FROM public.assessments AS a
            WHERE a.id = assessment_questions.assessment_id
              AND a.status IN ('scheduled', 'active')
              AND (a.start_at IS NULL OR a.start_at <= now())
              AND (a.end_at IS NULL OR a.end_at >= now())
              AND public.student_belongs_to_class(public.current_student_id(), a.class_id)
        )
    );

CREATE OR REPLACE VIEW public.student_question_options AS
SELECT qo.id, qo.question_id, qo.option_text, qo.option_order
FROM public.question_options AS qo
WHERE EXISTS (
    SELECT 1
    FROM public.assessment_questions AS aq
    JOIN public.assessments AS a ON a.id = aq.assessment_id
    WHERE aq.question_id = qo.question_id
      AND a.status IN ('scheduled', 'active')
      AND (a.start_at IS NULL OR a.start_at <= now())
      AND (a.end_at IS NULL OR a.end_at >= now())
      AND public.student_belongs_to_class(public.current_student_id(), a.class_id)
);
REVOKE ALL ON public.student_question_options FROM anon, PUBLIC;
GRANT SELECT ON public.student_question_options TO authenticated;

DROP POLICY IF EXISTS "Teachers view course offerings for assigned classes" ON public.course_offerings;
CREATE POLICY "Users view course offerings for their classes"
    ON public.course_offerings
    FOR SELECT TO authenticated
    USING (
        public.has_role(auth.uid(), 'admin')
        OR (
            public.has_role(auth.uid(), 'teacher')
            AND (
                teacher_id = public.current_teacher_id()
                OR public.teacher_has_class(class_id)
            )
        )
        OR (
            public.has_role(auth.uid(), 'student')
            AND is_active = true
            AND public.student_belongs_to_class(public.current_student_id(), class_id)
        )
    );

DROP POLICY IF EXISTS "Authenticated users view grading rules" ON public.grading_rules;
CREATE POLICY "Academy roles view grading rules" ON public.grading_rules
    FOR SELECT TO authenticated
    USING (
        public.has_role(auth.uid(), 'student')
        OR public.has_role(auth.uid(), 'teacher')
        OR public.has_role(auth.uid(), 'admin')
    );

DROP POLICY IF EXISTS "Authenticated users view platform settings" ON public.platform_settings;
CREATE POLICY "Academy roles view platform settings" ON public.platform_settings
    FOR SELECT TO authenticated
    USING (
        public.has_role(auth.uid(), 'student')
        OR public.has_role(auth.uid(), 'teacher')
        OR public.has_role(auth.uid(), 'admin')
    );

DROP POLICY IF EXISTS "Users create and view own activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Users view own activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Users create own activity logs" ON public.activity_logs;
CREATE POLICY "Users view own activity logs" ON public.activity_logs
    FOR SELECT TO authenticated
    USING (actor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create own activity logs" ON public.activity_logs
    FOR INSERT TO authenticated
    WITH CHECK (
        actor_id = auth.uid()
        AND (
            public.has_role(auth.uid(), 'student')
            OR public.has_role(auth.uid(), 'teacher')
            OR public.has_role(auth.uid(), 'admin')
        )
    );

DROP POLICY IF EXISTS "Students manage own attempts" ON public.student_attempts;
CREATE POLICY "Students view own attempts"
    ON public.student_attempts
    FOR SELECT TO authenticated
    USING (
        public.has_role(auth.uid(), 'student')
        AND student_id = public.current_student_id()
    );
CREATE POLICY "Students start own enrolled assessment attempts"
    ON public.student_attempts
    FOR INSERT TO authenticated
    WITH CHECK (
        public.has_role(auth.uid(), 'student')
        AND student_id = public.current_student_id()
        AND status = 'in_progress'
        AND score IS NULL
        AND percentage IS NULL
        AND grade IS NULL
        AND EXISTS (
            SELECT 1
            FROM public.assessments AS a
            WHERE a.id = student_attempts.assessment_id
              AND a.status IN ('scheduled', 'active')
              AND (a.start_at IS NULL OR a.start_at <= now())
              AND (a.end_at IS NULL OR a.end_at >= now())
              AND student_attempts.expires_at <= now()
                    + make_interval(secs => a.duration_seconds)
                    + INTERVAL '2 minutes'
              AND public.student_belongs_to_class(
                    public.current_student_id(),
                    a.class_id
              )
        )
    );

DROP POLICY IF EXISTS "Students manage own answers" ON public.student_answers;
CREATE POLICY "Students view own answers"
    ON public.student_answers
    FOR SELECT TO authenticated
    USING (
        public.has_role(auth.uid(), 'student')
        AND EXISTS (
            SELECT 1
            FROM public.student_attempts AS sa
            WHERE sa.id = student_answers.attempt_id
              AND sa.student_id = public.current_student_id()
        )
    );

DROP POLICY IF EXISTS "Teachers manage announcements for assigned classes" ON public.announcements;
ALTER TABLE public.announcements
    ADD COLUMN IF NOT EXISTS target_college_id UUID
    REFERENCES public.colleges(id) ON DELETE CASCADE;

CREATE POLICY "Teachers manage announcements for assigned classes"
    ON public.announcements
    FOR ALL TO authenticated
    USING (
        public.has_role(auth.uid(), 'teacher')
        AND (
            (target_class_id IS NOT NULL AND public.teacher_has_class(target_class_id))
            OR created_by = public.current_teacher_id()
        )
    )
    WITH CHECK (
        public.has_role(auth.uid(), 'teacher')
        AND (
            (target_class_id IS NOT NULL AND public.teacher_has_class(target_class_id))
            OR created_by = public.current_teacher_id()
        )
    );

DROP POLICY IF EXISTS "Students view relevant announcements" ON public.announcements;
CREATE POLICY "Students view relevant announcements"
    ON public.announcements
    FOR SELECT TO authenticated
    USING (
        public.has_role(auth.uid(), 'student')
        AND publish_at <= now()
        AND (expires_at IS NULL OR expires_at > now())
        AND (
            scope = 'all'
            OR (
                scope = 'class'
                AND target_class_id IS NOT NULL
                AND public.student_belongs_to_class(public.current_student_id(), target_class_id)
            )
            OR EXISTS (
                SELECT 1
                FROM public.student_profiles AS sp
                WHERE sp.id = public.current_student_id()
                  AND (
                      (scope = 'college' AND sp.college_id = announcements.target_college_id)
                      OR (scope = 'department' AND sp.department_id = announcements.target_department_id)
                      OR (scope = 'batch' AND sp.batch_id = announcements.target_batch_id)
                  )
            )
        )
    );

DROP POLICY IF EXISTS "Students view and submit code submissions" ON public.code_submissions;
DROP POLICY IF EXISTS "Students view own code submissions" ON public.code_submissions;
CREATE POLICY "Students view own code submissions"
    ON public.code_submissions
    FOR SELECT TO authenticated
    USING (
        public.has_role(auth.uid(), 'student')
        AND student_id = public.current_student_id()
    );
DROP POLICY IF EXISTS "Students insert own code submissions" ON public.code_submissions;
CREATE POLICY "Students insert own code submissions"
    ON public.code_submissions
    FOR INSERT TO authenticated
    WITH CHECK (
        public.has_role(auth.uid(), 'student')
        AND student_id = public.current_student_id()
        AND EXISTS (
            SELECT 1
            FROM public.coding_problems AS cp
            JOIN public.assessment_questions AS aq ON aq.question_id = cp.question_id
            JOIN public.assessments AS a ON a.id = aq.assessment_id
            WHERE cp.id = code_submissions.coding_problem_id
              AND a.status IN ('scheduled', 'active')
              AND public.student_belongs_to_class(public.current_student_id(), a.class_id)
        )
    );
DROP POLICY IF EXISTS "Teachers view submissions for assigned classes" ON public.code_submissions;
CREATE POLICY "Teachers view submissions for assigned classes"
    ON public.code_submissions
    FOR SELECT TO authenticated
    USING (
        public.has_role(auth.uid(), 'teacher')
        AND EXISTS (
            SELECT 1
            FROM public.coding_problems AS cp
            JOIN public.assessment_questions AS aq ON aq.question_id = cp.question_id
            JOIN public.assessments AS a ON a.id = aq.assessment_id
            WHERE cp.id = code_submissions.coding_problem_id
              AND public.teacher_has_class(a.class_id)
        )
    );

DROP POLICY IF EXISTS "Teachers manage test cases, Students view only visible test cases" ON public.coding_test_cases;
DROP POLICY IF EXISTS "Teachers manage test cases" ON public.coding_test_cases;
CREATE POLICY "Teachers manage test cases"
    ON public.coding_test_cases
    FOR ALL TO authenticated
    USING (
        public.has_role(auth.uid(), 'teacher')
        AND EXISTS (
            SELECT 1
            FROM public.coding_problems AS cp
            WHERE cp.id = coding_test_cases.coding_problem_id
              AND public.teacher_has_class(
                  (SELECT a.class_id
                   FROM public.assessment_questions AS aq
                   JOIN public.assessments AS a ON a.id = aq.assessment_id
                   WHERE aq.question_id = cp.question_id
                   LIMIT 1)
              )
        )
    )
    WITH CHECK (
        public.has_role(auth.uid(), 'teacher')
        AND EXISTS (
            SELECT 1
            FROM public.coding_problems AS cp
            JOIN public.assessment_questions AS aq ON aq.question_id = cp.question_id
            JOIN public.assessments AS a ON a.id = aq.assessment_id
            WHERE cp.id = coding_test_cases.coding_problem_id
              AND public.teacher_has_class(a.class_id)
        )
    );
DROP POLICY IF EXISTS "Students view visible test cases for enrolled assessments" ON public.coding_test_cases;
CREATE POLICY "Students view visible test cases for enrolled assessments"
    ON public.coding_test_cases
    FOR SELECT TO authenticated
    USING (
        public.has_role(auth.uid(), 'student')
        AND is_hidden = false
        AND EXISTS (
            SELECT 1
            FROM public.coding_problems AS cp
            JOIN public.assessment_questions AS aq ON aq.question_id = cp.question_id
            JOIN public.assessments AS a ON a.id = aq.assessment_id
            WHERE cp.id = coding_test_cases.coding_problem_id
              AND a.status IN ('scheduled', 'active')
              AND public.student_belongs_to_class(public.current_student_id(), a.class_id)
        )
    );

DROP POLICY IF EXISTS "Students view coding problems for enrolled assessments" ON public.coding_problems;
CREATE POLICY "Students view coding problems for enrolled assessments"
    ON public.coding_problems
    FOR SELECT TO authenticated
    USING (
        public.has_role(auth.uid(), 'student')
        AND EXISTS (
            SELECT 1
            FROM public.assessment_questions AS aq
            JOIN public.assessments AS a ON a.id = aq.assessment_id
            WHERE aq.question_id = coding_problems.question_id
              AND a.status IN ('scheduled', 'active')
              AND public.student_belongs_to_class(public.current_student_id(), a.class_id)
        )
    );

-- Admin CRUD is policy-gated; user_roles remains writable only through set_user_role().
DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOR table_name IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename IN (
              'profiles',
              'colleges',
              'departments',
              'specializations',
              'academic_years',
              'batches',
              'sections',
              'classes',
              'student_profiles',
              'class_memberships',
              'teacher_profiles',
              'teacher_assignments',
              'subjects',
              'course_offerings',
              'live_classes',
              'class_sessions',
              'attendance_records',
              'attendance_correction_requests',
              'questions',
              'question_options',
              'assessments',
              'assessment_questions',
              'student_attempts',
              'student_answers',
              'results',
              'notes',
              'note_attachments',
              'notifications',
              'announcements',
              'platform_settings',
              'grading_rules',
              'coding_problems',
              'coding_test_cases',
              'code_submissions'
          )
    LOOP
        EXECUTE format(
            'DROP POLICY IF EXISTS %I ON public.%I',
            'Admins manage all rows',
            table_name
        );
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.has_role(auth.uid(), %L)) WITH CHECK (public.has_role(auth.uid(), %L))',
            'Admins manage all rows',
            table_name,
            'admin',
            'admin'
        );
    END LOOP;
END;
$$;

DROP POLICY IF EXISTS "Users view own roles" ON public.user_roles;
CREATE POLICY "Users view own roles"
    ON public.user_roles
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON
    public.colleges,
    public.departments,
    public.specializations,
    public.academic_years,
    public.batches,
    public.sections,
    public.classes,
    public.subjects,
    public.course_offerings,
    public.grading_rules,
    public.platform_settings
TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_email_roster TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.student_answers FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.code_submissions FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.student_attempts FROM authenticated;
GRANT INSERT (assessment_id, student_id, expires_at) ON public.student_attempts TO authenticated;
GRANT INSERT (attempt_id, coding_problem_id, student_id, language, code)
    ON public.code_submissions TO authenticated;

COMMIT;
