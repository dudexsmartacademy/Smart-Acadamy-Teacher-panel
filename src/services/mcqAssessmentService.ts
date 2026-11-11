import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { batchService } from './batchService';
import type {
  MCQAssessment,
  MCQAssessmentDraft,
  MCQClassInfo,
  MCQQuestion,
  MCQAssessmentStatus,
  MCQOptionKey,
} from '../types/mcqAssessment';

const DRAFT_STORAGE_KEY = 'dudex_mcq_assessment_draft';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Assessment windows are entered and shown in academy time (IST), whatever the
// browser's timezone. The schedule form uses "10:00 AM"; 24-hour "14:30" is
// accepted too.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function scheduleToIso(date: string, time: string): string {
  const match = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) throw new Error(`Invalid time "${time}". Use a time like 10:00 AM.`);
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();
  if (meridiem) {
    if (hours < 1 || hours > 12) throw new Error(`Invalid time "${time}".`);
    hours = (hours % 12) + (meridiem === 'PM' ? 12 : 0);
  }
  if (hours > 23 || minutes > 59) throw new Error(`Invalid time "${time}".`);
  const [y, m, d] = date.split('-').map(Number);
  if (!y || !m || !d) throw new Error(`Invalid date "${date}".`);
  return new Date(Date.UTC(y, m - 1, d, hours, minutes) - IST_OFFSET_MS).toISOString();
}

function isoToSchedule(iso: Date): { date: string; time: string } {
  const ist = new Date(iso.getTime() + IST_OFFSET_MS);
  const hours = ist.getUTCHours();
  const minutes = String(ist.getUTCMinutes()).padStart(2, '0');
  return {
    date: ist.toISOString().slice(0, 10),
    time: `${((hours + 11) % 12) + 1}:${minutes} ${hours >= 12 ? 'PM' : 'AM'}`,
  };
}

function mapDbStatusToFrontend(dbStatus: string): MCQAssessmentStatus {
  switch (dbStatus?.toLowerCase()) {
    case 'scheduled':
      return 'Scheduled';
    case 'active':
      return 'Active';
    case 'closed':
      return 'Completed';
    case 'archived':
      return 'Archived';
    case 'draft':
    default:
      return 'Draft';
  }
}

/** "All Batches" option of the batch picker (classInfo.classId). */
export const ALL_BATCHES = 'ALL_BATCHES';

/** Picker info for an assessment: its batches, or its legacy academic class. */
function batchClassInfo(
  row: Record<string, unknown>,
  cls?: { id: string; name: string; department?: string; batch?: string; section?: string },
): MCQClassInfo {
  const batches = Array.isArray(row.batches) ? (row.batches as string[]) : [];
  if (batches.length > 0) {
    return {
      classId: batches.length === 1 ? batches[0] : ALL_BATCHES,
      className: batches.join(', '),
      college: '',
      department: '',
      specialization: '',
      batch: batches.join(', '),
      section: '',
    };
  }
  return {
    classId: cls?.id || (row.class_id as string) || '',
    className: cls?.name || 'Class',
    college: '',
    department: cls?.department || '',
    specialization: '',
    batch: cls?.batch || '',
    section: cls?.section || '',
  };
}

