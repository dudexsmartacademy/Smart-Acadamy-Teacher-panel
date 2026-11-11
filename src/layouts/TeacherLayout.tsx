import { Navigate, Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { useAuth } from "../context/AuthContext";

export default function TeacherLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#faf7f2] text-sm text-[#554b42]">
        Verifying your account...
      </div>
    );
  }

  if (!user || user.role !== "teacher" || user.status !== "active") {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Admin-issued temporary passwords must be replaced before using the portal.
  if (user.mustChangePassword) {
    return <Navigate to="/reset-password" replace />;
  }

  return (
    <div className="flex min-h-screen w-full min-w-0 max-w-full overflow-x-clip">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Portal Container */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        {/* Header */}
        <Header />

        {/* Page Content */}
        <main className="min-h-0 min-w-0 w-full max-w-full flex-1 overflow-x-clip">
          <Outlet />
        </main>
      </div>
    </div>
  );
}