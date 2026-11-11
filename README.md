# Dudex Smart Academy - Teacher Portal

A faculty management web application for Dudex Smart Academy, powered by **React 19**, **Vite**, **TypeScript**, **Tailwind CSS**, and **Supabase** (PostgreSQL, Row Level Security, Storage, Realtime, and Database Functions).

---

## Architecture

The Teacher Portal is integrated with a centralized Supabase backend designed to be shared across:
1. **Teacher Portal** (Faculty management, attendance, live placement classes, notes, question bank, assessments, results)
2. **Student Portal** (Student dashboard, live class join, notes viewing, assessment taking, results)
3. **Admin Portal** (Institutional administration, user provisioning, audit inspection)

```
Teacher Frontend (React 19 + Vite)
        ↓
Supabase Client (src/lib/supabase.ts)
        ↓
Supabase Auth (JWT & Roles)
        ↓
PostgreSQL + Row Level Security (RLS)
        ↓
Database Functions & RPCs (Auto-grading, Attendance Calculations)
        ↓
Storage (academy-notes private bucket)
        ↓
Realtime (supabase_realtime publications)
```

---

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Provide your Supabase Project URL and Anon/Publishable Key:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

### 3. Run Migrations
Run migrations located in `supabase/migrations/` (001 through 044) in order, after checking the preflight notes in the [security rollout guide](../dudex-admin-website/SECURITY-ROLLOUT.md).

### 4. Start Development Server
```bash
npm run dev
```

### 5. Build for Production
```bash
npm run build
```

---

## Documentation Index

- [Backend Architecture](BACKEND_ARCHITECTURE.md)
- [Database Schema Specification](DATABASE_SCHEMA.md)
- [Authorization Model](AUTHORIZATION_MODEL.md)
- [Row Level Security Policies](RLS_POLICIES.md)
- [Storage Architecture](STORAGE_ARCHITECTURE.md)
- [Realtime Architecture](REALTIME_ARCHITECTURE.md)
- [Assessment & Auto-Grading Flow](ASSESSMENT_GRADING_FLOW.md)
- [Attendance Architecture & Calculation Flow](ATTENDANCE_FLOW.md)
- [Daily Notes Flow](DAILY_NOTES_FLOW.md)
- [Environment Setup Guide](ENV_SETUP.md)
- [API & Database Functions](API_FUNCTIONS.md)
- [Testing & Verification Guide](TESTING.md)

# Smart-Acadamy-Teacher-panel
