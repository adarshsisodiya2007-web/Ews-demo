import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { DemoBanner } from './components/layout/DemoBanner';
import { PermissionGate } from './components/PermissionGate';
import LoginPage from './pages/LoginPage';
import OfficialDashboard from './pages/OfficialDashboard';
import PublicRiskMap from './pages/PublicRiskMap';
import ReportFormPage from './pages/ReportFormPage';
import { GisMapDashboard } from './components/map/GisMapDashboard';
import { CitizenPortal } from './pages/CitizenPortal';
import { ResponderPortal } from './pages/ResponderPortal';
import { OfflineRescuePage } from './pages/OfflineRescuePage';
import { ProfilePage } from './pages/ProfilePage';
import { PrivacyDataPage } from './pages/PrivacyDataPage';
import { useCapacitorNative } from './hooks/useCapacitorNative';
import { isCapacitorAndroid } from './utils/platform';
import { SatarkMobileApp } from './components/mobile/SatarkMobileApp';
import { ThemeProvider } from './context/ThemeContext';
import { getValidSession, clearAuthSession } from './utils/authSession';
import { SatarkChatbot } from './components/chatbot/SatarkChatbot';

/**
 * Canonical Root Route:
 * - Decodes and validates 'ews_token' (checking format and expiration timestamp 'exp').
 * - If valid and unexpired: routes to the corresponding dashboard based on validated role.
 * - If missing, expired, or invalid: clears any stale auth session and renders LoginPage.
 */
const RootRoute: React.FC = () => {
  const token = localStorage.getItem('ews_token');
  const session = getValidSession(token);

  if (!session) {
    if (token || localStorage.getItem('ews_role')) {
      clearAuthSession();
    }
    return <LoginPage />;
  }

  const role = session.role;

  if (role === 'FIELD_OFFICER') {
    return <Navigate to="/responder" replace />;
  }
  if (role === 'ADMIN' || role === 'DISTRICT_OFFICIAL') {
    return <Navigate to="/dashboard" replace />;
  }
  if (role === 'CITIZEN') {
    return <Navigate to="/citizen" replace />;
  }

  return <LoginPage />;
};

function AppContent({ permsDone, onPermComplete }: { permsDone: boolean; onPermComplete: () => void }) {
  useCapacitorNative();
  const isAndroidApp = isCapacitorAndroid();

  // If running inside native Android Capacitor app, render the dedicated mobile-app UI
  if (isAndroidApp) {
    return (
      <>
        {!permsDone && <PermissionGate onComplete={onPermComplete} />}
        <DemoBanner />

      {/* SATARK AI Chatbot — floats on all pages */}
      <SatarkChatbot />
        <SatarkMobileApp />
      </>
    );
  }

  return (
    <>
      {/* Show permission gate on first visit */}
      {!permsDone && <PermissionGate onComplete={onPermComplete} />}

      {/* Global demo mode banner â€” shows on any page when backend is offline */}
      <DemoBanner />

      {/* SATARK AI Chatbot — floats on all pages */}
      <SatarkChatbot />

      <Routes>
        <Route path="/"              element={<RootRoute />} />
        <Route path="/login"         element={<LoginPage />} />
        <Route path="/citizen"            element={<CitizenPortal />} />
        <Route path="/citizen/3d-terrain" element={<CitizenPortal initialTab="3d_terrain" />} />
        <Route path="/profile"        element={<ProfilePage />} />
        <Route path="/privacy"        element={<PrivacyDataPage />} />
        <Route path="/offline-rescue" element={<OfflineRescuePage />} />
        <Route path="/sih-dashboard"  element={<GisMapDashboard />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'DISTRICT_OFFICIAL', 'FIELD_OFFICER']}>
              <OfficialDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/responder"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'DISTRICT_OFFICIAL', 'FIELD_OFFICER']}>
              <ResponderPortal />
            </ProtectedRoute>
          }
        />
        <Route path="/map"           element={<PublicRiskMap />} />
        <Route path="/report"        element={<ReportFormPage />} />
        <Route path="/mobile-shell"  element={<SatarkMobileApp />} />
        <Route path="*"              element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function App() {
  const [permsDone, setPermsDone] = useState<boolean>(() => {
    return localStorage.getItem('ews_perms_shown') === 'true';
  });

  const handlePermComplete = () => {
    localStorage.setItem('ews_perms_shown', 'true');
    setPermsDone(true);
  };

  return (
    <ThemeProvider>
      <BrowserRouter>
        <AppContent permsDone={permsDone} onPermComplete={handlePermComplete} />
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;


