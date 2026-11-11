import { useState, useEffect } from "react";
import {
  Bell,
  ChevronDown,
  LogOut,
} from "lucide-react";

import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import SignOutModal from "./SignOutModal";

import {
  getStoredTeacherProfile,
  saveStoredTeacherProfile,
  PROFILE_UPDATED_EVENT,
  getTeacherInitials,
} from "../lib/profileUtils";
import { teacherService } from "../services/teacherService";

export default function Header() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const [isSignOutModalOpen, setIsSignOutModalOpen] =
    useState(false);

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [profileData, setProfileData] = useState(
    getStoredTeacherProfile
  );

  /*
   * Keep the profile synchronized with database profile changes
   * and changes made in other browser tabs.
   */
  useEffect(() => {
    async function fetchDbProfile() {
      const res = await teacherService.getProfile();
      if (res.data) {
        const loaded = {
          name: res.data.name || "",
          facultyId: res.data.facultyId || "",
          email: res.data.email || "",
          phone: res.data.phone || "",
          department: res.data.department || "",
          designation: res.data.designation || "Assistant Professor",
          qualification: res.data.qualification || "",
          office: "Faculty Block B, Room 302",
          avatarUrl: res.data.avatarUrl || "",
        };
        setProfileData(loaded);
        saveStoredTeacherProfile(loaded);
      }
    }
    fetchDbProfile();

    const handleProfileSync = () => {
      setProfileData(getStoredTeacherProfile());
    };

    window.addEventListener(
      PROFILE_UPDATED_EVENT,
      handleProfileSync
    );

    window.addEventListener("storage", handleProfileSync);

    return () => {
      window.removeEventListener(
        PROFILE_UPDATED_EVENT,
        handleProfileSync
      );

      window.removeEventListener(
        "storage",
        handleProfileSync
      );
    };
  }, []);

  const handleConfirmLogout = async () => {
    try {
      setIsLoggingOut(true);

      await signOut();

      setIsSignOutModalOpen(false);

      navigate("/login");
    } catch (error) {
      console.error("Failed to sign out:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const displayName =
    profileData.name ||
    user?.fullName ||
    "Prof. Alex Morgan";

  const facultyId =
    profileData.facultyId ||
    user?.facultyId ||
    "FAC099";

  const initials = getTeacherInitials(displayName);

  return (
    <>
      {/* Header */}
      <header className="relative z-20 flex min-h-16 w-full min-w-0 shrink-0 items-center justify-between gap-2 border-b border-gray-200 bg-white py-2 pl-16 pr-2 sm:gap-3 sm:px-6 lg:pl-6">
        {/* Workspace Information */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[9px] font-semibold uppercase tracking-[0.08em] text-gray-500 sm:text-xs sm:tracking-[0.12em]">
            Faculty Workspace / Overview
          </p>

          <p className="hidden truncate text-sm font-semibold text-gray-900 sm:block">
            Dudex Smart Academy
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex min-w-0 shrink-0 items-center gap-1 sm:gap-3">
          {/* Notifications */}
          <Link
            to="/notifications"
            className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 sm:h-10 sm:w-10"
            title="Notifications"
            aria-label="Notifications"
          >
            <Bell size={19} />

            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-gray-900 ring-2 ring-white" />
          </Link>

          {/* Divider */}
          <div className="mx-0.5 hidden h-7 w-px shrink-0 bg-gray-200 sm:block" />

          {/* Teacher Profile */}
          <Link
            to="/profile"
            className="group flex min-w-0 shrink-0 items-center gap-1 rounded-xl p-1 transition hover:bg-gray-100 sm:gap-2 sm:p-1.5 md:gap-3"
            title="View and edit your profile"
            aria-label="View teacher profile"
          >
            {/* Avatar */}
            <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-900 text-xs font-semibold text-white shadow-sm ring-1 ring-[#e7ded3] sm:h-9 sm:w-9">
              {profileData.avatarUrl ? (
                <img
                  src={profileData.avatarUrl}
                  alt={displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="select-none text-xs font-bold tracking-wider">
                  {initials}
                </span>
              )}
            </div>

            {/* Profile Details */}
            <div className="hidden min-w-0 max-w-[150px] text-left md:block">
              <p className="truncate text-sm font-semibold text-gray-900 transition-colors group-hover:text-[#9c7449]">
                {displayName}
              </p>

              <p className="truncate text-xs font-medium text-gray-500">
                {facultyId}
              </p>
            </div>

            <ChevronDown
              size={16}
              className="hidden shrink-0 text-gray-400 transition-colors group-hover:text-gray-700 md:block"
            />
          </Link>

          {/* Sign Out */}
          <button
            type="button"
            onClick={() => setIsSignOutModalOpen(true)}
            className="flex shrink-0 items-center justify-center gap-1 rounded-lg border border-gray-200 px-2 py-2 text-xs font-medium text-gray-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 sm:gap-1.5 sm:px-3 sm:py-1.5"
            title="Sign out of your account"
            aria-label="Sign out"
          >
            <LogOut
              size={14}
              className="shrink-0"
            />

            <span className="hidden sm:inline">
              Sign out
            </span>
          </button>
        </div>
      </header>

      {/* Sign Out Confirmation Modal */}
      <SignOutModal
        isOpen={isSignOutModalOpen}
        onClose={() => setIsSignOutModalOpen(false)}
        onConfirm={handleConfirmLogout}
        loading={isLoggingOut}
      />
    </>
  );
}