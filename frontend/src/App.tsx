import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './layouts/AppLayout';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Eagerly loaded: needed on first paint
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import NotFoundPage from './pages/NotFoundPage';
const ResumeBuilderPage = lazy(() => import('./pages/student/ResumeBuilderPage'));
const ResumeManagerPage = lazy(() => import('./pages/student/ResumeManagerPage'));
const AuditLogsPage = lazy(() => import('./pages/admin/AuditLogsPage'));

// Lazily loaded: each page becomes its own chunk
const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard'));
const PODashboard = lazy(() => import('./pages/po/PODashboard'));
const TrainerDashboard = lazy(() => import('./pages/trainer/TrainerDashboard'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));

// Admin
const BranchesPage = lazy(() => import('./pages/admin/BranchesPage'));
const BatchesPage = lazy(() => import('./pages/admin/BatchesPage'));
const UsersPage = lazy(() => import('./pages/admin/UsersPage'));
const AcademicIntegrityPage = lazy(() => import('./pages/admin/AcademicIntegrityPage'));
const SyncMonitorPage = lazy(() => import('./pages/admin/SyncMonitorPage'));
const AdminSettingsPage = lazy(() => import('./pages/admin/AdminSettingsPage'));
const BulkImportPage = lazy(() => import('./pages/admin/BulkImportPage'));

// Student
const ProfilePage = lazy(() => import('./pages/student/ProfilePage'));
const AcademicPage = lazy(() => import('./pages/student/AcademicPage'));
const DrivesPage = lazy(() => import('./pages/student/DrivesPage'));
const MyTrainingPage = lazy(() => import('./pages/student/MyTrainingPage'));
const TrainingDashboardPage = lazy(() => import('./pages/student/TrainingDashboardPage'));
const ResourceLibraryPage = lazy(() => import('./pages/student/ResourceLibraryPage'));
const RecommendationsPage = lazy(() => import('./pages/student/RecommendationsPage'));
const MySkillsPage = lazy(() => import('./pages/student/MySkillsPage'));
const PracticePage = lazy(() => import('./pages/student/PracticePage'));
const ResourcesPage = lazy(() => import('./pages/student/ResourcesPage'));
const ProblemListPage = lazy(() => import('./pages/student/ProblemListPage'));
const ProblemDetailPage = lazy(() => import('./pages/student/ProblemDetailPage'));
const CompaniesPage = lazy(() => import('./pages/student/CompaniesPage'));
const MockTestListPage = lazy(() => import('./pages/student/MockTestListPage'));
const TakeTestPage = lazy(() => import('./pages/student/TakeTestPage'));
const TestResultPage = lazy(() => import('./pages/student/TestResultPage'));
const AnalyticsPage = lazy(() => import('./pages/student/AnalyticsPage'));
const MyInterviewsPage = lazy(() => import('./pages/student/MyInterviewsPage'));
const NotificationPreferencesPage = lazy(() => import('./pages/student/NotificationPreferencesPage'));
const MyApplicationsPage = lazy(() => import('./pages/student/MyApplicationsPage'));
const MyOffersPage = lazy(() => import('./pages/student/MyOffersPage'));
const PrivacyDashboardPage = lazy(() => import('./pages/student/PrivacyDashboardPage'));
const MechanicalTrainingPage = lazy(() => import('./pages/student/MechanicalTrainingPage'));
const MechQuestionBankPage = lazy(() => import('./pages/student/MechQuestionBankPage'));
const MechProjectsPage = lazy(() => import('./pages/student/MechProjectsPage'));
const MechCompaniesPage = lazy(() => import('./pages/student/MechCompaniesPage'));
const MechSoftwarePage = lazy(() => import('./pages/student/MechSoftwarePage'));
const CivilTrainingPage = lazy(() => import('./pages/student/CivilTrainingPage'));
const CivilQuestionBankPage = lazy(() => import('./pages/student/CivilQuestionBankPage'));
const CivilCompaniesPage = lazy(() => import('./pages/student/CivilCompaniesPage'));
const ECETrainingPage = lazy(() => import('./pages/student/ECETrainingPage'));
const ECEQuestionBankPage = lazy(() => import('./pages/student/ECEQuestionBankPage'));
const ECECompaniesPage = lazy(() => import('./pages/student/ECECompaniesPage'));
const EEETrainingPage = lazy(() => import('./pages/student/EEETrainingPage'));
const EEEQuestionBankPage = lazy(() => import('./pages/student/EEEQuestionBankPage'));
const EEECompaniesPage = lazy(() => import('./pages/student/EEECompaniesPage'));
const ITTrainingPage = lazy(() => import('./pages/student/ITTrainingPage'));
const ITQuestionBankPage = lazy(() => import('./pages/student/ITQuestionBankPage'));
const ITCompaniesPage = lazy(() => import('./pages/student/ITCompaniesPage'));

