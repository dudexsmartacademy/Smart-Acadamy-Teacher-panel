export type TeacherProfile = {
  id: string;
  name: string;
  facultyId: string;
  department: string;
};

export type TeacherAssignment = {
  classId: string;
  className: string;
  subject: string;
  academicYear: string;
  active: boolean;
};

export const teacherProfile: TeacherProfile = {
  id: "",
  name: "",
  facultyId: "",
  department: "",
};

export const teacherAssignments: TeacherAssignment[] = [];