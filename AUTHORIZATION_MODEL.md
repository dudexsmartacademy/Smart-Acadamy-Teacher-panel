# Authorization Model - Dudex Smart Academy

## Multi-Tenant Role & Permission Architecture

The authorization model guarantees that users can only access records relevant to their institutional roles and active academic assignments.

### 1. Identity Verification via Supabase Auth
- Every user registers / logs in through Supabase Auth (`auth.users`).
- User profile data is mirrored in `public.profiles`.
- Role assignments are securely stored in `public.user_roles`. A user cannot elevate their privileges from the browser because role checks query the database directly.

### 2. Teacher-Specific Authorization Boundaries
A teacher's authority is bounded by active rows in `public.teacher_assignments`:
```
Teacher ID (tp.id)
       │
       ▼
teacher_assignments ──(class_id)──► classes
       │                                │
       ▼                                ▼
course_offerings ────────────────► class_memberships ──► student_profiles
```

### 3. Security Helper Functions
PostgreSQL helper functions run with `SECURITY DEFINER` and `SET search_path = public`:

1. `public.has_role(check_user_id UUID, check_role app_role)`:
   Checks if the given user has the designated role.
2. `public.current_teacher_id()`:
   Resolves the `teacher_profiles.id` for `auth.uid()`.
3. `public.teacher_has_class(p_class_id UUID)`:
   Returns `true` only if an active `teacher_assignments` record maps the authenticated teacher to `p_class_id`.
4. `public.student_belongs_to_class(p_student_id UUID, p_class_id UUID)`:
   Returns `true` only if an active `class_memberships` record maps the student to `p_class_id`.

### 4. URL Manipulation Defense
Even if a teacher attempts to change a URL parameter (e.g. `/classes/unauthorized-uuid` or `/students/unauthorized-uuid`), database queries evaluate `public.teacher_has_class(class_id)` and return an empty set or error.
