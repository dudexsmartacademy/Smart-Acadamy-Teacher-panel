-- 036_database_functions.sql
-- Hardened business logic functions, attendance summaries, automated audit triggers, and transactional MCQ grading RPC

-- 1. Automatic updated_at timestamp trigger function
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

-- Apply updated_at triggers
DO $$
DECLARE
    t TEXT;
    tables TEXT[] := ARRAY[
        'profiles', 'colleges', 'departments', 'specializations', 
        'academic_years', 'batches', 'classes', 'student_profiles', 
        'teacher_profiles', 'teacher_assignments', 'subjects', 
        'course_offerings', 'live_classes', 'attendance_records', 
        'attendance_correction_requests', 'questions', 'assessments', 
        'student_attempts', 'notes', 'announcements', 'platform_settings', 
        'coding_problems'
    ];
BEGIN
    FOREACH t IN ARRAY tables
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS set_timestamp_%I ON public.%I;
            CREATE TRIGGER set_timestamp_%I
            BEFORE UPDATE ON public.%I
            FOR EACH ROW
            EXECUTE FUNCTION public.trigger_set_timestamp();
        ', t, t, t, t);
    END LOOP;
END $$;


-- 2. Automated audit logging trigger for sensitive tables
CREATE OR REPLACE FUNCTION public.audit_log_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor_id UUID;
    v_entity_id UUID;
    v_old JSONB := NULL;
    v_new JSONB := NULL;
BEGIN
    v_actor_id := auth.uid();
    
    IF TG_OP = 'DELETE' THEN
        v_entity_id := OLD.id;
        v_old := to_jsonb(OLD);
    ELSIF TG_OP = 'UPDATE' THEN
        v_entity_id := NEW.id;
        v_old := to_jsonb(OLD);
        v_new := to_jsonb(NEW);
    ELSE
        v_entity_id := NEW.id;
        v_new := to_jsonb(NEW);
    END IF;

    IF v_actor_id IS NOT NULL THEN
        INSERT INTO public.audit_logs (
            actor_id,
            action,
            entity_type,
            entity_id,
            old_data,
            new_data,
            reason
        ) VALUES (
            v_actor_id,
            TG_OP,
            TG_TABLE_NAME,
            v_entity_id,
            v_old,
            v_new,
            'Automated database trigger'
        );
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

-- Apply audit triggers on sensitive tables
DROP TRIGGER IF EXISTS audit_attendance_trigger ON public.attendance_records;
CREATE TRIGGER audit_attendance_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.attendance_records
FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

DROP TRIGGER IF EXISTS audit_results_trigger ON public.results;
CREATE TRIGGER audit_results_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.results
FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

DROP TRIGGER IF EXISTS audit_teacher_assignments_trigger ON public.teacher_assignments;
CREATE TRIGGER audit_teacher_assignments_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.teacher_assignments
FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();


