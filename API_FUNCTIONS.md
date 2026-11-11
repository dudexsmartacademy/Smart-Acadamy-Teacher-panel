# API & Database Functions Specification - Dudex Smart Academy

## Database Functions (PostgreSQL RPCs)

### 1. `public.calculate_grade(p_percentage NUMERIC, p_college_id UUID)`
- **Returns**: `TEXT` (e.g. `'A+'`, `'A'`, `'B+'`, `'B'`, `'C'`, `'D'`, `'F'`)
- **Behavior**: Looks up percentage against `public.grading_rules` table; falls back to standard grading scale.

### 2. `public.get_student_attendance_summary(p_student_id UUID)`
- **Returns**: Table with `total_sessions`, `present_count`, `absent_count`, `late_count`, `excused_count`, `percentage`.
- **Security**: `SECURITY DEFINER` with fixed `search_path = public`.

### 3. `public.get_student_subject_attendance(p_student_id UUID, p_subject_id UUID)`
- **Returns**: Table with subject-specific breakdown of conducted classes and attendance rate.

### 4. `public.get_class_attendance_summary(p_class_id UUID)`
- **Returns**: Table with `class_id`, `total_sessions`, `enrolled_students`, `average_percentage`.

### 5. `public.submit_mcq_attempt(p_attempt_id UUID, p_answers JSONB)`
- **Args**:
  - `p_attempt_id`: UUID of `student_attempts`
  - `p_answers`: Array of objects `[{"question_id": "...", "selected_option_id": "..."}]`
- **Behavior**:
  - Locks attempt (`FOR UPDATE`)
  - Validates expiry and state
  - Compares answers against protected `question_options.is_correct`
  - Calculates marks, applies negative marking
  - Calculates percentage and grade
  - Atomically writes `student_answers`, updates `student_attempts`, and populates `results`
  - Returns evaluation JSON payload

---

## Service Layer Interface Reference (`src/services/`)

| Service File | Key Methods | Description |
|---|---|---|
| `authService.ts` | `signInWithEmail`, `signOut`, `getCurrentUser` | Supabase Auth session & role verification |
| `teacherService.ts` | `getProfile`, `getAssignments`, `getDashboardMetrics` | Teacher identity & assigned classes |
| `classService.ts` | `getClasses`, `getClassById`, `searchClasses` | Relational class queries & search filters |
| `studentService.ts` | `getStudentsByClass`, `getStudentById` | Class roster & student profiles |
| `attendanceService.ts` | `saveAttendance`, `getClassAttendanceSummary`, `getStudentAttendanceSummary` | Attendance sessions, records & RPC calls |
| `liveClassService.ts` | `getLiveClasses`, `createLiveClass`, `updateLiveClass` | Google Meet placement live classes |
| `notesService.ts` | `getNotes`, `createNote`, `archiveNote` | Daily notes & private Storage uploads |
| `questionBankService.ts` | `getQuestions`, `createQuestion` | MCQ bank with options & explanations |
| `assessmentService.ts` | `getAssessments`, `createAssessment` | Assessment creation, questions & scheduling |
| `attemptService.ts` | `startAttempt`, `submitMcqAttempt` | Test attempts & auto-grading RPC execution |
| `resultService.ts` | `getAssessmentResults`, `getResultStatistics` | Graded results & performance metrics |
| `notificationService.ts` | `getNotifications`, `markAsRead` | In-app user notifications |
| `activityService.ts` | `logActivity`, `getRecentActivities` | Audit & activity trail |
