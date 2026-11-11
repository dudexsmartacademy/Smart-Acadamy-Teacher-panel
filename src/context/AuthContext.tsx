import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { authService, type AuthUser } from '../services/authService';
import { teacherService, type TeacherAssignmentItem } from '../services/teacherService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  assignments: TeacherAssignmentItem[];
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  sendOtp: (email: string) => Promise<{ success: boolean; message: string | null; error: string | null }>;
  verifyOtp: (email: string, token: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  changePassword: (newPassword: string) => Promise<{ success: boolean; error: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [assignments, setAssignments] = useState<TeacherAssignmentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const currentUserId = useRef<string | null>(null);

  // Only the first check shows the full-page "Verifying" screen; later checks
  // (sign-in events, profile refreshes) update the user in the background.
  const loadUserData = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      currentUserId.current = currentUser?.id ?? null;
      setUser(currentUser);
      if (currentUser) {
        void teacherService.getAssignments().then(({ data, error }) => {
          if (error) console.error('Could not load teacher assignments:', error);
          setAssignments(data);
        });
      } else {
        setAssignments([]);
      }
    } catch (err) {
      // A failed check (network trouble) keeps the existing session; it is
      // retried on the next auth event instead of sending the teacher to login.
      console.error('Could not verify the teacher session:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUserData();

    if (isSupabaseConfigured) {
      const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
          currentUserId.current = null;
          setUser(null);
          setAssignments([]);
          return;
        }
        // Supabase repeats SIGNED_IN whenever the tab regains focus; only a
        // different user (or a profile/password change) needs a new check.
        const changedUser = event === 'SIGNED_IN' && session?.user && session.user.id !== currentUserId.current;
        if (changedUser || ((event === 'PASSWORD_RECOVERY' || event === 'USER_UPDATED') && session?.user)) {
          setTimeout(() => {
            void loadUserData();
          }, 0);
        }
      });

      return () => {
        authListener?.subscription.unsubscribe();
      };
    }
  }, []);

  const signIn = async (email: string, password: string) => {
    const { user: authUser, error } = await authService.signInWithEmail(email, password);
    if (error) {
      return { error };
    }
    currentUserId.current = authUser?.id ?? null;
    setUser(authUser);
    if (authUser) {
      const { data: assignData } = await teacherService.getAssignments();
      setAssignments(assignData);
    }
    return { error: null };
  };

  const sendOtp = async (email: string) => {
    return await authService.sendOtp(email);
  };

  const verifyOtp = async (email: string, token: string) => {
    const { user: authUser, error } = await authService.verifyOtp(email, token);
    if (error) {
      return { error };
    }
    currentUserId.current = authUser?.id ?? null;
    setUser(authUser);
    if (authUser) {
      const { data: assignData } = await teacherService.getAssignments();
      setAssignments(assignData);
    }
    return { error: null };
  };

  const signInWithGoogle = async () => {
    const { user: authUser, error } = await authService.signInWithGoogle();
    if (error) {
      return { error };
    }
    if (authUser) {
      setUser(authUser);
      const { data: assignData } = await teacherService.getAssignments();
      setAssignments(assignData);
    }
    return { error: null };
  };

  const signOut = async () => {
    await authService.signOut();
    setUser(null);
    setAssignments([]);
  };

  const refreshProfile = async () => {
    await loadUserData();
  };

  const changePassword = async (newPassword: string) => {
    return await authService.changePassword(newPassword);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        assignments,
        signIn,
        sendOtp,
        verifyOtp,
        signInWithGoogle,
        signOut,
        refreshProfile,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
