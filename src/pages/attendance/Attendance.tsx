import { useMemo, useState } from "react";
import {
  Check,
  CheckCircle2,
  RotateCcw,
  Save,
  Search,
  ShieldAlert,
  Users,
  Video,
  X,
  XCircle,
} from "lucide-react";

import { useEffect } from "react";
import CustomSelect from "../../components/CustomSelect";
import ResponsiveDatePicker from "../../components/ResponsiveDatePicker";
import MultiSelectChecklist from "../../components/MultiSelectChecklist";
import { saveAttendance as saveAttendanceWorkflow } from "../../lib/attendance/attendanceWorkflow";
import { teacherService } from "../../services/teacherService";
import { attendanceService } from "../../services/attendanceService";
import { studentService } from "../../services/studentService";
import { liveClassService, type LiveClassItem } from "../../services/liveClassService";
import { batchService } from "../../services/batchService";

type AttendanceStatus = "Present" | "Absent" | "";

type Student = {
  id: string;
  name: string;
  rrn: string;
  classId: string;
  className?: string;
  department?: string;
  section?: string;
};

type AttendanceRecord = {
  status: AttendanceStatus;
  time: string;
  remarks: string;
};

function createInitialRecords(studentsList: Student[] = []): Record<
  string,
  AttendanceRecord
> {
  return studentsList.reduce(
    (records, student) => {
      records[student.id] = {
        status: "",
        time: "",
        remarks: "",
      };

      return records;
    },
    {} as Record<string, AttendanceRecord>
  );
}

