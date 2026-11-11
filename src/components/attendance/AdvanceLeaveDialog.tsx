import { useMemo, useState } from "react";
import { AlertTriangle, CalendarDays, Info, X } from "lucide-react";
import CustomSelect from "../CustomSelect";
import ResponsiveDatePicker from "../ResponsiveDatePicker";
import {
  teacherAttendanceService,
  type TeacherAttendanceDay,
  type TeacherAttendanceSummary,
} from "../../services/teacherAttendanceService";
import type { ConfirmState } from "./ConfirmDialog";

type Props = {
  open: boolean;
  summary: TeacherAttendanceSummary;
  days: TeacherAttendanceDay[];
  onClose: () => void;
  onConfirmRequired: (state: ConfirmState | null) => void;
  onSubmitted: (message: string) => void;
};

/**
 * Apply Advance Leave dialog: submits a leave request to the administration
 * (from tomorrow onwards). Render it only while open so each opening starts empty.
 */
export default function AdvanceLeaveDialog({ open, summary, days, onClose, onConfirmRequired, onSubmitted }: Props) {
  // Minimum selectable date is tomorrow (today & past dates strictly disallowed)
  const tomorrowDateStr = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, "0");
    const dd = String(tomorrow.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const [fromDate, setFromDate] = useState(tomorrowDateStr);
  const [toDate, setToDate] = useState(tomorrowDateStr);
  const [reason, setReason] = useState("");
  const [leaveType, setLeaveType] = useState<"Casual" | "Medical" | "Duty">("Casual");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const executeApply = async () => {
    setSaving(true);
    const res = await teacherAttendanceService.applyLeaveRange(fromDate, toDate, reason.trim(), leaveType);
    setSaving(false);
    if (!res.success) {
      setError(res.error || "Leave request failed.");
      return;
    }
    onClose();
    onSubmitted(
      `Leave request submitted to the administration for ${res.count > 0 ? res.count : 1} day(s) (${fromDate} to ${toDate}).`
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (fromDate < tomorrowDateStr) {
      setError("Notice: The leave must be taken at least 1 day in advance (from tomorrow onwards). Today and past days are not allowed.");
      return;
    }
    if (toDate < fromDate) {
      setError("To Date cannot be earlier than From Date.");
      return;
    }
    if (!reason.trim()) {
      setError("Please provide a valid reason for the leave request.");
      return;
    }

    const alreadyMarkedDays = days.filter((d) => d.date >= fromDate && d.date <= toDate && d.status !== "Pending");
    if (alreadyMarkedDays.length > 0) {
      onConfirmRequired({
        title: "Confirm Leave Reschedule & Alteration",
        description: `You already have ${alreadyMarkedDays.length} day(s) with recorded attendance/leave in this date range (${fromDate} to ${toDate}). Do you want to submit this leave request anyway, or cancel?`,
        warningNote: "Once the administration approves it, the selected dates are recorded as leave.",
        confirmText: "Yes, Apply Leave",
        onConfirm: () => {
          onConfirmRequired(null);
          void executeApply();
        },
      });
      return;
    }

    void executeApply();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div className="leave-date-modal w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-800 font-bold">
              <CalendarDays size={18} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Apply Advance Leave</h3>
              <p className="text-xs text-gray-500">Submit planned faculty leave in advance</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 flex items-start gap-3 text-xs text-amber-900">
          <Info className="h-4 w-4 shrink-0 text-amber-700 mt-0.5" />
          <div className="space-y-0.5 leading-relaxed">
            <p className="font-bold text-amber-950">Academic Leave Policy Notice:</p>
            <p className="text-amber-800">
              The leave should be taken at least <strong>one day in advance</strong>. Same-day (today) and past-dated leaves are not allowed. You may only select dates starting from tomorrow onwards.
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 animate-in fade-in">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            <p className="font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ResponsiveDatePicker
              label="From Date"
              value={fromDate}
              minDate={tomorrowDateStr}
              helperText="From tomorrow onwards only"
              onChange={(date) => {
                setFromDate(date);
                if (toDate < date) setToDate(date);
              }}
            />
            <ResponsiveDatePicker
              label="To Date"
              value={toDate}
              minDate={fromDate || tomorrowDateStr}
              helperText="End date of leave"
              onChange={setToDate}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-gray-700">
              Leave Type <span className="text-rose-500">*</span>
            </label>
            <CustomSelect
              value={leaveType}
              onChange={(val) => setLeaveType(val as "Casual" | "Medical" | "Duty")}
              options={[
                {
                  value: "Casual",
                  label: `Casual Leave (CL) — ${Math.max(summary.casualLeaveAllowance - summary.casualLeaveUsed, 0)} Days Remaining`,
                },
                {
                  value: "Medical",
                  label: `Medical Leave (ML) — ${Math.max(summary.medicalLeaveAllowance - summary.medicalLeaveUsed, 0)} Days Remaining`,
                },
                { value: "Duty", label: "On-Duty / Academic Deputation (OD)" },
              ]}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-gray-700">
              Reason for Leave <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please describe the purpose/reason for your leave request in detail..."
              className="w-full rounded-xl border border-gray-300 p-2.5 text-sm text-gray-900 outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-amber-600 px-5 py-2 text-sm font-bold text-white hover:bg-amber-700 shadow-sm cursor-pointer transition-all active:scale-95 disabled:opacity-60"
            >
              {saving ? "Submitting…" : "Submit Leave Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
