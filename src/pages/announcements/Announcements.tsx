import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Archive,
  Calendar,
  Edit,
  Eye,
  Plus,
  Search,
  RotateCcw,
  Trash2,
} from "lucide-react";
import DeleteModal from "../../components/DeleteModal";
import CustomSelect from "../../components/CustomSelect";
import MultiSelectChecklist from "../../components/MultiSelectChecklist";
import { useAuth } from "../../context/AuthContext";
import { announcementService } from "../../services/announcementService";
import { useBatchOptions } from "../../hooks/useBatchOptions";

type AnnouncementPriority = "Low" | "Normal" | "High" | "Urgent";

type AnnouncementStatus =
  | "Published"
  | "Draft"
  | "Archived";

type Announcement = {
  id: string;
  title: string;
  content: string;
  priority: AnnouncementPriority;
  publishDate: string;
  expiryDate: string;
  classId: string;
  className: string;
  batches?: string[];
  subject: string;
  status: AnnouncementStatus;
};

const initialAnnouncements: Announcement[] = [];

export default function Announcements() {
  const { assignments: teacherAssignments } = useAuth();
  const { options: globalBatchOptions } = useBatchOptions();
  const [announcements, setAnnouncements] = useState<Announcement[]>(
    initialAnnouncements
  );

  useEffect(() => {
    announcementService.getAnnouncements().then((res) => {
      if (res.data && res.data.length > 0) {
        setAnnouncements(
          res.data.map((item) => ({
            id: item.id,
            title: item.title,
            content: item.content,
            priority: item.priority,
            publishDate: item.publishDate,
            expiryDate: item.expiryDate,
            classId: item.classId,
            className: item.className,
            batches: item.batches,
            subject: item.subject,
            status: item.status,
          }))
        );
      }
    });
  }, []);

  const [search, setSearch] = useState("");
  
  const [selectedBatches, setSelectedBatches] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] =
    useState<"All" | AnnouncementStatus>("All");
  const [priorityFilter, setPriorityFilter] =
    useState<"All" | AnnouncementPriority>("All");
  const [showArchived, setShowArchived] =
    useState(false);

  const authorizedClassIds = useMemo(
    () =>
      new Set(
        teacherAssignments
          .filter((assignment) => assignment.active)
          .map((assignment) => assignment.classId)
      ), [teacherAssignments]);

  

  const authorizedAnnouncements = useMemo(
    () =>
      authorizedClassIds.size === 0
        ? announcements
        : announcements.filter((announcement) =>
            !announcement.classId || announcement.classId === "all" || authorizedClassIds.has(announcement.classId)
          ),
    [announcements, authorizedClassIds]
  );

  const filteredAnnouncements = useMemo(() => {
    return authorizedAnnouncements.filter(
      (announcement) => {
        const searchText = search.toLowerCase();

        const matchesSearch =
          (announcement.title || "")
            .toLowerCase()
            .includes(searchText) ||
          (announcement.content || "")
            .toLowerCase()
            .includes(searchText) ||
          (announcement.className || "")
            .toLowerCase()
            .includes(searchText) ||
          (announcement.subject || "")
            .toLowerCase()
            .includes(searchText);

        const matchesBatch =
          selectedBatches.length === 0 ||
          selectedBatches.some((b) =>
            (Array.isArray(announcement.batches) && announcement.batches.includes(b)) ||
            announcement.classId === b ||
            (announcement.className || "").toLowerCase().includes(b.toLowerCase())
          );

        const matchesStatus =
          statusFilter === "All" ||
          announcement.status === statusFilter;

        const matchesPriority =
          priorityFilter === "All" ||
          announcement.priority === priorityFilter;

        const matchesArchived =
          showArchived ||
          announcement.status !== "Archived";

        return (
          matchesSearch &&
          matchesBatch &&
          matchesStatus &&
          matchesPriority &&
          matchesArchived
        );
      }
    );
  }, [
    authorizedAnnouncements,
    search,
    statusFilter,
    priorityFilter,
    showArchived,
  ]);

  const archiveAnnouncement = (id: string) => {
    const announcement = announcements.find(
      (item) => item.id === id
    );

    if (!announcement) {
      return;
    }

    const authorized =
      announcement.classId === "all" ||
      teacherAssignments.some(
        (assignment) =>
          assignment.active &&
          assignment.classId === announcement.classId &&
          assignment.subject === announcement.subject
      );

    if (!authorized) {
      alert(
        "You are not authorized to archive this announcement."
      );
      return;
    }

    setAnnouncements((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, status: "Archived" }
          : item
      )
    );
  };

  const restoreAnnouncement = (id: string) => {
    const announcement = announcements.find(
      (item) => item.id === id
    );

    if (!announcement) {
      return;
    }

    const authorized =
      announcement.classId === "all" ||
      teacherAssignments.some(
        (assignment) =>
          assignment.active &&
          assignment.classId === announcement.classId &&
          assignment.subject === announcement.subject
      );

    if (!authorized) {
      alert(
        "You are not authorized to restore this announcement."
      );
      return;
    }

    setAnnouncements((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, status: "Draft" }
          : item
      )
    );
  };

  const [announcementToDelete, setAnnouncementToDelete] = useState<Announcement | null>(null);

  const requestDeleteAnnouncement = (id: string) => {
    const announcement = announcements.find(
      (item) => item.id === id
    );

    if (!announcement) {
      return;
    }

    const authorized =
      announcement.classId === "all" ||
      teacherAssignments.some(
        (assignment) =>
          assignment.active &&
          assignment.classId === announcement.classId &&
          assignment.subject === announcement.subject
      );

    if (!authorized) {
      alert(
        "You are not authorized to delete this announcement."
      );
      return;
    }

    setAnnouncementToDelete(announcement);
  };

  const handleConfirmDelete = () => {
    if (!announcementToDelete) return;

    setAnnouncements((current) =>
      current.filter((item) => item.id !== announcementToDelete.id)
    );
    setAnnouncementToDelete(null);
  };

  return (
    <div className="w-full max-w-full p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Announcements
          </h1>

          <p className="mt-1 text-xs sm:text-sm text-gray-500">
            Manage announcements for your authorized batches and subjects.
          </p>
        </div>

        <Link
          to="/announcements/create"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-xs sm:text-sm font-medium text-white hover:bg-gray-800 transition-colors shrink-0 self-start sm:self-auto whitespace-nowrap"
        >
          <Plus size={17} />
          Create Announcement
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-3.5 sm:p-5 shadow-xs">
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 items-center">
          {/* Search */}
          <div className="relative sm:col-span-2 lg:col-span-2">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Search announcements..."
              className="w-full rounded-xl border border-gray-300 bg-[#fffdf9] py-2.5 pl-9 pr-3 text-xs sm:text-sm outline-none focus:border-gray-900 transition"
            />
          </div>

          {/* Batch Filter */}
          <div className="w-full sm:w-48">
            <MultiSelectChecklist
              values={selectedBatches}
              onChange={setSelectedBatches}
              options={globalBatchOptions}
              placeholder="All Batches"
              allLabel="All Batches"
            />
          </div>

          {/* Status */}
          <CustomSelect
            value={statusFilter}
            onChange={(val) => setStatusFilter(val as "All" | AnnouncementStatus)}
            options={[
              { value: "All", label: "All Status" },
              { value: "Published", label: "Published" },
              { value: "Draft", label: "Draft" },
              { value: "Archived", label: "Archived" },
            ]}
          />

          {/* Priority */}
          <CustomSelect
            value={priorityFilter}
            onChange={(val) => setPriorityFilter(val as "All" | AnnouncementPriority)}
            options={[
              { value: "All", label: "All Priority" },
              { value: "Low", label: "Low" },
              { value: "Normal", label: "Normal" },
              { value: "High", label: "High" },
            ]}
          />

          {/* Archived */}
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) =>
                setShowArchived(e.target.checked)
              }
              className="h-4 w-4"
            />
            Show Archived
          </label>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                  Announcement
                </th>

                <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                  Batch
                </th>

                <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                  Subject
                </th>

                <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                  Priority
                </th>

                <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                  Publish Date
                </th>

                <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                  Expiry Date
                </th>

                <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                  Status
                </th>

                <th className="px-5 py-3 text-right text-xs font-semibold uppercase text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {filteredAnnouncements.map(
                (announcement) => (
                  <tr
                    key={announcement.id}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-medium text-gray-900">
                          {announcement.title}
                        </p>

                        <p className="mt-1 max-w-xs truncate text-sm text-gray-500">
                          {announcement.content}
                        </p>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-sm text-gray-700">
                      {announcement.className}
                    </td>

                    <td className="px-5 py-4 text-sm text-gray-700">
                      {announcement.subject}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                          announcement.priority ===
                          "High"
                            ? "bg-red-100 text-red-700"
                            : announcement.priority ===
                              "Normal"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {announcement.priority}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-sm text-gray-700">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={15} />
                        {announcement.publishDate}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-sm text-gray-700">
                      {announcement.expiryDate ? (
                        <div className="flex items-center gap-1.5">
                          <Calendar size={15} />
                          {
                            announcement.expiryDate
                          }
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                          announcement.status ===
                          "Published"
                            ? "bg-green-100 text-green-700"
                            : announcement.status ===
                              "Draft"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {announcement.status}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/announcements/${announcement.id}`}
                          className="rounded-lg border border-gray-300 p-1.5 text-gray-600 hover:bg-gray-50"
                          title="View"
                        >
                          <Eye size={15} />
                        </Link>

                        {announcement.status !==
                          "Archived" && (
                          <Link
                            to={`/announcements/${announcement.id}/edit`}
                            className="rounded-lg border border-gray-300 p-1.5 text-gray-600 hover:bg-gray-50"
                            title="Edit"
                          >
                            <Edit size={15} />
                          </Link>
                        )}

                        {announcement.status ===
                        "Archived" ? (
                          <button
                            type="button"
                            onClick={() =>
                              restoreAnnouncement(
                                announcement.id
                              )
                            }
                            className="rounded-lg border border-gray-300 p-1.5 text-gray-600 hover:bg-gray-50"
                            title="Restore"
                          >
                            <RotateCcw
                              size={15}
                            />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              archiveAnnouncement(
                                announcement.id
                              )
                            }
                            className="rounded-lg border border-gray-300 p-1.5 text-gray-600 hover:bg-gray-50"
                            title="Archive"
                          >
                            <Archive
                              size={15}
                            />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            requestDeleteAnnouncement(
                              announcement.id
                            )
                          }
                          className="rounded-lg border border-gray-300 p-1.5 text-gray-600 hover:bg-red-50 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}

              {filteredAnnouncements.length ===
                0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-8 text-center text-sm text-gray-500"
                  >
                    No announcements found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DeleteModal
        isOpen={Boolean(announcementToDelete)}
        title="Delete Announcement"
        message={
          announcementToDelete
            ? `Are you sure you want to delete "${announcementToDelete.title}"? This action cannot be undone.`
            : "Are you sure you want to delete this announcement?"
        }
        confirmText="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setAnnouncementToDelete(null)}
      />
    </div>
  );
}