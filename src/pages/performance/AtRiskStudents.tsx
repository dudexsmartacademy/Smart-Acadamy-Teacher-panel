import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search } from "lucide-react";
import CustomSelect from "../../components/CustomSelect";
import { studentService } from "../../services/studentService";

type RiskLevel = "At Risk" | "Needs Attention" | "Critical";

type Student = {
  id: string;
  name: string;
  rrn: string;
  classId: string;
  attendance: number;
  assessmentAverage: number;
  riskLevel: RiskLevel;
};

export default function AtRiskStudents() {
  const [attendanceThreshold, setAttendanceThreshold] = useState(75);
  const [assessmentThreshold, setAssessmentThreshold] = useState(60);
  const [condition, setCondition] = useState<"AND" | "OR">("OR");

  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState<"All" | RiskLevel>("All");

  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setIsLoading(true);
      setFetchError(null);
      const res = await studentService.getAllStudentsWithMetrics();
      if (!isMounted) return;
      if (res.error) {
        setFetchError(res.error);
        setAllStudents([]);
      } else {
        // Compute risk level for each student and include all
        const mapped: Student[] = res.data.map((s) => {
          let riskLevel: RiskLevel = "At Risk";
          if (s.attendance < 60 || (s.averageMark > 0 && s.averageMark < 45)) {
            riskLevel = "Critical";
          } else if (
            s.attendance < 70 ||
            (s.averageMark > 0 && s.averageMark < 55)
          ) {
            riskLevel = "Needs Attention";
          }
          return {
            id: s.id,
            name: s.name,
            rrn: s.rrn,
            classId: s.classId,
            attendance: s.attendance,
            assessmentAverage: s.averageMark,
            riskLevel,
          };
        });
        setAllStudents(mapped);
      }
      setIsLoading(false);
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredStudents = useMemo(() => {
    return allStudents.filter((student) => {
      const attendanceCondition = student.attendance < attendanceThreshold;
      const assessmentCondition =
        student.assessmentAverage < assessmentThreshold;

      const isAtRisk =
        condition === "AND"
          ? attendanceCondition && assessmentCondition
          : attendanceCondition || assessmentCondition;

      const matchesSearch =
        student.name.toLowerCase().includes(search.toLowerCase()) ||
        student.rrn.toLowerCase().includes(search.toLowerCase());

      const matchesRisk =
        riskFilter === "All" || student.riskLevel === riskFilter;

      return isAtRisk && matchesSearch && matchesRisk;
    });
  }, [allStudents, attendanceThreshold, assessmentThreshold, condition, search, riskFilter]);

  const criticalCount = filteredStudents.filter(
    (student) => student.riskLevel === "Critical"
  ).length;

  const needsAttentionCount = filteredStudents.filter(
    (student) => student.riskLevel === "Needs Attention"
  ).length;

  const atRiskCount = filteredStudents.filter(
    (student) => student.riskLevel === "At Risk"
  ).length;

  const getRiskClass = (level: RiskLevel) => {
    if (level === "Critical") {
      return "bg-red-100 text-red-700";
    }

    if (level === "Needs Attention") {
      return "bg-yellow-100 text-yellow-700";
    }

    return "bg-orange-100 text-orange-700";
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link
          to="/performance"
          className="mb-4 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={16} />
          Back to Performance
        </Link>

        <h1 className="text-2xl font-bold text-gray-900">
          At-Risk Students
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Identify students who require academic attention.
        </p>
      </div>

      {isLoading && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 text-center text-sm text-gray-500 shadow-sm">
          Loading student data from database...
        </div>
      )}

      {fetchError && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm font-medium text-red-600 shadow-sm">
          Failed to load students: {fetchError}
        </div>
      )}

      {/* Configuration */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Risk Configuration
        </h2>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Attendance Threshold
            </label>

            <input
              type="number"
              min="0"
              max="100"
              value={attendanceThreshold}
              onChange={(e) =>
                setAttendanceThreshold(Number(e.target.value))
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-gray-500"
            />

            <p className="mt-1 text-xs text-gray-500">
              Students below this percentage are considered.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Assessment Average Threshold
            </label>

            <input
              type="number"
              min="0"
              max="100"
              value={assessmentThreshold}
              onChange={(e) =>
                setAssessmentThreshold(Number(e.target.value))
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-gray-500"
            />

            <p className="mt-1 text-xs text-gray-500">
              Students below this percentage are considered.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Condition
            </label>

            <CustomSelect
              value={condition}
              onChange={(val) => setCondition(val as "AND" | "OR")}
              options={[
                { value: "OR", label: "OR — either condition" },
                { value: "AND", label: "AND — both conditions" },
              ]}
            />

            <p className="mt-1 text-xs text-gray-500">
              Choose how attendance and assessment thresholds are combined.
            </p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">
            Critical
          </p>

          <p className="mt-2 text-2xl font-bold text-red-600">
            {criticalCount}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">
            Needs Attention
          </p>

          <p className="mt-2 text-2xl font-bold text-yellow-600">
            {needsAttentionCount}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">
            At Risk
          </p>

          <p className="mt-2 text-2xl font-bold text-orange-600">
            {atRiskCount}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />

          <input
            type="text"
            placeholder="Search student or RRN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 outline-none focus:border-gray-500"
          />
        </div>

        <div className="w-full md:w-56">
          <CustomSelect
            value={riskFilter}
            onChange={(val) => setRiskFilter(val as "All" | RiskLevel)}
            options={[
              { value: "All", label: "All Risk Levels" },
              { value: "Critical", label: "Critical" },
              { value: "Needs Attention", label: "Needs Attention" },
              { value: "At Risk", label: "At Risk" },
            ]}
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-sm font-semibold text-gray-700">
                  Student
                </th>

                <th className="px-5 py-3 text-left text-sm font-semibold text-gray-700">
                  RRN
                </th>

                <th className="px-5 py-3 text-left text-sm font-semibold text-gray-700">
                  Attendance
                </th>

                <th className="px-5 py-3 text-left text-sm font-semibold text-gray-700">
                  Assessment Average
                </th>

                <th className="px-5 py-3 text-left text-sm font-semibold text-gray-700">
                  Risk Level
                </th>

                <th className="px-5 py-3 text-left text-sm font-semibold text-gray-700">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <tr
                    key={student.id}
                    className="border-b border-gray-100 last:border-0"
                  >
                    <td className="px-5 py-4">
                      <Link
                        to={`/students/${student.id}`}
                        className="font-medium text-gray-900 hover:underline"
                      >
                        {student.name}
                      </Link>
                    </td>

                    <td className="px-5 py-4 text-sm text-gray-600">
                      {student.rrn}
                    </td>

                    <td
                      className={`px-5 py-4 text-sm font-medium ${
                        student.attendance <
                        attendanceThreshold
                          ? "text-red-600"
                          : "text-gray-700"
                      }`}
                    >
                      {student.attendance}%
                    </td>

                    <td
                      className={`px-5 py-4 text-sm font-medium ${
                        student.assessmentAverage <
                        assessmentThreshold
                          ? "text-red-600"
                          : "text-gray-700"
                      }`}
                    >
                      {student.assessmentAverage}%
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${getRiskClass(
                          student.riskLevel
                        )}`}
                      >
                        {student.riskLevel}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <Link
                        to={`/students/${student.id}`}
                        className="text-sm font-medium text-gray-700 hover:underline"
                      >
                        View Student
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-sm text-gray-500"
                  >
                    No at-risk students found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}