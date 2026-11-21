import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { MotionConfig, motion } from 'framer-motion';
import useAuthStore from './store/authStore';
import { AppShell } from './components/layout/DashboardLayout';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const SkillsPage = lazy(() => import('./pages/SkillsPage'));
const ResumePage = lazy(() => import('./pages/ResumePage'));
const JobsPage = lazy(() => import('./pages/JobsPage'));
const InterviewPage = lazy(() => import('./pages/InterviewPage'));
const RoadmapPage = lazy(() => import('./pages/RoadmapPage'));
const OpportunitiesPage = lazy(() => import('./pages/OpportunitiesPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const WeeklyReportPage = lazy(() => import('./pages/WeeklyReportPage'));

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return !isAuthenticated ? children : <Navigate to="/dashboard" replace />;
};

/* Loader = the logo's three capsules, pulsing in sequence */
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center" role="status" aria-label="Loading">
    <div className="flex flex-col items-center gap-2">
      {['bg-primary-500 w-16', 'bg-primary-400 w-20', 'bg-primary-300 w-14'].map((c, i) => (
        <motion.span
          key={i}
          className={`block h-4 rounded-full ${c}`}
          animate={{ opacity: [0.3, 1, 0.3], x: [0, i % 2 ? 6 : -6, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.14, ease: 'easeInOut' }}
        />
      ))}
    </div>
  </div>
);

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              background: '#FFFFFF',
              color: '#1E1042',
              border: '1px solid #C7B3FF',
              borderRadius: '999px',
              padding: '10px 18px',
              fontSize: '14px',
              fontWeight: 500,
              maxWidth: '420px',
              boxShadow: '0 18px 40px -16px rgba(91,33,182,0.35)'
            },
            success: { iconTheme: { primary: '#5B21B6', secondary: '#EDE9FE' } },
            error: { iconTheme: { primary: '#DC2626', secondary: '#FEE2E2' } }
          }}
        />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
            <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />

            {/* Signed-in area: one persistent shell, pages swap inside it */}
            <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/skills" element={<SkillsPage />} />
              <Route path="/resume" element={<ResumePage />} />
              <Route path="/jobs" element={<JobsPage />} />
              <Route path="/interview" element={<InterviewPage />} />
              <Route path="/roadmap" element={<RoadmapPage />} />
              <Route path="/opportunities" element={<OpportunitiesPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/weekly-report" element={<WeeklyReportPage />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </MotionConfig>
  );
}
