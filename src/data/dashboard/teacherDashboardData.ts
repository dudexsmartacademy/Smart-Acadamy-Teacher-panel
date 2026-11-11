/**
 * Teacher Dashboard Data — thin wrapper consumed by Dashboard components.
 * 
 * All values are now sourced from Supabase via teacherService at runtime.
 * This module only re-exports types and a static shell for backward compat
 * with `data/index.ts`.
 */

export const teacherDashboardData = {
  teacher: {
    id: "",
    name: "",
    facultyId: "",
    department: "",
  },

  assignedClasses: [] as Array<{
    classId: string;
    className: string;
    subject: string;
    academicYear: string;
    active: boolean;
  }>,

  assignedSubjects: [] as string[],

  statistics: {
    assignedClasses: 0,
    assignedStudents: 0,
    todaysClasses: 0,
    attendancePending: 0,
    activeAssessments: 0,
    averageClassPerformance: 0,
    studentsAtRisk: 0,
  },
};