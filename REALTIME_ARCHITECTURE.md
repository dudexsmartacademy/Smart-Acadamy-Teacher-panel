# Realtime Architecture - Dudex Smart Academy

## Publication & Channel Topology

Supabase Realtime is enabled on targeted tables via publication `supabase_realtime`:
- `live_classes`
- `notes`
- `attendance_records`
- `assessments`
- `results`
- `notifications`
- `announcements`
- `activity_logs`

---

## Scoped Topic Subscriptions

Rather than streaming all tables globally, the application subscribes to narrowly scoped channels:

| Event | Channel / Topic | Purpose |
|---|---|---|
| Live Class Created / Updated | `class:{class_id}` | Alerts students and teachers of new or rescheduled sessions |
| Note Published / Archived | `class:{class_id}` | Triggers incremental notes list re-fetch |
| Attendance Marked | `teacher:{teacher_id}` | Broadcasts local session changes across tabs/windows |
| Assessment Published | `class:{class_id}` | Updates student assessment lists |
| Result Evaluated | `student:{student_id}` | Notifies student immediately of evaluation completion |
| Notification Received | `user:{recipient_id}` | Realtime notification bell counter update |

---

## Frontend Integration Pattern
In the React client, `useTeacherRealtime` and custom hooks subscribe to postgres change events and selectively invalidate TanStack Query / React state queries rather than triggering full page reloads.
