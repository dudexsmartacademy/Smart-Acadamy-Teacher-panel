import {
  BarChart3,
  GraduationCap,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import CustomSelect from "../../components/CustomSelect";
import { studentService } from "../../services/studentService";
import { classService } from "../../services/classService";

export default function Performance() {
  const [batch, setBatch] = useState("All Batches");
  const [subject, setSubject] = useState("All Subjects");
  const [academicYear, setAcademicYear] = useState("Current Academic Year");

  const [students, setStudents] = useState<Array<{
    id: string;
    name: string;
    rrn: string;
    classId: string;
    department: string;
    attendance: number;
    averageMark: number;
    grade: string;
    assessmentCompletion: number;
  }>>([]);
  const [batchesList, setBatchesList] = useState<string[]>([]);
  const [subjectsList, setSubjectsList] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setIsLoading(true);
      setFetchError(null);
      const [studentsRes, classesRes, subjectsRes] = await Promise.all([
        studentService.getAllStudentsWithMetrics(),
        classService.getClasses(),
        classService.getSubjects(),
      ]);

      if (!isMounted) return;

      if (studentsRes.error) {
        setFetchError(studentsRes.error);
      } else {
        setStudents(studentsRes.data);
      }

      if (classesRes.data) {
        const uniqueBatches = [...new Set(classesRes.data.map(c => c.name))].filter(Boolean);
        setBatchesList(uniqueBatches);
      }
      if (subjectsRes.data) {
        setSubjectsList(subjectsRes.data.map(s => s.name));
      }

      setIsLoading(false);
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredStudents = useMemo(() => {
    return students;
  }, [students]);

  const classAverage = useMemo(() => {
    if (filteredStudents.length === 0) return 0;
    const total = filteredStudents.reduce((sum, s) => sum + s.averageMark, 0);
    return Math.round(total / filteredStudents.length);
  }, [filteredStudents]);

  const subjectAverage = classAverage;

  const assessmentCompletion = useMemo(() => {
    if (filteredStudents.length === 0) return 0;
    const total = filteredStudents.reduce((sum, s) => sum + s.assessmentCompletion, 0);
    return Math.round(total / filteredStudents.length);
  }, [filteredStudents]);

  const scoreDistribution = useMemo(() => {
    const buckets = [
      { range: "0–39", min: 0, max: 39, students: 0 },
      { range: "40–49", min: 40, max: 49, students: 0 },
      { range: "50–59", min: 50, max: 59, students: 0 },
      { range: "60–69", min: 60, max: 69, students: 0 },
      { range: "70–79", min: 70, max: 79, students: 0 },
      { range: "80–89", min: 80, max: 89, students: 0 },
      { range: "90–100", min: 90, max: 100, students: 0 },
    ];
    filteredStudents.forEach(s => {
      const b = buckets.find(b => s.averageMark >= b.min && s.averageMark <= b.max);
      if (b) b.students++;
    });
    return buckets;
  }, [filteredStudents]);

  const gradeDistribution = useMemo(() => {
    const grades = ["A+", "A", "B+", "B", "C", "D", "F"];
    const map: Record<string, number> = { "A+": 0, "A": 0, "B+": 0, "B": 0, "C": 0, "D": 0, "F": 0 };
    filteredStudents.forEach(s => {
      if (map[s.grade] !== undefined) {
        map[s.grade]++;
      }
    });
    return grades.map(g => ({ grade: g, students: map[g] }));
  }, [filteredStudents]);

  const attendancePerformance = useMemo(() => {
    const groups = [
      { range: "Below 60%", min: 0, max: 59 },
      { range: "60–69%", min: 60, max: 69 },
      { range: "70–79%", min: 70, max: 79 },
      { range: "80–89%", min: 80, max: 89 },
      { range: "90–100%", min: 90, max: 100 },
    ];

    return groups.map(g => {
      const matched = filteredStudents.filter(s => s.attendance >= g.min && s.attendance <= g.max);
      const avg = matched.length > 0 ? Math.round(matched.reduce((sum, s) => sum + s.averageMark, 0) / matched.length) : 0;
      const attAvg = matched.length > 0 ? Math.round(matched.reduce((sum, s) => sum + s.attendance, 0) / matched.length) : Math.round((g.min + g.max) / 2);
      return {
        range: g.range,
        attendance: attAvg,
        average: avg,
      };
    });
  }, [filteredStudents]);

  const topPerformers = useMemo(() => {
    return [...filteredStudents]
      .filter(s => s.averageMark > 0)
      .sort((a, b) => b.averageMark - a.averageMark)
      .slice(0, 4)
      .map(s => ({
        name: s.name,
        rrn: s.rrn,
        average: s.averageMark,
        attendance: s.attendance,
        grade: s.grade,
      }));
  }, [filteredStudents]);

  const lowPerformers = useMemo(() => {
    return [...filteredStudents]
      .filter(s => s.averageMark > 0 && s.averageMark < 60)
      .sort((a, b) => a.averageMark - b.averageMark)
      .slice(0, 4)
      .map(s => ({
        name: s.name,
        rrn: s.rrn,
        average: s.averageMark,
        attendance: s.attendance,
        grade: s.grade,
      }));
  }, [filteredStudents]);

  const atRiskStudents = useMemo(() => {
    return filteredStudents
      .filter(s => s.attendance < 75 || (s.averageMark > 0 && s.averageMark < 60))
      .map(s => {
        let level = "At Risk";
        if (s.attendance < 60 || (s.averageMark > 0 && s.averageMark < 45)) {
          level = "Critical";
        } else if (s.attendance < 70 || (s.averageMark > 0 && s.averageMark < 55)) {
          level = "Needs Attention";
        }
        return {
          name: s.name,
          rrn: s.rrn,
          attendance: s.attendance,
          assessmentAverage: s.averageMark,
          level,
        };
      });
  }, [filteredStudents]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Performance Analytics
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Analyze class, subject and student performance
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          <CustomSelect
            value={batch}
            onChange={(val) => setBatch(val)}
            options={[
              { value: "All Batches", label: "All Batches" },
              ...batchesList.map((b) => ({ value: b, label: b })),
            ]}
          />

          <CustomSelect
            value={subject}
            onChange={(val) => setSubject(val)}
            options={[
              { value: "All Subjects", label: "All Subjects" },
              ...subjectsList.map((s) => ({ value: s, label: s })),
            ]}
          />

          <CustomSelect
            value={academicYear}
            onChange={(val) => setAcademicYear(val)}
            options={[
              { value: "Current Academic Year", label: "Current Academic Year" },
              { value: "2025–2026", label: "2025–2026" },
              { value: "2026–2027", label: "2026–2027" },
            ]}
            containerClassName="sm:col-span-2 md:col-span-1"
          />
        </div>
      </div>

      {isLoading && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 text-center text-sm text-gray-500 shadow-sm">
          Loading performance analytics from database...
        </div>
      )}

      {fetchError && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm font-medium text-red-600 shadow-sm">
          Failed to load analytics: {fetchError}
        </div>
      )}

      {/* Summary Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-50 p-2.5 text-blue-600">
              <Users size={20} />
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Class Average
              </p>

              <p className="text-2xl font-bold text-gray-900">
                {classAverage}%
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-50 p-2.5 text-green-600">
              <GraduationCap size={20} />
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Subject Average
              </p>

              <p className="text-2xl font-bold text-gray-900">
                {subjectAverage}%
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-50 p-2.5 text-purple-600">
              <BarChart3 size={20} />
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Assessment Completion
              </p>

              <p className="text-2xl font-bold text-gray-900">
                {assessmentCompletion}%
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-red-50 p-2.5 text-red-600">
              <TrendingDown size={20} />
            </div>

            <div>
              <p className="text-sm text-gray-500">
                At-Risk Students
              </p>

              <p className="text-2xl font-bold text-gray-900">
                {atRiskStudents.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Score Distribution */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <BarChart3
            size={20}
            className="text-blue-600"
          />

          <h2 className="font-semibold text-gray-900">
            Score Distribution
          </h2>
        </div>

        <div className="space-y-4">
          {scoreDistribution.map((item) => (
            <div
              key={item.range}
              className="flex items-center gap-4"
            >
              <span className="w-20 text-sm text-gray-600">
                {item.range}
              </span>

              <div className="h-8 flex-1 overflow-hidden rounded-lg bg-gray-100">
                <div
                  className="flex h-full items-center rounded-lg bg-blue-500 px-3 text-xs font-medium text-white"
                  style={{
                    width: `${Math.max(
                      item.students * 1.2,
                      8
                    )}%`,
                  }}
                >
                  {item.students}
                </div>
              </div>

              <span className="w-16 text-right text-sm font-medium text-gray-700">
                {item.students}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Grade Distribution */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <GraduationCap
            size={20}
            className="text-blue-600"
          />

          <h2 className="font-semibold text-gray-900">
            Grade Distribution
          </h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {gradeDistribution.map((item) => (
            <div
              key={item.grade}
              className="rounded-lg border border-gray-200 p-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">
                  Grade {item.grade}
                </span>

                <span className="text-lg font-bold text-gray-900">
                  {item.students}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Attendance vs Performance */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <TrendingUp
            size={20}
            className="text-blue-600"
          />

          <h2 className="font-semibold text-gray-900">
            Attendance vs Performance
          </h2>
        </div>

        <div className="space-y-4">
          {attendancePerformance.map((item) => (
            <div key={item.range}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-gray-600">
                  {item.range}
                </span>

                <span className="font-medium text-gray-900">
                  Average: {item.average}%
                </span>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-green-500"
                  style={{
                    width: `${item.average}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Performers */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900">
            Top Performers
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                  Student
                </th>

                <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                  RRN
                </th>

                <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                  Average
                </th>

                <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                  Attendance
                </th>

                <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                  Grade
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {topPerformers.map((student) => (
                <tr key={student.rrn}>
                  <td className="px-5 py-4 font-medium text-gray-900">
                    {student.name}
                  </td>

                  <td className="px-5 py-4 text-sm text-gray-600">
                    {student.rrn}
                  </td>

                  <td className="px-5 py-4 text-sm font-medium text-gray-900">
                    {student.average}%
                  </td>

                  <td className="px-5 py-4 text-sm text-gray-600">
                    {student.attendance}%
                  </td>

                  <td className="px-5 py-4">
                    <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                      {student.grade}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Low Performers */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900">
            Low Performers
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                  Student
                </th>

                <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                  RRN
                </th>

                <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                  Average
                </th>

                <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                  Attendance
                </th>

                <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                  Grade
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {lowPerformers.map((student) => (
                <tr key={student.rrn}>
                  <td className="px-5 py-4 font-medium text-gray-900">
                    {student.name}
                  </td>

                  <td className="px-5 py-4 text-sm text-gray-600">
                    {student.rrn}
                  </td>

                  <td className="px-5 py-4 text-sm font-medium text-red-600">
                    {student.average}%
                  </td>

                  <td className="px-5 py-4 text-sm text-gray-600">
                    {student.attendance}%
                  </td>

                  <td className="px-5 py-4">
                    <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
                      {student.grade}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* At Risk */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900">
            At-Risk Students
          </h2>
          <Link
  to="/performance/at-risk"
  className="text-sm font-medium text-gray-700 hover:underline"
>
  View All At-Risk Students
</Link>

          <p className="mt-1 text-sm text-gray-500">
            Students requiring attention based on attendance
            and assessment performance
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                  Student
                </th>

                <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                  RRN
                </th>

                <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                  Attendance
                </th>

                <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                  Assessment Average
                </th>

                <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">
                  Level
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {atRiskStudents.map((student) => (
                <tr key={student.rrn}>
                  <td className="px-5 py-4 font-medium text-gray-900">
                    {student.name}
                  </td>

                  <td className="px-5 py-4 text-sm text-gray-600">
                    {student.rrn}
                  </td>

                  <td className="px-5 py-4 text-sm text-gray-600">
                    {student.attendance}%
                  </td>

                  <td className="px-5 py-4 text-sm text-gray-600">
                    {student.assessmentAverage}%
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        student.level === "Critical"
                          ? "bg-red-50 text-red-700"
                          : student.level ===
                            "Needs Attention"
                          ? "bg-yellow-50 text-yellow-700"
                          : "bg-orange-50 text-orange-700"
                      }`}
                    >
                      {student.level}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}