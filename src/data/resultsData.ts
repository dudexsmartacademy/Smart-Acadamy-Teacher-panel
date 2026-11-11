export type TestType = 'MCQ' | 'Coding' | 'Assessment' | 'Mixed';

export interface StudentAssessmentRecord {
  id: string;
  testTitle: string;
  type: TestType;
  date?: string;
  score: number;
  maxMarks: number;
  percentage: number;
  grade: string;
  description?: string;
  duration?: string;
  studentEnteredMarks?: number;
  studentNotes?: string;
  resultScreenshotUrl: string;
  verificationStatus: 'Verified' | 'Pending' | 'Needs Review';
  submittedAt?: string;
}

export interface StudentResultSummary {
  id: string;
  studentId: string;
  student: string;
  rrn: string;
  rollNumber?: string;
  batch: string;
  department: string;
  section: string;
  assessment: string;
  attempt: number;
  score: number;
  totalMarks: number;
  percentage: number;
  grade: string;
  submittedAt: string;
  status: 'Submitted' | 'Verified' | 'Pending' | 'Needs Review';
  cohortPlacementIndex: number;
  cohortPlacementGrade: string;
  highestSingleScore: string;
  evaluationsCompletedCount: number;
  completedAssessments: StudentAssessmentRecord[];
}

export function createScorecardSvg(
  testTitle: string,
  studentName: string,
  rrn: string,
  score: number,
  maxMarks: number,
  type: TestType,
  date: string,
  percentage: number
): string {
  const isPassed = percentage >= 50;
  const grade =
    percentage >= 90
      ? "A+"
      : percentage >= 80
      ? "A"
      : percentage >= 70
      ? "B+"
      : percentage >= 60
      ? "B"
      : percentage >= 50
      ? "C"
      : "F";

  const safeTitle = (testTitle || 'Assessment').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeName = (studentName || 'Student').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeRrn = (rrn || 'RRN000').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeDate = (date || new Date().toLocaleDateString()).replace(/&/g, '&amp;');

  const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 480" width="800" height="480">
  <defs>
    <linearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </defs>

  <rect width="800" height="480" rx="16" fill="#f8fafc"/>
  <rect x="0" y="0" width="800" height="480" rx="16" fill="none" stroke="#e2e8f0" stroke-width="2"/>

  <rect width="800" height="90" rx="16" fill="url(#headerGrad)"/>
  <rect y="74" width="800" height="16" fill="url(#headerGrad)"/>

  <circle cx="48" cy="45" r="20" fill="#3b82f6"/>
  <text x="48" y="52" font-family="sans-serif" font-size="18" font-weight="bold" fill="#ffffff" text-anchor="middle">D</text>
  <text x="80" y="42" font-family="sans-serif" font-size="18" font-weight="bold" fill="#ffffff">DUDEX SMART ACADEMY</text>
  <text x="80" y="60" font-family="sans-serif" font-size="12" fill="#94a3b8">OFFICIAL ASSESSMENT SCORECARD</text>

  <rect x="640" y="30" width="120" height="30" rx="15" fill="#334155"/>
  <text x="700" y="50" font-family="sans-serif" font-size="12" font-weight="600" fill="#38bdf8" text-anchor="middle">${String(type).toUpperCase()}</text>

  <g transform="translate(40, 115)">
    <rect width="720" height="130" rx="12" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5"/>
    
    <text x="24" y="36" font-family="sans-serif" font-size="20" font-weight="bold" fill="#0f172a">${safeTitle}</text>
    
    <text x="24" y="68" font-family="sans-serif" font-size="13" fill="#64748b">Student Candidate:</text>
    <text x="160" y="68" font-family="sans-serif" font-size="14" font-weight="600" fill="#1e293b">${safeName}</text>

    <text x="24" y="96" font-family="sans-serif" font-size="13" fill="#64748b">Registration (RRN):</text>
    <text x="160" y="96" font-family="sans-serif" font-size="14" font-weight="600" fill="#1e293b">${safeRrn}</text>

    <text x="440" y="68" font-family="sans-serif" font-size="13" fill="#64748b">Date Completed:</text>
    <text x="560" y="68" font-family="sans-serif" font-size="14" font-weight="600" fill="#1e293b">${safeDate}</text>

    <text x="440" y="96" font-family="sans-serif" font-size="13" fill="#64748b">Result Status:</text>
    <text x="560" y="96" font-family="sans-serif" font-size="14" font-weight="700" fill="${isPassed ? '#16a34a' : '#dc2626'}">${isPassed ? 'PASSED &amp; COMPLETED' : 'FAILED'}</text>

    <g transform="translate(0, 150)">
      <rect width="225" height="150" rx="12" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5"/>
      <text x="24" y="35" font-family="sans-serif" font-size="12" font-weight="600" fill="#64748b">TOTAL SCORE</text>
      <text x="24" y="85" font-family="sans-serif" font-size="36" font-weight="800" fill="#0f172a">${score}<tspan font-size="20" font-weight="500" fill="#94a3b8"> / ${maxMarks}</tspan></text>
      <text x="24" y="122" font-family="sans-serif" font-size="12" fill="#16a34a">Verified Result</text>

      <rect x="248" width="225" height="150" rx="12" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5"/>
      <text x="272" y="35" font-family="sans-serif" font-size="12" font-weight="600" fill="#64748b">PERCENTAGE</text>
      <text x="272" y="85" font-family="sans-serif" font-size="36" font-weight="800" fill="#b45309">${Number(percentage).toFixed(0)}%</text>
      <text x="272" y="122" font-family="sans-serif" font-size="12" fill="#64748b">Benchmark Score</text>

      <rect x="495" width="225" height="150" rx="12" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5"/>
      <text x="519" y="35" font-family="sans-serif" font-size="12" font-weight="600" fill="#64748b">FINAL GRADE</text>
      <text x="519" y="85" font-family="sans-serif" font-size="36" font-weight="800" fill="#2563eb">${grade}</text>
      <text x="519" y="122" font-family="sans-serif" font-size="12" fill="#2563eb">Tier Grade</text>
    </g>
  </g>

  <text x="400" y="460" font-family="sans-serif" font-size="11" fill="#94a3b8" text-anchor="middle">Generated &amp; Authenticated by DudeX Examination Portal - System ID: DDX-${Math.abs(score * 123 + 456)}</text>
</svg>`;

  try {
    const encoded = typeof btoa === 'function'
      ? btoa(unescape(encodeURIComponent(svgString)))
      : encodeURIComponent(svgString);
    return `data:image/svg+xml;base64,${encoded}`;
  } catch {
    return `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
  }
}

export const initialStudentResultsData: StudentResultSummary[] = [];
