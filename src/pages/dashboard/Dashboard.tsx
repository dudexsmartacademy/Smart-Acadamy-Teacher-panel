import TeacherInfo from "../../components/dashboard/TeacherInfo";
import TeacherAttendanceCard from "../../components/dashboard/TeacherAttendanceCard";
import TodaySchedule from "../../components/dashboard/TodaySchedule";
import UpcomingAssessments from "../../components/dashboard/UpcomingAssessments";
import RecentAnnouncements from "../../components/dashboard/RecentAnnouncements";
import { useAuth } from "../../context/AuthContext";
import { ShieldCheck } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const teacherName = user?.fullName ? user.fullName.split(" ")[0] : "Faculty";

  const todayFormatted = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#9C7449]">{todayFormatted}</p>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Good morning, {teacherName}</h1>
          <p className="mt-1 text-sm text-gray-500">Your faculty command center for classes, attendance and student progress.</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
        <TeacherInfo />
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E9DED0] text-[#9C7449]"><ShieldCheck size={18} /></div>
          <div><p className="text-xs text-gray-500">Access status</p><p className="text-sm font-semibold text-gray-900">Authorized faculty</p></div>
        </div>
      </div>

      {/* Faculty Self-Attendance & 90-Day Course Overview */}
      <TeacherAttendanceCard />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <TodaySchedule />
        <UpcomingAssessments />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <RecentAnnouncements />
      </div>
    </div>
  );
}