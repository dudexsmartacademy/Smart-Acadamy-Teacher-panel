# Assessment & Auto-Grading Flow - Dudex Smart Academy

## Transactional Server-Side MCQ Grading

MCQ Assessment grading is **100% server-side and transactional**. The student browser never grades itself, never transmits score values, and never has access to the protected `is_correct` field.

```mermaid
sequenceDiagram
    autonumber
    actor Student as Student Browser
    participant RPC as Database Function (submit_mcq_attempt)
    participant Lock as student_attempts (FOR UPDATE)
    participant QO as question_options (is_correct)
    participant Rules as grading_rules
    participant Res as results & activity_logs
    actor Teacher as Teacher Portal

    Student->>RPC: submit_mcq_attempt(attempt_id, answers JSONB)
    RPC->>Lock: Lock attempt record & verify status = 'in_progress'
    Note over RPC: Checks started_at & server clock for expiry
    loop For each submitted answer
        RPC->>QO: Check selected_option_id against question_options
        alt Correct
            RPC-->>RPC: Award question marks (+marks)
        else Incorrect & negative_marking enabled
            RPC-->>RPC: Deduct negative marks (-negative_marks)
        else Incorrect / Blank
            RPC-->>RPC: Award 0
        end
    end
    RPC->>Rules: Calculate total score, percentage, and grade (A+, A, B...)
    RPC->>Lock: UPDATE student_attempts (status='evaluated', score, percentage, grade)
    RPC->>Res: INSERT / UPSERT into results table
    RPC-->>Student: Return authorized summary (score, percentage, grade)
    RPC->>Teacher: Realtime event on results / assessments
```

---

## Grading Algorithm Guarantees
1. **Concurrency Lock**: `FOR UPDATE` on `student_attempts` blocks double submissions and race conditions.
2. **Authoritative Expiry**: Evaluation validates database timestamp against `expires_at`.
3. **Negative Marking Support**: Configurable per-assessment negative marking penalty.
4. **Grading Rules**: Grade assignment resolves dynamically against `grading_rules` (e.g. >=90% A+, 80–89% A, 70–79% B+, 60–69% B, 50–59% C, 40–49% D, <40% F).
