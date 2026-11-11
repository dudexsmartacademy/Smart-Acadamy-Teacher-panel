# Row Level Security (RLS) Policy Summary

Row Level Security is enabled across all tables in the `public` schema.

---

## Policies Summary Table

| Table | Operation | Allowed Roles | Rule / Predicate |
|---|---|---|---|
| `profiles` | SELECT / UPDATE | Authenticated | `auth.uid() = id` (or admin for SELECT) |
| `user_roles` | SELECT | Authenticated | `auth.uid() = user_id` or admin |
| `classes` | SELECT | Teachers / Students / Admins | `teacher_has_class(id)` or student enrolled or admin |
| `teacher_profiles` | SELECT / UPDATE | Teachers / Admins | SELECT all authenticated; UPDATE `user_id = auth.uid()` |
| `teacher_assignments` | SELECT | Teachers / Admins | `teacher_id = current_teacher_id()` or admin |
| `student_profiles` | SELECT | Teachers / Students / Admins | `user_id = auth.uid()` or student in teacher's assigned class |
| `class_memberships` | SELECT | Teachers / Students / Admins | `teacher_has_class(class_id)` or own student record |
| `live_classes` | ALL | Teachers / Admins | `teacher_has_class(class_id)` |
| `live_classes` | SELECT | Students | `student_belongs_to_class(student_id, class_id)` |
| `class_sessions` | ALL | Teachers / Admins | `teacher_has_class(class_id)` |
| `attendance_records` | ALL | Teachers / Admins | Session belongs to teacher's assigned class |
| `attendance_records` | SELECT | Students | `student_id = current_student_id()` |
| `questions` | ALL | Teachers / Admins | `created_by = current_teacher_id()` or active public questions |
| `question_options` | ALL | Teachers / Admins | `has_role(auth.uid(), 'teacher')` |
| `assessments` | ALL | Teachers / Admins | `teacher_has_class(class_id)` or `created_by = current_teacher_id()` |
| `assessments` | SELECT | Students | Enrolled in class and status is scheduled/active/closed |
| `student_attempts` | SELECT | Teachers / Admins | Assessment belongs to teacher's class |
| `student_attempts` | ALL | Students | `student_id = current_student_id()` |
| `results` | SELECT | Teachers / Admins | Assessment belongs to teacher's class |
| `results` | SELECT | Students | `student_id = current_student_id()` |
| `notes` | ALL | Teachers / Admins | `teacher_has_class(class_id)` |
| `notes` | SELECT | Students | `is_published = true AND archived_at IS NULL` and student enrolled |
| `note_attachments` | ALL | Teachers / Admins | Parent note belongs to teacher's class |
| `notifications` | ALL | Recipient | `recipient_id = auth.uid()` |
| `announcements` | ALL | Teachers / Admins | Target class is in teacher's assigned classes |

---

## Anti-Leak Protection for Student MCQ Delivery
During active tests, students access questions and options through RLS policies that prevent reading `question_options.is_correct`. Final scoring is computed exclusively inside the Postgres function `submit_mcq_attempt`.
