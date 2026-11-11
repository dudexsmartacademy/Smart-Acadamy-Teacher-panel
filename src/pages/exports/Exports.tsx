import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Download,
  FileText,
  FileSpreadsheet,
  FileDown,
  Loader2,
} from "lucide-react";

import CustomSelect from "../../components/CustomSelect";
import { useAuth } from "../../context/AuthContext";
import { studentService } from "../../services/studentService";
import { resultService } from "../../services/resultService";

type ExportType =
  | "Student List"
  | "Attendance"
  | "Result"
  | "Grade"
  | "Performance"
  | "Assessment Report";

type ExportFormat = "CSV" | "Excel" | "PDF";

function triggerDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function Exports() {
  const { assignments: teacherAssignments } = useAuth();
  const [exportType, setExportType] =
    useState<ExportType>("Student List");

  const [format, setFormat] =
    useState<ExportFormat>("CSV");

  const [classId, setClassId] = useState(
    teacherAssignments[0]?.classId ?? "all"
  );

  const [subject, setSubject] = useState(
    teacherAssignments[0]?.subject ?? "all"
  );

  const [message, setMessage] = useState("");
  const [exporting, setExporting] = useState(false);

  const authorizedAssignments = useMemo(
    () =>
      teacherAssignments.filter(
        (assignment) => assignment.active
      ), [teacherAssignments]);

  const selectedAssignment = authorizedAssignments.find(
    (assignment) =>
      assignment.classId === classId &&
      assignment.subject === subject
  );

  const availableSubjects = useMemo(() => {
    return authorizedAssignments
      .filter(
        (assignment) => assignment.classId === classId
      )
      .map((assignment) => assignment.subject);
  }, [authorizedAssignments, classId]);

  const handleClassChange = (
    value: string
  ) => {
    setClassId(value);

    const assignment = authorizedAssignments.find(
      (item) => item.classId === value
    );

    setSubject(assignment?.subject ?? "all");
    setMessage("");
  };

  const handleExport = async () => {
    setMessage("");
    setExporting(true);

    try {
      const ext = format === "CSV" ? "csv" : format === "Excel" ? "csv" : "txt";
      const mime = format === "PDF" ? "text/plain" : "text/csv;charset=utf-8;";
      const targetClass = selectedAssignment?.className || (classId === "all" ? "All_Batches" : classId);

      if (exportType === "Student List") {
        const res = await studentService.getAllStudentsWithMetrics();
        const students = (res.data || []).filter(
          (s) => classId === "all" || s.classId === classId
        );
        const header = "RRN,Full Name,Department,Section,Attendance %,Average Mark,Grade\n";
        const rows = students
          .map(
            (s) =>
              `"${s.rrn}","${s.name}","${s.department}","${s.section}","${s.attendance}%","${s.averageMark}","${s.grade}"`
          )
          .join("\n");
        triggerDownload(header + rows, `Student_List_${targetClass}.${ext}`, mime);
      } else if (exportType === "Attendance") {
        const res = await studentService.getAllStudentsWithMetrics();
        const students = (res.data || []).filter(
          (s) => classId === "all" || s.classId === classId
        );
        const header = "Student Name,RRN,Class,Attendance %,Status\n";
        const rows = students
          .map(
            (s) =>
              `"${s.name}","${s.rrn}","${s.department} - ${s.section}","${s.attendance}%","${s.status}"`
          )
          .join("\n");
        triggerDownload(header + rows, `Attendance_Records_${targetClass}.${ext}`, mime);
      } else {
        const res = await resultService.getAssessmentResults();
        const header = "Student Name,RRN,Roll Number,Assessment,Score,Max Marks,Percentage,Grade,Status,Submitted At\n";
        const rows = (res.data || [])
          .map(
            (r) =>
              `"${r.studentName}","${r.rrn}","${r.rollNumber || ""}","${r.assessmentTitle}","${r.score}","${r.maxMarks}","${r.percentage.toFixed(1)}%","${r.grade}","${r.status}","${r.submittedAt}"`
          )
          .join("\n");
        triggerDownload(header + rows, `${exportType.replace(/\s+/g, "_")}_${targetClass}.${ext}`, mime);
      }

      setMessage(`${exportType} export successfully downloaded in ${format} format.`);
    } catch (err) {
      console.error("Export failed:", err);
      setMessage("Failed to export data. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const exportTypes: ExportType[] = [
    "Student List",
    "Attendance",
    "Result",
    "Grade",
    "Performance",
    "Assessment Report",
  ];

  const formats: {
    label: ExportFormat;
    icon: ReactNode;
  }[] = [
    {
      label: "CSV",
      icon: <FileText size={20} />,
    },
    {
      label: "Excel",
      icon: <FileSpreadsheet size={20} />,
    },
    {
      label: "PDF",
      icon: <FileDown size={20} />,
    },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Exports
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Export authorized student, attendance, result,
          grade, performance, and assessment data.
        </p>
      </div>

      {/* Export Configuration */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Export Configuration
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Select the data and format you want to export.
          </p>
        </div>

        <div className="grid gap-6 p-6 md:grid-cols-2">
          {/* Class */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Class
            </label>

            <CustomSelect
              value={classId}
              onChange={(val) => handleClassChange(val)}
              options={
                authorizedAssignments.length === 0
                  ? [{ value: "all", label: "All Classes / Batches" }]
                  : [
                      { value: "all", label: "All Assigned Classes" },
                      ...authorizedAssignments.map((assignment) => ({
                        value: assignment.classId,
                        label: assignment.className,
                      })),
                    ]
              }
            />
          </div>

          {/* Subject */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Subject
            </label>

            <CustomSelect
              value={subject}
              onChange={(val) => setSubject(val)}
              options={
                availableSubjects.length === 0
                  ? [{ value: "all", label: "All Subjects" }]
                  : [
                      { value: "all", label: "All Subjects" },
                      ...availableSubjects.map((item) => ({
                        value: item,
                        label: item,
                      })),
                    ]
              }
            />
          </div>
        </div>

        {/* Export Type */}
        <div className="border-t border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900">
            Export Data
          </h3>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {exportTypes.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setExportType(type);
                  setMessage("");
                }}
                className={`rounded-lg border p-4 text-left transition ${
                  exportType === type
                    ? "border-gray-900 bg-gray-50"
                    : "border-gray-200 hover:border-gray-400"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
                    <Download
                      size={18}
                      className="text-gray-600"
                    />
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {type}
                    </p>

                    <p className="mt-0.5 text-xs text-gray-500">
                      Export {type.toLowerCase()}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Format */}
        <div className="border-t border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900">
            File Format
          </h3>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {formats.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  setFormat(item.label);
                  setMessage("");
                }}
                className={`flex items-center gap-3 rounded-lg border p-4 text-left ${
                  format === item.label
                    ? "border-gray-900 bg-gray-50"
                    : "border-gray-200 hover:border-gray-400"
                }`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                  {item.icon}
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {item.label}
                  </p>

                  <p className="mt-0.5 text-xs text-gray-500">
                    {item.label} file
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Selected Information */}
        {selectedAssignment && (
          <div className="border-t border-gray-200 bg-gray-50 p-6">
            <h3 className="text-sm font-semibold text-gray-900">
              Selected Assignment
            </h3>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-xs text-gray-500">
                  Class
                </p>

                <p className="mt-1 text-sm font-medium text-gray-900">
                  {selectedAssignment.className}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">
                  Subject
                </p>

                <p className="mt-1 text-sm font-medium text-gray-900">
                  {selectedAssignment.subject}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">
                  Academic Year
                </p>

                <p className="mt-1 text-sm font-medium text-gray-900">
                  {selectedAssignment.academicYear}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Message */}
        {message && (
          <div className="border-t border-gray-200 px-6 py-4">
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {message}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end border-t border-gray-200 p-6">
          <button
            type="button"
            disabled={exporting}
            onClick={handleExport}
            className="flex items-center gap-2 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {exporting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Download size={18} />
            )}
            {exporting ? "Generating Export..." : `Export ${exportType}`}
          </button>
        </div>
      </div>
    </div>
  );
}