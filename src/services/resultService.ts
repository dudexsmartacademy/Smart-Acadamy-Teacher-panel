import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { studentService } from './studentService';
import {
  createScorecardSvg,
  type StudentAssessmentRecord,
  type StudentResultSummary,
  type TestType,
} from '../data/resultsData';

export interface StudentResultItem {
  id: string;
  studentId: string;
  studentName: string;
  rrn: string;
  rollNumber?: string | null;
  assessmentTitle: string;
  score: number;
  maxMarks: number;
  percentage: number;
  grade: string;
  status: string;
  submittedAt: string;
}


function resultStatus(item: Record<string, unknown>, passingMarks?: number | null): 'Passed' | 'Failed' {
  if (item.is_passed !== undefined && item.is_passed !== null) {
    return item.is_passed ? 'Passed' : 'Failed';
  }
  const status = String(item.status || '').toLowerCase();
  if (status.startsWith('pass')) return 'Passed';
  if (status.startsWith('fail')) return 'Failed';
  if (passingMarks != null) return Number(item.score) >= Number(passingMarks) ? 'Passed' : 'Failed';
  return Number(item.percentage) >= 50 ? 'Passed' : 'Failed';
}

export const resultService = {
  async getAssessmentResults(assessmentId?: string) {
    if (!isSupabaseConfigured) {
      return { data: [], error: 'Database connection is not configured.' };
    }

    try {
      let q = supabase
        .from('results')
        .select('*')
        .order('created_at', { ascending: false });

      if (assessmentId && assessmentId !== 'all') {
        q = q.eq('assessment_id', assessmentId);
      }

      const { data, error } = await q;
      if (error) return { data: [], error: error.message };

      const [{ data: allStudents }, { data: assessmentsList }] = await Promise.all([
        studentService.getAllStudentsWithMetrics(),
        supabase.from('assessments').select('id, title, type, max_marks, pass_percentage'),
      ]);

      const stuMap = new Map((allStudents || []).map((s) => [s.id, s]));
      const userMap = new Map((allStudents || []).map((s) => [s.userId, s]));
      const assMap = new Map((assessmentsList || []).map((a: any) => [a.id, a]));

      const formatted: StudentResultItem[] = (data || []).map((item: any) => {
        const stu = stuMap.get(item.student_id) || userMap.get(item.student_id);
        const ass = assMap.get(item.assessment_id);
        const studentName = stu?.name || item.student_name || 'Student';
        const registerNumber = stu?.rrn || item.student_id_code || (item.student_id as string)?.substring(0, 8) || 'RRN000';
        const score = Number(item.score ?? item.marks_obtained) || 0;
        const maxMarks = Number(item.max_marks ?? item.max_score ?? ass?.max_marks) || 100;
        const percentage = Number(item.percentage) || (maxMarks > 0 ? Math.round((score / maxMarks) * 100) : 0);

        return {
          id: item.id as string,
          studentId: (item.student_id as string) || '',
          studentName,
          rrn: registerNumber,
          rollNumber: stu?.rollNumber || (stu as any)?.rollNumber || null,
          assessmentTitle: ass?.title || item.assessment_title || 'Assessment',
          score,
          maxMarks,
          percentage,
          grade: item.grade || (percentage >= 80 ? 'A' : percentage >= 60 ? 'B' : 'C'),
          status: resultStatus(item, ass?.pass_percentage),
          submittedAt: item.created_at as string,
        };
      });

      return { data: formatted, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to query assessment results';
      return { data: [], error: msg };
    }
  },

  async getComprehensiveResults(): Promise<{ data: StudentResultSummary[]; error: string | null }> {
    if (!isSupabaseConfigured) {
      return { data: [], error: 'Database connection is not configured.' };
    }

    try {
      // 1. Fetch raw results directly without embedded joins
      const { data, error } = await supabase
        .from('results')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return { data: [], error: error.message };
      }

      // 2. Fetch assessments and student details separately
      const [{ data: allStudents }, { data: assessmentsList }] = await Promise.all([
        studentService.getAllStudentsWithMetrics(),
        supabase.from('assessments').select('id, title, type, duration_minutes, max_marks, created_at'),
      ]);

      const stuMap = new Map((allStudents || []).map((s) => [s.id, s]));
      const userMap = new Map((allStudents || []).map((s) => [s.userId, s]));
      const assMap = new Map((assessmentsList || []).map((a: any) => [a.id, a]));

      // Group records by student
      const studentAssessmentsMap = new Map<string, StudentAssessmentRecord[]>();
      const processedPairs = new Set<string>();

      (data || []).forEach((item: any) => {
        const stu = stuMap.get(item.student_id) || userMap.get(item.student_id);
        const ass = assMap.get(item.assessment_id);

        const studentName = stu?.name || item.student_name || 'Student';
        const rrn = stu?.rrn || item.student_id_code || (item.student_id ? String(item.student_id).substring(0, 8) : 'RRN000');
        const assessmentTitle = ass?.title || item.assessment_title || 'Assessment';
        const score = Number(item.score ?? item.marks_obtained) || 0;
        const totalMarks = Number(item.max_marks ?? item.max_score ?? ass?.max_marks) || 100;
        const percentage = Number(item.percentage) || (totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0);
        const grade = (item.grade as string) || (percentage >= 80 ? 'A' : percentage >= 60 ? 'B' : 'C');
        const submittedAt = item.created_at as string;
        const rawType = (ass?.type || item.type || '').toUpperCase();
        const testType: TestType = rawType.includes('CODE') || rawType === 'CODING' ? 'Coding' : 'MCQ';

        const record: StudentAssessmentRecord = {
          id: item.id as string,
          testTitle: assessmentTitle,
          type: testType,
          date: submittedAt ? new Date(submittedAt).toLocaleDateString() : new Date().toLocaleDateString(),
          score,
          maxMarks: totalMarks,
          percentage,
          grade,
          description: assessmentTitle,
          duration: ass?.duration_minutes ? `${ass.duration_minutes} mins` : undefined,
          studentEnteredMarks: score,
          resultScreenshotUrl: createScorecardSvg(
            assessmentTitle,
            studentName,
            rrn,
            score,
            totalMarks,
            testType,
            submittedAt ? new Date(submittedAt).toLocaleDateString() : new Date().toLocaleDateString(),
            percentage
          ),
          verificationStatus: 'Verified',
          submittedAt,
        };

        const sId = (item.student_id as string) || (stu?.id as string) || 'student';
        if (!studentAssessmentsMap.has(sId)) {
          studentAssessmentsMap.set(sId, []);
        }
        studentAssessmentsMap.get(sId)!.push(record);
        if (item.student_id && item.assessment_id) {
          processedPairs.add(`${item.student_id}::${item.assessment_id}`);
        }
      });

      const summaries: StudentResultSummary[] = (data || []).map((item: any) => {
        const stu = stuMap.get(item.student_id) || userMap.get(item.student_id);
        const ass = assMap.get(item.assessment_id);

        const studentName = stu?.name || item.student_name || 'Student';
        const rrn = stu?.rrn || item.student_id_code || (item.student_id ? String(item.student_id).substring(0, 8) : 'RRN000');
        const rollNumber = stu?.rollNumber || (stu as any)?.rollNumber || '';
        // Use clean batch name ("Batch 1") rather than class name
        const rawBatch = stu?.batchName || item.batch_name || '';
        const batchName = rawBatch && !rawBatch.includes(' - ') ? rawBatch : (stu?.batchName || 'Batch 1');
        const deptName = stu?.department || item.course_name || 'Computer Science';
        const sectionName = stu?.section || 'A';
        const assessmentTitle = ass?.title || item.assessment_title || 'Assessment';
        const score = Number(item.score ?? item.marks_obtained) || 0;
        const totalMarks = Number(item.max_marks ?? item.max_score ?? ass?.max_marks) || 100;
        const percentage = Number(item.percentage) || (totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0);
        const grade = (item.grade as string) || (percentage >= 80 ? 'A' : percentage >= 60 ? 'B' : 'C');
        const submittedAt = item.created_at as string;
        const sId = (item.student_id as string) || (stu?.id as string) || 'student';
        const allStudentAssessments = studentAssessmentsMap.get(sId) || [];

        return {
          id: item.id as string,
          studentId: sId,
          student: studentName,
          rrn,
          rollNumber,
          batch: batchName,
          department: deptName,
          section: sectionName,
          assessment: assessmentTitle,
          attempt: 1,
          score,
          totalMarks,
          percentage,
          grade,
          submittedAt,
          status: 'Submitted',
          cohortPlacementIndex: 1,
          cohortPlacementGrade: grade,
          highestSingleScore: `${score}/${totalMarks}`,
          evaluationsCompletedCount: allStudentAssessments.length,
          completedAssessments: allStudentAssessments,
        };
      });

      // 3. Merge submissions from external_assessment_submissions (HackerRank challenges)
      try {
        const { data: extSubs } = await supabase
          .from('external_assessment_submissions')
          .select('*')
          .order('submitted_at', { ascending: false });

        const paths = (extSubs || []).map((s: any) => s.screenshot_path as string).filter(Boolean);
        const signedMap = new Map<string, string>();
        if (paths.length > 0) {
          try {
            const { data: signedData } = await supabase.storage
              .from('hackerrank-results')
              .createSignedUrls(paths, 3600);
            (signedData || []).forEach((item: any) => {
              if (item.path && item.signedUrl) signedMap.set(item.path, item.signedUrl);
            });
          } catch (e) {
            console.warn('Could not generate signed URLs for screenshots:', e);
          }
        }

        (extSubs || []).forEach((sub: any) => {
          const pairKey = `${sub.student_id}::${sub.assessment_id}`;
          if (processedPairs.has(pairKey)) return;
          processedPairs.add(pairKey);

          const stu = stuMap.get(sub.student_id) || userMap.get(sub.student_id);
          const ass = assMap.get(sub.assessment_id);
          const studentName = stu?.name || 'Student';
          const rrn = stu?.rrn || (sub.student_id ? String(sub.student_id).substring(0, 8) : 'RRN000');
          const rollNumber = stu?.rollNumber || (stu as any)?.rollNumber || '';
          const batchName = stu?.batchName || 'Batch 1';
          const deptName = stu?.department || 'Computer Science';
          const sectionName = stu?.section || 'A';
          const assessmentTitle = ass?.title || 'HackerRank Challenge';
          const score = Number(sub.verified_score ?? sub.reported_score) || 0;
          const totalMarks = Number(ass?.max_marks) || 100;
          const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;
          const grade = percentage >= 85 ? 'A+' : percentage >= 75 ? 'A' : percentage >= 60 ? 'B' : 'C';
          const submittedAt = sub.submitted_at || sub.created_at || new Date().toISOString();
          const sId = (sub.student_id as string) || (stu?.id as string) || 'student';

          const record: StudentAssessmentRecord = {
            id: sub.id as string,
            testTitle: assessmentTitle,
            type: 'Coding',
            date: submittedAt ? new Date(submittedAt).toLocaleDateString() : new Date().toLocaleDateString(),
            score,
            maxMarks: totalMarks,
            percentage,
            grade,
            description: assessmentTitle,
            duration: ass?.duration_minutes ? `${ass.duration_minutes} mins` : undefined,
            studentEnteredMarks: score,
            resultScreenshotUrl: (sub.screenshot_path && signedMap.get(sub.screenshot_path)) || createScorecardSvg(
              assessmentTitle,
              studentName,
              rrn,
              score,
              totalMarks,
              'Coding',
              submittedAt ? new Date(submittedAt).toLocaleDateString() : new Date().toLocaleDateString(),
              percentage
            ),
            verificationStatus: sub.status === 'Verified' ? 'Verified' : 'Pending',
            submittedAt,
          };

          if (!studentAssessmentsMap.has(sId)) {
            studentAssessmentsMap.set(sId, []);
          }
          studentAssessmentsMap.get(sId)!.push(record);

          summaries.push({
            id: sub.id as string,
            studentId: sId,
            student: studentName,
            rrn,
            rollNumber,
            batch: batchName,
            department: deptName,
            section: sectionName,
            assessment: assessmentTitle,
            attempt: 1,
            score,
            totalMarks,
            percentage,
            grade,
            submittedAt,
            status: 'Submitted',
            cohortPlacementIndex: 1,
            cohortPlacementGrade: grade,
            highestSingleScore: `${score}/${totalMarks}`,
            evaluationsCompletedCount: 1,
            completedAssessments: [record],
          });
        });
      } catch (extErr) {
        console.warn('Could not merge external submissions:', extErr);
      }

      // 4. Merge student_attempts (MCQ tests)
      try {
        const { data: mcqAttempts } = await supabase
          .from('student_attempts')
          .select('*')
          .order('submitted_at', { ascending: false });

        (mcqAttempts || []).forEach((att: any) => {
          const pairKey = `${att.student_id}::${att.assessment_id}`;
          if (processedPairs.has(pairKey)) return;
          processedPairs.add(pairKey);

          const stu = stuMap.get(att.student_id) || userMap.get(att.student_id);
          const ass = assMap.get(att.assessment_id);
          const studentName = stu?.name || 'Student';
          const rrn = stu?.rrn || (att.student_id ? String(att.student_id).substring(0, 8) : 'RRN000');
          const rollNumber = stu?.rollNumber || (stu as any)?.rollNumber || '';
          const batchName = stu?.batchName || 'Batch 1';
          const deptName = stu?.department || 'Computer Science';
          const sectionName = stu?.section || 'A';
          const assessmentTitle = ass?.title || 'MCQ Assessment';
          const score = Number(att.score) || 0;
          const totalMarks = Number(att.max_score || ass?.max_marks) || 100;
          const percentage = Number(att.percentage) || (totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0);
          const grade = percentage >= 85 ? 'A+' : percentage >= 75 ? 'A' : percentage >= 60 ? 'B' : 'C';
          const submittedAt = att.submitted_at || att.created_at || new Date().toISOString();
          const sId = (att.student_id as string) || (stu?.id as string) || 'student';

          const record: StudentAssessmentRecord = {
            id: att.id as string,
            testTitle: assessmentTitle,
            type: 'MCQ',
            date: submittedAt ? new Date(submittedAt).toLocaleDateString() : new Date().toLocaleDateString(),
            score,
            maxMarks: totalMarks,
            percentage,
            grade,
            description: assessmentTitle,
            duration: ass?.duration_minutes ? `${ass.duration_minutes} mins` : undefined,
            studentEnteredMarks: score,
            resultScreenshotUrl: createScorecardSvg(
              assessmentTitle,
              studentName,
              rrn,
              score,
              totalMarks,
              'MCQ',
              submittedAt ? new Date(submittedAt).toLocaleDateString() : new Date().toLocaleDateString(),
              percentage
            ),
            verificationStatus: 'Verified',
            submittedAt,
          };

          if (!studentAssessmentsMap.has(sId)) {
            studentAssessmentsMap.set(sId, []);
          }
          studentAssessmentsMap.get(sId)!.push(record);

          summaries.push({
            id: att.id as string,
            studentId: sId,
            student: studentName,
            rrn,
            rollNumber,
            batch: batchName,
            department: deptName,
            section: sectionName,
            assessment: assessmentTitle,
            attempt: 1,
            score,
            totalMarks,
            percentage,
            grade,
            submittedAt,
            status: 'Submitted',
            cohortPlacementIndex: 1,
            cohortPlacementGrade: grade,
            highestSingleScore: `${score}/${totalMarks}`,
            evaluationsCompletedCount: 1,
            completedAssessments: [record],
          });
        });
      } catch (attErr) {
        console.warn('Could not merge mcq attempts:', attErr);
      }

      return { data: summaries, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to query comprehensive results';
      return { data: [], error: msg };
    }
  },

  async getResultStatistics(results: StudentResultItem[]) {
    if (results.length === 0) {
      return {
        completed: 0,
        averagePercentage: 0,
        highestScore: 0,
        lowestScore: 0,
        passRate: 0,
      };
    }

    const completed = results.length;
    const scores = results.map(r => r.score);
    const percentages = results.map(r => r.percentage);
    const passed = results.filter(r => r.status === 'Passed').length;

    const avg = percentages.reduce((a, b) => a + b, 0) / completed;
    const highest = Math.max(...scores);
    const lowest = Math.min(...scores);
    const passRate = Math.round((passed / completed) * 100);

    return {
      completed,
      averagePercentage: Math.round(avg * 10) / 10,
      highestScore: highest,
      lowestScore: lowest,
      passRate,
    };
  },
};
