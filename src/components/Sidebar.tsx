import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  School,
  ClipboardCheck,
  UserCheck,
  ListChecks,
  Code2,
  BarChart3,
  StickyNote,
  Megaphone,
  CalendarDays,
  UserCircle,
  Menu,
  X,
  LogOut,
} from "lucide-react";

import { NavLink, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import SignOutModal from "./SignOutModal";

const navigation = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Faculty Self-Attendance",
    path: "/my-attendance",
    icon: UserCheck,
  },
  {
    label: "Classes",
    path: "/classes",
    icon: School,
  },
  {
    label: "Student Attendance",
    path: "/attendance",
    icon: ClipboardCheck,
  },
  {
    label: "MCQ Assessment",
    path: "/mcq-assessments",
    icon: ListChecks,
    isSpecialModule: true,
  },
  {
    label: "HackerRank Challenge",
    path: "/hackerrank",
    icon: Code2,
    isSpecialModule: true,
  },
  {
    label: "Results",
    path: "/results",
    icon: BarChart3,
  },
  {
    label: "Notes",
    path: "/notes",
    icon: StickyNote,
  },
  {
    label: "Announcements",
    path: "/announcements",
    icon: Megaphone,
  },
  {
    label: "Calendar",
    path: "/calendar",
    icon: CalendarDays,
  },
  {
    label: "Profile",
    path: "/profile",
    icon: UserCircle,
  },
];

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSignOutModalOpen, setIsSignOutModalOpen] =
    useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const navigate = useNavigate();
  const { signOut } = useAuth();

  const closeMenu = () => {
    setIsOpen(false);
  };

  /*
   * Close the mobile drawer when Escape is pressed.
   * Prevent background scrolling while the drawer is open.
   */
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleConfirmLogout = async () => {
    try {
      setIsLoggingOut(true);

      await signOut();

      setIsSignOutModalOpen(false);
      setIsOpen(false);

      navigate("/login");
    } catch (error) {
      console.error("Failed to sign out:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed left-3 top-3 z-50 flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:bg-gray-50 lg:hidden"
        aria-label="Open navigation menu"
        aria-expanded={isOpen}
        aria-controls="teacher-sidebar"
      >
        <Menu size={20} />
      </button>

      {/* Mobile Overlay */}
      {isOpen && (
        <button
          type="button"
          onClick={closeMenu}
          className="fixed inset-0 z-[60] bg-black/40 lg:hidden"
          aria-label="Close navigation menu"
        />
      )}

      {/* Sidebar */}
      <aside
        id="teacher-sidebar"
        aria-label="Teacher navigation"
        className={`fixed inset-y-0 left-0 z-[70] flex h-[100dvh] w-[min(17rem,85vw)] min-w-0 flex-col overflow-hidden border-r border-gray-200 bg-white transition-transform duration-200 ease-in-out lg:sticky lg:top-0 lg:z-30 lg:h-screen lg:w-64 lg:shrink-0 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="flex min-h-16 shrink-0 items-center justify-between gap-2 border-b border-gray-200 px-4 sm:px-5">
          <Link
            to="/dashboard"
            onClick={closeMenu}
            className="flex items-center gap-3 min-w-0 flex-1"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FAF5EF] to-[#F2E8DC] flex items-center justify-center p-1 shrink-0 shadow-sm border border-[#D5C2B1]">
              <img src="/logo.png?v=20261031_0715" alt="DudeX Logo" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold text-gray-900 sm:text-lg leading-tight">
                Dudex Smart Academy
              </h1>
              <p className="truncate text-xs text-gray-500">
                Teacher Portal
              </p>
            </div>
          </Link>

          {/* Mobile Close Button */}
          <button
            type="button"
            onClick={closeMenu}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 lg:hidden"
            aria-label="Close navigation menu"
          >
            <X size={19} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain p-3">
          <div className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={closeMenu}
                  className={({ isActive }) => {
                    const baseClasses =
                      "flex min-w-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition";

                    if (
                      item.path === "/mcq-assessments" ||
                      item.path === "/hackerrank"
                    ) {
                      return `${baseClasses} ${
                        isActive
                          ? "border-l-4 border-[#B08E67] bg-[#E9DED0] font-semibold text-[#1B1C1E] shadow-sm"
                          : "font-semibold text-gray-600 hover:bg-[#FAF7F2] hover:text-[#1B1C1E]"
                      }`;
                    }

                    return `${baseClasses} ${
                      isActive
                        ? "bg-gray-900 font-medium text-white"
                        : "font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`;
                  }}
                >
                  <Icon
                    size={18}
                    className="shrink-0"
                    aria-hidden="true"
                  />

                  <span className="min-w-0 break-words">
                    {item.label}
                  </span>
                </NavLink>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="shrink-0 space-y-2 border-t border-gray-200 bg-white p-3">
          <button
            type="button"
            onClick={() => setIsSignOutModalOpen(true)}
            className="flex w-full min-w-0 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-red-50 hover:text-red-600"
          >
            <LogOut size={18} className="shrink-0" />

            <span>Sign Out</span>
          </button>

          <p className="break-words px-3 text-xs text-gray-400">
            Teacher Management Portal
          </p>
        </div>
      </aside>

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