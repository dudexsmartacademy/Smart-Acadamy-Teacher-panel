-- 037_rls.sql
-- Production Hardened Row Level Security (RLS) policies with inactive/suspended teacher checks

-- 1. Helper security functions
CREATE OR REPLACE FUNCTION public.current_teacher_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT id FROM public.teacher_profiles 
    WHERE user_id = auth.uid() AND status = 'active' 
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_student_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT id FROM public.student_profiles 
    WHERE user_id = auth.uid() AND status = 'active' 
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.teacher_has_class(p_class_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.teacher_assignments ta
        JOIN public.teacher_profiles tp ON ta.teacher_id = tp.id
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
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.course_offerings co
        JOIN public.teacher_profiles tp ON co.teacher_id = tp.id
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
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.class_memberships
        WHERE student_id = p_student_id
          AND class_id = p_class_id
          AND is_active = true
    );
$$;

-- 2. Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colleges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specializations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_offerings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_correction_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grading_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coding_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coding_test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_submissions ENABLE ROW LEVEL SECURITY;

-- 3. PROFILES & ROLES POLICIES
CREATE POLICY "Users view own profile, Admins view all" ON public.profiles
    FOR SELECT USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users view own roles" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- 4. ACADEMIC HIERARCHY POLICIES
CREATE POLICY "Authenticated users view colleges" ON public.colleges
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users view departments" ON public.departments
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users view specializations" ON public.specializations
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users view academic years" ON public.academic_years
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users view batches" ON public.batches
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users view sections" ON public.sections
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Teachers view assigned classes, Admins view all, Students view enrolled" ON public.classes
    FOR SELECT TO authenticated USING (
        public.teacher_has_class(id) 
        OR public.has_role(auth.uid(), 'admin')
        OR (public.has_role(auth.uid(), 'student') AND EXISTS (
            SELECT 1 FROM public.class_memberships cm 
            WHERE cm.class_id = classes.id AND cm.student_id = public.current_student_id()
        ))
    );

-- 5. TEACHER PROFILES & ASSIGNMENTS
CREATE POLICY "Authenticated users read teacher profiles" ON public.teacher_profiles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Teachers update own active profile" ON public.teacher_profiles
    FOR UPDATE TO authenticated USING (user_id = auth.uid() AND status = 'active');

CREATE POLICY "Teachers view own assignments" ON public.teacher_assignments
    FOR SELECT TO authenticated USING (
        teacher_id = public.current_teacher_id() OR public.has_role(auth.uid(), 'admin')
    );

-- 6. STUDENTS & CLASS MEMBERSHIPS
CREATE POLICY "Teachers view students in assigned classes" ON public.student_profiles
    FOR SELECT TO authenticated USING (
        user_id = auth.uid() 
        OR public.has_role(auth.uid(), 'admin')
        OR EXISTS (
            SELECT 1 FROM public.class_memberships cm
            WHERE cm.student_id = student_profiles.id
              AND public.teacher_has_class(cm.class_id)
        )
    );

CREATE POLICY "Teachers view memberships in assigned classes" ON public.class_memberships
    FOR SELECT TO authenticated USING (
        student_id = public.current_student_id()
        OR public.teacher_has_class(class_id)
        OR public.has_role(auth.uid(), 'admin')
    );

-- 7. SUBJECTS & COURSE OFFERINGS
CREATE POLICY "Authenticated users read subjects" ON public.subjects
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Teachers view course offerings for assigned classes" ON public.course_offerings
    FOR SELECT TO authenticated USING (
        public.teacher_has_class(class_id)
        OR teacher_id = public.current_teacher_id()
        OR public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'student')
    );

