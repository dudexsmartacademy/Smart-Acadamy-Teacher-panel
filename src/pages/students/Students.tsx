import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import CustomSelect from "../../components/CustomSelect";

type Student = {
  id: string;
  name: string;
  rrn: string;
  college: string;
  department: string;
  section: string;
  classId: string;
  attendance: number;
  averageMark: number;
  grade: string;
  assessmentCompletion: number;
  status: string;
};

const filterOptions = [
  "All",
  "Attendance below threshold",
  "Failed",
  "High performer",
  "Low performer",
  "Incomplete assessments",
];

import { useEffect } from "react";
import { studentService } from "../../services/studentService";
import { teacherService } from "../../services/teacherService";

export default function Students() {
  const [students, setStudents] = useState<Student[]>([]);
  const [_loading, setLoading] = useState(true);
  const [authorizedClassIds, setAuthorizedClassIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [sortField, setSortField] = useState("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  const pageSize = 5;

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [studRes, assignRes] = await Promise.all([
        studentService.getAllStudentsWithMetrics(),
        teacherService.getAssignments(),
      ]);

      if (studRes.data) {
        setStudents(studRes.data);
      }

      if (assignRes.data && assignRes.data.length > 0) {
        setAuthorizedClassIds(assignRes.data.filter((a) => a.active).map((a) => a.classId));
      } else {
        setAuthorizedClassIds([]);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  const authorizedStudents = useMemo(
    () => {
      if (authorizedClassIds.length === 0) {
        return students;
      }
      return students.filter((student) =>
        authorizedClassIds.includes(student.classId)
      );
    },
    [students, authorizedClassIds]
  );

  const filteredStudents = useMemo(() => {
    let result = authorizedStudents.filter((student) => {
      const searchValue = search.toLowerCase();

      const matchesSearch =
        student.name.toLowerCase().includes(searchValue) ||
        student.rrn.toLowerCase().includes(searchValue) ||
        student.college.toLowerCase().includes(searchValue) ||
        student.department.toLowerCase().includes(searchValue);

      if (!matchesSearch) {
        return false;
      }

      switch (filter) {
        case "Attendance below threshold":
          return student.attendance < 75;

        case "Failed":
          return student.grade === "D" || student.grade === "F";

        case "High performer":
          return student.averageMark >= 80;

        case "Low performer":
          return student.averageMark < 60;

        case "Incomplete assessments":
          return student.assessmentCompletion < 100;

        default:
          return true;
      }
    });

    result.sort((a, b) => {
      let first: string | number;
      let second: string | number;

      switch (sortField) {
        case "attendance":
          first = a.attendance;
          second = b.attendance;
          break;

        case "averageMark":
          first = a.averageMark;
          second = b.averageMark;
          break;

        case "grade":
          first = a.grade;
          second = b.grade;
          break;

        case "assessmentCompletion":
          first = a.assessmentCompletion;
          second = b.assessmentCompletion;
          break;

        default:
          first = a.name;
          second = b.name;
      }

      if (typeof first === "string" && typeof second === "string") {
        return sortDirection === "asc"
          ? first.localeCompare(second)
          : second.localeCompare(first);
      }

      return sortDirection === "asc"
        ? Number(first) - Number(second)
        : Number(second) - Number(first);
    });

    return result;
  }, [
    authorizedStudents,
    search,
    filter,
    sortField,
    sortDirection,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredStudents.length / pageSize)
  );

  const currentPage = Math.min(page, totalPages);

  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection((current) =>
        current === "asc" ? "desc" : "asc"
      );
    } else {
      setSortField(field);
      setSortDirection("asc");
    }

    setPage(1);
  };

  const handleExport = () => {
    console.log("Export authorized student list", filteredStudents);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Students
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Students from your authorized classes
          </p>
        </div>

        <button
          type="button"
          onClick={handleExport}
          className="inline-flex w-fit items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <Download size={16} />
          Export
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search student, RRN, college..."
              className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div className="w-full md:w-56">
            <CustomSelect
              value={filter}
              onChange={(val) => {
                setFilter(val);
                setPage(1);
              }}
              options={filterOptions}
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1200px] w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-semibold text-gray-700">
                  Student Name
                </th>

                <th className="px-4 py-3 font-semibold text-gray-700">
                  RRN
                </th>

                <th className="px-4 py-3 font-semibold text-gray-700">
                  College
                </th>

                <th className="px-4 py-3 font-semibold text-gray-700">
                  Department
                </th>

                <th className="px-4 py-3 font-semibold text-gray-700">
                  Section
                </th>

                <th
                  className="cursor-pointer px-4 py-3 font-semibold text-gray-700"
                  onClick={() => handleSort("attendance")}
                >
                  Attendance %
                </th>

                <th
                  className="cursor-pointer px-4 py-3 font-semibold text-gray-700"
                  onClick={() => handleSort("averageMark")}
                >
                  Average Mark
                </th>

                <th
                  className="cursor-pointer px-4 py-3 font-semibold text-gray-700"
                  onClick={() => handleSort("grade")}
                >
                  Grade
                </th>

                <th
                  className="cursor-pointer px-4 py-3 font-semibold text-gray-700"
                  onClick={() =>
                    handleSort("assessmentCompletion")
                  }
                >
                  Assessment Completion
                </th>

                <th className="px-4 py-3 font-semibold text-gray-700">
                  Status
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {paginatedStudents.length > 0 ? (
                paginatedStudents.map((student) => (
                  <tr
                    key={student.id}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-4 py-4">
                      <Link
                        to={`/students/${student.id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {student.name}
                      </Link>
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {student.rrn}
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {student.college}
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {student.department}
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {student.section}
                    </td>

                    <td className="px-4 py-4 font-medium">
                      {student.attendance}%
                    </td>

                    <td className="px-4 py-4">
                      {student.averageMark}
                    </td>

                    <td className="px-4 py-4 font-medium">
                      {student.grade}
                    </td>

                    <td className="px-4 py-4">
                      {student.assessmentCompletion}%
                    </td>

                    <td className="px-4 py-4">
                      <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                        {student.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-10 text-center text-gray-500"
                  >
                    No students found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-gray-200 px-5 py-4">
          <p className="text-sm text-gray-500">
            Showing{" "}
            {filteredStudents.length === 0
              ? 0
              : (currentPage - 1) * pageSize + 1}{" "}
            to{" "}
            {Math.min(
              currentPage * pageSize,
              filteredStudents.length
            )}{" "}
            of {filteredStudents.length}
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
              className="rounded-lg border border-gray-300 p-2 text-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>

            <span className="px-2 text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setPage(currentPage + 1)}
              className="rounded-lg border border-gray-300 p-2 text-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}