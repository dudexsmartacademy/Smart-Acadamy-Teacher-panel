# Database Schema Specification - Dudex Smart Academy

The database comprises 40 sequential migrations located in `supabase/migrations/`. All tables reside in the `public` schema and enforce UUID primary keys, foreign key constraints with cascaded deletions where appropriate, and unique constraints to prevent duplication.

---

## Complete Table Inventory

| # | Table Name | Purpose | Primary Foreign Keys / Notes |
|---|---|---|---|
| 1 | `profiles` | Base user identity | References `auth.users(id)` |
| 2 | `user_roles` | User roles (`student`, `teacher`, `admin`) | References `profiles(id)` |
| 3 | `colleges` | Educational institutions / campuses | Unique `code` |
| 4 | `departments` | Academic departments (e.g. AI & DS, CSE) | References `colleges(id)` |
| 5 | `specializations` | Degree specializations | References `departments(id)` |
| 6 | `academic_years` | Academic year spans (e.g. 2024–2028) | Unique `name` |
| 7 | `batches` | Graduation cohorts | References `colleges(id)` |
| 8 | `sections` | Class sections (A, B, C) | Unique `name` |
| 9 | `classes` | Relational academic classes | Links dept, spec, batch, section, year |
| 10 | `student_profiles` | Extended student metadata (RRN, roll no) | References `profiles(id)`, `colleges(id)` |
| 11 | `class_memberships` | Student enrollment in classes | References `classes(id)`, `student_profiles(id)` |
| 12 | `teacher_profiles` | Faculty records (faculty_id, designation) | References `profiles(id)`, `departments(id)` |
| 13 | `teacher_assignments` | Faculty-to-Class-Subject mapping | Links teacher, class, subject, academic year |
| 14 | `subjects` | Course subjects (Python, Data Structures) | References `departments(id)` |
| 15 | `course_offerings` | Class subject semester offerings | Links subject, class, teacher |
| 16 | `live_classes` | Daily Google Meet live sessions | Links class, course_offering, teacher |
| 17 | `class_sessions` | Physical or online lecture periods | Links class, course_offering, teacher |
| 18 | `attendance_records` | Official attendance per student/session | Links session, student, marked_by |
| 19 | `attendance_correction_requests` | Student attendance dispute requests | Links attendance_record, student |
| 20 | `questions` | Question bank repository | Links created_by, subject |
| 21 | `question_options` | MCQ options with `is_correct` protection | References `questions(id)` |
| 22 | `assessments` | Scheduled & active evaluations | Links class, course_offering, creator |
| 23 | `assessment_questions` | Many-to-many question assignment | Links assessment, question, marks |
| 24 | `student_attempts` | Test attempt timer & state | Links assessment, student |
| 25 | `student_answers` | Student selected options | Links attempt, question, option |
| 26 | `results` | Official graded scores & percentages | Links assessment, student, attempt |
| 27 | `notes` | Daily lecture notes | Links class, subject, teacher, date |
| 28 | `note_attachments` | PDF & image storage metadata | References `notes(id)` |
| 29 | `notifications` | In-app user notifications | References `profiles(id)` |
| 30 | `announcements` | Class & departmental broadcast notices | Links target_class, creator |
| 31 | `activity_logs` | Audit trail of application events | References `profiles(id)` |
| 32 | `audit_logs` | Immutable audit history for sensitive data | References `profiles(id)` |
| 33 | `platform_settings` | Dynamic platform configuration key-values | JSONB values |
| 34 | `grading_rules` | Database grade boundary rules (A+, A, B...) | Links `colleges(id)` |
| 35 | `coding_problems` | Coding problem statements & templates | References `questions(id)` |
| 36 | `coding_test_cases` | Hidden and sample test cases for coding | References `coding_problems(id)` |
| 37 | `code_submissions` | Student code submission sandbox queue | Links attempt, problem, student |

---

## Key Enums
- `app_role`: `'student'`, `'teacher'`, `'admin'`
- `attendance_status`: `'present'`, `'absent'`, `'late'`, `'excused'`
- `question_type`: `'mcq_single'`, `'mcq_multiple'`, `'coding'`, `'subjective'`
- `difficulty_level`: `'easy'`, `'medium'`, `'hard'`
- `assessment_status`: `'draft'`, `'scheduled'`, `'active'`, `'closed'`, `'archived'`
- `attempt_status`: `'in_progress'`, `'submitted'`, `'auto_submitted'`, `'expired'`, `'evaluated'`
- `live_class_status`: `'draft'`, `'scheduled'`, `'live'`, `'completed'`, `'cancelled'`
