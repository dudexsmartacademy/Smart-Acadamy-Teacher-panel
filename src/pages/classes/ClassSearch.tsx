import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { teacherService } from "../../services/teacherService";
import { classService } from "../../services/classService";
import { CustomSelect } from "../../components/CustomSelect";

export default function ClassSearch() {
  const [college, setCollege] = useState("");
  const [department, setDepartment] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [batch, setBatch] = useState("");
  const [section, setSection] = useState("");
  const [academicYear, setAcademicYear] = useState("");

  const [authorizedClasses, setAuthorizedClasses] = useState<Array<{
    classId: string;
    className: string;
    subject: string;
    academicYear: string;
    department?: string;
    active: boolean;
  }>>([]);

  useEffect(() => {
    async function load() {
      const assignRes = await teacherService.getAssignments();
      if (assignRes.data && assignRes.data.length > 0) {
        setAuthorizedClasses(assignRes.data);
      } else {
        const clsRes = await classService.getClasses();
        if (clsRes.data && clsRes.data.length > 0) {
          setAuthorizedClasses(
            clsRes.data.map((c) => ({
              classId: c.id,
              className: c.name,
              subject: "General",
              academicYear: c.academicYear || "2024–2028",
              department: c.department,
              active: true,
            }))
          );
        }
      }
    }
    load();
  }, []);

  const filteredClasses = useMemo(() => {
    return authorizedClasses.filter((assignment) => {
      const matchesDepartment =
        !department
          ? true
          : (assignment.department || assignment.className).toLowerCase().includes(department.toLowerCase());

      const matchesBatch =
        !batch || assignment.academicYear === batch;

      const matchesSection =
        !section ||
        assignment.className.toLowerCase().includes(
          `section ${section.toLowerCase()}`
        );

      const matchesAcademicYear =
        !academicYear || assignment.academicYear === academicYear;

      return (
        matchesDepartment &&
        matchesBatch &&
        matchesSection &&
        matchesAcademicYear
      );
    });
  }, [
    authorizedClasses,
    department,
    batch,
    section,
    academicYear,
  ]);

  const handleSearch = () => {
    console.log("Class search:", {
      college,
      department,
      specialization,
      batch,
      section,
      academicYear,
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Class Search
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Search classes assigned to you
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              College
            </label>

            <CustomSelect
              value={college}
              onChange={(val) => setCollege(String(val))}
              options={[
                { value: "", label: "Select College" },
                { value: "ABC Engineering College", label: "ABC Engineering College" },
              ]}
              placeholder="Select College"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Department
            </label>

            <CustomSelect
              value={department}
              onChange={(val) => setDepartment(String(val))}
              options={[
                { value: "", label: "Select Department" },
                { value: "AI & DS", label: "AI & DS" },
                { value: "CSE", label: "CSE" },
              ]}
              placeholder="Select Department"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Specialization
            </label>

            <CustomSelect
              value={specialization}
              onChange={(val) => setSpecialization(String(val))}
              options={[
                { value: "", label: "Select Specialization" },
                {
                  value: "Artificial Intelligence & Data Science",
                  label: "Artificial Intelligence & Data Science",
                },
                {
                  value: "Computer Science & Engineering",
                  label: "Computer Science & Engineering",
                },
              ]}
              placeholder="Select Specialization"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Batch
            </label>

            <CustomSelect
              value={batch}
              onChange={(val) => setBatch(String(val))}
              options={[
                { value: "", label: "Select Batch" },
                { value: "2024–2028", label: "2024–2028" },
                { value: "2023–2027", label: "2023–2027" },
              ]}
              placeholder="Select Batch"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Section
            </label>

            <CustomSelect
              value={section}
              onChange={(val) => setSection(String(val))}
              options={[
                { value: "", label: "Select Section" },
                { value: "A", label: "A" },
                { value: "B", label: "B" },
              ]}
              placeholder="Select Section"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Academic Year
            </label>

            <CustomSelect
              value={academicYear}
              onChange={(val) => setAcademicYear(String(val))}
              options={[
                { value: "", label: "Select Academic Year" },
                { value: "2024–2028", label: "2024–2028" },
                { value: "2023–2027", label: "2023–2027" },
              ]}
              placeholder="Select Academic Year"
            />
          </div>
        </div>

        <div className="mt-5">
          <button
            type="button"
            onClick={handleSearch}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Search size={16} />
            Search Class
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900">
            Authorized Classes
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Classes currently assigned to this teacher
          </p>
        </div>

        <div className="divide-y divide-gray-100">
          {filteredClasses.length > 0 ? (
            filteredClasses.map((assignment) => (
              <div
                key={assignment.classId}
                className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <h3 className="font-medium text-gray-900">
                    {assignment.className}
                  </h3>

                  <p className="mt-1 text-sm text-gray-500">
                    {assignment.subject} • {assignment.academicYear}
                  </p>
                </div>

                <Link
                  to={`/classes/${assignment.classId}`}
                  className="inline-flex w-fit rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  View Class
                </Link>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-sm text-gray-500">
              No authorized classes found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}