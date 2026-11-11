import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface TeacherAssignmentItem {
  id: string;
  classId: string;
  className: string;
  subjectId?: string;
  subject: string;
  academicYear: string;
  active: boolean;
}

export const teacherService = {
  async getProfile() {
    if (!isSupabaseConfigured) {
      return { data: null, error: 'Database connection is not configured.' };
    }

    const { data: userResponse, error: userError } = await supabase.auth.getUser();
    if (userError || !userResponse.user) {
      return { data: null, error: userError?.message || 'User is not authenticated.' };
    }

    const { data, error } = await (supabase
      .from('teacher_profiles')
      .select(`
        id,
        faculty_id,
        designation,
        phone,
        department,
        qualification,
        status,
        profiles(full_name, email, phone, avatar_url)
      `)
      .eq('user_id', userResponse.user.id)
      .maybeSingle() as unknown as Promise<{ data: Record<string, unknown> | null; error: Error | null }>);

    if (error) {
      return { data: null, error: `Could not load teacher profile: ${error.message}` };
    }
    if (!data) {
      return { data: null, error: 'Teacher profile not found.' };
    }

    const profileData = data.profiles as { full_name?: string; email?: string; phone?: string; avatar_url?: string } | undefined;

    return {
      data: {
        id: data.id as string,
        name: profileData?.full_name || '',
        facultyId: (data.faculty_id as string) || '',
        department: (data.department as string) || '',
        designation: (data.designation as string) || '',
        phone: (data.phone as string) || profileData?.phone || '',
        qualification: (data.qualification as string) || '',
        avatarUrl: profileData?.avatar_url || (data.profile_photo as string) || '',
        email: profileData?.email || userResponse.user.email || '',
      },
      error: null,
    };
  },

  async updateProfile(updates: {
    name?: string;
    phone?: string;
    designation?: string;
    qualification?: string;
    avatarUrl?: string;
  }): Promise<{ success: boolean; error: string | null }> {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Database connection is not configured.' };
    }

    const { data: userResp, error: userError } = await supabase.auth.getUser();
    if (userError || !userResp.user) {
      return { success: false, error: userError?.message || 'User is not authenticated.' };
    }

    const userId = userResp.user.id;

    // 1. Update public.profiles
    const profileUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) profileUpdates.full_name = updates.name;
    if (updates.phone !== undefined) profileUpdates.phone = updates.phone;
    if (updates.avatarUrl !== undefined) profileUpdates.avatar_url = updates.avatarUrl;

    if (Object.keys(profileUpdates).length > 0) {
      const { data: updatedProfile, error: profErr } = await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', userId)
        .select('id')
        .maybeSingle();

      if (profErr) {
        return { success: false, error: `Failed to update profile: ${profErr.message}` };
      }
      if (!updatedProfile) {
        return { success: false, error: 'The account profile was not updated. Reload and try again.' };
      }
    }

    // 2. Update public.teacher_profiles
    const teacherUpdates: Record<string, unknown> = {};
    if (updates.designation !== undefined) teacherUpdates.designation = updates.designation;
    if (updates.qualification !== undefined) teacherUpdates.qualification = updates.qualification;

    if (Object.keys(teacherUpdates).length > 0) {
      const { data: updatedTeacher, error: teacherErr } = await supabase
        .from('teacher_profiles')
        .update(teacherUpdates)
        .eq('user_id', userId)
        .select('id')
        .maybeSingle();

      if (teacherErr) {
        return { success: false, error: `Failed to update teacher record: ${teacherErr.message}` };
      }
      if (!updatedTeacher) {
        return { success: false, error: 'The teacher profile was not updated. Reload and try again.' };
      }
    }

    return { success: true, error: null };
  },

  async getAssignments(): Promise<{ data: TeacherAssignmentItem[]; error: string | null }> {
    if (!isSupabaseConfigured) {
      return { data: [], error: 'Database connection is not configured.' };
    }

    const { data: userResponse, error: userError } = await supabase.auth.getUser();
    if (userError || !userResponse.user) {
      return { data: [], error: userError?.message || 'A signed-in teacher is required.' };
    }

    const { data: teacherProfile } = await supabase
      .from('teacher_profiles')
      .select('id')
      .eq('user_id', userResponse.user.id)
      .maybeSingle();

    // Live schema: teacher_assignments.teacher_id may reference teacher_profiles.id or auth profiles.id
    const teacherIds = [userResponse.user.id, teacherProfile?.id].filter(Boolean) as string[];
    const [{ data, error }, { data: directClasses }] = await Promise.all([
      supabase
        .from('teacher_assignments')
        .select(`
          id,
          class_id,
          subject,
          classes(id, name, academic_year, batch, department, section)
        `)
        .in('teacher_id', teacherIds) as unknown as Promise<{
        data: Array<Record<string, unknown>> | null;
        error: Error | null;
      }>,
      supabase
        .from('classes')
        .select('id, name, academic_year, batch, department, section')
        .in('teacher_id', teacherIds) as unknown as Promise<{
        data: Array<Record<string, unknown>> | null;
        error: Error | null;
      }>,
    ]);

    if (error) {
      console.warn('Could not load teacher assignments:', error.message);
    }

    const items: TeacherAssignmentItem[] = [];
    const seenClassIds = new Set<string>();

    (data || []).forEach((item) => {
      const cls = item.classes as { id: string; name: string; academic_year: string | null; batch?: string } | undefined;
      const classId = cls?.id || (item.class_id as string);
      const subject = (item.subject as string | null) || '';
      if (classId) {
        seenClassIds.add(classId);
        items.push({
          id: item.id as string,
          classId,
          className: cls?.name || 'Class',
          subjectId: subject,
          subject: subject || 'Subject',
          academicYear: cls?.academic_year || '',
          active: true,
        });
      }
    });

    (directClasses || []).forEach((cls) => {
      const classId = cls.id as string;
      if (classId && !seenClassIds.has(classId)) {
        seenClassIds.add(classId);
        items.push({
          id: `class-${classId}`,
          classId,
          className: (cls.name as string) || 'Class',
          subjectId: 'General',
          subject: 'General',
          academicYear: (cls.academic_year as string) || '',
          active: true,
        });
      }
    });

    return {
      data: items,
      error: null,
    };
  },

  async getDashboardMetrics() {
    const emptyMetrics = {
      assignedClasses: 0,
      assignedStudents: 0,
      todaysClasses: 0,
      attendancePending: 0,
      activeAssessments: 0,
      averageClassPerformance: 0,
      studentsAtRisk: 0,
    };

    if (!isSupabaseConfigured) {
      return emptyMetrics;
    }

    try {
      const todayDate = new Date().toISOString().split('T')[0];

      // Live schema: teacher_id columns reference profiles.id (the auth user id).
      const { data: userResp } = await supabase.auth.getUser();
      const teacherUserId: string | null = userResp?.user?.id || null;

      // 1. Assigned classes & class IDs
      let assignQuery = supabase
        .from('teacher_assignments')
        .select('class_id');
      if (teacherUserId) {
        assignQuery = assignQuery.eq('teacher_id', teacherUserId);
      }
      const { data: assignments } = await assignQuery;
      const assignedClassIds = Array.from(
        new Set((assignments || []).map((a) => a.class_id).filter(Boolean))
      );
      const assignedClasses = assignedClassIds.length;

      // 2. Assigned students count across assigned classes
      let assignedStudents = 0;
      if (assignedClassIds.length > 0) {
        const { count: studentCount } = await supabase
          .from('class_memberships')
          .select('student_id', { count: 'exact', head: true })
          .in('class_id', assignedClassIds);
        assignedStudents = studentCount ?? 0;
      } else {
        const { count: totalStudentCount } = await supabase
          .from('class_memberships')
          .select('student_id', { count: 'exact', head: true });
        assignedStudents = totalStudentCount ?? 0;
      }

      // 3. Today's classes count (from both class_sessions and live_classes)
      let sessionQuery = supabase
        .from('class_sessions')
        .select('id, class_id', { count: 'exact' })
        .eq('session_date', todayDate);
      if (teacherUserId) {
        sessionQuery = sessionQuery.eq('teacher_id', teacherUserId);
      }
      const { count: sessionCount, data: todaySessions } = await sessionQuery;

      let liveClassQuery = supabase
        .from('live_classes')
        .select('id, class_id', { count: 'exact' })
        .eq('scheduled_date', todayDate);
      if (teacherUserId) {
        liveClassQuery = liveClassQuery.eq('teacher_id', teacherUserId);
      }
      const { count: liveCount, data: todayLiveClasses } = await liveClassQuery;

      const todaysClasses = Math.max((sessionCount ?? 0) + (liveCount ?? 0), (todayLiveClasses || []).length);

      // 4. Attendance pending count (today's sessions/classes or assigned classes without attendance recorded today)
      const allClassIds = new Set<string>();
      (todaySessions || []).forEach((s) => { if (s.class_id) allClassIds.add(s.class_id); });
      (todayLiveClasses || []).forEach((lc) => { if (lc.class_id) allClassIds.add(lc.class_id); });
      assignedClassIds.forEach((cid) => allClassIds.add(cid));

      let attendancePending = 0;
      if (allClassIds.size > 0) {
        const classIdList = Array.from(allClassIds);
        const { data: recordedClasses } = await supabase
          .from('attendance_records')
          .select('class_id')
          .eq('date', todayDate)
          .in('class_id', classIdList);
        const recordedSet = new Set((recordedClasses || []).map((r: any) => r.class_id));
        attendancePending = classIdList.filter((cid) => !recordedSet.has(cid)).length;
      }

      // 5. Active assessments count
      let assessmentQuery = supabase
        .from('assessments')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active');
      if (assignedClassIds.length > 0) {
        assessmentQuery = assessmentQuery.in('class_id', assignedClassIds);
      }
      const { count: assessmentCount } = await assessmentQuery;
      const activeAssessments = assessmentCount ?? 0;

      // 6. Average class performance and students at risk from results
      const { data: resultsData } = await supabase
        .from('results')
        .select('percentage, status');

      let averageClassPerformance = 0;
      let studentsAtRisk = 0;

      if (resultsData && resultsData.length > 0) {
        const sum = resultsData.reduce((acc, curr) => acc + (Number(curr.percentage) || 0), 0);
        averageClassPerformance = Math.round(sum / resultsData.length);
        studentsAtRisk = resultsData.filter(
          (r) => String(r.status || '').toLowerCase().startsWith('fail') || Number(r.percentage) < 50
        ).length;
      }

      return {
        assignedClasses,
        assignedStudents,
        todaysClasses,
        attendancePending,
        activeAssessments,
        averageClassPerformance,
        studentsAtRisk,
      };
    } catch {
      return emptyMetrics;
    }
  },
};
