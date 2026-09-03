import React from 'react';
import { Navigate } from 'react-router-dom';

interface Props {
  children: React.ReactNode;
  allowedRoles?: string[];
}

/** Decode JWT payload safely — handles base64url (no padding, - and _ chars) */
function decodeJwtRole(token: string): string | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    // base64url → base64: replace chars + add padding
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
      + '='.repeat((4 - payload.length % 4) % 4);
    const json = JSON.parse(atob(base64));
    return json.role || null;
  } catch {
    return null;
  }
}

export const ProtectedRoute: React.FC<Props> = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('ews_token');
  if (!token) return <Navigate to="/login" />;

  // Try JWT decode first, fall back to stored role (set during login)
  const role = decodeJwtRole(token) || localStorage.getItem('ews_role') || '';

  if (!role) return <Navigate to="/login" />;

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/map" />;
  }

  return <>{children}</>;
};
