import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { CodingAssessment } from '../pages/coding/Coding';

// Coding assessments are `assessments` rows with type 'Coding' plus one
// `coding_problems` row. Students read them through the student_coding_problems
// view (no hidden test cases) and submit into `code_submissions`; the teacher
// reviews submissions and publishes a score into `results`.

type TestCase = { id: number; input: string; output: string };

export interface CodingAssessmentInput {
  title: string;
  /** Global batches whose students take the assessment. */
  batches: string[];
  subject: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  marks: number;
  /** Per-test execution limit in seconds (shown in the statement). */
  timeLimit: number;
  /** How long students have once the assessment opens. */
  durationMinutes: number;
  start: string;
  end: string;
  problemStatement: string;
  description: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  examples: string;
  memoryLimit: string;
  allowedLanguages: string[];
  visibleTestCases: TestCase[];
  hiddenTestCases: TestCase[];
}

export interface CodingSubmission {
  id: string;
  studentId: string;
  student: string;
  rrn: string;
  language: string;
  sourceCode: string;
  submittedAt: string;
  status: string;
  score: number;
  feedback: string;
}

export interface CodingResultRow {
  id: string;
  student: string;
  rrn: string;
  score: number;
  totalMarks: number;
  percentage: number;
  grade: string;
  status: 'Passed' | 'Failed';
  submittedAt: string;
  feedback: string;
}

const gradeFor = (pct: number) =>
  pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B+' : pct >= 60 ? 'B' : pct >= 50 ? 'C' : pct >= 40 ? 'D' : 'F';

function toUiStatus(dbStatus: string, start?: string | null, end?: string | null): CodingAssessment['status'] {
  const s = dbStatus.toLowerCase();
  if (s === 'draft') return 'Draft';
  if (s === 'closed' || s === 'completed' || s === 'archived') return 'Completed';
  const now = Date.now();
  if (end && now > new Date(end).getTime()) return 'Completed';
  if (start && now < new Date(start).getTime()) return 'Scheduled';
  return 'Live';
}

function rowToAssessment(row: Record<string, unknown>): CodingAssessment {
  const problems = (row.coding_problems as Array<Record<string, unknown>> | null) || [];
  const p = problems[0] || {};
  const tests = (p.test_cases as TestCase[] | null) || [];
  const examples = (p.public_examples as TestCase[] | null) || [];
  const start = (row.start_date as string | null) || '';
  const end = (row.end_date as string | null) || '';
  return {
    id: row.id as string,
    title: (row.title as string) || '',
    subject: (row.subject as string) || '',
    className: ((row.classes as { name?: string } | null)?.name) || '',
    difficulty: (['Easy', 'Medium', 'Hard'].includes(p.difficulty as string) ? p.difficulty : 'Medium') as CodingAssessment['difficulty'],
    marks: Number(row.max_marks) || Number(p.marks) || 0,
    timeLimit: Number(row.duration_minutes) || 0,
    start: start ? start.split('T')[0] : '',
    end: end ? end.split('T')[0] : '',
    status: toUiStatus(String(row.status || ''), start, end),
    problemStatement: (p.description as string) || '',
    description: (row.description as string) || '',
    allowedLanguages: p.language ? [p.language as string] : [],
    visibleTestCases: examples,
    hiddenTestCases: tests.filter((t) => !examples.some((e) => e.input === t.input && e.output === t.output)),
  };
}

async function requireUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('A signed-in teacher is required.');
  return data.user;
}

