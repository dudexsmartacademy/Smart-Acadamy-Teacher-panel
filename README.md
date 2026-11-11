# Smart-Acadamy-Teacher-panel

A modern, full-featured faculty management portal for **DudeX Smart Academy**, built with **React 19**, **TypeScript**, **Vite**, **Tailwind CSS**, and **Supabase**. It provides teachers with end-to-end tools to manage daily classroom attendance, advance leave applications, 90-day curriculum heatmaps, interactive study notes, MCQ question banks, external HackerRank coding assessments, live placement sessions, and student performance tracking.

Part of the **DudeX Smart Academy** platform ecosystem, designed to operate in sync with the [Admin Panel](https://github.com/dudexsmartacademy/Smart-Acadamy-admin-panel) and [Student Portal](https://github.com/dudexsmartacademy/Smart-Acadamy-Student-panel-).

---

## ✨ Features & Functional Modules

| Module | Description |
|---|---|
| **Faculty Dashboard** | Overview of today's schedule, scheduled classes, attendance check-in status, upcoming assessments, and recent circulars |
| **90-Day Attendance Heatmap** | Interactive 90-day semester curriculum calendar with color-coded daily statuses (Present, Half Day, Leave, Absent, Rejected) |
| **Attendance Check-In & Check-Out** | Mark daily class attendance with check-in/out timestamps and automatic Sunday institutional holiday detection |
| **Advance Leave System** | Apply for advance leaves (Casual, Medical, Duty, On-Duty) with instant real-time synchronization with the Admin approval workflow |
| **Leave Rejection Protection** | Leaves rejected by administration clearly display as `Leave Rejected` without penalizing faculty attendance rate or marking the teacher absent |
| **Live Placement Classes** | Create, schedule, and launch live video sessions (Google Meet, Zoom) with batch targeting (Batch 1–5) and student alerts |
| **Daily Notes & Study Materials** | Upload curriculum materials, lecture notes, and multi-file attachments to the private `academy-notes` Supabase storage bucket |
| **MCQ Assessments** | Author quizzes, configure question options, set time limits and passing criteria with automatic grading |
| **Coding & HackerRank Tests** | Publish external coding challenge URLs and review, verify, or adjust student-submitted scorecards and screenshots |
| **Student Roster & Profiles** | Browse enrolled students filtered by college, department, and batch with detailed academic progress records |
| **Results & Gradebooks** | Comprehensive evaluation sheets with percentage benchmarks, distinction tiers, and exportable grade reports |
| **Academic Calendar** | View scheduled lectures, tests, milestones, and institutional holidays with location/room numbers |
| **Announcements & Notifications** | Real-time circulars from administration and cohort-specific notices powered by Supabase Realtime |

---

## 🛠 Tech Stack

- **Frontend Framework** — [React 19](https://react.dev/)
- **Programming Language** — [TypeScript 6](https://www.typescriptlang.org/)
- **Build Tool** — [Vite](https://vite.dev/) with Fast Refresh
- **Styling** — [Tailwind CSS](https://tailwindcss.com/)
- **Icons** — [Lucide React](https://lucide.dev/)
- **Backend & Database** — [Supabase](https://supabase.com/) (PostgreSQL 15, Auth, Row Level Security, Storage, Realtime)
- **Deployment** — [Vercel](https://vercel.com/) (Single Page Application configuration)

---

## 🏗 Architecture & Attendance Flow

```
Teacher Portal (dudex-teacher-portal)
   │
   ├─► Supabase Auth (Teacher Role Claims)
   │
   ├─► PostgreSQL Database
   │    ├── teacher_profiles          (Faculty credentials & assigned department)
   │    ├── teacher_assignments       (Subject and class allocations)
   │    ├── teacher_leave_requests    (Submitted leave requests & admin decision state)
   │    ├── teacher_attendance        (Daily recorded check-in / check-out data)
   │    ├── live_classes              (Faculty-scheduled live lectures)
   │    ├── notes & note_attachments  (Lecture notes & attachments)
   │    ├── assessments & questions   (MCQ and coding examination data)
   │    └── external_assessment_submissions (Student HackerRank scorecards)
   │
   ├─► Realtime Postgres Events
   │    ├── teacher_leave_requests    (Instant notification when Admin approves or rejects leave)
   │    ├── teacher_attendance        (Real-time attendance ledger sync)
   │    └── announcements             (Instant circular broadcast alerts)
   │
   └─► Private Storage Buckets
        └── academy-notes             (Courseware, PDFs, source code attachments)
```

---

## 📋 Prerequisites

- **Node.js** ≥ 18.0.0
- **npm** ≥ 9.0.0
- A **Supabase** project configured with the DudeX Smart Academy schema

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/dudexsmartacademy/Smart-Acadamy-Teacher-panel.git
cd Smart-Acadamy-Teacher-panel
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables
Copy the example environment configuration:
```bash
cp .env.example .env
```

Configure your Supabase credentials:
```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-or-publishable-key
```

> ⚠️ **Security Notice**: Never commit `.env` or `.env.local` to GitHub. The service role key must never be used in client-facing applications.

### 4. Start the development server
```bash
npm run dev
```
Open your browser at `http://localhost:5173` (or the indicated local port).

### 5. Build for production
```bash
npm run build
```
This runs TypeScript type checking (`tsc -b`) followed by the Vite production bundler, generating optimized output in `dist/`.

### 6. Preview production build locally
```bash
npm run preview
```

---

## 📂 Project Structure

```text
dudex-teacher-portal/
├── public/                     # Static brand assets, favicons, redirects
├── src/
│   ├── components/             # Component library
│   │   ├── attendance/         # ConfirmDialog, AdvanceLeaveDialog
│   │   ├── dashboard/          # TodaySchedule, PendingAttendance, RecentAnnouncements
│   │   ├── Header.tsx          # Top navigation bar with user profile dropdown
│   │   ├── CustomSelect.tsx    # Accessible dropdown select component
│   │   └── DeleteModal.tsx     # Generic confirmation dialogs
│   ├── data/                   # Data fixtures and local fallbacks
│   ├── hooks/                  # Custom React hooks (useTeacherRealtime, useBatchOptions)
│   ├── layouts/                # TeacherLayout shell with responsive sidebar & navigation
│   ├── lib/                    # Supabase client initialization (`src/lib/supabase.ts`)
│   ├── pages/                  # Application views
│   │   ├── dashboard/          # Teacher Overview Dashboard
│   │   ├── attendance/         # 90-Day Curriculum Heatmap & Daily Records
│   │   ├── live-classes/       # Live session scheduling and video link dispatcher
│   │   ├── notes/              # Curriculum notes authoring & file uploading
│   │   ├── assessments/        # MCQ assessments & HackerRank coding challenges
│   │   ├── results/            # Student gradebooks and scorecard verification
│   │   ├── students/           # Enrolled students directory & profiles
│   │   ├── subjects/           # Assigned subjects & course dashboard
│   │   └── profile/            # Faculty profile information & security settings
│   ├── routes/                 # Application routing configuration
│   ├── services/               # API service layer communicating with Supabase
│   │   ├── teacherAttendanceService.ts  # 90-day attendance window & leave mapping
│   │   ├── liveClassService.ts          # Live placement classes management
│   │   ├── notesService.ts              # Notes & file attachment uploads
│   │   ├── mcqAssessmentService.ts      # MCQ creation & evaluation
│   │   ├── hackerrankService.ts         # External scorecard verification
│   │   ├── announcementService.ts       # Broadcast circulars & notifications
│   │   └── studentService.ts            # Student cohort data retrieval
│   └── types/                  # TypeScript interface contracts & database models
├── supabase/                   # Database configuration, functions, and SQL migrations
├── .env.example                # Template for environment variables
├── .gitignore                  # Git ignore rules (securing .env, node_modules, dist)
├── index.html                  # HTML template entry point
├── package.json                # Project dependencies and script declarations
├── tsconfig.json               # TypeScript compiler configuration
├── vercel.json                 # Vercel SPA routing and header configuration
└── vite.config.ts              # Vite bundler configuration
```

---

## 🌐 Deployment (Vercel)

The application is pre-configured with `vercel.json` for seamless Single Page Application routing:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

To deploy via Vercel:
```bash
npm install -g vercel
vercel
```
Or connect the repository on the [Vercel Dashboard](https://vercel.com/dashboard) and specify `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in the project environment settings.

---

## 📜 Available Scripts

| Command | Action |
|---|---|
| `npm run dev` | Starts the Vite local development server with HMR |
| `npm run build` | Runs TypeScript type checking (`tsc -b`) and builds production bundles to `dist/` |
| `npm run preview` | Locally serves the production `dist/` build |
| `npm run lint` | Runs ESLint for code quality and syntax validation |

---

## 🧩 Related Repositories

| Repository | Description |
|---|---|
| **[Smart-Acadamy-admin-panel](https://github.com/dudexsmartacademy/Smart-Acadamy-admin-panel)** | Admin portal for managing colleges, students, faculty, batches, fee collections, and system policies |
| **[Smart-Acadamy-Student-panel-](https://github.com/dudexsmartacademy/Smart-Acadamy-Student-panel-)** | Student portal for attending classes, accessing materials, taking assessments, and viewing scorecards |

---

## 📄 License

This software is private and proprietary to **DudeX Smart Academy**.