export const mcqAssessmentService = {
  async getAssessments(filters?: {
    search?: string;
    classId?: string;
    subjectId?: string;
    status?: string;
    sortBy?: string;
  }): Promise<{ data: MCQAssessment[]; error: string | null }> {
    if (!isSupabaseConfigured) {
      return { data: [], error: 'Database connection is not configured.' };
    }

    try {
      let query = supabase
        .from('assessments')
        .select(`
          id,
          title,
          description,
          type,
          duration_seconds,
          max_marks,
          start_date,
          end_date,
          status,
          created_at,
          updated_at,
          class_id,
          batches,
          classes(
            id,
            name
          )
        `)
        .in('type', ['mcq', 'MCQ']);

      if (filters?.status && filters.status !== 'All') {
        const dbStatus = filters.status.toLowerCase() === 'completed' ? 'closed' : filters.status.toLowerCase();
        query = query.eq('status', dbStatus);
      } else {
        query = query.neq('status', 'archived');
      }

      if (filters?.classId && filters.classId !== 'All' && UUID_REGEX.test(filters.classId)) {
        query = query.eq('class_id', filters.classId);
      }

      let { data, error } = await (query.order('created_at', { ascending: false }) as unknown as Promise<{
        data: Array<Record<string, unknown>> | null;
        error: Error | null;
      }>);

      if (error) {
        let fallbackQuery = supabase
          .from('assessments')
          .select('id, title, description, type, duration_seconds, max_marks, start_date, end_date, status, created_at, updated_at, class_id, batches')
          .in('type', ['mcq', 'MCQ']);

        if (filters?.status && filters.status !== 'All') {
          const dbStatus = filters.status.toLowerCase() === 'completed' ? 'closed' : filters.status.toLowerCase();
          fallbackQuery = fallbackQuery.eq('status', dbStatus);
        } else {
          fallbackQuery = fallbackQuery.neq('status', 'archived');
        }

        if (filters?.classId && filters.classId !== 'All' && UUID_REGEX.test(filters.classId)) {
          fallbackQuery = fallbackQuery.eq('class_id', filters.classId);
        }

        const fallbackRes = await (fallbackQuery.order('created_at', { ascending: false }) as unknown as Promise<{
          data: Array<Record<string, unknown>> | null;
          error: Error | null;
        }>);
        if (fallbackRes.error) return { data: [], error: fallbackRes.error.message };
        data = fallbackRes.data;
      }

      let list: MCQAssessment[] = (data || []).map((row) => {
        const cls = row.classes as {
          id: string;
          name: string;
          department?: string;
          batch?: string;
          section?: string;
        } | undefined;

        const subject = cls?.name || 'Subject';
        const rawStart = (row.start_date || row.start_at) as string | undefined;
        const rawEnd = (row.end_date || row.end_at) as string | undefined;
        const startAt = rawStart ? new Date(rawStart) : new Date();
        const endAt = rawEnd ? new Date(rawEnd) : new Date(startAt.getTime() + 3600000);

        const start = isoToSchedule(startAt);
        const dateStr = start.date;
        const startTimeStr = start.time;
        const endTimeStr = isoToSchedule(endAt).time;

        return {
          id: row.id as string,
          title: (row.title as string) || 'MCQ Assessment',
          description: (row.description as string) || '',
          classInfo: batchClassInfo(row, cls),
          subjectId: subject,
          subjectName: subject,
          questions: [],
          questionCount: Number(
            (row.assessment_questions as Array<{ count: number }> | undefined)?.[0]?.count ?? 0
          ),
          totalMarks: Number(row.total_marks ?? 0),
          schedule: {
            date: dateStr,
            startTime: startTimeStr,
            endTime: endTimeStr,
            durationMinutes: Math.round(Number(row.duration_seconds || 1800) / 60),
            timezone: 'IST (UTC+05:30)',
          },
          status: mapDbStatusToFrontend(row.status as string),
          createdAt: (row.created_at as string) || new Date().toISOString(),
          updatedAt: (row.updated_at as string) || new Date().toISOString(),
        };
      });

      if (filters?.search && filters.search.trim()) {
        const q = filters.search.toLowerCase().trim();
        list = list.filter(
          (a) =>
            a.title.toLowerCase().includes(q) ||
            a.subjectName.toLowerCase().includes(q) ||
            a.classInfo.className.toLowerCase().includes(q) ||
            a.classInfo.department.toLowerCase().includes(q)
        );
      }

      if (filters?.sortBy) {
        switch (filters.sortBy) {
          case 'Newest':
            list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            break;
          case 'Oldest':
            list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            break;
          case 'Upcoming':
            list.sort((a, b) => new Date(a.schedule.date).getTime() - new Date(b.schedule.date).getTime());
            break;
          case 'Recently Updated':
            list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
            break;
          default:
            break;
        }
      }

      return { data: list, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to query assessments';
      return { data: [], error: msg };
    }
  },

  async getAssessmentById(id: string): Promise<{ data: MCQAssessment | null; error: string | null }> {
    if (!isSupabaseConfigured) {
      return { data: null, error: 'Database connection is not configured.' };
    }

    try {
      let row: Record<string, unknown> | null = null;
      const { data: primaryRow, error } = await (supabase
        .from('assessments')
        .select(`
          id,
          title,
          description,
          type,
          duration_seconds,
          max_marks,
          start_date,
          end_date,
          status,
          created_at,
          updated_at,
          class_id,
          batches,
          classes(
            id,
            name
          )
        `)
        .eq('id', id)
        .maybeSingle() as unknown as Promise<{ data: Record<string, unknown> | null; error: Error | null }>);

      if (error) {
        const fallback = await (supabase
          .from('assessments')
          .select('id, title, description, type, duration_seconds, max_marks, start_date, end_date, status, created_at, updated_at, class_id, batches')
          .eq('id', id)
          .maybeSingle() as unknown as Promise<{ data: Record<string, unknown> | null; error: Error | null }>);
        if (fallback.error || !fallback.data) {
          return { data: null, error: fallback.error?.message || 'Assessment not found' };
        }
        row = fallback.data;
      } else if (!primaryRow) {
        return { data: null, error: 'Assessment not found' };
      } else {
        row = primaryRow;
      }

      // Fetch assessment_questions
      const { data: aqData } = await (supabase
        .from('assessment_questions')
        .select(`
          id,
          question_text,
          question_type,
          marks,
          order_index,
          explanation,
          question_options(
            id,
            option_label,
            option_text,
            is_correct
          )
        `)
        .eq('assessment_id', id)
        .order('order_index', { ascending: true }) as unknown as Promise<{
        data: Array<Record<string, unknown>> | null;
        error: Error | null;
      }>);

      const questions: MCQQuestion[] = (aqData || []).map((aq, idx) => {
        const q = aq as {
          id: string;
          question_text: string;
          explanation?: string;
          question_options?: Array<{
            id: string;
            option_label: string;
            option_text: string;
            is_correct: boolean;
          }>;
        } | undefined;

        const keyMap: MCQOptionKey[] = ['A', 'B', 'C', 'D'];
        const rawOptions = q?.question_options || [];
        let correctOptionId = '';

        const options = rawOptions.map((opt, optIdx) => {
          if (opt.is_correct) {
            correctOptionId = opt.id;
          }
          return {
            id: opt.id,
            optionKey: (opt.option_label as MCQOptionKey) || keyMap[optIdx] || 'A',
            text: opt.option_text,
          };
        });

        return {
          id: q?.id || (aq.id as string),
          questionText: q?.question_text || '',
          options,
          correctOptionId,
          marks: Number(aq.marks) || 1,
          explanation: q?.explanation || '',
          order: Number(aq.order_index) || idx + 1,
        };
      });

      const cls = row.classes as {
        id: string;
        name: string;
      } | undefined;

      const subject = cls?.name || 'Subject';
      const rawStart = (row.start_date || row.start_at) as string | undefined;
      const rawEnd = (row.end_date || row.end_at) as string | undefined;
      const startAt = rawStart ? new Date(rawStart) : new Date();
      const endAt = rawEnd ? new Date(rawEnd) : new Date(startAt.getTime() + 3600000);

      const assessment: MCQAssessment = {
        id: row.id as string,
        title: (row.title as string) || 'MCQ Assessment',
        description: (row.description as string) || '',
        classInfo: batchClassInfo(row, cls),
        subjectId: subject,
        subjectName: subject,
        questions,
        schedule: {
          date: isoToSchedule(startAt).date,
          startTime: isoToSchedule(startAt).time,
          endTime: isoToSchedule(endAt).time,
          durationMinutes: Math.round(Number(row.duration_seconds || 1800) / 60),
          timezone: 'IST (UTC+05:30)',
        },
        status: mapDbStatusToFrontend(row.status as string),
        createdAt: (row.created_at as string) || new Date().toISOString(),
        updatedAt: (row.updated_at as string) || new Date().toISOString(),
      };

      return { data: assessment, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to get assessment';
      return { data: null, error: msg };
    }
  },

  async createAssessment(payload: Omit<MCQAssessment, 'id' | 'createdAt' | 'updatedAt'>): Promise<{
    data: MCQAssessment | null;
    error: string | null;
  }> {
    if (!isSupabaseConfigured) {
      return { data: null, error: 'Database connection is not configured.' };
    }

    try {
      // 1. Get the authenticated teacher account. Auth/RLS remain authoritative.
      const { data: userResp, error: authErr } = await supabase.auth.getUser();
      if (authErr || !userResp?.user) {
        return { data: null, error: 'User is not authenticated' };
      }

      const { data: tp } = await supabase
        .from('teacher_profiles')
        .select('id, status')
        .eq('user_id', userResp.user.id)
        .maybeSingle();
      if (!tp || tp.status !== 'active') {
        return { data: null, error: 'No active teacher profile found for current user.' };
      }

      // 2. Resolve the target: one batch, every batch, or (older data) a class.
      const target = payload.classInfo.classId;
      const validClassId = UUID_REGEX.test(target) ? target : null;
      let batches: string[] = [];
      if (!validClassId) {
        if (target === ALL_BATCHES) {
          const { data: all } = await batchService.getBatches();
          batches = all.map((b) => b.name);
        } else if (target) {
          batches = [target];
        }
      }
      if (!validClassId && batches.length === 0) {
        return { data: null, error: 'Select a batch for this assessment.' };
      }

      // 3. Calculate marks and timings
      const totalMarks = payload.questions.reduce((sum, q) => sum + (Number(q.marks) || 1), 0);
      const durationMinutes = payload.schedule.durationMinutes || 30;

      let startAt: string | null = null;
      let endAt: string | null = null;
      if (payload.schedule.date) {
        startAt = scheduleToIso(payload.schedule.date, payload.schedule.startTime || '9:00 AM');
        endAt = scheduleToIso(payload.schedule.date, payload.schedule.endTime || '10:00 AM');
        if (endAt <= startAt) {
          return { data: null, error: 'The end time must be after the start time.' };
        }
      }

      const dbStatus = payload.status?.toLowerCase() === 'completed' ? 'closed' : payload.status?.toLowerCase() || 'scheduled';
      const isPublished = !['draft', 'archived', 'cancelled'].includes(dbStatus);

      // 4. Insert assessment using the live schema contract.
      const { data: newAssessmentRow, error: assErr } = await (supabase
        .from('assessments')
        .insert({
          created_by: userResp.user.id,
          title: payload.title.trim(),
          description: payload.description?.trim() || null,
          class_id: validClassId,
          batches,
          type: 'MCQ',
          subject: payload.subjectName || (payload as any).subject || 'General',
          duration_minutes: durationMinutes,
          total_questions: payload.questions.length,
          max_marks: totalMarks,
          pass_percentage: 40,
          start_date: startAt,
          end_date: endAt,
          status: dbStatus === 'scheduled' ? 'Scheduled' : dbStatus === 'active' ? 'Active' : dbStatus,
          published: isPublished,
        })
        .select()
        .single() as unknown as Promise<{ data: Record<string, unknown> | null; error: Error | null }>);

      if (assErr || !newAssessmentRow) {
        return { data: null, error: assErr?.message || 'Failed to create assessment in database.' };
      }

      const assessmentId = newAssessmentRow.id as string;

      // 5. Insert questions and options. Never continue after a partial failure.
      for (let i = 0; i < payload.questions.length; i++) {
        const q = payload.questions[i];
        const { data: qRow, error: qErr } = await (supabase
          .from('assessment_questions')
          .insert({
            assessment_id: assessmentId,
            question_text: q.questionText.trim(),
            question_type: 'mcq',
            marks: Number(q.marks) || 1,
            order_index: q.order || i + 1,
            explanation: q.explanation?.trim() || null,
          })
          .select('id')
          .single() as unknown as Promise<{ data: { id: string } | null; error: Error | null }>);

        if (qErr || !qRow) {
          return { data: null, error: `Question ${i + 1} failed: ${qErr?.message || 'unknown error'}` };
        }

        const questionId = qRow.id;

        // Insert question options
        if (q.options && q.options.length > 0) {
          const optionsToInsert = q.options.map((opt, optIdx) => ({
            question_id: questionId,
            option_text: opt.text.trim() || `Option ${opt.optionKey}`,
            option_label: ['A', 'B', 'C', 'D', 'E', 'F'][optIdx] || String(optIdx + 1),
            is_correct: opt.id === q.correctOptionId || opt.optionKey === q.correctOptionId,
          }));

          const { error: optionsError } = await supabase.from('question_options').insert(optionsToInsert);
          if (optionsError) return { data: null, error: `Options for question ${i + 1} failed: ${optionsError.message}` };
        }
      }

      const fullResult = await this.getAssessmentById(assessmentId);
      return {
        data: fullResult.data || {
          ...payload,
          id: assessmentId,
          createdAt: newAssessmentRow.created_at as string,
          updatedAt: newAssessmentRow.updated_at as string,
        },
        error: null,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Database write error';
      return { data: null, error: msg };
    }
  },

  async updateAssessment(
    id: string,
    payload: Partial<Omit<MCQAssessment, 'id' | 'createdAt'>>
  ): Promise<{ data: MCQAssessment | null; error: string | null }> {
    if (!isSupabaseConfigured) {
      return { data: null, error: 'Database connection is not configured.' };
    }

    try {
      const dbUpdates: Record<string, unknown> = {};
      if (payload.title !== undefined) dbUpdates.title = payload.title.trim();
      if (payload.description !== undefined) dbUpdates.description = payload.description.trim() || null;
      if (payload.status !== undefined) {
        const status = payload.status.toLowerCase() === 'completed' ? 'closed' : payload.status.toLowerCase();
        dbUpdates.status = status;
        // Students only see assessments with published = true.
        dbUpdates.published = !['draft', 'archived', 'cancelled'].includes(status);
      }
      if (payload.schedule?.durationMinutes !== undefined) {
        dbUpdates.duration_minutes = payload.schedule.durationMinutes;
      }
      if (payload.schedule?.date) {
        dbUpdates.start_date = scheduleToIso(payload.schedule.date, payload.schedule.startTime || '9:00 AM');
        dbUpdates.end_date = scheduleToIso(payload.schedule.date, payload.schedule.endTime || '10:00 AM');
      }

      const { data: updated, error } = await supabase
        .from('assessments')
        .update(dbUpdates)
        .eq('id', id)
        .select('id');

      if (error) {
        return { data: null, error: error.message };
      }
      if (!updated || updated.length === 0) {
        return { data: null, error: 'Assessment not found or you cannot edit it.' };
      }

      return await this.getAssessmentById(id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Database update failed';
      return { data: null, error: msg };
    }
  },

  async deleteAssessment(id: string, softArchive = true): Promise<{ success: boolean; error: string | null }> {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Database connection is not configured.' };
    }

    try {
      if (softArchive) {
        const { error } = await supabase
          .from('assessments')
          .update({ status: 'archived' })
          .eq('id', id);

        if (error) return { success: false, error: error.message };
      } else {
        const { error } = await supabase
          .from('assessments')
          .delete()
          .eq('id', id);

        if (error) return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Database delete failed';
      return { success: false, error: msg };
    }
  },

  saveDraft(draft: MCQAssessmentDraft): void {
    try {
      draft.lastSavedAt = new Date().toISOString();
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch (e) {
      console.error('Failed to save draft', e);
    }
  },

  getDraft(): MCQAssessmentDraft | null {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  clearDraft(): void {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch (e) {
      console.error('Failed to clear draft', e);
    }
  },

  /** Batch picker options: "All Batches" plus every global batch. */
  async fetchClasses(): Promise<MCQClassInfo[]> {
    const { data } = await batchService.getBatches();
    const option = (classId: string, label: string, batch: string): MCQClassInfo => ({
      classId,
      className: label,
      college: '',
      department: '',
      specialization: '',
      batch,
      section: '',
    });
    return [
      option(ALL_BATCHES, 'All Batches', 'All Batches'),
      ...data.map((b) => option(b.name, b.name, b.name)),
    ];
  },

  async fetchSubjects(): Promise<Array<{ id: string; name: string }>> {
    if (!isSupabaseConfigured) return [];
    try {
      const { data } = await supabase
        .from('subjects')
        .select('id, name')
        .order('name');

      if (data && data.length > 0) {
        return data.map((s) => ({ id: s.id, name: s.name }));
      }
    } catch (e) {
      console.error('Error fetching subjects:', e);
    }
    return [];
  },

  getClasses(): MCQClassInfo[] {
    return [];
  },

  getSubjects(): Array<{ id: string; name: string }> {
    return [];
  },
};
