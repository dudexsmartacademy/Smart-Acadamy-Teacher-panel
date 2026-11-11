export interface ProfileData {
  name: string;
  facultyId: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  qualification: string;
  office: string;
  avatarUrl?: string;
}

export const PROFILE_STORAGE_KEY = "dudex_teacher_profile_data";
export const PROFILE_UPDATED_EVENT = "teacher-profile-updated";

/**
 * Calculates responsive initials from the teacher name.
 * e.g., "Prof. Alex Morgan" -> "PA", "Alex Morgan" -> "AM", "John" -> "JO"
 */
export function getTeacherInitials(name?: string): string {
  if (!name || !name.trim()) return "T";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "T";
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase().slice(0, 2);
}

// The signed-in teacher's profile, loaded from Supabase (teacher_profiles /
// profiles). Kept in memory only, so another account on the same browser never
// sees it.
const EMPTY_PROFILE: ProfileData = {
  name: "",
  facultyId: "",
  email: "",
  phone: "",
  department: "",
  designation: "",
  qualification: "",
  office: "",
  avatarUrl: "",
};
let currentProfile: ProfileData = EMPTY_PROFILE;

if (typeof window !== "undefined") {
  try {
    localStorage.removeItem(PROFILE_STORAGE_KEY);
  } catch {
    // Storage unavailable; nothing to clear.
  }
}

/** The signed-in teacher's profile as last loaded from Supabase. */
export function getStoredTeacherProfile(): ProfileData {
  return currentProfile;
}

/** Updates the in-memory profile and notifies the header and dashboard. */
export function saveStoredTeacherProfile(data: ProfileData): void {
  currentProfile = { ...data };
  window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
}