-- 3. Dynamic grade calculation function
CREATE OR REPLACE FUNCTION public.calculate_grade(
    p_percentage NUMERIC,
    p_college_id UUID DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_grade TEXT;
BEGIN
    SELECT grade INTO v_grade
    FROM public.grading_rules
    WHERE (college_id = p_college_id OR (college_id IS NULL AND p_college_id IS NULL) OR college_id IS NULL)
      AND p_percentage >= min_percentage
      AND p_percentage <= max_percentage
    ORDER BY college_id NULLS LAST, min_percentage DESC
    LIMIT 1;

    IF v_grade IS NULL THEN
        IF p_percentage >= 90 THEN v_grade := 'A+';
        ELSIF p_percentage >= 80 THEN v_grade := 'A';
        ELSIF p_percentage >= 70 THEN v_grade := 'B+';
        ELSIF p_percentage >= 60 THEN v_grade := 'B';
        ELSIF p_percentage >= 50 THEN v_grade := 'C';
        ELSIF p_percentage >= 40 THEN v_grade := 'D';
        ELSE v_grade := 'F';
        END IF;
    END IF;

    RETURN v_grade;
END;
$$;


-- 4. Authoritative Student attendance summary function
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
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH stats AS (
        SELECT 
            COUNT(ar.id) AS total,
            COUNT(ar.id) FILTER (WHERE ar.status = 'present') AS pres,
            COUNT(ar.id) FILTER (WHERE ar.status = 'absent') AS abs,
            COUNT(ar.id) FILTER (WHERE ar.status = 'late') AS lte,
            COUNT(ar.id) FILTER (WHERE ar.status = 'excused') AS exc
        FROM public.attendance_records ar
        WHERE ar.student_id = p_student_id
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
        END AS percentage
    FROM stats;
END;
$$;


-- 5. Student subject attendance summary function
CREATE OR REPLACE FUNCTION public.get_student_subject_attendance(p_student_id UUID, p_subject_id UUID)
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
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH stats AS (
        SELECT 
            COUNT(ar.id) AS total,
            COUNT(ar.id) FILTER (WHERE ar.status = 'present') AS pres,
            COUNT(ar.id) FILTER (WHERE ar.status = 'absent') AS abs,
            COUNT(ar.id) FILTER (WHERE ar.status = 'late') AS lte,
            COUNT(ar.id) FILTER (WHERE ar.status = 'excused') AS exc
        FROM public.attendance_records ar
        JOIN public.class_sessions cs ON ar.session_id = cs.id
        LEFT JOIN public.course_offerings co ON cs.course_offering_id = co.id
        WHERE ar.student_id = p_student_id
          AND (co.subject_id = p_subject_id OR cs.course_offering_id IS NULL)
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
        END AS percentage
    FROM stats;
END;
$$;


-- 6. Class attendance summary function
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
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH session_counts AS (
        SELECT COUNT(id) AS total_sess
        FROM public.class_sessions
        WHERE class_id = p_class_id
    ),
    student_counts AS (
        SELECT COUNT(id) AS total_stud
        FROM public.class_memberships
        WHERE class_id = p_class_id AND is_active = true
    ),
    record_stats AS (
        SELECT 
            COUNT(ar.id) AS total_records,
            COUNT(ar.id) FILTER (WHERE ar.status = 'present') AS total_present
        FROM public.attendance_records ar
        JOIN public.class_sessions cs ON ar.session_id = cs.id
        WHERE cs.class_id = p_class_id
    )
    SELECT 
        p_class_id,
        sc.total_sess,
        stc.total_stud,
        CASE 
            WHEN rs.total_records = 0 THEN 0.00
            ELSE ROUND((rs.total_present::NUMERIC / rs.total_records::NUMERIC) * 100.0, 2)
        END AS average_percentage
    FROM session_counts sc, student_counts stc, record_stats rs;
END;
$$;


-- 7. Hardened & Idempotent Transactional MCQ Auto-Grading RPC
CREATE OR REPLACE FUNCTION public.submit_mcq_attempt(
    p_attempt_id UUID,
    p_answers JSONB -- Array of objects: [{"question_id": "...", "selected_option_id": "..."}]
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
    -- 1. Concurrency row lock on student attempt
    SELECT a.*, sp.user_id as student_user_id, c.college_id
    INTO v_attempt
    FROM public.student_attempts a
    JOIN public.student_profiles sp ON a.student_id = sp.id
    JOIN public.assessments ass ON a.assessment_id = ass.id
    JOIN public.classes c ON ass.class_id = c.id
    WHERE a.id = p_attempt_id
    FOR UPDATE OF a;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Assessment attempt not found.';
    END IF;

    IF auth.uid() IS NULL
       OR NOT public.has_role(auth.uid(), 'student')
       OR v_attempt.student_user_id <> auth.uid()
       OR v_attempt.student_id <> public.current_student_id() THEN
        RAISE EXCEPTION 'Not authorized to submit this assessment attempt.'
            USING ERRCODE = '42501';
    END IF;

    -- 2. Idempotency check: If already evaluated, return existing result safely
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

    -- Verify attempt is eligible for evaluation
    IF v_attempt.status NOT IN ('in_progress', 'submitted', 'auto_submitted') THEN
        RAISE EXCEPTION 'Attempt cannot be evaluated in current status (%).', v_attempt.status;
    END IF;

    -- 3. Fetch assessment details and validate status & time windows
    SELECT * INTO v_assessment
    FROM public.assessments
    WHERE id = v_attempt.assessment_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Associated assessment not found.';
    END IF;

    IF v_assessment.status NOT IN ('active', 'scheduled') THEN
        RAISE EXCEPTION 'Assessment is not currently accepting submissions (status: %).', v_assessment.status;
    END IF;

    IF (v_assessment.start_at IS NOT NULL AND v_now < v_assessment.start_at)
       OR (v_assessment.end_at IS NOT NULL AND v_now > v_assessment.end_at + INTERVAL '2 minutes') THEN
        RAISE EXCEPTION 'Assessment is outside its submission window.';
    END IF;

    -- Allow 2-minute grace period for network latency on expiration
    IF v_now > (v_attempt.expires_at + INTERVAL '2 minutes') THEN
        -- Auto-finalize as expired if outside grace period
        UPDATE public.student_attempts
        SET status = 'expired', updated_at = v_now
        WHERE id = p_attempt_id;
        
        RAISE EXCEPTION 'Assessment attempt has expired and can no longer be evaluated.';
    END IF;

    -- 4. Evaluate submitted answers against protected question_options table
    FOR v_answer IN SELECT * FROM jsonb_array_elements(COALESCE(p_answers, '[]'::jsonb))
    LOOP
        v_question_id := (v_answer->>'question_id')::UUID;
        v_selected_option_id := NULL;

        IF NOT EXISTS (
            SELECT 1
            FROM public.assessment_questions aq
            WHERE aq.assessment_id = v_assessment.id
              AND aq.question_id = v_question_id
        ) THEN
            RAISE EXCEPTION 'Submitted question is not part of this assessment.';
        END IF;
        
        IF (v_answer->>'selected_option_id') IS NOT NULL AND (v_answer->>'selected_option_id') != '' THEN
            v_selected_option_id := (v_answer->>'selected_option_id')::UUID;
        END IF;

        -- Get configured marks for this question
        SELECT COALESCE(aq.marks, q.marks)
        INTO v_question_marks
        FROM public.questions q
        LEFT JOIN public.assessment_questions aq ON aq.question_id = q.id AND aq.assessment_id = v_assessment.id
        WHERE q.id = v_question_id;

        IF v_question_marks IS NULL THEN
            v_question_marks := 1.0;
        END IF;

        -- Check correctness
        v_is_correct := false;
        IF v_selected_option_id IS NOT NULL THEN
            SELECT is_correct INTO v_is_correct
            FROM public.question_options
            WHERE id = v_selected_option_id AND question_id = v_question_id;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'Selected option does not belong to the submitted question.';
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

        -- Upsert answer
        INSERT INTO public.student_answers (
            attempt_id,
            question_id,
            selected_option_id,
            marks_awarded,
            is_correct,
            submitted_at
        ) VALUES (
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

    -- Floor score at zero
    IF v_total_score < 0 THEN
        v_total_score := 0.00;
    END IF;

    -- Calculate total max marks from configured questions
    SELECT COALESCE(SUM(COALESCE(aq.marks, q.marks)), v_assessment.max_marks)
    INTO v_total_max_marks
    FROM public.assessment_questions aq
    JOIN public.questions q ON aq.question_id = q.id
    WHERE aq.assessment_id = v_assessment.id;

    IF v_total_max_marks IS NULL OR v_total_max_marks <= 0 THEN
        v_total_max_marks := v_assessment.max_marks;
    END IF;

    -- Percentage and dynamic grade
    IF v_total_max_marks > 0 THEN
        v_percentage := ROUND((v_total_score / v_total_max_marks) * 100.0, 2);
    ELSE
        v_percentage := 0.00;
    END IF;

    v_grade := public.calculate_grade(v_percentage, v_attempt.college_id);
    v_is_passed := (v_total_score >= v_assessment.pass_marks);

    -- 5. Update attempt record
    UPDATE public.student_attempts
    SET 
        status = 'evaluated',
        score = v_total_score,
        percentage = v_percentage,
        grade = v_grade,
        submitted_at = v_now,
        updated_at = v_now
    WHERE id = p_attempt_id;

    -- 6. Insert into results table
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
    ) VALUES (
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

    -- 7. Return evaluated result summary
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
