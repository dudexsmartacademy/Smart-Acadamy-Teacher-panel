import { supabase } from '../lib/supabase';
import type { AssessmentType, HackerRankChallenge } from '../pages/hackerrank/HackerRankAssessments';

// HackerRank challenges are `assessments` rows with provider = 'hackerrank'.
// Students self-report their HackerRank score with a screenshot
// (external_assessment_submissions); the owning teacher verifies it, which
// publishes the verified marks to `results`.

export interface HackerRankSubmission {
  id: string;
  studentId: string;
  student: string;
  rrn: string;
  reportedScore: number;
  screenshotUrl: string | null;
  status: 'Pending' | 'Verified' | 'Rejected';
  verifiedScore: number | null;
  reviewNote: string;
  submittedAt: string;
}

const TYPE_TO_DB: Record<AssessmentType, string> = { Coding: 'Coding', MCQ: 'MCQ', 'Coding + MCQ': 'Hybrid' };
const DB_TO_TYPE: Record<string, AssessmentType> = { Coding: 'Coding', MCQ: 'MCQ', Hybrid: 'Coding + MCQ' };

function statusFor(start: string | null, end: string | null, dbStatus: string): HackerRankChallenge['status'] {
  const now = Date.now();
  if (['closed', 'completed', 'archived'].includes(dbStatus)) return 'Completed';
  if (end && now > new Date(end).getTime()) return 'Completed';
  if (start && now < new Date(start).getTime()) return 'Upcoming';
  return 'Active';
}

// The page uses 12-hour times ("10:00 AM") and durations like "60 Mins".
function to24h(time: string): string {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i.exec((time || '').trim());
  if (!m) return '09:00';
  let h = Number(m[1]);
  if (m[3]) {
    h = h % 12;
    if (m[3].toUpperCase() === 'PM') h += 12;
  }
  return `${String(h).padStart(2, '0')}:${m[2]}`;
}

function to12h(h: number, min: number): string {
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')} ${suffix}`;
}

function toTimestamp(date: string, time: string): string {
  const d = new Date(`${date}T${to24h(time)}:00`);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('A signed-in teacher is required.');
  return data.user.id;
}

