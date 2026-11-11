import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface StudentListItem {
  id: string;
  name: string;
  rrn: string;
  rollNumber?: string | null;
  email: string;
  phone?: string | null;
  classId: string;
  className: string;
  attendancePercentage: number;
  performanceScore: number;
  status: string;
}

export const studentService = {
  async getStudentsByClass(classId?: string): Promise<{ data: StudentListItem[]; error: string | null }> {
    const { data: allWithMetrics, error } = await this.getAllStudentsWithMetrics();
    if (error) return { data: [], error };

    let filtered = allWithMetrics;
    if (classId && classId !== 'all') {
      const match = allWithMetrics.filter((s) => s.classId === classId);
      if (match.length > 0) {
        filtered = match;
      }
    }

    const students: StudentListItem[] = filtered.map((s) => ({
      id: s.id,
      name: s.name,
      rrn: s.rrn,
      rollNumber: (s as any).rollNumber || null,
      email: (s as any).email || '',
      phone: (s as any).phone || null,
      classId: s.classId,
      className: s.className,
      attendancePercentage: s.attendance,
      performanceScore: s.averageMark,
      status: s.status,
    }));

    return { data: students, error: null };
  },

  async getStudentById(studentId: string) {
    if (!isSupabaseConfigured) {
      return { data: null, error: 'Database connection is not configured.' };
    }

    const { data, error } = await (supabase
      .from('student_profiles')
      .select(`
        id,
        roll_number,
        admission_number,
        dob,
        gender,
        guardian_name,
        guardian_phone,
        department,
        section,
        status,
        profiles(full_name, email, phone)
      `)
      .eq('id', studentId)
      .maybeSingle() as unknown as Promise<{ data: Record<string, unknown> | null; error: Error | null }>);

    if (error || !data) {
      return { data: null, error: error?.message || 'Student not found' };
    }

    const prof = data.profiles as { full_name: string; email: string; phone: string | null } | undefined;

    return {
      data: {
        id: data.id as string,
        name: prof?.full_name || 'Student',
        rrn: (data.roll_number as string) || (data.admission_number as string) || 'STU',
        rollNumber: (data.roll_number as string) || null,
        email: prof?.email || '',
        phone: prof?.phone,
        department: (data.department as string) || '',
        batch: (data.section as string) || '',
        gender: (data.gender as string) || null,
        guardianName: (data.guardian_name as string) || null,
        guardianPhone: (data.guardian_phone as string) || null,
        status: (data.status as string) || 'active',
      },
      error: null,
    };
  },

  async getAllStudentsWithMetrics() {
    if (!isSupabaseConfigured) {
      return { data: [], error: 'Database connection is not configured.' };
    }

    try {
      // 1. Fetch attendance records
      const { data: attData } = await (supabase
        .from('attendance_records')
        .select('student_id, status') as unknown as Promise<{ data: Array<{ student_id: string; status: string }> | null; error: Error | null }>);

      const attMap: Record<string, { total: number; present: number }> = {};
      (attData || []).forEach((a) => {
        if (!attMap[a.student_id]) attMap[a.student_id] = { total: 0, present: 0 };
        attMap[a.student_id].total += 1;
        if (String(a.status).toLowerCase() === 'present') attMap[a.student_id].present += 1;
      });

      // 2. Fetch results
      const { data: resData } = await (supabase
        .from('results')
        .select('student_id, percentage, grade') as unknown as Promise<{ data: Array<{ student_id: string; percentage: number; grade: string }> | null; error: Error | null }>);

      const resMap: Record<string, { totalPct: number; count: number; grade: string }> = {};
      (resData || []).forEach((r) => {
        if (!resMap[r.student_id]) resMap[r.student_id] = { totalPct: 0, count: 0, grade: r.grade || 'B' };
        resMap[r.student_id].totalPct += Number(r.percentage) || 0;
        resMap[r.student_id].count += 1;
        resMap[r.student_id].grade = r.grade || resMap[r.student_id].grade;
      });

      // 3. Primary Source: Fetch all student_profiles
      const { data: rawStudents, error: stuErr } = await (supabase
        .from('student_profiles')
        .select(`
          id,
          user_id,
          register_number,
          roll_number,
          admission_number,
          college_name,
          batch_name,
          department,
          section,
          status,
          profiles(full_name, email, phone)
        `) as unknown as Promise<{ data: Array<Record<string, unknown>> | null; error: Error | null }>);

      if (stuErr) {
        return { data: [], error: stuErr.message };
      }

      // 4. Fetch class memberships to enrich class names
      const { data: memberships } = await (supabase
        .from('class_memberships')
        .select(`
          id,
          student_id,
          class_id,
          classes(id, name)
        `) as unknown as Promise<{ data: Array<Record<string, unknown>> | null; error: Error | null }>);

      const memMap: Record<string, { classId: string; className: string }> = {};
      (memberships || []).forEach((m: any) => {
        if (m.student_id) {
          memMap[m.student_id] = {
            classId: m.class_id,
            className: m.classes?.name || 'Assigned Class',
          };
        }
      });

      const formatted = (rawStudents || []).map((sp) => {
        const prof = sp.profiles as { full_name?: string; email?: string; phone?: string } | undefined;
        const sId = sp.id as string;
        // Live schema: attendance, results and memberships key students by
        // profiles.id, which is student_profiles.user_id.
        const userId = (sp.user_id as string) || sId;
        const attStats = attMap[sId] || attMap[userId];
        const attPct = attStats && attStats.total > 0 ? Math.round((attStats.present / attStats.total) * 100) : 0;

        const rStats = resMap[sId] || resMap[userId];
        const avgMark = rStats && rStats.count > 0 ? Math.round(rStats.totalPct / rStats.count) : 0;
        let grade = rStats?.grade || '';
        if (!grade && avgMark > 0) {
          grade = avgMark >= 90 ? 'A+' : avgMark >= 80 ? 'A' : avgMark >= 70 ? 'B+' : avgMark >= 60 ? 'B' : avgMark >= 50 ? 'C' : 'D';
        }

        const mem = memMap[sId] || memMap[userId];

        return {
          id: sId,
          userId,
          name: prof?.full_name || 'Student',
          rrn: (sp.register_number as string) || (sp.roll_number as string) || (sp.admission_number as string) || 'STU',
          college: (sp.college_name as string) || '',
          department: (sp.department as string) || 'Computer Science',
          section: (sp.section as string) || 'A',
          rollNumber: (sp.roll_number as string) || null,
          email: prof?.email || '',
          phone: prof?.phone || null,
          classId: mem?.classId || 'all',
          className: mem?.className || 'General Batch',
          /** Global batch ("Batch 3"); attendance, notes and live classes target batches. */
          batchName: (sp.batch_name as string) || '',
          attendance: attPct,
          averageMark: avgMark,
          grade: grade || 'N/A',
          assessmentCompletion: rStats && rStats.count > 0 ? 100 : 0,
          status: (sp.status as string) === 'active' ? 'Active' : (sp.status as string) || 'Active',
        };
      });

      return { data: formatted, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to query student metrics';
      return { data: [], error: msg };
    }
  },
};
