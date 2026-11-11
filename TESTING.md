# Testing & Verification Guide - Dudex Smart Academy

## 1. Security Test Matrix

| Test Scenario | Expected Outcome | Verification Method |
|---|---|---|
| Student attempts to query teacher assignments | 403 / 0 rows returned | `teacher_assignments` RLS policy blocks access |
| Teacher accesses unrelated class via URL modification | Guard redirects to `/classes`; DB queries return 0 rows | `TeacherClassGuard` & `teacher_has_class(id)` RLS |
| Student attempts to read `question_options.is_correct` | Access denied / column withheld | `question_options` RLS policy |
| Student attempts to alter test score or percentage | Mutation rejected by RLS | `results` & `student_attempts` RLS policies |
| Student submits expired test | Rejected by `submit_mcq_attempt` RPC | Server timestamp validation |
| Teacher creates live class with Google Meet link | Insert succeeds, activity log created | `live_classes` table & activity log verification |
| Teacher uploads PDF & images to daily note | Files stored in private `academy-notes` bucket | Supabase Storage + `note_attachments` |
| Student attempts to download note from another class | Storage 403 Forbidden | Storage RLS policy on `storage.objects` |
| Duplicate attendance submission on same session/student | Upsert updates existing record without duplicate key error | Postgres unique constraint on `(session_id, student_id)` |

---

## 2. Running Local Validation

### Build Verification:
```bash
npm run build
```
Confirms clean TypeScript compilation and error-free Vite bundling.

### Development Server:
```bash
npm run dev
```
Launches Vite development server on `http://localhost:5173`.
