import { useState, useEffect, useMemo } from "react";
import {
  ArrowRight,
  BookOpen,
  FileText,
  FolderOpen,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { classService } from "../../services/classService";
import { mcqAssessmentService } from "../../services/mcqAssessmentService";

type SubjectCard = {
  id: string;
  name: string;
  className: string;
  students: number | null;
  attendance: string | null;
  averageMarks: string | null;
  assessments: number;
};

export default function Subjects() {
  const { assignments: teacherAssignments } = useAuth();
  const [dbClasses, setDbClasses] = useState<{ id: string; name: string; department: string }[]>([]);
  const [assessmentCounts, setAssessmentCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setLoadError(null);
      try {
        const [clsRes, asmtRes] = await Promise.all([
          classService.getClasses(),
          mcqAssessmentService.getAssessments(),
        ]);

        if (clsRes.error) throw new Error(clsRes.error);
        if (asmtRes.error) throw new Error(asmtRes.error);
        setDbClasses(clsRes.data);

        const counts: Record<string, number> = {};
        asmtRes.data.forEach((assessment) => {
          const key = assessment.subjectId || assessment.subjectName;
          if (key) counts[key] = (counts[key] || 0) + 1;
        });
        setAssessmentCounts(counts);
      } catch (err) {
        console.error("Failed to load subjects data:", err);
        setLoadError(err instanceof Error ? err.message : "Failed to load subject data.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const subjects: SubjectCard[] = useMemo(() => {
    const list: SubjectCard[] = [];

    if (teacherAssignments.length > 0) {
      teacherAssignments.forEach((a) => {
        list.push({
          id: a.id || a.classId,
          name: a.subject || "Subject not listed",
          className: a.className,
          students: null,
          attendance: null,
          averageMarks: null,
          assessments: assessmentCounts[a.subject] || assessmentCounts[a.id] || 0,
        });
      });
    } else if (dbClasses.length > 0) {
      dbClasses.forEach((c) => {
        list.push({
          id: c.id,
          name: c.department || c.name,
          className: c.name,
          students: null,
          attendance: null,
          averageMarks: null,
          assessments: assessmentCounts[c.id] || 0,
        });
      });
    }

    return list;
  }, [teacherAssignments, dbClasses, assessmentCounts]);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Subjects
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Manage your assigned subject workspaces.
        </p>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-900 border-t-transparent" />
        </div>
      ) : loadError ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-sm text-red-800">
          Could not load subjects: {loadError}
        </div>
      ) : subjects.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <BookOpen size={40} className="mx-auto text-gray-400 mb-3" />
          <h3 className="text-base font-semibold text-gray-900">No Subjects Assigned Yet</h3>
          <p className="mt-1 text-sm text-gray-500 max-w-md mx-auto">
            Once faculty class allocations and subjects are configured in the Admin panel, your assigned subject workspaces will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {subjects.map((subject) => (
            <div
              key={subject.id}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:border-gray-300 transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                  <BookOpen
                    size={20}
                    className="text-gray-600"
                  />
                </div>

                <Link
                  to={`/subjects/${subject.id}`}
                  className="flex h-9 items-center gap-2 rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  View
                  <ArrowRight size={15} />
                </Link>
              </div>

              <h2 className="mt-5 text-lg font-semibold text-gray-900">
                {subject.name}
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                {subject.className}
              </p>

              <div className="mt-5 grid grid-cols-2 gap-4">
                <Metric
                  icon={<Users size={16} />}
                  label="Students"
                  value={subject.students === null ? "Not available" : subject.students.toString()}
                />

                <Metric
                  icon={<BookOpen size={16} />}
                  label="Attendance"
                  value={subject.attendance ?? "Not available"}
                />

                <Metric
                  icon={<FileText size={16} />}
                  label="Assessments"
                  value={subject.assessments.toString()}
                />

                <Metric
                  icon={<FolderOpen size={16} />}
                  label="Average Marks"
                  value={subject.averageMarks ?? "Not available"}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-gray-400">
        {icon}

        <span className="text-xs">
          {label}
        </span>
      </div>

      <p className="mt-1 text-sm font-semibold text-gray-900">
        {value}
      </p>
    </div>
  );
}