export const codingAssessmentService = {
  async list(): Promise<CodingAssessment[]> {
    if (!isSupabaseConfigured) return [];
    const user = await requireUser();
    const { data, error } = await (supabase
      .from('assessments')
      .select('id, title, subject, description, max_marks, duration_minutes, start_date, end_date, status, classes(name), coding_problems(id, description, difficulty, language, marks, test_cases, public_examples)')
      .eq('type', 'Coding')
      .eq('teacher_id', user.id)
      .neq('status', 'archived')
      .order('created_at', { ascending: false }) as unknown as Promise<{ data: Array<Record<string, unknown>> | null; error: Error | null }>);
    if (error) throw new Error(`Could not load coding assessments: ${error.message}`);
    return (data || []).map(rowToAssessment);
  },

  async getById(id: string): Promise<CodingAssessment | null> {
    const { data, error } = await (supabase
      .from('assessments')
      .select('id, title, subject, description, max_marks, duration_minutes, start_date, end_date, status, classes(name), coding_problems(id, description, difficulty, language, marks, test_cases, public_examples)')
      .eq('id', id)
      .maybeSingle() as unknown as Promise<{ data: Record<string, unknown> | null; error: Error | null }>);
    if (error) throw new Error(`Could not load the coding assessment: ${error.message}`);
    return data ? rowToAssessment(data) : null;
  },

  async create(input: CodingAssessmentInput): Promise<string> {
    const user = await requireUser();
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();

    const statement = [
      input.problemStatement,
      input.inputFormat && `Input format:\n${input.inputFormat}`,
      input.outputFormat && `Output format:\n${input.outputFormat}`,
      input.constraints && `Constraints:\n${input.constraints}`,
      input.examples && `Examples:\n${input.examples}`,
      input.timeLimit && `Time limit: ${input.timeLimit} s per test`,
      input.memoryLimit && `Memory limit: ${input.memoryLimit} MB`,
    ].filter(Boolean).join('\n\n');

    const { data: assessment, error } = await (supabase
      .from('assessments')
      .insert({
        title: input.title,
        type: 'Coding',
        class_id: null,
        batches: input.batches,
        subject: input.subject,
        description: input.description || null,
        duration_minutes: input.durationMinutes,
        total_questions: 1,
        max_marks: input.marks,
        total_marks: input.marks,
        passing_marks: Math.ceil(input.marks * 0.4),
        start_date: input.start ? new Date(input.start).toISOString() : null,
        end_date: input.end ? new Date(input.end).toISOString() : null,
        status: 'scheduled',
        published: true,
        teacher_id: user.id,
        teacher_name: (profile?.full_name as string) || null,
        created_by: user.id,
      })
      .select('id')
      .single() as unknown as Promise<{ data: { id: string } | null; error: Error | null }>);
    if (error || !assessment) throw new Error(`Could not create the coding assessment: ${error?.message}`);

    const { error: problemError } = await supabase.from('coding_problems').insert({
      assessment_id: assessment.id,
      title: input.title,
      description: statement,
      difficulty: input.difficulty,
      language: (input.allowedLanguages[0] || 'Python').toLowerCase(),
      starter_code: null,
      // Hidden + visible tests are stored server-side; students only see the
      // public examples through student_coding_problems.
      test_cases: [...input.visibleTestCases, ...input.hiddenTestCases],
      public_examples: input.visibleTestCases,
      marks: input.marks,
    });
    if (problemError) {
      await supabase.from('assessments').delete().eq('id', assessment.id);
      throw new Error(`Could not save the coding problem: ${problemError.message}`);
    }
    return assessment.id;
  },

  async archive(id: string): Promise<void> {
    const { error } = await supabase.from('assessments').update({ status: 'archived', published: false }).eq('id', id);
    if (error) throw new Error(`Could not delete the coding assessment: ${error.message}`);
  },

  async getSubmissions(assessmentId: string): Promise<CodingSubmission[]> {
    const { data, error } = await (supabase
      .from('code_submissions')
      .select('id, student_id, language, source_code, submitted_at, status, score, feedback, profiles(full_name)')
      .eq('assessment_id', assessmentId)
      .order('submitted_at', { ascending: false }) as unknown as Promise<{ data: Array<Record<string, unknown>> | null; error: Error | null }>);
    if (error) throw new Error(`Could not load submissions: ${error.message}`);
    const ids = [...new Set((data || []).map((r) => r.student_id as string))];
    const { data: sps } = ids.length
      ? await supabase.from('student_profiles').select('user_id, register_number, roll_number').in('user_id', ids)
      : { data: [] as Array<{ user_id: string; register_number: string | null; roll_number: string | null }> };
    const rrnOf = new Map((sps || []).map((s) => [s.user_id, s.register_number || s.roll_number || '']));
    return (data || []).map((r) => ({
      id: r.id as string,
      studentId: r.student_id as string,
      student: ((r.profiles as { full_name?: string } | null)?.full_name) || 'Student',
      rrn: rrnOf.get(r.student_id as string) || '',
      language: (r.language as string) || '',
      sourceCode: (r.source_code as string) || '',
      submittedAt: (r.submitted_at as string) || '',
      status: (r.status as string) || 'submitted',
      score: Number(r.score) || 0,
      feedback: (r.feedback as string) || '',
    }));
  },

  /** Teacher review: stores the score on the submission and publishes it to results. */
  async gradeSubmission(assessment: CodingAssessment, submission: CodingSubmission, score: number, feedback: string): Promise<void> {
    const maxMarks = assessment.marks || 100;
    const clamped = Math.max(0, Math.min(score, maxMarks));
    const pct = Math.round((clamped / maxMarks) * 10000) / 100;
    const passed = pct >= 40;

    const { error } = await supabase
      .from('code_submissions')
      .update({ score: clamped, status: 'evaluated', feedback: feedback || null })
      .eq('id', submission.id);
    if (error) throw new Error(`Could not save the score: ${error.message}`);

    const resultRow = {
      assessment_id: assessment.id,
      student_id: submission.studentId,
      assessment_title: assessment.title,
      type: 'Coding',
      subject: assessment.subject || '',
      score: Math.round(clamped),
      max_score: Math.round(maxMarks),
      marks_obtained: clamped,
      max_marks: maxMarks,
      percentage: pct,
      grade: gradeFor(pct),
      status: passed ? 'Passed' : 'Failed',
      result_status: passed ? 'Passed' : 'Failed',
      student_name: submission.student,
      student_id_code: submission.rrn || null,
      feedback: feedback || null,
    };
    const { data: existing } = await supabase
      .from('results')
      .select('id')
      .eq('assessment_id', assessment.id)
      .eq('student_id', submission.studentId)
      .maybeSingle();
    const { error: resultError } = existing
      ? await supabase.from('results').update(resultRow).eq('id', existing.id)
      : await supabase.from('results').insert(resultRow);
    if (resultError) throw new Error(`Score saved, but the result could not be published: ${resultError.message}`);
  },

  async getResults(assessmentId: string): Promise<CodingResultRow[]> {
    const { data, error } = await (supabase
      .from('results')
      .select('id, student_name, student_id_code, score, max_score, percentage, grade, status, created_at, feedback')
      .eq('assessment_id', assessmentId)
      .order('percentage', { ascending: false }) as unknown as Promise<{ data: Array<Record<string, unknown>> | null; error: Error | null }>);
    if (error) throw new Error(`Could not load results: ${error.message}`);
    return (data || []).map((r) => ({
      id: r.id as string,
      student: (r.student_name as string) || 'Student',
      rrn: (r.student_id_code as string) || '',
      score: Number(r.score) || 0,
      totalMarks: Number(r.max_score) || 0,
      percentage: Number(r.percentage) || 0,
      grade: (r.grade as string) || '',
      status: r.status === 'Failed' ? 'Failed' : 'Passed',
      submittedAt: (r.created_at as string) || '',
      feedback: (r.feedback as string) || '',
    }));
  },
};
