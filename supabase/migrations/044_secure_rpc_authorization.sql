BEGIN;

CREATE OR REPLACE FUNCTION public.get_student_attendance_summary(p_student_id UUID)
RETURNS TABLE (
    total_sessions BIGINT,
    present_count BIGINT,
    absent_count BIGINT,
    late_count BIGINT,
    excused_count BIGINT,
    percentage NUMERIC(5,2)
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
    IF auth.uid() IS NULL OR NOT (
        (public.has_role(auth.uid(), 'student') AND p_student_id = public.current_student_id())
        OR public.has_role(auth.uid(), 'admin')
        OR (
            public.has_role(auth.uid(), 'teacher')
            AND EXISTS (
                SELECT 1
                FROM public.class_memberships AS cm
                JOIN public.teacher_assignments AS ta
                  ON ta.class_id = cm.class_id
                 AND ta.teacher_id = public.current_teacher_id()
                 AND ta.is_active = true
                WHERE cm.student_id = p_student_id
                  AND cm.is_active = true
            )
        )
    ) THEN
        RAISE EXCEPTION 'Not authorized to view this attendance summary'
            USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    WITH stats AS (
        SELECT
            COUNT(ar.id) AS total,
            COUNT(ar.id) FILTER (WHERE ar.status = 'present') AS pres,
            COUNT(ar.id) FILTER (WHERE ar.status = 'absent') AS abs,
            COUNT(ar.id) FILTER (WHERE ar.status = 'late') AS lte,
            COUNT(ar.id) FILTER (WHERE ar.status = 'excused') AS exc
        FROM public.attendance_records AS ar
        JOIN public.class_sessions AS cs ON cs.id = ar.session_id
        WHERE ar.student_id = p_student_id
          AND (
              public.has_role(auth.uid(), 'admin')
              OR (
                  public.has_role(auth.uid(), 'student')
                  AND p_student_id = public.current_student_id()
              )
              OR (
                  public.has_role(auth.uid(), 'teacher')
                  AND public.teacher_has_class(cs.class_id)
              )
          )
    )
    SELECT
        total,
        pres,
        abs,
        lte,
        exc,
        CASE
            WHEN total = 0 THEN 0.00
            ELSE ROUND(((pres + (lte * 0.5))::NUMERIC / total::NUMERIC) * 100.0, 2)
        END
    FROM stats;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_student_subject_attendance(
    p_student_id UUID,
    p_subject_id UUID
)
RETURNS TABLE (
    subject_id UUID,
    total_sessions BIGINT,
    present_count BIGINT,
    absent_count BIGINT,
    late_count BIGINT,
    excused_count BIGINT,
    percentage NUMERIC(5,2)
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
    IF auth.uid() IS NULL OR NOT (
        (public.has_role(auth.uid(), 'student') AND p_student_id = public.current_student_id())
        OR public.has_role(auth.uid(), 'admin')
        OR (
            public.has_role(auth.uid(), 'teacher')
            AND EXISTS (
                SELECT 1
                FROM public.class_memberships AS cm
                JOIN public.teacher_assignments AS ta
                  ON ta.class_id = cm.class_id
                 AND ta.teacher_id = public.current_teacher_id()
                 AND ta.is_active = true
                WHERE cm.student_id = p_student_id
                  AND cm.is_active = true
            )
        )
    ) THEN
        RAISE EXCEPTION 'Not authorized to view this attendance summary'
            USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    WITH stats AS (
        SELECT
            COUNT(ar.id) AS total,
            COUNT(ar.id) FILTER (WHERE ar.status = 'present') AS pres,
            COUNT(ar.id) FILTER (WHERE ar.status = 'absent') AS abs,
            COUNT(ar.id) FILTER (WHERE ar.status = 'late') AS lte,
            COUNT(ar.id) FILTER (WHERE ar.status = 'excused') AS exc
        FROM public.attendance_records AS ar
        JOIN public.class_sessions AS cs ON cs.id = ar.session_id
        LEFT JOIN public.course_offerings AS co ON co.id = cs.course_offering_id
        WHERE ar.student_id = p_student_id
          AND (co.subject_id = p_subject_id OR cs.course_offering_id IS NULL)
          AND (
              public.has_role(auth.uid(), 'admin')
              OR (
                  public.has_role(auth.uid(), 'student')
                  AND p_student_id = public.current_student_id()
              )
              OR (
                  public.has_role(auth.uid(), 'teacher')
                  AND public.teacher_has_class(cs.class_id)
              )
          )
    )
    SELECT
        p_subject_id,
        total,
        pres,
        abs,
        lte,
        exc,
        CASE
            WHEN total = 0 THEN 0.00
            ELSE ROUND(((pres + (lte * 0.5))::NUMERIC / total::NUMERIC) * 100.0, 2)
        END
    FROM stats;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_class_attendance_summary(p_class_id UUID)
RETURNS TABLE (
    class_id UUID,
    total_sessions BIGINT,
    enrolled_students BIGINT,
    average_percentage NUMERIC(5,2)
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
    IF auth.uid() IS NULL OR NOT (
        public.has_role(auth.uid(), 'admin')
        OR (
            public.has_role(auth.uid(), 'teacher')
            AND public.teacher_has_class(p_class_id)
        )
    ) THEN
        RAISE EXCEPTION 'Not authorized to view this class attendance summary'
            USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    WITH session_counts AS (
        SELECT COUNT(id) AS total_sess
        FROM public.class_sessions
        WHERE class_id = p_class_id
    ),
    student_counts AS (
        SELECT COUNT(id) AS total_stud
        FROM public.class_memberships
        WHERE class_id = p_class_id
          AND is_active = true
    ),
    record_stats AS (
        SELECT
            COUNT(ar.id) AS total_records,
            COUNT(ar.id) FILTER (WHERE ar.status = 'present') AS total_present
        FROM public.attendance_records AS ar
        JOIN public.class_sessions AS cs ON cs.id = ar.session_id
        WHERE cs.class_id = p_class_id
    )
    SELECT
        p_class_id,
        sc.total_sess,
        stc.total_stud,
        CASE
            WHEN rs.total_records = 0 THEN 0.00
            ELSE ROUND((rs.total_present::NUMERIC / rs.total_records::NUMERIC) * 100.0, 2)
        END
    FROM session_counts AS sc, student_counts AS stc, record_stats AS rs;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_mcq_attempt(
    p_attempt_id UUID,
    p_answers JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_attempt RECORD;
    v_assessment RECORD;
    v_existing_result RECORD;
    v_answer JSONB;
    v_question_id UUID;
    v_answered_question_ids UUID[] := ARRAY[]::UUID[];
    v_selected_option_id UUID;
    v_is_correct BOOLEAN;
    v_question_marks NUMERIC(5,2);
    v_marks_awarded NUMERIC(5,2);
    v_total_score NUMERIC(6,2) := 0.00;
    v_total_max_marks NUMERIC(6,2) := 0.00;
    v_percentage NUMERIC(5,2) := 0.00;
    v_grade TEXT;
    v_is_passed BOOLEAN;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
    IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'student') THEN
        RAISE EXCEPTION 'A signed-in student is required to submit an assessment'
            USING ERRCODE = '42501';
    END IF;

    IF p_answers IS NOT NULL AND jsonb_typeof(p_answers) <> 'array' THEN
        RAISE EXCEPTION 'Answers must be a JSON array';
    END IF;

    SELECT
        a.*,
        sp.user_id AS student_user_id,
        c.college_id
    INTO v_attempt
    FROM public.student_attempts AS a
    JOIN public.student_profiles AS sp ON sp.id = a.student_id
    JOIN public.assessments AS ass ON ass.id = a.assessment_id
    JOIN public.classes AS c ON c.id = ass.class_id
    WHERE a.id = p_attempt_id
    FOR UPDATE OF a;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Assessment attempt not found';
    END IF;

    IF v_attempt.student_user_id <> auth.uid()
       OR v_attempt.student_id <> public.current_student_id() THEN
        RAISE EXCEPTION 'Not authorized to submit this assessment attempt'
            USING ERRCODE = '42501';
    END IF;

    IF v_attempt.status = 'evaluated' THEN
        SELECT * INTO v_existing_result
        FROM public.results
        WHERE attempt_id = p_attempt_id;

        IF FOUND THEN
            RETURN jsonb_build_object(
                'success', true,
                'attempt_id', p_attempt_id,
                'score', v_existing_result.score,
                'max_marks', v_existing_result.max_marks,
                'percentage', v_existing_result.percentage,
                'grade', v_existing_result.grade,
                'is_passed', v_existing_result.is_passed,
                'submitted_at', v_existing_result.published_at,
                'idempotent', true
            );
        END IF;
    END IF;

    IF v_attempt.status NOT IN ('in_progress', 'submitted', 'auto_submitted') THEN
        RAISE EXCEPTION 'Attempt cannot be evaluated in its current status';
    END IF;

    SELECT * INTO v_assessment
    FROM public.assessments
    WHERE id = v_attempt.assessment_id;

    IF NOT FOUND
       OR v_assessment.status NOT IN ('active', 'scheduled')
       OR (v_assessment.start_at IS NOT NULL AND v_now < v_assessment.start_at)
       OR (v_assessment.end_at IS NOT NULL AND v_now > v_assessment.end_at + INTERVAL '2 minutes') THEN
        RAISE EXCEPTION 'Assessment is not currently accepting submissions';
    END IF;

    IF v_now > v_attempt.expires_at + INTERVAL '2 minutes' THEN
        RAISE EXCEPTION 'Assessment attempt has expired and can no longer be evaluated';
    END IF;

    FOR v_answer IN
        SELECT value
        FROM jsonb_array_elements(COALESCE(p_answers, '[]'::jsonb))
    LOOP
        v_question_id := (v_answer ->> 'question_id')::UUID;

        IF v_question_id = ANY(v_answered_question_ids) THEN
            RAISE EXCEPTION 'Each assessment question may be answered only once';
        END IF;
        v_answered_question_ids := array_append(v_answered_question_ids, v_question_id);

        IF NOT EXISTS (
            SELECT 1
            FROM public.assessment_questions AS aq
            WHERE aq.assessment_id = v_assessment.id
              AND aq.question_id = v_question_id
        ) THEN
            RAISE EXCEPTION 'Submitted question is not part of this assessment';
        END IF;

        v_selected_option_id := NULL;
        IF NULLIF(v_answer ->> 'selected_option_id', '') IS NOT NULL THEN
            v_selected_option_id := (v_answer ->> 'selected_option_id')::UUID;
        END IF;

        SELECT COALESCE(aq.marks, q.marks)
        INTO v_question_marks
        FROM public.assessment_questions AS aq
        JOIN public.questions AS q ON q.id = aq.question_id
        WHERE aq.assessment_id = v_assessment.id
          AND aq.question_id = v_question_id;

        v_is_correct := false;
        IF v_selected_option_id IS NOT NULL THEN
            SELECT qo.is_correct
            INTO v_is_correct
            FROM public.question_options AS qo
            WHERE qo.id = v_selected_option_id
              AND qo.question_id = v_question_id;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'Selected option does not belong to the submitted question';
            END IF;
        END IF;

        IF v_is_correct IS TRUE THEN
            v_marks_awarded := v_question_marks;
        ELSIF v_selected_option_id IS NOT NULL AND v_assessment.negative_marking IS TRUE THEN
            v_marks_awarded := -1 * COALESCE(v_assessment.negative_marks, 0.0);
        ELSE
            v_marks_awarded := 0.0;
        END IF;

        v_total_score := v_total_score + v_marks_awarded;

        INSERT INTO public.student_answers (
            attempt_id,
            question_id,
            selected_option_id,
            marks_awarded,
            is_correct,
            submitted_at
        )
        VALUES (
            p_attempt_id,
            v_question_id,
            v_selected_option_id,
            v_marks_awarded,
            COALESCE(v_is_correct, false),
            v_now
        )
        ON CONFLICT (attempt_id, question_id)
        DO UPDATE SET
            selected_option_id = EXCLUDED.selected_option_id,
            marks_awarded = EXCLUDED.marks_awarded,
            is_correct = EXCLUDED.is_correct,
            submitted_at = EXCLUDED.submitted_at;
    END LOOP;

    v_total_score := GREATEST(v_total_score, 0.00);

    SELECT COALESCE(SUM(COALESCE(aq.marks, q.marks)), v_assessment.max_marks)
    INTO v_total_max_marks
    FROM public.assessment_questions AS aq
    JOIN public.questions AS q ON q.id = aq.question_id
    WHERE aq.assessment_id = v_assessment.id;

    IF v_total_max_marks IS NULL OR v_total_max_marks <= 0 THEN
        v_total_max_marks := v_assessment.max_marks;
    END IF;

    IF v_total_max_marks > 0 THEN
        v_percentage := ROUND((v_total_score / v_total_max_marks) * 100.0, 2);
    END IF;

    v_grade := public.calculate_grade(v_percentage, v_attempt.college_id);
    v_is_passed := (v_total_score >= v_assessment.pass_marks);

    UPDATE public.student_attempts
    SET status = 'evaluated',
        score = v_total_score,
        percentage = v_percentage,
        grade = v_grade,
        submitted_at = v_now,
        updated_at = v_now
    WHERE id = p_attempt_id;

    INSERT INTO public.results (
        assessment_id,
        student_id,
        attempt_id,
        score,
        max_marks,
        percentage,
        grade,
        is_passed,
        published_at
    )
    VALUES (
        v_assessment.id,
        v_attempt.student_id,
        p_attempt_id,
        v_total_score,
        v_total_max_marks,
        v_percentage,
        v_grade,
        v_is_passed,
        v_now
    )
    ON CONFLICT (attempt_id)
    DO UPDATE SET
        score = EXCLUDED.score,
        max_marks = EXCLUDED.max_marks,
        percentage = EXCLUDED.percentage,
        grade = EXCLUDED.grade,
        is_passed = EXCLUDED.is_passed,
        published_at = EXCLUDED.published_at;

    RETURN jsonb_build_object(
        'success', true,
        'attempt_id', p_attempt_id,
        'score', v_total_score,
        'max_marks', v_total_max_marks,
        'percentage', v_percentage,
        'grade', v_grade,
        'is_passed', v_is_passed,
        'submitted_at', v_now
    );
END;
$$;

REVOKE ALL ON FUNCTION public.get_student_attendance_summary(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_student_subject_attendance(UUID, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_class_attendance_summary(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_mcq_attempt(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_student_attendance_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_subject_attendance(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_class_attendance_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_mcq_attempt(UUID, JSONB) TO authenticated;

COMMIT;