// Placement Officer
const StudentsPage = lazy(() => import('./pages/po/StudentsPage'));
const StudentDetailPage = lazy(() => import('./pages/po/StudentDetailPage'));
const PublishDrivePage = lazy(() => import('./pages/po/PublishDrivePage'));
const DriveManagementPage = lazy(() => import('./pages/po/DriveManagementPage'));
const EligibilityShortlistPage = lazy(() => import('./pages/po/EligibilityShortlistPage'));
const IntegrityFlagsPage = lazy(() => import('./pages/po/IntegrityFlagsPage'));
const StaleResumesPage = lazy(() => import('./pages/po/StaleResumesPage'));

// Trainer
const QuestionBankPage = lazy(() => import('./pages/trainer/QuestionBankPage'));
const ProblemBankPage = lazy(() => import('./pages/trainer/ProblemBankPage'));
const UploadResourcePage = lazy(() => import('./pages/trainer/UploadResourcePage'));
const MockTestBuilderPage = lazy(() => import('./pages/trainer/MockTestBuilderPage'));
const TrainingSchedulerPage = lazy(() => import('./pages/trainer/TrainingSchedulerPage'));
const TrainerProgressPage = lazy(() => import('./pages/trainer/TrainerProgressPage'));
const AttemptActivityPage = lazy(() => import('./pages/trainer/AttemptActivityPage'));
const TrainerDashboardPage = lazy(() => import('./pages/trainer/TrainerDashboardPage'));

// Admin & Shared
const TrainingAnalyticsPage = lazy(() => import('./pages/admin/TrainingAnalyticsPage'));

const ROLES = {
  STUDENT: 'student',
  PO: 'po',
  TRAINER: 'trainer',
  ADMIN: 'admin',
} as const;

const DASHBOARDS = {
  [ROLES.ADMIN]: AdminDashboard,
  [ROLES.PO]: PODashboard,
  [ROLES.TRAINER]: TrainerDashboard,
  [ROLES.STUDENT]: StudentDashboard,
};

function PageLoader() {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{ display: 'grid', placeItems: 'center', minHeight: '50vh' }}
    >
      Loading…
    </div>
  );
}

// Route users to the dashboard appropriate for their role
function DashboardRouter() {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  const Dashboard = DASHBOARDS[user.role];

  if (!Dashboard) {
    return (
      <div role="alert" style={{ padding: '2rem' }}>
        <h2>Access not configured</h2>
        <p>Your account role ("{String(user.role)}") has no dashboard. Please contact an administrator.</p>
      </div>
    );
  }

  return <Dashboard />;
}

