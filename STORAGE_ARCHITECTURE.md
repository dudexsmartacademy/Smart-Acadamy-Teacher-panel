# Storage Architecture - Dudex Smart Academy

## Bucket Configuration
- **Bucket ID**: `academy-notes`
- **Visibility**: **Private** (Not public)
- **Max File Size**: 50MB (52,428,800 bytes)
- **Allowed MIME Types**:
  - `application/pdf`
  - `image/jpeg`
  - `image/png`
  - `image/webp`

---

## Storage Directory Convention

```
academy-notes/
└── notes/
    └── {class_id}/
        └── {note_id}/
            ├── {timestamp}_lecture_notes.pdf
            └── {timestamp}_diagram.png
```

### Collision & Traversal Prevention
1. `class_id` and `note_id` are UUIDs.
2. File names are prefixed with `Date.now()_` and sanitized of spaces and path traversal characters (`..`, `/`, `\`).
3. Storage metadata is saved synchronously in `public.note_attachments`.

---

## Storage RLS Policies (`storage.objects`)

1. **Upload Policy (`INSERT`)**:
   - Only authenticated users with `teacher` or `admin` role can upload objects into `academy-notes`.
2. **Download Policy (`SELECT`)**:
   - Teachers and enrolled students can download files.
   - Public/unauthenticated access is strictly forbidden.
3. **Modification & Deletion (`UPDATE`, `DELETE`)**:
   - Only authorized teachers and admins can modify or delete objects.
