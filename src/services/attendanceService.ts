import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface StudentAttendanceEntry {
  studentId: string;
  rrn: string;
  name: string;
  status: 'Present' | 'Absent' | 'Late' | 'Excused';
  time?: string;
  remarks?: string;
  /** The student's global batch. */
  batchName?: string;
}

export interface SaveAttendancePayload {
  teacherId: string;
  /** Global batches this attendance session covers. */
  batches: string[];
  subjectId?: string;
  subject: string;
  session: string;
  date: string;
  attendance: StudentAttendanceEntry[];
}

export const attendanceService = {
  /**
   * Issues a six-character check-in code for the selected batches. Students of
   * those batches redeem it through mark_attendance_with_code.
   */
  async startCodeSession(batches: string[], subject: string, validMinutes = 15) {
    if (!isSupabaseConfigured) {
      return { data: null, error: 'Database connection is not configured.' };
    }
    const { data, error } = await (supabase.rpc('start_batch_attendance_code', {
      p_batches: batches,
      p_subject: subject || null,
      p_valid_minutes: validMinutes,
    } as unknown as Record<string, unknown>) as unknown as Promise<{
      data: Array<{ code_id: string; code: string; expires_at: string }> | null;
      error: Error | null;
    }>);
    if (error) return { data: null, error: error.message };
    if (!data || data.length === 0) return { data: null, error: 'No attendance code was issued.' };
    return { data: data[0], error: null };
  },

  /** Attendance already recorded for the batches on a date (manual or code check-in). */
  async getRecordsForDate(
    _batches: string[],
    date: string,
    _subject?: string,
  ): Promise<Array<{ studentId: string; status: string; time: string }>> {
    if (!isSupabaseConfigured) return [];
    // Load all records on that date so attendance marked by Admin,
    // Teacher, or Student check-in is never hidden due to batch_name variations.
    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('date', date);
    if (error || !data) return [];
    return data.map((row: Record<string, unknown>) => ({
      studentId: (row.student_id as string) || '',
      status: (row.status as string) || 'Present',
      time:
        (row.session_time as string) ||
        (row.created_at ? new Date(row.created_at as string).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''),
    }));
  },

  async stopCodeSession(codeId: string) {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Database connection is not configured.' };
    }

    try {
      await (supabase.rpc('stop_attendance_code_session', {
        p_code_id: codeId,
      } as unknown as Record<string, unknown>) as unknown as Promise<{ data: unknown; error: Error | null }>);
    } catch {}

    try {
      await supabase
        .from('class_sessions')
        .update({ room: 'EXPIRED' })
        .eq('id', codeId);
    } catch {}

    return { success: true, error: null };
  },

  /** Saves one attendance session for students of the selected batches. */
  async saveAttendance(payload: SaveAttendancePayload) {
    if (!isSupabaseConfigured) {
      return { success: false, session_id: null, recordCount: 0, error: 'Database connection is not configured.' };
    }

    try {
      const { data: userResp } = await supabase.auth.getUser();
      const authUserId = userResp?.user?.id;
      if (!authUserId) throw new Error('A signed-in teacher is required to save attendance.');

      let teacherName = userResp?.user?.user_metadata?.full_name;
      if (!teacherName) {
        const { data: tp } = await supabase.from('profiles').select('full_name').eq('id', authUserId).maybeSingle();
        teacherName = (tp as any)?.full_name || 'Faculty Member';
      }

      // Status must be title case to satisfy the attendance_records check constraint.
      const toDbStatus = (s: string): 'Present' | 'Absent' | 'Late' | 'Excused' => {
        const lower = (s || 'Present').trim().toLowerCase();
        if (lower === 'absent') return 'Absent';
        if (lower === 'late') return 'Late';
        if (lower === 'excused') return 'Excused';
        return 'Present';
      };

      const subject = (payload.subject && payload.subject.trim()) || 'General';
      const studentIds = payload.attendance.map((att) => att.studentId);

      // One record per student and date for batch attendance (class_id is null)
      const { data: existing, error: existingError } = await supabase
        .from('attendance_records')
        .select('id, student_id')
        .eq('date', payload.date)
        .is('class_id', null)
        .in('student_id', studentIds);
      if (existingError) throw new Error(`Could not read existing attendance: ${existingError.message}`);
      const existingMap = new Map((existing || []).map((r: { id: string; student_id: string }) => [r.student_id, r.id]));

      for (const att of payload.attendance.filter((a) => existingMap.has(a.studentId))) {
        const { error } = await supabase
          .from('attendance_records')
          .update({
            status: toDbStatus(att.status),
            teacher_id: authUserId,
            teacher_name: teacherName,
            subject,
            batch_name: att.batchName || null
          })
          .eq('id', existingMap.get(att.studentId) as string);
        if (error) throw new Error(`Failed to update attendance: ${error.message}`);
      }

      const rows = payload.attendance
        .filter((a) => !existingMap.has(a.studentId))
        .map((att) => ({
          student_id: att.studentId,
          class_id: null,
          batch_name: att.batchName || null,
          teacher_id: authUserId,
          teacher_name: teacherName,
          subject,
          date: payload.date,
          session_time: payload.session || '10:00 AM',
          status: toDbStatus(att.status),
          mode: 'offline',
        }));
      if (rows.length > 0) {
        const { error } = await supabase.from('attendance_records').insert(rows);
        if (error) throw new Error(`Failed to insert attendance: ${error.message}`);
      }

      return { success: true, session_id: null, recordCount: payload.attendance.length, error: null };
    } catch (err: unknown) {
      return { success: false, session_id: null, recordCount: 0, error: err instanceof Error ? err.message : 'Unknown attendance error' };
    }
  },

  async getClassAttendanceSummary(classId: string) {
    if (!isSupabaseConfigured) {
      return {
        class_id: classId,
        total_sessions: 0,
        enrolled_students: 0,
        average_percentage: 0,
      };
    }

    const { data, error } = await (supabase.rpc('get_class_attendance_summary', {
      p_class_id: classId,
    } as unknown as Record<string, unknown>) as unknown as Promise<{ data: Array<{ class_id: string; total_sessions: number; enrolled_students: number; average_percentage: number }> | null; error: Error | null }>);

    if (error || !data || data.length === 0) {
      return {
        class_id: classId,
        total_sessions: 0,
        enrolled_students: 0,
        average_percentage: 0,
      };
    }

    return data[0];
  },

  async getStudentAttendanceSummary(studentId: string) {
    if (!isSupabaseConfigured) {
      return {
        total_sessions: 0,
        present_count: 0,
        absent_count: 0,
        late_count: 0,
        excused_count: 0,
        percentage: 0,
      };
    }

    const { data, error } = await (supabase.rpc('get_student_attendance_summary', {
      p_student_id: studentId,
    } as unknown as Record<string, unknown>) as unknown as Promise<{ data: Array<{ total_sessions: number; present_count: number; absent_count: number; late_count: number; excused_count: number; percentage: number }> | null; error: Error | null }>);

    if (error || !data || data.length === 0) {
      return {
        total_sessions: 0,
        present_count: 0,
        absent_count: 0,
        late_count: 0,
        excused_count: 0,
        percentage: 0,
      };
    }

    return data[0];
  },
};
