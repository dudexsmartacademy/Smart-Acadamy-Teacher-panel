import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface ClassDetails {
  id: string;
  name: string;
  department: string;
  academicYear: string;
  batch: string;
  section: string;
}

// Direct select * to avoid missing column 400 Bad Request
const CLASS_SELECT = '*';

function mapClassRow(row: any): ClassDetails {
  return {
    id: row.id,
    name: row.name || '',
    department: row.department || row.departments?.name || '',
    academicYear: row.academic_year || row.academic_years?.name || '',
    batch: row.batch || row.batches?.name || '',
    section: row.section || row.sections?.name || '',
  };
}

function formatTime(value: string | null): string {
  if (!value) return '';
  const time = value.includes('T') ? value.split('T')[1] || '' : value;
  return time.slice(0, 5);
}

function classStatus(value: string | null): 'Active' | 'Scheduled' | 'Completed' | 'Archived' | 'Unknown' {
  switch (value?.toLowerCase()) {
    case 'live':
      return 'Active';
    case 'scheduled':
    case 'upcoming':
      return 'Scheduled';
    case 'completed':
    case 'closed':
      return 'Completed';
    case 'cancelled':
    case 'archived':
      return 'Archived';
    default:
      return 'Unknown';
  }
}

async function fetchClassRows(): Promise<{ data: any[]; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { data: [], error: 'Database connection is not configured.' };
  }

  let { data, error } = await (supabase
    .from('classes')
    .select(CLASS_SELECT)
    .order('name', { ascending: true }) as unknown as Promise<{
      data: any[] | null;
      error: Error | null;
    }>);

  if (error) {
    const fallback = await (supabase
      .from('classes')
      .select('*')
      .order('name', { ascending: true }) as unknown as Promise<{
        data: any[] | null;
        error: Error | null;
      }>);
    if (fallback.error) {
      return { data: [], error: fallback.error.message };
    }
    data = fallback.data;
  }

  return { data: data || [], error: null };
}

export const classService = {
  async getClasses() {
    const { data, error } = await fetchClassRows();
    return {
      data: data.map(mapClassRow),
      error,
    };
  },

  async fetchClasses() {
    return this.getClasses();
  },

  async getClassItems(): Promise<{
    data: Array<{
      id: string;
      name: string;
      department: string;
      section: string;
      subject: string;
      batch: string;
      academicYear: string;
      studentsCount: number | null;
      classDate?: string;
      schedule: string;
      meetLink?: string;
      room?: string;
      description: string;
      status: 'Active' | 'Scheduled' | 'Completed' | 'Archived' | 'Unknown';
    }>;
    error: string | null;
  }> {
    const { data: classes, error: classError } = await fetchClassRows();
    if (classError) return { data: [], error: classError };
    if (!isSupabaseConfigured) {
      return { data: [], error: 'Database connection is not configured.' };
    }

    const [membershipResult, liveClassResult] = await Promise.all([
      supabase
        .from('class_memberships')
        .select('class_id') as unknown as Promise<{
          data: Array<{ class_id: string }> | null;
          error: Error | null;
        }>,
      supabase
        .from('live_classes')
        .select('*')
        .order('created_at', { ascending: false }) as unknown as Promise<{
          data: Array<Record<string, any>> | null;
          error: Error | null;
        }>,
    ]);

    if (membershipResult.error) {
      return { data: [], error: `Could not load class memberships: ${membershipResult.error.message}` };
    }
    if (liveClassResult.error) {
      console.warn('Could not load live class schedules:', liveClassResult.error.message);
    }

    const studentCounts = new Map<string, number>();
    (membershipResult.data || []).forEach((membership) => {
      studentCounts.set(
        membership.class_id,
        (studentCounts.get(membership.class_id) || 0) + 1
      );
    });

    const latestLiveClass = new Map<string, Record<string, any>>();
    (liveClassResult.data || []).forEach((liveClass) => {
      if (liveClass.class_id && !latestLiveClass.has(liveClass.class_id)) {
        latestLiveClass.set(liveClass.class_id, liveClass);
      }
    });

    return {
      data: classes.map((row: any) => {
        const mapped = mapClassRow(row);
        const liveClass = latestLiveClass.get(row.id);
        const start = formatTime(liveClass?.start_time || null);
        const end = formatTime(liveClass?.end_time || null);
        return {
          id: mapped.id,
          name: mapped.name,
          department: mapped.department,
          section: mapped.section,
          subject: liveClass?.subject || liveClass?.description || '',
          batch: mapped.batch,
          academicYear: mapped.academicYear,
          studentsCount: studentCounts.get(row.id) ?? null,
          classDate: liveClass?.scheduled_date || liveClass?.date || undefined,
          schedule: start && end ? `${start} - ${end}` : '',
          meetLink: liveClass?.meeting_url || '',
          room: liveClass?.platform || liveClass?.meeting_platform || '',
          description: liveClass?.topic || '',
          status: classStatus(liveClass?.status || null),
        };
      }),
      error: null,
    };
  },

  async getClassById(classId: string) {
    if (!isSupabaseConfigured) {
      return { data: null, error: 'Database connection is not configured.' };
    }

    const { data, error } = await (supabase
      .from('classes')
      .select(CLASS_SELECT)
      .eq('id', classId)
      .maybeSingle() as unknown as Promise<{
        data: any | null;
        error: Error | null;
      }>);

    if (error || !data) {
      return { data: null, error: error?.message || 'Class not found.' };
    }

    return { data: mapClassRow(data), error: null };
  },

  async searchClasses(filters: {
    departmentId?: string;
    batchId?: string;
    sectionId?: string;
    academicYearId?: string;
    query?: string;
  }) {
    const { data, error } = await fetchClassRows();
    if (error) return { data: [], error };

    const query = filters.query?.trim().toLowerCase();
    const filtered = query
      ? data.filter((row: any) => (row.name || '').toLowerCase().includes(query))
      : data;

    return {
      data: filtered.map(mapClassRow),
      error: null,
    };
  },

  async getSubjects(): Promise<{ data: Array<{ id: string; name: string }>; error: string | null }> {
    if (!isSupabaseConfigured) {
      return { data: [], error: 'Database connection is not configured.' };
    }

    const { data, error } = await (supabase
      .from('subjects')
      .select('id, name')
      .order('name') as unknown as Promise<{
        data: Array<{ id: string; name: string }> | null;
        error: Error | null;
      }>);

    if (error) return { data: [], error: error.message };
    return { data: data || [], error: null };
  },
};
