/**
 * Coding Assessment Isolation Boundary
 * 
 * ARCHITECTURAL RULE:
 * Student-submitted code must NEVER be executed inside:
 * 1. The browser / React client
 * 2. The main web application server
 * 3. PostgreSQL database functions
 * 4. Supabase default edge handlers without gVisor / container isolation
 * 
 * Code execution must be delegated to an isolated sandbox (e.g. Judge0, AWS ECS microVM, or isolated sandboxed workers).
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { ProgrammingLanguage, SubmissionStatus } from '../types/database.types';

export interface CodeSubmissionPayload {
  attemptId?: string;
  problemId: string;
  studentId: string;
  language: ProgrammingLanguage;
  code: string;
}

export interface CodeSubmissionResult {
  id: string;
  status: SubmissionStatus;
  score: number;
  testCasesPassed: number;
  totalTestCases: number;
  executionTimeMs?: number;
  memoryUsedKb?: number;
  errorMessage?: string;
}

export const codingJudgeService = {
  /**
   * Submits student code to the queuing table.
   * A dedicated sandboxed worker / Edge Function polls and runs the code against hidden test cases.
   */
  async submitCodeForEvaluation(payload: CodeSubmissionPayload): Promise<{ data: CodeSubmissionResult | null; error: string | null }> {
    if (!isSupabaseConfigured) {
      return {
        data: null,
        error: 'Database connection is not configured.',
      };
    }

    try {
      const { data, error } = await supabase
        .from('code_submissions')
        // Live schema: problem_id, source_code, passed_tests/total_tests.
        .insert({
          problem_id: payload.problemId,
          student_id: payload.studentId,
          language: payload.language,
          source_code: payload.code,
          status: 'pending',
          score: 0,
          passed_tests: 0,
          total_tests: 0,
        })
        .select()
        .single();

      if (error || !data) {
        return { data: null, error: error?.message || 'Failed to submit code for evaluation' };
      }

      const row = data as unknown as Record<string, unknown>;
      return {
        data: {
          id: row.id as string,
          status: row.status as SubmissionStatus,
          score: Number(row.score),
          testCasesPassed: Number(row.passed_tests),
          totalTestCases: Number(row.total_tests),
          executionTimeMs: row.execution_time_ms ? Number(row.execution_time_ms) : undefined,
          memoryUsedKb: row.memory_used_kb ? Number(row.memory_used_kb) : undefined,
          errorMessage: (row.error_message as string) || undefined,
        },
        error: null,
      };
    } catch {
      return { data: null, error: 'Code submission failed' };
    }
  },

  /**
   * Fetches problem statement and starter template (without revealing hidden test cases).
   */
  async getProblemDetails(problemId: string) {
    if (!isSupabaseConfigured) {
      return {
        data: null,
        error: 'Database connection is not configured.',
      };
    }

    const { data, error } = await (supabase
      .from('coding_problems')
      // Live schema: the statement is `description` and a single `starter_code`
      // is stored per `language`; there are no format/limit columns.
      .select('id, title, description, starter_code, language')
      .eq('id', problemId)
      .maybeSingle() as unknown as Promise<{ data: Record<string, unknown> | null; error: Error | null }>);

    if (error || !data) return { data: null, error: error?.message || 'Problem not found' };

    const language = (data.language as string) || 'default';
    return {
      data: {
        id: data.id as string,
        title: data.title as string,
        problemStatement: (data.description as string) || '',
        inputFormat: null,
        outputFormat: null,
        constraints: null,
        timeLimitMs: 0,
        memoryLimitMb: 0,
        starterTemplates: data.starter_code ? { [language]: data.starter_code as string } : {},
      },
      error: null,
    };
  },
};
