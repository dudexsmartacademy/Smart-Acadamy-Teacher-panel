-- 040_seed_data.sql
-- Development and testing seed data for Dudex Smart Academy

DO $$
DECLARE
    v_college_id UUID := '11111111-1111-1111-1111-111111111111';
    v_dept_aids_id UUID := '22222222-2222-2222-2222-222222222222';
    v_dept_cse_id UUID := '33333333-3333-3333-3333-333333333333';
    v_spec_ai_id UUID := '44444444-4444-4444-4444-444444444444';
    v_ay_id UUID := '55555555-5555-5555-5555-555555555555';
    v_ay_old_id UUID := '55555555-5555-5555-5555-555555555556';
    v_batch_24_28 UUID := '66666666-6666-6666-6666-666666666666';
    v_batch_23_27 UUID := '66666666-6666-6666-6666-666666666667';
    v_sec_a UUID := '77777777-7777-7777-7777-777777777771';
    v_sec_b UUID := '77777777-7777-7777-7777-777777777772';
    
    -- Classes
    v_class_1 UUID := 'a1111111-1111-1111-1111-111111111111'; -- AI & DS - Section B (2024–2028)
    v_class_2 UUID := 'a2222222-2222-2222-2222-222222222222'; -- AI & DS - Section A (2024–2028)
    v_class_3 UUID := 'a3333333-3333-3333-3333-333333333333'; -- CSE - Section A (2023–2027)

    -- Teacher 1 & 2 Auth User IDs
    v_teacher1_user_id UUID := 'b1111111-1111-1111-1111-111111111111';
    v_teacher2_user_id UUID := 'b2222222-2222-2222-2222-222222222222';
    
    -- Teacher Profiles
    v_teacher1_id UUID := 'c1111111-1111-1111-1111-111111111111';
    v_teacher2_id UUID := 'c2222222-2222-2222-2222-222222222222';

    -- Subjects
    v_subj_python UUID := 'd1111111-1111-1111-1111-111111111111';
    v_subj_ds UUID := 'd2222222-2222-2222-2222-222222222222';
    v_subj_prog UUID := 'd3333333-3333-3333-3333-333333333333';
    v_subj_dbms UUID := 'd4444444-4444-4444-4444-444444444444';

    -- Course offerings
    v_co_python UUID := 'e1111111-1111-1111-1111-111111111111';
    v_co_ds UUID := 'e2222222-2222-2222-2222-222222222222';
    v_co_prog UUID := 'e3333333-3333-3333-3333-333333333333';

    -- Students
    v_stu1_user UUID := 'f1111111-1111-1111-1111-111111111111';
    v_stu2_user UUID := 'f2222222-2222-2222-2222-222222222222';
    v_stu3_user UUID := 'f3333333-3333-3333-3333-333333333333';
    v_stu4_user UUID := 'f4444444-4444-4444-4444-444444444444';
    v_stu5_user UUID := 'f5555555-5555-5555-5555-555555555555';
    v_stu6_user UUID := 'f6666666-6666-6666-6666-666666666666';

    v_stu1_prof UUID := '10111111-1111-1111-1111-111111111111';
    v_stu2_prof UUID := '10222222-2222-2222-2222-222222222222';
    v_stu3_prof UUID := '10333333-3333-3333-3333-333333333333';
    v_stu4_prof UUID := '10444444-4444-4444-4444-444444444444';
    v_stu5_prof UUID := '10555555-5555-5555-5555-555555555555';
    v_stu6_prof UUID := '10666666-6666-6666-6666-666666666666';

    -- Question Bank
    v_q1 UUID := '20111111-1111-1111-1111-111111111111';
    v_q2 UUID := '20222222-2222-2222-2222-222222222222';
    v_q3 UUID := '20333333-3333-3333-3333-333333333333';
    v_q4 UUID := '20444444-4444-4444-4444-444444444444';

    -- Assessment
    v_ass1 UUID := '30111111-1111-1111-1111-111111111111';

    -- Session
    v_sess1 UUID := '40111111-1111-1111-1111-111111111111';

    -- Notes
    v_note1 UUID := '50111111-1111-1111-1111-111111111111';
    v_note2 UUID := '50222222-2222-2222-2222-222222222222';
    v_note3 UUID := '50333333-3333-3333-3333-333333333333';
