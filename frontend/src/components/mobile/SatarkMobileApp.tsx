import React, { useState, useEffect } from 'react';
import { SatarkCitizenApp } from './SatarkCitizenApp';
import { SatarkOfficerApp } from './SatarkOfficerApp';
import { login } from '../../services/api';

export const SatarkMobileApp: React.FC = () => {
  const [userRole, setUserRole] = useState<string>(() => {
    return localStorage.getItem('ews_role') || 'CITIZEN';
  });
  const [activeMode, setActiveMode] = useState<'citizen' | 'officer'>(() => {
    const role = localStorage.getItem('ews_role');
    if (role && ['ADMIN', 'DISTRICT_OFFICIAL', 'FIELD_OFFICER'].includes(role)) {
      return 'officer';
    }
    return 'citizen';
  });

  // Modal for Officer Login
  const [showOfficerLoginModal, setShowOfficerLoginModal] = useState<boolean>(false);
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');
  const [loginLoading, setLoginLoading] = useState<boolean>(false);

  // Listen to auth events
  useEffect(() => {
    const handleAuthChange = () => {
      const role = localStorage.getItem('ews_role') || 'CITIZEN';
      setUserRole(role);
      if (['ADMIN', 'DISTRICT_OFFICIAL', 'FIELD_OFFICER'].includes(role)) {
        setActiveMode('officer');
      } else {
        setActiveMode('citizen');
      }
    };

    window.addEventListener('satark-auth-changed', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);
    return () => {
      window.removeEventListener('satark-auth-changed', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, []);

  const handleOfficerLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setLoginLoading(true);
    setLoginError('');
    try {
      const data = await login(username, password);
      localStorage.setItem('ews_token', data.token);
      localStorage.setItem('ews_role', data.role);
      localStorage.setItem('ews_user', data.username);
      localStorage.setItem('ews_lang', data.languagePref || 'en');
      setUserRole(data.role);
      setActiveMode('officer');
      setShowOfficerLoginModal(false);
    } catch {
      setLoginError('Invalid officer credentials. Try: admin / demo1234');
    } finally {
      setLoginLoading(false);
    }
  };

  const fillDemo = (u: string) => {
    setUsername(u);
    setPassword('demo1234');
  };

  return (
    <>
      {activeMode === 'officer' ? (
        <SatarkOfficerApp
          onSwitchToCitizen={() => setActiveMode('citizen')}
        />
      ) : (
        <SatarkCitizenApp
          onSwitchToOfficer={() => {
            const role = localStorage.getItem('ews_role');
            if (role && ['ADMIN', 'DISTRICT_OFFICIAL', 'FIELD_OFFICER'].includes(role)) {
              setActiveMode('officer');
            } else {
              setShowOfficerLoginModal(true);
            }
          }}
        />
      )}

      {/* Officer Login Modal for Citizen App */}
      {showOfficerLoginModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#0e172a',
            border: '1px solid #334155',
            borderRadius: '16px',
            padding: '20px',
            maxWidth: '360px',
            width: '100%',
            color: '#ffffff'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontWeight: 900, fontSize: '1.05rem' }}>
                🛡️ Officer / Admin Login
              </div>
              <button
                onClick={() => setShowOfficerLoginModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {loginError && (
              <div style={{ background: '#fee2e2', color: '#991b1b', padding: '8px 10px', borderRadius: '6px', fontSize: '0.76rem', marginBottom: '10px' }}>
                {loginError}
              </div>
            )}

            <form onSubmit={handleOfficerLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                  USERNAME
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="admin or field_officer"
                  style={{
                    width: '100%',
                    background: '#070c17',
                    color: '#ffffff',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    fontSize: '0.82rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                  PASSWORD
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="demo1234"
                  style={{
                    width: '100%',
                    background: '#070c17',
                    color: '#ffffff',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    fontSize: '0.82rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Demo Fill Quick Buttons */}
              <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                <button
                  type="button"
                  onClick={() => fillDemo('admin')}
                  style={{
                    background: '#1e293b',
                    color: '#38bdf8',
                    border: '1px solid #334155',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '0.68rem',
                    cursor: 'pointer'
                  }}
                >
                  Fill Admin
                </button>
                <button
                  type="button"
                  onClick={() => fillDemo('field_officer')}
                  style={{
                    background: '#1e293b',
                    color: '#fb923c',
                    border: '1px solid #334155',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '0.68rem',
                    cursor: 'pointer'
                  }}
                >
                  Fill Field Officer
                </button>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                style={{
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px',
                  fontWeight: 900,
                  fontSize: '0.84rem',
                  cursor: loginLoading ? 'not-allowed' : 'pointer',
                  marginTop: '8px'
                }}
              >
                {loginLoading ? 'Authenticating...' : 'Sign In to Command Portal'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
