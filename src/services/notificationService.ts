import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  linkUrl?: string | null;
  readAt?: string | null;
  createdAt: string;
}

export const notificationService = {
  async getNotifications() {
    if (!isSupabaseConfigured) {
      return { data: [], error: 'Database connection is not configured.' };
    }

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return { data: [], error: null };

    // Live schema: notifications(user_id, title, message, type, action_url, read, created_at)
    const { data, error } = await (supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.user.id)
      .order('created_at', { ascending: false })
      .limit(100) as unknown as Promise<{ data: Array<Record<string, unknown>> | null; error: Error | null }>);

    if (error) return { data: [], error: error.message };

    const formatted: NotificationItem[] = (data || []).map((n) => ({
      id: n.id as string,
      title: (n.title as string) || '',
      message: (n.message as string) || '',
      type: (n.type as string) || 'general',
      linkUrl: (n.action_url as string) || null,
      readAt: n.read ? (n.created_at as string) || '' : null,
      createdAt: (n.created_at as string) || '',
    }));

    return { data: formatted, error: null };
  },

  async markAsRead(id: string) {
    if (!isSupabaseConfigured) {
      return { success: false };
    }

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);

    return { success: !error };
  },

  async markAllAsRead() {
    if (!isSupabaseConfigured) {
      return { success: false };
    }

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return { success: false };

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.user.id)
      .eq('read', false);

    return { success: !error };
  },
};