BEGIN
    -- 1. College
    INSERT INTO public.colleges (id, name, code, city, state)
    VALUES (v_college_id, 'Dudex Smart Academy of Technology', 'DUDEX-ENG', 'Chennai', 'Tamil Nadu')
    ON CONFLICT (code) DO NOTHING;

    -- 2. Grading Rules
    INSERT INTO public.grading_rules (college_id, grade, min_percentage, max_percentage, grade_point, description)
    VALUES 
        (v_college_id, 'A+', 90.00, 100.00, 10.0, 'Outstanding'),
        (v_college_id, 'A',  80.00, 89.99,  9.0,  'Excellent'),
        (v_college_id, 'B+', 70.00, 79.99,  8.0,  'Very Good'),
        (v_college_id, 'B',  60.00, 69.99,  7.0,  'Good'),
        (v_college_id, 'C',  50.00, 59.99,  6.0,  'Average'),
        (v_college_id, 'D',  40.00, 49.99,  5.0,  'Pass'),
        (v_college_id, 'F',   0.00, 39.99,  0.0,  'Fail')
    ON CONFLICT (college_id, grade) DO NOTHING;

    -- 3. Departments
    INSERT INTO public.departments (id, college_id, name, code)
    VALUES 
        (v_dept_aids_id, v_college_id, 'Artificial Intelligence & Data Science', 'AI&DS'),
        (v_dept_cse_id, v_college_id, 'Computer Science & Engineering', 'CSE')
    ON CONFLICT (college_id, code) DO NOTHING;

    -- 4. Specializations
    INSERT INTO public.specializations (id, department_id, name, code)
    VALUES (v_spec_ai_id, v_dept_aids_id, 'Artificial Intelligence', 'AI')
    ON CONFLICT (department_id, code) DO NOTHING;

    -- 5. Academic Years
    INSERT INTO public.academic_years (id, name, start_date, end_date, is_current)
    VALUES 
        (v_ay_id, '2024–2028', '2024-08-01', '2028-05-31', true),
        (v_ay_old_id, '2023–2027', '2023-08-01', '2027-05-31', false)
    ON CONFLICT (name) DO NOTHING;

    -- 6. Batches
    INSERT INTO public.batches (id, college_id, name, start_year, end_year)
    VALUES 
        (v_batch_24_28, v_college_id, '2024–2028', 2024, 2028),
        (v_batch_23_27, v_college_id, '2023–2027', 2023, 2027)
    ON CONFLICT (college_id, name) DO NOTHING;

    -- 7. Sections
    INSERT INTO public.sections (id, name)
    VALUES 
        (v_sec_a, 'Section A'),
        (v_sec_b, 'Section B')
    ON CONFLICT (name) DO NOTHING;

    -- 8. Classes
    INSERT INTO public.classes (id, college_id, department_id, specialization_id, batch_id, section_id, academic_year_id, name, semester)
    VALUES 
        (v_class_1, v_college_id, v_dept_aids_id, v_spec_ai_id, v_batch_24_28, v_sec_b, v_ay_id, 'AI & DS - Section B', 2),
        (v_class_2, v_college_id, v_dept_aids_id, v_spec_ai_id, v_batch_24_28, v_sec_a, v_ay_id, 'AI & DS - Section A', 2),
        (v_class_3, v_college_id, v_dept_cse_id, NULL, v_batch_23_27, v_sec_a, v_ay_old_id, 'CSE - Section A', 4)
    ON CONFLICT DO NOTHING;

    -- 9. Subjects
    INSERT INTO public.subjects (id, department_id, name, code, credits)
    VALUES 
        (v_subj_python, v_dept_aids_id, 'Python', 'CS201', 4),
        (v_subj_ds, v_dept_aids_id, 'Data Structures', 'CS202', 4),
        (v_subj_prog, v_dept_cse_id, 'Programming', 'CS101', 3),
        (v_subj_dbms, v_dept_aids_id, 'Database Management Systems', 'CS203', 3)
    ON CONFLICT (department_id, code) DO NOTHING;

    -- 10. Teacher Profiles (Note: In production user_id references auth.users)
    -- We ensure base profiles exist
    INSERT INTO public.profiles (id, email, full_name, phone)
    VALUES 
        (v_teacher1_user_id, 'teacher@test.local', 'ABC', '+91 9876543210'),
        (v_teacher2_user_id, 'dr.rajesh@dudex.local', 'Dr. Rajesh Kumar', '+91 9876543211')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

    INSERT INTO public.user_roles (user_id, role)
    VALUES 
        (v_teacher1_user_id, 'teacher'),
        (v_teacher2_user_id, 'teacher')
    ON CONFLICT (user_id, role) DO NOTHING;

    INSERT INTO public.teacher_profiles (id, user_id, faculty_id, college_id, department_id, designation, status)
    VALUES 
        (v_teacher1_id, v_teacher1_user_id, 'FAC001', v_college_id, v_dept_aids_id, 'Assistant Professor', 'active'),
        (v_teacher2_id, v_teacher2_user_id, 'FAC002', v_college_id, v_dept_cse_id, 'Associate Professor', 'active')
    ON CONFLICT (user_id) DO NOTHING;

    -- 11. Teacher Assignments (Matching frontend mock data)
    INSERT INTO public.teacher_assignments (id, teacher_id, class_id, subject_id, academic_year_id, permission_level, is_active)
    VALUES 
        (gen_random_uuid(), v_teacher1_id, v_class_1, v_subj_python, v_ay_id, 'primary', true),
        (gen_random_uuid(), v_teacher1_id, v_class_2, v_subj_ds, v_ay_id, 'primary', true),
        (gen_random_uuid(), v_teacher1_id, v_class_3, v_subj_prog, v_ay_old_id, 'primary', true)
    ON CONFLICT DO NOTHING;

    -- 12. Course Offerings
    INSERT INTO public.course_offerings (id, subject_id, class_id, teacher_id, academic_year_id, semester, is_active)
    VALUES 
        (v_co_python, v_subj_python, v_class_1, v_teacher1_id, v_ay_id, 2, true),
        (v_co_ds, v_subj_ds, v_class_2, v_teacher1_id, v_ay_id, 2, true),
        (v_co_prog, v_subj_prog, v_class_3, v_teacher1_id, v_ay_old_id, 4, true)
    ON CONFLICT DO NOTHING;

    -- 13. Students Seed Data
    INSERT INTO public.profiles (id, email, full_name, phone)
    VALUES 
        (v_stu1_user, 'aarav.sharma@dudex.local', 'Aarav Sharma', '+91 9123456780'),
        (v_stu2_user, 'ananya.iyer@dudex.local', 'Ananya Iyer', '+91 9123456781'),
        (v_stu3_user, 'karthik.rajan@dudex.local', 'Karthik Rajan', '+91 9123456782'),
        (v_stu4_user, 'meera.nair@dudex.local', 'Meera Nair', '+91 9123456783'),
        (v_stu5_user, 'rohit.verma@dudex.local', 'Rohit Verma', '+91 9123456784'),
        (v_stu6_user, 'sneha.patel@dudex.local', 'Sneha Patel', '+91 9123456785')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

    INSERT INTO public.user_roles (user_id, role)
    VALUES 
        (v_stu1_user, 'student'), (v_stu2_user, 'student'),
        (v_stu3_user, 'student'), (v_stu4_user, 'student'),
        (v_stu5_user, 'student'), (v_stu6_user, 'student')
    ON CONFLICT (user_id, role) DO NOTHING;

    INSERT INTO public.student_profiles (id, user_id, rrn, college_id, department_id, specialization_id, batch_id, roll_number, status)
    VALUES 
        (v_stu1_prof, v_stu1_user, 'RRN2024AI001', v_college_id, v_dept_aids_id, v_spec_ai_id, v_batch_24_28, '24AI001', 'active'),
        (v_stu2_prof, v_stu2_user, 'RRN2024AI002', v_college_id, v_dept_aids_id, v_spec_ai_id, v_batch_24_28, '24AI002', 'active'),
        (v_stu3_prof, v_stu3_user, 'RRN2024AI003', v_college_id, v_dept_aids_id, v_spec_ai_id, v_batch_24_28, '24AI003', 'active'),
        (v_stu4_prof, v_stu4_user, 'RRN2024AI004', v_college_id, v_dept_aids_id, v_spec_ai_id, v_batch_24_28, '24AI004', 'active'),
        (v_stu5_prof, v_stu5_user, 'RRN2024AI005', v_college_id, v_dept_aids_id, v_spec_ai_id, v_batch_24_28, '24AI005', 'active'),
        (v_stu6_prof, v_stu6_user, 'RRN2024AI006', v_college_id, v_dept_aids_id, v_spec_ai_id, v_batch_24_28, '24AI006', 'active')
    ON CONFLICT (user_id) DO NOTHING;

    -- Class Memberships (Enrolled in Class 1 - AI & DS B)
    INSERT INTO public.class_memberships (class_id, student_id, is_active)
    VALUES 
        (v_class_1, v_stu1_prof, true),
        (v_class_1, v_stu2_prof, true),
        (v_class_1, v_stu3_prof, true),
        (v_class_1, v_stu4_prof, true),
        (v_class_1, v_stu5_prof, true),
        (v_class_1, v_stu6_prof, true)
    ON CONFLICT (class_id, student_id) DO NOTHING;

    -- 14. Live Classes (Daily Live Placement Class with Google Meet)
    INSERT INTO public.live_classes (class_id, course_offering_id, teacher_id, title, description, meeting_platform, meeting_url, scheduled_date, start_time, end_time, status)
    VALUES 
        (v_class_1, v_co_python, v_teacher1_id, 'Python OOP & Placement Problem Solving', 'Deep dive into Object-Oriented Design, inheritance, and company interview problems.', 'Google Meet', 'https://meet.google.com/dudex-aids-live', CURRENT_DATE, '10:00:00', '11:30:00', 'scheduled'),
        (v_class_2, v_co_ds, v_teacher1_id, 'Binary Trees & Heap Algorithms', 'Tree traversals, HeapSort, and priority queue implementation.', 'Google Meet', 'https://meet.google.com/dudex-ds-live', CURRENT_DATE + INTERVAL '1 day', '14:00:00', '15:30:00', 'scheduled')
    ON CONFLICT DO NOTHING;

    -- 15. Daily Notes (Multiple notes on the same day)
    INSERT INTO public.notes (id, class_id, course_offering_id, subject_id, teacher_id, note_date, title, description, is_published)
    VALUES 
        (v_note1, v_class_1, v_co_python, v_subj_python, v_teacher1_id, CURRENT_DATE, 'Python Basics & Memory Management', 'Comprehensive notes covering memory references, garbage collection, and variable scoping in Python.', true),
        (v_note2, v_class_1, v_co_python, v_subj_python, v_teacher1_id, CURRENT_DATE, 'Interview Questions - OOP & Polymorphism', 'Top 25 technical placement questions asked by Tier-1 product companies.', true),
        (v_note3, v_class_1, v_co_python, v_subj_python, v_teacher1_id, CURRENT_DATE, 'Practice Problems Set #1', '10 algorithmic challenges on strings, arrays, and dictionaries.', true)
    ON CONFLICT DO NOTHING;

    -- Note Attachments
    INSERT INTO public.note_attachments (note_id, file_path, file_name, file_type, file_size, display_order)
    VALUES 
        (v_note1, 'notes/' || v_class_1 || '/' || v_note1 || '/python_basics_lecture.pdf', 'python_basics_lecture.pdf', 'application/pdf', 2457600, 1),
        (v_note2, 'notes/' || v_class_1 || '/' || v_note2 || '/interview_qa_sheet.pdf', 'interview_qa_sheet.pdf', 'application/pdf', 1843200, 1),
        (v_note3, 'notes/' || v_class_1 || '/' || v_note3 || '/practice_problems.png', 'practice_problems.png', 'image/png', 845200, 1)
    ON CONFLICT DO NOTHING;

    -- 16. Question Bank Questions
    INSERT INTO public.questions (id, created_by, subject_id, question_text, question_type, topic, difficulty, marks, explanation)
    VALUES 
        (v_q1, v_teacher1_id, v_subj_python, 'What is the output of `type(lambda: None)` in Python 3?', 'mcq_single', 'Lambda & Functions', 'medium', 2.0, 'A lambda function is an instance of function type (`<class ''function''>`).'),
        (v_q2, v_teacher1_id, v_subj_python, 'Which of the following data structures in Python is immutable?', 'mcq_single', 'Data Types', 'easy', 1.0, 'Tuples cannot be modified after creation, making them immutable.'),
        (v_q3, v_teacher1_id, v_subj_python, 'What is the time complexity of searching an element in a Python dictionary on average?', 'mcq_single', 'Complexity Analysis', 'easy', 1.0, 'Python dictionaries use hash tables with average case O(1) lookup.'),
        (v_q4, v_teacher1_id, v_subj_ds, 'Which traversal of a Binary Search Tree (BST) produces sorted ascending output?', 'mcq_single', 'Trees', 'medium', 2.0, 'In-order traversal (Left, Root, Right) of a BST always yields sorted elements.')
    ON CONFLICT DO NOTHING;

    -- Options for Question 1
    INSERT INTO public.question_options (question_id, option_text, option_order, is_correct)
    VALUES 
        (v_q1, '<class ''function''>', 1, true),
        (v_q1, '<class ''lambda''>', 2, false),
        (v_q1, '<class ''NoneType''>', 3, false),
        (v_q1, '<class ''object''>', 4, false)
    ON CONFLICT DO NOTHING;

    -- Options for Question 2
    INSERT INTO public.question_options (question_id, option_text, option_order, is_correct)
    VALUES 
        (v_q2, 'List', 1, false),
        (v_q2, 'Set', 2, false),
        (v_q2, 'Tuple', 3, true),
        (v_q2, 'Dictionary', 4, false)
    ON CONFLICT DO NOTHING;

    -- Options for Question 3
    INSERT INTO public.question_options (question_id, option_text, option_order, is_correct)
    VALUES 
        (v_q3, 'O(1)', 1, true),
        (v_q3, 'O(n)', 2, false),
        (v_q3, 'O(log n)', 3, false),
        (v_q3, 'O(n^2)', 4, false)
    ON CONFLICT DO NOTHING;

    -- Options for Question 4
    INSERT INTO public.question_options (question_id, option_text, option_order, is_correct)
    VALUES 
        (v_q4, 'Pre-order', 1, false),
        (v_q4, 'In-order', 2, true),
        (v_q4, 'Post-order', 3, false),
        (v_q4, 'Level-order', 4, false)
    ON CONFLICT DO NOTHING;

    -- 17. MCQ Assessment
    INSERT INTO public.assessments (id, title, description, class_id, course_offering_id, subject_id, type, duration_seconds, max_marks, pass_marks, start_at, end_at, status, created_by)
    VALUES 
        (v_ass1, 'Python Core & Algorithms Assessment', 'Official mid-semester evaluation covering Python fundamentals, data structures, and algorithm complexity.', v_class_1, v_co_python, v_subj_python, 'mcq', 1800, 6.0, 3.0, timezone('utc'::text, now()) - INTERVAL '1 hour', timezone('utc'::text, now()) + INTERVAL '7 days', 'active', v_teacher1_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.assessment_questions (assessment_id, question_id, question_order, marks)
    VALUES 
        (v_ass1, v_q1, 1, 2.0),
        (v_ass1, v_q2, 2, 1.0),
        (v_ass1, v_q3, 3, 1.0),
        (v_ass1, v_q4, 4, 2.0)
    ON CONFLICT DO NOTHING;

    -- 18. Class Session & Attendance
    INSERT INTO public.class_sessions (id, class_id, course_offering_id, teacher_id, session_date, start_time, end_time, mode, room)
    VALUES 
        (v_sess1, v_class_1, v_co_python, v_teacher1_id, CURRENT_DATE, '09:00:00', '10:00:00', 'offline', 'Lab 304')
    ON CONFLICT DO NOTHING;

    INSERT INTO public.attendance_records (session_id, student_id, status, marked_by, remarks)
    VALUES 
        (v_sess1, v_stu1_prof, 'present', v_teacher1_id, 'On time'),
        (v_sess1, v_stu2_prof, 'present', v_teacher1_id, 'On time'),
        (v_sess1, v_stu3_prof, 'late', v_teacher1_id, '10 mins late'),
        (v_sess1, v_stu4_prof, 'present', v_teacher1_id, 'On time'),
        (v_sess1, v_stu5_prof, 'absent', v_teacher1_id, 'Medical leave'),
        (v_sess1, v_stu6_prof, 'present', v_teacher1_id, 'On time')
    ON CONFLICT DO NOTHING;

    -- 19. Announcements
    INSERT INTO public.announcements (title, content, priority, scope, target_class_id, created_by)
    VALUES 
        ('Placement Drive Registration Open', 'All eligible students must submit their updated resumes before Friday 5 PM.', 'high', 'class', v_class_1, v_teacher1_id),
        ('Live Class Rescheduled', 'Tomorrow''s Python OOP class will begin at 10:00 AM on Google Meet.', 'medium', 'class', v_class_1, v_teacher1_id)
    ON CONFLICT DO NOTHING;

END $$;
