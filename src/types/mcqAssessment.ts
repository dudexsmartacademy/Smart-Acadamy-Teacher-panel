export type MCQOptionKey = 'A' | 'B' | 'C' | 'D';

export interface MCQOption {
  id: string;
  optionKey: MCQOptionKey;
  text: string;
}

export interface MCQQuestion {
  id: string;
  questionText: string;
  options: MCQOption[];
  correctOptionId: string;
  marks: number;
  explanation?: string;
  order: number;
}

export interface MCQSchedule {
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  timezone: string;
}

export interface MCQClassInfo {
  classId: string;
  className: string;
  college: string;
  department: string;
  specialization: string;
  batch: string;
  section: string;
}

export type MCQAssessmentStatus =
  | 'Draft'
  | 'Scheduled'
  | 'Active'
  | 'Completed'
  | 'Cancelled'
  | 'Archived';

export interface MCQAssessment {
  id: string;
  title: string;
  description?: string;
  classInfo: MCQClassInfo;
  subjectId: string;
  subjectName: string;
  questions: MCQQuestion[];
  /** List views load counts only; questions stays empty there. */
  questionCount?: number;
  totalMarks?: number;
  schedule: MCQSchedule;
  status: MCQAssessmentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MCQAssessmentDraft {
  id?: string;
  title: string;
  description?: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  questions: MCQQuestion[];
  schedule: MCQSchedule;
  currentStep: number;
  activeQuestionIndex: number;
  lastSavedAt: string;
}
