import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  CalendarCheck,
  FileText,
  Megaphone,
  Users,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { classService } from "../../services/classService";
import { studentService } from "../../services/studentService";
import { notesService } from "../../services/notesService";
import { announcementService } from "../../services/announcementService";
import { mcqAssessmentService } from "../../services/mcqAssessmentService";

type SubjectWorkspace = {
  id: string;
  subject: string;
  classId: string;
  className: string;
  academicYear: string;
  totalStudents: number;
  attendance: number | null;
  assessments: number;
  averageMarks: number | null;
  gradeDistribution: {
    grade: string;
    count: number;
  }[];
  materials: string[];
  announcements: string[];
};

export default function SubjectDashboard() {
  const { assignments: teacherAssignments } = useAuth();
  const { id } = useParams();

  const [workspace, setWorkspace] = useState<SubjectWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function loadWorkspaceData() {
      if (!id) return;
      setLoading(true);
      setLoadError(null);

      try {
        // 1. Resolve subject/class info
        let subjectName = "";
        let className = "";
        let classId = id;
        let academicYear = "";

        const matchedAssignment = teacherAssignments.find(
          (a) => a.id === id || a.classId === id
        );

        if (matchedAssignment) {
          subjectName = matchedAssignment.subject;
          className = matchedAssignment.className;
          classId = matchedAssignment.classId;
          academicYear = matchedAssignment.academicYear || "";
        } else {
          const { data: dbClasses, error } = await classService.getClasses();
          if (error) throw new Error(error);
          const matchedClass = (dbClasses || []).find((c) => c.id === id);
          if (!matchedClass) {
            setWorkspace(null);
            return;
          }
          subjectName = matchedClass.department || matchedClass.name;
          className = matchedClass.name;
          classId = matchedClass.id;
          academicYear = matchedClass.academicYear || "";
        }

        // 2. Fetch students, notes, announcements, and assessments
        const [studentsRes, notesRes, annRes, asmtRes] = await Promise.all([
          studentService.getStudentsByClass(classId),
          notesService.getNotes(classId),
          announcementService.getAnnouncements(),
          mcqAssessmentService.getAssessments({ classId }),
        ]);

        const serviceErrors = [
          studentsRes.error,
          notesRes.error,
          annRes.error,
          asmtRes.error,
        ].filter((error): error is string => Boolean(error));
        if (serviceErrors.length > 0) {
          throw new Error(serviceErrors.join("; "));
        }

        const materialsList: string[] = [];
        notesRes.data.forEach((note) => materialsList.push(note.title));

        const announcementsList: string[] = [];
        annRes.data
          .filter((announcement) => announcement.classId === classId || announcement.classId === "all")
          .forEach((announcement) => announcementsList.push(announcement.title));

        const assessmentCount = asmtRes.data.filter(
          (assessment) =>
            assessment.classInfo.classId === classId ||
            assessment.subjectName?.toLowerCase() === subjectName.toLowerCase()
        ).length;

        setWorkspace({
          id,
          subject: subjectName,
          classId,
          className,
          academicYear,
          totalStudents: studentsRes.data.length,
          attendance: null,
          assessments: assessmentCount,
          averageMarks: null,
          gradeDistribution: [],
          materials: materialsList,
          announcements: announcementsList,
        });
      } catch (err) {
        console.error("Failed to load subject workspace:", err);
        setLoadError(err instanceof Error ? err.message : "Failed to load subject data.");
        setWorkspace(null);
      } finally {
        setLoading(false);
      }
    }

    loadWorkspaceData();
  }, [id, teacherAssignments]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center p-6">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-900 border-t-transparent" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-gray-900">Subject Not Found</h1>
          <p className="mt-2 text-sm text-gray-500">
            {loadError || "The requested subject workspace could not be found or you may not be assigned to it."}
          </p>
          <Link
            to="/subjects"
            className="mt-5 inline-flex rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Back to Subjects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Back */}
      <Link
        to="/subjects"
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft size={16} />
        Back to Subjects
      </Link>

      {/* Header */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-gray-100 p-3">
            <BookOpen
              size={24}
              className="text-gray-700"
            />
          </div>

          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              {workspace.subject}
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              {workspace.className}
            </p>

            {workspace.academicYear && (
              <p className="mt-1 text-sm text-gray-500">
                Academic Year: {workspace.academicYear}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <Users
              size={20}
              className="text-gray-500"
            />

            <div>
              <p className="text-sm text-gray-500">
                Total Students
              </p>

              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {workspace.totalStudents}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <CalendarCheck
              size={20}
              className="text-gray-500"
            />

            <div>
              <p className="text-sm text-gray-500">
                Attendance
              </p>

              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {workspace.attendance === null ? "Not available" : `${workspace.attendance}%`}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Assessments
          </p>

          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {workspace.assessments}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Average Marks
          </p>

          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {workspace.averageMarks === null ? "Not available" : `${workspace.averageMarks}%`}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Class
          </p>

          <p className="mt-1 text-sm font-semibold text-gray-900">
            {workspace.className}
          </p>
        </div>
      </div>

      {/* Grade Distribution */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">
          Grade Distribution
        </h2>

        {workspace.gradeDistribution.length > 0 ? (
          <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-5">
            {workspace.gradeDistribution.map(
            (item) => (
              <div
                key={item.grade}
                className="rounded-lg border border-gray-200 p-4 text-center"
              >
                <p className="text-sm text-gray-500">
                  Grade
                </p>

                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {item.grade}
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  {item.count} students
                </p>
              </div>
            )
          )}
          </div>
        ) : (
          <p className="mt-4 text-sm text-gray-500">
            Grade distribution is not available until live assessment results are connected.
          </p>
        )}
      </div>

      {/* Materials */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <FileText
            size={20}
            className="text-gray-600"
          />

          <h2 className="text-lg font-semibold text-gray-900">
            Materials
          </h2>
        </div>

        <div className="mt-4 space-y-3">
          {workspace.materials.length > 0 ? (
            workspace.materials.map((material) => (
              <div
                key={material}
                className="rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700"
              >
                {material}
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500 py-2">
              No learning materials published for this subject yet.
            </p>
          )}
        </div>
      </div>

      {/* Announcements */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Megaphone
            size={20}
            className="text-gray-600"
          />

          <h2 className="text-lg font-semibold text-gray-900">
            Announcements
          </h2>
        </div>

        <div className="mt-4 space-y-3">
          {workspace.announcements.length > 0 ? (
            workspace.announcements.map((announcement) => (
              <div
                key={announcement}
                className="rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700"
              >
                {announcement}
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500 py-2">
              No announcements published for this subject yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}