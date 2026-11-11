import { useState, useEffect } from "react";
import {
  getStoredTeacherProfile,
  PROFILE_UPDATED_EVENT,
  getTeacherInitials,
} from "../../lib/profileUtils";
import { useAuth } from "../../context/AuthContext";
import { liveClassService, type LiveClassItem } from "../../services/liveClassService";

export default function TeacherInfo() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(getStoredTeacherProfile);
  const [sessions, setSessions] = useState<LiveClassItem[]>([]);

  useEffect(() => {
    const handleProfileSync = () => {
      setProfile(getStoredTeacherProfile());
    };

    window.addEventListener(PROFILE_UPDATED_EVENT, handleProfileSync);
    window.addEventListener("storage", handleProfileSync);

    // Batches and subjects come from the classes this teacher scheduled.
    void liveClassService.getMyClassSessions().then(({ data }) => setSessions(data));

    return () => {
      window.removeEventListener(PROFILE_UPDATED_EVENT, handleProfileSync);
      window.removeEventListener("storage", handleProfileSync);
    };
  }, []);

  const displayName = user?.fullName || profile.name || "Faculty Member";
  const displayFacultyId = user?.facultyId || profile.facultyId || "—";
  const displayDepartment = user?.department || profile.department || "—";
  const initials = getTeacherInitials(displayName);

  const batchNumber = (name: string) => Number(/(\d+)/.exec(name)?.[1] || 0);
  const assignedClassNames = [...new Set(sessions.flatMap((c) => c.batches))]
    .sort((a, b) => batchNumber(a) - batchNumber(b))
    .join(", ");

  const assignedSubjectNames = [
    ...new Set(sessions.map((c) => c.subjectName).filter(Boolean)),
  ].join(", ");

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-900 text-lg font-semibold text-white shadow-xs ring-2 ring-[#e9ded0]">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={displayName}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="select-none tracking-wider font-bold">
              {initials}
            </span>
          )}
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {displayName}
          </h2>

          <p className="mt-0.5 text-xs font-semibold text-[#9c7449]">
            Faculty ID: {displayFacultyId}
          </p>

          <p className="text-xs text-gray-500 mt-0.5">
            Department: {displayDepartment}
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 border-t border-gray-100 pt-5 sm:grid-cols-2">
        <div>
          <p className="text-xs text-gray-500">
            Batches
          </p>

          <p className="mt-1 text-sm font-medium text-gray-900">
            {assignedClassNames || "No classes scheduled yet"}
          </p>
        </div>

        <div>
          <p className="text-xs text-gray-500">
            Subjects
          </p>

          <p className="mt-1 text-sm font-medium text-gray-900">
            {assignedSubjectNames || "No classes scheduled yet"}
          </p>
        </div>
      </div>
    </div>
  );
}