import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface NoteAttachment {
  id: string;
  noteId: string;
  filePath: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

export interface NoteItem {
  id: string;
  classId: string;
  className?: string;
  subjectName?: string;
  noteDate: string;
  title: string;
  description?: string | null;
  isPublished: boolean;
  attachments?: NoteAttachment[];
  createdAt: string;
}

export const notesService = {
  async getNotes(classId?: string) {
    if (!isSupabaseConfigured) {
      return { data: [], error: 'Database connection is not configured.' };
    }

    let q = supabase
      .from('notes')
      .select(`
        *,
        classes (
          name
        ),
        note_attachments (
          *
        )
      `)
      .order('created_at', { ascending: false });

    if (classId && classId !== 'all') {
      q = q.eq('class_id', classId);
    }

    let { data, error } = await (q as unknown as Promise<{ data: Array<Record<string, unknown>> | null; error: Error | null }>);
    if (error) {
      // Fallback if classes relation is not configured in schema cache
      let fallbackQ = supabase
        .from('notes')
        .select('*, note_attachments(*)')
        .order('created_at', { ascending: false });
      if (classId && classId !== 'all') {
        fallbackQ = fallbackQ.eq('class_id', classId);
      }
      const fbRes = await (fallbackQ as unknown as Promise<{ data: Array<Record<string, unknown>> | null; error: Error | null }>);
      if (fbRes.error) return { data: [], error: fbRes.error.message };
      data = fbRes.data;
    }

    const formatted: NoteItem[] = (data || []).map((item) => {
      const cls = item.classes as { name: string } | undefined;
      const atts = (item.note_attachments as Array<Record<string, unknown>>) || [];

      return {
        id: item.id as string,
        classId: (item.class_id as string) || '',
        className:
          (Array.isArray(item.batches) && (item.batches as string[]).length
            ? (item.batches as string[]).join(', ')
            : '') ||
          cls?.name ||
          'No batch',
        subjectName: (item.subject as string) || cls?.name || 'Subject',
        noteDate: (item.note_date as string) || (item.date as string) || (item.created_at as string)?.split('T')[0] || new Date().toISOString().split('T')[0],
        title: (item.title as string) || 'Untitled Note',
        description: (item.description as string) || null,
        isPublished: true,
        attachments: atts.map(a => ({
          id: (a.id as string) || '',
          noteId: item.id as string,
          filePath: (a.file_url || a.file_path || '') as string,
          fileName: (a.file_name as string) || 'attachment',
          fileType: (a.file_type as string) || 'application/octet-stream',
          fileSize: Number(a.file_size) || 0,
        })),
        createdAt: (item.created_at as string) || new Date().toISOString(),
      };
    });

    return { data: formatted, error: null };
  },

  /**
   * Publishes a note to the selected global batches (one notes row with a
   * batch list). Files go to the private `notes` bucket; students of those
   * batches open them through signed URLs.
   */
  async createNote(
    payload: {
      batches: string[];
      title: string;
      description?: string;
      noteDate: string;
      subject?: string;
    },
    files: File[]
  ) {
    if (!isSupabaseConfigured) {
      return { data: null, error: 'Database connection is not configured.' };
    }

    let createdNoteId: string | null = null;
    const uploadedPaths: string[] = [];
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Sign in before creating notes.');
      if (payload.batches.length === 0) throw new Error('Select at least one batch.');

      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
      const teacherName = (profile as { full_name?: string } | null)?.full_name || 'Faculty Member';
      const noteDate = payload.noteDate || new Date().toISOString().split('T')[0];

      const { data: note, error: noteError } = await supabase
        .from('notes')
        .insert({
          class_id: null,
          batches: payload.batches,
          teacher_id: user.id,
          teacher_name: teacherName,
          subject: payload.subject?.trim() || 'General',
          title: payload.title,
          description: payload.description || null,
          date: noteDate,
        })
        .select()
        .single();
      if (noteError || !note) throw new Error(noteError?.message || 'Failed to create note');
      createdNoteId = note.id as string;

      const attachmentRecords: NoteAttachment[] = [];
      for (const file of files) {
        const storagePath = `notes/${user.id}/${note.id}/${Date.now()}_${file.name.replace(/[^A-Za-z0-9._-]/g, '_')}`;
        const { error: uploadErr } = await supabase.storage
          .from('notes')
          .upload(storagePath, file, { contentType: file.type, upsert: false });
        if (uploadErr) throw new Error(`Could not upload ${file.name}: ${uploadErr.message}`);
        uploadedPaths.push(storagePath);

        const { data: attRecord, error: attachmentError } = await supabase
          .from('note_attachments')
          .insert({
            note_id: note.id as string,
            file_url: storagePath,
            file_name: file.name,
            file_type: file.type || 'application/octet-stream',
          })
          .select()
          .single();
        if (attachmentError || !attRecord) {
          throw new Error(`Could not attach ${file.name}: ${attachmentError?.message || 'no row saved'}`);
        }
        attachmentRecords.push({
          id: attRecord.id as string,
          noteId: note.id as string,
          filePath: storagePath,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size || 0,
        });
      }

      if (attachmentRecords.length > 0) {
        const pdf = attachmentRecords.find((a) => a.fileType.includes('pdf')) || attachmentRecords[0];
        await supabase.from('notes').update({ pdf_url: pdf.filePath, pdf_name: pdf.fileName }).eq('id', note.id);
      }

      return {
        data: {
          id: note.id as string,
          classId: '',
          noteDate,
          title: note.title as string,
          description: (note.description as string) || null,
          isPublished: true,
          attachments: attachmentRecords,
          createdAt: (note.created_at as string) || new Date().toISOString(),
        },
        error: null,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Note creation failed';
      const cleanupErrors: string[] = [];
      if (uploadedPaths.length > 0) {
        const { error: storageCleanupError } = await supabase.storage.from('notes').remove(uploadedPaths);
        if (storageCleanupError) cleanupErrors.push(storageCleanupError.message);
      }
      if (createdNoteId) {
        const { error: noteCleanupError } = await supabase.from('notes').delete().eq('id', createdNoteId);
        if (noteCleanupError) cleanupErrors.push(noteCleanupError.message);
      }
      return {
        data: null,
        error: cleanupErrors.length > 0 ? `${msg}. Cleanup failed: ${cleanupErrors.join('; ')}` : msg,
      };
    }
  },

  async archiveNote(noteId: string) {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Database connection is not configured.' };
    }

    // Files are removed only when no other note (e.g. a duplicate) uses them.
    const { data: atts } = await supabase.from('note_attachments').select('file_url').eq('note_id', noteId);
    const { error } = await supabase.from('notes').delete().eq('id', noteId);
    if (error) return { success: false, error: error.message };

    const paths = ((atts || []) as Array<{ file_url: string | null }>)
      .map((a) => a.file_url)
      .filter((p): p is string => Boolean(p && !/^https?:/i.test(p)));
    if (paths.length > 0) {
      const { data: stillUsed } = await supabase.from('note_attachments').select('file_url').in('file_url', paths);
      const used = new Set(((stillUsed || []) as Array<{ file_url: string }>).map((a) => a.file_url));
      const orphaned = paths.filter((p) => !used.has(p));
      if (orphaned.length > 0) await supabase.storage.from('notes').remove(orphaned);
    }
    return { success: true, error: null };
  },

  /** Copies one of the teacher's notes (same batches and attachments). */
  async duplicateNote(noteId: string): Promise<{ success: boolean; error: string | null }> {
    const { data: original, error } = await supabase
      .from('notes')
      .select('*, note_attachments(file_url, file_name, file_type)')
      .eq('id', noteId)
      .single();
    if (error || !original) return { success: false, error: error?.message || 'Note not found.' };
    const row = original as Record<string, unknown>;
    const { data: copy, error: copyError } = await supabase
      .from('notes')
      .insert({
        class_id: row.class_id ?? null,
        batches: row.batches ?? [],
        teacher_id: row.teacher_id,
        teacher_name: row.teacher_name,
        subject: row.subject,
        title: `${row.title as string} - Copy`,
        description: row.description ?? null,
        date: new Date().toISOString().split('T')[0],
        pdf_url: row.pdf_url ?? null,
        pdf_name: row.pdf_name ?? null,
      })
      .select('id')
      .single();
    if (copyError || !copy) return { success: false, error: copyError?.message || 'Copy failed.' };
    const atts = (row.note_attachments as Array<Record<string, unknown>>) || [];
    if (atts.length > 0) {
      const { error: attError } = await supabase
        .from('note_attachments')
        .insert(atts.map((a) => ({ ...a, note_id: (copy as { id: string }).id })));
      if (attError) return { success: false, error: attError.message };
    }
    return { success: true, error: null };
  },

  async getNoteById(noteId: string): Promise<{ data: NoteItem | null; error: string | null }> {
    if (!isSupabaseConfigured) {
      return { data: null, error: 'Database connection is not configured.' };
    }

    try {
      let { data, error } = await (supabase
        .from('notes')
        .select(`
          *,
          classes (
            name
          ),
          note_attachments (
            *
          )
        `)
        .eq('id', noteId)
        .maybeSingle() as unknown as Promise<{ data: Record<string, unknown> | null; error: Error | null }>);

      if (error) {
        const fallbackRes = await (supabase
          .from('notes')
          .select('*, note_attachments(*)')
          .eq('id', noteId)
          .maybeSingle() as unknown as Promise<{ data: Record<string, unknown> | null; error: Error | null }>);
        if (fallbackRes.error || !fallbackRes.data) {
          return { data: null, error: fallbackRes.error?.message || 'Note not found' };
        }
        data = fallbackRes.data;
      }

      if (!data) {
        return { data: null, error: 'Note not found' };
      }

      const cls = data.classes as { name: string } | undefined;
      const atts = (data.note_attachments as Array<Record<string, unknown>>) || [];

      return {
        data: {
          id: data.id as string,
          classId: (data.class_id as string) || '',
          className: cls?.name || (data.subject as string) || 'Class',
          subjectName: (data.subject as string) || cls?.name || 'Subject',
          noteDate: (data.note_date as string) || (data.date as string) || (data.created_at as string)?.split('T')[0] || new Date().toISOString().split('T')[0],
          title: (data.title as string) || 'Untitled Note',
          description: (data.description as string) || null,
          isPublished: true,
          attachments: atts.map((a) => ({
            id: (a.id as string) || '',
            noteId: data.id as string,
            filePath: (a.file_url || a.file_path || '') as string,
            fileName: (a.file_name as string) || 'attachment',
            fileType: (a.file_type as string) || 'application/octet-stream',
            fileSize: Number(a.file_size) || 0,
          })),
          createdAt: (data.created_at as string) || new Date().toISOString(),
        },
        error: null,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to query note';
      return { data: null, error: msg };
    }
  },

  async updateNote(
    noteId: string,
    updates: {
      title?: string;
      description?: string;
      subject?: string;
      classId?: string;
    }
  ): Promise<{ success: boolean; error: string | null }> {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Database connection is not configured.' };
    }

    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.subject !== undefined) dbUpdates.subject = updates.subject;
      if (updates.classId !== undefined) dbUpdates.class_id = updates.classId;

      const { error } = await supabase
        .from('notes')
        .update(dbUpdates)
        .eq('id', noteId);

      if (error) return { success: false, error: error.message };
      return { success: true, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update note';
      return { success: false, error: msg };
    }
  },

  async getSignedUrl(filePath: string, expiresIn = 3600): Promise<string | null> {
    if (!filePath) return null;
    if (/^https?:\/\//i.test(filePath)) return filePath;
    try {
      const cleanPath = filePath.replace(/^\/+/, '');
      const { data, error } = await supabase.storage.from('notes').createSignedUrl(cleanPath, expiresIn);
      if (error) {
        console.error('Storage signed URL error:', error);
        return null;
      }
      return data?.signedUrl || null;
    } catch (err) {
      console.error('Failed to create signed url:', err);
      return null;
    }
  },
};