export const hackerrankService = {
  async list(): Promise<HackerRankChallenge[]> {
    const uid = await requireUserId();
    const { data, error } = await supabase
      .from('assessments')
      .select('id, title, type, description, external_url, start_date, end_date, duration_minutes, target_batch, status, created_at')
      .eq('provider', 'hackerrank')
      .or(`teacher_id.eq.${uid},created_by.eq.${uid}`)
      .neq('status', 'archived')
      .order('start_date', { ascending: false });
    if (error) throw new Error(`Could not load HackerRank assessments: ${error.message}`);
    return (data || []).map((row) => {
      const start = row.start_date ? new Date(row.start_date) : null;
      const pad = (n: number) => String(n).padStart(2, '0');
      return {
        id: row.id,
        title: row.title || '',
        type: DB_TO_TYPE[row.type as string] || 'Coding',
        date: start ? `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}` : '',
        startTime: start ? to12h(start.getHours(), start.getMinutes()) : '',
        duration: `${row.duration_minutes || 60} Mins`,
        url: row.external_url || '',
        batch: row.target_batch || 'All Batches',
        description: row.description || '',
        createdAt: row.created_at || '',
        status: statusFor(row.start_date, row.end_date, String(row.status || '').toLowerCase()),
      };
    });
  },

  async save(
    challenge: Omit<HackerRankChallenge, 'id' | 'createdAt' | 'status'> & { id?: string },
    batches: string[],
  ): Promise<void> {
    const uid = await requireUserId();
    const duration = parseInt(challenge.duration, 10) || 60;
    const startIso = toTimestamp(challenge.date, challenge.startTime);
    const endIso = new Date(new Date(startIso).getTime() + duration * 60000).toISOString();
    const row = {
      title: challenge.title,
      type: TYPE_TO_DB[challenge.type],
      provider: 'hackerrank',
      external_url: challenge.url,
      description: challenge.description || null,
      duration_minutes: duration,
      start_date: startIso,
      end_date: endIso,
      start_time: to24h(challenge.startTime),
      target_batch: challenge.batch || 'All Batches',
      class_id: null,
      batches,
      max_marks: 100,
      total_marks: 100,
      status: 'scheduled',
      published: true,
      teacher_id: uid,
      created_by: uid,
    };
    const { data, error } = challenge.id
      ? await supabase.from('assessments').update(row).eq('id', challenge.id).select('id')
      : await supabase.from('assessments').insert(row).select('id');
    if (error) throw new Error(`Could not save the HackerRank assessment: ${error.message}`);
    if (!data || data.length === 0) throw new Error('The HackerRank assessment was not saved (not found or not permitted).');
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('assessments').update({ status: 'archived', published: false }).eq('id', id);
    if (error) throw new Error(`Could not delete the HackerRank assessment: ${error.message}`);
  },

  async getSubmissions(assessmentId: string): Promise<HackerRankSubmission[]> {
    const { data, error } = await supabase
      .from('external_assessment_submissions')
      .select('id, student_id, reported_score, screenshot_path, status, verified_score, review_note, submitted_at, profiles(full_name)')
      .eq('assessment_id', assessmentId)
      .order('submitted_at', { ascending: false });
    if (error) throw new Error(`Could not load submissions: ${error.message}`);

    const rows = (data || []) as Array<Record<string, unknown>>;
    const paths = rows.map((r) => r.screenshot_path as string).filter(Boolean);
    const { data: signed } = paths.length
      ? await supabase.storage.from('hackerrank-results').createSignedUrls(paths, 60 * 60)
      : { data: [] as Array<{ path: string | null; signedUrl: string }> };
    const urlOf = new Map((signed || []).map((s) => [s.path, s.signedUrl]));

    const ids = [...new Set(rows.map((r) => r.student_id as string))];
    const { data: sps } = ids.length
      ? await supabase.from('student_profiles').select('user_id, register_number, roll_number').in('user_id', ids)
      : { data: [] as Array<{ user_id: string; register_number: string | null; roll_number: string | null }> };
    const rrnOf = new Map((sps || []).map((s) => [s.user_id, s.register_number || s.roll_number || '']));

    return rows.map((r) => ({
      id: r.id as string,
      studentId: r.student_id as string,
      student: ((r.profiles as { full_name?: string } | null)?.full_name) || 'Student',
      rrn: rrnOf.get(r.student_id as string) || '',
      reportedScore: Number(r.reported_score) || 0,
      screenshotUrl: urlOf.get(r.screenshot_path as string) || null,
      status: (r.status as HackerRankSubmission['status']) || 'Pending',
      verifiedScore: r.verified_score === null || r.verified_score === undefined ? null : Number(r.verified_score),
      reviewNote: (r.review_note as string) || '',
      submittedAt: (r.submitted_at as string) || '',
    }));
  },

  /** Verifies a self-reported score and publishes it to the student's results. */
  async verify(challenge: HackerRankChallenge, submission: HackerRankSubmission, score: number, note: string): Promise<void> {
    const uid = await requireUserId();
    const pct = Math.max(0, Math.min(100, score));
    const { error } = await supabase
      .from('external_assessment_submissions')
      .update({ status: 'Verified', verified_score: pct, review_note: note || null, reviewed_by: uid, reviewed_at: new Date().toISOString() })
      .eq('id', submission.id);
    if (error) throw new Error(`Could not verify: ${error.message}`);

    const passed = pct >= 40;
    const grade = pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B+' : pct >= 60 ? 'B' : pct >= 50 ? 'C' : pct >= 40 ? 'D' : 'F';
    const resultRow = {
      assessment_id: challenge.id,
      student_id: submission.studentId,
      assessment_title: challenge.title,
      type: challenge.type === 'MCQ' ? 'MCQ' : 'Coding',
      subject: 'HackerRank',
      score: Math.round(pct),
      max_score: 100,
      marks_obtained: pct,
      max_marks: 100,
      percentage: pct,
      grade,
      status: passed ? 'Passed' : 'Failed',
      result_status: passed ? 'Passed' : 'Failed',
      student_name: submission.student,
      student_id_code: submission.rrn || null,
      feedback: note || null,
    };
    const { data: existing } = await supabase
      .from('results')
      .select('id')
      .eq('assessment_id', challenge.id)
      .eq('student_id', submission.studentId)
      .maybeSingle();
    const { error: resultError } = existing
      ? await supabase.from('results').update(resultRow).eq('id', existing.id)
      : await supabase.from('results').insert(resultRow);
    if (resultError) throw new Error(`Verified, but the result could not be published: ${resultError.message}`);
  },

  async reject(submission: HackerRankSubmission, note: string): Promise<void> {
    const uid = await requireUserId();
    const { error } = await supabase
      .from('external_assessment_submissions')
      .update({ status: 'Rejected', review_note: note || null, reviewed_by: uid, reviewed_at: new Date().toISOString() })
      .eq('id', submission.id);
    if (error) throw new Error(`Could not reject: ${error.message}`);
  },
};
