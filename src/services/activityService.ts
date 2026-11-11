import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Json } from '../types/database.types';

export const activityService = {
  async logActivity(action: string, entityType: string, entityId?: string, metadata: Json = {}) {
    if (!isSupabaseConfigured) {
      console.log(`[Activity Log]: ${action} on ${entityType} (${entityId})`, metadata);
      return { success: true };
    }

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return { success: false };

      await supabase.from('activity_logs').insert({
        actor_id: user.user.id,
        action,
        module: entityType,
        entity: entityId || entityType,
        description: JSON.stringify(metadata),
      });

      return { success: true };
    } catch {
      return { success: false };
    }
  },

  async getRecentActivities(limit: number = 20) {
    if (!isSupabaseConfigured) {
      return {
        data: [],
        error: 'Database connection is not configured.',
      };
    }

    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) return { data: [], error: error.message };
    return { data, error: null };
  },
};
