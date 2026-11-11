import { useMemo, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Megaphone,
  MessageCircle,
  LifeBuoy,
  StickyNote,
  Plus,
  Search,
  Archive,
  RotateCcw,
  Trash2,
  Eye,
  Edit,
} from "lucide-react";

import DeleteModal from "../../components/DeleteModal";
import { useAuth } from "../../context/AuthContext";
import {
  communicationService,
  type CommunicationItem,
  type CommunicationType,
} from "../../services/communicationService";

const tabs: {
  label: CommunicationType;
  icon: ReactNode;
}[] = [
  {
    label: "Announcements",
    icon: <Megaphone size={18} />,
  },
  {
    label: "Support Requests",
    icon: <LifeBuoy size={18} />,
  },
  {
    label: "Class Discussion",
    icon: <MessageCircle size={18} />,
  },
  {
    label: "Teacher Notes",
    icon: <StickyNote size={18} />,
  },
];

export default function StudentCommunication() {
  const { assignments: teacherAssignments } = useAuth();
  const [activeTab, setActiveTab] =
    useState<CommunicationType>("Announcements");

  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [_loading, setLoading] = useState(true);

  const [announcements, setAnnouncements] = useState<CommunicationItem[]>([]);
  const [supportRequests, setSupportRequests] = useState<CommunicationItem[]>([]);
  const [discussions, setDiscussions] = useState<CommunicationItem[]>([]);
  const [teacherNotes, setTeacherNotes] = useState<CommunicationItem[]>([]);

  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      try {
        const items = await communicationService.getCommunications();
        setAnnouncements(items.filter((i) => i.type === "Announcements"));
        setSupportRequests(items.filter((i) => i.type === "Support Requests"));
        setDiscussions(items.filter((i) => i.type === "Class Discussion"));
        setTeacherNotes(items.filter((i) => i.type === "Teacher Notes"));
      } catch (err) {
        console.error("Failed to load communications:", err);
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, []);

  const getItems = (): CommunicationItem[] => {
    switch (activeTab) {
      case "Announcements":
        return announcements;

      case "Support Requests":
        return supportRequests;

      case "Class Discussion":
        return discussions;

      case "Teacher Notes":
        return teacherNotes;

      default:
        return [];
    }
  };

  const setItems = (
    items: CommunicationItem[]
  ) => {
    switch (activeTab) {
      case "Announcements":
        setAnnouncements(items);
        break;

      case "Support Requests":
        setSupportRequests(items);
        break;

      case "Class Discussion":
        setDiscussions(items);
        break;

      case "Teacher Notes":
        setTeacherNotes(items);
        break;
    }
  };

  const authorizedItems = useMemo(() => {
    const activeAssignments = teacherAssignments.filter(
      (assignment) => assignment.active
    );

    if (activeAssignments.length === 0) {
      return getItems();
    }

    return getItems().filter((item) =>
      activeAssignments.some(
        (assignment) =>
          assignment.classId === item.classId ||
          assignment.className === item.className ||
          assignment.subject === item.subject ||
          item.classId === "all" ||
          item.className === "All Batches"
      )
    );
  }, [
    activeTab,
    announcements,
    supportRequests,
    discussions,
    teacherNotes,
    teacherAssignments,
  ]);

  const filteredItems = authorizedItems.filter((item) => {
    if (!showArchived && item.archived) {
      return false;
    }

    if (showArchived && !item.archived) {
      return false;
    }

    const value = `${item.title} ${item.content} ${
      item.className
    } ${item.subject} ${item.student ?? ""}`.toLowerCase();

    return value.includes(search.toLowerCase());
  });

  const handleArchive = async (id: number | string) => {
    const item = getItems().find(
      (communication) => String(communication.id) === String(id)
    );

    if (!item) {
      return;
    }

    await communicationService.updateCommunication(id, {
      archived: true,
      status: "Archived",
    });

    const updatedItems = getItems().map((communication) =>
      String(communication.id) === String(id)
        ? {
            ...communication,
            archived: true,
            status: "Archived",
          }
        : communication
    );

    setItems(updatedItems);
  };

  const handleRestore = async (id: number | string) => {
    const item = getItems().find(
      (communication) => String(communication.id) === String(id)
    );

    if (!item) {
      return;
    }

    const restoredStatus =
      item.status === "Archived"
        ? item.student
          ? "Open"
          : "Published"
        : item.status;

    await communicationService.updateCommunication(id, {
      archived: false,
      status: restoredStatus,
    });

    const updatedItems = getItems().map((communication) =>
      String(communication.id) === String(id)
        ? {
            ...communication,
            archived: false,
            status: restoredStatus,
          }
        : communication
    );

    setItems(updatedItems);
  };

  const [commToDelete, setCommToDelete] = useState<CommunicationItem | null>(null);

  const requestDelete = (id: number | string) => {
    const item = getItems().find(
      (communication) => String(communication.id) === String(id)
    );

    if (!item) {
      return;
    }

    setCommToDelete(item);
  };

  const handleConfirmDelete = async () => {
    if (!commToDelete) return;

    await communicationService.deleteCommunication(commToDelete.id);

    const updatedItems = getItems().filter(
      (communication) => String(communication.id) !== String(commToDelete.id)
    );

    setItems(updatedItems);
    setCommToDelete(null);
  };

  const handleCreate = () => {
    window.location.href = `/communication/create?type=${encodeURIComponent(
      activeTab
    )}`;
  };

  const getIcon = () => {
    switch (activeTab) {
      case "Announcements":
        return <Megaphone size={20} />;

      case "Support Requests":
        return <LifeBuoy size={20} />;

      case "Class Discussion":
        return <MessageCircle size={20} />;

      case "Teacher Notes":
        return <StickyNote size={20} />;

      default:
        return <MessageCircle size={20} />;
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Student Communication
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Manage controlled communication with students.
          </p>
        </div>

        <button
          type="button"
          onClick={handleCreate}
          className="flex w-fit items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
        >
          <Plus size={18} />

          Create{" "}
          {activeTab === "Teacher Notes"
            ? "Note"
            : activeTab}
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-6 overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.label}
              type="button"
              onClick={() => {
                setActiveTab(tab.label);
                setSearch("");
              }}
              className={`flex items-center gap-2 border-b-2 px-5 py-4 text-sm font-medium ${
                activeTab === tab.label
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search and Archive Filter */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative max-w-md">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              placeholder={`Search ${activeTab.toLowerCase()}...`}
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-gray-500"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowArchived(!showArchived)}
            className={`flex w-fit items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium ${
              showArchived
                ? "border-gray-900 bg-gray-900 text-white"
                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Archive size={17} />

            {showArchived
              ? "Showing Archived"
              : "Show Archived"}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white py-16 text-center">
            <MessageCircle
              size={40}
              className="mx-auto text-gray-300"
            />

            <p className="mt-3 text-sm text-gray-500">
              No {showArchived ? "archived " : ""}
              {activeTab.toLowerCase()} found.
            </p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                {/* Communication Information */}
                <div className="flex min-w-0 gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                    {getIcon()}
                  </div>

                  <div className="min-w-0">
                    <h2 className="font-semibold text-gray-900">
                      {item.title}
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-gray-600">
                      {item.content}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                      <span className="rounded-md bg-gray-100 px-2 py-1">
                        {item.className}
                      </span>

                      <span className="rounded-md bg-gray-100 px-2 py-1">
                        {item.subject}
                      </span>

                      {item.student && (
                        <span className="rounded-md bg-gray-100 px-2 py-1">
                          Student: {item.student}
                        </span>
                      )}

                      <span className="rounded-md bg-gray-100 px-2 py-1">
                        {item.date}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status and Actions */}
                <div className="flex flex-col gap-3 lg:items-end">
                  <span
                    className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${
                      item.status === "Open"
                        ? "bg-yellow-50 text-yellow-700"
                        : item.status === "Resolved"
                          ? "bg-green-50 text-green-700"
                          : item.status === "Active"
                            ? "bg-blue-50 text-blue-700"
                            : item.status === "Private"
                              ? "bg-gray-100 text-gray-700"
                              : item.status === "Archived"
                                ? "bg-gray-200 text-gray-600"
                                : "bg-green-50 text-green-700"
                    }`}
                  >
                    {item.status}
                  </span>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      to={`/communication/${item.id}`}
                      className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <Eye size={15} />
                      View
                    </Link>

                    {!item.archived &&
                      item.status !== "Private" && (
                        <Link
                          to={`/communication/${item.id}/edit`}
                          className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          <Edit size={15} />
                          Edit
                        </Link>
                      )}

                    {!item.archived ? (
                      <button
                        type="button"
                        onClick={() =>
                          handleArchive(item.id)
                        }
                        className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        <Archive size={15} />
                        Archive
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          handleRestore(item.id)
                        }
                        className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        <RotateCcw size={15} />
                        Restore
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        requestDelete(item.id)
                      }
                      className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition"
                    >
                      <Trash2 size={15} />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={!!commToDelete}
        onClose={() => setCommToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Communication"
        itemName={commToDelete ? `${commToDelete.title} (${commToDelete.className})` : undefined}
        message="Are you sure you want to delete this communication entry? This action cannot be undone."
      />
    </div>
  );
}