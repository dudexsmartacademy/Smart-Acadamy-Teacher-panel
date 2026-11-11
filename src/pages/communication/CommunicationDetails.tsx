import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Megaphone,
  MessageCircle,
  LifeBuoy,
  StickyNote,
  Edit,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  communicationService,
  type CommunicationItem,
} from "../../services/communicationService";

export default function CommunicationDetails() {
  const { assignments: teacherAssignments } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();

  const [communication, setCommunication] = useState<CommunicationItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadItem() {
      if (!id) return;
      setLoading(true);
      try {
        const item = await communicationService.getCommunicationById(id);
        setCommunication(item);
      } catch (err) {
        console.error("Failed to load communication:", err);
      } finally {
        setLoading(false);
      }
    }
    loadItem();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center p-6">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-900 border-t-transparent" />
      </div>
    );
  }

  if (!communication) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-gray-900">
            Communication Not Found
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            The requested communication could not be found.
          </p>

          <button
            type="button"
            onClick={() => navigate("/communication")}
            className="mt-5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Back to Communication
          </button>
        </div>
      </div>
    );
  }

  const isAuthorized =
    teacherAssignments.length === 0 ||
    communication.classId === "all" ||
    communication.className === "All Batches" ||
    teacherAssignments.some(
      (assignment) =>
        assignment.active &&
        (assignment.classId === communication.classId ||
          assignment.className === communication.className ||
          assignment.subject === communication.subject)
    );

  if (!isAuthorized) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-red-700">
            Access Denied
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            You are not authorized to view this communication.
          </p>

          <button
            type="button"
            onClick={() => navigate("/communication")}
            className="mt-5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Back to Communication
          </button>
        </div>
      </div>
    );
  }

  const getIcon = () => {
    switch (communication.type) {
      case "Announcements":
        return <Megaphone size={22} />;

      case "Support Requests":
        return <LifeBuoy size={22} />;

      case "Class Discussion":
        return <MessageCircle size={22} />;

      case "Teacher Notes":
        return <StickyNote size={22} />;

      default:
        return <MessageCircle size={22} />;
    }
  };

  const getStatusClass = () => {
    switch (communication.status) {
      case "Open":
        return "bg-yellow-50 text-yellow-700";

      case "Resolved":
        return "bg-green-50 text-green-700";

      case "Active":
        return "bg-blue-50 text-blue-700";

      case "Private":
        return "bg-gray-100 text-gray-700";

      case "Published":
        return "bg-green-50 text-green-700";

      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/communication"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
          >
            <ArrowLeft size={18} />
          </Link>

          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Communication Details
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              View communication information.
            </p>
          </div>
        </div>

        {communication.type !== "Teacher Notes" && (
          <Link
            to={`/communication/${communication.id}/edit`}
            className="flex w-fit items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            <Edit size={17} />
            Edit
          </Link>
        )}
      </div>

      {/* Main Card */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* Title Section */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
                {getIcon()}
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500">
                  {communication.type}
                </p>

                <h2 className="mt-1 text-xl font-semibold text-gray-900">
                  {communication.title}
                </h2>
              </div>
            </div>

            <span
              className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${getStatusClass()}`}
            >
              {communication.status}
            </span>
          </div>
        </div>

        {/* Information */}
        <div className="grid gap-6 p-6 md:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Class
            </p>

            <p className="mt-1 text-sm font-medium text-gray-900">
              {communication.className}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Subject
            </p>

            <p className="mt-1 text-sm font-medium text-gray-900">
              {communication.subject}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Date
            </p>

            <p className="mt-1 text-sm font-medium text-gray-900">
              {communication.date}
            </p>
          </div>

          {communication.student && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Student
              </p>

              <p className="mt-1 text-sm font-medium text-gray-900">
                {communication.student}
              </p>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="border-t border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900">
            Content
          </h3>

          <div className="mt-3 rounded-lg bg-gray-50 p-4">
            <p className="whitespace-pre-wrap text-sm leading-7 text-gray-700">
              {communication.content}
            </p>
          </div>
        </div>

        {/* Access Information */}
        <div className="border-t border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900">
            Communication Information
          </h3>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-gray-200 p-4">
              <p className="text-xs text-gray-500">
                Communication Type
              </p>

              <p className="mt-1 text-sm font-medium text-gray-900">
                {communication.type}
              </p>
            </div>

            <div className="rounded-lg border border-gray-200 p-4">
              <p className="text-xs text-gray-500">
                Current Status
              </p>

              <p className="mt-1 text-sm font-medium text-gray-900">
                {communication.status}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}