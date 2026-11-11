# Daily Notes Flow - Dudex Smart Academy

## Daily Notes with Multiple Uploads & Storage Workflow

The academy allows multiple independent notes to be created on the same day (e.g. Lecture Notes, Interview Questions, Practice Problems).

```mermaid
sequenceDiagram
    autonumber
    actor Teacher as Faculty Member
    participant UI as Create Note Page
    participant Svc as notesService
    participant ST as Supabase Storage (academy-notes)
    participant DB as PostgreSQL Database
    actor Student as Enrolled Student

    Teacher->>UI: Fill Title, Subject, Date, Description
    Teacher->>UI: Attach PDF and/or multiple Images
    UI->>Svc: createNote(payload, files)
    Svc->>DB: 1. INSERT into notes table (retrieves note_id)
    loop For each attached file
        Svc->>ST: 2. Upload file to notes/{class_id}/{note_id}/{file_name}
        Svc->>DB: 3. INSERT metadata into note_attachments
    end
    Svc->>DB: 4. Record entry in activity_logs
    DB->>Student: Realtime notification & notes stream
    Student->>DB: Query accessible notes for enrolled class
    Student->>ST: Authenticated download / preview
```

---

## Multiple Notes on the Same Date
The `notes` table enforces no single-note-per-day limitation. Each note is an autonomous row with its own UUID, attachments, timestamps, and publication status.

## Archiving / Soft Delete
Notes can be archived by updating `archived_at = now()`. The student portal filters out records where `archived_at IS NOT NULL`, while preserving complete historical audit trails.