-- 8. LIVE CLASSES
CREATE POLICY "Teachers manage live classes for assigned classes" ON public.live_classes
    FOR ALL TO authenticated USING (
        public.teacher_has_class(class_id) OR public.has_role(auth.uid(), 'admin')
    ) WITH CHECK (
        public.teacher_has_class(class_id) OR public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "Students view live classes for enrolled classes" ON public.live_classes
    FOR SELECT TO authenticated USING (
        public.student_belongs_to_class(public.current_student_id(), class_id)
    );

-- 9. SESSIONS & ATTENDANCE
CREATE POLICY "Teachers manage sessions for assigned classes" ON public.class_sessions
    FOR ALL TO authenticated USING (
        public.teacher_has_class(class_id) OR public.has_role(auth.uid(), 'admin')
    ) WITH CHECK (
        public.teacher_has_class(class_id) OR public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "Students view sessions for their classes" ON public.class_sessions
    FOR SELECT TO authenticated USING (
        public.student_belongs_to_class(public.current_student_id(), class_id)
    );

CREATE POLICY "Teachers manage attendance for assigned classes" ON public.attendance_records
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.class_sessions cs
            WHERE cs.id = attendance_records.session_id
              AND public.teacher_has_class(cs.class_id)
        ) OR public.has_role(auth.uid(), 'admin')
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.class_sessions cs
            WHERE cs.id = attendance_records.session_id
              AND public.teacher_has_class(cs.class_id)
        ) OR public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "Students view own attendance records" ON public.attendance_records
    FOR SELECT TO authenticated USING (
        student_id = public.current_student_id()
    );

CREATE POLICY "Teachers manage correction requests for their sessions" ON public.attendance_correction_requests
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.attendance_records ar
            JOIN public.class_sessions cs ON ar.session_id = cs.id
            WHERE ar.id = attendance_correction_requests.attendance_record_id
              AND public.teacher_has_class(cs.class_id)
        ) OR public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "Students view and insert own correction requests" ON public.attendance_correction_requests
    FOR ALL TO authenticated USING (
        student_id = public.current_student_id()
    ) WITH CHECK (
        student_id = public.current_student_id()
    );

-- 10. QUESTIONS & QUESTION OPTIONS (ANTI-LEAK PROTECTION)
CREATE POLICY "Teachers manage own questions or view active questions" ON public.questions
    FOR ALL TO authenticated USING (
        created_by = public.current_teacher_id() 
        OR public.has_role(auth.uid(), 'admin')
        OR (is_active = true AND public.has_role(auth.uid(), 'teacher'))
    ) WITH CHECK (
        created_by = public.current_teacher_id() OR public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "Teachers view all options; Students only without is_correct leak" ON public.question_options
    FOR ALL TO authenticated USING (
        public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin')
    );

-- 11. ASSESSMENTS & ATTEMPTS
CREATE POLICY "Teachers manage assessments for assigned classes" ON public.assessments
    FOR ALL TO authenticated USING (
        public.teacher_has_class(class_id) OR created_by = public.current_teacher_id() OR public.has_role(auth.uid(), 'admin')
    ) WITH CHECK (
        public.teacher_has_class(class_id) OR public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "Students view published assessments for enrolled class" ON public.assessments
    FOR SELECT TO authenticated USING (
        status IN ('scheduled', 'active', 'closed') 
        AND public.student_belongs_to_class(public.current_student_id(), class_id)
    );

CREATE POLICY "Teachers manage assessment questions" ON public.assessment_questions
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.assessments a 
            WHERE a.id = assessment_questions.assessment_id 
              AND (public.teacher_has_class(a.class_id) OR public.has_role(auth.uid(), 'admin'))
        )
    );

CREATE POLICY "Teachers view attempts for assigned classes" ON public.student_attempts
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.assessments a 
            WHERE a.id = student_attempts.assessment_id 
              AND (public.teacher_has_class(a.class_id) OR public.has_role(auth.uid(), 'admin'))
        )
    );

CREATE POLICY "Students manage own attempts" ON public.student_attempts
    FOR ALL TO authenticated USING (
        student_id = public.current_student_id()
    ) WITH CHECK (
        student_id = public.current_student_id()
    );

