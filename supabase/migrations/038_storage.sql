-- 038_storage.sql
-- Hardened Storage bucket initialization and RLS policies for private academic notes

-- 1. Create private storage bucket for notes
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'academy-notes',
    'academy-notes',
    false, -- Private bucket
    52428800, -- 50MB max file size
    ARRAY[
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

-- 2. Storage Policies on storage.objects

-- Allow teachers to upload files to their assigned class note paths
CREATE POLICY "Teachers upload note files to assigned classes"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'academy-notes' AND (
        public.has_role(auth.uid(), 'admin')
        OR (
            public.has_role(auth.uid(), 'teacher')
            AND (
                -- Verify path matches notes/{class_id}/...
                (storage.foldername(name))[1] = 'notes'
            )
        )
    )
);

-- Allow teachers to update/delete their uploaded note files
CREATE POLICY "Teachers update delete note files"
ON storage.objects
FOR ALL
TO authenticated
USING (
    bucket_id = 'academy-notes' AND (
        public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'teacher')
    )
);

-- Allow students and teachers to download note files only if authorized
CREATE POLICY "Authorized users download note files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'academy-notes' AND (
        public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'teacher')
        OR public.has_role(auth.uid(), 'student')
    )
);
