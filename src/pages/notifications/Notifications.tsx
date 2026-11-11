import { useMemo, useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  Bell,
  Check,
  CheckCheck,
  Clock,
  Info,
  Megaphone,
  FileText,
  CalendarDays,
} from "lucide-react";
import { announcementService } from "../../services/announcementService";
import { mcqAssessmentService } from "../../services/mcqAssessmentService";
import { liveClassService } from "../../services/liveClassService";
import { notesService } from "../../services/notesService";

type NotificationType =
  | "Announcement"
  | "Assessment"
  | "Attendance"
  | "Material"
  | "Calendar"
  | "System";

type Notification = {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  date: string;
  time: string;
  read: boolean;
};

const READ_KEY = "dudex_read_notifications";
const DISMISSED_KEY = "dudex_dismissed_notifications";

// Read/dismissed marks are a per-browser display preference, kept per teacher.
function getStoredIds(key: string, userId: string): string[] {
  try {
    const raw = localStorage.getItem(`${key}:${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

function saveIds(key: string, userId: string, ids: string[]): void {
  try {
    localStorage.setItem(`${key}:${userId}`, JSON.stringify(ids));
  } catch {
    // Storage unavailable; marks last for this visit only.
  }
}

const notificationIcons: Record<
  NotificationType,
  typeof Bell
> = {
  Announcement: Megaphone,
  Assessment: FileText,
  Attendance: Check,
  Material: FileText,
  Calendar: CalendarDays,
  System: Info,
};

const typeBadgeStyles: Record<
  NotificationType,
  { badge: string; iconBg: string; iconColor: string }
> = {
  Announcement: {
    badge: "bg-amber-50 text-amber-700 border border-amber-200",
    iconBg: "bg-amber-50 border-amber-200",
    iconColor: "text-amber-600",
  },
  Assessment: {
    badge: "bg-blue-50 text-blue-700 border border-blue-200",
    iconBg: "bg-blue-50 border-blue-200",
    iconColor: "text-blue-600",
  },
  Attendance: {
    badge: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    iconBg: "bg-emerald-50 border-emerald-200",
    iconColor: "text-emerald-600",
  },
  Material: {
    badge: "bg-purple-50 text-purple-700 border border-purple-200",
    iconBg: "bg-purple-50 border-purple-200",
    iconColor: "text-purple-600",
  },
  Calendar: {
    badge: "bg-rose-50 text-rose-700 border border-rose-200",
    iconBg: "bg-rose-50 border-rose-200",
    iconColor: "text-rose-600",
  },
  System: {
    badge: "bg-gray-100 text-gray-700 border border-gray-200",
    iconBg: "bg-gray-100 border-gray-200",
    iconColor: "text-gray-600",
  },
};

export default function Notifications() {
  const { user } = useAuth();
  const userId = user?.id || "";
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readIds, setReadIds] = useState<string[]>(() => getStoredIds(READ_KEY, userId));
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => getStoredIds(DISMISSED_KEY, userId));
  const [_loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLiveNotifications() {
      setLoading(true);
      const items: Notification[] = [];

      try {
        const [annRes, mcqRes, liveRes, noteRes] = await Promise.allSettled([
          announcementService.getAnnouncements(),
          mcqAssessmentService.getAssessments(),
          liveClassService.getLiveClasses(),
          notesService.getNotes(),
        ]);

        if (annRes.status === "fulfilled" && annRes.value.data) {
          annRes.value.data.forEach((a) => {
            items.push({
              id: `ann-${a.id}`,
              title: a.title,
              message: a.content || `Announcement for ${a.className || "all batches"}`,
              type: "Announcement",
              date: a.publishDate ? a.publishDate.split("T")[0] : new Date().toISOString().split("T")[0],
              time: a.publishDate && a.publishDate.includes("T") ? a.publishDate.split("T")[1].substring(0, 5) : "09:00",
              read: readIds.includes(`ann-${a.id}`),
            });
          });
        }

        if (mcqRes.status === "fulfilled" && mcqRes.value.data) {
          mcqRes.value.data.forEach((asmt) => {
            items.push({
              id: `mcq-${asmt.id}`,
              title: asmt.title,
              message: `${asmt.title} scheduled for ${asmt.schedule?.date || "upcoming session"}`,
              type: "Assessment",
              date: asmt.schedule?.date || new Date().toISOString().split("T")[0],
              time: asmt.schedule?.startTime || "10:00",
              read: readIds.includes(`mcq-${asmt.id}`),
            });
          });
        }

        if (liveRes.status === "fulfilled" && liveRes.value.data) {
          liveRes.value.data.forEach((lc) => {
            items.push({
              id: `live-${lc.id}`,
              title: lc.title,
              message: `Live session scheduled for ${lc.scheduledDate} from ${lc.startTime} to ${lc.endTime}`,
              type: "Calendar",
              date: lc.scheduledDate,
              time: lc.startTime ? lc.startTime.substring(0, 5) : "10:00",
              read: readIds.includes(`live-${lc.id}`),
            });
          });
        }

        if (noteRes.status === "fulfilled" && noteRes.value.data) {
          noteRes.value.data.forEach((n) => {
            items.push({
              id: `mat-${n.id}`,
              title: n.title,
              message: `${n.title} published for ${n.subjectName || "Subject"}`,
              type: "Material",
              date: n.createdAt ? n.createdAt.split("T")[0] : new Date().toISOString().split("T")[0],
              time: "10:00",
              read: readIds.includes(`mat-${n.id}`),
            });
          });
        }

      } catch (err) {
        console.error("Failed to load live notifications:", err);
      } finally {
        setNotifications(items);
        setLoading(false);
      }
    }

    // Load once; read/dismissed state is applied when rendering.
    loadLiveNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleNotifications = useMemo(
    () =>
      notifications
        .filter((n) => !dismissedIds.includes(n.id))
        .map((n) => ({ ...n, read: readIds.includes(n.id) })),
    [notifications, readIds, dismissedIds]
  );

  const [filter, setFilter] = useState<
    "All" | "Unread" | "Read"
  >("All");

  const filteredNotifications = useMemo(() => {
    if (filter === "Unread") {
      return visibleNotifications.filter(
        (notification) => !notification.read
      );
    }

    if (filter === "Read") {
      return visibleNotifications.filter(
        (notification) => notification.read
      );
    }

    return visibleNotifications;
  }, [visibleNotifications, filter]);

  const unreadCount = visibleNotifications.filter(
    (notification) => !notification.read
  ).length;

  const readCount = visibleNotifications.filter(
    (notification) => notification.read
  ).length;

  const markAsRead = (id: string) => {
    const next = [...new Set([...readIds, id])];
    setReadIds(next);
    saveIds(READ_KEY, userId, next);
  };

  const markAsUnread = (id: string) => {
    const next = readIds.filter((item) => item !== id);
    setReadIds(next);
    saveIds(READ_KEY, userId, next);
  };

  const markAllAsRead = () => {
    const allIds = visibleNotifications.map((n) => n.id);
    const next = [...new Set([...readIds, ...allIds])];
    setReadIds(next);
    saveIds(READ_KEY, userId, next);
  };

  const clearAll = () => {
    const allIds = visibleNotifications.map((n) => n.id);
    const next = [...new Set([...dismissedIds, ...allIds])];
    setDismissedIds(next);
    saveIds(DISMISSED_KEY, userId, next);
  };

  return (
    <div className="w-full max-w-full p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-900 text-white shadow-xs">
              <Bell size={18} />
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              Notifications
            </h1>

            {unreadCount > 0 && (
              <span className="rounded-full bg-red-500 px-2.5 py-0.5 text-xs font-semibold text-white">
                {unreadCount} unread
              </span>
            )}
          </div>

          <p className="mt-1.5 text-xs sm:text-sm text-gray-500">
            View your latest announcements, assessments, attendance and system notifications.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap shadow-xs"
          >
            <CheckCheck size={16} />
            Mark All as Read
          </button>

          <button
            type="button"
            onClick={clearAll}
            disabled={visibleNotifications.length === 0}
            className="rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap shadow-xs"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setFilter("All")}
          className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-medium transition-all ${
            filter === "All"
              ? "bg-gray-900 text-white shadow-xs"
              : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          All ({visibleNotifications.length})
        </button>

        <button
          type="button"
          onClick={() => setFilter("Unread")}
          className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 ${
            filter === "Unread"
              ? "bg-gray-900 text-white shadow-xs"
              : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          Unread
          {unreadCount > 0 && (
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                filter === "Unread" ? "bg-white/20 text-white" : "bg-red-100 text-red-700"
              }`}
            >
              {unreadCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setFilter("Read")}
          className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-medium transition-all ${
            filter === "Read"
              ? "bg-gray-900 text-white shadow-xs"
              : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          Read ({readCount})
        </button>
      </div>

      {/* Notifications List */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs">
        {filteredNotifications.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {filteredNotifications.map((notification) => {
              const Icon = notificationIcons[notification.type];
              const style = typeBadgeStyles[notification.type] || typeBadgeStyles.System;

              return (
                <div
                  key={notification.id}
                  className={`flex flex-col sm:flex-row items-start gap-3.5 p-4 sm:p-5 transition-colors ${
                    !notification.read ? "bg-[#fffdf9]/70" : "bg-white hover:bg-gray-50/70"
                  }`}
                >
                  {/* Icon & Mobile Header Row */}
                  <div className="flex items-center justify-between w-full sm:w-auto sm:block">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${style.iconBg} ${style.iconColor}`}
                    >
                      <Icon size={19} />
                    </div>

                    <div className="sm:hidden flex items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${style.badge}`}
                      >
                        {notification.type}
                      </span>
                      {!notification.read && (
                        <span className="h-2.5 w-2.5 rounded-full bg-blue-600 ring-2 ring-blue-100" />
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1 w-full">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <h2 className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                          {notification.title}
                        </h2>

                        {!notification.read && (
                          <span className="hidden sm:inline-block h-2 w-2 rounded-full bg-blue-600 shrink-0" />
                        )}
                      </div>

                      <span
                        className={`hidden sm:inline-block shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${style.badge}`}
                      >
                        {notification.type}
                      </span>
                    </div>

                    <p className="mt-1 text-xs sm:text-sm leading-relaxed text-gray-600 break-words">
                      {notification.message}
                    </p>

                    {/* Footer / Meta info */}
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-gray-100">
                      <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-gray-500">
                        <Clock size={13} className="text-gray-400" />
                        <span>{notification.date}</span>
                        <span>•</span>
                        <span>{notification.time}</span>
                      </div>

                      {/* Action Button */}
                      <div>
                        {notification.read ? (
                          <button
                            type="button"
                            onClick={() => markAsUnread(notification.id)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors"
                          >
                            Mark as Unread
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => markAsRead(notification.id)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            <Check size={14} />
                            Mark as Read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
              <Bell size={24} className="text-gray-400" />
            </div>

            <h2 className="mt-4 text-base font-semibold text-gray-900">
              No notifications found
            </h2>

            <p className="mt-1 text-xs sm:text-sm text-gray-500">
              {filter === "All"
                ? "You're all caught up! No notifications to display."
                : `No ${filter.toLowerCase()} notifications found.`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}