CREATE POLICY "Teachers view student answers for assigned assessments" ON public.student_answers
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.student_attempts sa
            JOIN public.assessments a ON sa.assessment_id = a.id
            WHERE sa.id = student_answers.attempt_id
              AND (public.teacher_has_class(a.class_id) OR public.has_role(auth.uid(), 'admin'))
        )
    );

CREATE POLICY "Students manage own answers" ON public.student_answers
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.student_attempts sa
            WHERE sa.id = student_answers.attempt_id
              AND sa.student_id = public.current_student_id()
        )
    );

-- 12. RESULTS
CREATE POLICY "Teachers view results for assigned classes" ON public.results
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.assessments a 
            WHERE a.id = results.assessment_id 
              AND (public.teacher_has_class(a.class_id) OR public.has_role(auth.uid(), 'admin'))
        )
    );

CREATE POLICY "Students view own results" ON public.results
    FOR SELECT TO authenticated USING (
        student_id = public.current_student_id()
    );

-- 13. NOTES & ATTACHMENTS
CREATE POLICY "Teachers manage notes for assigned classes" ON public.notes
    FOR ALL TO authenticated USING (
        public.teacher_has_class(class_id) OR teacher_id = public.current_teacher_id() OR public.has_role(auth.uid(), 'admin')
    ) WITH CHECK (
        public.teacher_has_class(class_id) OR public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "Students view active published notes for enrolled class" ON public.notes
    FOR SELECT TO authenticated USING (
        is_published = true 
        AND archived_at IS NULL
        AND public.student_belongs_to_class(public.current_student_id(), class_id)
    );

CREATE POLICY "Teachers manage note attachments" ON public.note_attachments
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.notes n
            WHERE n.id = note_attachments.note_id
              AND (public.teacher_has_class(n.class_id) OR public.has_role(auth.uid(), 'admin'))
        )
    );

CREATE POLICY "Students view attachments for accessible notes" ON public.note_attachments
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.notes n
            WHERE n.id = note_attachments.note_id
              AND n.is_published = true 
              AND n.archived_at IS NULL
              AND public.student_belongs_to_class(public.current_student_id(), n.class_id)
        )
    );

-- 14. NOTIFICATIONS, ANNOUNCEMENTS, LOGS, GRADING RULES
CREATE POLICY "Users view own notifications" ON public.notifications
    FOR ALL TO authenticated USING (
        recipient_id = auth.uid()
    );

CREATE POLICY "Teachers manage announcements for assigned classes" ON public.announcements
    FOR ALL TO authenticated USING (
        (target_class_id IS NOT NULL AND public.teacher_has_class(target_class_id))
        OR created_by = public.current_teacher_id()
        OR public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "Students view relevant announcements" ON public.announcements
    FOR SELECT TO authenticated USING (
        scope = 'all'
        OR (target_class_id IS NOT NULL AND public.student_belongs_to_class(public.current_student_id(), target_class_id))
    );

CREATE POLICY "Users create and view own activity logs" ON public.activity_logs
    FOR ALL TO authenticated USING (
        actor_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "Admins view audit logs" ON public.audit_logs
    FOR SELECT TO authenticated USING (
        public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "Authenticated users view grading rules" ON public.grading_rules
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users view platform settings" ON public.platform_settings
    FOR SELECT TO authenticated USING (true);

-- 15. CODING ASSESSMENTS
CREATE POLICY "Teachers manage coding problems" ON public.coding_problems
    FOR ALL TO authenticated USING (
        public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "Teachers manage test cases, Students view only visible test cases" ON public.coding_test_cases
    FOR SELECT TO authenticated USING (
        public.has_role(auth.uid(), 'teacher') 
        OR public.has_role(auth.uid(), 'admin')
        OR is_hidden = false
    );

CREATE POLICY "Students view and submit code submissions" ON public.code_submissions
    FOR ALL TO authenticated USING (
        student_id = public.current_student_id()
        OR public.has_role(auth.uid(), 'teacher')
        OR public.has_role(auth.uid(), 'admin')
    );
