import { supabase } from '../lib/supabase';

export interface BatchOption {
  /** Global batch name, e.g. "Batch 3". */
  name: string;
  college: string;
}

const batchNumber = (name: string) => Number(/(\d+)/.exec(name)?.[1] || 0);

let cache: BatchOption[] | null = null;

export const batchService = {
  /**
   * Every batch across all colleges. Batch numbers are global (a new college
   * continues the numbering), so a batch name identifies one group of students.
   */
  async getBatches(force = false): Promise<{ data: BatchOption[]; error: string | null }> {
    if (cache && !force) return { data: cache, error: null };
    const { data, error } = await supabase.from('colleges').select('name, batches');
    if (error) return { data: cache || [], error: `Could not load batches: ${error.message}` };
    const seen = new Set<string>();
    const uniqueBatches: BatchOption[] = [];
    ((data || []) as Array<{ name: string; batches: string[] | null }>).forEach((c) => {
      (c.batches || []).forEach((b) => {
        const trimmed = (b || '').trim();
        if (trimmed && !seen.has(trimmed)) {
          seen.add(trimmed);
          uniqueBatches.push({ name: trimmed, college: c.name });
        }
      });
    });
    // Ensure all standard global batches (Batch 1 to Batch 5) are available
    ['Batch 1', 'Batch 2', 'Batch 3', 'Batch 4', 'Batch 5'].forEach((defaultBatch) => {
      if (!seen.has(defaultBatch)) {
        seen.add(defaultBatch);
        uniqueBatches.push({ name: defaultBatch, college: 'DudeX Smart Academy' });
      }
    });
    cache = uniqueBatches.sort((a, b) => batchNumber(a.name) - batchNumber(b.name) || a.name.localeCompare(b.name));
    return { data: cache, error: null };
  },
};
