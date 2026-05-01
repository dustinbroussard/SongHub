import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { OnboardingPage, DashboardPage, IdeaWorkspacePage, AuthCallbackPage, JoinBandPage } from './pages';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="animate-pulse text-primary-accent">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/songhub/onboarding" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/songhub/onboarding" element={<OnboardingPage />} />
      <Route path="/join" element={<JoinBandPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/idea/:ideaId"
        element={
          <ProtectedRoute>
            <IdeaWorkspacePage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/songhub/onboarding" replace />} />
    </Routes>
  );
}

export function AppRouter() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
