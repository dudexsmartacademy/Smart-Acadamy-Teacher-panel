import { ArrowLeft, Calendar, School, Users } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { classService } from "../../services/classService";
type ClassItem = Awaited<ReturnType<typeof classService.getClassItems>>["data"][number];

export default function ClassDashboard() {
  const { id } = useParams<{ id: string }>();
  const [classItem, setClassItem] = useState<ClassItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadClass() {
      if (!id) {
        setError("Class id is missing.");
        setLoading(false);
        return;
      }

      try {
        const result = await classService.getClassItems();
        setError(result.error);
        setClassItem(result.data.find((item) => item.id === id) || null);
      } catch (error) {
        setError(error instanceof Error ? error.message : "Failed to load class details.");
      } finally {
        setLoading(false);
      }
    }

    void loadClass();
  }, [id]);

  return (
    <div className="space-y-6 p-6">
      <Link
        to="/classes"
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft size={16} />
        Back to Classes
      </Link>

      {loading ? (
        <p className="py-10 text-center text-sm text-gray-500">Loading class details…</p>
      ) : error ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Could not load class details: {error}
        </p>
      ) : !classItem ? (
        <p className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600">
          This class is not available for this account.
        </p>
      ) : (
        <>
          <header className="flex items-start gap-3">
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <School size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{classItem.name}</h1>
              <p className="mt-1 text-sm text-gray-500">
                {[classItem.department, classItem.section, classItem.academicYear, classItem.subject]
                  .filter(Boolean)
                  .join(" · ") || "Additional class details unavailable"}
              </p>
            </div>
          </header>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Users size={16} />
                Students visible to this account
              </div>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {classItem.studentsCount ?? "Unavailable"}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar size={16} />
                Next available schedule
              </div>
              <p className="mt-2 text-lg font-semibold text-gray-900">
                {classItem.classDate || classItem.schedule
                  ? [classItem.classDate, classItem.schedule].filter(Boolean).join(" · ")
                  : "Unavailable"}
              </p>
            </div>
          </div>

          <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Attendance, assessment, and performance metrics are not available from the verified class schema.
          </p>

          <Link
            to="/live-classes"
            className="inline-flex rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            View Live Classes
          </Link>
        </>
      )}
    </div>
  );
}
