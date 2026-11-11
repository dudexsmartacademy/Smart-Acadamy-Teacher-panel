-- 041_grants_and_security.sql
-- Production database security: Table grants and least-privilege role permissions

-- 1. Revoke default public/anon permissions on all schema tables
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, public;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, public;

-- 2. Grant basic read permissions on public reference tables to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.colleges TO authenticated;
GRANT SELECT ON public.departments TO authenticated;
GRANT SELECT ON public.specializations TO authenticated;
GRANT SELECT ON public.academic_years TO authenticated;
GRANT SELECT ON public.batches TO authenticated;
GRANT SELECT ON public.sections TO authenticated;
GRANT SELECT ON public.classes TO authenticated;
GRANT SELECT ON public.subjects TO authenticated;
GRANT SELECT ON public.course_offerings TO authenticated;
GRANT SELECT ON public.grading_rules TO authenticated;
GRANT SELECT ON public.platform_settings TO authenticated;

-- 3. Grant table access to authenticated users (controlled via Row Level Security)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_memberships TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_classes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_records TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_correction_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.question_options TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_questions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_attempts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_answers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.results TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.note_attachments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_logs TO authenticated;
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coding_problems TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coding_test_cases TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.code_submissions TO authenticated;

-- 4. Grant execute permissions on Database Functions
GRANT EXECUTE ON FUNCTION public.calculate_grade(NUMERIC, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_attendance_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_subject_attendance(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_class_attendance_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_mcq_attempt(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_teacher_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_student_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_has_class(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_has_course(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.student_belongs_to_class(UUID, UUID) TO authenticated;