// Route users to the mock test view appropriate for their role
function TestsRouter() {
  const { user } = useAuth();
  if (user?.role === ROLES.TRAINER || user?.role === ROLES.ADMIN) {
    return <MockTestBuilderPage />;
  }
  return <MockTestListPage />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <BrowserRouter>
            <AuthProvider>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Public */}
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />

                  {/* Everything below requires authentication */}
                  <Route element={<ProtectedRoute />}>
                    {/* Pages rendered inside the sidebar layout */}
                    <Route element={<AppLayout />}>
                      {/* Any authenticated role */}
                      <Route path="/dashboard" element={<DashboardRouter />} />
                      <Route path="/profile" element={<ProfilePage />} />
                      <Route path="/resources" element={<ResourcesPage />} />
                      <Route path="/problems" element={<ProblemListPage />} />
                      <Route path="/problems/:id" element={<ProblemDetailPage />} />

                      {/* Student only */}
                      <Route element={<ProtectedRoute allowedRoles={[ROLES.STUDENT]} />}>
                        <Route path="/drives" element={<DrivesPage />} />
                        <Route path="/training" element={<TrainingDashboardPage />} />
                        <Route path="/training/resources" element={<ResourceLibraryPage />} />
                        <Route path="/mechanical-training" element={<MechanicalTrainingPage />} />
                        <Route path="/mechanical-training/questions" element={<MechQuestionBankPage />} />
                        <Route path="/mechanical-training/projects" element={<MechProjectsPage />} />
                        <Route path="/mechanical-training/companies" element={<MechCompaniesPage />} />
                        <Route path="/mechanical-training/software" element={<MechSoftwarePage />} />
                        <Route path="/civil-training" element={<CivilTrainingPage />} />
                        <Route path="/civil-training/questions" element={<CivilQuestionBankPage />} />
                        <Route path="/civil-training/companies" element={<CivilCompaniesPage />} />
                        <Route path="/ece-training" element={<ECETrainingPage />} />
                        <Route path="/ece-training/questions" element={<ECEQuestionBankPage />} />
                        <Route path="/ece-training/companies" element={<ECECompaniesPage />} />
                        <Route path="/eee-training" element={<EEETrainingPage />} />
                        <Route path="/eee-training/questions" element={<EEEQuestionBankPage />} />
                        <Route path="/eee-training/companies" element={<EEECompaniesPage />} />
                        <Route path="/it-training" element={<ITTrainingPage />} />
                        <Route path="/it-training/questions" element={<ITQuestionBankPage />} />
                        <Route path="/it-training/companies" element={<ITCompaniesPage />} />
                        <Route path="/training/portal" element={<MyTrainingPage />} />
                        <Route path="/student/training" element={<MyTrainingPage />} />
                        <Route path="/recommendations" element={<RecommendationsPage />} />
                        <Route path="/skills" element={<MySkillsPage />} />
                        <Route path="/academic" element={<AcademicPage />} />
                        <Route path="/practice" element={<PracticePage />} />
                        <Route path="/resume" element={<ResumeBuilderPage />} />
                        <Route path="/resumes" element={<ResumeManagerPage />} />
                        <Route path="/student/resumes" element={<ResumeManagerPage />} />
                        <Route path="/interviews" element={<MyInterviewsPage />} />
                        <Route path="/student/interviews" element={<MyInterviewsPage />} />
                        <Route path="/applications" element={<MyApplicationsPage />} />
                        <Route path="/student/applications" element={<MyApplicationsPage />} />
                        <Route path="/offers" element={<MyOffersPage />} />
                        <Route path="/student/offers" element={<MyOffersPage />} />
                        <Route path="/privacy" element={<PrivacyDashboardPage />} />
                        <Route path="/student/privacy" element={<PrivacyDashboardPage />} />
                        <Route path="/notifications/preferences" element={<NotificationPreferencesPage />} />
                        <Route path="/analytics" element={<AnalyticsPage />} />
                        <Route
                          path="/tests/attempts/:attemptId/result"
                          element={<TestResultPage />}
                        />
                      </Route>

                      {/* Student + Trainer + Admin: Mock Tests */}
                      <Route
                        element={<ProtectedRoute allowedRoles={[ROLES.STUDENT, ROLES.TRAINER, ROLES.ADMIN]} />}
                      >
                        <Route path="/tests" element={<TestsRouter />} />
                      </Route>

                      {/* Student + PO */}
                      <Route
                        element={<ProtectedRoute allowedRoles={[ROLES.STUDENT, ROLES.PO]} />}
                      >
                        <Route path="/companies" element={<CompaniesPage />} />
                      </Route>

                      {/* PO + Admin */}
                      <Route
                        element={<ProtectedRoute allowedRoles={[ROLES.PO, ROLES.ADMIN]} />}
                      >
                        <Route path="/po/drives" element={<DriveManagementPage />} />
                        <Route path="/po/eligibility" element={<EligibilityShortlistPage />} />
                        <Route path="/po/academic-integrity" element={<AcademicIntegrityPage />} />
                        <Route path="/po/students" element={<StudentsPage />} />
                        <Route path="/po/students/:studentId" element={<StudentDetailPage />} />
                        <Route path="/po/companies" element={<PublishDrivePage />} />
                        <Route path="/po/integrity" element={<IntegrityFlagsPage />} />
                        <Route path="/po/stale-resumes" element={<StaleResumesPage />} />
                        <Route path="/admin/training-analytics" element={<TrainingAnalyticsPage />} />
                      </Route>

                      {/* Trainer + Admin */}
                      <Route element={<ProtectedRoute allowedRoles={[ROLES.TRAINER, ROLES.ADMIN]} />}>
                        <Route path="/trainer/questions" element={<QuestionBankPage />} />
                        <Route path="/trainer/problems" element={<ProblemBankPage />} />
                        <Route path="/trainer/tests" element={<MockTestBuilderPage />} />
                        <Route path="/trainer/tests/:testId/activity" element={<AttemptActivityPage />} />
                        <Route path="/trainer/resources" element={<UploadResourcePage />} />
                        <Route path="/trainer/schedule" element={<TrainingSchedulerPage />} />
                        <Route path="/trainer/progress" element={<TrainerProgressPage />} />
                        <Route path="/trainer/batches" element={<TrainerDashboardPage />} />
                      </Route>

                      {/* Admin only */}
                      <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]} />}>
                        <Route path="/admin/academic-integrity" element={<AcademicIntegrityPage />} />
                        <Route path="/admin/audit-logs" element={<AuditLogsPage />} />
                        <Route path="/admin/branches" element={<BranchesPage />} />
                        <Route path="/admin/batches" element={<BatchesPage />} />
                        <Route path="/admin/users" element={<UsersPage />} />
                        <Route path="/admin/sync-monitor" element={<SyncMonitorPage />} />
                        <Route path="/admin/settings" element={<AdminSettingsPage />} />
                        <Route path="/admin/bulk-import" element={<BulkImportPage />} />
                      </Route>
                    </Route>

                    {/* Full-page test interface: student only, no sidebar */}
                    <Route element={<ProtectedRoute allowedRoles={[ROLES.STUDENT]} />}>
                      <Route path="/tests/:testId/take" element={<TakeTestPage />} />
                    </Route>
                  </Route>

                  {/* Unauthorized & 404 Routes (Challenges 264, 265, 274) */}
                  <Route
                    path="/unauthorized"
                    element={
                      <div style={{ padding: '80px 20px', textAlign: 'center' }}>
                        <h1 style={{ fontSize: '72px', margin: 0, color: '#dc2626' }}>403</h1>
                        <h2>Access Forbidden</h2>
                        <p style={{ color: '#64748b', marginBottom: '24px' }}>
                          You do not have permission to access this page.
                        </p>
                        <a
                          href="/dashboard"
                          style={{
                            padding: '10px 24px',
                            background: '#1a73e8',
                            color: '#fff',
                            borderRadius: '6px',
                            textDecoration: 'none',
                            fontWeight: 600,
                          }}
                        >
                          Back to Dashboard
                        </a>
                      </div>
                    }
                  />
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Suspense>
            </AuthProvider>
          </BrowserRouter>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}