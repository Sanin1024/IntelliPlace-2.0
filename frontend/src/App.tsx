import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Authentication pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Layout
import AppLayout from './layouts/AppLayout';

// Dashboards
import StudentDashboard from './pages/student/StudentDashboard';
import PODashboard from './pages/po/PODashboard';
import TrainerDashboard from './pages/trainer/TrainerDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';

// Admin pages
import BranchesPage from './pages/admin/BranchesPage';
import BatchesPage from './pages/admin/BatchesPage';
import UsersPage from './pages/admin/UsersPage';

// Student pages
import ProfilePage from './pages/student/ProfilePage';
import PracticePage from './pages/student/PracticePage';
import ResourcesPage from './pages/student/ResourcesPage';
import ProblemListPage from './pages/student/ProblemListPage';
import ProblemDetailPage from './pages/student/ProblemDetailPage';
import CompaniesPage from './pages/student/CompaniesPage';

// Phase 3 student pages
import MockTestListPage from './pages/student/MockTestListPage';
import TakeTestPage from './pages/student/TakeTestPage';
import TestResultPage from './pages/student/TestResultPage';
import AnalyticsPage from './pages/student/AnalyticsPage';

// Placement Officer pages
import StudentsPage from './pages/po/StudentsPage';
import StudentDetailPage from './pages/po/StudentDetailPage';
import PublishDrivePage from './pages/po/PublishDrivePage';

// Trainer pages
import QuestionBankPage from './pages/trainer/QuestionBankPage';
import ProblemBankPage from './pages/trainer/ProblemBankPage';
import UploadResourcePage from './pages/trainer/UploadResourcePage';

// Phase 3 trainer pages
import MockTestBuilderPage from './pages/trainer/MockTestBuilderPage';

import { ToastProvider } from './context/ToastContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Routes for authenticated users */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardRouter />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/resources" element={<ResourcesPage />} />
              <Route path="/problems" element={<ProblemListPage />} />
              <Route path="/problems/:id" element={<ProblemDetailPage />} />
            </Route>
          </Route>

          {/* Student routes */}
          <Route element={<ProtectedRoute allowedRoles={['student']} />}>
            <Route element={<AppLayout />}>
              <Route path="/practice" element={<PracticePage />} />
              <Route path="/tests" element={<MockTestListPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />

              <Route
                path="/tests/attempts/:attemptId/result"
                element={<TestResultPage />}
              />
            </Route>

            {/* Full-page test interface without the sidebar */}
            <Route
              path="/tests/:testId/take"
              element={<TakeTestPage />}
            />
          </Route>

          {/* Company listing for students and placement officers */}
          <Route
            element={
              <ProtectedRoute allowedRoles={['student', 'po']} />
            }
          >
            <Route element={<AppLayout />}>
              <Route path="/companies" element={<CompaniesPage />} />
            </Route>
          </Route>

          {/* Placement Officer routes */}
          <Route
            element={<ProtectedRoute allowedRoles={['po', 'admin']} />}
          >
            <Route element={<AppLayout />}>
              <Route path="/po/students" element={<StudentsPage />} />

              <Route
                path="/po/students/:studentId"
                element={<StudentDetailPage />}
              />

              <Route
                path="/po/companies"
                element={<PublishDrivePage />}
              />
            </Route>
          </Route>

          {/* Trainer routes */}
          <Route element={<ProtectedRoute allowedRoles={['trainer']} />}>
            <Route element={<AppLayout />}>
              <Route
                path="/trainer/questions"
                element={<QuestionBankPage />}
              />

              <Route
                path="/trainer/problems"
                element={<ProblemBankPage />}
              />

              <Route
                path="/trainer/tests"
                element={<MockTestBuilderPage />}
              />

              <Route
                path="/trainer/resources"
                element={<UploadResourcePage />}
              />
            </Route>
          </Route>

          {/* Admin routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route element={<AppLayout />}>
              <Route
                path="/admin/branches"
                element={<BranchesPage />}
              />

              <Route
                path="/admin/batches"
                element={<BatchesPage />}
              />

              <Route
                path="/admin/users"
                element={<UsersPage />}
              />
            </Route>
          </Route>

          {/* Redirect root */}
          <Route
            path="/"
            element={<Navigate to="/dashboard" replace />}
          />

          {/* Handle unknown routes */}
          <Route
            path="*"
            element={<Navigate to="/dashboard" replace />}
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </ToastProvider>
</ErrorBoundary>
);
}

// Route to the correct dashboard based on the user's role
function DashboardRouter() {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  switch (user.role) {
    case 'admin':
      return <AdminDashboard />;

    case 'po':
      return <PODashboard />;

    case 'trainer':
      return <TrainerDashboard />;

    default:
      return <StudentDashboard />;
  }
}