export default function Attendance() {
  const [classId, setClassId] = useState("all");
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>(["all"]);
  const [availableAssignments, setAvailableAssignments] = useState<Array<{ classId: string; className: string; subject: string }>>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [liveClasses, setLiveClasses] = useState<LiveClassItem[]>([]);
  const [selectedLiveClassId, setSelectedLiveClassId] = useState<string>("");

  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);

  const [records, setRecords] = useState<
    Record<string, AttendanceRecord>
  >({});

  const [selectedStudentIds, setSelectedStudentIds] =
    useState<string[]>([]);

  const [search, setSearch] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [popupMessage, setPopupMessage] =
    useState<string | null>(null);

  const [attendanceCode, setAttendanceCode] = useState("");
  const [attendanceCodeId, setAttendanceCodeId] = useState<string | null>(null);
  const [codeActive, setCodeActive] = useState(false);
  const [codeGenerated, setCodeGenerated] = useState(false);
  const [codeMessage, setCodeMessage] = useState("");

  useEffect(() => {
    async function loadMeta() {
      const [batchRes, studRes, liveRes] = await Promise.all([
        batchService.getBatches(),
        studentService.getAllStudentsWithMetrics(),
        liveClassService.getMyClassSessions(),
      ]);

      if (liveRes.data) {
        setLiveClasses(liveRes.data);
      }

      // Every global batch; "classId" holds the batch name throughout this page.
      const dedupedList = batchRes.data.map((b) => ({
        classId: b.name,
        className: b.name,
        subject: "",
      }));

      setAvailableAssignments(dedupedList);
      // Start with the first batch selected, as in the first version.
      setClassId(dedupedList[0]?.classId || "");
      setSelectedClassIds(dedupedList[0] ? [dedupedList[0].classId] : []);

      if (studRes.data) {
        setAllStudents(
          studRes.data.map((s) => ({
            id: s.userId || s.id,
            profileId: s.id,
            userId: s.userId,
            name: s.name,
            rrn: s.rrn,
            classId: s.batchName,
            className: s.batchName,
            department: s.department,
            section: s.section,
          }))
        );
      }
    }
    loadMeta();
  }, []);

  /*
   * Generate attendance verification code.
   */
  const handleGenerateCode = async () => {
    if (codeGenerated) {
      return;
    }

    if (selectedClassIds.length === 0) {
      setCodeMessage("Select at least one batch before generating a code.");
      return;
    }

    // The code is issued and stored by Supabase so students can redeem it.
    const result = await attendanceService.startCodeSession(selectedClassIds, "General");
    if (result.error || !result.data) {
      setCodeMessage(result.error || "Could not generate an attendance code.");
      return;
    }

    setAttendanceCode(result.data.code);
    setAttendanceCodeId(result.data.code_id);
    setCodeActive(true);
    setCodeGenerated(true);
    setCodeMessage(
      `Attendance code generated for ${selectedClassIds.join(", ")}. Valid until ${new Date(result.data.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`
    );
  };

  /*
   * Stop the generated attendance code.
   */
  const handleStopCode = async () => {
    if (!codeActive) {
      return;
    }

    if (attendanceCodeId) {
      const result = await attendanceService.stopCodeSession(attendanceCodeId);
      if (!result.success) {
        setCodeMessage(result.error || "Could not stop the attendance code.");
        return;
      }
    }

    setCodeActive(false);
    setCodeMessage("Code stopped successfully.");
  };

  const handleLiveClassChange = (liveClassId: string) => {
    setSelectedLiveClassId(liveClassId);
    if (!liveClassId) return;
    const lc = liveClasses.find((l) => l.id === liveClassId);
    if (lc) {
      if (lc.scheduledDate) setDate(lc.scheduledDate);
      const lcBatches = lc.batches.filter((b) => availableAssignments.some((a) => a.classId === b));
      setSelectedClassIds(lcBatches);
      setClassId(lcBatches[0] || "");
      setSaveMessage("");
    }
  };

  const handleBatchSelection = (next: string[]) => {
    setSelectedClassIds(next);
    setClassId(next[0] || "");
    setSaveMessage("");
  };

  const selectedAssignment = availableAssignments.find(
    (assignment) => assignment.classId === classId
  ) || availableAssignments[0];

  /*
   * Students belonging ONLY to the teacher's Admin-assigned classes.
   */
  const authorizedStudents = useMemo(() => {
    if (availableAssignments.length === 0) {
      return [];
    }
    const assignedClassIdSet = new Set(availableAssignments.map((a) => a.classId));
    const assignedClassNameSet = new Set(availableAssignments.map((a) => a.className.toLowerCase()));

    // Filter all students to only those in the teacher's assigned classes
    const assignedPool = allStudents.filter(
      (s) =>
        (s.classId && assignedClassIdSet.has(s.classId)) ||
        (s.className && assignedClassNameSet.has(s.className.toLowerCase()))
    );

    // If teacher selected a specific subset of their assigned classes:
    if (selectedClassIds.length > 0) {
      const activeClassIdSet = new Set(selectedClassIds);
      const activeNames = new Set(
        availableAssignments
          .filter((a) => activeClassIdSet.has(a.classId))
          .map((a) => a.className.toLowerCase())
      );
      const filtered = assignedPool.filter(
        (s) =>
          (s.classId && activeClassIdSet.has(s.classId)) ||
          (s.className && activeNames.has(s.className.toLowerCase()))
      );
      return filtered;
    }

    return [];
  }, [allStudents, availableAssignments, selectedClassIds]);

  useEffect(() => {
    let cancelled = false;
    const initial: Record<string, AttendanceRecord> = {};
    authorizedStudents.forEach((s) => {
      initial[s.id] = { status: "", time: "", remarks: "" };
    });
    setRecords(initial);
    setSelectedStudentIds([]);

    // Show attendance already saved for this batch and date, including
    // students who checked in with an attendance code.
    if (selectedClassIds.length > 0 && authorizedStudents.length > 0) {
      attendanceService.getRecordsForDate(selectedClassIds, date).then((saved) => {
        if (cancelled || saved.length === 0) return;
        setRecords((current) => {
          const updated = { ...current };
          saved.forEach((row) => {
            const student = authorizedStudents.find(
              (st) => st.id === row.studentId || (st as any).profileId === row.studentId || (st as any).userId === row.studentId
            );
            const key = student ? student.id : row.studentId;
            if (!updated[key]) return;
            const status = (row.status || "").toLowerCase();
            updated[key] = {
              ...updated[key],
              status: status === "absent" ? "Absent" : status === "present" || status === "late" ? "Present" : "",
              time: row.time,
            };
          });
          return updated;
        });
      });
    }
    return () => {
      cancelled = true;
    };
  }, [authorizedStudents, selectedClassIds, date]);

  // Live polling for code check-ins while an attendance code is active
  useEffect(() => {
    if (!codeActive) return;
    const interval = setInterval(() => {
      attendanceService.getRecordsForDate(selectedClassIds, date).then((saved) => {
        if (!saved || saved.length === 0) return;
        setRecords((current) => {
          let hasChanges = false;
          const updated = { ...current };
          saved.forEach((row) => {
            const student = authorizedStudents.find(
              (st) => st.id === row.studentId || (st as any).profileId === row.studentId || (st as any).userId === row.studentId
            );
            const key = student ? student.id : row.studentId;
            if (updated[key] && updated[key].status !== "Present") {
              const status = (row.status || "").toLowerCase();
              if (status === "present" || status === "late") {
                updated[key] = {
                  ...updated[key],
                  status: "Present",
                  time: row.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                };
                hasChanges = true;
              }
            }
          });
          return hasChanges ? updated : current;
        });
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [codeActive, selectedClassIds, date, authorizedStudents]);

  /*
   * Search students by name or RRN.
   */
  const visibleStudents = useMemo(() => {
    const value = search.trim().toLowerCase();

    return authorizedStudents.filter(
      (student) =>
        student.name.toLowerCase().includes(value) ||
        student.rrn.toLowerCase().includes(value)
    );
  }, [authorizedStudents, search]);

  /*
   * Check whether all currently visible students
   * are selected.
   */
  const isAllVisibleSelected =
    visibleStudents.length > 0 &&
    visibleStudents.every((student) =>
      selectedStudentIds.includes(student.id)
    );

  /*
   * Select or deselect all visible students.
   * This changes only checkbox selection.
   */
  const handleToggleSelectAll = () => {
    const visibleIds = visibleStudents.map(
      (student) => student.id
    );

    if (isAllVisibleSelected) {
      setSelectedStudentIds((previous) =>
        previous.filter(
          (id) => !visibleIds.includes(id)
        )
      );
    } else {
      setSelectedStudentIds((previous) => [
        ...new Set([...previous, ...visibleIds]),
      ]);
    }
  };

  /*
   * Toggle an individual student's checkbox.
   */
  const handleToggleStudent = (studentId: string) => {
    setSelectedStudentIds((previous) => {
      if (previous.includes(studentId)) {
        return previous.filter((id) => id !== studentId);
      }

      return [...previous, studentId];
    });
  };

  const showPopup = (message: string) => {
    setPopupMessage(message);
  };

  /*
   * Mark attendance as Present.
   *
   * Selected students become Present and the remaining
   * students become Absent. If no students are selected,
   * all students become Present.
   */
  const handleMarkPresent = () => {
    setSaveMessage("");

    setRecords((current) => {
      const updated = { ...current };

      if (selectedStudentIds.length > 0) {
        selectedStudentIds.forEach((id) => {
          if (updated[id]) {
            updated[id] = {
              ...updated[id],
              status: "Present",
            };
          }
        });
      } else {
        authorizedStudents.forEach((student) => {
          updated[student.id] = {
            ...updated[student.id],
            status: "Present",
          };
        });
      }

      return updated;
    });

    showPopup(
      selectedStudentIds.length > 0
        ? `${selectedStudentIds.length} selected student(s) marked as present.`
        : "All students are marked as present."
    );
  };

  /*
   * Mark attendance as Absent.
   *
   * If students are selected with checkboxes, ONLY those
   * selected students become Absent (remaining students keep their current status).
   * If no students are selected, all students become Absent.
   */
  const handleMarkAbsent = () => {
    setSaveMessage("");

    setRecords((current) => {
      const updated = { ...current };

      if (selectedStudentIds.length > 0) {
        selectedStudentIds.forEach((id) => {
          if (updated[id]) {
            updated[id] = {
              ...updated[id],
              status: "Absent",
            };
          }
        });
      } else {
        authorizedStudents.forEach((student) => {
          updated[student.id] = {
            ...updated[student.id],
            status: "Absent",
          };
        });
      }

      return updated;
    });

    showPopup(
      selectedStudentIds.length > 0
        ? `${selectedStudentIds.length} selected student(s) marked as absent.`
        : "All students are marked as absent."
    );
  };

  /*
   * Reset all attendance statuses to Not Marked.
   */
  const resetAttendance = () => {
    setRecords(createInitialRecords(authorizedStudents));
    setSelectedStudentIds([]);
    setSaveMessage("");
    setPopupMessage(null);
  };

  /*
   * Save attendance through the existing workflow.
   */
  const handleSaveAttendance = async () => {
    setSaveMessage("");

    if (!selectedAssignment || selectedClassIds.length === 0) {
      setSaveMessage("Please select at least one batch.");
      return;
    }

    if (!date) {
      setSaveMessage("Please select a date.");
      return;
    }

    /*
     * Prevent saving until all students are marked.
     */
    const unmarkedStudents = authorizedStudents.filter(
      (student) => !records[student.id]?.status
    );

    if (unmarkedStudents.length > 0) {
      setSaveMessage(
        `Please mark attendance for all students before saving. ${unmarkedStudents.length} student${
          unmarkedStudents.length === 1 ? "" : "s"
        } still ${
          unmarkedStudents.length === 1 ? "is" : "are"
        } Not Marked.`
      );

      return;
    }

    const attendance = authorizedStudents.map(
      (student) => ({
        studentId: student.id,
        rrn: student.rrn,
        status: records[student.id].status as
          | "Present"
          | "Absent",
        time: records[student.id].time,
        remarks: records[student.id].remarks,
        batchName: student.classId,
      })
    );

    try {
      const teacherProf = await teacherService.getProfile();
      const teacherId = teacherProf.data?.id || "FAC001";

      const result = await saveAttendanceWorkflow({
        teacherId,
        batches: selectedClassIds,
        subject: "General",
        session: "Regular Class",
        date,
        attendance,
      });

      if (result.success) {
        setSaveMessage(
          "Attendance saved successfully."
        );
      } else {
        setSaveMessage(result.error || "Failed to save attendance in database.");
      }
    } catch (error) {
      console.error(
        "Attendance save failed:",
        error
      );

      setSaveMessage(
        error instanceof Error
          ? error.message
          : "Unable to save attendance."
      );
    }
  };

  return (
    <div className="min-w-0 space-y-5 p-3.5 sm:p-6 lg:p-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          Student Attendance Dashboard
        </h1>

        <p className="mt-1 text-xs text-gray-500 sm:text-sm">
          Mark and manage daily attendance for students in
          authorized classes
        </p>
      </div>

      {/* Batch and Date Selection */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-5">
        {/* Live Class Link */}
        {liveClasses.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Video className="h-4 w-4 text-amber-700" />
              <label className="text-sm font-semibold text-amber-900">
                Link Attended Live Class Session (Optional)
              </label>
            </div>
            <p className="text-xs text-amber-800 mb-3">
              Select a scheduled live class to automatically load its date and participating student batches.
            </p>
            <CustomSelect
              value={selectedLiveClassId}
              onChange={(value) => handleLiveClassChange(String(value))}
              options={[
                { value: "", label: "-- None (Independent Academic Session) --" },
                ...liveClasses.map((lc) => ({
                  value: lc.id,
                  label: `📹 ${lc.title} · ${lc.subjectName || "General"} · ${lc.scheduledDate} (${lc.startTime} - ${lc.endTime})`,
                })),
              ]}
              placeholder="Select an attended live class session"
            />
          </div>
        )}

        {availableAssignments.length === 0 && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
            <div className="flex items-center gap-2 font-semibold">
              <ShieldAlert className="h-5 w-5 text-amber-700" />
              No Batches Available
            </div>
            <p className="mt-1 text-sm text-amber-800">
              Batches are created by the administrator together with each college. Ask the administrator to add a college with batches.
            </p>
          </div>
        )}

        {/* Batch and Date */}
        <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
          <div className="min-w-0">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Batch
            </label>
            <MultiSelectChecklist
              values={selectedClassIds}
              onChange={handleBatchSelection}
              options={availableAssignments.map((item) => ({
                value: item.classId,
                label: item.classId,
              }))}
              placeholder="Select batches"
              allLabel="All Batches"
              disabled={availableAssignments.length === 0}
              emptyText="No batches are assigned to you."
            />
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-500">
              <Users className="h-3.5 w-3.5" />
              Showing {authorizedStudents.length} students across{" "}
              {selectedClassIds.length === availableAssignments.length
                ? "all batches"
                : `${selectedClassIds.length} of ${availableAssignments.length} batch(es)`}
            </p>
          </div>

          {/* Responsive Date Picker */}
          <div className="min-w-0">
            <ResponsiveDatePicker
              label="Date"
              value={date}
              onChange={(value) => {
                setDate(value);
                setSaveMessage("");
              }}
            />
          </div>
        </div>
      </div>

      {/* Daily Attendance Verification (Placed after Batch and Date selection) */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Daily Attendance Verification
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Generate a six-character verification code for students in the selected batch(es).
            </p>
            {selectedClassIds.length > 0 && (
              <p className="mt-1 text-xs font-medium text-amber-700">
                Target: {selectedClassIds.join(", ")} ({authorizedStudents.length} student{authorizedStudents.length === 1 ? "" : "s"})
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleGenerateCode}
            disabled={codeGenerated || selectedClassIds.length === 0}
            className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {codeGenerated
              ? "Code Already Generated"
              : "Generate Code"}
          </button>
        </div>

        {attendanceCode && codeActive && (
          <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm font-medium text-gray-700">
              Attendance Verification Code
            </p>

            <div className="mt-3 flex min-h-16 items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-3">
              <span className="font-mono text-2xl font-bold tracking-[0.4em] text-gray-900">
                {attendanceCode}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                Code Active ({authorizedStudents.filter(s => records[s.id]?.status === 'Present').length}/{authorizedStudents.length} Verified)
              </span>

              <button
                type="button"
                onClick={handleStopCode}
                className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
              >
                Stop Code
              </button>
            </div>

            <p className="mt-3 text-xs text-gray-500">
              Students in {selectedClassIds.join(", ")} must enter this exact code in their student portal to verify their attendance.
            </p>
          </div>
        )}

        {codeMessage && (
          <p
            role="status"
            className={`mt-3 text-sm ${
              codeMessage.includes("successfully") || codeMessage.includes("generated")
                ? "text-green-700"
                : "text-red-600"
            }`}
          >
            {codeMessage}
          </p>
        )}
      </div>

      {/* Search and Attendance Actions */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:w-80">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />

          <input
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search student..."
            className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectedStudentIds.length > 0 && (
            <span className="mr-2 text-xs font-medium text-gray-500">
              {selectedStudentIds.length} student
              {selectedStudentIds.length > 1 ? "s" : ""} selected
            </span>
          )}

          <button
            type="button"
            onClick={handleMarkPresent}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <Check size={16} className="text-green-600" />
            {selectedStudentIds.length > 0 ? "Mark as Present" : "Mark All Present"}
          </button>

          <button
            type="button"
            onClick={handleMarkAbsent}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <X size={16} className="text-red-500" />
            {selectedStudentIds.length > 0 ? "Mark as Absent" : "Mark All Absent"}
          </button>
        </div>
      </div>

      {/* Save Message */}
      {saveMessage && (
        <div
          role="status"
          className={`rounded-lg border px-4 py-3 text-sm ${
            saveMessage.includes("successfully")
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {saveMessage}
        </div>
      )}

      {/* Attendance Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="w-14 px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={isAllVisibleSelected}
                    onChange={handleToggleSelectAll}
                    aria-label="Select all visible students"
                    className="h-4 w-4 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>

                <th className="px-4 py-3 font-semibold text-gray-700">
                  Student Name
                </th>

                <th className="px-4 py-3 text-right font-semibold text-gray-700">
                  Current Status
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {visibleStudents.map((student) => {
                const isSelected =
                  selectedStudentIds.includes(student.id);

                const status =
                  records[student.id]?.status ?? "";

                return (
                  /*
                   * The checkbox alone controls student
                   * selection; the table row has no onClick.
                   */
                  <tr
                    key={student.id}
                    className={`transition hover:bg-gray-50 ${
                      isSelected ? "bg-blue-50/40" : ""
                    }`}
                  >
                    <td className="w-14 px-4 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() =>
                          handleToggleStudent(student.id)
                        }
                        aria-label={`Select ${student.name}`}
                        className="h-4 w-4 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">
                          {student.name}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                          <span>{student.rrn}</span>
                          {(student.className || student.department) && (
                            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-700 border border-gray-200">
                              {student.className || student.department}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4 text-right">
                      <div className="inline-flex flex-col items-end gap-1">
                        {status === "Present" ? (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800">
                            Present
                          </span>
                        ) : status === "Absent" ? (
                          <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-800">
                            Absent
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
                            Not Marked
                          </span>
                        )}
                        {records[student.id]?.time && (
                          <span className="text-[11px] text-gray-400">
                            {records[student.id].time}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {visibleStudents.length === 0 && (
          <div className="p-8 text-center text-sm text-gray-500">
            No students found.
          </div>
        )}
      </div>

      {/* Reset and Save */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={resetAttendance}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <RotateCcw size={16} />
          Reset
        </button>

        <button
          type="button"
          onClick={handleSaveAttendance}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
        >
          <Save size={16} />
          Save
        </button>
      </div>

      {/* Attendance Confirmation Popup */}
      {popupMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
                  popupMessage.toLowerCase().includes("present")
                    ? "bg-green-100 text-green-600"
                    : "bg-amber-100 text-amber-600"
                }`}
              >
                {popupMessage.toLowerCase().includes("present") ? (
                  <CheckCircle2 size={24} />
                ) : (
                  <XCircle size={24} />
                )}
              </div>

              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900">
                  Attendance Updated
                </h3>

                <p className="mt-1 text-sm font-medium text-gray-600">
                  {popupMessage}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setPopupMessage(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setPopupMessage(null)}
                className="rounded-lg bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}