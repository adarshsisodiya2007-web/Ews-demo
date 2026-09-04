import React, { useState, useEffect } from 'react';
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

function AppContent({ permsDone, onPermComplete }: { permsDone: boolean; onPermComplete: () => void }) {
  useCapacitorNative();

  return (
    <>
      {/* Show permission gate on first visit */}
      {!permsDone && <PermissionGate onComplete={onPermComplete} />}

      {/* Global demo mode banner — shows on any page when backend is offline */}
      <DemoBanner />

      <Routes>
        <Route path="/"              element={<LoginPage />} />
        <Route path="/login"         element={<LoginPage />} />
        <Route path="/citizen"        element={<CitizenPortal />} />
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
        <Route path="/map"    element={<PublicRiskMap />} />
        <Route path="/report" element={<ReportFormPage />} />
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
    <BrowserRouter>
      <AppContent permsDone={permsDone} onPermComplete={handlePermComplete} />
    </BrowserRouter>
  );
}

export default App;
