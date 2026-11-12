import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { AppRole } from '../types/database.types';
import { sanitizeErrorMessage } from '../lib/errorUtils';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: AppRole;
  facultyId?: string;
  department?: string;
  status?: string;
  phone?: string;
  designation?: string;
  avatarUrl?: string;
  /** Signed in with an admin-issued temporary password that must be replaced. */
  mustChangePassword?: boolean;
}

interface TeacherProfileRow {
  id: string;
  faculty_id: string | null;
  designation: string | null;
  department: string | null;
  status: string;
}

async function clearLegacyCredentialCache(): Promise<void> {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('dudex_teacher_session');
      localStorage.removeItem('dudex_faculty_creds');

      const teacherCache = localStorage.getItem('dudex_teachers_cache');
      if (teacherCache) {
        try {
          const parsed: unknown = JSON.parse(teacherCache);
          if (Array.isArray(parsed)) {
            localStorage.setItem(
              'dudex_teachers_cache',
              JSON.stringify(
                parsed.map((teacher) => {
                  if (!teacher || typeof teacher !== 'object') return teacher;
                  const safeTeacher = { ...(teacher as Record<string, unknown>) };
                  delete safeTeacher.password;
                  return safeTeacher;
                }),
              ),
            );
          } else {
            localStorage.removeItem('dudex_teachers_cache');
          }
        } catch {
          localStorage.removeItem('dudex_teachers_cache');
        }
      }
    } catch (error) {
      console.error('Could not clear legacy teacher credentials from local storage:', error);
    }
  }

  if (typeof document !== 'undefined') {
    document.cookie = 'dudex_faculty_creds=; path=/; max-age=0; SameSite=Lax';
  }
}

void clearLegacyCredentialCache();

async function getAuthorizedTeacher(
  userId: string,
  mustChangePassword = false,
): Promise<{
  user: AuthUser | null;
  error: string | null;
  /** True when the lookup failed (network, timeout) rather than the account being rejected. */
  transient?: boolean;
}> {
  // The three lookups are independent, so run them together.
  const [roleRes, teacherRes, profileRes] = await Promise.all([
    supabase.from('user_roles').select('role').eq('user_id', userId).eq('role', 'teacher').maybeSingle(),
    supabase
      .from('teacher_profiles')
      .select('id, faculty_id, designation, department, status')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase.from('profiles').select('full_name, email, avatar_url, is_active').eq('id', userId).maybeSingle(),
  ]);
  const { data: roleData, error: roleError } = roleRes;
  const { data: teacherData, error: teacherError } = teacherRes;
  const { data: profile, error: profileError } = profileRes;

  const lookupError = roleError || teacherError || profileError;
  if (lookupError) {
    return {
      user: null,
      transient: true,
      error: `Could not verify teacher permissions: ${sanitizeErrorMessage(lookupError, 'Lookup failed.')}`,
    };
  }
  if (!roleData) {
    return { user: null, error: 'Access denied. This account is not assigned the teacher role.' };
  }
  if (!teacherData) {
    return { user: null, error: 'Access denied. No teacher profile is provisioned for this account.' };
  }

  const teacher = teacherData as unknown as TeacherProfileRow;
  if (teacher.status !== 'active') {
    return {
      user: null,
      error: `Account access restricted. Faculty status is ${teacher.status}. Contact administration.`,
    };
  }

  if (!profile || profile.is_active === false) {
    return { user: null, error: 'This teacher account is inactive. Contact administration.' };
  }

  return {
    user: {
      id: userId,
      email: profile?.email || '',
      fullName: profile?.full_name || 'Faculty Member',
      role: 'teacher',
      facultyId: teacher.faculty_id || undefined,
      department: teacher.department || undefined,
      status: teacher.status,
      designation: teacher.designation || undefined,
      avatarUrl: profile?.avatar_url || undefined,
      mustChangePassword,
    },
    error: null,
  };
}

async function signOutAfterRejectedRoleCheck(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) console.error('Failed to clear rejected teacher session:', error.message);
}

