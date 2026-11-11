# Attendance Architecture & Calculation Flow - Dudex Smart Academy

## Official Attendance Workflow

Attendance records represent official institutional academic records. The frontend collects and displays attendance, while PostgreSQL validates teacher assignments, stores timestamps, audits changes, and calculates aggregate metrics.

```mermaid
sequenceDiagram
    autonumber
    actor Teacher as Teacher
    participant UI as Attendance Page
    participant Svc as attendanceService
    participant DB as PostgreSQL Database
    participant Func as get_student_attendance_summary
    actor Student as Student Portal

    Teacher->>UI: Select Class, Subject, Session, Date
    UI->>Svc: saveAttendance(payload)
    Svc->>DB: 1. Validate teacher assignment
    Svc->>DB: 2. Create/Resolve class_session
    Svc->>DB: 3. Upsert attendance_records (Present/Absent/Late/Excused)
    Svc->>DB: 4. Record entry in activity_logs
    DB-->>UI: Authoritative save confirmation
    DB->>Student: Realtime notification & UI update
    Student->>Func: Query get_student_attendance_summary(student_id)
    Func-->>Student: Authoritative percentage (e.g. 60/75 * 100 = 80.0%)
```

---

## Authoritative Database Calculation Functions

### 1. `get_student_attendance_summary(p_student_id UUID)`
Returns:
- `total_sessions`: Total class sessions conducted for student's classes.
- `present_count`: Count of sessions marked `present`.
- `absent_count`: Count of sessions marked `absent`.
- `late_count`: Count of sessions marked `late` (weighted as 0.5 present).
- `excused_count`: Count of sessions marked `excused`.
- `percentage`: Exact database-computed attendance percentage.

### 2. `get_class_attendance_summary(p_class_id UUID)`
Returns:
- `total_sessions`
- `enrolled_students`
- `average_percentage`
