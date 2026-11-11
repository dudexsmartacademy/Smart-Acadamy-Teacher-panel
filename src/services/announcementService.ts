import { supabase, isSupabaseConfigured } from '../lib/supabase';

export type AnnouncementCategory =
  | 'Announcements'
  | 'Support Requests'
  | 'Class Discussion'
  | 'Teacher Notes';

export interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  priority: 'Low' | 'Normal' | 'High' | 'Urgent';
  publishDate: string;
  expiryDate: string;
  classId: string;
  className: string;
  /** Global batches the announcement is for; empty means all students. */
  batches: string[];
  subject: string;
  status: 'Published' | 'Draft' | 'Archived';
  category?: AnnouncementCategory;
  senderName?: string;
  senderRole?: string;
  viewsCount?: number;
  notifyAdmin?: boolean;
}

function safeSplitDate(val: unknown): string {
  if (typeof val === 'string' && val.trim().length > 0) {
    return val.split('T')[0] || '';
  }
  return '';
}

function rowToItem(row: Record<string, unknown>): AnnouncementItem {
  const rawPriority = String(row.priority || 'Normal');
  const publishAt = (row.date as string) || (row.publish_date as string) || (row.created_at as string) || '';
  const expiresAt = (row.expiry_date as string) || (row.expires_at as string) || '';

  const senderName = (row.sender_name as string) || 'Administration';
  const senderRole = (row.sender_role as string) || 'Admin';
  const targetClass = (row.target_class as string) || 'All Students';
  const classObj = row.classes as Record<string, unknown> | null;

  let priority: AnnouncementItem['priority'] = 'Normal';
  const pLower = rawPriority.toLowerCase();
  if (pLower === 'urgent') priority = 'Urgent';
  else if (pLower === 'high') priority = 'High';
  else if (pLower === 'low') priority = 'Low';

  return {
    id: (row.id as string) || '',
    title: (row.title as string) || '',
    content: (row.content as string) || '',
    priority,
    publishDate: safeSplitDate(publishAt) || new Date().toISOString().split('T')[0],
    expiryDate: safeSplitDate(expiresAt),
    classId: (row.target_class_id as string) || (row.class_id as string) || 'all',
    className:
      (Array.isArray(row.batches) && (row.batches as string[]).length ? (row.batches as string[]).join(', ') : '') ||
      (classObj?.name as string) ||
      targetClass ||
      'All Students',
    batches: Array.isArray(row.batches) ? (row.batches as string[]) : [],
    subject: 'General',
    status: 'Published',
    category: 'Announcements',
    senderName,
    senderRole,
    viewsCount: Number(row.views_count) || 0,
  };
}

