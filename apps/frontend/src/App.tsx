import { useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { ProjectListPage } from './pages/ProjectListPage';
import { EditorPage } from './pages/EditorPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { LandingPage } from './pages/LandingPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { ThemeProvider } from './components/ThemeProvider';
import { useStore } from './store';
import { ApiError } from './api/client';

export function App() {
  const initAuth = useStore((s) => s.initAuth);
  const logout = useStore((s) => s.logout);
  const navigate = useNavigate();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Global handler: redirect to /login when any API call returns 401
  // (token expired mid-session, outside of auth routes)
  useEffect(() => {
    function onUnhandledRejection(event: PromiseRejectionEvent) {
      if (event.reason instanceof ApiError && event.reason.status === 401) {
        logout();
        navigate('/login', { replace: true });
      }
    }
    window.addEventListener('unhandledrejection', onUnhandledRejection);
    return () => window.removeEventListener('unhandledrejection', onUnhandledRejection);
  }, [logout, navigate]);

  return (
    <ThemeProvider>
      <Routes>
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <ProjectListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/project/:projectId"
          element={
            <ProtectedRoute>
              <EditorPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </ThemeProvider>
  );
}
