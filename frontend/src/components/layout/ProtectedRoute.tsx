import React from 'react';
import { Navigate } from 'react-router-dom';
import { getValidSession, clearAuthSession } from '../../utils/authSession';

interface Props {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<Props> = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('ews_token');
  const session = getValidSession(token);

  if (!session) {
    clearAuthSession();
    return <Navigate to="/login" replace />;
  }

  const role = session.role || '';

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/map" replace />;
  }

  return <>{children}</>;
};