export const authService = {
  async signInWithGoogle() {
    if (!isSupabaseConfigured) {
      return { user: null, error: 'Authentication service is not configured.' };
    }

    const isLocal =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';
    const redirectOrigin =
      import.meta.env.VITE_SITE_URL ||
      (isLocal ? window.location.origin : 'https://teacher.dudexsmartacademy.in');

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${redirectOrigin}/dashboard` },
    });

    return {
      user: null,
      error: error ? sanitizeErrorMessage(error, 'Google authentication failed.') : null,
    };
  },

  async sendOtp(email: string) {
    if (!isSupabaseConfigured) {
      return { success: false, message: null, error: 'Authentication service is not configured.' };
    }

    const cleanEmail = email.trim();
    const { error } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: { shouldCreateUser: false },
    });

    if (error) {
      return {
        success: false,
        message: null,
        error: sanitizeErrorMessage(error, 'Could not send a verification code.'),
      };
    }

    return {
      success: true,
      message: `Verification code sent to ${cleanEmail}.`,
      error: null,
    };
  },

  async verifyOtp(email: string, token: string) {
    if (!isSupabaseConfigured) {
      return { user: null, error: 'Authentication service is not configured.' };
    }

    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: token.trim(),
      type: 'email',
    });
    if (error) return { user: null, error: sanitizeErrorMessage(error, 'Invalid or expired OTP code.') };
    if (!data.user) return { user: null, error: 'User account not found.' };

    const result = await getAuthorizedTeacher(data.user.id, data.user.user_metadata?.must_change_password === true);
    if (result.error || !result.user) {
      await signOutAfterRejectedRoleCheck();
      return { user: null, error: result.error || 'Teacher authorization failed.' };
    }

    return result;
  },

  async signInWithEmail(email: string, password: string) {
    if (!isSupabaseConfigured) {
      return { user: null, error: 'Authentication service is not configured.' };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error || !data.user) {
      return { user: null, error: sanitizeErrorMessage(error, 'Invalid email or password.') };
    }

    const result = await getAuthorizedTeacher(data.user.id, data.user.user_metadata?.must_change_password === true);
    if (result.error || !result.user) {
      await signOutAfterRejectedRoleCheck();
      return { user: null, error: result.error || 'Teacher authorization failed.' };
    }

    const { error: logError } = await supabase.from('activity_logs').insert({
      actor_id: data.user.id,
      action: 'TEACHER_LOGIN',
      module: 'teacher_profiles',
      entity: data.user.id,
      description: JSON.stringify({ timestamp: new Date().toISOString() }),
    });
    if (logError) console.error('Failed to record teacher sign-in activity:', logError.message);

    return result;
  },

  async signOut() {
    await clearLegacyCredentialCache();

    if (isSupabaseConfigured) {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        const { error: logError } = await supabase.from('activity_logs').insert({
          actor_id: data.user.id,
          action: 'TEACHER_LOGOUT',
          module: 'teacher_profiles',
          entity: data.user.id,
          description: JSON.stringify({ timestamp: new Date().toISOString() }),
        });
        if (logError) console.error('Failed to record teacher sign-out activity:', logError.message);
      }

      const { error } = await supabase.auth.signOut();
      if (error) console.error('Teacher sign-out failed:', error.message);
    }
  },

  /**
   * Returns the signed-in teacher, or null when signed out or rejected.
   * Throws when the check could not be completed (network trouble) so callers
   * keep the current session instead of signing the teacher out.
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    await clearLegacyCredentialCache();
    if (!isSupabaseConfigured) return null;

    // The stored session is read locally (refreshed only when expired), so a
    // page refresh does not wait on a network round trip just to find the user.
    const { data, error } = await supabase.auth.getSession();
    if (error) throw new Error(`Could not read the session: ${error.message}`);
    const sessionUser = data.session?.user;
    if (!sessionUser) return null;

    let result = await getAuthorizedTeacher(sessionUser.id, sessionUser.user_metadata?.must_change_password === true);
    if (result.transient) {
      result = await getAuthorizedTeacher(sessionUser.id, sessionUser.user_metadata?.must_change_password === true);
    }
    if (result.transient) throw new Error(result.error || 'Could not verify the teacher account.');
    if (result.error || !result.user) {
      if (result.error) console.error(result.error);
      await signOutAfterRejectedRoleCheck();
      return null;
    }
    return result.user;
  },

  async changePassword(newPassword: string): Promise<{ success: boolean; error: string | null }> {
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Authentication service is not configured.' };
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return { success: false, error: userError?.message || 'A signed-in teacher session is required.' };
    }

    // Choosing a password also clears the temporary-password flag set by the admin portal.
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
      data: { must_change_password: false },
    });
    if (error) return { success: false, error: sanitizeErrorMessage(error, 'Password update failed.') };

    const { error: logError } = await supabase.from('activity_logs').insert({
      actor_id: userData.user.id,
      action: 'TEACHER_PASSWORD_CHANGE',
      module: 'teacher_profiles',
      entity: userData.user.id,
      description: JSON.stringify({ timestamp: new Date().toISOString() }),
    });
    if (logError) console.error('Failed to record teacher password change:', logError.message);

    return { success: true, error: null };
  },

  async resetPasswordForEmail(email: string): Promise<{ success: boolean; error: string | null }> {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Authentication service is not configured.' };
    }

    const isLocal =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';
    const redirectOrigin =
      import.meta.env.VITE_SITE_URL ||
      (isLocal ? window.location.origin : 'https://teacher.dudexsmartacademy.in');

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${redirectOrigin}/reset-password`,
    });

    if (error) {
      return { success: false, error: sanitizeErrorMessage(error, 'Failed to send password reset email.') };
    }
    return { success: true, error: null };
  },

};
