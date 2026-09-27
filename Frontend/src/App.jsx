import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import RegisterStudent from './pages/RegisterStudent';
import StudentHome from './pages/StudentHome';
import StudentProfile from './pages/StudentProfile';
import TeacherDashboard from './pages/TeacherDashboard';
import TeacherProfile from './pages/TeacherProfile';
import AdminDashboard from './pages/AdminDashboard';
import AdminQuizAnalytics from './pages/AdminQuizAnalytics';
import AdminPlatformOverview from './pages/AdminPlatformOverview';
import TeacherList from './pages/TeacherList';
import AddTeacher from './pages/AddTeacher';
import StudentList from './pages/StudentList';
import CreateQuiz from './pages/CreateQuiz';
import ViewQuizzes from './pages/ViewQuizzes';
import TakeQuiz from './pages/TakeQuiz';
import StudentQuizzes from './pages/StudentQuizzes';
import TeacherQuizzes from './pages/TeacherQuizzes';
import QuizAttempts from './pages/QuizAttempts';
import UpdateQuiz from './pages/UpdateQuiz';
import ProtectedRoute from './components/ProtectedRoute';
import CreateStudyPlan from './pages/CreateStudyPlan';
import StudyPlanResult from './pages/StudyPlanResult';
import CalendarCallback from './pages/CalendarCallback';
import TimetableView from './pages/TimetableView';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import StudyJournal from './pages/StudyJournal';
import AIQuizGenerator from './pages/AIQuizGenerator';

import AdminCoursePortal from './pages/AdminCoursePortal';
import CourseExplorer from './pages/CourseExplorer';
import TeacherMaterials from './pages/TeacherMaterials';


import AILearningLabPage from './pages/AILearningLabPage';


const App = () => {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/register" element={<RegisterStudent />} />

        {/* Protected Student Routes */}
        <Route path="/student/home" element={
          <ProtectedRoute allowedRoles={['student']}>
            <StudentHome />
          </ProtectedRoute>
        } />
        <Route path="/student/profile" element={
          <ProtectedRoute allowedRoles={['student']}>
            <StudentProfile />
          </ProtectedRoute>
        } />
        <Route path="/student/take-quiz/:id" element={
          <ProtectedRoute allowedRoles={['student']}>
            <TakeQuiz />
          </ProtectedRoute>
        } />
        <Route path="/student/quizzes" element={
          <ProtectedRoute allowedRoles={['student']}>
            <StudentQuizzes />
          </ProtectedRoute>
        } />

        {/* Teacher Routes */}
        <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
        <Route path="/teacher/profile" element={<TeacherProfile />} />
        <Route path="/teacher/create-quiz" element={<CreateQuiz />} />
        <Route path="/teacher/view-quizzes" element={<ViewQuizzes />} />
        <Route path="/teacher/update-quiz/:id" element={<UpdateQuiz />} />
        <Route path="/teacher/quizzes" element={<TeacherQuizzes />} />
        <Route path="/teacher/quiz-attempts/:id" element={<QuizAttempts />} />

        {/* Admin Routes */}
        <Route path="/admin/dashboard" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        } />

        {/* Admin Management Routes */}
        <Route path="/admin/teachers" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <TeacherList />
          </ProtectedRoute>
        } />
        <Route path="/admin/add-teacher" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AddTeacher />
          </ProtectedRoute>
        } />
        <Route path="/admin/students" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <StudentList />
          </ProtectedRoute>
        } />
        {/* Protected Routes (Ideally wrapped in a ProtectedRoute component) */}
        <Route path="/student/home" element={<StudentHome />} />
        <Route path="/student/create-plan" element={<CreateStudyPlan />} />
        <Route path="/student/view-plan" element={<StudyPlanResult />} />
        <Route path="/student/timetable" element={<TimetableView />} />
        <Route path="/student/analytics" element={<AnalyticsDashboard />} />
        <Route path="/student/journal" element={<StudyJournal />} />
        <Route path="/calendar-callback" element={<CalendarCallback />} />


        <Route path="/student/profile" element={<StudentProfile />} />
        <Route path="/student/quiz-generator" element={<AIQuizGenerator />} />
        <Route path="/student/ai_learning_lab" element={<AILearningLabPage />} />

        <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/courses" element={<AdminCoursePortal />} />

        {/* Admin Management Routes */}
        <Route path="/admin/teachers" element={<TeacherList />} />
        <Route path="/admin/add-teacher" element={<AddTeacher />} />
        <Route path="/admin/students" element={<StudentList />} />
        <Route path="/admin/analytics" element={<AdminQuizAnalytics />} />
        <Route path="/admin/platform-overview" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminPlatformOverview />
          </ProtectedRoute>
        } />

        {/* Teacher Routes */}
        <Route path="/teacher/profile" element={<TeacherProfile />} />
        <Route path="/teacher/materials" element={<TeacherMaterials />} />

        {/* Student Routes */}
        <Route path="/student/profile" element={<StudentProfile />} />
        <Route path="/student/courses" element={<CourseExplorer />} />






      </Routes>
    </div>
  );
};

export default App;
