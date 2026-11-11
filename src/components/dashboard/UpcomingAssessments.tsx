import { useEffect, useState } from "react";
import { mcqAssessmentService } from "../../services/mcqAssessmentService";
import type { MCQAssessment } from "../../types/mcqAssessment";

export default function UpcomingAssessments() {
  const [assessments, setAssessments] = useState<MCQAssessment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    mcqAssessmentService.getAssessments({ sortBy: "Upcoming" }).then(({ data }) => {
      if (data) {
        // Filter scheduled or active assessments
        const upcoming = data.filter(
          (a) => a.status === "Scheduled" || a.status === "Active"
        );
        setAssessments(upcoming.slice(0, 5));
      }
      setLoading(false);
    });
  }, []);

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="border-b border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900">
          Upcoming Assessments
        </h3>
      </div>

      <div className="divide-y divide-gray-100">
        {loading ? (
          <div className="p-5 text-center text-xs text-gray-500">Loading assessments...</div>
        ) : assessments.length === 0 ? (
          <div className="p-6 text-center text-xs text-gray-500">No upcoming assessments scheduled</div>
        ) : (
          assessments.map((assessment) => (
            <div key={assessment.id} className="p-5">
              <p className="text-sm font-medium text-gray-900">
                {assessment.title}
              </p>

              <div className="mt-1 flex justify-between gap-4">
                <p className="text-xs text-gray-500">
                  {assessment.subjectName}
                </p>

                <p className="text-xs text-gray-500">
                  {assessment.schedule.date}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}