import { Navigate, Route, Routes } from "react-router-dom";
import TeacherLayout from "../layouts/TeacherLayout";

import Dashboard from "../pages/dashboard/Dashboard";
import Classes from "../pages/classes/Classes";
import CreateClass from "../pages/classes/CreateClass";
import EditClass from "../pages/classes/EditClass";
import ClassDashboard from "../pages/classes/ClassDashboard";
import ClassSearch from "../pages/classes/ClassSearch";

import Students from "../pages/students/Students";
import StudentProfile from "../pages/students/StudentProfile";

import Attendance from "../pages/attendance/Attendance";
import TeacherAttendance from "../pages/attendance/TeacherAttendance";

import Subjects from "../pages/subjects/Subjects";
import SubjectDashboard from "../pages/subjects/SubjectDashboard";

import MCQAssessments from "../pages/mcq-assessments/MCQAssessments";
import CreateMCQAssessment from "../pages/mcq-assessments/CreateMCQAssessment";
import EditMCQAssessment from "../pages/mcq-assessments/EditMCQAssessment";
import MCQAssessmentDetails from "../pages/mcq-assessments/MCQAssessmentDetails";

import HackerRankAssessments from "../pages/hackerrank/HackerRankAssessments";

import CreateCodingAssessment from "../pages/coding/CreateCodingAssessment";
import Coding from "../pages/coding/Coding";
import CodingEvaluation from "../pages/coding/CodingEvaluation";
import CodingResults from "../pages/coding/CodingResults";

import Results from "../pages/results/Results";
import IndividualResult from "../pages/results/IndividualResult";

import Performance from "../pages/performance/Performance";
import AtRiskStudents from "../pages/performance/AtRiskStudents";

import Materials from "../pages/materials/Materials";
import CreateMaterial from "../pages/materials/CreateMaterial";
import MaterialDetails from "../pages/materials/MaterialDetails";
import EditMaterial from "../pages/materials/EditMaterial";

import Announcements from "../pages/announcements/Announcements";
import CreateAnnouncement from "../pages/announcements/CreateAnnouncement";
import AnnouncementDetails from "../pages/announcements/AnnouncementDetails";
import EditAnnouncement from "../pages/announcements/EditAnnouncement";

import Calendar from "../pages/calendar/Calendar";

import StudentCommunication from "../pages/communication/StudentCommunication";
import CreateCommunication from "../pages/communication/CreateCommunication";
import CommunicationDetails from "../pages/communication/CommunicationDetails";
import EditCommunication from "../pages/communication/EditCommunication";

import Exports from "../pages/exports/Exports";

import Profile from "../pages/profile/Profile";

import Notes from "../pages/notes/Notes";
import CreateNote from "../pages/notes/CreateNote";
import NoteDetails from "../pages/notes/NoteDetails";
import EditNote from "../pages/notes/EditNote";

import Notifications from "../pages/notifications/Notifications";

import LiveClasses from "../pages/live-classes/LiveClasses";
import CreateLiveClass from "../pages/live-classes/CreateLiveClass";
import LiveClassDetails from "../pages/live-classes/LiveClassDetails";
import EditLiveClass from "../pages/live-classes/EditLiveClass";

import Login from "../pages/auth/Login";
import ResetPassword from "../pages/auth/ResetPassword";
import Home from "../pages/Home";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/home" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/signup" element={<Navigate to="/login" replace />} />
      <Route element={<TeacherLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />

        <Route path="/classes" element={<Classes />} />
        <Route path="/classes/create" element={<CreateClass />} />
        <Route path="/classes/search" element={<ClassSearch />} />
        <Route path="/classes/:id/edit" element={<EditClass />} />
        <Route path="/classes/:id" element={<ClassDashboard />} />

        <Route path="/students" element={<Students />} />
        <Route path="/students/:id" element={<StudentProfile />} />

        <Route path="/attendance" element={<Attendance />} />
        <Route path="/my-attendance" element={<TeacherAttendance />} />

        <Route path="/subjects" element={<Subjects />} />
        <Route path="/subjects/:id" element={<SubjectDashboard />} />

        {/* Dedicated MCQ Assessment Routes */}
        <Route path="/mcq-assessments" element={<MCQAssessments />} />
        <Route path="/mcq-assessments/create" element={<CreateMCQAssessment />} />
        <Route path="/mcq-assessments/create/preview" element={<CreateMCQAssessment />} />
        <Route path="/mcq-assessments/create/schedule" element={<CreateMCQAssessment />} />
        <Route path="/mcq-assessments/:id" element={<MCQAssessmentDetails />} />
        <Route path="/mcq-assessments/:id/edit" element={<EditMCQAssessment />} />

        {/* Dedicated HackerRank Challenge Routes */}
        <Route path="/hackerrank" element={<HackerRankAssessments />} />

        <Route path="/coding" element={<Coding />} />
        <Route path="/coding/create" element={<CreateCodingAssessment />} />
        <Route path="/coding/:id/results" element={<CodingResults />} />
        <Route path="/coding/:id" element={<CodingEvaluation />} />

        <Route path="/results" element={<Results />} />
        <Route path="/results/:id" element={<IndividualResult />} />

        <Route path="/performance" element={<Performance />} />
        <Route path="/performance/at-risk" element={<AtRiskStudents />} />

        <Route path="/materials" element={<Materials />} />
        <Route path="/materials/create" element={<CreateMaterial />} />
        <Route path="/materials/:id" element={<MaterialDetails />} />
        <Route path="/materials/:id/edit" element={<EditMaterial />} />

        <Route path="/announcements" element={<Announcements />} />
        <Route path="/announcements/create" element={<CreateAnnouncement />} />
        <Route path="/announcements/:id" element={<AnnouncementDetails />} />
        <Route path="/announcements/:id/edit" element={<EditAnnouncement />} />

        <Route path="/calendar" element={<Calendar />} />

        <Route path="/communication" element={<StudentCommunication />} />
        <Route path="/communication/create" element={<CreateCommunication />} />
        <Route path="/communication/:id" element={<CommunicationDetails />} />
        <Route path="/communication/:id/edit" element={<EditCommunication />} />

        <Route path="/exports" element={<Exports />} />

        <Route path="/profile" element={<Profile />} />

        <Route path="/notes" element={<Notes />} />
        <Route path="/notes/create" element={<CreateNote />} />
        <Route path="/notes/:id" element={<NoteDetails />} />
        <Route path="/notes/:id/edit" element={<EditNote />} />

        <Route path="/notifications" element={<Notifications />} />

        <Route path="/live-classes" element={<LiveClasses />} />
        <Route path="/live-classes/create" element={<CreateLiveClass />} />
        <Route path="/live-classes/:id" element={<LiveClassDetails />} />
        <Route path="/live-classes/:id/edit" element={<EditLiveClass />} />

        <Route
          path="*"
          element={<Navigate to="/dashboard" replace />}
        />
      </Route>
    </Routes>
  );
}