export const announcementService = {
  async getAnnouncements(): Promise<{ data: AnnouncementItem[]; error: string | null }> {
    if (!isSupabaseConfigured) {
      return { data: [], error: 'Database connection is not configured.' };
    }

    try {
      let data: any = null;
      const { data: primaryData, error } = await supabase
        .from('announcements')
        .select('*, classes(name)')
        .order('created_at', { ascending: false });

      if (error) {
        const simple = await supabase
          .from('announcements')
          .select('*')
          .order('created_at', { ascending: false });
        if (simple.error) return { data: [], error: simple.error.message };
        data = simple.data;
      } else {
        data = primaryData;
      }
      // Also query read notifications count to reflect views
      const { data: readNotifs } = await supabase.from('notifications').select('title, read, read_at').or('read.eq.true,read_at.not.is.null');
      const notifs = readNotifs || [];
      const items = (data || []).map((row: any) => {
        const it = rowToItem(row as Record<string, unknown>);
        const cleanTitle = (it.title || '').trim().toLowerCase();
        let notifViews = 0;
        if (cleanTitle) {
          notifViews = notifs.filter((n: any) => {
            const nt = (n.title || '').replace(/^[\u{1F4E2}\s]+/u, '').trim().toLowerCase();
            return nt === cleanTitle || nt.includes(cleanTitle) || cleanTitle.includes(nt);
          }).length;
        }
        it.viewsCount = Math.max(Number(row.views_count) || 0, notifViews);
        return it;
      });
      return { data: items, error: null };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to query announcements';
      return { data: [], error: msg };
    }
  },

  async getAnnouncementById(id: string): Promise<{ data: AnnouncementItem | null; error: string | null }> {
    if (!isSupabaseConfigured) {
      return { data: null, error: 'Database connection is not configured.' };
    }

    try {
      let data: any = null;
      const { data: primaryData, error } = await supabase
        .from('announcements')
        .select('*, classes(name)')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        const simple = await supabase
          .from('announcements')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (simple.error) return { data: null, error: simple.error.message };
        data = simple.data;
      } else {
        data = primaryData;
      }

      if (!data) return { data: null, error: 'Announcement not found.' };
      return { data: rowToItem(data as Record<string, unknown>), error: null };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to fetch announcement';
      return { data: null, error: msg };
    }
  },

  async createAnnouncement(announcement: Omit<AnnouncementItem, 'id' | 'viewsCount'>): Promise<{ data: AnnouncementItem | null; error: string | null }> {
    if (!isSupabaseConfigured) {
      return { data: null, error: 'Database connection is not configured.' };
    }

    try {
      const { data: authResult } = await supabase.auth.getUser();
      const currentUserId = authResult?.user?.id || null;
      const teacherName = authResult?.user?.user_metadata?.full_name || 'Faculty Member';

      let priorityVal = 'Normal';
      const pLower = (announcement.priority || 'Normal').toLowerCase();
      if (pLower === 'urgent') priorityVal = 'Urgent';
      else if (pLower === 'high') priorityVal = 'High';
      else if (pLower === 'low') priorityVal = 'Low';

      const batches = announcement.batches || [];

      const pubIso = announcement.publishDate ? new Date(announcement.publishDate).toISOString() : new Date().toISOString();
      const expIso = announcement.expiryDate ? new Date(announcement.expiryDate).toISOString() : null;

      const payload: Record<string, unknown> = {
        sender_id: currentUserId,
        sender_name: teacherName,
        sender_role: 'Teacher',
        title: announcement.title.trim(),
        content: announcement.content.trim(),
        priority: priorityVal,
        scope: 'all',
        target_role: 'student',
        target_class: batches.length ? batches.join(', ') : 'All Students',
        target_class_id: null,
        batches,
        date: pubIso,
        publish_at: pubIso,
        expiry_date: expIso,
        expires_at: expIso,
      };

      const { data, error } = await supabase
        .from('announcements')
        .insert(payload)
        .select('*')
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      // Insert notification rows for recipient students
      try {
        let recipients: string[] = [];
        const isAllBatches = batches.length === 0 || batches.includes('All Batches') || batches.includes('All Students');
        if (!isAllBatches) {
          const { data: students } = await supabase.from('student_profiles').select('user_id').in('batch_name', batches);
          recipients = (students || []).map((r: { user_id: string }) => r.user_id).filter(Boolean);
        } else {
          const { data: users } = await supabase.from('profiles').select('id').eq('role', 'student');
          recipients = (users || []).map((u: { id: string }) => u.id);
        }
        if (recipients.length > 0) {
          await supabase.from('notifications').insert(
            recipients.map((userId) => ({
              recipient_id: userId,
              user_id: userId,
              title: `📢 ${announcement.title.trim()}`,
              message: announcement.content.trim().substring(0, 500),
              type: 'announcement',
              notification_type: 'announcement',
              link_url: '/announcements',
              audience: 'student',
              priority: priorityVal,
              read: false,
              created_by: currentUserId,
            }))
          );
        }

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('dudex_announcements_changed'));
          try {
            localStorage.setItem('dudex_announcements_sync', Date.now().toString());
          } catch {}
        }

        // If notifyAdmin is selected, send notifications to admin accounts
        if ((announcement as any).notifyAdmin) {
          const { data: admins } = await supabase.from('profiles').select('id').in('role', ['admin', 'super_admin']);
          if (admins && admins.length > 0) {
            await supabase.from('notifications').insert(
              admins.map((adm: { id: string }) => ({
                user_id: adm.id,
                title: `📢 Faculty Announcement: ${announcement.title.trim()}`,
                message: `${teacherName}: ${announcement.content.trim().substring(0, 500)}`,
                type: 'announcement',
                audience: 'admin',
                priority: priorityVal,
                read: false,
                created_by: currentUserId,
              }))
            );
          }
        }
      } catch (notifErr) {
        console.warn('Teacher announcement saved, but notifications insertion failed:', notifErr);
      }

      return { data: rowToItem(data as Record<string, unknown>), error: null };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to insert announcement';
      return { data: null, error: msg };
    }
  },

  async updateAnnouncement(id: string, updates: Partial<AnnouncementItem>): Promise<{ success: boolean; error: string | null }> {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Database connection is not configured.' };
    }

    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title.trim();
      if (updates.content !== undefined) dbUpdates.content = updates.content.trim();
      if (updates.priority !== undefined) {
        const p = updates.priority.toLowerCase();
        dbUpdates.priority = p === 'urgent' ? 'Urgent' : p === 'high' ? 'High' : p === 'low' ? 'Low' : 'Normal';
      }
      if (updates.publishDate !== undefined) {
        dbUpdates.date = updates.publishDate ? new Date(updates.publishDate).toISOString() : new Date().toISOString();
      }
      if (updates.expiryDate !== undefined) {
        dbUpdates.expiry_date = updates.expiryDate ? new Date(updates.expiryDate).toISOString() : null;
      }
      if (updates.batches !== undefined) {
        dbUpdates.batches = updates.batches;
        dbUpdates.target_class = updates.batches.length ? updates.batches.join(', ') : 'All Students';
        dbUpdates.target_class_id = null;
      }

      const { data, error } = await supabase
        .from('announcements')
        .update(dbUpdates)
        .eq('id', id)
        .select('id');

      if (error) return { success: false, error: error.message };
      if (!data || data.length === 0) return { success: false, error: 'Announcement not found or you cannot edit it.' };
      return { success: true, error: null };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to update announcement';
      return { success: false, error: msg };
    }
  },

  async deleteAnnouncement(id: string): Promise<{ success: boolean; error: string | null }> {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Database connection is not configured.' };
    }

    try {
      const { data, error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id)
        .select('id');

      if (error) return { success: false, error: error.message };
      if (!data || data.length === 0) return { success: false, error: 'Announcement not found or you cannot delete it.' };
      return { success: true, error: null };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to delete announcement';
      return { success: false, error: msg };
    }
  },
};
