import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";

interface AnnouncementItem {
  id: string;
  title: string;
  date: string;
}

export default function RecentAnnouncements() {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    supabase
      .from("announcements")
      .select("id, title, created_at")
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data, error }) => {
        if (!error && data) {
          const formatted = data.map((item) => ({
            id: item.id as string,
            title: item.title as string,
            date: new Date(item.created_at as string).toLocaleDateString("en-US", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }),
          }));
          setAnnouncements(formatted);
        }
        setLoading(false);
      });
  }, []);

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="border-b border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900">
          Recent Announcements
        </h3>
      </div>

      <div className="divide-y divide-gray-100">
        {loading ? (
          <div className="p-5 text-center text-xs text-gray-500">Loading announcements...</div>
        ) : announcements.length === 0 ? (
          <div className="p-6 text-center text-xs text-gray-500">No recent announcements</div>
        ) : (
          announcements.map((announcement) => (
            <div key={announcement.id} className="p-5">
              <p className="text-sm font-medium text-gray-900">
                {announcement.title}
              </p>

              <p className="mt-1 text-xs text-gray-500">
                {announcement.date}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}