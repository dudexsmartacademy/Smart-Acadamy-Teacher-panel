import { useEffect, useState } from "react";
import { liveClassService, type LiveClassItem } from "../../services/liveClassService";

export default function TodaySchedule() {
  const [schedule, setSchedule] = useState<LiveClassItem[]>([]);
  const [loading, setLoading] = useState(true);

  const todayStr = new Date().toISOString().split("T")[0];
  const todayFormatted = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  useEffect(() => {
    liveClassService.getLiveClasses().then(({ data }) => {
      if (data) {
        const todayClasses = data.filter((c) => c.scheduledDate === todayStr);
        setSchedule(todayClasses);
      }
      setLoading(false);
    });
  }, [todayStr]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-200 p-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#9C7449]">{todayFormatted}</p>
          <h3 className="mt-1 font-bold text-gray-900">Today's Schedule</h3>
        </div>
        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600">
          {schedule.length} {schedule.length === 1 ? "session" : "sessions"}
        </span>
      </div>

      <div className="divide-y divide-gray-100">
        {loading ? (
          <div className="p-5 text-center text-xs text-gray-500">Loading schedule...</div>
        ) : schedule.length === 0 ? (
          <div className="p-6 text-center text-xs text-gray-500">No classes scheduled for today</div>
        ) : (
          schedule.map((item, index) => (
            <div key={item.id || index} className="flex items-center gap-4 p-5 transition-colors hover:bg-gray-100">
              <div className={`h-10 w-1 shrink-0 rounded-full ${index === 0 ? "bg-[#B08E67]" : "bg-[#E9DED0]"}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900">
                  {item.subjectName || item.title}
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  {item.className || "Class"}
                </p>
              </div>

              <p className="shrink-0 text-right text-xs font-semibold text-gray-600">
                {item.startTime} - {item.endTime}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}